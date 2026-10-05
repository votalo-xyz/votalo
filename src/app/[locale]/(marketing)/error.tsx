"use client";

import { ErrorView } from "@/components/ui/error-view";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} />;
}
