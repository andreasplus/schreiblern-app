/**
 * Die eine gemeinsame Druckvorlage (APP-05).
 *
 * Erzeugt eine vollständige A4-Seite als SVG. Die Geometrie ist 1:1 aus
 * reference/render_reference.py übernommen: Die Seite verwendet PDF-Punkte mit
 * y-Achse nach oben, damit alle Werte direkt vergleichbar bleiben.
 * Die Funktion ist rein und läuft im Browser, im Worker und in Tests gleich.
 * Ein späterer PDF-Renderer kann dieselben Daten und Maße verwenden.
 */
import { PAGE_H, PAGE_W, LINE_GAP, TRACE_SIZE, headingSize, traceSize, rowBaseline } from "./layout.ts";
import { pictogramSvg } from "./pictograms.ts";

export interface WorksheetEntry {
  de: string;
  en: string;
  number: number | null;
  color: string | null;
  pictogram: string | null;
}

export const FONT_FAMILY = "ABeeZee";

const GRAY = (g: number) => {
  const v = Math.round(g * 255);
  return `rgb(${v},${v},${v})`;
};
const n = (v: number) => Number(v.toFixed(3)).toString();

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Anchor = "start" | "middle" | "end";

function text(x: number, y: number, size: number, fill: string, content: string, anchor: Anchor = "start", cls?: string) {
  const a = anchor === "start" ? "" : ` text-anchor="${anchor}"`;
  const c = cls ? ` class="${cls}"` : "";
  return `<text${c} style="white-space:pre" transform="translate(${n(x)} ${n(y)}) scale(1 -1)" font-size="${n(size)}" fill="${fill}"${a}>${escapeXml(content)}</text>`;
}

function germanFlag(x: number, y: number, w: number, h: number) {
  const colors = ["#ffcc00", "#d10000", "#000000"]; // unten nach oben: Gold, Rot, Schwarz
  return colors.map((c, i) => `<rect x="${n(x)}" y="${n(y + (i * h) / 3)}" width="${n(w)}" height="${n(h / 3)}" fill="${c}"/>`).join("");
}

let flagId = 0;
function ukFlag(x: number, y: number, w: number, h: number, idPrefix: string) {
  const id = `${idPrefix}-uk${flagId++}`;
  const red = "rgb(199,10,36)";
  return (
    `<g><clipPath id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/></clipPath>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="rgb(5,31,92)"/>` +
    `<g clip-path="url(#${id})">` +
    `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + w)}" y2="${n(y + h)}" stroke="#fff" stroke-width="4"/>` +
    `<line x1="${n(x)}" y1="${n(y + h)}" x2="${n(x + w)}" y2="${n(y)}" stroke="#fff" stroke-width="4"/>` +
    `<line x1="${n(x)}" y1="${n(y - 0.5)}" x2="${n(x + w)}" y2="${n(y + h - 0.5)}" stroke="${red}" stroke-width="1.5"/>` +
    `<line x1="${n(x)}" y1="${n(y + h - 0.5)}" x2="${n(x + w)}" y2="${n(y - 0.5)}" stroke="${red}" stroke-width="1.5"/>` +
    `<rect x="${n(x)}" y="${n(y + h / 2 - 3)}" width="${n(w)}" height="6" fill="#fff"/>` +
    `<rect x="${n(x + w / 2 - 3)}" y="${n(y)}" width="6" height="${n(h)}" fill="#fff"/>` +
    `<rect x="${n(x)}" y="${n(y + h / 2 - 1.8)}" width="${n(w)}" height="3.6" fill="${red}"/>` +
    `<rect x="${n(x + w / 2 - 1.8)}" y="${n(y)}" width="3.6" height="${n(h)}" fill="${red}"/>` +
    `</g></g>`
  );
}

