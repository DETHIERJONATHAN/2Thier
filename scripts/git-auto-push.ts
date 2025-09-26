#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

type GitResult = {
  stdout: string;
  stderr: string;
};

function runGit(args: string[], options?: { capture?: boolean }): GitResult {
  const capture = options?.capture ?? false;
  const stdio = capture ? ["ignore", "pipe", "pipe"] : "inherit";
  const encoding = capture ? "utf8" : undefined;
  const result = execFileSync("git", args, {
    stdio,
    encoding: encoding as BufferEncoding | undefined,
  });
  if (capture) {
    return {
      // execFileSync returns string when encoding specified
      stdout: (result as unknown as string) ?? "",
      stderr: "",
    };
  }
  return { stdout: "", stderr: "" };
}

function resolveRepoRoot(): string {
  const { stdout } = runGit(["rev-parse", "--show-toplevel"], { capture: true });
  const resolved = stdout.trim();
  if (!resolved || !existsSync(resolved)) {
    throw new Error("Impossible de déterminer la racine du dépôt Git.");
  }
  return resolved;
}

function getCurrentBranch(): string {
  const { stdout } = runGit(["rev-parse", "--abbrev-ref", "HEAD"], { capture: true });
  const branch = stdout.trim();
  if (!branch) {
    throw new Error("Impossible de déterminer la branche courante.");
  }
  return branch;
}

function getUpstreamRef(): string | null {
  try {
    const { stdout } = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      capture: true,
    });
    const upstream = stdout.trim();
    return upstream || null;
  } catch {
    return null;
  }
}

function hasAheadCommits(): boolean {
  if (!hasRemote()) return false;
  const upstream = getUpstreamRef();
  if (!upstream) return false;
  try {
    const { stdout } = runGit([
      "rev-list",
      "--left-right",
      "--count",
      `HEAD...${upstream}`,
    ], { capture: true });
    const [aheadStr] = stdout.trim().split(/\s+/);
    const ahead = Number(aheadStr || 0);
    return Number.isFinite(ahead) && ahead > 0;
  } catch {
    return false;
  }
}

type ParsedArgs = {
  push: boolean;
  pull: boolean;
  message?: string;
  reason?: string;
  signoff: boolean;
  allowEmpty: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const parsed: ParsedArgs = {
    push: true,
    pull: true,
    signoff: false,
    allowEmpty: false,
  };

  while (args.length) {
    const token = args.shift();
    if (!token) continue;
    switch (token) {
      case "--no-push":
      case "--skip-push":
        parsed.push = false;
        break;
      case "--push":
        parsed.push = true;
        break;
      case "--no-pull":
      case "--skip-pull":
        parsed.pull = false;
        break;
      case "--pull":
        parsed.pull = true;
        break;
      case "-m":
      case "--message": {
        const value = args.shift();
        if (!value) {
          throw new Error("L'option --message attend une valeur.");
        }
        parsed.message = value;
        break;
      }
      case "--reason": {
        const value = args.shift();
        if (!value) {
          throw new Error("L'option --reason attend une valeur.");
        }
        parsed.reason = value;
        break;
      }
      case "--signoff":
        parsed.signoff = true;
        break;
      case "--allow-empty":
        parsed.allowEmpty = true;
        break;
      default:
        if (token.startsWith("--")) {
          throw new Error(`Option inconnue : ${token}`);
        }
        if (!parsed.message) {
          parsed.message = token;
          break;
        }
        if (!parsed.reason) {
          parsed.reason = token;
          break;
        }
        break;
    }
  }

  return parsed;
}

function buildCommitMessage(parsed: ParsedArgs): string {
  if (parsed.message) return parsed.message;
  if (process.env.GIT_AUTO_MESSAGE) return String(process.env.GIT_AUTO_MESSAGE);

  const now = new Date();
  const iso = now.toISOString().replace(/[:]/g, "-");
  const reason = parsed.reason ?? process.env.GIT_AUTO_REASON;
  const suffix = reason ? ` (${reason})` : "";
  return `Chore: sauvegarde automatique ${iso}${suffix}`;
}

