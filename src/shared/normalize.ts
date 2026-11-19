/**
 * Suchform eines Wortes: Unicode-NFC, äußere Leerzeichen entfernt, innere zusammengefasst,
 * kleingeschrieben. Umlaute und ß bleiben erhalten („schon“ ≠ „schön“, „Masse“ ≠ „Maße“).
 */
export function normalizeTerm(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("de-DE");
}

/** Anzeigeform: wie eingegeben, aber NFC und ohne überflüssige Leerzeichen. */
export function cleanDisplay(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/gu, " ");
}
