import { describe, expect, it } from "vitest";
import { constantTimeEqual, createSessionToken, isValidSession } from "./session";

describe("shared-secret sessions", () => {
  it("signs without exposing the secret and validates the result", async () => {
    const secret = "a-long-private-passphrase";
    const token = await createSessionToken(secret);
    expect(token).not.toContain(secret);
    await expect(isValidSession(token, secret)).resolves.toBe(true);
    await expect(isValidSession(token, "different-secret")).resolves.toBe(false);
  });

  it("compares strings without early length exits", () => {
    expect(constantTimeEqual("same", "same")).toBe(true);
    expect(constantTimeEqual("same", "different")).toBe(false);
  });
});
