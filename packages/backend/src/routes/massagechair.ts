import { massagechairAgent } from "../agents/massagechair.js";
import { characterRouter } from "./character.js";

export const massagechairRouter = characterRouter("massagechair", massagechairAgent);
