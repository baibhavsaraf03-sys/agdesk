import Link from "next/link";
import { notFound } from "next/navigation";
import { DocShell, JsonLd } from "@/components/Doc";
import { TERMS, LESSONS, SITE_NAME, SITE_URL, plain, termsIn } from "@/lib/pages";
import NewsNote from "@/components/NewsNote";
import { noteId } from "@/lib/notes";

export const dynamicParams = false;
export function generateStaticParams() {
  return TERMS.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }) {
  const { term } = await params;
  const t = TERMS.find((x) => x.slug === term);
  if (!t) return {};
  return {
    title: `What is ${t.term}? | ${SITE_NAME}`,
    description: t.def.slice(0, 158),
    alternates: { canonical: `/glossary/${t.slug}` }
  };
}

export default async function Term({ params }) {
  const { term } = await params;
  const t = TERMS.find((x) => x.slug === term);
  if (!t) notFound();
  const related = termsIn(t.def, t.slug).slice(0, 6);
  // Lessons that actually use the word, so the definition leads somewhere.
  const needle = t.term.toLowerCase();
  const lessons = LESSONS.filter((l) => plain([l.t, l.s, ...l.b, l.story, l.risk].join(" ")).toLowerCase().includes(needle)).slice(0, 4);

  return (
    <DocShell crumbs={[{ t: "Glossary", href: "/glossary" }, { t: t.term }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: t.term,
          description: t.def,
          url: `${SITE_URL}/glossary/${t.slug}`,
          inDefinedTermSet: { "@type": "DefinedTermSet", name: `${SITE_NAME} markets glossary`, url: `${SITE_URL}/glossary` }
        }}
      />
      <article className="doc-article">
        <p className="doc-k">Glossary</p>
        <h1>{t.term}</h1>
        <p className="doc-lede">{t.def}</p>
        {/* Fetched in the browser, so the page itself stays fixed for search. */}
        <NewsNote set="glos" id={noteId.term(t.term)} />

        {related.length > 0 && (
          <section className="doc-sec">
            <h2>Related terms</h2>
            <dl className="doc-gloss">
              {related.map((r) => (
                <div key={r.slug}>
                  <dt><Link href={`/glossary/${r.slug}`}>{r.term}</Link></dt>
                  <dd>{r.def}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {lessons.length > 0 && (
          <section className="doc-sec">
            <h2>Lessons that use it</h2>
            <ol className="doc-list plain">
              {lessons.map((l) => (
                <li key={l.slug}>
                  <Link href={`/learn/${l.slug}`}>{l.title}</Link>
                  <span>{l.summary}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </DocShell>
  );
}
