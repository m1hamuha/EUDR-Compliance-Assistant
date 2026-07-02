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
  Settings as SettingsIcon,
  FileCheck
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

const ACTION_META: Record<string, { labelKey: string; icon: React.ElementType; color: string }> = {
  USER_LOGIN: { labelKey: 'audit.USER_LOGIN', icon: LogIn, color: 'text-slate-500' },
  USER_LOGOUT: { labelKey: 'audit.USER_LOGOUT', icon: LogIn, color: 'text-slate-500' },
  USER_REGISTER: { labelKey: 'audit.USER_REGISTER', icon: UserPlus, color: 'text-emerald-600' },
  SUPPLIER_CREATE: { labelKey: 'audit.SUPPLIER_CREATE', icon: Users, color: 'text-emerald-600' },
  SUPPLIER_UPDATE: { labelKey: 'audit.SUPPLIER_UPDATE', icon: Users, color: 'text-amber-600' },
  SUPPLIER_DELETE: { labelKey: 'audit.SUPPLIER_DELETE', icon: Trash2, color: 'text-red-600' },
  SUPPLIER_INVITE: { labelKey: 'audit.SUPPLIER_INVITE', icon: UserPlus, color: 'text-emerald-600' },
  PRODUCTION_PLACE_CREATE: { labelKey: 'audit.PRODUCTION_PLACE_CREATE', icon: MapPin, color: 'text-emerald-600' },
  PRODUCTION_PLACE_UPDATE: { labelKey: 'audit.PRODUCTION_PLACE_UPDATE', icon: MapPin, color: 'text-amber-600' },
  PRODUCTION_PLACE_DELETE: { labelKey: 'audit.PRODUCTION_PLACE_DELETE', icon: Trash2, color: 'text-red-600' },
  EXPORT_GENERATE: { labelKey: 'audit.EXPORT_GENERATE', icon: FileDown, color: 'text-emerald-600' },
  EXPORT_DOWNLOAD: { labelKey: 'audit.EXPORT_DOWNLOAD', icon: FileDown, color: 'text-slate-500' },
  SETTINGS_UPDATE: { labelKey: 'audit.SETTINGS_UPDATE', icon: SettingsIcon, color: 'text-amber-600' },
  PASSWORD_CHANGE: { labelKey: 'audit.PASSWORD_CHANGE', icon: KeyRound, color: 'text-amber-600' },
  PLAN_UPGRADE: { labelKey: 'audit.PLAN_UPGRADE', icon: CreditCard, color: 'text-emerald-600' },
  DDS_RECORD: { labelKey: 'audit.DDS_RECORD', icon: FileCheck, color: 'text-emerald-600' }
}

function describe(log: AuditLog): string {
  const m = log.metadata ?? {}
  if (log.action === 'PLAN_UPGRADE' && m.from && m.to) return `${m.from} → ${m.to}`
  if (log.action === 'DDS_RECORD' && m.reference) return String(m.reference)
  if (m.name) return String(m.name)
  if (log.action === 'EXPORT_GENERATE' && m.commodity) return String(m.commodity)
  return log.resourceType
}

export default function ActivityPage() {
  const { t } = useI18n()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/audit?limit=100')
      if (res.ok) setLogs((await res.json()).logs ?? [])
      else setLoadFailed(true)
    } catch (error) {
      console.error('Failed to load activity:', error)
      setLoadFailed(true)
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
          ) : loadFailed ? (
            <p role="alert" className="text-sm text-red-600 py-6 text-center">{t('act.loadError')}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('act.empty')}</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-3">
              {logs.map((log) => {
                const meta = ACTION_META[log.action]
                const Icon = meta?.icon ?? History
                const color = meta?.color ?? 'text-slate-500'
                const label = meta ? t(meta.labelKey) : log.action
                return (
                  <li key={log.id} className="mb-6 ml-6">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200">
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </span>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-medium">{label}</div>
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
