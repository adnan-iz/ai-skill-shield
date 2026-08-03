"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import ThemeToggle from "@/components/ui/theme-toggle"

const navItems = [
  { href: "/", label: "Dashboard", icon: "grid_view" },
  { href: "/explore", label: "Explore", icon: "travel_explore" },
  { href: "/compare", label: "Compare", icon: "compare_arrows" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/rules", label: "Rules", icon: "policy" },
  { href: "/docs/api", label: "API", icon: "api" },
]

export function SideNavBar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-56 flex-col gap-2 border-r border-stitch-sidebar-hover bg-stitch-sidebar px-3 py-4 md:flex">
      <Link
        href="/"
        aria-label="AI Skill Shield home"
        className="mb-4 flex h-11 items-center gap-3 rounded-xl px-2 text-white"
      >
        <Image src="/skill-shield-logo.svg" alt="" width={36} height={36} />
        <span>
          <span className="block text-sm font-bold">AI Skill Shield</span>
          <span className="block text-[10px] text-slate-400">by Support Engine</span>
        </span>
      </Link>
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const classes = `flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
          isActive
            ? "bg-shield-500/20 text-shield-400"
            : "text-on-surface-secondary hover:bg-stitch-sidebar-hover hover:text-on-surface"
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
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
      <div className="mt-auto mb-2 flex items-center gap-3 px-3 text-sm text-slate-400">
        <ThemeToggle />
        <span>Theme</span>
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
        <Image src="/skill-shield-logo.svg" alt="" width={28} height={28} />
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
