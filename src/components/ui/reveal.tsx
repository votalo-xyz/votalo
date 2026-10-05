"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Fade-and-rise when scrolled into view. `delay` (seconds) staggers siblings. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ type: "spring", stiffness: 80, damping: 18, delay }}
    >
      {children}
    </Component>
  );
}
