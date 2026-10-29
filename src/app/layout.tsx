import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { BrandingProvider } from "@/components/layout/brand";
import { ConfirmProvider } from "@/components/layout/confirm-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
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
  const [branding, cookieStore] = await Promise.all([getBranding(), cookies()]);
  const theme = cookieStore.get("odc_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : undefined}
      data-theme={theme}
      style={brandPalette(branding.accentColor) as CSSProperties}
    >
      <body>
        <ThemeProvider initialTheme={theme}>
          <BrandingProvider value={branding}>
            <ConfirmProvider>{children}</ConfirmProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
