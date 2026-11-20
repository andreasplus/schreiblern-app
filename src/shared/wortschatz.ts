/**
 * Wortschatz in Alltags-Sammlungen (data/wortschatz/*.txt).
 *
 * Jede Datei ist eine Sammlung. Der Dateiname bestimmt Reihenfolge und ID
 * („120-am-bahnhof.txt“ → Sammlung „am-bahnhof“ an Position 120). Aufbau:
 *
 *   # Am Bahnhof                       ← Name der Sammlung (Pflicht, erste Zeile)
 *   > Züge, Gleise und Fahrkarten      ← Beschreibung (optional)
 *   ## Unterthema                      ← nur zur Gliederung, wird ignoriert
 *   Zug = train
 *   Bank (Sitzgelegenheit) = bench     ← Bedeutungsangabe in Klammern
 *   pink = pink #e754a6                ← Farbwort mit Farbwert
 *   elf = eleven [11]                  ← Zahlwort mit Zählpunkten (0 bis 20)
 *
 * Ein Wort mit derselben Bedeutung darf in beliebig vielen Sammlungen stehen und wird nur
 * einmal angelegt. Bereits vorhandene Bedeutungen (seed-words.json, seed-supplement.json)
 * werden über Wort und Bedeutungsangabe erkannt und mit ihrer ID wiederverwendet.
 * Innerhalb einer Sammlung werden neue Einträge nach Schwierigkeit, Länge und Alphabet sortiert.
 */
import { cleanDisplay, normalizeTerm } from "./normalize.ts";
import { difficultyOf, letterCount } from "./difficulty.ts";
import type { CollectionRecord, SeedRecord } from "./seed.ts";

export interface WortschatzFile {
  /** Dateiname ohne Pfad, z. B. „120-am-bahnhof.txt“ */
  name: string;
  text: string;
}

export interface WortschatzResult {
  /** Neue Bedeutungen (ohne die bereits vorhandenen Seed-Einträge) */
  records: SeedRecord[];
  /** Vorhandene Sammlungen, ergänzt um die neuen, mit allen Mitgliedern */
  collections: CollectionRecord[];
  /**
   * Gleiches Wort ohne Bedeutungsangabe mit abweichender Übersetzung. Es gilt die zuerst
   * gefundene Übersetzung; echte Mehrdeutigkeiten bekommen eine Angabe in Klammern.
   */
  warnings: string[];
}

interface Entry {
  de: string;
  en: string;
  description?: string;
  color?: string;
  number?: number;
  where: string;
}

