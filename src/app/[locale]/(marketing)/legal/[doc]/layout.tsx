import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const DOCS = ["privacy", "terms"];

// Checked in the layout so an unknown document is a real 404 and not a streamed 200 (see the group layout).
export default async function LegalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  if (!DOCS.includes(doc)) notFound();
  return children;
}
