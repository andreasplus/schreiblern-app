import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleApi } from "../src/worker/index.ts";
import { seedSql, toSeedRows } from "../src/shared/seed.ts";
import type { Meaning, SearchResponse } from "../src/shared/types.ts";
import { freshDb, run, seedRecords } from "./helpers.ts";

let db: D1Database;
let dispose: () => Promise<void>;
const call = async <T>(path: string, init?: RequestInit) => {
  const res = await handleApi(new Request(`https://test.local${path}`, init), { DB: db });
  return { status: res.status, body: (await res.json()) as T };
};

beforeAll(async () => {
  ({ db, dispose } = await freshDb());
  await run(db, seedSql(toSeedRows(seedRecords())));
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
  it("liefert Sammlungen in Seed-Reihenfolge", async () => {
    const { body } = await call<{ meanings: Meaning[] }>("/api/collections/words");
    expect(body.meanings).toHaveLength(25);
    expect(body.meanings[0]!.de).toBe("Auto");
    expect(body.meanings[24]!.de).toBe("Mama");
  });
  it("lehnt andere Methoden ab", async () => {
    expect((await call("/api/search?q=a", { method: "POST" })).status).toBe(405);
  });
});
