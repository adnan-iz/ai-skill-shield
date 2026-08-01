import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Validation History',
  description: 'Review validation reports stored in this browser.',
  alternates: { canonical: '/history' },
  robots: { index: false, follow: false },
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
