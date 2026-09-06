import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SideNavBar, TopNavBar, BottomNavBar } from "@/components/layout/nav";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SOCIAL_IMAGE } from "@/lib/site";

const title = "AI Skill Security Scanner & SKILL.md Validator | AI Skill Shield";
const description =
  "Free AI skill security scanner, validator, and checker. Scan SKILL.md files and GitHub repositories for prompt injection, exposed secrets, dangerous commands, and install risks before you run them.";

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
  keywords: [
    "AI skill checker",
    "agent skill validator",
    "SKILL.md validator",
    "AI skill security scanner",
    "SKILL.md security scanner",
    "AI agent skill security",
    "GitHub skill scanner",
  ],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
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
      <body className="min-h-dvh bg-surface text-on-surface relative">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-tactical-grid opacity-30 dark:opacity-25"></div>
          <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(circle_at_50%_15%,rgba(11,19,38,0)_0%,rgba(11,19,38,0.92)_80%)]"></div>
          <div className="absolute inset-0 block dark:hidden bg-[radial-gradient(circle_at_50%_15%,rgba(248,250,252,0)_0%,rgba(226,232,240,0.5)_85%)]"></div>
        </div>
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <SideNavBar />
        <TopNavBar />
        <main id="main-content" tabIndex={-1} className="relative z-10 flex min-h-[calc(100dvh-3.5rem)] flex-col pb-20 md:ml-56 md:min-h-dvh md:pb-0">
          <div className="flex-1">
            <ToastProvider>{children}</ToastProvider>
          </div>
          <footer className="border-t border-outline-variant/40 bg-surface-container-lowest/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 text-sm text-on-surface-secondary">
            <div className="flex items-center gap-3">
              <a
                href="https://suppeng.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Support Engine"
                className="rounded-lg bg-surface-container-high px-2 py-1 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-500"
              >
                <img src="/support-engine-logo.png" alt="Support Engine" className="h-auto w-28" />
              </a>
              <span className="text-xs font-mono opacity-80">
                Engine: <span className="text-primary font-semibold">v2.0.0-dev</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <Link href="/rules" className="hover:text-primary transition-colors">Security Rules</Link>
              <Link href="/docs/api" className="hover:text-primary transition-colors">API Docs</Link>
              <a
                href="https://github.com/adnan-iz/ai-skill-shield"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <a href="/llms.txt" className="hover:text-primary transition-colors">llms.txt</a>
            </div>
          </footer>
        </main>
        <BottomNavBar />
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}

