export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'SkillShield API',
      version: '0.1.0',
      description: 'Validate, score, and secure AI agent skills before they run.',
    },
    servers: [
      { url: '/', description: 'SkillShield API' },
    ],
    paths: {
      '/api/validate': {
        post: {
          summary: 'Validate a skill',
          description: 'Run full validation on skill files',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['files'],
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          path: { type: 'string', example: 'SKILL.md' },
                          content: { type: 'string', example: '---\nname: my-skill\n---' },
                        },
                      },
                    },
                    options: {
                      type: 'object',
                      properties: {
                        policy: { type: 'string', example: 'default' },
                        failOn: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Validation result',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/report': {
        get: {
          summary: 'Get scan report',
          parameters: [
            { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'html', 'pdf', 'sarif'], default: 'json' } },
          ],
          responses: {
            '200': { description: 'Report in requested format' },
            '404': { description: 'Result not found' },
          },
        },
      },
      '/api/github': {
        post: {
          summary: 'Import skill from GitHub',
          description: 'Fetch skill files from a repository and audit repo-level install execution surfaces before validation.',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['owner', 'repo'],
                  properties: {
                    owner: { type: 'string' },
                    repo: { type: 'string' },
                    path: { type: 'string' },
                    branch: { type: 'string' },
                    sha: { type: 'string' },
                    includeExtensions: { type: 'array', items: { type: 'string' } },
                    excludeExtensions: { type: 'array', items: { type: 'string' } },
                    ignorePaths: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Repository files and repositoryAudit fetched' },
            '404': { description: 'Path not found' },
          },
        },
      },
      '/api/policy': {
        post: {
          summary: 'Evaluate findings against policy',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    findings: { type: 'array' },
                    score: { type: 'number' },
                    policy: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Policy evaluation result' } },
        },
      },
      '/api/ai-review': {
        post: {
          summary: 'Run AI-powered review of findings',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    findings: { type: 'array' },
                    skillName: { type: 'string' },
                    provider: { type: 'string', enum: ['openai', 'anthropic'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'AI review result' },
            '501': { description: 'AI review not configured' },
          },
        },
      },
      '/api/approvals': {
        get: {
          summary: 'List approvals',
          parameters: [
            { name: 'scanId', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Approval list' } },
        },
        post: {
          summary: 'Approve or reject a scan',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['scanId', 'action'],
                  properties: {
                    scanId: { type: 'string' },
                    action: { type: 'string', enum: ['approve', 'reject'] },
                    reviewer: { type: 'string' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Approval updated' } },
        },
      },
      '/api/audit': {
        get: {
          summary: 'Query audit logs',
          parameters: [
            { name: 'event', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          ],
          responses: { '200': { description: 'Audit log entries' } },
        },
      },
      '/api/webhooks': {
        get: {
          summary: 'List registered webhooks',
          responses: { '200': { description: 'Webhook list' } },
        },
        post: {
          summary: 'Register a webhook',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'events'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                    secret: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Webhook registered' } },
        },
        delete: {
          summary: 'Delete a webhook',
          parameters: [
            { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Webhook deleted' } },
        },
      },
      '/api/semgrep-rules': {
        get: {
          summary: 'Get Semgrep-compatible rules',
          parameters: [
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'yaml'], default: 'json' } },
          ],
          responses: { '200': { description: 'Rules in requested format' } },
        },
      },
      '/api/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'Service health status' } },
        },
      },
      '/api/compare': {
        post: {
          summary: 'Compare two scan results',
          description: 'Side-by-side comparison of two validation results with diff analysis',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['scanAId', 'scanBId'],
                  properties: {
                    scanAId: { type: 'string', description: 'ID of the first scan' },
                    scanBId: { type: 'string', description: 'ID of the second scan' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Comparison result with score diff, shared/unique findings, and axes diff' },
            '400': { description: 'Missing scan IDs' },
            '404': { description: 'One or both scans not found' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/rules': {
        get: {
          summary: 'Get all built-in scanner rules',
          description: 'Returns threat patterns, secret rules, obfuscation checks, and Semgrep rules',
          responses: {
            '200': { description: 'Complete rule catalog' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/docs': {
        get: {
          summary: 'OpenAPI specification',
          description: 'This document — the full OpenAPI 3.0 spec for the SkillShield API',
          responses: {
            '200': { description: 'OpenAPI JSON specification' },
          },
        },
      },
    },
  }

  return Response.json(spec)
}
