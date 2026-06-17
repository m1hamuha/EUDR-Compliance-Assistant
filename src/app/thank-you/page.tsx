import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Thank You · EUDR Compliance Assistant',
  description: 'Your production place data has been submitted successfully.'
}

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
          <p className="text-muted-foreground mb-6">
            Your production place data has been submitted successfully. The
            importer who invited you has been notified and will review your
            submission. You can now close this page.
          </p>
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
