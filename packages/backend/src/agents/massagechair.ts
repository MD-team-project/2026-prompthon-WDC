import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { bedrockChat } from "../models/bedrock.js";
import { contextTools } from "../tools/context.js";
import { massagechairTools } from "../tools/massagechair.js";
import { skillTools } from "../tools/skills.js";
import { SHARED_INSTRUCTIONS } from "./sharedInstructions.js";

/**
 * The course table is per-product and lives here rather than in
 * SHARED_INSTRUCTIONS, because a "course" is a combination of THIS device's raw
 * settings and no other device has the same ones. Same reason the capability
 * tools are per-product.
 *
 * These are named combinations, not modes the chair exposes - the chair has no
 * "programs", only zone/intensity/airbag/heat/recline/duration (see
 * device-stub's MASSAGECHAIR_CAPABILITIES, and the note there on why). Naming a
 * combination is the same act discovery performs when it turns a repeated
 * setting choice into a skill; these three are the ones that exist before
 * anything has been learned.
 */
const COURSES = `COURSES YOU CAN OFFER. Each is a combination of this chair's settings, applied by calling the setting tools in order. Apply every setting listed - a course half-applied is not the course you named.

Each of the three below is triggered by exactly ONE signal, deliberately - a demo scenario should point at one obvious course, never two.

- Lower back relief ("허리 집중 코스") - rain or snow: the weather itself is the trigger, not activity level.
  power on, setRollerZone lowerBack, setIntensity 5, setAirbag 2, setHeat on, setRecline 125, setDuration 25

- Neck release ("목 풀어주는 코스") - long screen time. Not triggered by weather - a rainy day alone is not this course.
  power on, setRollerZone neck, setIntensity 3, setAirbag 1, setHeat on, setRecline 120, setDuration 15

- Calf and foot relief ("종아리·발 마사지 코스") - a high step count or a long distance: legs that did real work.
  power on, setRollerZone legs, setIntensity 4, setAirbag 3, setHeat off, setRecline 140, setDuration 20

- Full back unwind ("등 전체 코스") - none of the above stand out: an ordinary, unremarkable day.
  power on, setRollerZone upperBack, setIntensity 3, setAirbag 2, setHeat on, setRecline 135, setDuration 25

Adjust a setting when the user asks for one - gentler, longer, no heat. Keep the rest of the course intact and say what you changed. The device clamps out-of-range values and returns what it actually applied; report that, never what you asked for.`;

export const massagechairAgent = createAgent({
  model: bedrockChat,
  tools: [...massagechairTools(), ...skillTools("massagechair"), ...contextTools()],
  systemPrompt: `You are the character bound to this massage chair. ${SHARED_INSTRUCTIONS}

${COURSES}`,
  // In-memory conversation history, keyed by thread_id (routes/character.ts
  // passes the fixed productId - S6/FR-5.4's 1:1:1 binding means there is
  // only ever one conversation per product, never a per-user thread to pick
  // between). ponytail: cleared on process restart, same deferral as
  // data/usage.ts and data/skills.ts before their real stores existed.
  checkpointer: new MemorySaver(),
});
