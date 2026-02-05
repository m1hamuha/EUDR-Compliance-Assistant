import { cleanExpiredTokens } from './auth'

if (typeof window === 'undefined') {
  setInterval(async () => {
    try {
      await cleanExpiredTokens()
    } catch (error) {
      console.error('Token cleanup failed:', error)
    }
  }, 24 * 60 * 60 * 1000)
}
