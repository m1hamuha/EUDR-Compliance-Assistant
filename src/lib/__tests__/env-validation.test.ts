import { validateEnv, tryValidateEnv } from '../env-validation'

const VALID_ENV: Record<string, string> = {
  DATABASE_URL: 'postgresql://localhost:5432/db',
  AUTH_SECRET: '0'.repeat(32),
  REFRESH_SECRET: '1'.repeat(32),
  RESEND_API_KEY: 're_test_key',
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  R2_BUCKET_NAME: 'bucket',
  R2_PUBLIC_URL: 'https://files.example.com',
  NEXT_PUBLIC_APP_URL: 'https://app.example.com'
}

describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ...VALID_ENV }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('passes with a complete, valid environment', () => {
    expect(() => validateEnv()).not.toThrow()
    expect(tryValidateEnv()).toBe(true)
  })

  it('fails when AUTH_SECRET is too short', () => {
    process.env.AUTH_SECRET = 'short'
    expect(() => validateEnv()).toThrow(/AUTH_SECRET/)
    expect(tryValidateEnv()).toBe(false)
  })

  it('fails when a required variable is missing', () => {
    delete process.env.RESEND_API_KEY
    expect(() => validateEnv()).toThrow(/RESEND_API_KEY/)
  })

  it('fails when a URL variable is not a valid URL', () => {
    process.env.R2_PUBLIC_URL = 'not-a-url'
    expect(tryValidateEnv()).toBe(false)
  })
})
