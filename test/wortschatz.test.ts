import { describe, expect, it } from "vitest";
import { difficultyOf, syllableCount } from "../src/shared/difficulty.ts";
import { buildWortschatz, meaningIdFor, parseFile } from "../src/shared/wortschatz.ts";
import { collectionsSql, seedSql, SQL_CHUNK } from "../src/shared/seed.ts";
import { loadSeedData } from "../scripts/seed-data.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { handleApi } from "../src/worker/index.ts";
import type { Meaning } from "../src/shared/types.ts";
import { freshDb, root, run } from "./helpers.ts";

describe("Schwierigkeit", () => {
  it("bewertet kurze, lautgetreue Wörter als leicht", () => {
    for (const w of ["Oma", "Mama", "rot", "Ei", "Hut"]) expect(difficultyOf(w)).toBe(1);
  });
  it("steigt mit Länge und Rechtschreibbesonderheiten", () => {
    expect(difficultyOf("Schmetterling")).toBe(5);
    expect(difficultyOf("Reißverschluss")).toBe(5);
    expect(difficultyOf("Hund")).toBeLessThan(difficultyOf("Schrank"));
    expect(difficultyOf("Sofa")).toBeLessThan(difficultyOf("Computer"));
  });
  it("zählt Silben", () => {
    expect(syllableCount("Banane")).toBe(3);
    expect(syllableCount("Baum")).toBe(1);
  });
});

describe("Wortschatz-Dateien", () => {
  const file = (text: string, name = "100-test.txt") => ({ name, text });
  it("liest Name, Beschreibung, Farbe, Zahl und Bedeutung in Klammern", () => {
    const f = parseFile(file("# Test\n> Beschreibung\n// Kommentar\nrot = red #ff0000\nzwei = two [2]\nBank (Sitzgelegenheit) = bench\n"));
    expect(f).toMatchObject({ id: "test", order: 100, name: "Test", description: "Beschreibung" });
    expect(f.entries.map((e) => [e.de, e.description, e.en])).toEqual([
      ["rot", undefined, "red"],
      ["zwei", undefined, "two"],
      ["Bank", "Sitzgelegenheit", "bench"],
    ]);
  });
  it("lehnt Klammern in der Übersetzung und fehlende Namen ab", () => {
    expect(() => parseFile(file("# Test\nHund = dog (animal)\n"))).toThrow(/Sonderzeichen/);
    expect(() => parseFile(file("Hund = dog\n"))).toThrow(/Sammlungsname/);
    expect(() => parseFile(file("# Test\n", "test.txt"))).toThrow(/Dateiname/);
  });
  it("verlangt bei mehreren Bedeutungen eine Angabe in Klammern", () => {
    const files = [file("# A\nSchloss = castle\nSchloss (Tür) = lock\n", "100-a.txt")];
    expect(() => buildWortschatz(files, [], [])).toThrow(/mehrere Bedeutungen/);
  });
  it("bildet stabile IDs aus Wort und Bedeutung", () => {
    expect(meaningIdFor("Bär")).toBe("n-baer");
    expect(meaningIdFor("groß")).toBe("w-gross");
    expect(meaningIdFor("Bank", "Sitzgelegenheit")).toBe("n-bank--sitzgelegenheit");
  });
});

describe("gesamter Wortschatz", () => {
  const data = loadSeedData(root);
  it("umfasst mindestens 10.000 Bedeutungen in über 200 Sammlungen ohne Warnungen", () => {
    expect(data.rows.length).toBeGreaterThanOrEqual(10_000);
    expect(data.collections.length).toBeGreaterThan(200);
    expect(data.warnings).toEqual([]);
  });
  it("hat für jede Bedeutung eine gültige ID, eine Schwierigkeit und mindestens eine Sammlung", () => {
    const members = new Set(data.collections.flatMap((c) => c.members));
    for (const r of data.rows) {
      expect(r.id).toMatch(/^[a-z0-9-]{1,64}$/);
      expect([1, 2, 3, 4, 5]).toContain(r.difficulty);
      expect(members.has(r.id)).toBe(true);
    }
  });
  it("ordnet über 600 Bedeutungen ein Noto-Bild zu, und jede Datei liegt vor", () => {
    const files = data.rows.map((r) => r.pictogramId).filter((p): p is string => !!p?.startsWith("file:"));
    expect(files.length).toBeGreaterThan(600);
    for (const f of new Set(files)) expect(existsSync(join(root, "public", "pictograms", f.slice(5)))).toBe(true);
    // Wörter mit mehreren Bedeutungen nur aus der Handliste: Schnecke (Tier) ja, Schnecke (Gebäck) nein.
    expect(data.rows.find((r) => r.display === "Schnecke" && r.description === "Tier")?.pictogramId).toBe("file:noto/snail.svg");
    expect(data.rows.find((r) => r.display === "Schnecke" && r.description === "Gebäck")?.pictogramId).toBeNull();
  });
  it("bleibt unter der D1-Grenze von 100 KB je Anweisung", () => {
    const sql = seedSql(data.rows) + collectionsSql(data.collections, data.rows);
    const longest = Math.max(...sql.split(/;\n/).map((s) => new TextEncoder().encode(s).length));
    expect(longest).toBeLessThan(100_000);
    expect(SQL_CHUNK).toBeLessThanOrEqual(100);
  });
  it("lässt sich einspielen, wiederholt einspielen und trägt fehlende Schwierigkeit nach", async () => {
    const { db, dispose } = await freshDb();
    try {
      const sql = seedSql(data.rows) + collectionsSql(data.collections, data.rows);
      await run(db, sql);
      // Bestehende Datenbanken (vor Migration 0003) bekommen die Schwierigkeit beim nächsten Seed nachgetragen.
      await db.prepare("UPDATE meanings SET difficulty = NULL").run();
      await db.prepare("UPDATE meanings SET pictogram_id = NULL WHERE pictogram_id LIKE 'file:%'").run();
      await run(db, sql);
      const n = await db.prepare("SELECT count(*) AS n FROM meanings WHERE difficulty IS NOT NULL").first<{ n: number }>();
      expect(n?.n).toBe(data.rows.length);
      const pics = await db.prepare("SELECT count(*) AS n FROM meanings WHERE pictogram_id LIKE 'file:%'").first<{ n: number }>();
      expect(pics?.n).toBe(data.rows.filter((r) => r.pictogramId?.startsWith("file:")).length);
      const res = await handleApi(new Request("https://t/api/words?q=frosch"), { DB: db });
      const frosch = ((await res.json()) as { meanings: Meaning[] }).meanings.find((m) => m.de === "Frosch");
      expect(frosch?.pictogramUrl).toBe("/pictograms/noto/frog.svg");
      const c = await db.prepare("SELECT count(*) AS n FROM collections").first<{ n: number }>();
      expect(c?.n).toBe(data.collections.length);
    } finally {
      await dispose();
    }
  }, 120_000);
});
