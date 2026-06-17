import {
  cn,
  formatDate,
  formatDateTime,
  formatBytes,
  generateToken,
  capitalizeFirst,
  slugify,
  COMMODITY_LABELS,
  COMMODITY_MVP_FOCUS,
  COUNTRY_CODES
} from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-2')).toBe('px-2 py-2')
  })

  it('dedupes conflicting tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1024 ** 3)).toBe('1 GB')
  })
})

describe('formatDate', () => {
  it('formats a Date object', () => {
    expect(formatDate(new Date('2026-02-05T00:00:00Z'))).toMatch(/2026/)
  })

  it('accepts an ISO string', () => {
    expect(formatDate('2026-02-05T00:00:00Z')).toMatch(/2026/)
  })
})

describe('formatDateTime', () => {
  it('includes the year', () => {
    expect(formatDateTime('2026-02-05T10:30:00Z')).toMatch(/2026/)
  })
})

describe('generateToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns unique tokens', () => {
    expect(generateToken()).not.toBe(generateToken())
  })
})

describe('capitalizeFirst', () => {
  it('capitalizes the first letter and lowercases the rest', () => {
    expect(capitalizeFirst('hELLO')).toBe('Hello')
  })
})

describe('slugify', () => {
  it('slugifies a string', () => {
    expect(slugify('Hello World! 123')).toBe('hello-world-123')
  })

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Coffee Farm--  ')).toBe('coffee-farm')
  })
})

describe('constants', () => {
  it('has a label for every commodity', () => {
    expect(Object.keys(COMMODITY_LABELS)).toEqual(
      expect.arrayContaining(['CATTLE', 'COCOA', 'COFFEE', 'PALM_OIL', 'RUBBER', 'SOY', 'WOOD'])
    )
  })

  it('focuses on the MVP commodities', () => {
    expect(COMMODITY_MVP_FOCUS).toEqual(['COFFEE', 'COCOA', 'WOOD'])
  })

  it('exposes ISO country codes', () => {
    const brazil = COUNTRY_CODES.find(c => c.code === 'BR')
    expect(brazil?.name).toBe('Brazil')
  })
})
