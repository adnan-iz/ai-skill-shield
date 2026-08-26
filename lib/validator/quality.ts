import { AxisResult, Finding } from '@/lib/validator/types'

interface QualityDimension {
  name: string
  key: string
  weight: number
  score: number
  findings: Finding[]
}

let findingCounter = 0

function makeId(): string {
  return `ql-${Date.now()}-${++findingCounter}`
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~]{1,2}/g, '')
    .replace(/>\s/g, '')
    .replace(/[-*+]\s/g, '')
    .replace(/\d+\.\s/g, '')
    .replace(/\|/g, '')
    .replace(/-{3,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+\s/g)
  return matches ? matches.length : Math.max(1, text.split(/\n+/).length)
}

function estimateSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length <= 3) return 1
  const vowels = w.match(/[aeiouy]+/g)
  if (!vowels) return 1
  let count = vowels.length
  if (w.endsWith('e')) count--
  if (w.endsWith('le') && w.length > 2) count++
  return Math.max(1, count)
}

function estimateFleschReadingEase(text: string): number {
  const words = countWords(text)
  const sentences = countSentences(text)
  if (words === 0 || sentences === 0) return 100

  const totalSyllables = text.split(/\s+/)
    .filter(w => w.length > 0)
    .reduce((sum, word) => sum + estimateSyllables(word), 0)

  return 206.835 - 1.015 * (words / sentences) - 84.6 * (totalSyllables / words)
}

function assessReadability(content: string, body: string): QualityDimension {
  const findings: Finding[] = []
  const text = stripMarkdown(body || content)
  const words = countWords(text)
  const sentences = countSentences(text)
  const flesch = estimateFleschReadingEase(text)

  let score = 0

  if (words >= 50) {
    score += 25
  } else {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Very short content',
      message: `Content has only ${words} words, making readability assessment difficult`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Expand the skill documentation with more detailed content',
      ruleId: 'quality-readability-length',
    })
  }

  if (sentences >= 5) {
    score += 25
  }

  if (flesch >= 60) {
    score += 25
  } else if (flesch >= 30) {
    score += 15
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Moderate readability',
      message: `Flesch Reading Ease score is ${flesch.toFixed(0)} (target: 60+)`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Use shorter sentences and simpler words to improve readability',
      ruleId: 'quality-readability-moderate',
    })
  } else {
    score += 5
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'medium',
      category: 'quality',
      title: 'Poor readability',
      message: `Flesch Reading Ease score is ${flesch.toFixed(0)} (target: 60+)`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Rewrite content with shorter sentences, simpler vocabulary, and clearer structure',
      ruleId: 'quality-readability-low',
    })
  }

  const avgSentenceLength = sentences > 0 ? words / sentences : 0
  if (avgSentenceLength <= 25) {
    score += 25
  } else if (avgSentenceLength <= 35) {
    score += 15
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Long average sentence length',
      message: `Average sentence length is ${avgSentenceLength.toFixed(0)} words (recommended: <25)`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Break long sentences into shorter ones for better readability',
      ruleId: 'quality-readability-sentence-length',
    })
  } else {
    score += 5
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Very long sentences',
      message: `Average sentence length is ${avgSentenceLength.toFixed(0)} words (recommended: <25)`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Break long sentences into shorter ones for better readability',
      ruleId: 'quality-readability-long-sentences',
    })
  }

  return { name: 'Readability', key: 'readability', weight: 0.25, score, findings }
}

