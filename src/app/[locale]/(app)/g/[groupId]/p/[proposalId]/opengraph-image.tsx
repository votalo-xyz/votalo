import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { buildDemo } from "@/data/demo";
import { resolveLocale } from "@/i18n/locale";

export const alt = "Votalo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dark-theme tokens, repeated here because the image renders outside the page's CSS.
const BG = "#0D0B12";
const SURFACE = "#16131D";
const TEXT = "#F4F1EA";
const MUTED = "#ABA4B8";
const TRACK = "rgba(244,241,234,0.08)";
const SEGMENTS = ["#FFB454", "#7C6CF0", "#3DD9A4", "#E5566B", "#8FD8FF", "#EDE6F7"];

const R = 150;
const C = 2 * Math.PI * R;
const STROKE = 34;

function Ring({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0);
  const visible = counts.filter((n) => n > 0).length;
  const gap = visible > 1 ? STROKE + 8 : 0;
  return (
    <svg width="380" height="380" viewBox="0 0 380 380">
      <g transform="rotate(-90 190 190)">
        <circle cx="190" cy="190" r={R} fill="none" stroke={TRACK} strokeWidth={STROKE} />
        {counts.map((n, i) => {
          const fraction = total > 0 ? n / total : 0;
          const len = n > 0 ? Math.max(0.01, fraction * C - gap) : 0;
          const before = counts.slice(0, i).reduce((a, b) => a + b, 0);
          const start = (total > 0 ? before / total : 0) * C + gap / 2;
          return (
            <circle
              key={i}
              cx="190"
              cy="190"
              r={R}
              fill="none"
              stroke={SEGMENTS[i % SEGMENTS.length]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-start}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string; groupId: string; proposalId: string }>;
}) {
  const locale = await resolveLocale(params);
  const { proposalId } = await params;
  const t = await getTranslations({ locale, namespace: "Proposal" });
  const d = await getTranslations({ locale, namespace: "DemoData" });
  const demo = buildDemo(
    {
      group: d("group"),
      open: { title: d("open.title"), options: d.raw("open.options") as string[] },
      closed: { title: d("closed.title"), options: d.raw("closed.options") as string[] },
    },
    Math.floor(Date.now() / 1000),
  );
  const known = demo.proposals.find((p) => p.id === proposalId);
  const title = known?.title ?? t("ogTitle");
  // Without data for this proposal, the ring is decoration only and carries no numbers.
  const counts = known ? known.counts : [3, 2, 1];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: BG,
          color: TEXT,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, fontWeight: 800 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                border: `9px solid ${SEGMENTS[0]}`,
                borderRightColor: SEGMENTS[1],
                borderBottomColor: SEGMENTS[2],
                display: "flex",
              }}
            />
            votalo
          </div>
          <div style={{ display: "flex", marginTop: 56, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 32, fontSize: 30, color: MUTED }}>{t("ogTagline")}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 420,
            height: 420,
            borderRadius: 56,
            background: SURFACE,
          }}
        >
          <Ring counts={counts} />
        </div>
      </div>
    ),
    { ...size },
  );
}
