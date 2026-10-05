import { Eye, EyeOff, Network, Unlink2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "../ui/reveal";

const ITEMS: { key: "visible" | "noPersonal" | "unlinked" | "ip"; icon: LucideIcon }[] = [
  { key: "visible", icon: Eye },
  { key: "noPersonal", icon: EyeOff },
  { key: "unlinked", icon: Unlink2 },
  { key: "ip", icon: Network },
];

export function PrivacySection() {
  const t = useTranslations("Privacy");

  return (
    <section id="privacy" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="max-w-3xl">
        <p className="text-eyebrow text-accent-text">{t("eyebrow")}</p>
        <h2 className="text-h2 mt-3">{t("title")}</h2>
        <p className="text-lead mt-5 text-muted">{t("lead")}</p>
      </Reveal>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {ITEMS.map(({ key, icon: Icon }, i) => (
          <Reveal as="li" key={key} delay={(i % 2) * 0.08} className="surface-card flex gap-5 rounded-3xl p-6 sm:p-7">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-fg">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h3 className="text-h3 !text-[1.15rem]">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-muted">{t(`items.${key}.body`)}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