function assessCompleteness(content: string, _body: string): QualityDimension {
  const findings: Finding[] = []
  let score = 0
  const fullContent = content || ''

  const hasIntro = /^#\s+/m.test(fullContent) || /##\s+(intro|overview|about|getting\s+started)/i.test(fullContent)
  if (hasIntro) {
    score += 25
  } else {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'medium',
      category: 'quality',
      title: 'Missing introduction',
      message: 'Skill documentation lacks an introduction or overview section',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add an introduction section explaining what the skill does',
      ruleId: 'quality-completeness-intro',
    })
  }

  const hasSteps = /^\d+\.\s/m.test(fullContent) || /##\s+(steps|usage|how\s+to|instructions|workflow|procedure)/i.test(fullContent)
  if (hasSteps) {
    score += 25
  } else {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Missing step-by-step instructions',
      message: 'Skill documentation lacks step-by-step instructions',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add step-by-step usage instructions to the skill',
      ruleId: 'quality-completeness-steps',
    })
  }

  const hasExamples = /```[\s\S]*?```/.test(fullContent) || /##\s+(examples?|demo|sample)/i.test(fullContent)
  if (hasExamples) {
    score += 25
  }

  const hasEdgeCases = /##\s+(edge\s+cases|error\s+handling|limitations?|troubleshooting|faq|known\s+issues)/i.test(fullContent)
  const hasErrorHandling = /error|fail|edge\s+case|limitation|note:|warning:|caution:/i.test(fullContent)
  if (hasEdgeCases || hasErrorHandling) {
    score += 25
  } else {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Missing edge cases or error handling',
      message: 'Skill documentation does not cover edge cases or error scenarios',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add sections covering edge cases, error handling, and known limitations',
      ruleId: 'quality-completeness-edge-cases',
    })
  }

  return { name: 'Completeness', key: 'completeness', weight: 0.25, score, findings }
}

function assessClarity(content: string, _body: string): QualityDimension {
  const findings: Finding[] = []
  let score = 0
  const fullContent = content || ''

  const headings = fullContent.match(/^#{1,6}\s.+/gm) || []
  let hasSkippedLevel = false
  let prevLevel = 0
  for (const h of headings) {
    const level = h.match(/^#+/)?.[0].length || 0
    if (level > prevLevel + 1 && prevLevel > 0) {
      hasSkippedLevel = true
    }
    prevLevel = level
  }

  if (headings.length > 0 && !hasSkippedLevel) {
    score += 50
  } else if (headings.length > 0) {
    score += 25
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Skipped heading levels',
      message: 'Heading hierarchy skips levels (e.g., H1 followed by H3 without H2)',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Use a consistent heading hierarchy without skipping levels',
      ruleId: 'quality-clarity-heading-skip',
    })
  } else {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'medium',
      category: 'quality',
      title: 'No markdown headings',
      message: 'Skill documentation has no markdown headings for structure',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add markdown headings to structure the documentation clearly',
      ruleId: 'quality-clarity-no-headings',
    })
  }

  if (headings.length >= 3) {
    score += 25
  } else if (headings.length >= 1) {
    score += 10
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Few sections',
      message: `Only ${headings.length} section${headings.length !== 1 ? 's' : ''} found, consider adding more structure`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Break content into more sections for better organization',
      ruleId: 'quality-clarity-few-sections',
    })
  }

  const contradictionTerms = ['but not', 'however', 'except', 'unless', 'alternatively']
  const hasContradictions = contradictionTerms.some(c => fullContent.toLowerCase().includes(c))
  if (!hasContradictions) {
    score += 25
  }

  return { name: 'Clarity', key: 'clarity', weight: 0.20, score, findings }
}

function assessExamples(content: string, _body: string): QualityDimension {
  const findings: Finding[] = []
  let score = 0
  const fullContent = content || ''

  const codeBlocks = fullContent.match(/```[\s\S]*?```/g) || []

  if (codeBlocks.length >= 3) {
    score += 40
  } else if (codeBlocks.length >= 1) {
    score += 20
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Few code examples',
      message: `Only ${codeBlocks.length} code block${codeBlocks.length !== 1 ? 's' : ''} found (recommended: 3+)`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add more code examples demonstrating skill usage',
      ruleId: 'quality-examples-few',
    })
  } else {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'medium',
      category: 'quality',
      title: 'No usage examples',
      message: 'Skill documentation contains no examples or demonstrations',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add a concrete usage example with an expected result',
      ruleId: 'quality-examples-none',
    })
  }

  const hasIOExamples = /(input|output|result|returns?|prints?|logs?|=>|->|→)/i.test(fullContent)
  if (hasIOExamples) {
    score += 30
  } else if (codeBlocks.length > 0) {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Missing input/output examples',
      message: 'Skill documentation lacks input/output demonstrations',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Show example inputs and their expected outputs',
      ruleId: 'quality-examples-io',
    })
  }

  const hasTemplates = /template|placeholder|replace|example\./i.test(fullContent)
  if (hasTemplates) {
    score += 30
  }

  return { name: 'Examples', key: 'examples', weight: 0.20, score, findings }
}

