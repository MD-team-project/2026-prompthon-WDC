import { Router } from "express";
import type { Request, Response } from "express";
import { PRODUCT_IDS } from "@prompthon/shared";
import type { ControlEvent, ProductId } from "@prompthon/shared";

// Missing any of headers/heartbeat/close-cleanup here kills the stream silently, with
// no error anywhere - on stage that's indistinguishable from the feature being broken.
export function startSseStream(req: Request, res: Response): (event: ControlEvent) => void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });

  return (event: ControlEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
}

// Per-product subscriber registry. Chat streams its own per-request
// response, but Skill Discovery runs in the background (triggered by a
// usage-event flush, not by an open chat turn), so it needs a persistent
// channel to push progress/results into - this is that channel.
const subscribers = new Map<ProductId, Set<(event: ControlEvent) => void>>();

export function subscribe(productId: ProductId, emit: (event: ControlEvent) => void): () => void {
  const set = subscribers.get(productId) ?? new Set();
  set.add(emit);
  subscribers.set(productId, set);
  return () => set.delete(emit);
}

export function publish(productId: ProductId, event: ControlEvent): void {
  subscribers.get(productId)?.forEach((emit) => emit(event));
}

/**
 * One SSE connection covering every product's events, for a client (the
 * discovery-demo screen) that wants to watch all three at once. Each
 * character screen still opens its own per-product `/events` (FR-27's "one
 * connection per product" holds there) - this exists because a page opening
 * 3 MORE persistent connections on top of the main app's 3 hits Chrome's
 * 6-connections-per-origin cap under HTTP/1.1, which starves every other
 * request on that origin (including the actual /chat POST) once both are
 * open in separate tabs. Every ControlEvent already carries `productId`, so
 * a subscriber can tell them apart without needing a connection per product.
 */
export const allEventsRouter = Router();

allEventsRouter.get("/api/events", (req, res) => {
  const emit = startSseStream(req, res);
  const unsubscribes = PRODUCT_IDS.map((productId) => subscribe(productId, emit));
  req.on("close", () => unsubscribes.forEach((unsubscribe) => unsubscribe()));
});
