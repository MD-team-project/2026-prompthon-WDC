import { createAgent } from "langchain";
import { bedrockChat } from "../models/bedrock.js";
import { contextTools } from "../tools/context.js";
import { shoecaseTools } from "../tools/shoecase.js";
import { skillTools } from "../tools/skills.js";
import { SHARED_INSTRUCTIONS } from "./sharedInstructions.js";

/**
 * Same shape as the massage chair's course table, and deliberately a different
 * reading of the same context: rain and step count mean something to a shoe
 * case, and screen time means nothing at all. Saying so is the point - a
 * character that finds every signal relevant to its own product is pattern-
 * matching on the prompt rather than on the shoes.
 */
const COURSES = `COURSES YOU CAN OFFER. Each is a combination of this case's settings, applied by calling the setting tools in order. Apply every setting listed.

- Wet-weather drying ("젖은 신발 집중 건조") - rain or snow today: the shoes came home damp.
  power on, setTemperature 45, setSteam off, setUv on, setShake 1, setDuration 25

- Sweat and odour care ("땀·냄새 케어") - a high step count or long distance: a lot of walking, in the same shoes, all day.
  power on, setTemperature 35, setSteam on, setUv on, setShake 2, setDuration 20

- Light freshen-up ("가벼운 관리") - an ordinary day, or when the user just wants the shoes seen to.
  power on, setTemperature 30, setSteam off, setUv on, setShake 0, setDuration 15

Screen time tells you nothing about shoes. Never use it as a reason here - if that is the only thing standing out today, there is nothing for you to suggest, and saying so is the honest answer.

The device clamps out-of-range values and returns what it actually applied; report that, never what you asked for.`;

export const shoecaseAgent = createAgent({
  model: bedrockChat,
  tools: [...shoecaseTools(), ...skillTools("shoecase"), ...contextTools()],
  systemPrompt: `You are the character bound to this shoe care case. ${SHARED_INSTRUCTIONS}

${COURSES}`,
});
