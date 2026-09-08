"use client"

import React, { useEffect, useMemo, useState } from 'react'
import type { ValidationResult, FileTreeItem } from '@/lib/validator/types'

interface FileTreeProps {
  result: ValidationResult
}

export default function FileTree({ result }: FileTreeProps) {
  const filesWithFindings = new Set(result.findings.map(f => f.filePath).filter(Boolean))
  const previewFiles = result.skillPreview.files ?? []
  const previewByPath = useMemo(
    () => new Map(previewFiles.map((file) => [file.path, file.content])),
    [previewFiles]
  )
  const [selectedPath, setSelectedPath] = useState<string | null>(previewFiles[0]?.path ?? null)

  useEffect(() => {
    if (!selectedPath || !previewByPath.has(selectedPath)) {
      setSelectedPath(previewFiles[0]?.path ?? null)
    }
  }, [previewByPath, previewFiles, selectedPath])

  const selectedContent = selectedPath ? previewByPath.get(selectedPath) : undefined

  function renderTree(items: FileTreeItem[], depth: number = 0): React.ReactNode[] {
    return items.flatMap((item) => {
      const hasFindings = item.type === 'file' && filesWithFindings.has(item.path)
      const elements: React.ReactNode[] = []

      elements.push(item.type === 'file' ? (
        <button
          key={item.path}
          type="button"
          onClick={() => setSelectedPath(item.path)}
          aria-pressed={selectedPath === item.path}
          className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500/70 ${
            selectedPath === item.path
              ? 'bg-shield-500/15 text-shield-300'
              : 'hover:bg-surface-secondary/70'
          }`}
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <span className={`material-symbols-outlined text-[14px] ${hasFindings ? 'text-red-500' : 'text-on-surface-secondary/60'}`}>
            description
          </span>
          <span className={hasFindings ? 'font-semibold text-red-500' : 'text-on-surface-secondary'}>
            {item.path.split('/').pop()}
          </span>
          {item.type === 'file' && item.size > 0 && (
            <span className="text-[10px] text-on-surface-secondary/50">
              {item.size} B
            </span>
          )}
        </button>
      ) : (
        <div
          key={item.path}
          className="flex items-center gap-1.5 whitespace-nowrap"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <span className="material-symbols-outlined text-[14px] text-on-surface-secondary/60">folder</span>
          <span className="text-on-surface-secondary">{item.path.split('/').pop()}</span>
        </div>
      ))

      if (item.children) {
        elements.push(...renderTree(item.children, depth + 1))
      }

      return elements
    })
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-on-surface-secondary">
          <span className="material-symbols-outlined text-lg">folder</span>
          File Tree
        </h3>
        <span className="text-xs text-on-surface-secondary/60">Select a file to inspect it</span>
      </div>
      <div className="grid min-h-64 grid-cols-1 overflow-hidden rounded-lg border border-outline lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.7fr)]">
        <div className="max-h-[28rem] overflow-auto border-b border-outline bg-surface-secondary/30 p-3 font-mono text-xs lg:border-r lg:border-b-0">
          {result.skillPreview.fileTree.length > 0 ? renderTree(result.skillPreview.fileTree) : (
            <div className="py-4 text-center text-on-surface-secondary/60">No file tree available</div>
          )}
        </div>
        <section className="flex min-w-0 flex-col bg-background/20" aria-live="polite">
          <div className="flex items-center gap-2 border-b border-outline px-4 py-2.5">
            <span className="material-symbols-outlined text-base text-on-surface-secondary/70">description</span>
            <span className="truncate font-mono text-xs text-on-surface-secondary">{selectedPath ?? 'File preview'}</span>
          </div>
          {selectedContent !== undefined ? (
            <pre className="max-h-[28rem] min-h-52 overflow-auto p-4 font-mono text-xs leading-5 text-on-surface whitespace-pre-wrap break-words">
              {selectedContent}
            </pre>
          ) : (
            <div className="flex min-h-52 items-center p-6 text-sm text-on-surface-secondary/70">
              {selectedPath
                ? 'This file was not retained in this scan. Run a new scan to inspect its source here.'
                : 'Select a file to inspect its scanned source.'}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
