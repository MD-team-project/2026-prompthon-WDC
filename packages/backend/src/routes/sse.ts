import type { Request, Response } from "express";
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
