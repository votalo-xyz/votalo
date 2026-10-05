import { cn } from "./cn";

/** Placeholder block. The shimmer moves with transform only. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-xl bg-surface-2", className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fg/10 to-transparent [animation:shimmer_1.6s_infinite]" />
    </div>
  );
}
