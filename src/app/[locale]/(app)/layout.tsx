import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { resolveLocale } from "@/i18n/locale";

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await resolveLocale(params);
  return <AppShell>{children}</AppShell>;
}
