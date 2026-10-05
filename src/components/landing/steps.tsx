import { ChartPie, Fingerprint, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "../ui/reveal";

const STEPS = [
  { key: "create", icon: Link2 },
  { key: "vote", icon: Fingerprint },
  { key: "results", icon: ChartPie },
] as const;

export function Steps() {
  const t = useTranslations("Steps");

  return (
    <section id="how" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <p className="text-eyebrow text-accent-text">{t("eyebrow")}</p>
        <h2 className="text-h2 mt-3 max-w-2xl">{t("title")}</h2>
      </Reveal>

      <ol className="mt-12 grid gap-5 md:grid-cols-3">
        {STEPS.map(({ key, icon: Icon }, i) => (
          <Reveal as="li" key={key} delay={i * 0.1} className="surface-card relative rounded-4xl p-7 sm:p-8">
            <span
              aria-hidden="true"
              className="font-display text-7xl font-extrabold leading-none tracking-tighter text-fg/10"
            >
              {i + 1}
            </span>
            <span className="mt-6 flex size-12 items-center justify-center rounded-2xl bg-identity-soft text-identity">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="text-h3 mt-5">{t(`items.${key}.title`)}</h3>
            <p className="mt-3 text-muted">{t(`items.${key}.body`)}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
