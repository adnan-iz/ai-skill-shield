import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TokenEconomicsCard from '@/components/report/token-economics-card'
import McpToolsCard from '@/components/report/mcp-tools-card'
import type { Finding, TokenAnalysis, ValidationResult } from '@/lib/validator/types'

describe('TokenEconomicsCard Component', () => {
  it('renders high cache score (>= 80) with green/emerald "Cache Friendly" badge', () => {
    const analysis: TokenAnalysis = {
      totalTokens: 1500,
      frontmatterTokens: 100,
      bodyTokens: 1400,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
      cacheEfficiencyScore: 92,
      estimatedCostPer1kRuns: {
        claudeSonnet: 0.0045,
        gpt4o: 0.00375,
        geminiFlash: 0.00011,
      },
    }

    const html = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { tokenAnalysis: analysis })
    )

    expect(html).toContain('92')
    expect(html).toContain('Cache Friendly')
    expect(html).toContain('Static prompt prefix structure maximizes LLM KV-cache reuse')
    expect(html).toContain('1,500 tokens')
  })

  it('renders moderate cache score (60-79) with amber "Moderate" badge', () => {
    const analysis: TokenAnalysis = {
      totalTokens: 1200,
      frontmatterTokens: 400,
      bodyTokens: 800,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
      cacheEfficiencyScore: 70,
    }

    const html = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { tokenAnalysis: analysis })
    )

    expect(html).toContain('70')
    expect(html).toContain('Moderate')
    expect(html).toContain('Some prompt churn or frontmatter weight reduces caching hit rate')
  })

  it('renders low cache score (< 60) with rose/red "Needs Optimization" badge', () => {
    const analysis: TokenAnalysis = {
      totalTokens: 900,
      frontmatterTokens: 450,
      bodyTokens: 450,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
      cacheEfficiencyScore: 45,
    }

    const html = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { tokenAnalysis: analysis })
    )

    expect(html).toContain('45')
    expect(html).toContain('Needs Optimization')
    expect(html).toContain('Dynamic placeholders or large frontmatter frequently bust KV-caches')
  })

  it('displays estimated cost per 1,000 runs for Claude 3.5 Sonnet, GPT-4o, and Gemini Flash', () => {
    const analysis: TokenAnalysis = {
      totalTokens: 2000,
      frontmatterTokens: 100,
      bodyTokens: 1900,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
      cacheEfficiencyScore: 85,
      estimatedCostPer1kRuns: {
        claudeSonnet: 0.006,
        gpt4o: 0.005,
        geminiFlash: 0.0002,
      },
    }

    const html = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { tokenAnalysis: analysis })
    )

    expect(html).toContain('Claude 3.5 Sonnet')
    expect(html).toContain('$0.0060')
    expect(html).toContain('GPT-4o')
    expect(html).toContain('$0.0050')
    expect(html).toContain('Gemini Flash')
    expect(html).toContain('$0.0002')
  })

  it('renders cache recommendations list when recommendations exist', () => {
    const analysis: TokenAnalysis = {
      totalTokens: 800,
      frontmatterTokens: 300,
      bodyTokens: 500,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
      cacheEfficiencyScore: 55,
      cacheRecommendations: [
        'Move {{user_query}} to the bottom of the prompt.',
        'Frontmatter exceeds 35% of total token budget.',
      ],
    }

    const html = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { tokenAnalysis: analysis })
    )

    expect(html).toContain('KV-Cache &amp; Prompt Layout Recommendations (2)')
    expect(html).toContain('Move {{user_query}} to the bottom of the prompt.')
    expect(html).toContain('Frontmatter exceeds 35% of total token budget.')
  })

  it('handles undefined cacheEfficiencyScore and empty states gracefully without crashing', () => {
    const emptyAnalysis: TokenAnalysis = {
      totalTokens: 500,
      frontmatterTokens: 50,
      bodyTokens: 450,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
      cacheEfficiencyScore: undefined,
      estimatedCostPer1kRuns: undefined,
    }

    // Undefined score on TokenAnalysis
    const html1 = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { tokenAnalysis: emptyAnalysis })
    )
    expect(html1).toContain('Score Unavailable')
    expect(html1).toContain('—')

    // Completely null / empty props
    const html2 = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, {})
    )
    expect(html2).toContain('Score Unavailable')
    expect(html2).toContain('—')
  })

  it('extracts token analysis and cache recommendations from a ValidationResult object', () => {
    const mockResult = {
      id: 'scan-1',
      tokenAnalysis: {
        totalTokens: 1100,
        frontmatterTokens: 100,
        bodyTokens: 1000,
        isUnderLimit: true,
        limit: 5000,
        breakdown: [],
        cacheEfficiencyScore: 88,
        estimatedCostPer1kRuns: {
          claudeSonnet: 0.0033,
          gpt4o: 0.00275,
          geminiFlash: 0.00008,
        },
      },
      findings: [
        {
          id: 'f-opt-1',
          axis: 'tokens',
          severity: 'info',
          category: 'token-cache-optimization',
          title: 'Cache layout',
          message: 'Optimization tip',
          recommendation: 'Position invariant prompt blocks first.',
        },
      ],
    } as unknown as ValidationResult

    const html = renderToStaticMarkup(
      React.createElement(TokenEconomicsCard, { result: mockResult })
    )

    expect(html).toContain('88')
    expect(html).toContain('Cache Friendly')
    expect(html).toContain('Position invariant prompt blocks first.')
  })
})

