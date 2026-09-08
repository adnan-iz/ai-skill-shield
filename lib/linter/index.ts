export {
  convertToLspDiagnostics,
  mapSeverity,
  calculateRange,
  generateQuickFix,
} from './diagnostics'

export type {
  LspDiagnostic,
  LspQuickFix,
  LspPosition,
  LspRange,
} from './types'