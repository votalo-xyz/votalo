import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isHex32 } from "@/components/ids";

// The id is checked here, in the layout, because a loading.tsx makes the page itself stream: by the time a
// page could say "not found" the status would already be 200. A layout runs first, so this stays a real 404.
export default async function GroupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  if (!isHex32(groupId)) notFound();
  return children;
}
