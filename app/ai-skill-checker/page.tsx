import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Free AI Skill Checker',
  description:
    'Scan AI agent skills, SKILL.md files, and GitHub repositories for prompt injection, secrets, dangerous commands, permissions, and install risks.',
  alternates: {
    canonical: '/ai-skill-checker',
  },
  openGraph: {
    title: 'Free AI Skill Checker | AI Skill Shield',
    description:
      'Check an AI agent skill before installation. Review SKILL.md files and GitHub repositories for security and supply-chain risks.',
    url: '/ai-skill-checker',
  },
}

const checks = [
  'Prompt injection and suspicious instructions',
  'Exposed API keys, tokens, and credentials',
  'Dangerous shell commands and dynamic execution',
  'Network, filesystem, and environment access',
  'Install scripts, dependencies, workflows, and repository risks',
]

const questions = [
  {
    question: 'What is an AI skill checker?',
    answer:
      'An AI skill checker reviews an agent skill before installation so you can identify security, permission, compatibility, and supply-chain risks in its instructions and supporting files.',
  },
  {
    question: 'Can I check a SKILL.md file?',
    answer:
      'Yes. You can paste SKILL.md content, upload a skill package, or provide a public GitHub repository URL for review.',
  },
  {
    question: 'Does it inspect GitHub repositories?',
    answer:
      'Repository scans can assess the skill files alongside install scripts, workflows, registries, submodules, and repository trust evidence.',
  },
]

const pageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: 'Free AI Skill Checker',
      description:
        'Scan AI agent skills, SKILL.md files, and GitHub repositories for security and installation risks.',
      url: 'https://ai-skill-shield.suppeng.com/ai-skill-checker',
    },
    {
      '@type': 'FAQPage',
      mainEntity: questions.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
}

export default function AiSkillCheckerPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />

      <section className="glass-card p-8 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-shield-700">Pre-install skill security</p>
        <h1 className="mt-3 text-4xl font-bold text-on-surface sm:text-5xl">Free AI Skill Checker</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-on-surface-secondary">
          Check an AI agent skill before you install it. AI Skill Shield scans SKILL.md files, skill packages, and public GitHub repositories for the risks that matter when an agent can run code or access your environment.
        </p>
        <Link
          href="/#upload"
          className="mt-8 inline-flex rounded-lg bg-shield-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-shield-700"
        >
          Start a free scan
        </Link>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-on-surface">What the checker looks for</h2>
          <ul className="mt-5 space-y-4 text-on-surface-secondary">
            {checks.map((check) => (
              <li key={check} className="flex gap-3">
                <span aria-hidden="true" className="text-shield-600">✓</span>
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-on-surface">How to check an agent skill</h2>
          <ol className="mt-5 space-y-4 text-on-surface-secondary">
            <li><strong className="text-on-surface">1. Provide a source.</strong> Paste SKILL.md content, upload files, or add a public GitHub URL.</li>
            <li><strong className="text-on-surface">2. Review the evidence.</strong> Inspect findings, severity, affected files, and repository signals.</li>
            <li><strong className="text-on-surface">3. Decide before installation.</strong> Use the report to understand risk and choose whether to proceed.</li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-shield-700">
            <Link href="/rules" className="hover:text-shield-800">Explore security rules →</Link>
            <Link href="/docs/api" className="hover:text-shield-800">Read the API docs →</Link>
          </div>
        </div>
      </section>

      <section className="glass-card mt-8 p-8">
        <h2 className="text-2xl font-bold text-on-surface">AI skill checker FAQ</h2>
        <dl className="mt-6 grid gap-6 md:grid-cols-3">
          {questions.map(({ question, answer }) => (
            <div key={question}>
              <dt className="font-semibold text-on-surface">{question}</dt>
              <dd className="mt-2 text-sm leading-6 text-on-surface-secondary">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
