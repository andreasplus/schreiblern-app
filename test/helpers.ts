import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import type { SeedRecord } from "../src/shared/seed.ts";

export const root = join(import.meta.dirname, "..");

export function seedRecords(): SeedRecord[] {
  const read = (f: string) => JSON.parse(readFileSync(join(root, "data", f), "utf8")) as SeedRecord[];
  return [...read("seed-words.json"), ...read("seed-supplement.json")];
}

/** Zerlegt SQL-Dateien in einzelne Anweisungen (Kommentare entfernt, Semikolon am Zeilenende). */
export function statements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((s) => s.trim().replace(/;$/, ""))
    .filter(Boolean);
}

export async function run(db: D1Database, sql: string) {
  await db.batch(statements(sql).map((s) => db.prepare(s)));
}

/** Frische, flüchtige D1-Datenbank (Miniflare) mit angewendeter Migration. */
export async function freshDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false, configPath: join(root, "wrangler.jsonc") });
  const db = proxy.env.DB;
  await run(db, readFileSync(join(root, "migrations", "0001_wortbestand.sql"), "utf8"));
  return { db, dispose: () => proxy.dispose() };
}
