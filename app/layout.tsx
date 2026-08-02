import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SideNavBar, TopNavBar, BottomNavBar } from "@/components/layout/nav";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "SkillShield",
  title: {
    default: "SkillShield - Validate Agent Skills Before You Run Them",
    template: "%s - SkillShield",
  },
  description:
    "Pre-flight validation, security scanning, and professional reports for the open Agent Skills ecosystem.",
  keywords: [
    "AI security",
    "agent skills",
    "skill validation",
    "MCP security",
    "Claude skills",
    "AI agent security",
    "DevSecOps",
  ],
  authors: [{ name: "Support Engine", url: "https://suppeng.com" }],
  creator: "Support Engine",
  publisher: "Support Engine",
  category: "Security",
  verification: {
    google: "aaC_UzhNYtDw9wL2SOHe4JekCBK6kGAzlPHqhAxGoqQ",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "SkillShield - Validate Agent Skills Before You Run Them",
    description:
      "Pre-flight validation, security scanning, and professional reports for AI agent skills.",
    type: "website",
    url: "/",
    siteName: "SkillShield",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillShield - Validate Agent Skills Before You Run Them",
    description:
      "Pre-flight validation, security scanning, and professional reports for AI agent skills.",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Support Engine",
      url: "https://suppeng.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "SkillShield",
      description: "Security validation for AI agent skills before installation.",
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark', t ? t==='dark' : true);})();`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-surface text-on-surface">
        <SideNavBar />
        <TopNavBar />
        <main className="flex min-h-[calc(100dvh-3.5rem)] md:min-h-dvh flex-col pb-20 md:ml-16 md:pb-0">
          <div className="flex-1">
            <ToastProvider>{children}</ToastProvider>
          </div>
          <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-6 text-center text-sm text-on-surface-secondary">
            <span>
              Made by{" "}
              <a href="https://suppeng.com" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface">
                Support Engine
              </a>{" "}
              with ❤️ from Bangladesh.
            </span>
            <Link href="/rules" className="hover:text-on-surface">Security rules</Link>
            <Link href="/docs/api" className="hover:text-on-surface">API docs</Link>
            <a href="/llms.txt" className="hover:text-on-surface">llms.txt</a>
          </footer>
        </main>
        <BottomNavBar />
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
