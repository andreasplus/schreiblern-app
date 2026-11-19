#!/usr/bin/env node
/**
 * Visueller Abgleich der HTML/SVG-Druckvorlage mit den freigegebenen Referenz-PDFs (APP-05).
 *
 * 1. Rendert die Referenzseiten Auto, blau, Banane, Blitz, eins und zehn mit Chromium als A4-PDF
 *    (derselbe Weg wie „Drucken → Als PDF speichern“).
 * 2. Rastert Web-PDF und Referenz-PDF mit pdftoppm und vergleicht Pixel mit ImageMagick.
 * 3. Schreibt Differenzbilder nach generated/compare/ und meldet den Anteil abweichender Pixel.
 *
 * Voraussetzungen: Playwright mit Chromium, pdftoppm (poppler) und ImageMagick `compare`.
 * Die 35-seitige Referenz-PDF liegt nicht im öffentlichen Repository (enthält das Auto-Bild
 * ohne geklärte Rechte). Ordner mit den Referenz-PDFs über --ref-dir oder REFERENCE_DIR angeben.
 *
 *   node scripts/compare-reference.mjs --ref-dir /pfad/zu/reference/examples
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderWorksheetSvg } from "../src/shared/worksheet.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const refDir = resolve(argValue("--ref-dir") ?? process.env.REFERENCE_DIR ?? join(root, "reference", "examples"));
const outDir = join(root, "generated", "compare");
const maxDiff = Number(argValue("--max-diff") ?? "0.001");
mkdirSync(outDir, { recursive: true });

const seed = JSON.parse(readFileSync(join(root, "data", "seed-words.json"), "utf8"));
const bySeedDe = (de) => seed.find((e) => e.de === de);
const SERIES = "Erste-Woerter-und-Zahlen-ABeeZee-A4.pdf";
const BLITZ = "Blitz-lightning-ABeeZee-A4.pdf";
const cases = [
  { de: "Auto", ref: SERIES, page: 1, note: "Piktogramm bewusst abweichend (eigene Zeichnung statt car.png)" },
  { de: "blau", ref: SERIES, page: 2 },
  { de: "Banane", ref: SERIES, page: 15 },
  { de: "Blitz", ref: BLITZ, page: 1 },
  { de: "eins", ref: SERIES, page: 26 },
  { de: "zehn", ref: SERIES, page: 35 },
].map((c) => {
  const e = bySeedDe(c.de);
  return { ...c, entry: { de: e.de, en: e.en, number: e.number ?? null, color: e.color ?? null, pictogram: e.pictogram_key ?? null } };
});

const fontUrl = pathToFileURL(join(root, "public", "fonts", "ABeeZee.ttf")).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"ABeeZee";src:url("${fontUrl}") format("truetype");font-display:block}
@page{size:A4;margin:0}html,body{margin:0;padding:0}
.page{width:210mm;height:297mm;overflow:hidden;break-after:page}.page:last-child{break-after:auto}
.page svg{display:block}
</style></head><body>${cases.map((c, i) => `<div class="page">${renderWorksheetSvg(c.entry, `p${i}`)}</div>`).join("")}</body></html>`;
const htmlPath = join(outDir, "pages.html");
writeFileSync(htmlPath, html);

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href);
await page.evaluate(async () => {
  await document.fonts.load('27px "ABeeZee"');
  await document.fonts.ready;
});
const webPdf = join(outDir, "web.pdf");
await page.pdf({ path: webPdf, preferCSSPageSize: true, printBackground: true });
await browser.close();

const pageCount = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [webPdf], { encoding: "utf8" }))[1]);
console.log(`Web-PDF: ${pageCount} Seiten für ${cases.length} Einträge${pageCount === cases.length ? "" : "  ✗ FALSCHE SEITENZAHL"}`);

const DPI = "100";
let failed = pageCount !== cases.length;
for (const [i, c] of cases.entries()) {
  const refPdf = join(refDir, c.ref);
  if (!existsSync(refPdf)) {
    console.log(`- ${c.de}: Referenz ${c.ref} nicht gefunden in ${refDir}, übersprungen`);
    continue;
  }
  const slug = c.de.toLowerCase();
  const webPng = join(outDir, `${slug}-web`);
  const refPng = join(outDir, `${slug}-ref`);
  execFileSync("pdftoppm", ["-r", DPI, "-png", "-singlefile", "-f", String(i + 1), "-l", String(i + 1), webPdf, webPng]);
  execFileSync("pdftoppm", ["-r", DPI, "-png", "-singlefile", "-f", String(c.page), "-l", String(c.page), refPdf, refPng]);
  let diffPixels;
  try {
    execFileSync("compare", ["-metric", "AE", "-fuzz", "20%", `${webPng}.png`, `${refPng}.png`, join(outDir, `${slug}-diff.png`)], { stdio: "pipe" });
    diffPixels = 0;
  } catch (err) {
    // compare beendet sich mit Code 1, wenn sich Bilder unterscheiden; die Zahl steht auf stderr.
    diffPixels = Number.parseFloat(String(err.stderr));
  }
  const total = 827 * 1169;
  const ratio = diffPixels / total;
  const ok = c.note ? true : ratio <= maxDiff;
  if (!ok) failed = true;
  console.log(`${ok ? "✓" : "✗"} ${c.de}: ${(ratio * 100).toFixed(3)} % abweichende Pixel${c.note ? ` (${c.note})` : ""}`);
}
console.log(`Differenzbilder: ${outDir}`);
process.exit(failed ? 1 : 0);
