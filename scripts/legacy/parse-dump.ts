import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildLegacyImport, formatReport, type LegacyImport } from "./transform.ts";

const DEFAULT_OUT = path.join("scripts", "legacy", "out");

/**
 * Turn a phpMyAdmin dump into JSONL the import runner can send to Convex.
 * `--dry-run` only prints counts, unmatched names, and red-meat matches.
 */
export function parseDumpFile(options: {
  dumpPath: string;
  users: Map<number, string>;
  outDir: string;
  dryRun: boolean;
}): LegacyImport {
  const sql = readFileSync(options.dumpPath, "utf8");
  const result = buildLegacyImport(sql, options.users);
  process.stdout.write(`${formatReport(result.report)}\n`);
  if (options.dryRun) return result;

  mkdirSync(options.outDir, { recursive: true });
  writeJsonl(path.join(options.outDir, "products.jsonl"), result.products);
  writeJsonl(path.join(options.outDir, "entries.jsonl"), result.entries);
  writeJsonl(path.join(options.outDir, "limits.jsonl"), result.limits);
  writeFileSync(
    path.join(options.outDir, "summary.json"),
    `${JSON.stringify(result.report, null, 2)}\n`,
  );
  process.stdout.write(`\nGeschreven naar ${options.outDir}\n`);
  return result;
}

function writeJsonl(file: string, rows: unknown[]): void {
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(file, body.length > 0 ? `${body}\n` : "");
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  parseDumpFile(args);
}

export function parseArgs(argv: string[]): {
  dumpPath: string;
  users: Map<number, string>;
  outDir: string;
  dryRun: boolean;
} {
  let dumpPath: string | undefined;
  let outDir = DEFAULT_OUT;
  let dryRun = false;
  const users = new Map<number, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--dump") {
      dumpPath = requireValue(argv, ++i, "--dump");
      continue;
    }
    if (arg === "--out") {
      outDir = requireValue(argv, ++i, "--out");
      continue;
    }
    if (arg === "--user") {
      const raw = requireValue(argv, ++i, "--user");
      const split = raw.indexOf("=");
      if (split <= 0) throw new Error(`--user must look like 1=a@x.com, got ${raw}`);
      const id = Number(raw.slice(0, split));
      const email = raw.slice(split + 1).trim().toLowerCase();
      if (!Number.isSafeInteger(id)) throw new Error(`User id ${raw.slice(0, split)} is not an integer`);
      if (!email.includes("@")) throw new Error(`Email ${email} has no @`);
      if (users.has(id)) throw new Error(`User id ${id} is mapped twice`);
      users.set(id, email);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "node scripts/legacy/parse-dump.ts --dump dump.sql --user 1=a@x.com [--user 2=b@y.com] [--out scripts/legacy/out] [--dry-run]\n",
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument ${arg}`);
  }

  if (!dumpPath) throw new Error("Pass --dump path/to/dump.sql");
  if (users.size === 0) throw new Error("Pass at least one --user id=email");
  return { dumpPath, users, outDir, dryRun };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
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
