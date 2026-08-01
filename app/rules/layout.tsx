import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Agent Skill Security Rules',
  description: 'Configure policies that block secrets, destructive commands, unsafe network access, and risky AI agent skill behavior.',
  alternates: { canonical: '/rules' },
  openGraph: {
    title: 'AI Agent Skill Security Rules - SkillShield',
    description: 'Configure security policies for AI agent skill validation.',
    url: '/rules',
  },
}

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
