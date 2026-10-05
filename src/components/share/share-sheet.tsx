"use client";

import { Check, Copy, MessageCircle, Send, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../ui/sheet";

const noopSubscribe = () => () => {};
const origin = () => window.location.origin;

type Props = {
  /** Path inside the app, without language prefix, e.g. "/g/0x…/p/0x…". Query string allowed. */
  path: string;
  /** Message that goes in front of the link in WhatsApp and Telegram. */
  text: string;
  heading?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trigger button. Omit when the sheet is controlled from outside. */
  trigger?: ReactNode;
};

/** Share sheet: WhatsApp with prefilled text, Telegram, copy link, QR, and the system share sheet when there is one. */
export function ShareSheet({ path, text, heading, open, onOpenChange, trigger }: Props) {
  const t = useTranslations("Share");
  const c = useTranslations("Common");
  const locale = useLocale() as Locale;
  const base = useSyncExternalStore(noopSubscribe, origin, () => "");
  const [copied, setCopied] = useState(false);

  const [pathname, query = ""] = path.split("?");
  const url = base ? `${base}${getPathname({ href: pathname, locale })}${query ? `?${query}` : ""}` : "";
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked. The link is still on screen in the QR code.
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const rowClass = cn(buttonVariants({ variant: "secondary", size: "md" }), "w-full justify-start");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="bottom">
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <SheetTitle className="text-h3">{heading ?? t("title")}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label={c("close")}>
              <X aria-hidden="true" className="size-5" />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription className="px-5 text-muted">{t("description")}</SheetDescription>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-6 pt-5">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={rowClass}>
            <MessageCircle aria-hidden="true" className="size-5 text-success-text" />
            {t("whatsapp")}
          </a>
          <a href={telegram} target="_blank" rel="noopener noreferrer" className={rowClass}>
            <Send aria-hidden="true" className="size-5 text-identity" />
            {t("telegram")}
          </a>
          <Button variant="secondary" onClick={copy} className="w-full justify-start">
            {copied ? <Check aria-hidden="true" className="size-5 text-success-text" /> : <Copy aria-hidden="true" className="size-5" />}
            {copied ? c("copied") : c("copy")}
          </Button>
          <span role="status" className="sr-only">
            {copied ? c("copied") : ""}
          </span>
          {canNativeShare && (
            <Button
              variant="secondary"
              onClick={() => navigator.share({ title: "Votalo", text, url }).catch(() => {})}
              className="w-full justify-start"
            >
              <Share2 aria-hidden="true" className="size-5" />
              {t("more")}
            </Button>
          )}

          <div className="mt-2 flex items-center gap-4 rounded-3xl border border-line bg-surface-2 p-4">
            <div className="shrink-0 rounded-2xl bg-white p-2.5">
              {url ? (
                <QRCodeSVG value={url} size={116} level="M" bgColor="#ffffff" fgColor="#16131c" title={t("qr")} />
              ) : (
                <div className="size-[116px]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("link")}</p>
              <p className="mt-1 break-all font-mono text-xs leading-snug text-muted">{url}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Default trigger: a secondary pill with the share icon. */
export function ShareButton({ className }: { className?: string }) {
  const t = useTranslations("Share");
  return (
    <Button variant="secondary" size="sm" className={className}>
      <Share2 aria-hidden="true" className="size-4" />
      {t("button")}
    </Button>
  );
}
