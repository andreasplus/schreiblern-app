import { describe, expect, it } from "vitest";
import { readSelection, writeSelection } from "../src/client/selection.ts";

describe("Druckauswahl in der Adresse", () => {
  it("liest und schreibt IDs", () => {
    expect(readSelection(writeSelection(["seed-001", "number-02"]))).toEqual(["seed-001", "number-02"]);
    expect(writeSelection([])).toBe("");
  });
  it("verwirft ungültige und doppelte IDs", () => {
    expect(readSelection("#auswahl=seed-001,<script>,seed-001,,x y")).toEqual(["seed-001"]);
  });
});
