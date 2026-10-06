import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BadgeCheck,
  Check,
  CircleDashed,
  Eye,
  Fingerprint,
  Link2,
  Rocket,
  Share2,
  UserRoundX,
  UsersRound,
  Vote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LiveStatsGrid } from "../landing/live-stats";
import { buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Reveal } from "../ui/reveal";
import {
  CI_URL,
  CONTRACT_ADDRESS,
  CONTRACT_SOURCE_URL,
  CONTRACT_TESTS_URL,
  CONTRACT_URL,
  GITHUB_URL,
  INDEXER_URL,
  LICENSE_URL,
  MERA_URL,
  MONAD_DOCS_URL,
  SIGNING_CODE_URL,
  WEBAUTHN_PRF_URL,
  WIDGET_DOC_URL,
} from "../site";
import { DeckControls } from "./deck-controls";
import { PitchRing } from "./pitch-ring";

export const SLIDE_COUNT = 12;

const pad = (n: number) => String(n).padStart(2, "0");
const sourceClass =
  "inline-flex min-h-11 items-center gap-1 font-semibold text-accent-text underline-offset-4 hover:underline";

type Source = { href: string; label: string; external?: boolean };

/** Where a slide's claims can be checked. Internal links stay in the visitor's language. */
function Sources({ items }: { items: Source[] }) {
  const t = useTranslations("Pitch");
  return (
    <Reveal className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      <span className="text-eyebrow text-muted">{t("sources")}</span>
      {items.map(({ href, label, external }) =>
        external ? (
          <a key={href} className={sourceClass} href={href} target="_blank" rel="noopener noreferrer">
            {label}
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only"> ({t("newTab")})</span>
          </a>
        ) : (
          <Link key={href} className={sourceClass} href={href}>
            {label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ),
      )}
    </Reveal>
  );
}

function Slide({
  n,
  title,
  lead,
  children,
  className,
  h1,
}: {
  n: number;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
  h1?: boolean;
}) {
  const Heading = h1 ? "h1" : "h2";
  return (
    <section
      id={`slide-${n}`}
      data-slide={n}
      aria-labelledby={`slide-${n}-title`}
      className={cn("deck-slide relative flex items-center", className)}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <p className="font-mono text-sm font-semibold tabular-nums text-muted">
          {pad(n)} / {pad(SLIDE_COUNT)}
        </p>
        <Reveal>
          <Heading id={`slide-${n}-title`} className={cn("mt-4 max-w-4xl", h1 ? "text-display" : "text-h2")}>
            {title}
          </Heading>
          {lead && <p className="text-lead mt-5 max-w-3xl text-muted">{lead}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/** A short row with an icon, used for most of the lists. */
function Point({ icon, children, delay = 0 }: { icon: ReactNode; children: ReactNode; delay?: number }) {
  return (
    <Reveal as="li" delay={delay} className="surface-card flex items-start gap-4 rounded-3xl p-5 sm:p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2">{icon}</span>
      <span className="pt-1.5 text-lg">{children}</span>
    </Reveal>
  );
}

const icon = "size-5";

function Slide1() {
  const t = useTranslations("Pitch.s1");
  return (
    <Slide n={1} h1 title={t("title")} lead={t("lead")} className="bg-[radial-gradient(60rem_40rem_at_85%_10%,var(--identity-soft),transparent)]">
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <Reveal delay={0.1} className="flex flex-wrap gap-3">
            <Link href="/create" className={buttonVariants({ size: "lg" })}>
              {t("app")}
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              {t("code")}
              <ArrowUpRight aria-hidden="true" className="size-5" />
            </a>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-sm text-muted">{t("note")}</p>
          </Reveal>
        </div>
        <PitchRing counts={[5, 3, 2]} className="mx-auto w-full max-w-xs lg:max-w-sm" />
      </div>
    </Slide>
  );
}

function Slide2() {
  const t = useTranslations("Pitch.s2");
  const items = [
    { key: "double", icon: <Vote aria-hidden="true" className={icon} /> },
    { key: "outsiders", icon: <UserRoundX aria-hidden="true" className={icon} /> },
    { key: "edited", icon: <Ban aria-hidden="true" className={icon} /> },
    { key: "lost", icon: <CircleDashed aria-hidden="true" className={icon} /> },
  ] as const;
  return (
    <Slide n={2} title={t("title")} lead={t("lead")}>
      <ul className="mt-10 grid gap-3 md:grid-cols-2">
        {items.map((item, i) => (
          <Point key={item.key} icon={item.icon} delay={i * 0.07}>
            {t(`items.${item.key}`)}
          </Point>
        ))}
      </ul>
      <Sources items={[{ href: "/how-it-works", label: t("link") }]} />
    </Slide>
  );
}

function Slide3() {
  const t = useTranslations("Pitch.s3");
  const steps = ["create", "share", "vote"] as const;
  const icons = [
    <UsersRound key="c" aria-hidden="true" className="size-7" />,
    <Share2 key="s" aria-hidden="true" className="size-7" />,
    <Fingerprint key="v" aria-hidden="true" className="size-7" />,
  ];
  return (
    <Slide n={3} title={t("title")}>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal as="li" key={step} delay={i * 0.1} className="surface-card flex flex-col rounded-4xl p-7">
            <span className="flex items-center justify-between">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-identity-soft text-identity">{icons[i]}</span>
              <span aria-hidden="true" className="font-display text-5xl font-extrabold text-line-strong">
                {i + 1}
              </span>
            </span>
            <p className="text-h3 mt-6">{t(`items.${step}`)}</p>
          </Reveal>
        ))}
      </ol>
      <Reveal delay={0.3}>
        <p className="text-lead mt-8 font-semibold">{t("note")}</p>
      </Reveal>
      <Sources items={[{ href: "/how-it-works", label: t("link") }]} />
    </Slide>
  );
}

function Slide4() {
  const t = useTranslations("Pitch.s4");
  return (
    <Slide n={4} title={t("title")} lead={t("lead")}>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Reveal className="surface-card rounded-4xl p-6 sm:p-8">
          <LiveStatsGrid />
          <Link href="/stats" className={cn(sourceClass, "mt-4")}>
            {t("stats")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Reveal>
        <div className="flex flex-col gap-5">
          <Reveal delay={0.1}>
            <Link href="/create" className={buttonVariants({ size: "lg" })}>
              {t("cta")}
            </Link>
          </Reveal>
          <Reveal delay={0.2} className="surface-card rounded-3xl p-5 sm:p-6">
            <p className="flex items-start gap-3">
              <Link2 aria-hidden="true" className="mt-1 size-5 shrink-0 text-identity" />
              <span>{t("widget")}</span>
            </p>
            <a className={cn(sourceClass, "mt-2")} href={WIDGET_DOC_URL} target="_blank" rel="noopener noreferrer">
              {t("widgetLink")}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </Reveal>
        </div>
      </div>
    </Slide>
  );
}

function Slide5() {
  const t = useTranslations("Pitch.s5");
  const items = ["inside", "across", "stored", "vault"] as const;
  return (
    <Slide n={5} title={t("title")} lead={t("lead")}>
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <ul className="flex flex-col gap-3">
          {items.map((key, i) => (
            <Point key={key} delay={i * 0.08} icon={<Fingerprint aria-hidden="true" className={cn(icon, "text-identity")} />}>
              {t(`items.${key}`)}
            </Point>
          ))}
        </ul>
        {/* One passkey, three groups: the same shape, a different ring each time. */}
        <div aria-hidden="true" className="flex items-center justify-center gap-4">
          <PitchRing counts={[4, 1, 2]} className="w-1/3 max-w-32" />
          <PitchRing counts={[1, 5, 1]} className="w-1/3 max-w-32" />
          <PitchRing counts={[2, 2, 5]} className="w-1/3 max-w-32" />
        </div>
      </div>
      <Sources
        items={[
          { href: "/privacy", label: t("privacy") },
          { href: MERA_URL, label: t("mera"), external: true },
          { href: WEBAUTHN_PRF_URL, label: t("prf"), external: true },
        ]}
      />
    </Slide>
  );
}

function Slide6() {
  const t = useTranslations("Pitch.s6");
  const nodes = ["passkey", "signature", "relayer", "contract", "indexer", "results"] as const;
  return (
    <Slide n={6} title={t("title")} lead={t("lead")}>
      <ol aria-label={t("diagram")} className="mt-10 flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {nodes.map((node, i) => (
          <li key={node} className="flex flex-col items-center gap-2 lg:flex-1 lg:flex-row lg:gap-0">
            <Reveal
              delay={i * 0.09}
              className={cn(
                "surface-card w-full flex-1 self-stretch rounded-3xl p-4 text-left lg:p-5",
                (node === "contract" || node === "results") && "border-accent",
              )}
            >
              <span className="font-mono text-xs font-semibold text-muted">{pad(i + 1)}</span>
              <p className="mt-1 font-display text-lg font-semibold leading-tight">{t(`nodes.${node}.name`)}</p>
              <p className="mt-1 text-sm text-muted">{t(`nodes.${node}.note`)}</p>
            </Reveal>
            {i < nodes.length - 1 && (
              <>
                <ArrowDown aria-hidden="true" className="size-5 shrink-0 text-muted lg:hidden" />
                <ArrowRight aria-hidden="true" className="mx-1 hidden size-5 shrink-0 text-muted lg:block" />
              </>
            )}
          </li>
        ))}
      </ol>
      <Sources
        items={[
          { href: SIGNING_CODE_URL, label: t("linkSignature"), external: true },
          { href: CONTRACT_SOURCE_URL, label: t("linkContract"), external: true },
          { href: INDEXER_URL, label: t("linkIndexer"), external: true },
        ]}
      />
    </Slide>
  );
}

