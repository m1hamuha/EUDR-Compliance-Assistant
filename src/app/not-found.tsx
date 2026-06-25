import Link from 'next/link'
import { Leaf, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
      <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-600/20 mb-8">
          <Leaf className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-emerald-600">404</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          This page could not be found
        </h1>
        <p className="mt-4 max-w-md text-slate-600">
          The link may be broken or the page may have moved. Let&apos;s get you
          back on track.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
