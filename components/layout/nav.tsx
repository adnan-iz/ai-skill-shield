"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import ThemeToggle from "@/components/ui/theme-toggle"

const navItems = [
  { href: "/", label: "Dashboard", icon: "grid_view" },
  { href: "/compare", label: "Compare", icon: "compare_arrows" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/rules", label: "Rules", icon: "policy" },
  { href: "/docs/api", label: "API", icon: "api" },
]

export function SideNavBar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-16 flex-col items-center gap-2 border-r border-stitch-sidebar-hover bg-stitch-sidebar py-4 md:flex">
      <Link
        href="/"
        aria-label="SkillShield home"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-shield-500 text-white"
      >
        <span className="material-symbols-outlined text-xl">shield</span>
      </Link>
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const classes = `flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
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
            className={classes}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </Link>
        )
      })}
      <div className="mt-auto mb-2 flex items-center justify-center">
        <ThemeToggle />
      </div>
    </aside>
  )
}

export function TopNavBar() {
  return (
    <header className="md:hidden sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-outline bg-surface-container/80 px-4 backdrop-blur-md md:ml-16 md:px-6">
      <Link
        href="/"
        aria-label="SkillShield home"
        className="flex items-center gap-2 text-sm font-semibold text-on-surface md:hidden"
      >
        <span className="material-symbols-outlined flex h-7 w-7 items-center justify-center rounded-lg bg-shield-600 text-base text-white">shield</span>
        <span>SkillShield</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
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
      <Link
        href="/docs/api"
        className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
          pathname === "/docs/api" ? "text-shield-500" : "text-on-surface-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-lg">api</span>
        <span className="text-[10px] font-medium">API</span>
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
