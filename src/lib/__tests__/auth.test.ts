import { validatePassword, checkRateLimit, clearLoginAttempts } from '../auth'

describe('Auth Utilities', () => {
  describe('validatePassword', () => {
    it('should accept a strong password', () => {
      const result = validatePassword('SecureP@ss123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject short passwords', () => {
      const result = validatePassword('Short1!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('12 characters'))).toBe(true)
    })

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('lowercase123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true)
    })

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('UPPERCASE123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers!@#')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('number'))).toBe(true)
    })

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecialChars123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('special character'))).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      clearLoginAttempts('test@example.com')
    })

    it('should allow first attempt', async () => {
      const result = await checkRateLimit('test@example.com')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })

    it('should track failed attempts', async () => {
      await checkRateLimit('test@example.com')
      await checkRateLimit('test@example.com')
      await checkRateLimit('test@example.com')

      const result = await checkRateLimit('test@example.com')
      expect(result.remaining).toBe(2)
    })
  })
})