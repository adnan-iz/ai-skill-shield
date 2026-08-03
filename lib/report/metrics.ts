import type { FileTreeItem } from '@/lib/validator/types'

export function countFileTree(items: FileTreeItem[]): number {
  return items.reduce((count, item) => count + (item.type === 'file' ? 1 : countFileTree(item.children ?? [])), 0)
}
