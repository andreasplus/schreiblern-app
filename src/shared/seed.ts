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
import { difficultyOf, type Difficulty } from "./difficulty.ts";

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
  /** Optionaler fester Schwierigkeitsgrad; sonst aus der Schreibweise berechnet. */
  difficulty?: Difficulty;
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
  difficulty: Difficulty;
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
      difficulty: r.difficulty ?? difficultyOf(display),
    };
  });
}

const q = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

/** D1 begrenzt die Länge einer Anweisung (100 KB). Große Imports werden deshalb in Blöcke geteilt. */
export const SQL_CHUNK = 100;

function insertChunks(head: string, values: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < values.length; i += SQL_CHUNK) out.push(`${head}\n${values.slice(i, i + SQL_CHUNK).join(",\n")};`);
  return out;
}

export function seedSql(rows: SeedMeaningRow[]): string {
  const lines: string[] = ["-- Automatisch erzeugt von scripts/seed.mjs. Wiederholbar, überschreibt nichts."];
  const pics = [
    `(${q("color-circle")}, 'color', NULL, ${q(PICTOGRAM_LIBRARY)}, ${q(PICTOGRAM_LICENSE)}, NULL)`,
    `(${q("number-dots")}, 'number', NULL, ${q(PICTOGRAM_LIBRARY)}, ${q(PICTOGRAM_LICENSE)}, NULL)`,
    ...BUILTIN_PICTOGRAMS.map((k) => `(${q(`builtin:${k}`)}, 'builtin', NULL, ${q(PICTOGRAM_LIBRARY)}, ${q(PICTOGRAM_LICENSE)}, NULL)`),
  ];
  lines.push(...insertChunks(`INSERT OR IGNORE INTO pictograms (id, kind, path, library, license, attribution) VALUES`, pics));
  const words = new Map(rows.map((r) => [r.wordId, r]));
  lines.push(
    ...insertChunks(
      `INSERT OR IGNORE INTO words (id, lang, display, normalized) VALUES`,
      [...words.values()].map((r) => `(${q(r.wordId)}, 'de', ${q(r.display)}, ${q(r.normalized)})`),
    ),
  );
  lines.push(
    ...insertChunks(
      `INSERT OR IGNORE INTO meanings (id, word_id, sense_key, description, translation_en, kind, number_value, color_hex, pictogram_id, status, source, collection, sort_order, difficulty) VALUES`,
      rows.map(
        (r) =>
          `(${[r.id, r.wordId, r.senseKey, r.description, r.en, r.kind, r.number, r.color, r.pictogramId, r.status, r.source, r.collection, r.sortOrder, r.difficulty].map(q).join(", ")})`,
      ),
    ),
  );
  // Ältere Einträge ohne Schwierigkeitsgrad nachtragen. Ein gesetzter Wert wird nie überschrieben.
  for (const level of [1, 2, 3, 4, 5] as const) {
    const ids = rows.filter((r) => r.difficulty === level).map((r) => q(r.id));
    for (let i = 0; i < ids.length; i += SQL_CHUNK * 3) {
      lines.push(`UPDATE meanings SET difficulty = ${level} WHERE difficulty IS NULL AND id IN (${ids.slice(i, i + SQL_CHUNK * 3).join(", ")});`);
    }
  }
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

export interface CollectionRecord {
  id: string;
  name: string;
  description?: string;
  members: string[];
}

/** Prüft Sammlungen gegen die Seed-Bedeutungen und erzeugt wiederholbares SQL. */
export function collectionsSql(collections: CollectionRecord[], rows: SeedMeaningRow[]): string {
  const known = new Set(rows.map((r) => r.id));
  const ids = new Set<string>();
  for (const c of collections) {
    if (!/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id)) throw new Error(`Sammlungs-ID ungültig oder doppelt: ${c.id}`);
    ids.add(c.id);
    const members = new Set<string>();
    for (const m of c.members) {
      if (!known.has(m)) throw new Error(`Sammlung ${c.id}: unbekannte Bedeutung ${m}`);
      if (members.has(m)) throw new Error(`Sammlung ${c.id}: ${m} doppelt`);
      members.add(m);
    }
  }
  const lines = insertChunks(
    `INSERT OR IGNORE INTO collections (id, name, description, sort_order) VALUES`,
    collections.map((c, i) => `(${q(c.id)}, ${q(c.name)}, ${q(c.description ?? null)}, ${i + 1})`),
  );
  lines.push(
    ...insertChunks(
      `INSERT OR IGNORE INTO collection_items (collection_id, meaning_id, sort_order) VALUES`,
      collections.flatMap((c) => c.members.map((m, i) => `(${q(c.id)}, ${q(m)}, ${i + 1})`)),
    ),
  );
  return lines.join("\n") + "\n";
}
