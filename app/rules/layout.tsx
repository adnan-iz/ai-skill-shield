import type { Metadata } from 'next'
import { SOCIAL_IMAGE } from '@/lib/site'

const title = 'AI Agent Skill Security Rules'
const socialTitle = `${title} - SkillShield`
const description = 'Configure SkillShield security policies to block exposed secrets, destructive commands, unsafe network access, risky permissions, and dangerous agent behavior.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/rules' },
  openGraph: {
    title: socialTitle,
    description,
    url: '/rules',
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: socialTitle, description, images: [SOCIAL_IMAGE] },
}

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
