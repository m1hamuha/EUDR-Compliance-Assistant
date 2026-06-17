import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EUDR Compliance Assistant",
  description: "Automate EUDR geolocation data collection from suppliers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
