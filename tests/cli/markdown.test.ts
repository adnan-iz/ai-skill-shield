import { expect, it } from 'vitest'
import { escapeMarkdownTableCell } from '@/packages/cli/src/markdown'

it('escapes backslashes, table separators, and line breaks in Markdown cells', () => {
  expect(escapeMarkdownTableCell('path\\name|next\nrow')).toBe('path\\\\name\\|next row')
})
