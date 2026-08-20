import { Router } from "express";
import { deviceAdapter } from "../device/adapter.js";

/**
 * Today's app-level context, for the frontend to display.
 *
 * Not under /api/characters: this is not product-scoped and not device state.
 * One demo user, one reading; the same values back all three characters.
 *
 * Pure pass-through of what device-stub reported, for the same reason device
 * state is passed through verbatim - the numbers on screen have to be the
 * numbers the integration gave, so that the reason the character states and
 * the reading the user can see are the same thing.
 */
export const contextRouter = Router();

contextRouter.get("/api/context/today", async (_req, res) => {
  try {
    res.json(await deviceAdapter.getDailyContext());
  } catch (err) {
    // Visible failure, not an empty body: FE renders "unavailable" rather than
    // silently showing a panel with nothing in it.
    res.status(502).json({
      failure: { code: "DEVICE_UNREACHABLE", message: (err as Error).message },
    });
  }
});
