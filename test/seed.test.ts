import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findSeedConflicts, seedSql, toSeedRows, SEED_CHECK_SQL, type ExistingMeaning } from "../src/shared/seed.ts";
import { freshDb, run, seedRecords } from "./helpers.ts";

describe("Seed-Daten", () => {
  const rows = toSeedRows(seedRecords());
  it("enthält die 25 Wortpaare in derselben Reihenfolge", () => {
    const words = rows.filter((r) => r.collection === "words").sort((a, b) => a.sortOrder - b.sortOrder);
    expect(words).toHaveLength(25);
    expect(words.slice(0, 3).map((r) => r.display)).toEqual(["Auto", "blau", "Haus"]);
    expect(words.at(-1)!.display).toBe("Mama");
  });
  it("enthält eins bis zehn mit Ziffern und Blitz/lightning", () => {
    const nums = rows.filter((r) => r.kind === "number").sort((a, b) => a.number! - b.number!);
    expect(nums.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rows.find((r) => r.display === "Blitz")?.en).toBe("lightning");
  });
  it("gibt Farben einen Farbwert", () => {
    for (const r of rows.filter((r) => r.kind === "color")) expect(r.color).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("trennt Bank als Geldinstitut und Sitzgelegenheit", () => {
    const bank = rows.filter((r) => r.display === "Bank");
    expect(bank.map((r) => [r.description, r.en])).toEqual([["Geldinstitut", "bank"], ["Sitzgelegenheit", "bench"]]);
    expect(new Set(bank.map((r) => r.wordId)).size).toBe(1);
  });
  it("lehnt doppelte Bedeutungen ab", () => {
    const recs = seedRecords();
    expect(() => toSeedRows([...recs, { ...recs[0]!, id: "kopie" }])).toThrow(/doppelt/);
  });
});

describe("Seed-Import in D1", () => {
  let db: D1Database;
  let dispose: () => Promise<void>;
  const rows = toSeedRows(seedRecords());
  beforeAll(async () => ({ db, dispose } = await freshDb()));
  afterAll(() => dispose?.());

  it("ist wiederholbar ohne Dubletten", async () => {
    await run(db, seedSql(rows));
    await run(db, seedSql(rows));
    const count = await db.prepare("SELECT (SELECT count(*) FROM meanings) AS m, (SELECT count(*) FROM words) AS w").first<{ m: number; w: number }>();
    expect(count).toEqual({ m: 38, w: 37 });
  });

  it("überschreibt geänderte Einträge nicht und meldet die Abweichung", async () => {
    await db.prepare("UPDATE meanings SET translation_en = 'automobile' WHERE id = 'seed-001'").run();
    await run(db, seedSql(rows));
    const existing = (await db.prepare(SEED_CHECK_SQL).all<ExistingMeaning>()).results;
    expect(existing.find((e) => e.id === "seed-001")?.translation_en).toBe("automobile");
    const conflicts = findSeedConflicts(rows, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatch(/seed-001.*„automobile“ statt „car“/);
  });

  it("verhindert doppelte Bedeutungen auch unter anderer ID", async () => {
    await expect(
      db.prepare("INSERT INTO meanings (id, word_id, sense_key, translation_en, kind, status, source) VALUES ('x', 'de:Bank', 'geldinstitut', 'bank', 'word', 'draft', 'test')").run(),
    ).rejects.toThrow(/UNIQUE/);
  });
});
