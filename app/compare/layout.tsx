import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare AI Agent Skills',
  description: 'Compare two AI agent skills side by side for security findings, risk level, and validation score.',
  alternates: { canonical: '/compare' },
  openGraph: {
    title: 'Compare AI Agent Skills - SkillShield',
    description: 'Compare AI agent skills side by side for security findings, risk, and validation score.',
    url: '/compare',
  },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
