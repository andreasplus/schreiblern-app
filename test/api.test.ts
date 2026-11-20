import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleApi } from "../src/worker/index.ts";
import { collectionsSql, seedSql, toSeedRows } from "../src/shared/seed.ts";
import type { Collection, Meaning, SearchResponse } from "../src/shared/types.ts";
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
  it("liefert alle Wörter mit Sammlungen und Positionen", async () => {
    const { body } = await call<{ meanings: Meaning[] }>("/api/words");
    const kuh = body.meanings.find((m) => m.de === "Kuh")!;
    expect(kuh.collections).toEqual(["erste-woerter", "tiere"]);
    expect(kuh.collectionPositions).toEqual({ "erste-woerter": 10, tiere: 5 });
    expect(body.meanings.length).toBe(rowsCount());
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
