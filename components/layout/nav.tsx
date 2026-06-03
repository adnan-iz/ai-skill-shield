"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import ThemeToggle from "@/components/ui/theme-toggle"

const navItems = [
  { href: "/", label: "Dashboard", icon: "grid_view" },
  { href: "/compare", label: "Compare", icon: "compare_arrows" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/rules", label: "Rules", icon: "policy" },
  { href: "/api/docs", label: "API", icon: "api", external: true },
]

export function SideNavBar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-16 flex-col items-center gap-2 border-r border-stitch-sidebar-hover bg-stitch-sidebar py-4 md:flex">
      <Link
        href="/"
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
        return item.external ? (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.label}
            className={classes}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </a>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={classes}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </Link>
        )
      })}
    </aside>
  )
}

export function TopNavBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-outline bg-surface-container/80 px-4 backdrop-blur-md md:ml-16 md:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-base font-semibold text-on-surface md:hidden"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-shield-500/25 bg-black/50 p-0.5 shadow-[0_0_18px_rgba(34,197,94,0.16)]">
          <Image
            src="/support-engine-logo.png"
            alt="Support Engine"
            width={900}
            height={500}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <span>Support Engine</span>
      </Link>
      <div className="relative ml-auto hidden max-w-xs flex-1 sm:block md:max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-secondary">
          search
        </span>
        <input
          type="search"
          placeholder="Search skills..."
          readOnly
          aria-label="Search skills"
          className="w-full rounded-lg border border-outline bg-surface py-1.5 pl-9 pr-3 text-sm text-on-surface placeholder-on-surface-secondary outline-none focus:border-shield-500 focus:ring-1 focus:ring-shield-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button aria-label="Notifications" className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-secondary transition-colors">
          <span className="material-symbols-outlined text-lg">notifications</span>
        </button>
        <div aria-label="User menu" className="flex h-7 w-7 items-center justify-center rounded-full bg-shield-500 text-[10px] font-bold text-white">
          AS
        </div>
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
      <a
        href="/api/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 px-3 py-1 text-on-surface-secondary"
      >
        <span className="material-symbols-outlined text-lg">api</span>
        <span className="text-[10px] font-medium">API</span>
      </a>
      {isReport && (
        <div className="flex flex-col items-center gap-0.5 px-3 py-1 text-shield-500">
          <span className="material-symbols-outlined text-lg">description</span>
          <span className="text-[10px] font-medium">Report</span>
        </div>
      )}
    </nav>
  )
}
