import { validatePassword } from '../auth'

describe('Password Validation', () => {
  it('accepts valid passwords', () => {
    const result = validatePassword('SecureP@ss123!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects passwords shorter than 12 characters', () => {
    const result = validatePassword('Short1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 12 characters')
  })

  it('rejects passwords without uppercase', () => {
    const result = validatePassword('lowercase123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects passwords without lowercase', () => {
    const result = validatePassword('UPPERCASE123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('rejects passwords without numbers', () => {
    const result = validatePassword('NoNumbers!!!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('rejects passwords without special characters', () => {
    const result = validatePassword('NoSpecial123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('collects multiple errors', () => {
    const result = validatePassword('weak')
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })

  it('accepts edge case: exactly 12 characters with all requirements', () => {
    const result = validatePassword('Aa1!Aa1!Aa1!')
    expect(result.valid).toBe(true)
  })
})