function Slide7() {
  const t = useTranslations("Pitch.s7");
  const figures = ["block", "final"] as const;
  return (
    <Slide n={7} title={t("title")} lead={t("lead")}>
      <dl className="mt-10 grid gap-4 sm:grid-cols-2">
        {figures.map((key, i) => (
          <Reveal key={key} delay={i * 0.1} className="surface-card rounded-4xl p-7 sm:p-9">
            <dd className="font-display text-6xl font-extrabold leading-none tracking-tight text-accent-text sm:text-7xl">
              {t(`figures.${key}.value`)}
            </dd>
            <dt className="mt-3 text-lg text-muted">{t(`figures.${key}.label`)}</dt>
          </Reveal>
        ))}
      </dl>
      <Reveal delay={0.2}>
        <p className="mt-4 text-sm text-muted">{t("source")}</p>
      </Reveal>
      <Sources items={[{ href: MONAD_DOCS_URL, label: t("link"), external: true }]} />
    </Slide>
  );
}

function Slide8() {
  const t = useTranslations("Pitch.s8");
  const rows = [
    { key: "contract", href: CONTRACT_URL },
    { key: "open", href: LICENSE_URL },
    { key: "tests", href: CONTRACT_TESTS_URL },
    { key: "running", href: "/stats", internal: true },
    { key: "ci", href: CI_URL },
  ] as const;
  return (
    <Slide n={8} title={t("title")}>
      <p className="mt-5 break-all font-mono text-sm text-muted sm:text-base">
        <span className="sr-only">{t("address")}: </span>
        {CONTRACT_ADDRESS}
      </p>
      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {rows.map((row, i) => (
          <Reveal as="li" key={row.key} delay={i * 0.07} className="surface-card flex flex-col gap-1 rounded-3xl p-5 sm:p-6">
            <span className="flex items-start gap-3 text-lg">
              <Check aria-hidden="true" className="mt-1 size-5 shrink-0 text-success-text" />
              {t(`items.${row.key}`)}
            </span>
            {"internal" in row ? (
              <Link href={row.href} className={cn(sourceClass, "ml-8")}>
                {t(`links.${row.key}`)}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : (
              <a className={cn(sourceClass, "ml-8")} href={row.href} target="_blank" rel="noopener noreferrer">
                {t(`links.${row.key}`)}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            )}
          </Reveal>
        ))}
      </ul>
    </Slide>
  );
}

function Slide9() {
  const t = useTranslations("Pitch.s9");
  const items = [
    { key: "rules", icon: <Vote aria-hidden="true" className="size-6" /> },
    { key: "feed", icon: <Eye aria-hidden="true" className="size-6" /> },
    { key: "fund", icon: <UsersRound aria-hidden="true" className="size-6" /> },
  ] as const;
  return (
    <Slide n={9} title={t("title")} lead={t("lead")}>
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <Reveal as="li" key={item.key} delay={i * 0.1} className="surface-card flex flex-col rounded-4xl p-7">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-identity-soft text-identity">{item.icon}</span>
            <p className="mt-5 text-lg">{t(`items.${item.key}`)}</p>
          </Reveal>
        ))}
      </ul>
      <Reveal delay={0.3} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-sm text-muted">{t("note")}</p>
        <Link href="/create" className={sourceClass}>
          {t("cta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Reveal>
    </Slide>
  );
}

