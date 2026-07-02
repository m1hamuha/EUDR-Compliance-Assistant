'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

interface UserData {
  id: string
  companyName: string
  email: string
  country: string
  plan: string
  createdAt: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Change password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleChangePassword = async () => {
    setPwMessage(null)
    if (pw.next !== pw.confirm) {
      setPwMessage({ type: 'error', text: t('set.pw.mismatch') })
      return
    }
    setPwSaving(true)
    try {
      const res = await apiFetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setPwMessage({ type: 'success', text: t('set.pw.success') })
        setPw({ current: '', next: '', confirm: '' })
      } else {
        const detail = data?.error?.details?.[0]
        setPwMessage({ type: 'error', text: detail ?? data?.error?.message ?? t('set.pw.fail') })
      }
    } catch {
      setPwMessage({ type: 'error', text: t('set.pw.fail') })
    } finally {
      setPwSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await apiFetch('/api/account', { method: 'DELETE' })
      if (res.ok) {
        router.push('/')
      } else {
        alert('Could not delete account. Please try again.')
      }
    } catch {
      alert('Could not delete account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const response = await apiFetch('/api/account/export')
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eudr-data-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('Could not export your data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiFetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('set.title')}</h1>
        <p className="text-muted-foreground">{t('set.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('set.account')}</CardTitle>
          <CardDescription>{t('set.account.sub')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('set.companyName')}</Label>
              <Input value={user?.companyName || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('set.email')}</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('set.country')}</Label>
              <Input value={user?.country || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('set.plan')}</Label>
              <Input value={user?.plan || ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('set.subscription')}</CardTitle>
          <CardDescription>{t('set.subscription.sub')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
            <div>
              <div className="font-medium">
                {user?.plan === 'TRIAL' ? t('set.trialPlan') : t('set.activeSub')}
              </div>
              <div className="text-sm text-muted-foreground">
                {user?.plan === 'TRIAL' ? t('set.trialMsg') : t('set.activeMsg')}
              </div>
            </div>
            <Link href="/dashboard/billing">
              <Button>
                {user?.plan === 'TRIAL' ? t('common.upgrade') : t('set.manage')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('set.security')}</CardTitle>
          <CardDescription>{t('set.security.sub')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pwMessage && (
            <div role="status" aria-live="polite" className={`rounded-lg px-3 py-2 text-sm ${pwMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {pwMessage.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pw-current">{t('set.pw.current')}</Label>
              <Input id="pw-current" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-new">{t('set.pw.new')}</Label>
              <Input id="pw-new" type="password" placeholder={t('auth.passwordMin')} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">{t('set.pw.confirm')}</Label>
              <Input id="pw-confirm" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={pwSaving || !pw.current || !pw.next}>
            {pwSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('set.pw.change')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('set.data')}</CardTitle>
          <CardDescription>{t('set.data.sub')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">{t('set.export')}</div>
              <div className="text-sm text-muted-foreground">
                {t('set.export.sub')}
              </div>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled={exporting}>
              {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('set.export.button')}
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <div className="font-medium text-red-600">{t('set.delete')}</div>
              <div className="text-sm text-muted-foreground">
                {t('set.delete.sub')}
              </div>
            </div>
            <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); setDeleteConfirm('') }}>
              <DialogTrigger asChild>
                <Button variant="destructive">{t('set.delete.button')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('set.delete.confirmTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('set.delete.confirmBody', { keyword: 'DELETE' })}
                  </DialogDescription>
                </DialogHeader>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== 'DELETE' || deleting}
                  >
                    {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('set.delete.final')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
