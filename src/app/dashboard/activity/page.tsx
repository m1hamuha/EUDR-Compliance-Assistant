'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  History,
  UserPlus,
  LogIn,
  Trash2,
  FileDown,
  KeyRound,
  CreditCard,
  Users,
  MapPin,
  Settings as SettingsIcon
} from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  resourceType: string
  resourceId: string | null
  userEmail: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  USER_LOGIN: { label: 'Signed in', icon: LogIn, color: 'text-slate-500' },
  USER_LOGOUT: { label: 'Signed out', icon: LogIn, color: 'text-slate-500' },
  USER_REGISTER: { label: 'Account created', icon: UserPlus, color: 'text-emerald-600' },
  SUPPLIER_CREATE: { label: 'Supplier added', icon: Users, color: 'text-emerald-600' },
  SUPPLIER_UPDATE: { label: 'Supplier updated', icon: Users, color: 'text-amber-600' },
  SUPPLIER_DELETE: { label: 'Supplier deleted', icon: Trash2, color: 'text-red-600' },
  SUPPLIER_INVITE: { label: 'Supplier invited', icon: UserPlus, color: 'text-emerald-600' },
  PRODUCTION_PLACE_CREATE: { label: 'Production place added', icon: MapPin, color: 'text-emerald-600' },
  PRODUCTION_PLACE_UPDATE: { label: 'Production place updated', icon: MapPin, color: 'text-amber-600' },
  PRODUCTION_PLACE_DELETE: { label: 'Production place deleted', icon: Trash2, color: 'text-red-600' },
  EXPORT_GENERATE: { label: 'Export generated', icon: FileDown, color: 'text-emerald-600' },
  EXPORT_DOWNLOAD: { label: 'Export downloaded', icon: FileDown, color: 'text-slate-500' },
  SETTINGS_UPDATE: { label: 'Settings updated', icon: SettingsIcon, color: 'text-amber-600' },
  PASSWORD_CHANGE: { label: 'Password changed', icon: KeyRound, color: 'text-amber-600' },
  PLAN_UPGRADE: { label: 'Plan changed', icon: CreditCard, color: 'text-emerald-600' }
}

function describe(log: AuditLog): string {
  const m = log.metadata ?? {}
  if (log.action === 'PLAN_UPGRADE' && m.from && m.to) return `${m.from} → ${m.to}`
  if (m.name) return String(m.name)
  if (log.action === 'EXPORT_GENERATE' && m.commodity) return String(m.commodity)
  return log.resourceType
}

export default function ActivityPage() {
  const { t } = useI18n()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/audit?limit=100')
      if (res.ok) setLogs((await res.json()).logs ?? [])
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('act.title')}</h1>
        <p className="text-muted-foreground">{t('act.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            {t('act.auditLog')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('act.empty')}</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-3">
              {logs.map((log) => {
                const meta = ACTION_META[log.action] ?? { label: log.action, icon: History, color: 'text-slate-500' }
                const Icon = meta.icon
                return (
                  <li key={log.id} className="mb-6 ml-6">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200">
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    </span>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-medium">{meta.label}</div>
                      <time className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</time>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {describe(log)}
                      {log.userEmail && <span className="ml-2"><Badge variant="outline">{log.userEmail}</Badge></span>}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
