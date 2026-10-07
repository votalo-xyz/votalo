/**
 * Hold-to-vote on an option card. These are the rules only: the card in vote-panel.tsx feeds them pointer
 * events and animation-frame times, and acts on what they return. Kept free of React and the DOM so the
 * gesture can be tested directly.
 */

/** Same length as the HoldButton ring (about 0.9 s). */
export const CARD_HOLD_MS = 900;

/** A touch that moves farther than this is a scroll, not a hold. */
export const SCROLL_SLOP_PX = 10;

export type HoldStart = { x: number; y: number; at: number; pointerType: string };

export type HoldFrame = { progress: number; completed: boolean };

/** `tap`: released before the ring filled. `cancelled`: the touch became a scroll. */
export type HoldEnd = "none" | "tap" | "cancelled";

export function createCardHold(durationMs = CARD_HOLD_MS) {
  let press: HoldStart | null = null;

  return {
    /** True while a press is being held down. */
    get active() {
      return press !== null;
    },

    /** Begins a hold. Ignored while one is already running. */
    start(next: HoldStart): boolean {
      if (press !== null) return false;
      press = next;
      return true;
    },

    /** Only touch can cancel on movement. Mouse and pen keep holding while the pointer moves. */
    move(x: number, y: number): HoldEnd {
      if (press === null || press.pointerType !== "touch") return "none";
      if (Math.hypot(x - press.x, y - press.y) <= SCROLL_SLOP_PX) return "none";
      press = null;
      return "cancelled";
    },

    /** Progress at time `now`. The hold completes once, the frame the ring closes, and then ends. */
    frame(now: number): HoldFrame {
      if (press === null) return { progress: 0, completed: false };
      const progress = Math.min(1, Math.max(0, (now - press.at) / durationMs));
      if (progress < 1) return { progress, completed: false };
      press = null;
      return { progress: 1, completed: true };
    },

    /** The pointer went up. Before the ring filled, that is a tap: the card stays selected, no vote. */
    release(): HoldEnd {
      if (press === null) return "none";
      press = null;
      return "tap";
    },
  };
}

export type CardHold = ReturnType<typeof createCardHold>;
