import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { frameHeaders } from "./src/security/frame-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The share-card routes read the brand font from disk at request time (the proposal card is not prerendered).
  outputFileTracingIncludes: {
    "/og/[file]": ["./src/seo/fonts/*"],
    "/og/proposal/[locale]/[file]": ["./src/seo/fonts/*"],
  },
  experimental: {
    // The root layout sits under the dynamic [locale] segment, so Next cannot server-render a 404 from a
    // layout for unknown addresses. global-not-found.tsx is a complete, prerendered page with a real 404 status.
    globalNotFound: true,
  },
  async headers() {
    // Only /embed/* may be framed by other sites; see src/security/frame-headers.ts.
    return frameHeaders();
  },
  async redirects() {
    // The old production host keeps working for shared links: permanent (308) redirect to the final
    // domain, same path and query. Preview deployments use their own host names and are not affected.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "votalo-six.vercel.app" }],
        destination: "https://www.votalo.xyz/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
