import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocShell, JsonLd } from "@/components/Doc";
import { Markdown } from "@/lib/markdown";
import { SITE_NAME, SITE_URL } from "@/lib/pages";
import { getPublished, longDate, readingMinutes } from "@/lib/articles";

export const dynamic = "force-dynamic";

// One read shared by the metadata and the page.
const load = cache((slug) => getPublished(slug));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { article: a } = await load(slug);
  if (!a) return { title: `Article | ${SITE_NAME}`, robots: { index: false } };
  return {
    title: `${a.title} | ${SITE_NAME}`,
    description: a.summary.slice(0, 158),
    alternates: { canonical: `/articles/${a.slug}` },
    authors: [{ name: a.author_name }],
    openGraph: {
      title: a.title,
      description: a.summary,
      type: "article",
      url: `/articles/${a.slug}`,
      siteName: SITE_NAME,
      publishedTime: a.published_at,
      modifiedTime: a.updated_at,
      authors: [a.author_name]
    }
  };
}

export default async function Article({ params }) {
  const { slug } = await params;
  const { ok, article: a } = await load(slug);

  if (!a) {
    if (ok) notFound();
    return (
      <DocShell crumbs={[{ t: "Articles", href: "/articles" }]}>
        <h1>This article could not be loaded</h1>
        <p className="doc-empty">The database did not answer. Try again in a minute.</p>
      </DocShell>
    );
  }

  return (
    <DocShell crumbs={[{ t: "Articles", href: "/articles" }, { t: a.author_name }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.summary,
          datePublished: a.published_at,
          dateModified: a.updated_at,
          inLanguage: "en",
          isAccessibleForFree: true,
          mainEntityOfPage: `${SITE_URL}/articles/${a.slug}`,
          author: { "@type": "Person", name: a.author_name },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }
        }}
      />
      <article className="doc-article">
        <p className="doc-k">Article · {readingMinutes(a.body)} min read</p>
        <h1>{a.title}</h1>
        <p className="doc-lede">{a.summary}</p>
        <p className="doc-byline">
          By {a.author_name} · <time dateTime={a.published_at}>{longDate(a.published_at)}</time>
        </p>

        <Markdown text={a.body} className="doc-body" />

        <p className="doc-next">
          Written by a reader and reviewed by the editor before publication. The views are the author&apos;s, and none
          of it is investment advice. <Link href="/articles/submit">Submit your own article</Link>.
        </p>
      </article>

      <nav className="doc-pager" aria-label="Articles">
        <Link href="/articles"><span>More</span>All articles</Link>
        <Link href="/" className="r"><span>Live</span>Open the desk</Link>
      </nav>
    </DocShell>
  );
}
