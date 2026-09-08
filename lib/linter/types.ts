export interface LspPosition {
  line: number
  character: number
}

export interface LspRange {
  start: LspPosition
  end: LspPosition
}

export interface LspQuickFix {
  title: string
  edit: {
    range: LspRange
    newText: string
  }
}

export interface LspDiagnostic {
  range: LspRange
  severity: 1 | 2 | 3 | 4 // 1=Error, 2=Warning, 3=Information, 4=Hint
  code?: string
  source: 'skillshield'
  message: string
  ruleId?: string
  quickFix?: LspQuickFix
}