import Link from 'next/link'
import { Coffee, MapPin, FileCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">EUDR Compliance Assistant</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">
            Collect EUDR Geolocation Data in Minutes, Not Weeks
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Automate supplier data collection with mobile-friendly forms, 
            real-time validation, and EU-compliant GeoJSON exports.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">Learn More</Button>
            </Link>
          </div>
        </div>

        <div id="features" className="grid md:grid-cols-3 gap-8 mt-24">
          <Card>
            <CardContent className="p-6">
              <MapPin className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Easy Data Collection</h3>
              <p className="text-muted-foreground">
                Suppliers can draw polygons or drop pins directly on a map. 
                GPS auto-capture makes it foolproof.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <FileCheck className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">EUDR-Compliant Validation</h3>
              <p className="text-muted-foreground">
                Automatic validation ensures coordinates have 6 decimal places, 
                proper polygons, and valid WGS84 format.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Clock className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Instant Exports</h3>
              <p className="text-muted-foreground">
                Generate ready-to-upload GeoJSON packages with summary CSVs 
                and validation reports in one click.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join importers who are already using EUDR Compliance Assistant
          </p>
          <Link href="/signup">
            <Button size="lg">Create Free Account</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2026 EUDR Compliance Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
