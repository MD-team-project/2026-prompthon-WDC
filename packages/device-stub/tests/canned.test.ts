/**
 * The two things the per-product attribute schema exists to guarantee.
 *
 * `state` in canned.ts is module-level and mutable, so every test resets the
 * product it touches first rather than relying on test order.
 */
import { describe, expect, it } from "vitest";
import { applyCommand, attributesFor, getState, resetState } from "../src/canned.js";

function apply(productId: "shoecase" | "massagechair", capability: string, params: Record<string, unknown>) {
  const result = applyCommand(productId, capability, params);
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("default attributes", () => {
  it("reports a complete resting state before anything is commanded", () => {
    const state = resetState("shoecase");
    expect(state.power).toBe("off");
    // Every schema key present with its declared default - nothing missing, so
    // the first screen has real values to render instead of an empty panel.
    for (const spec of attributesFor("shoecase")) {
      expect(state.attributes[spec.key]).toBe(spec.default);
    }
  });

  it("gives every product a defaulted state, not just the one under test", () => {
    for (const productId of ["shoecase", "massagechair", "pral"] as const) {
      const state = resetState(productId);
      expect(state.power).toBe("off");
      expect(Object.keys(state.attributes)).toEqual(attributesFor(productId).map((a) => a.key));
    }
  });
});

describe("no key collisions between capabilities sharing a param name", () => {
  it("keeps shoecase uv and steam independent (both take `on`)", () => {
    resetState("shoecase");
    apply("shoecase", "setUv", { on: true });
    const { state } = apply("shoecase", "setSteam", { on: false });
    expect(state.attributes).toMatchObject({ uv: true, steam: false });
  });

  it("keeps massagechair intensity and airbag independent (both take `level`)", () => {
    resetState("massagechair");
    apply("massagechair", "setIntensity", { level: 4 });
    const { state } = apply("massagechair", "setAirbag", { level: 1 });
    expect(state.attributes).toMatchObject({ intensity: 4, airbag: 1 });
  });
});

describe("clamping lands on the schema key", () => {
  it("clamps 30 minutes to shoecase's 25 and stores it under durationMinutes", () => {
    resetState("shoecase");
    const { state, clamped } = apply("shoecase", "setDuration", { minutes: 30 });
    expect(clamped).toEqual({ param: "minutes", requested: 30, applied: 25 });
    expect(state.attributes.durationMinutes).toBe(25);
    expect(getState("shoecase").attributes.durationMinutes).toBe(25);
  });
});
