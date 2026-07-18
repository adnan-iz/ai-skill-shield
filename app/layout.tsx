import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SideNavBar, TopNavBar, BottomNavBar } from "@/components/layout/nav";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
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
  authors: [{ name: "SkillShield" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SkillShield - Validate Agent Skills Before You Run Them",
    description:
      "Pre-flight validation, security scanning, and professional reports for AI agent skills.",
    type: "website",
    url: appUrl,
  },
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
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0..200&display=swap"
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
          <footer className="py-6 text-center text-sm text-on-surface-secondary">
            Made by Support Engine with ❤️ from Bangladesh.
          </footer>
        </main>
        <BottomNavBar />
        <Analytics />
      </body>
    </html>
  );
}
