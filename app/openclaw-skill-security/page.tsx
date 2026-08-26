import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'OpenClaw Skill Security Scanner',
  description: 'Scan OpenClaw skills before installation. Review skill instructions, shell commands, secrets, permissions, and GitHub repository risks.',
  alternates: { canonical: '/openclaw-skill-security' },
  openGraph: {
    title: 'OpenClaw Skill Security Scanner | AI Skill Shield',
    description: 'Review OpenClaw skills for security and supply-chain risks before installation.',
    url: '/openclaw-skill-security',
  },
}

export default function OpenClawSkillSecurityPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <section className="glass-card p-8 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-shield-700">OpenClaw skills</p>
        <h1 className="mt-3 text-4xl font-bold text-on-surface sm:text-5xl">OpenClaw skill security scanner</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-on-surface-secondary">
          Check an OpenClaw skill before installation. AI Skill Shield helps you inspect SKILL.md instructions, supporting files, and repository signals that can affect your agent and its environment.
        </p>
        <Link href="/#upload" className="mt-8 inline-flex rounded-lg bg-shield-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-shield-700">
          Scan an OpenClaw skill
        </Link>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Before you install</h2><p className="mt-3 leading-7 text-on-surface-secondary">Confirm what the skill asks the agent to read, write, execute, download, or send outside the environment.</p></article>
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Review the entire package</h2><p className="mt-3 leading-7 text-on-surface-secondary">A safe-looking skill file is not enough when scripts, dependencies, workflows, and configuration can alter its behavior.</p></article>
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Understand permissions</h2><p className="mt-3 leading-7 text-on-surface-secondary">Compare requested access with the skill’s stated job and flag permissions that are unnecessary or unusually broad.</p></article>
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Keep evidence</h2><p className="mt-3 leading-7 text-on-surface-secondary">Use the report to document why a skill was approved, restricted, or rejected before it reaches production workflows.</p></article>
      </section>

      <section className="glass-card mt-8 p-8">
        <h2 className="text-2xl font-bold text-on-surface">Validate an OpenClaw skill before installation</h2>
        <p className="mt-4 leading-7 text-on-surface-secondary">Paste the GitHub repository URL, upload the skill package, or provide the SKILL.md content. Review the findings and installation recommendation before giving the skill access to a real environment.</p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-shield-700">
          <Link href="/ai-skill-checker" className="hover:text-shield-800">Use the free AI skill checker →</Link>
          <Link href="/claude-code-skill-security" className="hover:text-shield-800">Review Claude Code skills →</Link>
        </div>
      </section>
    </div>
  )
}
