import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BrandingProvider } from "@/components/layout/brand";
import { brandPalette, brandTitle } from "@/lib/branding";
import { getBranding } from "@/lib/branding-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: brandTitle(branding),
    description: "Budget, spending, collections, and financial reports for barangays.",
    icons: branding.logoUrl ? { icon: branding.logoUrl } : undefined,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding();
  return (
    <html lang="en" style={brandPalette(branding.accentColor) as CSSProperties}>
      <body>
        <BrandingProvider value={branding}>{children}</BrandingProvider>
      </body>
    </html>
  );
}
