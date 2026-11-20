import { describe, expect, it } from "vitest";
import { formatDate, markPrinted, parsePrinted, today, unmarkPrinted } from "../src/client/printed.ts";

describe("Gedruckte Seiten im Browser", () => {
  it("markiert und entfernt Seiten", () => {
    const m = markPrinted({}, ["seed-001", "number-02"], "2026-11-20");
    expect(m).toEqual({ "seed-001": "2026-11-20", "number-02": "2026-11-20" });
    expect(unmarkPrinted(m, ["seed-001"])).toEqual({ "number-02": "2026-11-20" });
  });
  it("verwirft kaputte oder fremde Daten", () => {
    expect(parsePrinted(null)).toEqual({});
    expect(parsePrinted("{kaputt")).toEqual({});
    expect(parsePrinted("[1,2]")).toEqual({});
    expect(parsePrinted(JSON.stringify({ "seed-001": "2026-11-20", "<x>": "2026-11-20", "seed-002": "gestern" }))).toEqual({ "seed-001": "2026-11-20" });
  });
  it("formatiert Daten deutsch", () => {
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDate("2026-11-20")).toBe("20.11.2026");
  });
});
