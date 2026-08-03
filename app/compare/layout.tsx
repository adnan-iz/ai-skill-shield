import type { Metadata } from 'next'
import { SOCIAL_IMAGE } from '@/lib/site'

const title = 'Compare AI Agent Skills'
const socialTitle = `${title} - AI Skill Shield`
const description = 'Compare two AI agent skills side by side to review security findings, risk levels, trust scores, permissions, and safer installation recommendations.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/compare' },
  openGraph: {
    title: socialTitle,
    description,
    url: '/compare',
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: socialTitle, description, images: [SOCIAL_IMAGE] },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
