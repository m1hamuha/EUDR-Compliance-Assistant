import type { MetadataRoute } from "next";

// Web app manifest (Next.js file convention -> served at /manifest.webmanifest
// and auto-linked from <head>). Without it, "Add to Home Screen" on
// Android/Chrome produces an unbranded generic shortcut. Icon and colors reuse
// the existing brand assets: app/icon.svg and the light UI's white surface
// (see layout.tsx viewport.themeColor).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EUDR Compliance Assistant",
    short_name: "EUDR Assistant",
    description:
      "Automate EUDR geolocation data collection from suppliers, assess deforestation risk, and generate Due Diligence Statements.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
