import * as z from "zod";
import { commandTool, getDeviceStateTool } from "./device.js";

/** One tool per entry in SHOECASE_CAPABILITIES (packages/device-stub/src/canned.ts). */
export function shoecaseTools() {
  const id = "shoecase";
  return [
    getDeviceStateTool(id),
    commandTool(id, "power", "Turn the shoe case on or off.", z.object({ on: z.boolean() })),
    commandTool(id, "stop", "Stop the current care cycle immediately.", z.object({})),
    commandTool(
      id,
      "setTemperature",
      "Set drying temperature in Celsius, 20 to 60.",
      z.object({ celsius: z.number().min(20).max(60) }),
    ),
    commandTool(id, "setUv", "Turn UV sterilization on or off.", z.object({ on: z.boolean() })),
    commandTool(id, "setSteam", "Turn deodorizing steam on or off.", z.object({ on: z.boolean() })),
    commandTool(
      id,
      "setShake",
      "Set shoe-shaking intensity, 0 (off) to 3 (strong).",
      z.object({ level: z.number().min(0).max(3) }),
    ),
    commandTool(
      id,
      "setDuration",
      "Set care cycle duration in minutes, 5 to 25.",
      z.object({ minutes: z.number().min(5).max(25) }),
    ),
  ];
}
