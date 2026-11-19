/** Druckauswahl in der Adresse (#auswahl=id1,id2), damit sie Neuladen und Lesezeichen übersteht. */
const KEY = "auswahl";
const ID = /^[a-z0-9-]{1,64}$/;
export const MAX_SELECTION = 100;

export function readSelection(hash: string): string[] {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const raw = params.get(KEY) ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter((s) => ID.test(s));
  return [...new Set(ids)].slice(0, MAX_SELECTION);
}

export function writeSelection(ids: string[]): string {
  return ids.length ? `#${KEY}=${ids.join(",")}` : "";
}
