import { shoecaseAgent } from "../agents/shoecase.js";
import { characterRouter } from "./character.js";

export const shoecaseRouter = characterRouter("shoecase", shoecaseAgent);
