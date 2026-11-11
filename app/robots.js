import { SITE_URL } from "@/lib/pages";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
