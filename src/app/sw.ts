/// <reference lib="webworker" />
/**
 * The service worker. Built by Serwist (src/app/serwist/[path]/route.ts) and served at /sw.js.
 *
 * What it caches, and what it never does:
 * - The app shell (JS, CSS, fonts, icons) is precached at install time.
 * - `/api/*` (relay, data, vault, stats) is never cached: always the network.
 * - `/embed/*` and `/branding-votalo` are always the network too, so the widget and the brand pack behave
 *   exactly as they do without a worker.
 * - Pages are network first; when the network is down, the locale's offline page answers.
 * - A new version waits. It takes over only when the person presses "Actualizar" (see src/components/pwa),
 *   so nobody is reloaded in the middle of a vote.
 */
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist, type PrecacheEntry, type RuntimeCaching, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isEmbedOrBrand = (pathname: string) =>
  /^\/(en\/|es\/)?embed(\/|$)/.test(pathname) || pathname === "/branding-votalo" || pathname.startsWith("/branding-votalo/");
const isEnglish = (pathname: string) => pathname === "/en" || pathname.startsWith("/en/");

const runtimeCaching: RuntimeCaching[] = [
  { matcher: ({ url }) => url.pathname.startsWith("/api/") || isEmbedOrBrand(url.pathname), handler: new NetworkOnly() },
  { matcher: ({ request }) => request.mode === "navigate", handler: new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 4 }) },
  {
    matcher: ({ request }) => ["script", "style", "font", "image"].includes(request.destination),
    handler: new CacheFirst({ cacheName: "static" }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Waiting is deliberate: see the header comment.
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: false,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/en/offline",
        matcher: ({ request }) => request.destination === "document" && isEnglish(new URL(request.url).pathname) && !isEmbedOrBrand(new URL(request.url).pathname),
      },
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document" && !isEnglish(new URL(request.url).pathname) && !isEmbedOrBrand(new URL(request.url).pathname),
      },
    ],
  },
});

serwist.addEventListeners();
