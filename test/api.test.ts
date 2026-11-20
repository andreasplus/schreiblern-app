import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleApi } from "../src/worker/index.ts";
import { collectionsSql, seedSql, toSeedRows } from "../src/shared/seed.ts";
import type { Collection, Meaning, SearchResponse, WordsPage } from "../src/shared/types.ts";
import { difficultyOf } from "../src/shared/difficulty.ts";
import { collectionRecords, freshDb, run, seedRecords } from "./helpers.ts";

let db: D1Database;
const rowsCount = () => toSeedRows(seedRecords()).length + 2; // + schon/schön aus dem Test
let dispose: () => Promise<void>;
const call = async <T>(path: string, init?: RequestInit) => {
  const res = await handleApi(new Request(`https://test.local${path}`, init), { DB: db });
  return { status: res.status, body: (await res.json()) as T };
};

beforeAll(async () => {
  ({ db, dispose } = await freshDb());
  const rows = toSeedRows(seedRecords());
  await run(db, seedSql(rows) + collectionsSql(collectionRecords(), rows));
  // Testwörter für Umlaut-Unterscheidung
  await run(db, `INSERT INTO words (id, lang, display, normalized) VALUES ('de:schon', 'de', 'schon', 'schon'), ('de:schön', 'de', 'schön', 'schön');
INSERT INTO meanings (id, word_id, sense_key, translation_en, kind, status, source) VALUES ('t-schon', 'de:schon', '', 'already', 'word', 'draft', 'test'), ('t-schoen', 'de:schön', '', 'beautiful', 'word', 'draft', 'test');
`);
});
afterAll(() => dispose?.());

describe("Suche", () => {
  it("findet Auto trotz Leerzeichen und Großschreibung", async () => {
    const { body } = await call<SearchResponse>("/api/search?q=%20%20AUTO%20");
    expect(body.results[0]).toMatchObject({ de: "Auto", exact: true });
    expect(body.results[0]!.meanings[0]).toMatchObject({ en: "car", pictogram: "Auto" });
  });
  it("liefert für Bank beide Bedeutungen", async () => {
    const { body } = await call<SearchResponse>("/api/search?q=bank");
    expect(body.results).toHaveLength(1);
    expect(body.results[0]!.meanings.map((m) => `${m.description}:${m.en}`)).toEqual(["Geldinstitut:bank", "Sitzgelegenheit:bench"]);
  });
  it("setzt schon und schön nicht gleich", async () => {
    const a = await call<SearchResponse>("/api/search?q=schon");
    expect(a.body.results.map((w) => w.de)).toEqual(["schon"]);
    const b = await call<SearchResponse>("/api/search?q=Sch%C3%B6n");
    expect(b.body.results.map((w) => w.de)).toEqual(["schön"]);
  });
  it("sortiert exakte Treffer vor Wortanfängen", async () => {
    const { body } = await call<SearchResponse>("/api/search?q=ei");
    expect(body.results.map((w) => [w.de, w.exact])).toEqual([["Ei", true], ["eins", false]]);
  });
  it("behandelt % und _ wörtlich", async () => {
    expect((await call<SearchResponse>("/api/search?q=%25")).body.results).toEqual([]);
    expect((await call<SearchResponse>("/api/search?q=_")).body.results).toEqual([]);
  });
  it("liefert Farben und Zahlen mit ihren Daten", async () => {
    const blau = (await call<SearchResponse>("/api/search?q=blau")).body.results[0]!.meanings[0]!;
    expect(blau).toMatchObject({ kind: "color", color: "#3286df" });
    const eins = (await call<SearchResponse>("/api/search?q=eins")).body.results[0]!.meanings[0]!;
    expect(eins).toMatchObject({ kind: "number", number: 1, en: "one" });
  });
  it("lehnt zu lange Suchbegriffe ab", async () => {
    expect((await call("/api/search?q=" + "a".repeat(61))).status).toBe(400);
  });
});

