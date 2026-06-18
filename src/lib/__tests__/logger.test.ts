import { logger, errorFields } from '../logger'

describe('logger', () => {
  let logSpy: jest.SpyInstance
  let errSpy: jest.SpyInstance

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    logSpy.mockRestore()
    errSpy.mockRestore()
  })

  it('emits a structured JSON line for info with fields', () => {
    logger.info('hello', { requestId: 'abc', count: 2 })
    expect(logSpy).toHaveBeenCalledTimes(1)
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry).toMatchObject({ level: 'info', message: 'hello', requestId: 'abc', count: 2 })
    expect(typeof entry.time).toBe('string')
  })

  it('routes error level to console.error', () => {
    logger.error('boom', { route: '/x' })
    expect(errSpy).toHaveBeenCalledTimes(1)
    const entry = JSON.parse(errSpy.mock.calls[0][0])
    expect(entry.level).toBe('error')
    expect(entry.route).toBe('/x')
  })

  it('errorFields serialises an Error', () => {
    const fields = errorFields(new Error('nope'))
    expect(fields.error).toBe('nope')
    expect(fields.name).toBe('Error')
    expect(typeof fields.stack).toBe('string')
  })

  it('errorFields handles non-Error values', () => {
    expect(errorFields('plain')).toEqual({ error: 'plain' })
  })
})