describe('McpToolsCard Component', () => {
  it('displays "MCP Tools & Permissions: Verified Clean" when no MCP or drift findings exist', () => {
    const unrelatedFindings: Finding[] = [
      {
        id: 'f-1',
        axis: 'security',
        severity: 'high',
        category: 'secret-detection',
        title: 'Hardcoded API Key',
        message: 'OpenAI API key detected',
      },
      {
        id: 'f-2',
        axis: 'tokens',
        severity: 'low',
        category: 'tokens',
        title: 'Token limit',
        message: 'Within limit',
      },
    ]

    const html = renderToStaticMarkup(
      React.createElement(McpToolsCard, { findings: unrelatedFindings })
    )

    expect(html).toContain('MCP Tools &amp; Permissions: Verified Clean')
    expect(html).toContain('Precedence Hijacking:')
    expect(html).toContain('Clean')
    expect(html).toContain('Unconstrained Parameters:')
    expect(html).toContain('Capability Mismatches:')
    expect(html).toContain('All MCP Tool Schemas &amp; Runtime Capabilities Verified Clean')
    expect(html).not.toContain('Hardcoded API Key')
  })

  it('filters and displays Precedence Hijacking findings', () => {
    const findings: Finding[] = [
      {
        id: 'f-mcp-1',
        axis: 'security',
        severity: 'critical',
        category: 'mcp-description-poisoning',
        title: 'Tool Precedence Hijacking',
        message: 'Tool description commands the agent to execute this tool before all others.',
        filePath: 'mcp.json',
        lineNumber: 12,
        recommendation: 'Remove priority steering phrases from description.',
      },
    ]

    const html = renderToStaticMarkup(
      React.createElement(McpToolsCard, { findings })
    )

    expect(html).toContain('Precedence Hijacking:')
    expect(html).toContain('1 Detected')
    expect(html).toContain('Tool Precedence Hijacking')
    expect(html).toContain('mcp-description-poisoning')
    expect(html).toContain('Remove priority steering phrases from description.')
    expect(html).not.toContain('MCP Tools &amp; Permissions: Verified Clean')
  })

  it('filters and displays Unconstrained Parameters findings', () => {
    const findings: Finding[] = [
      {
        id: 'f-mcp-2',
        axis: 'security',
        severity: 'medium',
        category: 'mcp-unconstrained-parameter',
        title: 'Unconstrained Parameter Schema',
        message: 'Parameter "command" accepts unrestricted string input with no enum or pattern constraints.',
        filePath: 'tools/exec.json',
        recommendation: 'Add enum or regex pattern constraint.',
      },
    ]

    const html = renderToStaticMarkup(
      React.createElement(McpToolsCard, { findings })
    )

    expect(html).toContain('Unconstrained Parameters:')
    expect(html).toContain('1 Detected')
    expect(html).toContain('Unconstrained Parameter Schema')
    expect(html).toContain('mcp-unconstrained-parameter')
  })

  it('filters and displays Capability Drift / Mismatches findings', () => {
    const findings: Finding[] = [
      {
        id: 'f-drift-1',
        axis: 'security',
        severity: 'high',
        category: 'capability-drift',
        ruleId: 'capability-drift-network',
        title: 'Undeclared Network Activity',
        message: 'Outbound HTTP fetch detected but network capability was not declared in permission manifest.',
        filePath: 'scripts/run.js',
        lineNumber: 44,
        recommendation: 'Declare network permissions in frontmatter or manifest.',
      },
    ]

    const html = renderToStaticMarkup(
      React.createElement(McpToolsCard, { findings })
    )

    expect(html).toContain('Capability Mismatches:')
    expect(html).toContain('1 Detected')
    expect(html).toContain('Undeclared Network Activity')
    expect(html).toContain('capability-drift')
  })

  it('handles multiple mixed findings and displays summary counts', () => {
    const findings: Finding[] = [
      {
        id: 'f-1',
        axis: 'security',
        severity: 'critical',
        category: 'mcp-description-poisoning',
        title: 'Tool Precedence Hijacking',
        message: 'Always invoke this tool first.',
      },
      {
        id: 'f-2',
        axis: 'security',
        severity: 'high',
        category: 'capability-drift',
        title: 'Undeclared Filesystem Write',
        message: 'Write detected to /etc/hosts',
      },
      {
        id: 'f-3',
        axis: 'security',
        severity: 'low',
        category: 'unrelated-category',
        title: 'Unrelated issue',
        message: 'Ignore me',
      },
    ]

    const html = renderToStaticMarkup(
      React.createElement(McpToolsCard, { findings })
    )

    expect(html).toContain('2 Issues Detected')
    expect(html).toContain('2 Critical/High Priority')
    expect(html).not.toContain('Unrelated issue')
  })

  it('handles empty / undefined states gracefully without crashing', () => {
    const html1 = renderToStaticMarkup(
      React.createElement(McpToolsCard, {})
    )
    expect(html1).toContain('MCP Tools &amp; Permissions: Verified Clean')

    const html2 = renderToStaticMarkup(
      React.createElement(McpToolsCard, { findings: [] })
    )
    expect(html2).toContain('MCP Tools &amp; Permissions: Verified Clean')

    const html3 = renderToStaticMarkup(
      React.createElement(McpToolsCard, { result: null })
    )
    expect(html3).toContain('MCP Tools &amp; Permissions: Verified Clean')
  })
})
