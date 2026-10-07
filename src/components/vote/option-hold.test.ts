import { describe, expect, it } from "vitest";
import { CARD_HOLD_MS, createCardHold } from "./option-hold";

const touch = (x = 100, y = 100, at = 0) => ({ x, y, at, pointerType: "touch" });

describe("hold-to-vote on an option card", () => {
  it("a tap selects without voting", () => {
    const hold = createCardHold();
    expect(hold.start(touch(100, 100, 0))).toBe(true);
    expect(hold.frame(300)).toEqual({ progress: 300 / CARD_HOLD_MS, completed: false });
    expect(hold.release()).toBe("tap");
    // Nothing keeps running after the tap: a later frame cannot complete the hold.
    expect(hold.frame(CARD_HOLD_MS * 3)).toEqual({ progress: 0, completed: false });
    expect(hold.active).toBe(false);
  });

  it("a full hold votes exactly once", () => {
    const hold = createCardHold();
    hold.start(touch(100, 100, 0));
    expect(hold.frame(CARD_HOLD_MS / 2).completed).toBe(false);
    expect(hold.frame(CARD_HOLD_MS)).toEqual({ progress: 1, completed: true });
    // The ring is closed and the hold has ended: more frames and a release do not vote again.
    expect(hold.frame(CARD_HOLD_MS + 100)).toEqual({ progress: 0, completed: false });
    expect(hold.release()).toBe("none");
  });

  it("moving more than 10 px on touch cancels the hold", () => {
    const hold = createCardHold();
    hold.start(touch(100, 100, 0));
    expect(hold.move(100, 111)).toBe("cancelled");
    expect(hold.active).toBe(false);
    expect(hold.frame(CARD_HOLD_MS)).toEqual({ progress: 0, completed: false });
  });

  it("a movement of 10 px or less does not cancel", () => {
    const hold = createCardHold();
    hold.start(touch(100, 100, 0));
    expect(hold.move(106, 108)).toBe("none"); // 10 px exactly
    expect(hold.move(100, 109)).toBe("none"); // 9 px from the start
    expect(hold.frame(CARD_HOLD_MS).completed).toBe(true);
  });

  it("a mouse that moves far keeps holding", () => {
    const hold = createCardHold();
    hold.start({ x: 100, y: 100, at: 0, pointerType: "mouse" });
    expect(hold.move(300, 300)).toBe("none");
    expect(hold.frame(CARD_HOLD_MS).completed).toBe(true);
  });

  it("a second press while one is running is ignored", () => {
    const hold = createCardHold();
    expect(hold.start(touch(100, 100, 0))).toBe(true);
    expect(hold.start(touch(200, 200, 50))).toBe(false);
    expect(hold.frame(CARD_HOLD_MS).completed).toBe(true);
  });
});
