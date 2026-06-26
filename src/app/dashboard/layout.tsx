'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { useI18n, LanguageSwitcher } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  FileDown,
  Settings,
  LogOut,
  Menu,
  X,
  Leaf,
  TrendingUp,
  Map as MapIcon,
  CreditCard,
  History,
  ShieldAlert,
  FileCheck
} from 'lucide-react'

const navigation = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'nav.suppliers', href: '/dashboard/suppliers', icon: Users },
  { key: 'nav.map', href: '/dashboard/map', icon: MapIcon },
  { key: 'nav.analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { key: 'nav.risk', href: '/dashboard/risk', icon: ShieldAlert },
  { key: 'nav.dds', href: '/dashboard/dds', icon: FileCheck },
  { key: 'nav.exports', href: '/dashboard/exports', icon: FileDown },
  { key: 'nav.activity', href: '/dashboard/activity', icon: History },
  { key: 'nav.billing', href: '/dashboard/billing', icon: CreditCard },
  { key: 'nav.settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; companyName: string } | null>(null)

  useEffect(() => {
    const getUser = async () => {
      // apiFetch silently refreshes an expired access token and retries.
      const response = await apiFetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:translate-x-0 print:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-2 h-16 px-6 border-b">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-600/20">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">EUDR Assistant</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            aria-label={t('a11y.closeMenu')}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "text-gray-600 font-medium hover:bg-emerald-50/60 hover:text-emerald-700"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {t(item.key)}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="mb-3 flex justify-center">
            <LanguageSwitcher />
          </div>
          {user && (
            <div className="mb-2 px-3">
              <p className="text-sm font-medium truncate">{user.companyName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('common.signOut')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 print:pl-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b lg:hidden print:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('a11y.openMenu')}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">EUDR Assistant</span>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
