import { LESSONS, TERMS, SITE_URL } from "@/lib/pages";

/** Every address worth indexing. The desk's #screens are not addresses. */
export default function sitemap() {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/learn`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...LESSONS.map((l) => ({ url: `${SITE_URL}/learn/${l.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 })),
    ...TERMS.map((t) => ({ url: `${SITE_URL}/glossary/${t.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }))
  ];
}
