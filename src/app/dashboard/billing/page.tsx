'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, Zap } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { PLANS, PLAN_ORDER } from '@/lib/plans'

interface Usage {
  plan: string
  usage: { suppliers: number; exportsThisMonth: number }
  remaining: { suppliers: number | null; exports: number | null }
}

function limitLabel(n: number | null) {
  return n === null ? 'Unlimited' : String(n)
}

export default function BillingPage() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/account/usage')
      if (res.ok) setUsage(await res.json())
    } catch (error) {
      console.error('Failed to load usage:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const choosePlan = async (plan: string) => {
    setChanging(plan)
    setMessage(null)
    try {
      const res = await apiFetch('/api/account/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      })
      if (res.ok) {
        const data = await res.json()
        setMessage(`You're now on the ${PLANS[data.plan as keyof typeof PLANS].name} plan.`)
        await load()
      } else {
        setMessage('Could not change plan. Please try again.')
      }
    } catch {
      setMessage('Could not change plan. Please try again.')
    } finally {
      setChanging(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentPlan = usage?.plan
  const currentDef = currentPlan ? PLANS[currentPlan as keyof typeof PLANS] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plans &amp; billing</h1>
        <p className="text-muted-foreground">Choose the plan that fits your supply chain</p>
      </div>

      {usage && currentDef && (
        <Card>
          <CardHeader><CardTitle>Current usage — {currentDef.name} plan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UsageBar label="Suppliers" used={usage.usage.suppliers} max={currentDef.maxSuppliers} />
              <UsageBar label="Exports this month" used={usage.usage.exportsThisMonth} max={currentDef.maxExportsPerMonth} />
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key]
          const isCurrent = key === currentPlan
          return (
            <Card key={key} className={plan.highlight ? 'border-emerald-400 shadow-md' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.highlight && <Badge variant="success"><Zap className="h-3 w-3 mr-1" />Popular</Badge>}
                </div>
                <div className="mt-2">
                  {plan.plan === 'ENTERPRISE' ? (
                    <span className="text-2xl font-bold">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>Current plan</Button>
                ) : (
                  <Button
                    className={`w-full ${plan.highlight ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    variant={plan.highlight ? 'default' : 'outline'}
                    onClick={() => choosePlan(key)}
                    disabled={changing !== null}
                  >
                    {changing === key && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {plan.plan === 'ENTERPRISE' ? 'Contact sales' : 'Choose plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Demo environment: plan changes apply instantly. In production, paid plans are processed
        through a payment provider.
      </p>
    </div>
  )
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max === null ? 0 : Math.min(100, Math.round((used / max) * 100))
  const atLimit = max !== null && used >= max
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{used} / {limitLabel(max)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${atLimit ? 'bg-red-500' : 'bg-emerald-600'}`}
          style={{ width: max === null ? '12%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}
