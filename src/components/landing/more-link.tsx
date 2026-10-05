import { ArrowRight } from "lucide-react";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "../ui/cn";

/** "See more" link from a landing summary to its full page. */
export function MoreLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-text underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
