/**
 * Wiederholbarer Seed-Import (APP-06).
 *
 * Erzeugt SQL mit INSERT OR IGNORE: Ein wiederholter Import legt nichts doppelt an und
 * überschreibt keine bestehenden Einträge. Abweichungen zwischen Datei und Datenbank meldet
 * `findSeedConflicts`, statt sie still zu übernehmen. Änderungen an bestehenden Einträgen
 * gehören in eine eigene Migration.
 */
import { BUILTIN_PICTOGRAMS } from "./pictograms.ts";
import { cleanDisplay, normalizeTerm } from "./normalize.ts";

export interface SeedRecord {
  id: string;
  de: string;
  en: string;
  set: string;
  order?: number;
  kind: "word" | "color" | "number";
  pictogram_key?: string | null;
  color?: string;
  number?: number;
  description?: string;
  review_status?: string;
  source?: string;
}

export interface SeedMeaningRow {
  id: string;
  wordId: string;
  display: string;
  normalized: string;
  senseKey: string;
  description: string | null;
  en: string;
  kind: SeedRecord["kind"];
  number: number | null;
  color: string | null;
  pictogramId: string | null;
  status: "reference" | "reviewed" | "draft";
  source: string;
  collection: string;
  sortOrder: number;
}

export const PICTOGRAM_LIBRARY = "Schreiblern-Referenz";
export const PICTOGRAM_LICENSE = "Eigene Vektorzeichnung aus dem Übergabepaket";

export const wordIdFor = (display: string) => `de:${cleanDisplay(display)}`;