describe("Abruf für den Druck", () => {
  it("liefert Bedeutungen in angefragter Reihenfolge und lässt unbekannte aus", async () => {
    const { body } = await call<{ meanings: Meaning[] }>("/api/meanings?ids=number-10,unbekannt,seed-015,extra-blitz");
    expect(body.meanings.map((m) => m.de)).toEqual(["zehn", "Banane", "Blitz"]);
  });
  it("begrenzt die Anzahl", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`).join(",");
    expect((await call(`/api/meanings?ids=${ids}`)).status).toBe(400);
  });
  it("listet Sammlungen mit Anzahl", async () => {
    const { body } = await call<{ collections: Collection[] }>("/api/collections");
    expect(body.collections.map((c) => c.id).slice(0, 3)).toEqual(["erste-woerter", "zahlen", "farben"]);
    expect(body.collections.find((c) => c.id === "tiere")?.count).toBe(6);
  });
  it("liefert eine Sammlung in ihrer Reihenfolge", async () => {
    const { body } = await call<{ meanings: Meaning[] }>("/api/collections/farben");
    expect(body.meanings.map((m) => m.de).slice(0, 4)).toEqual(["rot", "blau", "grün", "gelb"]);
    expect(body.meanings.every((m) => m.kind === "color")).toBe(true);
  });
  it("liefert alle Wörter mit Sammlungen, Positionen und Schwierigkeit", async () => {
    const { body } = await call<WordsPage>("/api/words");
    const kuh = body.meanings.find((m) => m.de === "Kuh")!;
    expect(kuh.collections).toEqual(["erste-woerter", "tiere"]);
    expect(kuh.collectionPositions).toEqual({ "erste-woerter": 10, tiere: 5 });
    expect(kuh.difficulty).toBe(difficultyOf("Kuh"));
    expect(body.meanings.length).toBe(rowsCount());
    expect(body.total).toBe(rowsCount());
    expect(body.meanings.filter((m) => m.id.startsWith("t-")).every((m) => m.difficulty === null)).toBe(true);
  });
  it("teilt die Wortübersicht in Seiten", async () => {
    const all = (await call<WordsPage>("/api/words?sort=alpha")).body.meanings.map((m) => m.id);
    const p1 = (await call<WordsPage>("/api/words?sort=alpha&limit=10")).body;
    const p2 = (await call<WordsPage>("/api/words?sort=alpha&limit=10&offset=10")).body;
    expect(p1.total).toBe(all.length);
    expect([...p1.meanings, ...p2.meanings].map((m) => m.id)).toEqual(all.slice(0, 20));
    expect(p2.meanings[0]!.collections).toBeDefined();
  });
  it("filtert serverseitig nach Sammlung, Schwierigkeit, Länge und Suche", async () => {
    const farben = (await call<WordsPage>("/api/words?collection=farben")).body;
    expect(farben.meanings.map((m) => m.de).slice(0, 4)).toEqual(["rot", "blau", "grün", "gelb"]);
    expect(farben.total).toBe(farben.meanings.length);
    const leicht = (await call<WordsPage>("/api/words?maxDiff=1")).body.meanings;
    expect(leicht.length).toBeGreaterThan(0);
    expect(leicht.every((m) => m.difficulty === 1)).toBe(true);
    const drei = (await call<WordsPage>("/api/words?minLen=3&maxLen=3")).body.meanings;
    expect(drei.every((m) => [...m.de].filter((c) => /\p{L}/u.test(c)).length === 3)).toBe(true);
    const suche = (await call<WordsPage>("/api/words?q=kuh")).body.meanings;
    expect(suche.map((m) => m.de)).toContain("Kuh");
  });
  it("sortiert nach Schwierigkeit", async () => {
    const d = (await call<WordsPage>("/api/words?sort=difficulty&limit=500")).body.meanings.map((m) => m.difficulty ?? 6);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });
  it("prüft limit, offset und Suchlänge", async () => {
    expect((await call("/api/words?limit=0")).status).toBe(400);
    expect((await call("/api/words?limit=501")).status).toBe(400);
    expect((await call("/api/words?offset=-1")).status).toBe(400);
    expect((await call("/api/words?q=" + "a".repeat(61))).status).toBe(400);
  });
  it("liefert Seed-Gruppen weiterhin in Seed-Reihenfolge", async () => {
    const { body } = await call<{ meanings: Meaning[] }>("/api/collections/words");
    expect(body.meanings).toHaveLength(25);
    expect(body.meanings[0]!.de).toBe("Auto");
    expect(body.meanings[24]!.de).toBe("Mama");
  });
  it("lehnt andere Methoden ab", async () => {
    expect((await call("/api/search?q=a", { method: "POST" })).status).toBe(405);
  });
});