function Slide10() {
  const t = useTranslations("Pitch.s10");
  const items = ["chats", "link", "partners", "widget"] as const;
  return (
    <Slide n={10} title={t("title")}>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ul className="flex flex-col gap-3">
          {items.map((key, i) => (
            <Point key={key} delay={i * 0.07} icon={<Rocket aria-hidden="true" className={icon} />}>
              {t(`items.${key}`)}
            </Point>
          ))}
        </ul>
        <Reveal delay={0.2} className="flex flex-col justify-center rounded-4xl border border-accent bg-surface p-7 sm:p-9">
          <p className="text-eyebrow text-accent-text">{t("metricLabel")}</p>
          <p className="text-h3 mt-3">{t("metric")}</p>
          <a className={cn(sourceClass, "mt-4")} href={WIDGET_DOC_URL} target="_blank" rel="noopener noreferrer">
            {t("widgetLink")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Reveal>
      </div>
    </Slide>
  );
}

function Slide11() {
  const t = useTranslations("Pitch.s11");
  const limits = ["visible", "passkeys"] as const;
  const next = ["recurring", "api", "mainnet"] as const;
  return (
    <Slide n={11} title={t("title")}>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-eyebrow text-muted">{t("limitsTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {limits.map((key, i) => (
              <Point key={key} delay={i * 0.08} icon={<Eye aria-hidden="true" className={cn(icon, "text-accent-text")} />}>
                {t(`limits.${key}`)}
              </Point>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-eyebrow text-muted">{t("nextTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {next.map((key, i) => (
              <Point key={key} delay={0.1 + i * 0.08} icon={<BadgeCheck aria-hidden="true" className={cn(icon, "text-identity")} />}>
                {t(`next.${key}`)}
              </Point>
            ))}
          </ul>
        </div>
      </div>
      <Sources items={[{ href: "/about", label: t("link") }]} />
    </Slide>
  );
}

const TEAM = [
  { key: "giovanny", github: "https://github.com/Eras256" },
  { key: "monserrat", github: "https://github.com/M0nsxx" },
] as const;

function Slide12() {
  const t = useTranslations("Pitch.s12");
  return (
    <Slide n={12} title={t("title")} className="bg-[radial-gradient(60rem_40rem_at_10%_90%,var(--identity-soft),transparent)]">
      <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-eyebrow text-muted">{t("teamTitle")}</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {TEAM.map((member, i) => (
              <Reveal as="li" key={member.key} delay={i * 0.1} className="surface-card rounded-4xl p-6 sm:p-7">
                <p className="text-h3">
                  {t(`members.${member.key}.name`)} <span className="text-muted">&ldquo;{t(`members.${member.key}.alias`)}&rdquo;</span>
                </p>
                <p className="mt-2 text-muted">{t(`members.${member.key}.role`)}</p>
                <a className={cn(sourceClass, "mt-3")} href={member.github} target="_blank" rel="noopener noreferrer">
                  {t("github")}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </a>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={0.15} className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/create" className={buttonVariants({ size: "lg" })}>
              {t("ctaButton")}
            </Link>
            <p className="font-display text-xl font-semibold">{t("cta")}</p>
          </Reveal>
        </div>
        <PitchRing counts={[3, 4, 2, 1]} className="mx-auto w-full max-w-[16rem]" />
      </div>
    </Slide>
  );
}

export function PitchDeck() {
  return (
    <div className="deck">
      <DeckControls total={SLIDE_COUNT} />
      <Slide1 />
      <Slide2 />
      <Slide3 />
      <Slide4 />
      <Slide5 />
      <Slide6 />
      <Slide7 />
      <Slide8 />
      <Slide9 />
      <Slide10 />
      <Slide11 />
      <Slide12 />
    </div>
  );
}
