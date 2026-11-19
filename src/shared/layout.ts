import { ADVANCES, FALLBACK_ADVANCE, FONT_X_HEIGHT } from "./fontMetrics.ts";

/** Maße der freigegebenen Schreibseite in PDF-Punkten (A4 hochkant). */
export const PAGE_W = 595.2755905511812;
export const PAGE_H = 841.8897637795277;

/** Abstand benachbarter Lineaturlinien: 40/3 pt (≈ 4,70 mm). */
export const LINE_GAP = 40 / 3;

/** Schriftgröße der Nachspurwörter: x-Höhe entspricht genau einem Lineaturbereich. */
export const TRACE_SIZE = LINE_GAP / FONT_X_HEIGHT;

export const HEADING_MAX_SIZE = 27;
export const HEADING_MAX_WIDTH = 160;
export const TRACE_MAX_WIDTH = 170;

/** Breite eines Textes bei Schriftgröße 1, wie reportlab sie misst (ohne Kerning). */
export function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ADVANCES[ch.codePointAt(0)!] ?? FALLBACK_ADVANCE;
  return w;
}

/** Größte Schriftgröße ≤ max, bei der der Text höchstens maxWidth breit ist. */
export function fitSize(text: string, max: number, maxWidth: number): number {
  const w = textWidth(text);
  return w <= 0 ? max : Math.min(max, maxWidth / w);
}

export function headingSize(text: string): number {
  return fitSize(text, HEADING_MAX_SIZE, HEADING_MAX_WIDTH);
}

export function traceSize(text: string): number {
  return fitSize(text, TRACE_SIZE, TRACE_MAX_WIDTH);
}

/** Grundlinie der Schreibzeile `row` (0–5) in PDF-Koordinaten (y nach oben). */
export function rowBaseline(row: number): number {
  return PAGE_H - 302 - row * 78;
}
