import type { Collection, Meaning } from "../shared/types.ts";
import { normalizeTerm } from "../shared/normalize.ts";

export type SortKey = "collection" | "alpha" | "length";
export type Lang = "de" | "en";

export interface Filters {
  query: string;
  /** "" = alle Sammlungen */
  collection: string;
  /** Sprache für Sortierung und Längenfilter */
  lang: Lang;
  minLen: number;
  maxLen: number;
  sort: SortKey;
}

export const MAX_LEN = 15;
export const DEFAULT_FILTERS: Filters = { query: "", collection: "", lang: "de", minLen: 1, maxLen: MAX_LEN, sort: "collection" };

/** Anzahl Buchstaben (ohne Leerzeichen, Ziffern und Satzzeichen); ß und Umlaute zählen als ein Buchstabe. */
export function letterCount(word: string): number {
  let n = 0;
  for (const ch of word.normalize("NFC")) if (/\p{L}/u.test(ch)) n++;
  return n;
}

const wordOf = (m: Meaning, lang: Lang) => (lang === "de" ? m.de : m.en);

export function applyFilters(words: Meaning[], collections: Collection[], f: Filters): Meaning[] {
  const q = normalizeTerm(f.query);
  const collOrder = new Map(collections.map((c, i) => [c.id, i]));
  const out = words.filter((m) => {
    if (f.collection && !m.collections?.includes(f.collection)) return false;
    const len = letterCount(wordOf(m, f.lang));
    if (len < f.minLen || (f.maxLen < MAX_LEN && len > f.maxLen)) return false;
    if (q && !normalizeTerm(m.de).includes(q) && !normalizeTerm(m.en).includes(q)) return false;
    return true;
  });

  const alpha = (a: Meaning, b: Meaning) =>
    wordOf(a, f.lang).localeCompare(wordOf(b, f.lang), f.lang === "de" ? "de" : "en", { sensitivity: "base" }) ||
    (a.description ?? "").localeCompare(b.description ?? "", "de");

  const collKey = (m: Meaning): [number, number] => {
    if (f.collection) return [0, m.collectionPositions?.[f.collection] ?? Number.MAX_SAFE_INTEGER];
    const first = m.collections?.[0];
    if (!first) return [Number.MAX_SAFE_INTEGER, 0];
    return [collOrder.get(first) ?? Number.MAX_SAFE_INTEGER, m.collectionPositions?.[first] ?? 0];
  };

  return out.sort((a, b) => {
    if (f.sort === "alpha") return alpha(a, b);
    if (f.sort === "length") return letterCount(wordOf(a, f.lang)) - letterCount(wordOf(b, f.lang)) || alpha(a, b);
    const [ga, pa] = collKey(a);
    const [gb, pb] = collKey(b);
    return ga - gb || pa - pb || alpha(a, b);
  });
}
