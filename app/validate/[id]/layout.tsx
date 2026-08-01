import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Private Validation Report',
    alternates: { canonical: `/validate/${encodeURIComponent(id)}` },
    robots: { index: false, follow: false },
  }
}

export default function ValidationLayout({ children }: { children: React.ReactNode }) {
  return children
}
