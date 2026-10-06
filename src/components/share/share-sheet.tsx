"use client";

import { Check, Code, Copy, MessageCircle, Send, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/cn";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../ui/sheet";

const noopSubscribe = () => () => {};
// Links and embeds always use the canonical site, so a shared link never points at a retired host.
// Falls back to the current origin when NEXT_PUBLIC_SITE_URL is not set (local development).
const origin = () => (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");

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
  /** Path of an embeddable widget for this item, e.g. "/embed/p/0x…". Adds an "Embed" option that copies an iframe. */
  embedPath?: string;
};

/** Share sheet: WhatsApp with prefilled text, Telegram, copy link, QR, and the system share sheet when there is one. */
export function ShareSheet({ path, text, heading, open, onOpenChange, trigger, embedPath }: Props) {
  const t = useTranslations("Share");
  const c = useTranslations("Common");
  const locale = useLocale() as Locale;
  const base = useSyncExternalStore(noopSubscribe, origin, () => "");
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const [pathname, query = ""] = path.split("?");
  const url = base ? `${base}${getPathname({ href: pathname, locale })}${query ? `?${query}` : ""}` : "";
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  // The snippet others paste into their pages. The title is for screen readers; frames need one.
  const embedUrl = embedPath && base ? `${base}${getPathname({ href: embedPath, locale })}` : "";
  const embedCode = `<iframe src="${embedUrl}" title="Votalo" width="100%" height="420" style="border:0;border-radius:16px" loading="lazy"></iframe>`;

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      window.setTimeout(() => setEmbedCopied(false), 2200);
    } catch {
      // Clipboard blocked: nothing else to do here.
    }
  }

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
          {embedPath && (
            <div>
              <Button variant="secondary" onClick={copyEmbed} disabled={!embedUrl} className="w-full justify-start">
                {embedCopied ? <Check aria-hidden="true" className="size-5 text-success-text" /> : <Code aria-hidden="true" className="size-5" />}
                {embedCopied ? t("embedCopied") : t("embed")}
              </Button>
              <p className="mt-1.5 px-1 text-xs text-muted">{t("embedHint")}</p>
              <span role="status" className="sr-only">
                {embedCopied ? t("embedCopied") : ""}
              </span>
            </div>
          )}
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
              <p className="mt-1 line-clamp-3 break-all font-mono text-xs leading-snug text-muted">{url}</p>
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
