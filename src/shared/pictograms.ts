/**
 * Einfache Piktogramme als SVG, übernommen aus der Python-Layoutreferenz
 * (reference/render_reference.py, Funktion `illustration`).
 *
 * Alle Koordinaten sind PDF-Koordinaten mit Ursprung in der Bildmitte und y nach oben.
 * Die Schreibseite spiegelt die y-Achse einmal für die ganze Seite, deshalb können die
 * Werte unverändert aus der Referenz übernommen werden. Texte werden lokal zurückgespiegelt.
 *
 * Ausnahme: Das Auto war in der Referenz ein Rasterbild aus einer Nutzervorlage ohne
 * geklärte Rechte. Es ist hier durch eine eigene Vektorzeichnung im selben Stil ersetzt.
 */

const STROKE = "#29383f"; // RGB .16/.22/.25 aus der Referenz
const DARK = "#263940";
const LINE_WIDTH = 2.5;

export interface PictogramInput {
  pictogram: string | null;
  color: string | null;
  number: number | null;
}

/** Schlüssel aller eingebauten Zeichnungen. */
export const BUILTIN_PICTOGRAMS = [
  "Auto", "Haus", "Maus", "Tisch", "Ball", "Hund", "Katze", "Fisch", "Kuh", "Ei", "Milch",
  "Brot", "Apfel", "Banane", "Sonne", "Mond", "Stern", "Bett", "Hand", "Buch", "Blitz", "Mama",
  // Ergänzungen im selben Stil (eigene Zeichnungen, noch ungeprüft)
  "Vogel", "Wolke", "Baum", "Blume", "Herz",
] as const;

const n = (v: number) => Number(v.toFixed(3)).toString();

class Pen {
  out: string[] = [];
  strokeColor = STROKE;
  lineWidth = LINE_WIDTH;

  private stroke() {
    return `stroke="${this.strokeColor}" stroke-width="${n(this.lineWidth)}"`;
  }
  ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    this.out.push(`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${this.stroke()}/>`);
  }
  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.out.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="4" fill="${fill}" ${this.stroke()}/>`);
  }
  poly(points: Array<[number, number]>, fill: string) {
    const pts = points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");
    this.out.push(`<polygon points="${pts}" fill="${fill}" stroke-linejoin="miter" ${this.stroke()}/>`);
  }
  path(d: string, fill: string) {
    this.out.push(`<path d="${d}" fill="${fill}" ${this.stroke()}/>`);
  }
  line(x1: number, y1: number, x2: number, y2: number) {
    this.out.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${this.stroke()}/>`);
  }
  /** Bogen wie reportlab canvas.arc: Ellipse im Rechteck, Startwinkel und Umfang in Grad (gegen den Uhrzeigersinn). */
  arc(x1: number, y1: number, x2: number, y2: number, start: number, extent: number) {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
    const a0 = (start * Math.PI) / 180, a1 = ((start + extent) * Math.PI) / 180;
    const sx = cx + rx * Math.cos(a0), sy = cy + ry * Math.sin(a0);
    const ex = cx + rx * Math.cos(a1), ey = cy + ry * Math.sin(a1);
    const large = Math.abs(extent) > 180 ? 1 : 0;
    const sweep = extent > 0 ? 1 : 0;
    this.out.push(`<path d="M${n(sx)} ${n(sy)}A${n(rx)} ${n(ry)} 0 ${large} ${sweep} ${n(ex)} ${n(ey)}" fill="none" ${this.stroke()}/>`);
  }
  text(x: number, y: number, size: number, fill: string, content: string) {
    this.out.push(
      `<text transform="translate(${n(x)} ${n(y)}) scale(1 -1)" font-size="${n(size)}" fill="${fill}" text-anchor="middle">${content}</text>`,
    );
  }
  eyes(y = 4) {
    for (const x of [-15, 15]) this.ellipse(x, y, 2, 3, DARK);
  }
}

function drawNumber(p: Pen, value: number) {
  p.text(0, 0, 65, DARK, String(value));
  for (let i = 0; i < value; i++) {
    const x = ((i % 5) - (Math.min(value, 5) - 1) / 2) * 21;
    const y = -20 - Math.floor(i / 5) * 18;
    p.ellipse(x, y, 5, 5, "#4792c2");
  }
}

