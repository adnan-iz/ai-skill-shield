import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SideNavBar, TopNavBar, BottomNavBar } from "@/components/layout/nav";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SOCIAL_IMAGE } from "@/lib/site";

const title = "AI Skill Shield - Validate Agent Skills Before You Run Them";
const description =
  "Free security scanner for AI agent skills. Upload SKILL.md files, audit GitHub repos, and get instant trust scores, risk reports, and install recommendations.";

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
  applicationName: "AI Skill Shield",
  title: {
    default: title,
    template: "%s - AI Skill Shield",
  },
  description,
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
    title,
    description,
    type: "website",
    url: "/",
    siteName: "AI Skill Shield",
    locale: "en_US",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SOCIAL_IMAGE],
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
      name: "AI Skill Shield",
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
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <SideNavBar />
        <TopNavBar />
        <main id="main-content" tabIndex={-1} className="flex min-h-[calc(100dvh-3.5rem)] flex-col pb-20 md:ml-56 md:min-h-dvh md:pb-0">
          <div className="flex-1">
            <ToastProvider>{children}</ToastProvider>
          </div>
          <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-6 text-center text-sm text-on-surface-secondary">
            <a
              href="https://suppeng.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support Engine"
              className="rounded-lg bg-stitch-sidebar px-2 py-1 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-500"
            >
              <img src="/support-engine-logo.png" alt="Support Engine" className="h-auto w-32" />
            </a>
            <span>
              Made by{" "}
              <a href="https://suppeng.com" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface">
                Support Engine
              </a>{" "}
              with {"\u2764\uFE0F"} from Bangladesh.
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
