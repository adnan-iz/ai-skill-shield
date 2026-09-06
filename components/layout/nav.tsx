"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import ThemeToggle from "@/components/ui/theme-toggle"

const navItems = [
  { href: "/", label: "Dashboard", icon: "grid_view" },
  { href: "/ai-skill-checker", label: "Skill Checker", icon: "verified_user" },
  { href: "/explore", label: "Explore", icon: "travel_explore" },
  { href: "/compare", label: "Compare", icon: "compare_arrows" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/rules", label: "Rules", icon: "policy" },
  { href: "/docs/api", label: "API", icon: "api" },
]

function BrandMark({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" role="img">
      <rect width="64" height="64" rx="15" fill="#0B1220" />
      <path d="M32 7 12 16.2v16.1C12 44.8 20.2 54.8 32 59c11.8-4.2 20-14.2 20-26.7V16.2L32 7Z" fill="#22C55E" />
      <path d="M32 13.5 18 20v12.3c0 9.1 5.4 16.7 14 20.3 8.6-3.6 14-11.2 14-20.3V20l-14-6.5Z" fill="#0B1220" />
      <path d="M32 31v-7.5M28.6 34.2l-6.5 4.3M35.4 34.2l6.5 4.3" fill="none" stroke="#A7F3D0" strokeWidth="3.2" strokeLinecap="round" />
      <path d="m32 26.5 5.5 5.5-5.5 5.5-5.5-5.5 5.5-5.5Z" fill="#A7F3D0" />
      <circle cx="32" cy="20.2" r="3.8" fill="#A7F3D0" />
      <circle cx="18.8" cy="40.5" r="3.8" fill="#A7F3D0" />
      <circle cx="45.2" cy="40.5" r="3.8" fill="#A7F3D0" />
    </svg>
  )
}

export function SideNavBar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-56 flex-col gap-2 border-r border-outline-variant/60 bg-surface-container-lowest/95 backdrop-blur-xl px-3 py-4 md:flex">
      <Link
        href="/"
        aria-label="AI Skill Shield home"
        className="mb-4 flex h-12 items-center gap-3 rounded-lg border border-outline-variant/50 bg-surface-container/60 px-2.5 text-on-surface transition-colors hover:border-primary/40"
      >
        <BrandMark size={32} />
        <div>
          <span className="block text-xs font-bold tracking-wider text-on-surface">AI SKILL SHIELD</span>
          <span className="block text-[10px] font-mono text-primary flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
            DEFENSE GATEWAY
          </span>
        </div>
      </Link>
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const classes = `flex h-9 w-full items-center gap-3 rounded-md px-3 text-xs font-medium tracking-wide transition-all ${
            isActive
              ? "border border-primary/40 bg-primary/10 text-primary font-semibold shadow-[0_0_12px_-3px_rgba(75,226,119,0.3)]"
              : "text-on-surface-secondary hover:bg-surface-container-high/60 hover:text-on-surface"
          }`
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={classes}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-outline-variant/30 pt-3">
        <div className="flex items-center justify-between px-2 text-[11px] font-mono text-on-surface-secondary/70">
          <span>STATUS: ACTIVE</span>
          <span className="text-primary font-semibold">v2.0.0</span>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-surface-container/40 p-1.5 text-xs text-on-surface-secondary">
          <ThemeToggle />
          <span>Toggle Theme</span>
        </div>
      </div>
    </aside>
  )
}

export function TopNavBar() {
  return (
    <header className="md:hidden sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-outline bg-surface-container/80 px-4 backdrop-blur-md md:ml-16 md:px-6">
      <Link
        href="/"
        aria-label="AI Skill Shield home"
        className="flex items-center gap-2 text-sm font-semibold text-on-surface md:hidden"
      >
        <BrandMark size={28} />
        <span>AI Skill Shield</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/docs/api" className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface-secondary hover:bg-surface-secondary hover:text-on-surface">
          API
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}

export function BottomNavBar() {
  const pathname = usePathname()
  const isReport = pathname.startsWith("/validate/")

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-outline bg-surface-container md:hidden">
      <Link
        href="/"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          pathname === "/" ? "text-shield-500" : "text-on-surface-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-lg">grid_view</span>
        <span className="text-[10px] font-medium">Dashboard</span>
      </Link>
      <Link
        href="/explore"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          pathname === "/explore" ? "text-shield-500" : "text-on-surface-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-lg">travel_explore</span>
        <span className="text-[10px] font-medium">Explore</span>
      </Link>
      <Link
        href="/compare"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          pathname === "/compare" ? "text-shield-500" : "text-on-surface-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-lg">compare_arrows</span>
        <span className="text-[10px] font-medium">Compare</span>
      </Link>
      <Link
        href="/history"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          pathname === "/history" ? "text-shield-500" : "text-on-surface-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-lg">history</span>
        <span className="text-[10px] font-medium">History</span>
      </Link>
      <Link
        href="/rules"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          pathname === "/rules" ? "text-shield-500" : "text-on-surface-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-lg">policy</span>
        <span className="text-[10px] font-medium">Rules</span>
      </Link>
      {isReport && (
        <div className="flex flex-col items-center gap-0.5 px-3 py-1 text-shield-500">
          <span className="material-symbols-outlined text-lg">description</span>
          <span className="text-[10px] font-medium">Report</span>
        </div>
      )}
    </nav>
  )
}
