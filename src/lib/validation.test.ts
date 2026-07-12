import { describe, expect, it } from "vitest";
import { foodCacheKey, requireDate, requireExerciseType, requireNumber } from "./validation";

describe("server input validation", () => {
  it("rejects impossible and malformed values", () => {
    expect(() => requireDate("13-07-2026")).toThrow();
    expect(() => requireNumber(-1, "Steps", 0, 200000)).toThrow();
    expect(() => requireExerciseType("swimming")).toThrow();
  });

  it("accepts valid boundary values", () => {
    expect(requireDate("2026-07-13")).toBe("2026-07-13");
    expect(requireNumber(0, "Steps", 0, 200000)).toBe(0);
    expect(requireExerciseType("walk")).toBe("walk");
  });

  it("includes quantity in a normalized food cache key", () => {
    expect(foodCacheKey(" Rice ", " 1 Bowl ")).toBe("rice::1 bowl");
    expect(foodCacheKey("Rice", "3 bowls")).not.toBe(foodCacheKey("Rice", "1 bowl"));
  });
});
