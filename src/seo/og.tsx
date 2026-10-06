/**
 * Drawing code for the 1200x630 share cards (WhatsApp, Telegram, X). They render outside the page's CSS, so
 * the dark Plaza tokens are repeated here. The ring is decoration: it never shows numbers, because a card is
 * cached by whoever receives it and a count on it would go stale.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const BG = "#0D0B12";
const SURFACE = "#16131D";
const TEXT = "#F4F1EA";
const MUTED = "#ABA4B8";
const TRACK = "rgba(244,241,234,0.08)";
const SEGMENTS = ["#FFB454", "#7C6CF0", "#3DD9A4"];
const FONT = "Bricolage";

/**
 * Brand font for the cards. The files live in the repo (OFL license next to them) and are read from disk, never
 * fetched from the network. next.config.ts lists them in outputFileTracingIncludes so the deployed functions
 * that draw cards at request time can find them.
 */
export async function ogFonts() {
  const dir = path.join(process.cwd(), "src", "seo", "fonts");
  const load = async (name: string) => {
    const file = await readFile(path.join(dir, name));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  };
  const [extraBold, semiBold] = await Promise.all([
    load("bricolage-grotesque-latin-800-normal.woff"),
    load("bricolage-grotesque-latin-600-normal.woff"),
  ]);
  return [
    { name: FONT, data: extraBold, weight: 800 as const, style: "normal" as const },
    { name: FONT, data: semiBold, weight: 600 as const, style: "normal" as const },
  ];
}

/** The logo mark: three arcs and a dot, the same shape as the living ring. */
function Mark({ size }: { size: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const parts = [0.38, 0.3, 0.2];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <g transform="rotate(-90 16 16)" fill="none" strokeWidth="5.5" strokeLinecap="round">
        {parts.map((len, i) => {
          const before = parts.slice(0, i).reduce((a, b) => a + b, 0);
          const dash = len * c - 3;
          return (
            <circle
              key={i}
              cx="16"
              cy="16"
              r={r}
              stroke={SEGMENTS[i]}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-(before * c + i)}
            />
          );
        })}
      </g>
      <circle cx="16" cy="16" r="3" fill={TEXT} />
    </svg>
  );
}

function Ring({ size }: { size: number }) {
  const R = 150;
  const STROKE = 34;
  const C = 2 * Math.PI * R;
  const GAP = STROKE + 8;
  const fractions = [0.5, 0.3, 0.2];
  return (
    <svg width={size} height={size} viewBox="0 0 380 380">
      <g transform="rotate(-90 190 190)">
        <circle cx="190" cy="190" r={R} fill="none" stroke={TRACK} strokeWidth={STROKE} />
        {fractions.map((f, i) => {
          const before = fractions.slice(0, i).reduce((a, b) => a + b, 0);
          const len = f * C - GAP;
          return (
            <circle
              key={i}
              cx="190"
              cy="190"
              r={R}
              fill="none"
              stroke={SEGMENTS[i]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-(before * C + GAP / 2)}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** Faint concentric rings behind the card, the same "plaza" motif as the site's hero. */
function Plaza() {
  return (
    <svg
      width="900"
      height="900"
      viewBox="0 0 800 800"
      style={{ position: "absolute", right: -260, top: -150, opacity: 0.09 }}
    >
      {[120, 200, 280, 360].map((r) => (
        <circle key={r} cx="400" cy="400" r={r} fill="none" stroke={TEXT} strokeWidth="2" />
      ))}
    </svg>
  );
}

type CardProps = {
  /** The big line. */
  headline: string;
  /** One quiet line under it. */
  tagline: string;
  /** Font size for the headline; longer text needs smaller. */
  headlineSize?: number;
  /** Extra content between the headline and the tagline. */
  children?: ReactNode;
};

/** Logo, headline and the living ring on the Plaza background. Used for the site and for proposals. */
export function ShareCard({ headline, tagline, headlineSize = 76, children }: CardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: BG,
        color: TEXT,
        fontFamily: FONT,
      }}
    >
      <Plaza />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 650, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark size={56} />
          <div style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -1.5 }}>votalo</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: headlineSize,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -2,
              lineClamp: 4,
            }}
          >
            {headline}
          </div>
          {children}
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: MUTED }}>{tagline}</div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 420,
          height: 420,
          borderRadius: 64,
          background: SURFACE,
          border: "1px solid rgba(244,241,234,0.10)",
        }}
      >
        <Ring size={350} />
      </div>
    </div>
  );
}
