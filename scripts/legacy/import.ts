import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Convex mutations stay bounded. The runner and `importLegacy` share this cap. */
export const LEGACY_BATCH = 200;

const DEFAULT_DIR = path.join("scripts", "legacy", "out");

type Kind = "products" | "entries" | "limits";

/**
 * Sends the JSONL from `parse-dump.ts` to `legacy:importLegacy`.
 * Products go first so diary rows can look up `productLegacyId`.
 * Run from the repo root, after `npx convex dev` or `npx convex push`.
 */
export function importLegacyFiles(options: { dir: string; batch: number; prod: boolean }): void {
  if (!Number.isSafeInteger(options.batch) || options.batch < 1 || options.batch > LEGACY_BATCH) {
    throw new Error(`--batch must be from 1 to ${LEGACY_BATCH}`);
  }
  const steps: { kind: Kind; file: string }[] = [
    { kind: "products", file: "products.jsonl" },
    { kind: "entries", file: "entries.jsonl" },
    { kind: "limits", file: "limits.jsonl" },
  ];
  for (const step of steps) {
    const rows = readJsonl(path.join(options.dir, step.file));
    const batches = chunk(rows, options.batch);
    process.stdout.write(`${step.kind}: ${rows.length} rijen, ${batches.length} batch(es)\n`);
    batches.forEach((batch, index) => {
      process.stdout.write(`  ${index + 1}/${batches.length} (${batch.length})\n`);
      runBatch(step.kind, batch, options.prod);
    });
  }
}

function runBatch(kind: Kind, rows: unknown[], prod: boolean): void {
  const payload: Record<string, unknown> = { kind };
  payload[kind] = rows;
  const args = ["convex", "run", "legacy:importLegacy", JSON.stringify(payload)];
  if (prod) args.push("--prod");
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`convex run ${kind} stopped with status ${result.status ?? "unknown"}. Rerun is safe: existing legacyId rows are skipped.`);
  }
}

function readJsonl(file: string): unknown[] {
  const text = readFileSync(file, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

function chunk<T>(rows: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  importLegacyFiles(options);
}

function parseArgs(argv: string[]): { dir: string; batch: number; prod: boolean } {
  let dir = DEFAULT_DIR;
  let batch = LEGACY_BATCH;
  let prod = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--prod") {
      prod = true;
      continue;
    }
    if (arg === "--dir") {
      const value = argv[++i];
      if (!value) throw new Error("--dir needs a path");
      dir = value;
      continue;
    }
    if (arg === "--batch") {
      const value = argv[++i];
      if (!value) throw new Error("--batch needs a number");
      batch = Number(value);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "node scripts/legacy/import.ts [--dir scripts/legacy/out] [--batch 200] [--prod]\n",
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument ${arg}`);
  }
  return { dir, batch, prod };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
