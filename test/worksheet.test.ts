import { describe, expect, it } from "vitest";
import { renderWorksheetSvg } from "../src/shared/worksheet.ts";
import { headingSize, textWidth, traceSize, TRACE_SIZE, LINE_GAP, rowBaseline } from "../src/shared/layout.ts";
import { pictogramSvg } from "../src/shared/pictograms.ts";

const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const entry = (de: string, en: string, extra: Partial<{ number: number; color: string; pictogram: string }> = {}) => ({
  de, en, number: extra.number ?? null, color: extra.color ?? null, pictogram: extra.pictogram ?? null,
});

describe("Lineatur und Schriftgrößen", () => {
  it("verwendet 40/3 pt Linienabstand und x-Höhe gleich einem Bereich", () => {
    expect(LINE_GAP).toBeCloseTo(13.333, 3);
    expect(TRACE_SIZE).toBeCloseTo(25.0627, 3); // Wert aus render_reference.py
    expect(rowBaseline(0) - rowBaseline(1)).toBe(78);
  });
  it("verkleinert nur lange Wörter proportional", () => {
    expect(headingSize("Auto")).toBe(27);
    expect(traceSize("Auto")).toBe(TRACE_SIZE);
    const long = "Donaudampfschifffahrt";
    expect(headingSize(long)).toBeLessThan(27);
    expect(textWidth(long) * headingSize(long)).toBeCloseTo(160, 6);
    expect(textWidth(long) * traceSize(long)).toBeCloseTo(170, 6);
  });
  it("lightning passt vollständig in die englische Spalte", () => {
    expect(textWidth("lightning") * headingSize("lightning")).toBeLessThanOrEqual(160 + 1e-9);
    expect(textWidth("lightning") * traceSize("lightning")).toBeLessThanOrEqual(170 + 1e-9);
  });
});

describe("Schreibseite", () => {
  it("enthält Überschrift, drei Nachspurzeilen je Spalte und keine Bedienhinweise", () => {
    const svg = renderWorksheetSvg(entry("Haus", "house", { pictogram: "Haus" }));
    const t = texts(svg);
    expect(t).toContain("Meine ersten Wörter");
    expect(t.filter((x) => x === "Haus")).toHaveLength(4);
    expect(t.filter((x) => x === "house")).toHaveLength(4);
    expect(svg).not.toMatch(/Jetzt selbst schreiben|Erst nachspuren/);
    expect(svg.match(/<line [^>]*stroke-width="0.65"/g)).toHaveLength(2 * 6 * 4);
    expect(svg).toContain('width="210mm" height="297mm"');
    expect(svg).toContain("rgb(201,201,201)");
  });
  it("zeigt bei Zahlen Zahlwort und Ziffer in Überschrift und Nachspurzeilen", () => {
    const svg = renderWorksheetSvg(entry("eins", "one", { number: 1 }));
    const t = texts(svg);
    expect(t).toContain("Meine ersten Zahlen");
    expect(t.filter((x) => x === "1")).toHaveLength(2 * 4 + 1); // 2 Spalten × (Überschrift + 3 Zeilen) + Piktogramm
    expect(t.filter((x) => x === "eins")).toHaveLength(4);
    expect(t.filter((x) => x === "one")).toHaveLength(4);
  });
  it("zeichnet die passende Anzahl Zählpunkte", () => {
    for (const n of [1, 5, 7, 10]) {
      const svg = pictogramSvg({ pictogram: null, color: null, number: n });
      expect(svg.match(/fill="#4792c2"/g)).toHaveLength(n);
    }
  });
  it("zeigt Farben als farbigen Kreis", () => {
    const svg = pictogramSvg({ pictogram: null, color: "#3286df", number: null });
    expect(svg).toMatch(/<ellipse cx="0" cy="0" rx="42" ry="42" fill="#3286df"/);
  });
  it("lässt den Bildbereich ohne Bild leer", () => {
    expect(pictogramSvg({ pictogram: null, color: null, number: null })).toBe("");
    expect(renderWorksheetSvg(entry("Bank", "bench"))).not.toContain("ws-pictogram");
  });
  it("escaped Texte", () => {
    const svg = renderWorksheetSvg(entry("<b>&", "x\"y"));
    expect(svg).toContain("&lt;b&gt;&amp;");
    expect(svg).not.toContain("<b>");
  });
});
