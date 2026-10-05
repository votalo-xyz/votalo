import { useTranslations } from "next-intl";
import { Reveal } from "../ui/reveal";
import { FAQ_SUMMARY, FaqList } from "./faq-list";
import { MoreLink } from "./more-link";

/** Landing summary: the questions that matter most, then a link to all of them. */
export function Faq() {
  const t = useTranslations("Faq");
  const more = useTranslations("Landing.more");

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <p className="text-eyebrow text-accent-text">{t("eyebrow")}</p>
        <h2 className="text-h2 mt-3">{t("title")}</h2>
      </Reveal>
      <Reveal delay={0.08} className="mt-10">
        <FaqList keys={FAQ_SUMMARY} />
        <MoreLink href="/faq">{more("faq")}</MoreLink>
      </Reveal>
    </section>
  );
}
