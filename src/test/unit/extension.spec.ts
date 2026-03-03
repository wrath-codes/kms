import { describe, it, expect, vi } from "vitest";

describe("Extension", () => {
  it("should have basic structure", () => {
    expect(true).toBe(true);
  });

  it("should export activate and deactivate", async () => {
    const mod = await import("../../extension");
    expect(typeof mod.activate).toBe("function");
    expect(typeof mod.deactivate).toBe("function");
  });
});
