import { describe, it, expect } from 'vitest'
import { convertToLspDiagnostics } from '@/lib/linter'
import type { Finding } from '@/lib/validator/types'

describe('LSP Diagnostics & QuickFix Engine', () => {
  describe('Severity Mapping', () => {
    it('converts critical findings to severity 1 (Error)', () => {
      const findings: Finding[] = [
        {
          id: 'test-crit-1',
          axis: 'security',
          severity: 'critical',
          category: 'command-injection',
          title: 'Remote code execution detected',
          message: 'Found arbitrary code execution vulnerability',
          filePath: 'skills/test.sh',
          lineNumber: 5,
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].severity).toBe(1)
      expect(diagnostics[0].source).toBe('skillshield')
      expect(diagnostics[0].message).toBe('Found arbitrary code execution vulnerability')
    })

    it('converts high findings to severity 1 (Error)', () => {
      const findings: Finding[] = [
        {
          id: 'test-high-1',
          axis: 'security',
          severity: 'high',
          category: 'Install Script',
          title: 'Lifecycle script bypass',
          message: 'Uses --ignore-scripts to bypass checks',
          filePath: 'skills/install.sh',
          lineNumber: 1,
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics[0].severity).toBe(1)
    })

    it('converts medium findings to severity 2 (Warning)', () => {
      const findings: Finding[] = [
        {
          id: 'test-med-1',
          axis: 'security',
          severity: 'medium',
          category: 'Container',
          title: 'Unpinned image tag',
          message: 'Docker Compose references unpinned images',
          filePath: 'docker-compose.yml',
          lineNumber: 2,
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].severity).toBe(2)
      expect(diagnostics[0].source).toBe('skillshield')
    })

    it('converts low findings to severity 3 (Information) and info to severity 4 (Hint)', () => {
      const findings: Finding[] = [
        {
          id: 'test-low-1',
          axis: 'security',
          severity: 'low',
          category: 'mcp-missing-description',
          title: 'Missing description',
          message: 'Parameter lacks documentation',
        },
        {
          id: 'test-info-1',
          axis: 'quality',
          severity: 'info',
          category: 'documentation',
          title: 'Consider adding examples',
          message: 'Documentation could be improved',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics[0].severity).toBe(3)
      expect(diagnostics[1].severity).toBe(4)
    })
  })

  describe('Accurate Line Range Generation', () => {
    it('generates accurate line and character range from snippet and fileContentMap', () => {
      const fileContent = [
        '#!/usr/bin/env bash',
        'echo "Starting install..."',
        '    curl -sSL https://example.com/install.sh | bash',
        'echo "Done"',
      ].join('\n')

      const findings: Finding[] = [
        {
          id: 'test-range-1',
          axis: 'security',
          severity: 'critical',
          category: 'Install Script',
          title: 'Pipe to shell detected',
          message: 'Install script pipes network to shell',
          filePath: 'install.sh',
          lineNumber: 3,
          snippet: 'curl -sSL https://example.com/install.sh | bash',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings, {
        'install.sh': fileContent,
      })

      expect(diagnostics).toHaveLength(1)
      const range = diagnostics[0].range
      // Line index is 0-based: line 3 in file is index 2
      expect(range.start.line).toBe(2)
      // Indented by 4 spaces
      expect(range.start.character).toBe(4)
      expect(range.end.line).toBe(2)
      expect(range.end.character).toBe(4 + 'curl -sSL https://example.com/install.sh | bash'.length)
    })

    it('locates snippet position even if lineNumber is not explicitly set', () => {
      const fileContent = 'const a = 1;\nconst b = "unsafe-exec";\nconst c = 3;'
      const findings: Finding[] = [
        {
          id: 'test-range-2',
          axis: 'security',
          severity: 'high',
          category: 'obfuscation',
          title: 'Unsafe execution',
          message: 'Found unsafe string',
          filePath: 'index.js',
          snippet: 'unsafe-exec',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings, {
        'index.js': fileContent,
      })

      expect(diagnostics).toHaveLength(1)
      const range = diagnostics[0].range
      expect(range.start.line).toBe(1)
      expect(range.start.character).toBe(11) // index of "unsafe-exec" after 'const b = "'
      expect(range.end.line).toBe(1)
      expect(range.end.character).toBe(22)
    })

    it('handles multiline snippets accurately', () => {
      const fileContent = 'line 1\n{\n  "target": {\n    "type": "string"\n  }\n}\nline 7'
      const snippet = '{\n  "target": {\n    "type": "string"\n  }\n}'

      const findings: Finding[] = [
        {
          id: 'test-range-3',
          axis: 'security',
          severity: 'medium',
          category: 'schema',
          title: 'Complex schema',
          message: 'Schema warning',
          filePath: 'schema.json',
          snippet,
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings, {
        'schema.json': fileContent,
      })

      const range = diagnostics[0].range
      expect(range.start.line).toBe(1)
      expect(range.start.character).toBe(0)
      expect(range.end.line).toBe(5)
      expect(range.end.character).toBe(1)
    })

    it('provides fallback range when file content is not available', () => {
      const findings: Finding[] = [
        {
          id: 'test-range-4',
          axis: 'security',
          severity: 'low',
          category: 'general',
          title: 'General info',
          message: 'Some note',
          lineNumber: 10,
          column: 5,
          snippet: 'var x = 1;',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      const range = diagnostics[0].range
      expect(range.start.line).toBe(9) // 0-based
      expect(range.start.character).toBe(4) // 0-based
      expect(range.end.line).toBe(9)
      expect(range.end.character).toBe(4 + 'var x = 1;'.length)
    })
  })

  describe('QuickFix Generation', () => {
    it('generates quick-fix for pipe to shell findings', () => {
      const findings: Finding[] = [
        {
          id: 'test-pipe-1',
          axis: 'security',
          severity: 'critical',
          category: 'Install Script',
          title: 'Install script pipes network to shell',
          message: 'The install script downloads and executes code from the network in one step',
          filePath: 'setup.sh',
          lineNumber: 1,
          snippet: 'curl -sSL https://raw.githubusercontent.com/foo/bar/main/install.sh | bash',
          ruleId: 'install-pipe-shell',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      const qf = diagnostics[0].quickFix
      expect(qf).toBeDefined()
      expect(qf?.title).toMatch(/download and inspect/i)
      expect(qf?.edit.newText).toContain('curl -fsSL https://raw.githubusercontent.com/foo/bar/main/install.sh -o install.sh')
      expect(qf?.edit.newText).toContain('cat install.sh && bash install.sh')
      expect(qf?.edit.newText).not.toContain('| bash')
    })

    it('generates quick-fix for dangerous package flags (--ignore-scripts)', () => {
      const findings: Finding[] = [
        {
          id: 'test-flag-1',
          axis: 'security',
          severity: 'high',
          category: 'dangerous-flag',
          title: 'Lifecycle Script Bypass (--ignore-scripts)',
          message: 'Disables standard lifecycle script execution.',
          filePath: 'package.json',
          lineNumber: 2,
          snippet: 'npm install --ignore-scripts express',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      const qf = diagnostics[0].quickFix
      expect(qf).toBeDefined()
      expect(qf?.title).toMatch(/remove dangerous flag/i)
      expect(qf?.edit.newText).toBe('npm install express')
      expect(qf?.edit.newText).not.toContain('--ignore-scripts')
    })

    it('generates quick-fix for dangerous package flag when snippet is just the flag', () => {
      const findings: Finding[] = [
        {
          id: 'test-flag-2',
          axis: 'security',
          severity: 'high',
          category: 'dangerous-flag',
          title: 'Dangerous flag detected',
          message: 'Found --ignore-scripts',
          filePath: 'run.sh',
          lineNumber: 1,
          snippet: '--ignore-scripts',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      const qf = diagnostics[0].quickFix
      expect(qf).toBeDefined()
      expect(qf?.edit.newText).toBe('')
    })

    it('generates quick-fix for missing parameter descriptions (schema findings)', () => {
      const findings: Finding[] = [
        {
          id: 'test-schema-1',
          axis: 'security',
          severity: 'low',
          category: 'mcp-missing-description',
          title: 'Undocumented Parameter in Tool "search"',
          message: 'Parameter "query" in tool "search" lacks a description, which can lead to LLM hallucination.',
          filePath: 'mcp.json',
          lineNumber: 8,
          snippet: '"query": { "type": "string" }',
          ruleId: 'SS-MCP-PARAM-DOC',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      const qf = diagnostics[0].quickFix
      expect(qf).toBeDefined()
      expect(qf?.title).toMatch(/add parameter description/i)
      expect(qf?.edit.newText).toContain('description: "..."')
    })

    it('generates quick-fix for undeclared permissions (manifest snippet)', () => {
      const findings: Finding[] = [
        {
          id: 'test-perm-1',
          axis: 'security',
          severity: 'high',
          category: 'capability-drift',
          title: 'Undeclared Network Activity (Capability Drift)',
          message: 'Skill declared no outbound network permissions, but fetch was detected at line 14.',
          filePath: 'index.ts',
          lineNumber: 14,
          snippet: 'fetch("https://api.github.com")',
          ruleId: 'SS-DRIFT-NET',
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      const qf = diagnostics[0].quickFix
      expect(qf).toBeDefined()
      expect(qf?.title).toMatch(/manifest/i)
      expect(qf?.edit.range.start.line).toBe(0)
      expect(qf?.edit.newText).toContain('---permissions')
      expect(qf?.edit.newText).toContain('network:')
    })

    it('does not attach quick-fix when no remediation pattern applies', () => {
      const findings: Finding[] = [
        {
          id: 'test-none-1',
          axis: 'naming',
          severity: 'low',
          category: 'naming-convention',
          title: 'Skill name is too short',
          message: 'The skill name should be at least 3 characters',
          filePath: 'SKILL.md',
          lineNumber: 1,
        },
      ]

      const diagnostics = convertToLspDiagnostics(findings)
      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].quickFix).toBeUndefined()
    })
  })
})