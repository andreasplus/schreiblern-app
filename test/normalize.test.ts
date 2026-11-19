import { describe, expect, it } from "vitest";
import { cleanDisplay, normalizeTerm } from "../src/shared/normalize.ts";

describe("normalizeTerm", () => {
  it("ignoriert überflüssige Leerzeichen und Groß-/Kleinschreibung", () => {
    expect(normalizeTerm("  BANK ")).toBe("bank");
    expect(normalizeTerm("Guten   Morgen")).toBe("guten morgen");
  });
  it("erhält Umlaute und ß", () => {
    expect(normalizeTerm("Schön")).toBe("schön");
    expect(normalizeTerm("schon")).not.toBe(normalizeTerm("schön"));
    expect(normalizeTerm("Maße")).not.toBe(normalizeTerm("Masse"));
    expect(normalizeTerm("STRAẞE")).toBe("straße");
  });
  it("vereinheitlicht zerlegte Umlaute (NFD) zu NFC", () => {
    expect(normalizeTerm("grün")).toBe("grün");
  });
  it("lässt die Anzeigeform in ihrer Schreibweise", () => {
    expect(cleanDisplay("  Bank  ")).toBe("Bank");
  });
});
