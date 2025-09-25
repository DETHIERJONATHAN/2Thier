#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient, Prisma } from "@prisma/client";

type ExportPayload = {
  exportedAt: string;
  databaseUrlHash: string | null;
  models: Record<string, unknown[]>;
};

type ParsedArgs = {
  file?: string;
  pretty: boolean;
  includeEmpty: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    pretty: true,
    includeEmpty: false,
  };
  const args = [...argv];
  while (args.length) {
    const token = args.shift();
    if (!token) continue;
    switch (token) {
      case "--file":
      case "-f": {
        const value = args.shift();
        if (!value) throw new Error("L'option --file attend un chemin vers un fichier de sortie.");
        parsed.file = value;
        break;
      }
      case "--compact":
        parsed.pretty = false;
        break;
      case "--include-empty":
        parsed.includeEmpty = true;
        break;
      default:
        if (!token.startsWith("--") && !parsed.file) {
          parsed.file = token;
          break;
        }
        if (token.startsWith("--")) {
          throw new Error(`Option inconnue : ${token}`);
        }
        console.warn(`[prisma-export] Argument ignoré : ${token}`);
        break;
    }
  }
  return parsed;
}

function defaultOutputFile(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join("backups", "prisma", `prisma-export-${timestamp}.json`);
}

function hashDatabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  const hash = createHash("sha1").update(url).digest("hex");
  return `sha1-${hash}`;
}

function getDelegate(client: PrismaClient, modelName: string) {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const delegate = (client as unknown as Record<string, unknown>)[key];
  if (!delegate || typeof delegate !== "object") {
    throw new Error(`Impossible de trouver le délégué Prisma pour le modèle ${modelName}.`);
  }
  return delegate as { findMany: (args?: Record<string, unknown>) => Promise<unknown[]> };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const output = args.file ?? defaultOutputFile();
  const absolute = path.resolve(process.cwd(), output);
  const outputDir = path.dirname(absolute);

  const prisma = new PrismaClient();

  try {
    const models = Prisma.dmmf.datamodel.models;
    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      databaseUrlHash: hashDatabaseUrl(process.env.DATABASE_URL),
      models: {},
    };

    for (const model of models) {
      const delegate = getDelegate(prisma, model.name);
      const records = await delegate.findMany();
      if (records.length === 0 && !args.includeEmpty) {
        continue;
      }
      payload.models[model.name] = records;
      console.log(`[prisma-export] ${model.name}: ${records.length} enregistrements`);
    }

    if (Object.keys(payload.models).length === 0) {
      console.warn("[prisma-export] Aucun enregistrement exporté. Utilisez --include-empty pour générer un fichier vide.");
    }

    await mkdir(outputDir, { recursive: true });
    const formatted = args.pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
    await writeFile(absolute, formatted, "utf8");

    console.log(`[prisma-export] Export terminé → ${absolute}`);
  } catch (error) {
    console.error("[prisma-export] Erreur:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