function drawAnimal(p: Pen, word: "Maus" | "Hund" | "Katze" | "Kuh") {
  if (word === "Maus") {
    for (const x of [-32, 32]) p.ellipse(x, 30, 21, 22, "#b5bac0");
    for (const x of [-32, 32]) p.ellipse(x, 30, 12, 13, "#ecc6c9");
    p.ellipse(0, -1, 43, 37, "#b5bac0");
  } else if (word === "Hund") {
    for (const x of [-37, 37]) p.ellipse(x, 0, 18, 39, "#956546");
    p.ellipse(0, 0, 39, 39, "#d4a879");
  } else if (word === "Katze") {
    p.poly([[-38, 16], [-40, 51], [-12, 32]], "#e0ae70");
    p.poly([[38, 16], [40, 51], [12, 32]], "#e0ae70");
    p.ellipse(0, 0, 42, 35, "#e0ae70");
  } else {
    for (const x of [-44, 44]) p.ellipse(x, 20, 20, 11, "#f0e8dc");
    for (const x of [-24, 24]) p.poly([[x - 6, 33], [x, 58], [x + 7, 32]], "#e8cc94");
    p.ellipse(0, 0, 40, 40, "#f9f6ed");
    p.ellipse(-22, 20, 10, 13, "#384248");
  }
  p.eyes();
  if (word === "Kuh") {
    p.ellipse(0, -19, 28, 16, "#e5b1b3");
    for (const x of [-10, 10]) p.ellipse(x, -19, 2, 3, "#555555");
  } else {
    p.ellipse(0, -12, 6, 4, "#634b4b");
    if (word === "Maus" || word === "Katze") {
      for (const side of [-1, 1]) for (const dy of [-6, 1, 8]) p.line(side * 13, -13, side * 50, -13 + dy);
    }
  }
}

const DRAWINGS: Record<Exclude<(typeof BUILTIN_PICTOGRAMS)[number], "Vogel" | "Wolke" | "Baum" | "Blume" | "Herz">, (p: Pen) => void> = {
  Auto(p) {
    // Eigene Zeichnung (ersetzt car.png aus der Nutzervorlage).
    p.path("M-70 -22L-70 6Q-70 14 -60 15L-40 17L-24 40Q-20 46 -10 46L26 46Q35 46 40 40L56 17L66 14Q72 12 72 4L72 -22Z", "#e8574a");
    p.poly([[-31, 17], [-18, 37], [-3, 37], [-3, 17]], "#b6e2ef");
    p.poly([[5, 17], [5, 37], [24, 37], [42, 17]], "#b6e2ef");
    p.rect(58, -4, 12, 8, "#ffe28a");
    for (const x of [-40, 40]) {
      p.ellipse(x, -24, 17, 17, "#3b4a52");
      p.ellipse(x, -24, 7, 7, "#d9dee1");
    }
  },
  Haus(p) {
    p.rect(-42, -38, 84, 62, "#ffdf9a");
    p.poly([[-52, 24], [0, 64], [52, 24]], "#e87758");
    p.rect(-9, -38, 20, 35, "#ab754e");
    for (const x of [-28, 22]) p.rect(x, 1, 17, 17, "#b6e2ef");
  },
  Tisch(p) {
    p.rect(-65, 9, 130, 15, "#c99662");
    for (const x of [-52, 44]) p.rect(x, -43, 9, 52, "#c99662");
  },
  Maus: (p) => drawAnimal(p, "Maus"),
  Hund: (p) => drawAnimal(p, "Hund"),
  Katze: (p) => drawAnimal(p, "Katze"),
  Kuh: (p) => drawAnimal(p, "Kuh"),
  Ball(p) {
    p.ellipse(0, 0, 43, 43, "#ef8c55");
    p.arc(-43, -43, 43, 43, 10, 160);
    p.line(-40, -14, 40, 14);
  },
  Fisch(p) {
    p.poly([[27, 0], [65, 33], [65, -33]], "#edb04e");
    p.ellipse(-8, 0, 48, 29, "#6abed3");
    p.ellipse(-32, 7, 3, 3, DARK);
    p.poly([[-3, 27], [14, 45], [23, 21]], "#edb04e");
  },
  Ei: (p) => p.ellipse(0, 0, 31, 44, "#fff4da"),
  Milch(p) {
    p.rect(-27, -43, 54, 71, "#f6fafb");
    p.poly([[-27, 28], [-12, 48], [27, 48], [27, 28]], "#a9d8ef");
    p.rect(-18, -18, 36, 29, "#a9d8ef");
    p.text(0, -8, 12, DARK, "Milch");
  },
  Brot(p) {
    p.rect(-58, -28, 116, 57, "#d19b55");
    p.strokeColor = "#915924"; // RGB .57/.35/.14
    p.lineWidth = 5;
    for (const x of [-31, -5, 21]) p.line(x, 12, x + 10, 23);
  },
  Apfel(p) {
    p.ellipse(-17, -3, 30, 35, "#e96251");
    p.ellipse(17, -3, 30, 35, "#e96251");
    p.lineWidth = 5;
    p.line(0, 26, 4, 47);
    p.ellipse(18, 43, 16, 7, "#6ea05e");
  },
  Banane(p) {
    p.path("M-55 32C-45 -64 41 -71 62 23C28 -22 -17 -28 -55 32Z", "#ffdc52");
    p.line(-55, 32, -58, 42);
  },
  Sonne(p) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      p.line(39 * Math.cos(a), 39 * Math.sin(a), 53 * Math.cos(a), 53 * Math.sin(a));
    }
    p.ellipse(0, 0, 29, 29, "#ffcf43");
  },
  Mond: (p) => p.path("M21 43C-65 50 -65 -50 21 -43C-17 -23 -17 23 21 43Z", "#f4d466"),
  Stern(p) {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 49 : 22;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    p.poly(pts, "#ffcf43");
  },
  Bett(p) {
    p.rect(-60, -18, 120, 26, "#a9cbd8");
    p.rect(-61, -31, 8, 70, "#b4865b");
    p.rect(53, -31, 8, 51, "#b4865b");
    p.rect(-49, 8, 31, 16, "#fff5df");
    p.rect(-17, 8, 70, 19, "#73b5c9");
  },
  Hand(p) {
    p.path(
      "M-17 -49L-20 -24C-40 -8 -58 3 -49 12C-43 18 -29 4 -23 2L-25 39C-25 53 -12 53 -11 39L-10 14L-8 54" +
        "C-7 66 6 66 6 53L7 14L11 45C13 58 25 55 24 42L22 10L29 30C34 41 44 37 40 25L31 -11C28 -25 22 -27 21 -49Z",
      "#f0c8a7",
    );
  },
  Buch(p) {
    p.poly([[-57, -31], [-57, 34], [-8, 29], [0, 23], [8, 29], [57, 34], [57, -31], [8, -36], [0, -42], [-8, -36]], "#fff6db");
    p.line(0, -40, 0, 23);
    for (const yy of [-20, -7, 6, 19]) {
      p.line(-47, yy, -13, yy - 4);
      p.line(13, yy - 4, 47, yy);
    }
  },
  Blitz: (p) => p.poly([[-2, 54], [34, 54], [9, 10], [32, 10], [-29, -58], [-13, -7], [-35, -7]], "#ffd129"),
  Mama(p) {
    p.ellipse(0, 6, 40, 49, "#865c43");
    p.ellipse(0, 7, 28, 33, "#f1c5a5");
    p.ellipse(-16, 33, 16, 10, "#865c43");
    p.eyes(9);
    p.arc(-10, -10, 10, 3, 190, 160);
    p.path("M-43 -57C-38 -13 38 -13 43 -57Z", "#bb87bb");
  },
};

