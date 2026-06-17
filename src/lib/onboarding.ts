export interface OnboardingInput {
  totalSuppliers: number
  totalPlaces: number
  completedSuppliers: number
  hasExports: boolean
}

export interface OnboardingStep {
  key: string
  label: string
  description: string
  done: boolean
  href: string
  cta: string
}

export interface OnboardingState {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  /** % of steps complete (0-100). */
  progress: number
  allDone: boolean
}

/**
 * Activation checklist shown on the dashboard. Each step is derived from data
 * the account already has, so progress updates automatically as the user works
 * through the core flow (invite → collect → complete → export).
 */
export function buildOnboarding(input: OnboardingInput): OnboardingState {
  const completionRate =
    input.totalSuppliers > 0 ? (input.completedSuppliers / input.totalSuppliers) * 100 : 0

  const steps: OnboardingStep[] = [
    {
      key: 'add-supplier',
      label: 'Add your first supplier',
      description: 'Invite a supplier to start collecting EUDR data.',
      done: input.totalSuppliers > 0,
      href: '/dashboard/suppliers',
      cta: 'Add supplier'
    },
    {
      key: 'build-supply-chain',
      label: 'Build out your supply chain',
      description: 'Add at least 3 suppliers (a CSV import is fastest).',
      done: input.totalSuppliers >= 3,
      href: '/dashboard/suppliers',
      cta: 'Import suppliers'
    },
    {
      key: 'collect-place',
      label: 'Collect a production place',
      description: 'Have a supplier submit plot coordinates via their portal.',
      done: input.totalPlaces > 0,
      href: '/dashboard/suppliers',
      cta: 'View suppliers'
    },
    {
      key: 'half-complete',
      label: 'Reach 50% data collection',
      description: 'Get at least half of your suppliers to completed.',
      done: completionRate >= 50,
      href: '/dashboard/analytics',
      cta: 'View analytics'
    },
    {
      key: 'first-export',
      label: 'Generate your first export',
      description: 'Produce an EU-ready GeoJSON package.',
      done: input.hasExports,
      href: '/dashboard/exports',
      cta: 'Generate export'
    }
  ]

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length

  return {
    steps,
    completedCount,
    totalCount,
    progress: Math.round((completedCount / totalCount) * 100),
    allDone: completedCount === totalCount
  }
}
