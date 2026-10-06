"use client";

import { Button } from "../ui/button";

/** Tries the page again. Only used on the offline page, where there is nothing else to do. */
export function ReloadButton({ label }: { label: string }) {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
