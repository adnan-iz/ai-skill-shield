import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SKILL.md Validator',
  description: 'Validate SKILL.md files before installation. Learn what to check for prompt injection, secrets, dangerous commands, permissions, and repository risks.',
  alternates: { canonical: '/skill-md-validator' },
  openGraph: {
    title: 'SKILL.md Validator | AI Skill Shield',
    description: 'Validate an AI agent SKILL.md file before installation and review the security risks that matter.',
    url: '/skill-md-validator',
  },
}

const checks = [
  ['Instructions and prompt injection', 'Look for instructions that attempt to override an agent, conceal their purpose, or change the intended task.'],
  ['Commands and installation behavior', 'Review shell execution, downloads, dynamic code, and setup instructions before allowing them to run.'],
  ['Data and permissions', 'Identify requests for credentials, environment variables, filesystem access, network access, and external services.'],
  ['Repository context', 'Check scripts, workflows, dependencies, registries, and related files rather than trusting a SKILL.md in isolation.'],
]

export default function SkillMdValidatorPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <section className="glass-card p-8 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-shield-700">Pre-install skill review</p>
        <h1 className="mt-3 text-4xl font-bold text-on-surface sm:text-5xl">SKILL.md validator</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-on-surface-secondary">
          A SKILL.md file tells an AI agent how to behave. Validate its instructions and the files around it before you give that skill access to your environment.
        </p>
        <Link href="/#upload" className="mt-8 inline-flex rounded-lg bg-shield-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-shield-700">
          Validate a skill for free
        </Link>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {checks.map(([title, description]) => (
          <article key={title} className="glass-card p-7">
            <h2 className="text-xl font-bold text-on-surface">{title}</h2>
            <p className="mt-3 leading-7 text-on-surface-secondary">{description}</p>
          </article>
        ))}
      </section>

      <section className="glass-card mt-8 p-8">
        <h2 className="text-2xl font-bold text-on-surface">How to validate a SKILL.md file</h2>
        <ol className="mt-5 space-y-4 leading-7 text-on-surface-secondary">
          <li><strong className="text-on-surface">1. Start with the source.</strong> Use the complete repository or upload every relevant skill file, not just a copied snippet.</li>
          <li><strong className="text-on-surface">2. Review the evidence.</strong> Confirm each finding, its affected file, and the permission or behavior it represents.</li>
          <li><strong className="text-on-surface">3. Decide before installation.</strong> Restrict, remediate, or reject a skill when its behavior exceeds the trust you can give it.</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-shield-700">
          <Link href="/ai-skill-checker" className="hover:text-shield-800">Use the AI skill checker →</Link>
          <Link href="/rules" className="hover:text-shield-800">Explore security rules →</Link>
        </div>
      </section>
    </div>
  )
}
