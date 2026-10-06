"use client";

import { LivingRing } from "../brand/living-ring";

/** The living ring as decoration: a shape, never a figure. Hidden from assistive tech. */
export function PitchRing({ counts, className }: { counts: number[]; className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <LivingRing counts={counts} label="" />
    </div>
  );
}
