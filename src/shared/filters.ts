import type { Collection, Meaning } from "./types.ts";
import { normalizeTerm } from "./normalize.ts";

export type SortKey = "collection" | "alpha" | "length" | "difficulty";
export type Lang = "de" | "en";
/** all = alle Seiten, open = noch nicht gedruckt, done = schon gedruckt */
export type PrintedMode = "all" | "open" | "done";

export interface Filters {
  query: string;
  /** "" = alle Sammlungen */
  collection: string;
  /** Sprache für Sortierung und Längenfilter */
  lang: Lang;
  minLen: number;
  maxLen: number;
  /** Schwierigkeitsstufe 1 (sehr leicht) bis 5 (sehr schwer) */
  minDiff: number;
  maxDiff: number;
  sort: SortKey;
  /** Filter nach den im Browser als gedruckt markierten Seiten */
  printed: PrintedMode;
}

export const MAX_LEN = 15;
export const MAX_DIFF = 5;
export const DEFAULT_FILTERS: Filters = {
  query: "",
  collection: "",
  lang: "de",
  minLen: 1,
  maxLen: MAX_LEN,
  minDiff: 1,
  maxDiff: MAX_DIFF,
  sort: "collection",
  printed: "all",
};
const SORT_KEYS: readonly SortKey[] = ["collection", "alpha", "length", "difficulty"];
const PRINTED_MODES: readonly PrintedMode[] = ["all", "open", "done"];
/** Höchstzahl gedruckter IDs, die der Server pro Abruf annimmt */
export const MAX_PRINTED_IDS = 20000;

/** Anzahl Buchstaben (ohne Leerzeichen, Ziffern und Satzzeichen); ß und Umlaute zählen als ein Buchstabe. */
export function letterCount(word: string): number {
  let n = 0;
  for (const ch of word.normalize("NFC")) if (/\p{L}/u.test(ch)) n++;
  return n;
}

const wordOf = (m: Meaning, lang: Lang) => (lang === "de" ? m.de : m.en);

const collators = { de: new Intl.Collator("de", { sensitivity: "base" }), en: new Intl.Collator("en", { sensitivity: "base" }) };

/** printed: IDs der als gedruckt markierten Seiten; nur bei f.printed ≠ "all" von Bedeutung. */
export function applyFilters(words: Meaning[], collections: Collection[], f: Filters, printed: ReadonlySet<string> = new Set()): Meaning[] {
  const q = normalizeTerm(f.query);
  const collOrder = new Map(collections.map((c, i) => [c.id, i]));
  const diffActive = f.minDiff > 1 || f.maxDiff < MAX_DIFF;
  const coll = collators[f.lang];
  const desc = collators.de;

  // Schlüssel einmal je Wort berechnen; bei 10.000 Wörtern ist das deutlich schneller als im Vergleich.
  const items: Array<{ m: Meaning; len: number; group: number; pos: number }> = [];
  for (const m of words) {
    if (f.collection && !m.collections?.includes(f.collection)) continue;
    if (f.printed !== "all" && printed.has(m.id) !== (f.printed === "done")) continue;
    const len = letterCount(wordOf(m, f.lang));
    if (len < f.minLen || (f.maxLen < MAX_LEN && len > f.maxLen)) continue;
    if (diffActive && (m.difficulty == null || m.difficulty < f.minDiff || m.difficulty > f.maxDiff)) continue;
    if (q && !normalizeTerm(m.de).includes(q) && !normalizeTerm(m.en).includes(q)) continue;
    let group = 0;
    let pos: number;
    if (f.collection) pos = m.collectionPositions?.[f.collection] ?? Number.MAX_SAFE_INTEGER;
    else {
      const first = m.collections?.[0];
      group = first ? (collOrder.get(first) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      pos = first ? (m.collectionPositions?.[first] ?? 0) : 0;
    }
    items.push({ m, len, group, pos });
  }

  type Item = (typeof items)[number];
  const alpha = (a: Item, b: Item) =>
    coll.compare(wordOf(a.m, f.lang), wordOf(b.m, f.lang)) || desc.compare(a.m.description ?? "", b.m.description ?? "");

  items.sort((a, b) => {
    if (f.sort === "alpha") return alpha(a, b);
    if (f.sort === "length") return a.len - b.len || alpha(a, b);
    if (f.sort === "difficulty") return (a.m.difficulty ?? MAX_DIFF + 1) - (b.m.difficulty ?? MAX_DIFF + 1) || a.len - b.len || alpha(a, b);
    return a.group - b.group || a.pos - b.pos || alpha(a, b);
  });
  return items.map((i) => i.m);
}

const intIn = (raw: string | null, min: number, max: number, fallback: number) => {
  const n = raw === null || raw === "" ? NaN : Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

/** Filter als Adressparameter, nur abweichende Werte. Gegenstück zu filtersFromParams. */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.query) p.set("q", f.query);
  if (f.collection) p.set("collection", f.collection);
  if (f.lang !== DEFAULT_FILTERS.lang) p.set("lang", f.lang);
  if (f.minLen !== DEFAULT_FILTERS.minLen) p.set("minLen", String(f.minLen));
  if (f.maxLen !== DEFAULT_FILTERS.maxLen) p.set("maxLen", String(f.maxLen));
  if (f.minDiff !== DEFAULT_FILTERS.minDiff) p.set("minDiff", String(f.minDiff));
  if (f.maxDiff !== DEFAULT_FILTERS.maxDiff) p.set("maxDiff", String(f.maxDiff));
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  if (f.printed !== DEFAULT_FILTERS.printed) p.set("printed", f.printed);
  return p;
}

/** Liest Filter aus Adressparametern. Ungültige Werte fallen auf den Standard zurück. */
export function filtersFromParams(p: URLSearchParams): Filters {
  const collection = p.get("collection") ?? "";
  const sort = p.get("sort") as SortKey | null;
  const printed = p.get("printed") as PrintedMode | null;
  const minLen = intIn(p.get("minLen"), 1, MAX_LEN, DEFAULT_FILTERS.minLen);
  const minDiff = intIn(p.get("minDiff"), 1, MAX_DIFF, DEFAULT_FILTERS.minDiff);
  return {
    query: (p.get("q") ?? "").slice(0, 60),
    collection: /^[a-z0-9-]{1,64}$/.test(collection) ? collection : "",
    lang: p.get("lang") === "en" ? "en" : "de",
    minLen,
    maxLen: Math.max(minLen, intIn(p.get("maxLen"), 1, MAX_LEN, DEFAULT_FILTERS.maxLen)),
    minDiff,
    maxDiff: Math.max(minDiff, intIn(p.get("maxDiff"), 1, MAX_DIFF, DEFAULT_FILTERS.maxDiff)),
    sort: sort && SORT_KEYS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    printed: printed && PRINTED_MODES.includes(printed) ? printed : DEFAULT_FILTERS.printed,
  };
}
