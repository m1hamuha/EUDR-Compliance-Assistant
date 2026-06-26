import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "EUDR Compliance Assistant",
    template: "%s | EUDR Compliance Assistant",
  },
  description:
    "Automate EUDR geolocation data collection from suppliers. Collect production-place coordinates, assess deforestation risk, and generate Due Diligence Statements.",
  keywords: [
    "EUDR",
    "EU Deforestation Regulation",
    "compliance",
    "geolocation",
    "supply chain",
    "due diligence statement",
    "deforestation risk",
  ],
  openGraph: {
    type: "website",
    siteName: "EUDR Compliance Assistant",
    title: "EUDR Compliance Assistant",
    description:
      "Automate EUDR geolocation data collection from suppliers. Collect production-place coordinates, assess deforestation risk, and generate Due Diligence Statements.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "EUDR Compliance Assistant",
    description:
      "Automate EUDR geolocation data collection from suppliers, assess deforestation risk, and generate Due Diligence Statements.",
  },
};

// The product renders a light surface everywhere (white page, sticky white
// header); there is no dark theme toggle. Pin the mobile UA chrome to white and
// declare the colour scheme so dark-mode phones don't tint the toolbar or
// auto-darken native form controls against the light UI.
export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
