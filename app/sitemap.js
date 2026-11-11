import { LESSONS, TERMS, SITE_URL } from "@/lib/pages";
import { listPublished } from "@/lib/articles";

// Rebuilt hourly, so a newly approved article reaches the sitemap without a deploy.
export const revalidate = 3600;

/** Every address worth indexing. The desk's #screens are not addresses. */
export default async function sitemap() {
  const now = new Date();
  // If the database does not answer, the sitemap still lists everything else.
  const { articles } = await listPublished(1000);
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/learn`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ...articles.map((a) => ({ url: `${SITE_URL}/articles/${a.slug}`, lastModified: new Date(a.published_at), changeFrequency: "monthly", priority: 0.7 })),
    ...LESSONS.map((l) => ({ url: `${SITE_URL}/learn/${l.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 })),
    ...TERMS.map((t) => ({ url: `${SITE_URL}/glossary/${t.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }))
  ];
}
