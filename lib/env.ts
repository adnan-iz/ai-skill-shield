import { z } from 'zod'
import { logger } from './logger'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().startsWith('postgres').optional(),
  PORT: z.coerce.number().optional().default(3000),
  HOSTNAME: z.string().optional().default('0.0.0.0'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('https://ai-skill-shield.suppeng.com'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENCODE_GO_API_KEY: z.string().optional(),
  OPENCODE_GO_MODEL: z.string().optional(),
  OPENCODE_ZEN_API_KEY: z.string().optional(),
  OPENCODE_ZEN_MODEL: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      logger.error('Invalid environment variables', {
        errors: result.error.flatten().fieldErrors,
      })
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment variables. Check logs.')
      }
      _env = envSchema.parse({})
    } else {
      _env = result.data
    }
  }
  return _env
}
