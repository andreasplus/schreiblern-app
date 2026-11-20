#!/usr/bin/env node
/**
 * Bericht über den Wortschatz: Zahl der Wörter, Sammlungen und Verteilung der Schwierigkeit.
 *   node scripts/wortschatz-report.ts            # Übersicht
 *   node scripts/wortschatz-report.ts --level 5  # alle Wörter einer Stufe
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedData } from "./seed-data.ts";
import { DIFFICULTY_LABELS, difficultyScore, type Difficulty } from "../src/shared/difficulty.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { rows, collections, warnings } = loadSeedData(root);
const levelArg = process.argv.indexOf("--level");
if (levelArg > 0) {
  const level = Number(process.argv[levelArg + 1]);
  for (const r of rows.filter((r) => r.difficulty === level)) console.log(`${r.display}\t${difficultyScore(r.display)}`);
  process.exit(0);
}
const words = new Set(rows.map((r) => r.wordId));
console.log(`${rows.length} Bedeutungen, ${words.size} Wörter, ${collections.length} Sammlungen`);
const dist = new Map<number, number>();
for (const r of rows) dist.set(r.difficulty, (dist.get(r.difficulty) ?? 0) + 1);
for (const l of [1, 2, 3, 4, 5] as Difficulty[]) {
  const n = dist.get(l) ?? 0;
  console.log(`  Stufe ${l} (${DIFFICULTY_LABELS[l]}): ${n} (${((100 * n) / rows.length).toFixed(1)} %)`);
}
const byId = new Map(rows.map((r) => [r.id, r]));
const memberships = collections.reduce((n, c) => n + c.members.length, 0);
console.log(`${memberships} Zuordnungen zu Sammlungen, ${rows.filter((r) => !collections.some((c) => c.members.includes(r.id))).length} Bedeutungen ohne Sammlung`);
if (process.argv.includes("--warnings")) for (const w of warnings) console.log(`  ⚠ ${w}`);
else console.log(`${warnings.length} Hinweise auf abweichende Übersetzungen (--warnings zeigt sie)`);
if (process.argv.includes("--collections")) {
  for (const c of collections) {
    const sample = c.members.slice(0, 6).map((m) => byId.get(m)!.display).join(", ");
    console.log(`  ${c.id.padEnd(28)} ${String(c.members.length).padStart(4)}  ${sample} …`);
  }
}
