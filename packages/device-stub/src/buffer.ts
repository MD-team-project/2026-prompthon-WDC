/**
 * In-memory usage-event buffer and the flush loop.
 *
 * Flush semantics: `accepted` counts events consumed from the HEAD of the
 * array, in order. Partial acceptance is always a prefix, so the stub clears
 * exactly the first `accepted` and retains the rest for the next flush.
 */
import type { UsageEvent } from "@prompthon/shared";

const MAX_BUFFER = 500;

let buffer: UsageEvent[] = [];

export function enqueue(event: UsageEvent): void {
  buffer.push(event);
  // Bounded. Drop oldest rather than stall the device.
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(buffer.length - MAX_BUFFER);
}

export function pending(): number {
  return buffer.length;
}

export interface FlushDeps {
  url: string;
  intervalMs: number;
  log: (msg: string) => void;
}

export async function flushOnce(deps: FlushDeps): Promise<void> {
  if (buffer.length === 0) return;
  const batch = [...buffer];

  let accepted = 0;
  try {
    const res = await fetch(deps.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
    if (!res.ok) {
      deps.log(`flush rejected: HTTP ${res.status}, retrying ${batch.length} events next tick`);
      return; // accepted stays 0, buffer untouched
    }
    const body = (await res.json()) as { accepted?: number };
    accepted = Math.max(0, Math.min(Number(body.accepted ?? 0), batch.length));
  } catch (err) {
    deps.log(`flush failed: ${(err as Error).message}, retrying ${batch.length} events next tick`);
    return;
  }

  buffer = buffer.slice(accepted);
  deps.log(`flushed ${accepted}/${batch.length}, ${buffer.length} pending`);
}

export function startFlushLoop(deps: FlushDeps): NodeJS.Timeout {
  return setInterval(() => void flushOnce(deps), deps.intervalMs);
}
