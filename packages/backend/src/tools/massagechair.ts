import * as z from "zod";
import { commandTool, getDeviceStateTool } from "./device.js";

/**
 * One tool per entry in MASSAGECHAIR_CAPABILITIES
 * (packages/device-stub/src/canned.ts) - kept in sync by hand, since
 * device-stub and backend are separate processes with no shared runtime
 * state. Named tools instead of a generic applyCommand(capability, params):
 * the model's tool-calling surface already encodes valid zones/ranges,
 * instead of needing a prior listCapabilities call to infer them.
 */
export function massagechairTools() {
  const id = "massagechair";
  return [
    getDeviceStateTool(id),
    commandTool(id, "power", "Turn the massage chair on or off.", z.object({ on: z.boolean() })),
    commandTool(id, "stop", "Stop the current massage immediately.", z.object({})),
    commandTool(
      id,
      "setRollerZone",
      "Set which body zone the rollers target.",
      z.object({ zone: z.enum(["neck", "upperBack", "lowerBack", "legs"]) }),
    ),
    commandTool(
      id,
      "setIntensity",
      "Set massage intensity, 1 (gentle) to 5 (strong).",
      z.object({ level: z.number().min(1).max(5) }),
    ),
    commandTool(
      id,
      "setAirbag",
      "Set airbag compression intensity, 0 (off) to 3 (strong).",
      z.object({ level: z.number().min(0).max(3) }),
    ),
    commandTool(id, "setHeat", "Turn seat heating on or off.", z.object({ on: z.boolean() })),
    commandTool(
      id,
      "setRecline",
      "Set backrest recline angle in degrees, 90 (upright) to 170 (flat).",
      z.object({ angle: z.number().min(90).max(170) }),
    ),
    commandTool(
      id,
      "setDuration",
      "Set massage session duration in minutes, 5 to 30.",
      z.object({ minutes: z.number().min(5).max(30) }),
    ),
  ];
}