// Ergänzungen vom 19.11.2026: eigene Zeichnungen im Stil der Referenz.
const EXTRA_DRAWINGS: Record<"Vogel" | "Wolke" | "Baum" | "Blume" | "Herz", (p: Pen) => void> = {
  Vogel(p) {
    p.poly([[-34, 6], [-58, 22], [-52, -8]], "#3d8bd0");
    p.poly([[34, 8], [54, 1], [34, -6]], "#ffb53b");
    p.ellipse(0, 0, 38, 28, "#5aa9e6");
    p.ellipse(-6, -3, 19, 11, "#3d8bd0");
    p.ellipse(19, 9, 3, 3, DARK);
  },
  Wolke(p) {
    p.ellipse(-28, -8, 26, 20, "#e9f1f6");
    p.ellipse(28, -8, 26, 20, "#e9f1f6");
    p.ellipse(0, 10, 32, 28, "#e9f1f6");
  },
  Baum(p) {
    p.rect(-9, -52, 18, 44, "#9b6b43");
    p.ellipse(-22, 4, 25, 23, "#6ab04c");
    p.ellipse(22, 4, 25, 23, "#6ab04c");
    p.ellipse(0, 28, 30, 26, "#6ab04c");
  },
  Blume(p) {
    p.lineWidth = 4;
    p.line(0, -54, 0, 0);
    p.lineWidth = LINE_WIDTH;
    p.ellipse(13, -30, 13, 6, "#6ea05e");
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 2;
      p.ellipse(18 * Math.cos(a), 16 + 18 * Math.sin(a), 12, 12, "#f28cb1");
    }
    p.ellipse(0, 16, 11, 11, "#ffd129");
  },
  Herz: (p) => p.path("M0 -42C-62 2 -46 52 0 24C46 52 62 2 0 -42Z", "#e74941"),
};

export function isBuiltinPictogram(key: string): key is (typeof BUILTIN_PICTOGRAMS)[number] {
  return (BUILTIN_PICTOGRAMS as readonly string[]).includes(key);
}

/**
 * SVG-Elemente des Piktogramms in PDF-Koordinaten um den Ursprung.
 * Leerer String, wenn kein Bild vorhanden ist („ohne Bild“).
 */
export function pictogramSvg(input: PictogramInput): string {
  const p = new Pen();
  if (input.number !== null) drawNumber(p, input.number);
  else if (input.color) p.ellipse(0, 0, 42, 42, input.color);
  else if (input.pictogram && isBuiltinPictogram(input.pictogram)) {
    const key = input.pictogram;
    if (key in EXTRA_DRAWINGS) EXTRA_DRAWINGS[key as keyof typeof EXTRA_DRAWINGS](p);
    else DRAWINGS[key as keyof typeof DRAWINGS](p);
  }
  return p.out.join("");
}
