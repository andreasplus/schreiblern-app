import { describe, expect, it } from "vitest";
import { applyFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams, letterCount, MAX_LEN, type Filters } from "../src/client/filters.ts";
import type { Collection, Meaning } from "../src/shared/types.ts";

const m = (id: string, de: string, en: string, collections: Record<string, number> = {}, description: string | null = null): Meaning => ({
  id, wordId: `de:${de}`, de, en, description, kind: "word", number: null, color: null, pictogram: null, pictogramUrl: null, status: "reference",
  collection: null, sortOrder: null, difficulty: null, collections: Object.keys(collections), collectionPositions: collections,
});
const cols: Collection[] = [
  { id: "tiere", name: "Tiere", description: null, count: 3 },
  { id: "essen", name: "Essen", description: null, count: 2 },
];
const words = [
  m("kuh", "Kuh", "cow", { tiere: 3 }),
  m("hund", "Hund", "dog", { tiere: 1 }),
  m("maus", "Maus", "mouse", { tiere: 2 }),
  m("apfel", "Apfel", "apple", { essen: 1 }),
  m("ei", "Ei", "egg", { essen: 2 }),
  m("strasse", "Straße", "street"),
  m("baer", "Bär", "bear"),
];
const run = (f: Partial<Filters>) => applyFilters(words, cols, { ...DEFAULT_FILTERS, ...f }).map((x) => x.id);

describe("letterCount", () => {
  it("zählt Umlaute und ß als einen Buchstaben, ignoriert Ziffern und Leerzeichen", () => {
    expect(letterCount("Straße")).toBe(6);
    expect(letterCount("Bär")).toBe(3);
    expect(letterCount("grün")).toBe(4);
    expect(letterCount("eins 1")).toBe(4);
  });
});

describe("applyFilters", () => {
  it("sortiert nach Sammlung und Position, Wörter ohne Sammlung zuletzt", () => {
    expect(run({})).toEqual(["hund", "maus", "kuh", "apfel", "ei", "baer", "strasse"]);
  });
  it("filtert nach Sammlung in deren Reihenfolge", () => {
    expect(run({ collection: "essen" })).toEqual(["apfel", "ei"]);
  });
  it("sortiert alphabetisch nach deutscher Regel (Bär neben Ball, nicht am Ende)", () => {
    expect(run({ sort: "alpha" })).toEqual(["apfel", "baer", "ei", "hund", "kuh", "maus", "strasse"]);
  });
  it("sortiert alphabetisch nach Englisch", () => {
    expect(run({ sort: "alpha", lang: "en" })).toEqual(["apfel", "baer", "kuh", "hund", "ei", "maus", "strasse"]);
  });
  it("sortiert nach Länge", () => {
    expect(run({ sort: "length" })).toEqual(["ei", "baer", "kuh", "hund", "maus", "apfel", "strasse"]);
  });
  it("filtert 3 Buchstaben auf Deutsch und auf Englisch", () => {
    expect(run({ minLen: 3, maxLen: 3, sort: "alpha" })).toEqual(["baer", "kuh"]);
    expect(run({ minLen: 3, maxLen: 3, lang: "en", sort: "alpha" })).toEqual(["kuh", "hund", "ei"]);
  });
  it("filtert 3 bis 5 Buchstaben", () => {
    expect(run({ minLen: 3, maxLen: 5, sort: "alpha" })).toEqual(["apfel", "baer", "hund", "kuh", "maus"]);
  });
  it("behandelt die Höchstlänge als offen nach oben", () => {
    expect(run({ minLen: 6, maxLen: MAX_LEN })).toEqual(["strasse"]);
  });
  it("sucht deutsch und englisch, ohne Umlaute gleichzusetzen", () => {
    expect(run({ query: "  HUN" })).toEqual(["hund"]);
    expect(run({ query: "mous" })).toEqual(["maus"]);
    expect(run({ query: "bar" })).toEqual([]);
    expect(run({ query: "bär" })).toEqual(["baer"]);
  });
});

describe("Schwierigkeit und Adressparameter", () => {
  const withDiff = words.map((w, i) => ({ ...w, difficulty: (i % 5) + 1 }));
  const runD = (f: Partial<Filters>) => applyFilters(withDiff, cols, { ...DEFAULT_FILTERS, ...f });
  it("filtert nach Schwierigkeitsstufen", () => {
    expect(runD({ minDiff: 2, maxDiff: 3 }).every((m) => m.difficulty! >= 2 && m.difficulty! <= 3)).toBe(true);
    expect(runD({ minDiff: 2, maxDiff: 3 })).toHaveLength(3);
  });
  it("sortiert nach Schwierigkeit, dann nach Länge", () => {
    const d = runD({ sort: "difficulty" }).map((m) => m.difficulty);
    expect(d).toEqual([...d].sort());
  });
  it("übersetzt Filter verlustfrei in Adressparameter und zurück", () => {
    const f: Filters = { query: "Bär", collection: "tiere", lang: "en", minLen: 3, maxLen: 5, minDiff: 2, maxDiff: 4, sort: "difficulty", printed: "open" };
    expect(filtersFromParams(filtersToParams(f))).toEqual(f);
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe("");
  });
  it("ersetzt ungültige Parameter durch Standardwerte", () => {
    const f = filtersFromParams(new URLSearchParams("collection=../x&minDiff=9&maxDiff=0&sort=evil&minLen=abc&printed=x"));
    expect(f).toEqual(DEFAULT_FILTERS);
  });
});

describe("Filter gedruckt", () => {
  const printed = new Set(["hund", "maus"]);
  const runP = (mode: Filters["printed"]) => applyFilters(words, cols, { ...DEFAULT_FILTERS, printed: mode }, printed).map((m) => m.id);
  it("zeigt alle, nur offene oder nur gedruckte Seiten", () => {
    const all = runP("all");
    expect(runP("done").sort()).toEqual(["hund", "maus"]);
    expect(runP("open")).toEqual(all.filter((id) => !printed.has(id)));
  });
  it("ignoriert Markierungen ohne aktiven Filter", () => {
    expect(applyFilters(words, cols, DEFAULT_FILTERS, printed)).toHaveLength(words.length);
  });
});
