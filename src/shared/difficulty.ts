/**
 * Schwierigkeitsgrad eines Wortes zum Nachschreiben für Kinder von 5 bis 8 Jahren.
 *
 * Reine Funktion der Schreibweise, damit jeder Eintrag (auch neue) nachvollziehbar und gleich
 * bewertet wird. Grundlage sind Länge, Silbenzahl und die Rechtschreibbesonderheiten, die im
 * Anfangsunterricht nacheinander eingeführt werden: lautgetreue Wörter zuerst, dann
 * Mehrgraphen (sch, ch, ck, ie, ei …), Doppelkonsonanten, Dehnungs-h, ß, Auslautverhärtung
 * und schließlich Fremdwortschreibungen (c, y, ph, th, oo …).
 *
 * Stufen: 1 sehr leicht · 2 leicht · 3 mittel · 4 schwer · 5 sehr schwer
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "sehr leicht",
  2: "leicht",
  3: "mittel",
  4: "schwer",
  5: "sehr schwer",
};

const VOWELS = "aeiouäöüy";

/** Punkte für Rechtschreibbesonderheiten; exportiert für Tests und zur Erklärung. */
export function spellingPoints(word: string): number {
  const w = word.normalize("NFC").toLocaleLowerCase("de-DE");
  let p = 0;
  const count = (re: RegExp) => (w.match(re) ?? []).length;

  // Mehrgraphen und Konsonantenverbindungen
  p += count(/sch/g) * 1;
  p += count(/(?<!s)ch/g) * 1;
  p += count(/chs/g) * 1;
  p += count(/ck/g) * 1;
  p += count(/tz/g) * 1;
  p += count(/pf/g) * 1;
  p += count(/qu/g) * 1.5;
  p += count(/n[gk]/g) * 0.5;
  p += count(/(^|[\s-])s[pt]/g) * 1; // „schp“/„scht“ am Wortanfang
  p += count(/dt/g) * 1.5;

  // Vokalschreibungen
  p += count(/ie/g) * 0.5;
  p += count(/ei/g) * 0.5;
  p += count(/(eu|äu)/g) * 1;
  p += count(/ai/g) * 1.5;
  p += count(/(aa|ee|oo)/g) * 1.5;
  p += count(/[äöü]/g) * 0.5;
  // Dehnungs-h: Vokal + h vor Konsonant oder am Wortende (nicht ch/sch)
  p += count(/[aeiouäöü]h(?=[^aeiouäöüy]|$)/g) * 1.5;

  // Doppelkonsonanten (ck und tz sind schon gezählt)
  p += count(/([bdfglmnprst])\1/g) * 1;
  p += count(/ß/g) * 1.5;

  // Auslautverhärtung: b, d, g am Wortende oder vor Konsonant klingen wie p, t, k
  p += count(/(?<![nr]g)(?<=[aeiouäöüyrlnm])[bdg](?=$|[\s-]|[^aeiouäöüyrl])/g) * 1;

  // Seltene und fremde Schreibungen
  p += count(/v/g) * 1.5;
  p += count(/x/g) * 1.5;
  p += count(/y/g) * 2;
  p += count(/c(?![hk])/g) * 2;
  p += count(/ph/g) * 2;
  p += count(/th/g) * 2;
  p += count(/(ou|ea|oa|ui|é|è|ç|ñ)/g) * 2;
  p += count(/tion/g) * 2;
  p += count(/j/g) * 0.5;

  // Mehrwortausdrücke
  p += count(/[\s-]/g) * 1;
  return p;
}

export function syllableCount(word: string): number {
  const w = word.normalize("NFC").toLocaleLowerCase("de-DE");
  const groups = w.match(new RegExp(`[${VOWELS}]+`, "g")) ?? [];
  return Math.max(1, groups.length);
}

export function letterCount(word: string): number {
  let n = 0;
  for (const ch of word.normalize("NFC")) if (/\p{L}/u.test(ch)) n++;
  return n;
}

function lengthPoints(letters: number): number {
  if (letters <= 3) return 0;
  if (letters <= 4) return 0.5;
  if (letters <= 5) return 1;
  if (letters <= 6) return 1.5;
  if (letters <= 7) return 2;
  if (letters <= 8) return 2.5;
  if (letters <= 10) return 3.5;
  if (letters <= 12) return 4.5;
  return 5.5 + (letters - 13) * 0.25;
}

export function difficultyScore(word: string): number {
  return lengthPoints(letterCount(word)) + (syllableCount(word) - 1) * 0.5 + spellingPoints(word);
}

export function difficultyOf(word: string): Difficulty {
  const s = difficultyScore(word);
  if (s <= 1) return 1;
  if (s <= 2.5) return 2;
  if (s <= 4.5) return 3;
  if (s <= 7) return 4;
  return 5;
}
