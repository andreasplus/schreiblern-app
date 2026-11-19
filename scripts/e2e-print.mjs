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

// Auto: vorhandener Eintrag, Vorschau ohne Auswahlschritt
await page.fill("#q", "  auto ");
await page.getByRole("button", { name: /Auto · car/ }).click();
check(await page.locator(".preview svg.worksheet").count() === 1, "Auto öffnet direkt die Vorschau");

// Bank: zwei Bedeutungen, keine Vorauswahl
await page.fill("#q", "BANK");
await page.getByRole("button", { name: /Bank · 2 Bedeutungen/ }).click();
check(await page.locator(".choice-item").count() === 2, "Bank zeigt zwei Bedeutungen");
check(await page.locator(".preview svg.worksheet").count() === 0, "Bank wählt keine Bedeutung automatisch");
await page.getByRole("button", { name: /Bank \(Sitzgelegenheit\) · bench/ }).click();
const previewText = await page.locator(".preview svg.worksheet").textContent();
check(previewText.includes("bench") && !previewText.includes("Sitzgelegenheit"), "Arbeitsblatt zeigt Bank ohne Klammerzusatz, englisch bench");
if (shots) await page.screenshot({ path: join(outDir, "bank-auswahl.png") });

// Keine Treffer
await page.fill("#q", "Xylofonwort");
await page.getByText(/Kein vorhandener Eintrag/).waitFor();
check(true, "Kein-Treffer-Hinweis erscheint");

// schon/schön werden nicht gleichgesetzt (keiner der beiden ist im Bestand, aber „schon“ darf nicht „schön“ finden)
const res = await page.evaluate(async () => (await fetch("/api/search?q=gr%C3%BCn")).json());
check(res.results.length === 1 && res.results[0].de === "grün", "Umlaute bleiben erhalten (grün)");
const res2 = await page.evaluate(async () => (await fetch("/api/search?q=grun")).json());
check(res2.results.length === 0, "„grun“ findet nicht „grün“");

// Sammlungen und Mehrseitendruck
await page.getByRole("button", { name: "Erste Wörter (25) hinzufügen" }).click();
await page.getByRole("button", { name: "Zahlen 1 bis 10 hinzufügen" }).click();
await page.getByRole("heading", { name: "Druckauswahl (35)" }).waitFor();
check(page.url().includes("#auswahl=seed-001,"), "Druckauswahl steht in der Adresse");
if (shots) await page.screenshot({ path: join(outDir, "auswahl.png") });

await page.getByRole("button", { name: "35 Seiten drucken" }).click();
await page.locator(".print-page").nth(34).waitFor({ state: "attached" });
check((await page.evaluate(() => window.__printCalls)) === 1, "Drucken öffnet den Druckdialog genau einmal");
const pdf35 = join(outDir, "auswahl-35.pdf");
await page.pdf({ path: pdf35, preferCSSPageSize: true, printBackground: true });
const info = pdfPages(pdf35);
check(info.pages === 35, `Druck erzeugt 35 Seiten (ist: ${info.pages})`);
check(/\(A4\)/.test(info.size), `Seitenformat A4 (ist: ${info.size})`);
const text = execFileSync("pdftotext", ["-f", "1", "-l", "1", pdf35, "-"], { encoding: "utf8" });
check(!/Druckauswahl|Wort suchen|drucken/.test(text), "Bedienelemente erscheinen nicht im Ausdruck");

// Auswahl übersteht Neuladen
await page.reload();
await page.getByRole("heading", { name: "Druckauswahl (35)" }).waitFor();
check(true, "Druckauswahl übersteht Neuladen");

// Einzelseite
await page.fill("#q", "Blitz");
await page.getByRole("button", { name: /Blitz · lightning/ }).click();
await page.getByRole("button", { name: "Diese Seite drucken" }).click();
await page.locator(".print-page").first().waitFor({ state: "attached" });
const pdf1 = join(outDir, "blitz.pdf");
await page.pdf({ path: pdf1, preferCSSPageSize: true, printBackground: true });
check(pdfPages(pdf1).pages === 1, "Einzeldruck erzeugt genau eine Seite, keine leere Schlussseite");

// Mobile Ansicht
await page.setViewportSize({ width: 390, height: 844 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check(!overflow, "Kein waagerechtes Scrollen bei 390 px Breite");
if (shots) await page.screenshot({ path: join(outDir, "mobil.png"), fullPage: true });

await browser.close();
console.log(failures ? `${failures} Prüfungen fehlgeschlagen.` : "Alle Prüfungen bestanden.");
process.exit(failures ? 1 : 0);
