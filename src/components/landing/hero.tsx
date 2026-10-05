import { ArrowRight, Fingerprint, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { DemoPoll } from "./demo-poll";

const rise = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export function Hero() {
  const t = useTranslations("Hero");
  const c = useTranslations("Common");

  const assurances = [
    { icon: Fingerprint, text: t("assurances.noAccounts") },
    { icon: UserRound, text: t("assurances.onePerson") },
    { icon: ShieldCheck, text: t("assurances.noErase") },
  ];

  return (
    <section className="relative isolate">
      {/* Decorative plaza: concentric rings, low contrast, behind everything. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 800"
        className="pointer-events-none absolute -right-72 -top-40 -z-10 size-[56rem] text-fg opacity-[0.07] lg:-right-40"
      >
        {[120, 200, 280, 360].map((r) => (
          <circle key={r} cx="400" cy="400" r={r} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={r % 240 === 0 ? "3 9" : undefined} />
        ))}
      </svg>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pt-16">
        <div>
          <p className="rise text-eyebrow text-accent-text" style={rise(0)}>
            {t("eyebrow")}
          </p>
          <h1 className="slide-up text-display mt-5" style={rise(80)}>
            {t("title")}
          </h1>
          <p className="slide-up text-lead mt-6 max-w-xl text-muted" style={rise(180)}>
            {t("subtitle")}
          </p>

          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={rise(280)}>
            <Link href="/create" className={cn(buttonVariants({ size: "lg" }), "group")}>
              {c("createGroup")}
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            <Link href="/#how" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              {c("seeHow")}
            </Link>
          </div>

          <ul className="rise mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[0.95rem]" style={rise(380)}>
            {assurances.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-muted">
                <Icon aria-hidden="true" className="size-[1.15rem] text-identity" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise" style={rise(220)}>
          <DemoPoll />
        </div>
      </div>
    </section>
  );
}
