/**
 * Liste aller Bedeutungen ohne Bild, mit Bildbeschreibung zum Erzeugen eigener SVGs.
 *
 *   node scripts/bildauftrag.ts            # schreibt generated/bildauftrag.csv (nicht versioniert, jederzeit neu erzeugbar)
 *
 * Jede Zeile nennt den Dateinamen. Eine fertige SVG unter public/pictograms/eigene/<Datei> wird beim
 * nächsten Seed automatisch zugeordnet und ersetzt ein Noto-Emoji. Die Beschreibungen entstehen nach
 * festen Mustern je Wortart; sie sind Vorschläge, keine geprüften Texte.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedData } from "./seed-data.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { rows, collections } = loadSeedData(root);

export const STYLE =
  "flat vector illustration in the style of Noto emoji, bold simple shapes, soft gradients, friendly and suitable for children aged 5 to 8, " +
  "no text, no letters, no numbers, centered on a transparent background, square SVG with viewBox 0 0 128 128";

type Art = "Nomen" | "Tunwort" | "Wiewort" | "Mehrzahl" | "Verbform" | "Steigerung" | "Kleines Wort" | "Sonstiges";
const memberOf = new Map<string, string[]>();
for (const c of collections) for (const id of c.members) memberOf.set(id, [...(memberOf.get(id) ?? []), c.id]);
const names = new Map(collections.map((c) => [c.id, c.name]));
const has = (id: string, re: RegExp) => (memberOf.get(id) ?? []).some((c) => re.test(c));

function artOf(r: (typeof rows)[number]): Art {
  if (has(r.id, /^mehrzahl/)) return "Mehrzahl";
  if (has(r.id, /^(vergangenheit|perfekt|er-sie-es|ich-form|du-form)/)) return "Verbform";
  if (has(r.id, /^vergleichen$/)) return "Steigerung";
  if (has(r.id, /^(kleine-woerter|fragewoerter)$/)) return "Kleines Wort";
  if (/^\p{Lu}/u.test(r.display)) return "Nomen";
  if (has(r.id, /^(was-ich-tue|tunwoerter|noch-mehr-tunwoerter|bewegung|sprechen-denken-fuehlen)/) || /(en|ern|eln)$/.test(r.display)) return "Tunwort";
  if (has(r.id, /^(eigenschaften|lustige-wiewoerter|wie-etwas-ist|noch-mehr-wiewoerter|wiewoerter|gegensaetze|starke-wiewoerter)/)) return "Wiewort";
  return "Sonstiges";
}

const de = (r: (typeof rows)[number]) => (r.description ? `${r.display} (${r.description})` : r.display);
function describe(r: (typeof rows)[number], art: Art, theme: string): { text: string; prompt: string; hint: string } {
  const w = `„${de(r)}“`;
  switch (art) {
    case "Nomen":
      return {
        text: `Ein einzelnes, gut erkennbares Bild von ${w} (${r.en}), Thema „${theme}“.`,
        prompt: `A single ${r.en} (German: ${de(r)}), ${STYLE}.`,
        hint: "",
      };
    case "Tunwort":
      return {
        text: `Ein fröhliches Kind, das deutlich ${w} (${r.en}) tut. Die Bewegung soll ohne Text erkennbar sein.`,
        prompt: `A cheerful child clearly doing the action "to ${r.en}" (German: ${r.display}), ${STYLE}.`,
        hint: "",
      };
    case "Wiewort":
      return {
        text: `Ein Gegenstand oder Tier, das deutlich ${w} (${r.en}) ist.`,
        prompt: `A simple object or animal that is clearly ${r.en} (German: ${r.display}), ${STYLE}.`,
        hint: "",
      };
    case "Mehrzahl":
      return {
        text: `Drei gleiche Dinge: ${w} (${r.en}).`,
        prompt: `A small group of three ${r.en} (German: ${r.display}), ${STYLE}.`,
        hint: "Mehrzahl: kann das Bild der Einzahl dreimal zeigen",
      };
    case "Verbform":
      return { text: `Wie das Tunwort in der Grundform (${r.en}).`, prompt: "", hint: "Zeitform: Bild der Grundform verwenden, kein eigenes Bild nötig" };
    case "Steigerung":
      return {
        text: `Zwei oder drei Dinge im Vergleich, die ${w} (${r.en}) zeigen.`,
        prompt: `Two or three similar objects side by side, comparing to show "${r.en}" (German: ${r.display}), ${STYLE}.`,
        hint: "",
      };
    case "Kleines Wort":
      return { text: "", prompt: "", hint: "kein Bild empfohlen" };
    default:
      return {
        text: `Eine einfache Szene, die ${w} (${r.en}) zeigt.`,
        prompt: `A simple scene that illustrates "${r.en}" (German: ${de(r)}), ${STYLE}.`,
        hint: "",
      };
  }
}

const PRIORITY: Record<Art, (d: number) => string> = {
  Nomen: (d) => (d <= 3 ? "A" : "B"),
  Tunwort: () => "B",
  Wiewort: () => "B",
  Steigerung: () => "C",
  Mehrzahl: () => "C",
  Sonstiges: () => "C",
  Verbform: () => "-",
  "Kleines Wort": () => "-",
};

const ORDER = ["A", "B", "C", "-"];
const list = rows
  .filter((r) => r.kind === "word" && !r.pictogramId)
  .map((r) => {
    const art = artOf(r);
    const cols = memberOf.get(r.id) ?? [];
    const theme = names.get(cols.find((c) => !/^(mehrzahl|nomen|wortfamilie)/.test(c)) ?? cols[0] ?? "") ?? "";
    return { r, art, cols, theme, prio: PRIORITY[art](r.difficulty), ...describe(r, art, theme) };
  })
  .sort((a, b) => ORDER.indexOf(a.prio) - ORDER.indexOf(b.prio) || a.r.difficulty - b.r.difficulty || a.r.display.localeCompare(b.r.display, "de"));

const cell = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const header = ["Nr", "Priorität", "Datei", "Wort", "Bedeutung", "Englisch", "Wortart", "Stufe", "Sammlungen", "Bildbeschreibung", "Prompt (englisch)", "Hinweis"];
const lines = [header.join(";")];
list.forEach((x, i) =>
  lines.push(
    [i + 1, x.prio, `${x.r.id}.svg`, x.r.display, x.r.description ?? "", x.r.en, x.art, x.r.difficulty, x.cols.map((c) => names.get(c) ?? c).join(", "), x.text, x.prompt, x.hint]
      .map(cell)
      .join(";"),
  ),
);
mkdirSync(join(root, "generated"), { recursive: true });
const out = join(root, "generated", "bildauftrag.csv");
writeFileSync(out, "﻿" + lines.join("\r\n") + "\r\n");
const by = (k: string) => list.filter((x) => x.prio === k).length;
console.log(`${list.length} Bedeutungen ohne Bild: A ${by("A")}, B ${by("B")}, C ${by("C")}, ohne eigenes Bild ${by("-")} → ${out}`);
const arts = new Map<string, number>();
for (const x of list) arts.set(x.art, (arts.get(x.art) ?? 0) + 1);
console.log([...arts].map(([a, n]) => `${a} ${n}`).join(", "));
