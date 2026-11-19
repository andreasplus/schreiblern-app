/** Lädt alle Seed-Dateien: Referenzwörter, Ergänzungen, Sammlungen und den Wortschatz (data/wortschatz). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { toSeedRows, type CollectionRecord, type SeedMeaningRow, type SeedRecord } from "../src/shared/seed.ts";
import { buildWortschatz } from "../src/shared/wortschatz.ts";

export interface SeedData {
  records: SeedRecord[];
  rows: SeedMeaningRow[];
  collections: CollectionRecord[];
  warnings: string[];
}

export function loadSeedData(root: string): SeedData {
  const read = <T>(f: string) => JSON.parse(readFileSync(join(root, "data", f), "utf8")) as T;
  const base = [...read<SeedRecord[]>("seed-words.json"), ...read<SeedRecord[]>("seed-supplement.json")];
  const dir = join(root, "data", "wortschatz");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") }));
  const { records, collections, warnings } = buildWortschatz(files, base, read<CollectionRecord[]>("collections.json"));
  const all = [...base, ...records];
  return { records: all, rows: toSeedRows(all), collections, warnings };
}