function assessAccessibility(content: string, _body: string): QualityDimension {
  const findings: Finding[] = []
  let score = 0
  const fullContent = content || ''

  const { imagesWithAlt, imagesWithoutAlt } = countMarkdownImages(fullContent)

  if (imagesWithAlt > 0) {
    score += 30
  }
  if (imagesWithoutAlt > 0) {
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Images without alt text',
      message: `${imagesWithoutAlt} image${imagesWithoutAlt !== 1 ? 's' : ''} missing descriptive alt text`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Add descriptive alt text to all images',
      ruleId: 'quality-accessibility-alt-text',
    })
  }

  const jargonTerms = ['utilize', 'leverage', 'synergy', 'paradigm', 'facilitate', 'optimize', 'streamline']
  const jargonCount = jargonTerms.filter(j => fullContent.toLowerCase().includes(j)).length

  if (jargonCount === 0) {
    score += 35
  } else if (jargonCount <= 2) {
    score += 20
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Jargon detected',
      message: `Found ${jargonCount} jargon term${jargonCount !== 1 ? 's' : ''}, consider simpler alternatives`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Replace jargon with simpler, more accessible language',
      ruleId: 'quality-accessibility-jargon',
    })
  } else {
    score += 5
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'low',
      category: 'quality',
      title: 'Excessive jargon',
      message: `Found ${jargonCount} jargon terms, consider simplifying language`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Replace jargon with simpler alternatives for broader accessibility',
      ruleId: 'quality-accessibility-excessive-jargon',
    })
  }

  const headings = fullContent.match(/^#{1,6}\s.+/gm) || []
  const hasHorizontalRules = /---/.test(fullContent)
  const paragraphs = fullContent.split(/\n\n+/).filter(p => p.trim().length > 0)

  if (paragraphs.length >= 5 && (hasHorizontalRules || headings.length >= 3)) {
    score += 35
  } else if (paragraphs.length >= 3) {
    score += 20
    findings.push({
      id: makeId(),
      axis: 'quality',
      severity: 'info',
      category: 'quality',
      title: 'Improve section separation',
      message: 'Content sections could be better separated with headings or horizontal rules',
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Use headings and horizontal rules to clearly separate sections',
      ruleId: 'quality-accessibility-separation',
    })
  }

  return { name: 'Accessibility', key: 'accessibility', weight: 0.10, score, findings }
}

function countMarkdownImages(content: string): { imagesWithAlt: number; imagesWithoutAlt: number } {
  let imagesWithAlt = 0
  let imagesWithoutAlt = 0
  let position = 0

  while (position < content.length) {
    const opening = content.indexOf('![', position)
    if (opening === -1) break
    const altEnd = content.indexOf(']', opening + 2)
    if (altEnd === -1 || content[altEnd + 1] !== '(') {
      position = opening + 2
      continue
    }
    const urlEnd = content.indexOf(')', altEnd + 2)
    if (urlEnd === -1) {
      position = altEnd + 2
      continue
    }

    if (altEnd === opening + 2) imagesWithoutAlt++
    else imagesWithAlt++
    position = urlEnd + 1
  }

  return { imagesWithAlt, imagesWithoutAlt }
}

export function assessQuality(content: string, body: string): AxisResult {
  const dimensions = [
    assessReadability(content, body),
    assessCompleteness(content, body),
    assessClarity(content, body),
    assessExamples(content, body),
    assessAccessibility(content, body),
  ]

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  )

  const allFindings = dimensions.flatMap(d => d.findings)

  return {
    name: 'Content Quality',
    key: 'quality',
    score: overallScore,
    status: overallScore >= 70 ? 'pass' : overallScore >= 40 ? 'warn' : 'fail',
    summary: overallScore >= 70
      ? 'Skill content is well-written and comprehensive'
      : `Quality score ${overallScore}/100, ${allFindings.length} area${allFindings.length !== 1 ? 's' : ''} for improvement`,
    findings: allFindings,
  }
}
