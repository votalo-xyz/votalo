import type { ReactNode } from "react";
import { Reveal } from "../ui/reveal";

/** Top of a full marketing page: small label, big title, one-sentence lead. */
export function PageHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead: ReactNode }) {
  return (
    <Reveal as="section" className="max-w-3xl">
      {eyebrow && <p className="text-eyebrow text-accent-text">{eyebrow}</p>}
      <h1 className="text-display mt-3 !text-[clamp(2.2rem,1.4rem+3.6vw,3.8rem)]">{title}</h1>
      <p className="text-lead mt-5 text-muted">{lead}</p>
    </Reveal>
  );
}
