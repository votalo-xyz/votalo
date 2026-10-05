import type { Hex } from "viem";
import type { Group, Proposal } from "./types";

export const DEMO_GROUP_ID: Hex = `0x${"d1".repeat(32)}`;
export const DEMO_OPEN_PROPOSAL_ID: Hex = `0x${"a1".repeat(32)}`;
export const DEMO_CLOSED_PROPOSAL_ID: Hex = `0x${"a2".repeat(32)}`;

export type DemoTexts = {
  group: string;
  open: { title: string; options: string[] };
  closed: { title: string; options: string[] };
};

const DAY = 86_400;

/**
 * Example group that ships with the app, so every screen has something real-looking to open.
 * Deadlines hang off the current UTC day, so they are the same on every reload within a day.
 */
export function buildDemo(texts: DemoTexts, nowSeconds: number): { group: Group; proposals: Proposal[] } {
  const dayStart = Math.floor(nowSeconds / DAY) * DAY;
  return {
    group: { id: DEMO_GROUP_ID, name: texts.group, mode: "open", members: 9, mine: false, demo: true },
    proposals: [
      {
        id: DEMO_OPEN_PROPOSAL_ID,
        groupId: DEMO_GROUP_ID,
        title: texts.open.title,
        options: texts.open.options,
        counts: [5, 3, 2],
        deadline: dayStart + 3 * DAY,
        createdAt: dayStart - DAY,
        mine: false,
        demo: true,
      },
      {
        id: DEMO_CLOSED_PROPOSAL_ID,
        groupId: DEMO_GROUP_ID,
        title: texts.closed.title,
        options: texts.closed.options,
        counts: [4, 6],
        deadline: dayStart - 4 * 3600,
        createdAt: dayStart - 5 * DAY,
        mine: false,
        demo: true,
      },
    ],
  };
}
