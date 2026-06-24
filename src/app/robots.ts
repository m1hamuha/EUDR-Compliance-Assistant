import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Allow crawling of public pages; keep authenticated app routes, API endpoints,
// and token-gated supplier portals out of search indexes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/supplier/", "/report", "/thank-you"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
