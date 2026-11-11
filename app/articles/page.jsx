import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SITE_NAME } from "@/lib/pages";
import { listPublished, longDate } from "@/lib/articles";

// Read from the database on each request, so an article appears the moment it is approved.
export const dynamic = "force-dynamic";

export const metadata = {
  title: `Articles on economics and markets | ${SITE_NAME}`,
  description:
    "Economics articles written by readers and reviewed by the editor before publication: arguments about trade, money, prices and policy, each with its sources.",
  alternates: { canonical: "/articles" }
};

export default async function ArticlesIndex() {
  const { ok, articles } = await listPublished();

  return (
    <DocShell crumbs={[{ t: "Articles" }]}>
      <h1>Articles</h1>
      <p className="doc-lede">
        Economics written by readers. Every article here was read and approved by the editor before it was published;
        nothing appears automatically.
      </p>

      {articles.length > 0 ? (
        <ul className="doc-list doc-arts">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/articles/${a.slug}`}>{a.title}</Link>
              <span>{a.summary}</span>
              <span className="doc-by">{a.author_name} · {longDate(a.published_at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="doc-empty">
          {ok ? "No articles have been published yet. The first one could be yours." : "The articles could not be loaded just now. Try again in a minute."}
        </p>
      )}

      <section className="doc-sec">
        <h2>Write for Ledge Desk</h2>
        <p className="doc-p">
          Sign in, send an article on an economics subject, and the editor will read it. You see the decision, and any
          note that comes with it, beside your submission.
        </p>
        <p className="doc-p"><Link href="/articles/submit" className="doc-btn pri">Submit an article</Link></p>
      </section>
    </DocShell>
  );
}
