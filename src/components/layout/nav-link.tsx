"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "../ui/cn";

/** A link that knows when it points at the current page: it sets `aria-current` and an active style. */
export function NavLink({
  href,
  className,
  activeClassName,
  ...props
}: ComponentProps<typeof Link> & { href: string; activeClassName?: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      {...props}
    />
  );
}
