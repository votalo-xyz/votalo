"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EmbedTheme, themeFromParam } from "@/components/embed/embed-theme";
import { EmbedNotFound } from "@/components/embed/embed-widget";

function Themed() {
  // A not-found page receives no props, so the theme is read from the address, like on the widget itself.
  const theme = themeFromParam(useSearchParams().get("theme") ?? undefined);
  return (
    <EmbedTheme theme={theme}>
      <EmbedNotFound />
    </EmbedTheme>
  );
}

/** Small branded "not found" for the widget: no navbar, no footer, just the message and a link out. */
export default function EmbedNotFoundPage() {
  return (
    <Suspense fallback={null}>
      <Themed />
    </Suspense>
  );
}