const LINE = /^(.+?)(?:\s*\(([^()]+)\))?\s*=\s*(.+?)(?:\s+(#[0-9a-f]{6}))?(?:\s+\[(\d{1,2})\])?$/;
const FILE = /^(\d{3})-([a-z0-9-]+)\.txt$/;

export const SOURCE = "Wortschatz Schreiblern-App (eigene Zusammenstellung), Sammlung";

/** Stabile, URL-taugliche ID: n- für großgeschriebene, w- für kleingeschriebene Wörter. */
export function meaningIdFor(display: string, description?: string): string {
  const slug = (s: string) =>
    s
      .normalize("NFC")
      .toLocaleLowerCase("de-DE")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const first = display.trim()[0] ?? "";
  const prefix = first !== first.toLocaleLowerCase("de-DE") ? "n" : "w";
  const id = `${prefix}-${slug(display)}${description ? `--${slug(description)}` : ""}`;
  if (id.length > 64) throw new Error(`ID zu lang: ${id}`);
  return id;
}

export function parseFile(file: WortschatzFile): { id: string; order: number; name: string; description?: string; entries: Entry[] } {
  const m = FILE.exec(file.name);
  if (!m) throw new Error(`Dateiname ungültig (erwartet NNN-name.txt): ${file.name}`);
  const lines = file.text.split(/\r?\n/);
  let name = "";
  let description: string | undefined;
  const entries: Entry[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const where = `${file.name}:${i + 1}`;
    if (!line || line.startsWith("//") || line.startsWith("##")) return;
    if (line.startsWith("# ")) {
      if (name) throw new Error(`${where}: zweiter Sammlungsname`);
      name = cleanDisplay(line.slice(2));
      return;
    }
    if (line.startsWith(">")) {
      description = cleanDisplay(line.slice(1));
      return;
    }
    const e = LINE.exec(line);
    if (!e) throw new Error(`${where}: Zeile nicht lesbar: ${line}`);
    const [, de, desc, en, color, num] = e;
    const entry: Entry = { de: cleanDisplay(de!), en: cleanDisplay(en!), where };
    if (desc) entry.description = cleanDisplay(desc);
    if (color) entry.color = color;
    if (num !== undefined) {
      entry.number = Number(num);
      if (entry.number > 20) throw new Error(`${where}: Zählpunkte nur bis 20`);
    }
    if (!entry.de || !entry.en) throw new Error(`${where}: Wort oder Übersetzung fehlt`);
    if (/[()=#\[\]]/.test(entry.en)) throw new Error(`${where}: Übersetzung enthält Sonderzeichen: ${entry.en}`);
    entries.push(entry);
  });
  if (!name) throw new Error(`${file.name}: Sammlungsname fehlt (erste Zeile „# Name“)`);
  return { id: m[2]!, order: Number(m[1]), name, description, entries };
}

const keyOf = (de: string, description?: string) => `${cleanDisplay(de)}|${description ? normalizeTerm(description) : ""}`;

export function buildWortschatz(files: WortschatzFile[], existing: SeedRecord[], baseCollections: CollectionRecord[]): WortschatzResult {
  const parsed = files.map(parseFile).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const byKey = new Map<string, SeedRecord>();
  for (const r of existing) byKey.set(keyOf(r.de, r.description), r);

  const records: SeedRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set(existing.map((r) => r.id));
  const firstSeen = new Map<string, string>();

  const collections = baseCollections.map((c) => ({ ...c, members: [...c.members] }));
  const byId = new Map(collections.map((c) => [c.id, c]));
  const seenIds = new Set<string>();

  for (const file of parsed) {
    if (seenIds.has(file.id)) errors.push(`Sammlung doppelt: ${file.id}`);
    seenIds.add(file.id);
    const fresh: SeedRecord[] = [];
    for (const e of file.entries) {
      const key = keyOf(e.de, e.description);
      let rec = byKey.get(key);
      if (rec) {
        if (rec.en !== e.en) warnings.push(`${e.where}: „${e.de}“ heißt in ${firstSeen.get(key) ?? "den Seed-Daten"} „${rec.en}“, hier „${e.en}“. Bitte Bedeutung in Klammern angeben.`);
      } else {
        const id = meaningIdFor(e.de, e.description);
        if (ids.has(id)) {
          errors.push(`${e.where}: ID ${id} kollidiert, bitte Schreibweise prüfen`);
          continue;
        }
        ids.add(id);
        rec = {
          id,
          de: e.de,
          en: e.en,
          set: file.id,
          kind: e.color ? "color" : e.number !== undefined ? "number" : "word",
          pictogram_key: null,
          review_status: "draft",
          source: `${SOURCE} „${file.name}“`,
          ...(e.description ? { description: e.description } : {}),
          ...(e.color ? { color: e.color } : {}),
          ...(e.number !== undefined ? { number: e.number } : {}),
        };
        byKey.set(key, rec);
        firstSeen.set(key, e.where);
        records.push(rec);
      }
      fresh.push(rec);
    }
    let coll = byId.get(file.id);
    if (!coll) {
      coll = { id: file.id, name: file.name, ...(file.description ? { description: file.description } : {}), members: [] };
      collections.push(coll);
      byId.set(file.id, coll);
    }
    const present = new Set(coll.members);
    const add = fresh.filter((r) => !present.has(r.id) && (present.add(r.id), true));
    add.sort(compareByDifficulty);
    coll.members.push(...add.map((r) => r.id));
  }

  // Mehrdeutige Wörter: Gibt es mehrere Bedeutungen, braucht jede eine Bedeutungsangabe (APP-04).
  const perWord = new Map<string, SeedRecord[]>();
  for (const r of [...existing, ...records]) {
    const k = cleanDisplay(r.de);
    perWord.set(k, [...(perWord.get(k) ?? []), r]);
  }
  for (const [word, rs] of perWord) {
    if (rs.length > 1 && rs.some((r) => !r.description)) {
      errors.push(`„${word}“ hat mehrere Bedeutungen (${rs.map((r) => r.en).join(", ")}), aber nicht alle haben eine Angabe in Klammern.`);
    }
  }
  if (errors.length) throw new Error(`Wortschatz fehlerhaft:\n${errors.join("\n")}`);
  return { records, collections, warnings };
}

/** Sortierung innerhalb einer Sammlung: leicht vor schwer, kurz vor lang, dann alphabetisch. */
export function compareByDifficulty(a: SeedRecord, b: SeedRecord): number {
  return (
    difficultyOf(a.de) - difficultyOf(b.de) ||
    letterCount(a.de) - letterCount(b.de) ||
    a.de.localeCompare(b.de, "de", { sensitivity: "base" }) ||
    (a.description ?? "").localeCompare(b.description ?? "", "de")
  );
}
