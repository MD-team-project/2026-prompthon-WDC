import { pralAgent } from "../agents/pral.js";
import { characterRouter } from "./character.js";

export const pralRouter = characterRouter("pral", pralAgent);
