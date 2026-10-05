import { useTranslations } from "next-intl";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Reveal } from "../ui/reveal";

const KEYS = ["secret", "devices", "unsupported", "twice", "invite", "where", "cost", "lost"] as const;

export function Faq() {
  const t = useTranslations("Faq");

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <p className="text-eyebrow text-accent-text">{t("eyebrow")}</p>
        <h2 className="text-h2 mt-3">{t("title")}</h2>
      </Reveal>
      <Reveal delay={0.08} className="mt-10">
        <Accordion type="single" collapsible className="border-t border-line">
          {KEYS.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`items.${key}.q`)}</AccordionTrigger>
              <AccordionContent>{t(`items.${key}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
