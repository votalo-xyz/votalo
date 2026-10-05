import { useTranslations } from "next-intl";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

/** Every question, in reading order. The landing shows only the first few of `FAQ_SUMMARY`. */
export const FAQ_KEYS = [
  "secret",
  "devices",
  "unsupported",
  "passkey",
  "twice",
  "invite",
  "final",
  "create",
  "where",
  "cost",
  "lost",
  "report",
] as const;

/** The questions a first-time visitor most needs answered honestly. */
export const FAQ_SUMMARY = ["secret", "devices", "twice", "cost"] as const;

export type FaqKey = (typeof FAQ_KEYS)[number];

export function FaqList({ keys }: { keys: readonly FaqKey[] }) {
  const t = useTranslations("Faq");
  return (
    <Accordion type="single" collapsible className="border-t border-line">
      {keys.map((key) => (
        <AccordionItem key={key} value={key}>
          <AccordionTrigger>{t(`items.${key}.q`)}</AccordionTrigger>
          <AccordionContent>{t(`items.${key}.a`)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
