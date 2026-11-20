#!/usr/bin/env node
/**
 * Durchgängiger Browsertest gegen einen laufenden Entwicklungsserver (Standard http://localhost:5173).
 * Prüft Suche, Mehrdeutigkeit, Druckauswahl und dass der Druck genau eine A4-Seite je Eintrag erzeugt.
 *
 *   npm run dev            # in einem zweiten Terminal
 *   node scripts/e2e-print.mjs [--base http://localhost:5173] [--screenshots]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";
const shots = args.includes("--screenshots");
const outDir = join(root, "generated", "e2e");
mkdirSync(outDir, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
};
const pdfPages = (file) => {
  const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
  return { pages: Number(/Pages:\s+(\d+)/.exec(info)[1]), size: /Page size:\s+(.*)/.exec(info)[1] };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
// Der echte Druckdialog blockiert im Headless-Browser nicht; die Druckseiten sollen für page.pdf stehen bleiben.
await page.addInitScript(() => {
  window.print = () => {
    window.__printCalls = (window.__printCalls ?? 0) + 1;
  };
});
await page.goto(base);

const cards = page.locator(".word-card");
await cards.first().waitFor();
const total = await cards.count();
check(total >= 40, `Wortübersicht zeigt alle Wörter als Kacheln (${total})`);

// Auto: Kachel öffnet die Vorschau
await page.getByRole("button", { name: "Vorschau Auto · car" }).click();
check(await page.locator(".preview-dialog .preview svg.worksheet").count() === 1, "Auto öffnet die Vorschau im Dialog");
await page.getByRole("button", { name: "Schließen" }).click();

// Bank: zwei Bedeutungen als getrennte Kacheln, keine Vorauswahl
await page.fill("#q", "  BANK ");
check(await cards.count() === 2, "Bank erscheint als zwei Bedeutungen");
check(await page.locator(".word-card.is-selected").count() === 0, "Bank wird nicht automatisch ausgewählt");
await page.getByRole("button", { name: "Vorschau Bank (Sitzgelegenheit) · bench" }).click();
const previewText = await page.locator(".preview-dialog svg.worksheet").textContent();
check(previewText.includes("bench") && !previewText.includes("Sitzgelegenheit"), "Arbeitsblatt zeigt Bank ohne Klammerzusatz, englisch bench");
if (shots) await page.screenshot({ path: join(outDir, "bank-vorschau.png") });
await page.keyboard.press("Escape");

// Keine Treffer
await page.fill("#q", "Xylofonwort");
await page.getByText(/Keine Wörter passen/).waitFor();
check(true, "Kein-Treffer-Hinweis erscheint");
await page.fill("#q", "");

// Sammlungen, Sortierung, Längenfilter
await page.getByRole("button", { name: /^Tiere/ }).click();
check(await cards.count() === 6, "Sammlung Tiere zeigt 6 Wörter");
await page.getByRole("button", { name: /^Farben/ }).click();
check(await page.locator(".word-card.is-color").count() === await cards.count(), "Sammlung Farben zeigt nur Farbkreise");
await page.getByRole("button", { name: /^Alle/ }).first().click();
await page.getByRole("button", { name: "3 Buchstaben" }).click();
const de3 = await page.locator(".word-de").allTextContents();
check(de3.length > 0 && de3.every((w) => [...w.replace(/[^\p{L}]/gu, "")].length === 3), `3 Buchstaben (Deutsch): ${de3.join(", ")}`);
await page.getByRole("button", { name: "Englisch", exact: true }).click();
const en3 = await page.locator(".word-en").allTextContents();
check(en3.length > 0 && en3.every((w) => w.length === 3), `3 Buchstaben (Englisch): ${en3.join(", ")}`);
await page.locator("select").first().selectOption("alpha");
const sorted = await page.locator(".word-en").allTextContents();
check(JSON.stringify(sorted) === JSON.stringify([...sorted].sort((a, b) => a.localeCompare(b, "en"))), "alphabetisch nach Englisch sortiert");
if (shots) await page.screenshot({ path: join(outDir, "filter-3-buchstaben.png") });
await page.getByRole("button", { name: "Filter zurücksetzen" }).click();
if (shots) await page.screenshot({ path: join(outDir, "uebersicht.png") });

// Mehrseitendruck: Erste Wörter + Zahlen
await page.getByRole("button", { name: /^Erste Wörter/ }).click();
await page.getByRole("button", { name: "Alle angezeigten zur Druckauswahl" }).click();
await page.getByRole("button", { name: /^Zahlen/ }).click();
await page.getByRole("button", { name: "Alle angezeigten zur Druckauswahl" }).click();
await page.getByRole("heading", { name: "Druckauswahl (35)" }).waitFor();
check(page.url().includes("#auswahl=seed-001,"), "Druckauswahl steht in der Adresse");

await page.getByRole("button", { name: "35 Seiten drucken" }).click();
await page.locator(".print-page").nth(34).waitFor({ state: "attached" });
check((await page.evaluate(() => window.__printCalls)) === 1, "Drucken öffnet den Druckdialog genau einmal");
const pdf35 = join(outDir, "auswahl-35.pdf");
await page.pdf({ path: pdf35, preferCSSPageSize: true, printBackground: true });
const info = pdfPages(pdf35);
check(info.pages === 35, `Druck erzeugt 35 Seiten (ist: ${info.pages})`);
check(/\(A4\)/.test(info.size), `Seitenformat A4 (ist: ${info.size})`);
const text = execFileSync("pdftotext", ["-f", "1", "-l", "1", pdf35, "-"], { encoding: "utf8" });
check(!/Druckauswahl|Sammlung|drucken/.test(text), "Bedienelemente erscheinen nicht im Ausdruck");

await page.reload();
await page.getByRole("heading", { name: "Druckauswahl (35)" }).waitFor();
check(true, "Druckauswahl übersteht Neuladen");

// Einzelseite aus der Vorschau
await page.fill("#q", "Blitz");
await page.getByRole("button", { name: "Vorschau Blitz · lightning" }).click();
await page.getByRole("button", { name: "Diese Seite drucken" }).click();
await page.locator(".print-page").first().waitFor({ state: "attached" });
const pdf1 = join(outDir, "blitz.pdf");
await page.pdf({ path: pdf1, preferCSSPageSize: true, printBackground: true });
check(pdfPages(pdf1).pages === 1, "Einzeldruck erzeugt genau eine Seite, keine leere Schlussseite");
await page.keyboard.press("Escape");

// Mobile Ansicht
await page.fill("#q", "");
await page.setViewportSize({ width: 390, height: 844 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check(!overflow, "Kein waagerechtes Scrollen bei 390 px Breite");
if (shots) await page.screenshot({ path: join(outDir, "mobil.png") });

await browser.close();
console.log(failures ? `${failures} Prüfungen fehlgeschlagen.` : "Alle Prüfungen bestanden.");
process.exit(failures ? 1 : 0);
