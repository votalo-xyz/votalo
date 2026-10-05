import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // The root layout sits under the dynamic [locale] segment, so Next cannot server-render a 404 from a
    // layout for unknown addresses. global-not-found.tsx is a complete, prerendered page with a real 404 status.
    globalNotFound: true,
  },
};

export default withNextIntl(nextConfig);
