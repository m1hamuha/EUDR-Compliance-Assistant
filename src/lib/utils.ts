import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const COMMODITY_LABELS: Record<string, string> = {
  CATTLE: 'Cattle',
  COCOA: 'Cocoa',
  COFFEE: 'Coffee',
  PALM_OIL: 'Palm Oil',
  RUBBER: 'Rubber',
  SOY: 'Soy',
  WOOD: 'Wood'
}

export const COMMODITY_MVP_FOCUS = ['COFFEE', 'COCOA', 'WOOD']

export const COUNTRY_CODES = [
  { code: 'BR', name: 'Brazil' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'CO', name: 'Colombia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'UG', name: 'Uganda' },
  { code: 'PE', name: 'Peru' },
  { code: 'GH', name: 'Ghana' },
  { code: 'CI', name: 'Ivory Coast' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'IN', name: 'India' },
  { code: 'AR', name: 'Argentina' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' }
]
