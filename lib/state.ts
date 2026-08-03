import type { ValidationResult } from './validator/types'
import { normalizeValidationResult } from './validator/normalize-result'

const STORAGE_KEY = 'skillshield_history'
const HISTORY_EVENT = 'skillshield-history-change'

function notifyHistoryChanged(): void {
  window.dispatchEvent(new Event(HISTORY_EVENT))
}

export function getValidationHistorySnapshot(): string {
  if (typeof window === 'undefined') return '[]'
  try {
    return localStorage.getItem(STORAGE_KEY) || '[]'
  } catch {
    return '[]'
  }
}

export function subscribeValidationHistory(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(HISTORY_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(HISTORY_EVENT, onStoreChange)
  }
}

export function parseValidationHistory(snapshot: string): ValidationResult[] {
  try {
    return (JSON.parse(snapshot) as ValidationResult[]).map(normalizeValidationResult)
  } catch {
    return []
  }
}

export function saveValidation(result: ValidationResult): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const list = stored ? parseValidationHistory(stored) : []
    const existingIndex = list.findIndex((r) => r.id === result.id)
    if (existingIndex >= 0) {
      list[existingIndex] = result
    } else {
      list.unshift(result)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    notifyHistoryChanged()
  } catch {
    // localStorage may be full or unavailable
  }
}

export function getValidation(id: string): ValidationResult | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const list = parseValidationHistory(stored)
    return list.find((r) => r.id === id) ?? null
  } catch {
    return null
  }
}

export function getAllValidations(): ValidationResult[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseValidationHistory(stored) : []
  } catch {
    return []
  }
}

export function deleteValidation(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    const list = parseValidationHistory(stored)
    const filtered = list.filter((r) => r.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    notifyHistoryChanged()
  } catch {
    // localStorage may be full or unavailable
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  notifyHistoryChanged()
}
