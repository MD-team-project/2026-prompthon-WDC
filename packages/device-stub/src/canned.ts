/**
 * Canned data. No simulation: no clock, no timers, no lifecycle events.
 *
 * Capabilities are now per-product and raw/sensor-level rather than
 * pre-labeled "modes" (e.g. no `mode: "sneaker"`). The point: a discovered
 * skill should be a genuinely NEW named combination of raw settings the
 * user settled into, not just a repeat of an existing menu choice - that
 * only works if there's no pre-existing menu choice to repeat.
 *
 * Pra.L is deferred (kept on the old generic placeholder set, untested) -
 * ShoeCase and MassageChair are the two products in active scope.
 */
import type { Capability, DeviceState, ProductId, UsageEvent } from "@prompthon/shared";
import { PRODUCT_IDS } from "@prompthon/shared";

const SHOECASE_CAPABILITIES: Capability[] = [
  { name: "power", params: { on: { type: "boolean" } } },
  { name: "stop", params: {} },
  { name: "setTemperature", params: { celsius: { type: "number", min: 20, max: 60 } } },
  { name: "setUv", params: { on: { type: "boolean" } } },
  { name: "setSteam", params: { on: { type: "boolean" } } },
  { name: "setShake", params: { level: { type: "number", min: 0, max: 3 } } },
  // max 25 is what makes the clamp observable: ask for 30, get 25.
  { name: "setDuration", params: { minutes: { type: "number", min: 5, max: 25 } } },
];

const MASSAGECHAIR_CAPABILITIES: Capability[] = [
  { name: "power", params: { on: { type: "boolean" } } },
  { name: "stop", params: {} },
  {
    name: "setRollerZone",
    // A physical roller position, not a named "program".
    params: { zone: { type: "string", enum: ["neck", "upperBack", "lowerBack", "legs"] } },
  },
  { name: "setIntensity", params: { level: { type: "number", min: 1, max: 5 } } },
  { name: "setAirbag", params: { level: { type: "number", min: 0, max: 3 } } },
  { name: "setHeat", params: { on: { type: "boolean" } } },
  { name: "setRecline", params: { angle: { type: "number", min: 90, max: 170 } } },
  { name: "setDuration", params: { minutes: { type: "number", min: 5, max: 30 } } },
];

// Pra.L: deferred, kept on the old generic placeholder so PRODUCT_IDS/state maps don't break.
const PRAL_CAPABILITIES: Capability[] = [
  { name: "power", params: { on: { type: "boolean" } } },
  { name: "start", params: { mode: { type: "string", enum: ["standard", "quick", "deep"] } } },
  { name: "stop", params: {} },
  { name: "setDuration", params: { minutes: { type: "number", min: 5, max: 25 } } },
];

const CAPABILITIES_BY_PRODUCT: Record<ProductId, Capability[]> = {
  shoecase: SHOECASE_CAPABILITIES,
  massagechair: MASSAGECHAIR_CAPABILITIES,
  pral: PRAL_CAPABILITIES,
};

export function capabilitiesFor(productId: ProductId): Capability[] {
  return CAPABILITIES_BY_PRODUCT[productId];
}

const state = new Map<ProductId, DeviceState>();

function fresh(productId: ProductId): DeviceState {
  return {
    productId,
    power: "off",
    attributes: {},
    updatedAt: new Date().toISOString(),
  };
}

for (const id of PRODUCT_IDS) state.set(id, fresh(id));

export function getState(productId: ProductId): DeviceState {
  return state.get(productId) ?? fresh(productId);
}

/** Reset clears in-memory device state only. Usage buffer and stored data untouched. */
export function resetState(productId: ProductId): DeviceState {
  const next = fresh(productId);
  state.set(productId, next);
  return next;
}

export interface CommandResult {
  state: DeviceState;
  /** Set when a parameter was clamped, so callers can see it happened. */
  clamped?: { param: string; requested: number; applied: number };
}

/**
 * Apply a command. `power`/`stop` toggle power; everything else is a raw
 * setter that merges its param(s) into `attributes` by name, clamping any
 * numeric param against its spec. Generic on purpose - each product's
 * capability list differs, but the merge logic doesn't need to know that.
 *
 * Out-of-range numeric values are CLAMPED, not rejected, and the clamped
 * value is returned. That is what makes the "stats are real, not claimed"
 * test work: ask for 30 minutes, the screen must show 25.
 */
export function applyCommand(
  productId: ProductId,
  capability: string,
  params: Record<string, unknown>,
): CommandResult | { error: string } {
  const spec = capabilitiesFor(productId).find((c) => c.name === capability);
  if (!spec) return { error: `unknown capability: ${capability}` };

  const current = getState(productId);
  const attributes = { ...current.attributes };
  let power = current.power;
  let clamped: CommandResult["clamped"];

  if (capability === "power") {
    power = params.on === true ? "on" : "off";
  } else if (capability === "stop") {
    power = "off";
  } else {
    if (capability === "start") power = "on";
    for (const [key, rawValue] of Object.entries(params)) {
      const paramSpec = spec.params[key];
      if (!paramSpec) continue;
      if (paramSpec.type === "number") {
        const requested = Number(rawValue);
        if (!Number.isFinite(requested)) return { error: `${key} must be a number` };
        const min = paramSpec.min ?? -Infinity;
        const max = paramSpec.max ?? Infinity;
        const applied = Math.min(Math.max(requested, min), max);
        if (applied !== requested) clamped = { param: key, requested, applied };
        attributes[key] = applied;
      } else {
        attributes[key] = rawValue;
      }
    }
  }

  const next: DeviceState = {
    productId,
    power,
    attributes,
    updatedAt: new Date().toISOString(),
  };
  state.set(productId, next);
  return { state: next, ...(clamped ? { clamped } : {}) };
}

let seq = 0;

export function makeEvent(
  productId: ProductId,
  capability: string,
  params: Record<string, unknown>,
): UsageEvent {
  seq += 1;
  return {
    eventId: `${Date.now()}-${seq}`,
    productId,
    event: `${capability}_invoked`,
    // Offset-bearing ISO, not UTC. Discovery reasons about local time, and
    // "evening" patterns disappear if timestamps are normalised to UTC.
    at: new Date().toISOString(),
    params,
  };
}
