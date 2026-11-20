/**
 * Ordnet Bedeutungen ohne eigenes Bild einem Noto-Emoji zu (Apache 2.0) und kopiert die
 * benötigten SVG-Dateien nach public/pictograms/noto/.
 *
 * Grundlage sind die deutschen Emoji-Namen aus Unicode CLDR. Zugeordnet wird nur, was sicher ist:
 *  1. Der deutsche Emoji-Name ist genau das Wort (Frosch → 🐸).
 *  2. Der Name besteht aus höchstens zwei Wörtern und endet auf das Nomen (Süßkartoffel → „geröstete Süßkartoffel“).
 *  3. Mehrzahlformen übernehmen das Bild ihrer Grundform (Bären → 🐻).
 *  4. Handverlesene Zuordnungen aus data/bilder/noto-manuell.txt gehen vor.
 * Wörter mit mehreren Bedeutungen werden nur über die Handliste zugeordnet.
 *
 * Einmalig die Quellen holen (nicht in package.json, damit CI und Build schlank bleiben):
 *   npm i --no-save @iconify-json/noto cldr-annotations-full cldr-annotations-derived-full
 *   node scripts/bilder-zuordnen.ts
 * Ergebnis: data/bilder/noto-zuordnung.json und public/pictograms/noto/*.svg (beides versioniert).
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedData } from "./seed-data.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(require.resolve(p), "utf8"));
const noto = json("@iconify-json/noto/icons.json") as { width: number; height: number; icons: Record<string, { body: string; width?: number; height?: number }> };
const chars = json("@iconify-json/noto/chars.json") as Record<string, string>;
type Ann = Record<string, { default?: string[]; tts?: string[] }>;
const ann: Ann = {
  ...(json("cldr-annotations-derived-full/annotationsDerived/de/annotations.json").annotationsDerived.annotations as Ann),
  ...(json("cldr-annotations-full/annotations/de/annotations.json").annotations.annotations as Ann),
};

const hex = (e: string, dropVs: boolean) => [...e].map((c) => c.codePointAt(0)!.toString(16)).filter((h) => !dropVs || h !== "fe0f").join("-");
const iconOf = (e: string) => chars[hex(e, true)] ?? chars[hex(e, false)];
const SKIN = /[\u{1F3FB}-\u{1F3FF}]/u;
const FLAG = /[\u{1F1E6}-\u{1F1FF}]/u;

const byName = new Map<string, string>();
const byLastWord = new Map<string, string[]>();
for (const [e, a] of Object.entries(ann)) {
  if (!iconOf(e) || SKIN.test(e) || FLAG.test(e)) continue;
  const name = a.tts?.[0];
  if (!name) continue;
  const k = name.toLowerCase();
  if (!byName.has(k)) byName.set(k, e);
  const tokens = name.split(/[\s-]+/);
  if (tokens.length === 2) {
    const last = tokens[1]!.toLowerCase();
    byLastWord.set(last, [...(byLastWord.get(last) ?? []), e]);
  }
}

// Handliste
const manual = new Map<string, string | null>();
for (const raw of readFileSync(join(root, "data", "bilder", "noto-manuell.txt"), "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#") || line.startsWith(">") || line.startsWith("//")) continue;
  const m = /^(.+?)\s*=\s*(.+)$/.exec(line);
  if (!m) throw new Error(`noto-manuell.txt: Zeile nicht lesbar: ${line}`);
  const emoji = m[2]!.trim();
  if (emoji !== "-" && !iconOf(emoji)) throw new Error(`noto-manuell.txt: kein Noto-Bild für ${emoji}`);
  manual.set(m[1]!.trim(), emoji === "-" ? null : emoji);
}

const { rows, collections } = loadSeedData(root);
const label = (r: (typeof rows)[number]) => (r.description ? `${r.display} (${r.description})` : r.display);
const homonym = new Set<string>();
const seen = new Map<string, number>();
for (const r of rows) seen.set(r.display, (seen.get(r.display) ?? 0) + 1);
for (const [w, n] of seen) if (n > 1) homonym.add(w);

export interface NotoEntry { emoji: string; icon: string; how: "hand" | "name" | "name2" | "mehrzahl"; from?: string }
const out: Record<string, NotoEntry> = {};
const usedManual = new Set<string>();
for (const r of rows) {
  if (r.kind !== "word" || r.pictogramId) continue;
  const l = label(r);
  if (manual.has(l)) {
    usedManual.add(l);
    const e = manual.get(l);
    if (e) out[r.id] = { emoji: e, icon: iconOf(e)!, how: "hand" };
    continue;
  }
  if (r.description || homonym.has(r.display)) continue;
  const w = r.display.toLowerCase();
  const exact = byName.get(w);
  if (exact) {
    out[r.id] = { emoji: exact, icon: iconOf(exact)!, how: "name" };
    continue;
  }
  const two = /^\p{Lu}/u.test(r.display) ? byLastWord.get(w) : undefined;
  if (two?.length === 1) out[r.id] = { emoji: two[0]!, icon: iconOf(two[0]!)!, how: "name2" };
}
for (const l of manual.keys()) if (!usedManual.has(l)) console.warn(`noto-manuell.txt: „${l}“ gibt es im Wortschatz nicht`);

// Mehrzahl übernimmt das Bild der Grundform: gleiche Übersetzung in der Einzahl, gleicher Wortanfang.
const IRREGULAR: Record<string, string> = {
  mice: "mouse", geese: "goose", feet: "foot", teeth: "tooth", men: "man", women: "woman", children: "child", people: "person",
  knives: "knife", leaves: "leaf", wolves: "wolf", loaves: "loaf", calves: "calf", halves: "half", shelves: "shelf", scarves: "scarf",
};
const singular = (en: string): string[] => {
  const words = en.split(" ");
  const last = words.pop()!;
  const forms = new Set<string>();
  if (IRREGULAR[last]) forms.add(IRREGULAR[last]!);
  if (last.endsWith("ies")) forms.add(last.slice(0, -3) + "y");
  if (/(ch|sh|x|ss|s|o)es$/.test(last)) forms.add(last.slice(0, -2));
  if (last.endsWith("s")) forms.add(last.slice(0, -1));
  forms.add(last);
  return [...forms].map((f) => [...words, f].join(" "));
};
const fold = (s: string) => s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
const plural = new Set(collections.filter((c) => c.id.startsWith("mehrzahl")).flatMap((c) => c.members));
const byEn = new Map<string, (typeof rows)[number][]>();
for (const r of rows) if (out[r.id] || r.pictogramId) byEn.set(r.en, [...(byEn.get(r.en) ?? []), r]);
for (const r of rows) {
  if (!plural.has(r.id) || out[r.id] || r.pictogramId) continue;
  for (const en of singular(r.en)) {
    const base = (byEn.get(en) ?? []).find((b) => b.id !== r.id && fold(b.display).slice(0, 2) === fold(r.display).slice(0, 2));
    if (!base) continue;
    if (base.pictogramId) break; // eingebaute Zeichnung: bleibt beim Seed, Mehrzahl ohne Emoji
    out[r.id] = { ...out[base.id]!, how: "mehrzahl", from: base.id };
    break;
  }
}

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(root, "data", "bilder", "noto-zuordnung.json"), JSON.stringify(sorted, null, 1) + "\n");

// SVG-Dateien: nur die benutzten, mit eindeutigen IDs je Datei.
const dir = join(root, "public", "pictograms", "noto");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const icons = new Set(Object.values(out).map((e) => e.icon));
for (const name of icons) {
  const icon = noto.icons[name]!;
  const w = icon.width ?? noto.width;
  const h = icon.height ?? noto.height;
  writeFileSync(join(dir, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${icon.body}</svg>\n`);
}
writeFileSync(
  join(dir, "LICENSE.txt"),
  "Noto Emoji, Copyright Google LLC, Apache License 2.0.\nhttps://github.com/googlefonts/noto-emoji (SVG über @iconify-json/noto)\nVollständiger Lizenztext: https://www.apache.org/licenses/LICENSE-2.0\n",
);
const count = (how: string) => Object.values(out).filter((e) => e.how === how).length;
console.log(
  `${Object.keys(out).length} Bedeutungen mit Noto-Bild (Name ${count("name")}, Name mit Zusatz ${count("name2")}, Mehrzahl ${count("mehrzahl")}, Handliste ${count("hand")}), ${icons.size} SVG-Dateien, ${readdirSync(dir).length - 1} geschrieben.`,
);
