import { cn } from "../ui/cn";

/** 20 bytes from a 0x address, or a stable hash of any other string. Deterministic, never random. */
function seedBytes(seed: string): number[] {
  const hex = seed.replace(/^0x/i, "");
  if (/^[0-9a-f]{40}$/i.test(hex)) {
    return Array.from({ length: 20 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  }
  // FNV-1a, then a small LCG to stretch it to 20 bytes.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  return Array.from({ length: 20 }, () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h >>> 24;
  });
}

const SHAPES = ["circle", "square", "diamond"] as const;

/**
 * Group credential: a generative badge derived from the member's address in that group.
 * The same address always gives the same badge; a different address gives an unrelated one.
 * Colours come from CSS variables so the badge keeps its contrast in both themes.
 */
export function CredentialBadge({
  address,
  size = 64,
  className,
  title,
}: {
  address: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const b = seedBytes(address);
  const hue = Math.round((b[0] / 255) * 360);
  const accentHue = (hue + 40 + (b[1] % 140)) % 360;
  const shape = SHAPES[b[2] % SHAPES.length];

  // 5x5 grid mirrored around the middle column: 3 columns of bits decide the cells.
  const cells: { x: number; y: number; hot: boolean }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const on = (b[3 + row * 3 + col] & 1) === 1 || (row === 2 && col === 2);
      if (!on) continue;
      const hot = (b[3 + row * 3 + col] & 2) === 2;
      cells.push({ x: col, y: row, hot });
      if (col < 2) cells.push({ x: 4 - col, y: row, hot });
    }
  }

  const cell = 11;
  const origin = 22.5;
  const rotation = (b[4] % 8) * 45;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      style={
        {
          "--h": hue,
          "--h2": accentHue,
        } as React.CSSProperties
      }
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="28"
        style={{ fill: "hsl(var(--h) 45% var(--badge-bg-l))", stroke: "hsl(var(--h) 60% var(--badge-ring-l))" }}
        strokeWidth="2"
      />
      <g
        transform={`rotate(${rotation} 50 50)`}
        fill="none"
        strokeWidth="1.4"
        style={{ stroke: "hsl(var(--h2) 60% var(--badge-ring-l))" }}
        opacity="0.55"
      >
        <circle cx="50" cy="50" r="43" strokeDasharray="2 5" />
      </g>
      {cells.map(({ x, y, hot }, i) => {
        const cx = origin + x * cell + cell / 2;
        const cy = origin + y * cell + cell / 2;
        const fill = hot ? "hsl(var(--h2) 80% var(--badge-fg-l))" : "hsl(var(--h) 75% var(--badge-fg-l))";
        if (shape === "circle") return <circle key={i} cx={cx} cy={cy} r={cell * 0.42} style={{ fill }} />;
        if (shape === "square")
          return (
            <rect key={i} x={cx - cell * 0.4} y={cy - cell * 0.4} width={cell * 0.8} height={cell * 0.8} rx="2.5" style={{ fill }} />
          );
        return (
          <rect
            key={i}
            x={cx - cell * 0.32}
            y={cy - cell * 0.32}
            width={cell * 0.64}
            height={cell * 0.64}
            rx="1.5"
            transform={`rotate(45 ${cx} ${cy})`}
            style={{ fill }}
          />
        );
      })}
    </svg>
  );
}
