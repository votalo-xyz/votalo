import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "800"], display: "swap" });
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "404 · Votalo",
  robots: { index: false },
};

// Applies the visitor's saved theme before first paint. Dark is the default, as everywhere else on the site.
const THEME = `try{var t=localStorage.getItem("theme");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){}`;

const linkClass =
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 font-semibold transition-transform active:scale-[0.97]";

/**
 * Shown for any address no page claims, in either language. It is rendered without the app's layout, so it
 * cannot know the language: it says the same thing in Spanish and English and links to both home pages.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`dark ${bricolage.variable} ${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body>
        <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-6 px-6 py-16">
          <Link href="/" aria-label="Votalo">
            <Logo />
          </Link>
          <p className="font-display text-8xl font-extrabold leading-none tracking-tighter text-fg/15" aria-hidden="true">
            404
          </p>
          <section lang="es" className="flex flex-col gap-2">
            <h1 className="text-h2">No encontramos esta página</h1>
            <p className="text-lead text-muted">Puede que el enlace esté incompleto o que la página ya no exista.</p>
          </section>
          <section lang="en" className="flex flex-col gap-2">
            <h2 className="text-h3">We couldn&apos;t find this page</h2>
            <p className="text-muted">The link may be incomplete, or the page may no longer exist.</p>
          </section>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/" className={`${linkClass} bg-accent text-accent-fg shadow-card`}>
              Go to the home page
            </Link>
            <Link href="/es" className={`${linkClass} border border-line-strong bg-surface text-fg`}>
              Ir al inicio
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
