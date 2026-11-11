import Link from "next/link";
import { notFound } from "next/navigation";
import { DocShell, Inline, JsonLd } from "@/components/Doc";
import { LESSONS, SITE_NAME, SITE_URL, plain, termsIn } from "@/lib/pages";
import NewsNote from "@/components/NewsNote";
import { noteId } from "@/lib/notes";

export const dynamicParams = false;
export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const l = LESSONS.find((x) => x.slug === slug);
  if (!l) return {};
  return {
    title: `${l.title} | ${SITE_NAME}`,
    description: `${l.summary} ${plain(l.b[0])}`.slice(0, 158),
    alternates: { canonical: `/learn/${l.slug}` },
    openGraph: { title: l.title, description: l.summary, type: "article", url: `/learn/${l.slug}`, siteName: SITE_NAME }
  };
}

export default async function Lesson({ params }) {
  const { slug } = await params;
  const i = LESSONS.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const l = LESSONS[i];
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];
  const terms = termsIn([...l.b, l.story, l.risk].join(" ")).slice(0, 8);

  return (
    <DocShell crumbs={[{ t: "Lessons", href: "/learn" }, { t: `Lesson ${l.n}` }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: l.title,
          description: l.summary,
          educationalLevel: "Beginner",
          inLanguage: "en",
          isAccessibleForFree: true,
          url: `${SITE_URL}/learn/${l.slug}`,
          isPartOf: { "@type": "Course", name: "Markets from zero", url: `${SITE_URL}/learn` },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }
        }}
      />
      <article className="doc-article">
        <p className="doc-k">Lesson {l.n} of {LESSONS.length} · {l.trn}</p>
        <h1>{l.title}</h1>
        <p className="doc-lede"><Inline text={l.s} /></p>

        {l.b.map((p, k) => <p key={k}><Inline text={p} /></p>)}

        {l.story && (
          <section className="doc-aside">
            <h2>A real example</h2>
            <p><Inline text={l.story} /></p>
          </section>
        )}
        {l.risk && (
          <section className="doc-aside warn">
            <h2>Where this goes wrong</h2>
            <p><Inline text={l.risk} /></p>
          </section>
        )}
        {/* Fetched in the browser, so the page itself stays fixed for search. */}
        <NewsNote set="lessons" id={noteId.lesson(l)} />

        {terms.length > 0 && (
          <p className="doc-terms">
            Terms used here:{" "}
            {terms.map((t, k) => (
              <span key={t.slug}>{k > 0 && ", "}<Link href={`/glossary/${t.slug}`}>{t.term}</Link></span>
            ))}
          </p>
        )}

        <p className="doc-next">
          Want this applied to today&apos;s market? <Link href="/#TUT">Open the lesson on the desk</Link> and put the
          question to the analyst.
        </p>
      </article>

      <nav className="doc-pager" aria-label="Lessons">
        {prev ? <Link href={`/learn/${prev.slug}`}><span>Previous</span>{prev.title}</Link> : <span />}
        {next ? <Link href={`/learn/${next.slug}`} className="r"><span>Next</span>{next.title}</Link> : <span />}
      </nav>
    </DocShell>
  );
}
