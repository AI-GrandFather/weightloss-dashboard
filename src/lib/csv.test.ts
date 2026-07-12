import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";

describe("CSV export", () => {
  it("escapes quotes and commas", () => {
    expect(csvCell('rice, "large"')).toBe('"rice, ""large"""');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csvCell("=2+2")).toBe('"\'=2+2"');
  });
});
