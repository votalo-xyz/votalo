import { cn } from "./cn";

const base =
  "w-full rounded-2xl border border-line-strong bg-surface px-4 text-base text-fg placeholder:text-muted/80 transition-colors focus-visible:border-[var(--focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(base, "min-h-12 py-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(base, "min-h-24 resize-none py-3 leading-snug", className)} {...props} />;
}

/** "12 of 80" under a field. Turns red when over the limit. Announced politely, not on every key. */
export function Counter({ text, over }: { text: string; over: boolean }) {
  return (
    <span className={cn("text-xs tabular-nums", over ? "font-semibold text-danger" : "text-muted")}>{text}</span>
  );
}
