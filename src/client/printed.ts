/**
 * Gedruckte Seiten, nur in diesem Browser gespeichert (localStorage, kein Server, kein Konto).
 * Ein Cookie wäre auf etwa 4 KB begrenzt und ginge bei jedem Abruf mit an den Server;
 * localStorage fasst tausende Einträge und bleibt auf dem Gerät.
 */
import { MAX_PRINTED_IDS } from "../shared/filters.ts";

export const PRINTED_KEY = "schreiblern.gedruckt.v1";
const ID = /^[a-z0-9-]{1,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** ID → Datum des letzten Drucks (JJJJ-MM-TT) */
export type PrintedMap = Record<string, string>;

/** Liest und prüft gespeicherte Daten; Unbrauchbares wird verworfen. */
export function parsePrinted(raw: string | null): PrintedMap {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: PrintedMap = {};
  for (const [id, date] of Object.entries(data as Record<string, unknown>)) {
    if (ID.test(id) && typeof date === "string" && DATE.test(date)) out[id] = date;
  }
  return limit(out);
}

/** Behält höchstens MAX_PRINTED_IDS Einträge, die neuesten zuerst. */
function limit(map: PrintedMap): PrintedMap {
  const entries = Object.entries(map);
  if (entries.length <= MAX_PRINTED_IDS) return map;
  entries.sort((a, b) => b[1].localeCompare(a[1]));
  return Object.fromEntries(entries.slice(0, MAX_PRINTED_IDS));
}

export const markPrinted = (map: PrintedMap, ids: string[], date: string): PrintedMap =>
  limit({ ...map, ...Object.fromEntries(ids.filter((id) => ID.test(id)).map((id) => [id, date])) });

export function unmarkPrinted(map: PrintedMap, ids: string[]): PrintedMap {
  const copy = { ...map };
  for (const id of ids) delete copy[id];
  return copy;
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** „2026-11-20“ → „20.11.2026“ */
export const formatDate = (iso: string) => iso.split("-").reverse().join(".");

type KeyValueStore = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
// Über globalThis, damit die Datei auch in den Node-Tests ohne DOM-Typen übersetzt.
const store = () => (globalThis as { localStorage?: KeyValueStore }).localStorage;

export function loadPrinted(): PrintedMap {
  try {
    return parsePrinted(store()?.getItem(PRINTED_KEY) ?? null);
  } catch {
    return {};
  }
}

/** false, wenn der Browser das Speichern verweigert (z. B. privates Fenster). */
export function savePrinted(map: PrintedMap): boolean {
  try {
    const s = store();
    if (!s) return false;
    if (Object.keys(map).length) s.setItem(PRINTED_KEY, JSON.stringify(map));
    else s.removeItem(PRINTED_KEY);
    return true;
  } catch {
    return false;
  }
}
