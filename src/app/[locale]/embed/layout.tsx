import type { Metadata } from "next";
import type { ReactNode } from "react";

// The widget lives on other people's pages, not in search results.
export const metadata: Metadata = {
  title: "Votalo",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return children;
}
