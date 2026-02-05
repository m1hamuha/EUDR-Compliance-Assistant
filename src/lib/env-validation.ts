import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url()
})

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues.map(issue =>
      `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n')
    throw new Error(`Invalid environment variables:\n${errors}`)
  }
}

export function tryValidateEnv(): boolean {
  const result = envSchema.safeParse(process.env)
  return result.success
}

export type Env = z.infer<typeof envSchema>
