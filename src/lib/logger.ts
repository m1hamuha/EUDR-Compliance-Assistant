type Level = 'debug' | 'info' | 'warn' | 'error'

export interface LogFields {
  [key: string]: unknown
}

/** Normalises an Error into serialisable fields. */
export function errorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    return { error: error.message, stack: error.stack, name: error.name }
  }
  return { error: String(error) }
}

function emit(level: Level, message: string, fields?: LogFields): void {
  const entry = JSON.stringify({ level, time: new Date().toISOString(), message, ...(fields ?? {}) })
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.log(entry)
}

/**
 * Minimal structured (JSON) logger. Keeps log lines machine-parseable for any
 * downstream aggregator (Datadog, Loki, CloudWatch) without adding a dependency.
 */
export const logger = {
  debug: (message: string, fields?: LogFields) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', message, fields)
  },
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields) => emit('warn', message, fields),
  error: (message: string, fields?: LogFields) => emit('error', message, fields)
}
