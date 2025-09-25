#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient, Prisma } from "@prisma/client";

type ImportPayload = {
  exportedAt?: string;
  databaseUrlHash?: string | null;
  models: Record<string, unknown[]>;
};

type ParsedArgs = {
  file: string;
  truncate: boolean;
  batchSize: number;
  skipDuplicates: boolean;
  dryRun: boolean;
  only: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const result: ParsedArgs = {
    file: "",
    truncate: false,
    batchSize: Number(process.env.PRISMA_IMPORT_BATCH ?? 500),
    skipDuplicates: true,
    dryRun: false,
    only: [],
  };

  while (args.length) {
    const token = args.shift();
    if (!token) continue;
    switch (token) {
      case "--file":
      case "-f": {
        const value = args.shift();
        if (!value) throw new Error("L'option --file attend le chemin d'un export JSON.");
        result.file = value;
        break;
      }
      case "--truncate":
        result.truncate = true;
        break;
      case "--no-skip-duplicates":
        result.skipDuplicates = false;
        break;
      case "--batch": {
        const value = args.shift();
        if (!value) throw new Error("L'option --batch attend une valeur numérique.");
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) {
          throw new Error("La taille de lot (--batch) doit être un entier positif.");
        }
        result.batchSize = parsed;
        break;
      }
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--only": {
        const value = args.shift();
        if (!value) throw new Error("L'option --only attend une liste de modèles séparés par des virgules.");
        result.only = value.split(",").map((entry) => entry.trim()).filter(Boolean);
        break;
      }
      default:
        if (!token.startsWith("--")) {
          if (!result.file) {
            result.file = token;
            break;
          }
          const maybeNumber = Number(token);
          if (Number.isFinite(maybeNumber) && maybeNumber >= 1) {
            result.batchSize = maybeNumber;
            break;
          }
          console.warn(`[prisma-import] Argument ignoré : ${token}`);
          break;
        }
        throw new Error(`Option inconnue : ${token}`);
        break;
    }
  }

  const envTruncate = process.env.PRISMA_IMPORT_TRUNCATE;
  if (!result.truncate && envTruncate) {
    const normalized = envTruncate.toLowerCase();
    result.truncate = normalized === "1" || normalized === "true" || normalized === "yes";
  }

  const envDryRun = process.env.PRISMA_IMPORT_DRY_RUN;
  if (!result.dryRun && envDryRun) {
    const normalized = envDryRun.toLowerCase();
    result.dryRun = normalized === "1" || normalized === "true" || normalized === "yes";
  }

  const envOnly = process.env.PRISMA_IMPORT_ONLY;
  if (!result.only.length && envOnly) {
    result.only = envOnly.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  if (!result.file) {
    throw new Error("Veuillez fournir un fichier d'export via --file ./backups/prisma-export.json");
  }

  return result;
}

function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

type Graph = Map<string, Set<string>>;

type ModelMeta = typeof Prisma.dmmf.datamodel.models[number];

function buildDependencyGraph(models: ModelMeta[]): Graph {
  const graph: Graph = new Map();

  for (const model of models) {
    graph.set(model.name, new Set());
  }

  for (const model of models) {
    const dependencies = graph.get(model.name);
    if (!dependencies) continue;

    for (const field of model.fields) {
      if (field.kind === "object" && Array.isArray(field.relationFromFields) && field.relationFromFields.length > 0) {
        dependencies.add(field.type);
      }
    }
  }

  return graph;
}

function topoSort(graph: Graph): string[] {
  const nodes = [...graph.keys()];
  const indegree: Map<string, number> = new Map();
  const dependents: Map<string, Set<string>> = new Map();

  for (const node of nodes) {
    indegree.set(node, 0);
  }

  for (const [node, deps] of graph.entries()) {
    for (const dep of deps) {
      indegree.set(node, (indegree.get(node) ?? 0) + 1);
      if (!dependents.has(dep)) dependents.set(dep, new Set());
      dependents.get(dep)!.add(node);
      if (!indegree.has(dep)) indegree.set(dep, indegree.get(dep) ?? 0);
    }
  }

  const queue: string[] = nodes.filter((node) => (indegree.get(node) ?? 0) === 0);
  const result: string[] = [];

  while (queue.length) {
    const node = queue.shift();
    if (!node) continue;
    result.push(node);

    for (const dependent of dependents.get(node) ?? []) {
      const current = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, current);
      if (current === 0) {
        queue.push(dependent);
      }
    }
  }

  if (result.length !== nodes.length) {
    console.warn("[prisma-import] Détection d'un cycle de dépendances. Utilisation de l'ordre de déclaration du schéma.");
    return nodes;
  }

  return result;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function filterModels(models: string[], only: string[]): string[] {
  if (!only.length) return models;
  const normalized = new Set(only.map((entry) => entry.trim()).filter(Boolean));
  return models.filter((model) => normalized.has(model));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const absolutePath = path.resolve(process.cwd(), options.file);
  const content = await readFile(absolutePath, "utf8");
  const payload = JSON.parse(content) as ImportPayload;

  if (!payload.models || typeof payload.models !== "object") {
    throw new Error("Le fichier d'export ne contient pas de propriété 'models'.");
  }

  const prisma = new PrismaClient();

  try {
    const models = Prisma.dmmf.datamodel.models;
    const { graph } = buildDependencyGraph(models);
    const ordered = filterModels(topoSort(graph), options.only);

    if (ordered.length === 0) {
      console.warn("[prisma-import] Aucun modèle sélectionné pour l'import.");
      return;
    }

    if (options.truncate && !options.dryRun) {
      console.log("[prisma-import] Nettoyage des tables cibles (ordre inverse)");
      for (const modelName of [...ordered].reverse()) {
        const delegate = (prisma as unknown as Record<string, { deleteMany: () => Promise<unknown> }>)[camelCase(modelName)];
        if (!delegate?.deleteMany) continue;
        await delegate.deleteMany();
        console.log(`  - ${modelName} vidé`);
      }
    } else if (options.truncate) {
      console.log("[prisma-import] --dry-run actif : la suppression des données est simulée.");
    }

    for (const modelName of ordered) {
      const records = payload.models[modelName];
      if (!Array.isArray(records) || records.length === 0) {
        console.log(`[prisma-import] ${modelName}: aucun enregistrement à importer.`);
        continue;
      }

      const delegate = (prisma as unknown as Record<string, { createMany: (params: { data: unknown[]; skipDuplicates?: boolean }) => Promise<unknown> }>)[camelCase(modelName)];
      if (!delegate?.createMany) {
        console.warn(`[prisma-import] Modèle non reconnu (ignoré) : ${modelName}`);
        continue;
      }

      if (options.dryRun) {
        console.log(`[prisma-import] ${modelName}: ${records.length} enregistrements (simulation)`);
        continue;
      }

      console.log(`[prisma-import] ${modelName}: insertion de ${records.length} enregistrements`);
      for (const batch of chunk(records, options.batchSize)) {
        await delegate.createMany({ data: batch, skipDuplicates: options.skipDuplicates });
      }
    }

    console.log("[prisma-import] Import terminé avec succès.");
  } catch (error) {
    console.error("[prisma-import] Erreur:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
