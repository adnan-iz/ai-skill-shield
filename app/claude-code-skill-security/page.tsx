import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Claude Code Skill Security',
  description: 'Review Claude Code skills before installation. Scan SKILL.md files and GitHub repositories for risky instructions, commands, secrets, and permissions.',
  alternates: { canonical: '/claude-code-skill-security' },
  openGraph: {
    title: 'Claude Code Skill Security | AI Skill Shield',
    description: 'A practical workflow for reviewing third-party Claude Code skills before installation.',
    url: '/claude-code-skill-security',
  },
}

export default function ClaudeCodeSkillSecurityPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <section className="glass-card p-8 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-shield-700">Claude Code skills</p>
        <h1 className="mt-3 text-4xl font-bold text-on-surface sm:text-5xl">Claude Code skill security</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-on-surface-secondary">
          Third-party Claude Code skills can influence agent behavior and may include supporting scripts or external integrations. Review the full skill package before installing it in a trusted workspace.
        </p>
        <Link href="/#upload" className="mt-8 inline-flex rounded-lg bg-shield-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-shield-700">
          Scan a Claude Code skill
        </Link>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Inspect the instructions</h2><p className="mt-3 leading-7 text-on-surface-secondary">Check whether the skill’s stated purpose matches its instructions and whether it tries to manipulate the agent’s priorities.</p></article>
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Trace execution paths</h2><p className="mt-3 leading-7 text-on-surface-secondary">Review scripts, package installs, download steps, and commands that could change the local environment.</p></article>
        <article className="glass-card p-7"><h2 className="text-xl font-bold text-on-surface">Limit trust by default</h2><p className="mt-3 leading-7 text-on-surface-secondary">Do not grant credentials or broad permissions until you have reviewed evidence and understand the consequences.</p></article>
      </section>

      <section className="glass-card mt-8 p-8">
        <h2 className="text-2xl font-bold text-on-surface">A repeatable review workflow</h2>
        <p className="mt-4 leading-7 text-on-surface-secondary">Provide the public repository URL or upload the skill package, review the scan findings in context, then make an installation decision based on the specific behaviors detected—not a generic trust score alone.</p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-shield-700">
          <Link href="/skill-md-validator" className="hover:text-shield-800">Validate the SKILL.md file →</Link>
          <Link href="/openclaw-skill-security" className="hover:text-shield-800">Review OpenClaw skills →</Link>
        </div>
      </section>
    </div>
  )
}
