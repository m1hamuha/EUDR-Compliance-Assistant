import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Public, indexable marketing/auth routes. Authenticated dashboard pages and
// token-gated supplier portals are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/login", priority: 0.5 },
    { path: "/signup", priority: 0.8 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${appUrl}${path}`,
    changeFrequency: "monthly",
    priority,
  }));
}
