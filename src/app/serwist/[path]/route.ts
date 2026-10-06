// Serves the service worker built from src/app/sw.ts. next.config rewrites /sw.js here so the worker's scope is "/".
import { createSerwistRoute } from "@serwist/turbopack";
import { prefixedLocale } from "@/i18n/routing";

// Changes with every deploy, so an updated offline page is fetched again.
const REVISION = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  // The brand pack is served from the network at all times (see sw.ts), so it is not part of the install.
  globIgnores: ["**/branding-votalo/**"],
  // Native esbuild on every machine. The WASM build rejects the Windows working directory during the build.
  useNativeEsbuild: true,
  // The offline pages must be in the cache before anyone is offline, so they are precached with the shell.
  additionalPrecacheEntries: [
    { url: "/offline", revision: REVISION },
    { url: `/${prefixedLocale}/offline`, revision: REVISION },
  ],
});
