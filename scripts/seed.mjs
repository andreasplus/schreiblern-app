#!/usr/bin/env node
/**
 * Seed-Import in D1 (lokal oder entfernt). Wiederholbar: legt nur Fehlendes an,
 * überschreibt nichts und meldet Abweichungen zwischen Seed-Dateien und Datenbank.
 *
 *   node scripts/seed.mjs --local     # lokale D1 aus `wrangler dev` / `vite`
 *   node scripts/seed.mjs --remote    # D1 im Cloudflare-Konto (nach Freigabe)
 *   node scripts/seed.mjs --sql-only  # schreibt nur generated/seed.sql
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedSql, collectionsSql, findSeedConflicts, SEED_CHECK_SQL } from "../src/shared/seed.ts";
import { loadSeedData } from "./seed-data.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv.includes("--remote") ? "--remote" : process.argv.includes("--sql-only") ? null : "--local";
const { rows, collections } = loadSeedData(root);
mkdirSync(join(root, "generated"), { recursive: true });
const sqlFile = join(root, "generated", "seed.sql");
writeFileSync(sqlFile, seedSql(rows) + collectionsSql(collections, rows));
console.log(`${rows.length} Bedeutungen in ${collections.length} Sammlungen vorbereitet: ${sqlFile}`);
if (!mode) process.exit(0);

const wrangler = (...a) => execFileSync("npx", ["wrangler", "d1", "execute", "schreiblern-app", mode, ...a], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
wrangler("--file", sqlFile, "--yes");
const result = JSON.parse(wrangler("--json", "--command", SEED_CHECK_SQL));
const existing = result[0]?.results ?? [];
const conflicts = findSeedConflicts(rows, existing);
for (const c of conflicts) console.warn(`⚠ ${c}`);
console.log(`Import abgeschlossen: ${existing.length} Bedeutungen in der Datenbank, ${conflicts.length} Abweichungen.`);
process.exit(conflicts.length ? 2 : 0);