function log(step: string, detail?: string) {
  const prefix = `[git-auto] ${step}`;
  if (detail) {
    console.log(`${prefix}: ${detail}`);
  } else {
    console.log(prefix);
  }
}

function hasRemote(): boolean {
  try {
    const { stdout } = runGit(["remote"], { capture: true });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function hasBranchUpstream(): boolean {
  try {
    runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      capture: true,
    });
    return true;
  } catch {
    return false;
  }
}

function ensureUpstream() {
  if (hasBranchUpstream()) return;
  const branch = getCurrentBranch();
  const remote = process.env.GIT_AUTO_REMOTE ?? "origin";
  log("upstream", `Aucun suivi détecté, création vers ${remote}/${branch}`);
  runGit(["push", "-u", remote, branch]);
}

function gitStatus(): string {
  const { stdout } = runGit(["status", "--porcelain"], { capture: true });
  return stdout;
}

function gitPullIfNeeded(hasLocalChanges: boolean) {
  if (!hasRemote()) {
    log("pull", "Aucun remote configuré, étape ignorée");
    return;
  }
  log("pull", "Synchronisation des changements distants");
  const remote = process.env.GIT_AUTO_REMOTE ?? "origin";
  const args = ["pull", "--rebase", remote];
  if (hasLocalChanges) {
    args.splice(2, 0, "--autostash");
  }

  try {
    runGit(args, { capture: false });
  } catch (error) {
    if (hasLocalChanges) {
      log("pull", "Échec du pull automatique (modifications locales). Étape ignorée.");
      const message = error instanceof Error ? error.message : String(error);
      log("pull", message);
      log("pull", "Tu pourras relancer après résolution manuelle si nécessaire.");
      return;
    }
    throw error;
  }
}

function gitAddAll() {
  log("add", "Ajout de toutes les modifications suivies");
  runGit(["add", "--all"]);
}

function gitCommit(message: string, allowEmpty: boolean, signoff: boolean) {
  const status = gitStatus();
  if (!status.trim()) {
    if (allowEmpty) {
      log("commit", "Aucun changement détecté, commit vide autorisé");
    } else {
      log("commit", "Aucun changement détecté, commit ignoré");
      return false;
    }
  }

  const args = ["commit", "-m", message];
  if (signoff) args.push("--signoff");
  if (allowEmpty) args.push("--allow-empty");

  log("commit", `Création du commit (${status.split("\n").filter(Boolean).length} fichiers)`);
  try {
    runGit(args);
    return true;
  } catch (error) {
    throw new Error(`Échec du commit : ${(error as Error).message}`);
  }
}

function gitPush() {
  if (!hasRemote()) {
    log("push", "Aucun remote configuré, étape ignorée");
    return;
  }
  ensureUpstream();
  log("push", "Envoi des commits");
  runGit(["push", process.env.GIT_AUTO_REMOTE ?? "origin"]);
}

async function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    if (process.env.GIT_AUTO_SKIP_PULL?.toLowerCase() === "true" || process.env.GIT_AUTO_SKIP_PULL === "1") {
      parsed.pull = false;
    }
    const repoRoot = resolveRepoRoot();
    process.chdir(repoRoot);

    log("start", `Répertoire : ${repoRoot}`);

    const hadLocalChanges = gitStatus().trim().length > 0;
    if (parsed.pull) {
      gitPullIfNeeded(hadLocalChanges);
    } else {
      log("pull", "Étape ignorée (--skip-pull)");
    }
    gitAddAll();

    const message = buildCommitMessage(parsed);
    const committed = gitCommit(message, parsed.allowEmpty, parsed.signoff);

    const aheadAfterCommit = hasAheadCommits();

    if (parsed.push && (committed !== false || aheadAfterCommit)) {
      gitPush();
    } else if (parsed.push) {
      log("push", "Aucun nouveau commit, push ignoré");
    }

    log("done", "Workflow terminé avec succès");
  } catch (error) {
    console.error("[git-auto] Erreur:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
