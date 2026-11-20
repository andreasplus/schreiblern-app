/** Lädt alle Seed-Dateien: Referenzwörter, Ergänzungen, Sammlungen und den Wortschatz (data/wortschatz). */
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  const all = attachPictograms(root, [...base, ...records]);
  return { records: all, rows: toSeedRows(all), collections, warnings };
}

/**
 * Bilddateien zuordnen: eigene SVGs (public/pictograms/eigene/<Bedeutungs-ID>.svg) vor Noto-Emojis
 * (data/bilder/noto-zuordnung.json). Eingebaute Zeichnungen bleiben unverändert.
 */
function attachPictograms(root: string, records: SeedRecord[]): SeedRecord[] {
  const notoFile = join(root, "data", "bilder", "noto-zuordnung.json");
  const noto: Record<string, { icon: string }> = existsSync(notoFile) ? JSON.parse(readFileSync(notoFile, "utf8")) : {};
  const ownDir = join(root, "public", "pictograms", "eigene");
  const own = new Set(existsSync(ownDir) ? readdirSync(ownDir).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)) : []);
  const ids = new Set(records.map((r) => r.id));
  for (const id of own) {
    if (!ids.has(id)) throw new Error(`public/pictograms/eigene/${id}.svg: keine Bedeutung mit dieser ID`);
    // Die Dateien liegen auf derselben Domain wie die App: keine Skripte, Ereignisse oder fremden Verweise zulassen.
    const svg = readFileSync(join(ownDir, `${id}.svg`), "utf8");
    if (!/<svg[\s>]/i.test(svg) || /<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=\s*["']\s*(?!#|data:image\/)/i.test(svg)) {
      throw new Error(`public/pictograms/eigene/${id}.svg: keine gültige oder sichere SVG-Datei (Skripte, Ereignisse und externe Verweise sind nicht erlaubt)`);
    }
  }
  return records.map((r) => {
    if (r.kind !== "word" || r.pictogram_key) return r;
    if (own.has(r.id)) return { ...r, pictogram_file: `eigene/${r.id}.svg` };
    if (noto[r.id]) return { ...r, pictogram_file: `noto/${noto[r.id]!.icon}.svg` };
    return r;
  });
}
