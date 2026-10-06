import type { Metadata } from "next";
import { CredentialsSection } from "@/components/landing/credentials-section";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { PrivacySection } from "@/components/landing/privacy-section";
import { ProofSection } from "@/components/landing/proof-section";
import { Steps } from "@/components/landing/steps";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata({ locale, path: "/" });
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveLocale(params);

  return (
    <>
      <Hero />
      <Steps />
      <CredentialsSection />
      <PrivacySection />
      <ProofSection />
      <Faq />
    </>
  );
}
