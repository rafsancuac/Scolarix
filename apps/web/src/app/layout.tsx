import type { Metadata, Viewport } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import Script from "next/script";

import "./globals.css";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { DemoModeRibbon } from "@/components/layout/demo-mode-ribbon";
import { getAnnouncement } from "@/lib/repository";
import { BRAND } from "@/lib/brand";
import { defaultMetadata, defaultViewport, organizationJsonLd } from "@/lib/metadata";

/**
 * Fonts (§7.2). Inter carries the Latin scale; Hind Siliguri is loaded now so
 * Bangla copy renders correctly the moment FEATURE_I18N_BN is turned on (D16)
 * — it is not referenced by any English-only template in the meantime.
 * `display: swap` keeps LCP inside the §18.1 budget (≤2.5 s).
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["latin", "bengali"],
  variable: "--font-hind",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = defaultMetadata;
export const viewport: Viewport = defaultViewport;

/**
 * Applies the stored theme before first paint so dark mode never flashes into
 * light (spec §10.2: dark default, light available, no layout shift).
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const announcement = getAnnouncement();

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{THEME_SCRIPT}</Script>
        <script
          type="application/ld+json"
          // Content is generated from our own constants — no user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      <body
        className={`${inter.variable} ${hindSiliguri.variable} min-h-dvh bg-surface-canvas font-sans text-primary antialiased`}
      >
        {announcement ? (
          <AnnouncementBar
            text={announcement.text}
            href={announcement.href}
            ctaLabel={announcement.ctaLabel}
            announcementId={announcement.id}
          />
        ) : null}

        <Navbar brandName={BRAND.name} />

        <main id="main" className="flex-1">
          {children}
        </main>

        <DemoModeRibbon />
        <Footer />
      </body>
    </html>
  );
}
