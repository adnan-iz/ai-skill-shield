"use client"

export default function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-secondary transition-colors"
    >
      <span className="material-symbols-outlined text-lg">contrast</span>
    </button>
  )
}
