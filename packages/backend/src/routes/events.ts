import { Router } from "express";
import { isProductId } from "@prompthon/shared";
import { startSseStream, subscribe } from "./sse.js";

// Persistent per-product subscription for background events (Skill
// Discovery progress and results) that don't arrive inside a chat turn.
export const eventsRouter = Router();

eventsRouter.get("/api/characters/:productId/events", (req, res) => {
  const { productId } = req.params;
  if (!productId || !isProductId(productId)) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: `unknown product ${productId}` } });
    return;
  }

  const emit = startSseStream(req, res);
  const unsubscribe = subscribe(productId, emit);
  req.on("close", unsubscribe);
});
