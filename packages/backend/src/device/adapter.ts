import type { Capability, DailyContext, DeviceState, ProductId } from "@prompthon/shared";
import { config } from "../config.js";

/**
 * HTTP client for the device-stub process. This is what enforces FR-5.5:
 * the agent must go over HTTP to get device state, because DeviceState is
 * never held in this process's memory. That makes "displayed stats come
 * from the device, not the model" structural, not a matter of discipline.
 *
 * Today's app-level context (`getDailyContext`) is fetched the same way and
 * for the same reason, even though it comes from mocked phone integrations
 * rather than an appliance - a reason the character gives for a suggestion
 * ("you walked 14,000 steps") has to be a value it read, not one it produced.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.deviceApiUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`device-stub request failed: ${path} -> ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const deviceAdapter = {
  listCapabilities(productId: ProductId): Promise<Capability[]> {
    return request<Capability[]>(`/devices/${productId}/capabilities`);
  },

  getState(productId: ProductId): Promise<DeviceState> {
    return request<DeviceState>(`/devices/${productId}/state`);
  },

  applyCommand(
    productId: ProductId,
    capability: string,
    params: Record<string, unknown>,
  ): Promise<DeviceState> {
    return request<DeviceState>(`/devices/${productId}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, params }),
    });
  },

  /** Not product-scoped: one demo user, one reading, shared by all three characters. */
  getDailyContext(): Promise<DailyContext> {
    return request<DailyContext>("/context/today");
  },

  /** Demo lever - swaps device-stub's whole preset (`rain`/`walk`/`screen`/`clear`). */
  setContextScenario(scenario: string): Promise<DailyContext> {
    return request<DailyContext>("/context/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
  },
};