function house(x: number, baseline: number) {
  const top = baseline + (2 * LINE_GAP), middle = baseline + LINE_GAP, bottom = baseline - LINE_GAP;
  const lx = x + 22;
  const s = `stroke="${GRAY(0.35)}" stroke-width="0.85" fill="none"`;
  return (
    `<path d="M${n(x)} ${n(bottom)}L${n(x)} ${n(middle)}L${n(x + 11)} ${n(top)}L${n(lx)} ${n(middle)}L${n(lx)} ${n(bottom)}Z" ${s}/>` +
    `<line x1="${n(x)}" y1="${n(middle)}" x2="${n(lx)}" y2="${n(middle)}" ${s}/>` +
    `<line x1="${n(x)}" y1="${n(baseline)}" x2="${n(lx)}" y2="${n(baseline)}" ${s}/>` +
    `<rect x="${n(x + 7)}" y="${n(baseline)}" width="8" height="10" ${s}/>` +
    `<line x1="${n(x + 5)}" y1="${n(bottom + 5)}" x2="${n(x + 16)}" y2="${n(bottom + 5)}" ${s}/>` +
    `<line x1="${n(x + 8)}" y1="${n(bottom + 8)}" x2="${n(x + 14)}" y2="${n(bottom + 8)}" ${s}/>`
  );
}

function column(x: number, word: string, lang: "de" | "en", num: number | null, idPrefix: string) {
  const out: string[] = [];
  const fy = PAGE_H - 229, fw = 29, fh = 18;
  out.push(lang === "de" ? germanFlag(x, fy, fw, fh) : ukFlag(x, fy, fw, fh, idPrefix));

  const hs = headingSize(word);
  const ink = GRAY(0.08);
  out.push(text(x + 76, PAGE_H - 232, hs, ink, word, "start", "ws-heading"));
  if (num !== null) out.push(text(x + 207, PAGE_H - 232, hs, ink, String(num), "start", "ws-heading"));

  const lineStroke = `stroke="${GRAY(0.55)}" stroke-width="0.65"`;
  const ts = traceSize(word);
  for (let row = 0; row < 6; row++) {
    const baseline = rowBaseline(row);
    const lx = x + 22, end = x + 246;
    for (const yy of [baseline + 2 * LINE_GAP, baseline + LINE_GAP, baseline, baseline - LINE_GAP]) {
      out.push(`<line x1="${n(lx)}" y1="${n(yy)}" x2="${n(end)}" y2="${n(yy)}" ${lineStroke}/>`);
    }
    out.push(house(x, baseline));
    if (row < 3) {
      const tracing = GRAY(0.79); // ≈ RGB 201/201/201
      out.push(text(lx + 13, baseline, ts, tracing, word, "start", "ws-trace"));
      if (num !== null) out.push(text(x + 207, baseline, TRACE_SIZE, tracing, String(num), "start", "ws-trace"));
    }
  }
  return out.join("");
}

/**
 * Vollständige Schreibseite als SVG-Element mit 210 × 297 mm.
 * `idPrefix` muss je Seite im Dokument eindeutig sein (für Clip-Pfade).
 */
export function renderWorksheetSvg(entry: WorksheetEntry, idPrefix = "ws"): string {
  flagId = 0;
  const isNumber = entry.number !== null;
  const parts: string[] = [];
  parts.push(text(37, PAGE_H - 37, 11, GRAY(0.25), isNumber ? "Meine ersten Zahlen" : "Meine ersten Wörter"));
  parts.push(text(PAGE_W - 37, PAGE_H - 37, 10, GRAY(0.25), "Name: ____________________", "end"));
  const pic = pictogramSvg(entry);
  if (pic) {
    parts.push(`<g class="ws-pictogram" transform="translate(${n(PAGE_W / 2)} ${n(PAGE_H - 127)})" stroke-miterlimit="10">${pic}</g>`);
  }
  parts.push(column(37, entry.de, "de", entry.number, idPrefix));
  parts.push(column(312, entry.en, "en", entry.number, idPrefix));
  parts.push(text(PAGE_W / 2, 33, 8, GRAY(0.5), `ABeeZee  •  ${entry.de} / ${entry.en}  •  Druckgröße: 100 %`, "middle"));

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" class="worksheet" width="210mm" height="297mm" ` +
    `viewBox="0 0 ${n(PAGE_W)} ${n(PAGE_H)}" font-family="${FONT_FAMILY}" ` +
    `style="font-kerning:none;font-variant-ligatures:none;white-space:pre" role="img" aria-label="${escapeXml(`Schreibseite ${entry.de} / ${entry.en}`)}">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<g transform="matrix(1 0 0 -1 0 ${n(PAGE_H)})">${parts.join("")}</g></svg>`
  );
}
