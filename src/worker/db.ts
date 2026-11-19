import type { Meaning, SearchResultWord } from "../shared/types.ts";
import { normalizeTerm } from "../shared/normalize.ts";

export const MAX_QUERY_LENGTH = 60;
export const MAX_IDS = 100;
const MAX_WORDS = 20;

interface MeaningRow {
  id: string;
  word_id: string;
  display: string;
  normalized: string;
  description: string | null;
  translation_en: string;
  kind: Meaning["kind"];
  number_value: number | null;
  color_hex: string | null;
  pictogram_id: string | null;
  status: Meaning["status"];
  collection: string | null;
  sort_order: number | null;
}

const SELECT = `SELECT m.id, m.word_id, w.display, w.normalized, m.description, m.translation_en, m.kind,
  m.number_value, m.color_hex, m.pictogram_id, m.status, m.collection, m.sort_order
  FROM meanings m JOIN words w ON w.id = m.word_id`;

export function toMeaning(r: MeaningRow): Meaning {
  return {
    id: r.id,
    wordId: r.word_id,
    de: r.display,
    en: r.translation_en,
    description: r.description,
    kind: r.kind,
    number: r.number_value,
    color: r.color_hex,
    pictogram: r.pictogram_id?.startsWith("builtin:") ? r.pictogram_id.slice("builtin:".length) : null,
    status: r.status,
    collection: r.collection,
    sortOrder: r.sort_order,
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Treffer: exakte Suchform zuerst, dann Wortanfänge. Bedeutungen je Wort gruppiert. */
export async function searchWords(db: D1Database, rawQuery: string): Promise<SearchResultWord[]> {
  const q = normalizeTerm(rawQuery);
  if (!q) return [];
  const { results } = await db
    .prepare(
      `${SELECT} WHERE w.id IN (
         SELECT id FROM words WHERE lang = 'de' AND (normalized = ?1 OR normalized LIKE ?2 ESCAPE '\\')
         ORDER BY normalized = ?1 DESC, length(normalized), normalized LIMIT ${MAX_WORDS})
       ORDER BY w.normalized = ?1 DESC, length(w.normalized), w.normalized, w.display,
         m.collection, m.sort_order, m.description, m.id`,
    )
    .bind(q, `${escapeLike(q)}%`)
    .all<MeaningRow>();
  const words = new Map<string, SearchResultWord>();
  for (const row of results) {
    let w = words.get(row.word_id);
    if (!w) {
      w = { wordId: row.word_id, de: row.display, exact: row.normalized === q, meanings: [] };
      words.set(row.word_id, w);
    }
    w.meanings.push(toMeaning(row));
  }
  return [...words.values()];
}

/** Bedeutungen in der angefragten Reihenfolge; unbekannte IDs werden ausgelassen. */
export async function getMeanings(db: D1Database, ids: string[]): Promise<Meaning[]> {
  if (!ids.length) return [];
  const unique = [...new Set(ids)];
  const placeholders = unique.map((_, i) => `?${i + 1}`).join(",");
  const { results } = await db.prepare(`${SELECT} WHERE m.id IN (${placeholders})`).bind(...unique).all<MeaningRow>();
  const byId = new Map(results.map((r) => [r.id, toMeaning(r)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export async function getCollection(db: D1Database, name: string): Promise<Meaning[]> {
  const { results } = await db.prepare(`${SELECT} WHERE m.collection = ?1 ORDER BY m.sort_order, m.id`).bind(name).all<MeaningRow>();
  return results.map(toMeaning);
}
