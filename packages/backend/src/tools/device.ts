import { tool } from "langchain";
import * as z from "zod";
import type { ProductId } from "@prompthon/shared";
import { deviceAdapter } from "../device/adapter.js";

/**
 * FR-5.5: the state these tools return is what the UI trusts. The calling
 * agent must forward it verbatim - never paraphrase or reconstruct device
 * state from what it thinks happened.
 */
export function getDeviceStateTool(productId: string) {
  const id = productId as ProductId;
  return tool(
    async () => JSON.stringify(await deviceAdapter.getState(id)),
    {
      name: "getDeviceState",
      description:
        "Get this product's current structured device state. Always call this before describing device status to the user.",
      schema: z.object({}),
    },
  );
}

/** One typed tool per device capability - same result-forwarding rule as getDeviceStateTool. */
export function commandTool(productId: string, name: string, description: string, schema: z.AnyZodObject) {
  const id = productId as ProductId;
  return tool(
    async (params: Record<string, unknown>) => JSON.stringify(await deviceAdapter.applyCommand(id, name, params)),
    {
      name,
      description: `${description} Returns the resulting structured device state - report exactly what this tool returns, it must never be composed from memory.`,
      schema,
    },
  );
}

/**
 * Generic fallback for products without a settled, named capability set yet
 * (currently just Pra.L): discovers capabilities dynamically instead of one
 * typed tool per capability. ShoeCase and MassageChair use tools/shoecase.ts
 * and tools/massagechair.ts instead.
 */
export function deviceTools(productId: string) {
  const id = productId as ProductId;

  const listCapabilities = tool(
    async () => JSON.stringify(await deviceAdapter.listCapabilities(id)),
    {
      name: "listCapabilities",
      description: "List the commands this product supports and their parameters.",
      schema: z.object({}),
    },
  );

  const applyCommand = tool(
    async ({ capability, params }: { capability: string; params?: Record<string, unknown> }) =>
      JSON.stringify(await deviceAdapter.applyCommand(id, capability, params ?? {})),
    {
      name: "applyCommand",
      description:
        "Apply a command to this product. Returns the resulting structured device state - report exactly what this tool returns, since the value shown to the user must match it exactly and must never be composed from memory.",
      schema: z.object({
        capability: z.string(),
        params: z.record(z.unknown()).optional(),
      }),
    },
  );

  return [getDeviceStateTool(id), listCapabilities, applyCommand];
}
