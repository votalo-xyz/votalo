"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fingerprint, Unlink2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CredentialBadge } from "../brand/credential-badge";
import { shortAddress } from "../format";
import { cn } from "../ui/cn";
import { Reveal } from "../ui/reveal";

// Example addresses for the illustration only. They belong to no one.
const GROUPS = [
  { key: "family", address: "0x028aa908863571a011e2cb77be9bf2931b4c39c7" },
  { key: "team", address: "0x75f11a60184e22dde12abcbf568b6e0ee8f7f3b2" },
  { key: "collective", address: "0x7b626c9d4f84202af61c206ea63aad6aadd7ecd8" },
] as const;

const POINTS = ["stable", "different", "unlinkable"] as const;

export function CredentialsSection() {
  const t = useTranslations("Credentials");
  const name = useId();
  const [active, setActive] = useState(0);
  const current = GROUPS[active];
  const currentName = t(`groups.${current.key}`);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="surface-card grid gap-12 rounded-[2rem] p-6 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:p-14">
        <Reveal>
          <p className="text-eyebrow text-identity">{t("eyebrow")}</p>
          <h2 className="text-h2 mt-3">{t("title")}</h2>
          <p className="text-lead mt-5 text-muted">{t("body")}</p>
          <ul className="mt-8 flex flex-col gap-5">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-4">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-identity" />
                <div>
                  <h3 className="font-semibold">{t(`points.${p}.title`)}</h3>
                  <p className="mt-1 text-muted">{t(`points.${p}.body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col items-center">
          {/* One fingerprint at the top, fanning out into a credential per group. */}
          <div className="flex flex-col items-center text-center">
            <span className="flex size-20 items-center justify-center rounded-full border border-identity/40 bg-identity-soft text-identity">
              <Fingerprint aria-hidden="true" className="size-10" strokeWidth={1.5} />
            </span>
            <p className="mt-3 font-semibold">{t("fingerprint")}</p>
            <p className="text-sm text-muted">{t("stays")}</p>
          </div>

          <svg viewBox="0 0 300 56" aria-hidden="true" className="h-14 w-full max-w-sm text-identity/60">
            {[50, 150, 250].map((x, i) => (
              <motion.path
                key={x}
                d={`M150 0 C150 30 ${x} 22 ${x} 56`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.25 + i * 0.12, ease: "easeOut" }}
              />
            ))}
          </svg>

          <fieldset className="w-full max-w-sm">
            <legend className="sr-only">{t("hint")}</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {GROUPS.map((g, i) => {
                const label = t(`groups.${g.key}`);
                return (
                  <label
                    key={g.key}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition-[border-color,background-color,transform] duration-200 active:scale-[0.97]",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                      active === i ? "border-identity bg-identity-soft" : "border-line bg-surface-2 hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name={name}
                      checked={active === i}
                      onChange={() => setActive(i)}
                      className="sr-only"
                    />
                    <CredentialBadge address={g.address} size={56} title={t("badgeLabel", { group: label })} />
                    <span className="text-[0.8rem] font-semibold leading-tight">{label}</span>
                    <span className="font-mono text-[0.68rem] text-muted">{shortAddress(g.address, 6, 4)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Unlink2 aria-hidden="true" className="size-4 text-identity" />
            {t("unlinked")}
          </p>

          <div className="mt-6 flex min-h-[8.5rem] w-full max-w-sm items-center justify-center gap-5 rounded-3xl border border-line bg-surface-2 p-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.key}
                className="flex items-center gap-5"
                initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <CredentialBadge address={current.address} size={96} />
                <div className="min-w-0">
                  <p className="text-sm text-muted" aria-live="polite">
                    {t("inGroup", { group: currentName })}
                  </p>
                  <p className="mt-1 break-all font-mono text-[0.8rem] leading-snug">{shortAddress(current.address, 10, 6)}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
