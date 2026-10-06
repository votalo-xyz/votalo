import { cn } from "../ui/cn";

/** Three-arc ring: the same shape the living ring uses, so the mark and the product match. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const arcs = [
    { len: 0.38, color: "var(--seg-1)" },
    { len: 0.3, color: "var(--seg-2)" },
    { len: 0.2, color: "var(--seg-3)" },
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <g transform="rotate(-90 16 16)" fill="none" strokeWidth="5.5" strokeLinecap="round">
        {arcs.map((a) => {
          const dash = a.len * c - 4.6;
          const el = (
            <circle
              key={a.color}
              cx="16"
              cy="16"
              r={r}
              stroke={a.color}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += a.len * c + 2.6;
          return el;
        })}
      </g>
      <circle cx="16" cy="16" r="3" fill="var(--fg)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.45rem] font-extrabold leading-none tracking-[-0.04em]">votalo</span>
    </span>
  );
}
