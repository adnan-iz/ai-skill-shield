"use client"

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'

interface DropzoneProps {
  onFiles: (files: { name: string; content: string }[]) => void
}

export default function Dropzone({ onFiles }: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [fileNames, setFileNames] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const items = e.dataTransfer?.items
    if (!items) return
    const files: { name: string; content: string }[] = []
    const names: string[] = []
    for (const item of items) {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null
      if (entry?.isDirectory) {
        await traverseDirectory(entry as FileSystemDirectoryEntry, files, names, '')
      } else if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          names.push(file.name)
          const content = await file.text()
          files.push({ name: file.name, content })
        }
      }
    }
    setFileNames(names)
    onFiles(files)
  }

  async function traverseDirectory(
    entry: FileSystemDirectoryEntry,
    files: { name: string; content: string }[],
    names: string[],
    path: string
  ) {
    const reader = entry.createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(resolve)
    })
    for (const child of entries) {
      if (child.isDirectory) {
        await traverseDirectory(child as FileSystemDirectoryEntry, files, names, `${path}${child.name}/`)
      } else {
        const file = await new Promise<File>((resolve) => (child as FileSystemFileEntry).file(resolve))
        names.push(`${path}${file.name}`)
        const content = await file.text()
        files.push({ name: `${path}${file.name}`, content })
      }
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList) return
    const files: { name: string; content: string }[] = []
    const names: string[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      names.push(file.name)
      const content = await file.text()
      files.push({ name: file.name, content })
    }
    setFileNames(names)
    onFiles(files)
  }

  function handleClick() {
    inputRef.current?.click()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      aria-label="Upload skill files. Drop files here or click to browse."
      className={`cursor-pointer rounded-xl border border-dashed p-10 text-center transition-all duration-300 ${
        dragging
          ? 'border-primary bg-primary/10 shadow-[0_0_25px_-5px_rgba(75,226,119,0.3)]'
          : 'border-outline-variant/60 bg-surface-container-low/40 hover:border-primary/50 hover:bg-surface-container-low/80'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.zip,.json,.yaml,.yml,.txt"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="File input for skill upload"
      />
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-2xl">cloud_upload</span>
      </div>
      <p className="text-sm font-semibold tracking-wide text-on-surface">
        DROP SKILL DIRECTORY OR ARCHIVE HERE
      </p>
      <p className="mt-1 font-mono text-xs text-on-surface-secondary">
        or click to browse &middot; SKILL.md, ZIP, or package files
      </p>
      {fileNames.length > 0 && (
        <div className="mt-4 space-y-1">
          {fileNames.slice(0, 5).map((name) => (
            <div key={name} className="text-xs text-on-surface-secondary truncate">{name}</div>
          ))}
          {fileNames.length > 5 && (
            <div className="text-xs text-on-surface-secondary">+{fileNames.length - 5} more files</div>
          )}
        </div>
      )}
    </div>
  )
}