/** Prüft die Rohdaten und wandelt sie in Datenbankzeilen um. Wirft bei ungültigen Daten. */
export function toSeedRows(records: SeedRecord[]): SeedMeaningRow[] {
  const ids = new Set<string>();
  const senses = new Set<string>();
  const perSet = new Map<string, number>();
  return records.map((r) => {
    if (!r.id || ids.has(r.id)) throw new Error(`Seed-ID fehlt oder doppelt: ${r.id}`);
    ids.add(r.id);
    const display = cleanDisplay(r.de);
    const en = cleanDisplay(r.en);
    if (!display || !en) throw new Error(`Wort oder Übersetzung fehlt: ${r.id}`);
    if (r.kind === "color" && !/^#[0-9a-f]{6}$/.test(r.color ?? "")) throw new Error(`Farbe fehlt: ${r.id}`);
    if (r.kind === "number" && !Number.isInteger(r.number)) throw new Error(`Zahl fehlt: ${r.id}`);
    const senseKey = r.description ? normalizeTerm(r.description) : "";
    const senseUnique = `${display}|${senseKey}`;
    if (senses.has(senseUnique)) throw new Error(`Bedeutung doppelt: ${display} (${r.description ?? "Standard"})`);
    senses.add(senseUnique);
    let pictogramId: string | null = null;
    if (r.kind === "color") pictogramId = "color-circle";
    else if (r.kind === "number") pictogramId = "number-dots";
    else if (r.pictogram_key) {
      if (!(BUILTIN_PICTOGRAMS as readonly string[]).includes(r.pictogram_key)) throw new Error(`Unbekanntes Piktogramm: ${r.pictogram_key}`);
      pictogramId = `builtin:${r.pictogram_key}`;
    }
    const sortOrder = r.order ?? (perSet.get(r.set) ?? 0) + 1;
    perSet.set(r.set, Math.max(perSet.get(r.set) ?? 0, sortOrder));
    const status = r.review_status === "draft" ? "draft" : r.review_status === "reviewed" ? "reviewed" : "reference";
    return {
      id: r.id,
      wordId: wordIdFor(display),
      display,
      normalized: normalizeTerm(display),
      senseKey,
      description: r.description ? cleanDisplay(r.description) : null,
      en,
      kind: r.kind,
      number: r.kind === "number" ? r.number! : null,
      color: r.kind === "color" ? r.color! : null,
      pictogramId,
      status,
      source: r.source ?? "Übergabepaket data/seed-words.json",
      collection: r.set,
      sortOrder,
    };
  });
}

const q = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

export function seedSql(rows: SeedMeaningRow[]): string {
  const lines: string[] = ["-- Automatisch erzeugt von scripts/seed.mjs. Wiederholbar, überschreibt nichts."];
  lines.push(`INSERT OR IGNORE INTO pictograms (id, kind, path, library, license, attribution) VALUES`);
  const pics = [
    `(${q("color-circle")}, 'color', NULL, ${q(PICTOGRAM_LIBRARY)}, ${q(PICTOGRAM_LICENSE)}, NULL)`,
    `(${q("number-dots")}, 'number', NULL, ${q(PICTOGRAM_LIBRARY)}, ${q(PICTOGRAM_LICENSE)}, NULL)`,
    ...BUILTIN_PICTOGRAMS.map((k) => `(${q(`builtin:${k}`)}, 'builtin', NULL, ${q(PICTOGRAM_LIBRARY)}, ${q(PICTOGRAM_LICENSE)}, NULL)`),
  ];
  lines.push(pics.join(",\n") + ";");
  const words = new Map(rows.map((r) => [r.wordId, r]));
  lines.push(`INSERT OR IGNORE INTO words (id, lang, display, normalized) VALUES`);
  lines.push([...words.values()].map((r) => `(${q(r.wordId)}, 'de', ${q(r.display)}, ${q(r.normalized)})`).join(",\n") + ";");
  lines.push(
    `INSERT OR IGNORE INTO meanings (id, word_id, sense_key, description, translation_en, kind, number_value, color_hex, pictogram_id, status, source, collection, sort_order) VALUES`,
  );
  lines.push(
    rows
      .map((r) => `(${[r.id, r.wordId, r.senseKey, r.description, r.en, r.kind, r.number, r.color, r.pictogramId, r.status, r.source, r.collection, r.sortOrder].map(q).join(", ")})`)
      .join(",\n") + ";",
  );
  return lines.join("\n") + "\n";
}

/** Bestehende Zeile in der Datenbank, wie sie `SEED_CHECK_SQL` liefert. */
export interface ExistingMeaning {
  id: string;
  display: string;
  translation_en: string;
  kind: string;
  number_value: number | null;
  color_hex: string | null;
  pictogram_id: string | null;
}

export const SEED_CHECK_SQL =
  "SELECT m.id, w.display, m.translation_en, m.kind, m.number_value, m.color_hex, m.pictogram_id FROM meanings m JOIN words w ON w.id = m.word_id";

/** Liefert lesbare Hinweise für Seed-Einträge, deren Datenbankstand abweicht oder fehlt. */
export function findSeedConflicts(rows: SeedMeaningRow[], existing: ExistingMeaning[]): string[] {
  const byId = new Map(existing.map((e) => [e.id, e]));
  const out: string[] = [];
  for (const r of rows) {
    const e = byId.get(r.id);
    if (!e) {
      out.push(`${r.id} (${r.display}) fehlt in der Datenbank, vermutlich kollidiert die Bedeutung mit einem anderen Eintrag.`);
      continue;
    }
    const diffs: string[] = [];
    if (e.display !== r.display) diffs.push(`Wort „${e.display}“ statt „${r.display}“`);
    if (e.translation_en !== r.en) diffs.push(`Übersetzung „${e.translation_en}“ statt „${r.en}“`);
    if (e.kind !== r.kind) diffs.push(`Art ${e.kind} statt ${r.kind}`);
    if ((e.number_value ?? null) !== r.number) diffs.push(`Zahl ${e.number_value} statt ${r.number}`);
    if ((e.color_hex ?? null) !== r.color) diffs.push(`Farbe ${e.color_hex} statt ${r.color}`);
    if ((e.pictogram_id ?? null) !== r.pictogramId) diffs.push(`Piktogramm ${e.pictogram_id} statt ${r.pictogramId}`);
    if (diffs.length) out.push(`${r.id}: Datenbank weicht ab und wurde nicht überschrieben: ${diffs.join(", ")}`);
  }
  return out;
}
