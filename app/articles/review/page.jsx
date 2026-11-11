import Link from "next/link";
import { notFound } from "next/navigation";
import { DocShell } from "@/components/Doc";
import { ReviewActions } from "@/components/ArticleForms";
import { Markdown } from "@/lib/markdown";
import { SITE_NAME, slugify } from "@/lib/pages";
import { viewer, listByStatus, longDate, readingMinutes } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Review queue | ${SITE_NAME}`,
  robots: { index: false, follow: false }
};

function Entry({ a, open }) {
  return (
    <li className="doc-entry">
      <h3>{a.title}</h3>
      <p className="doc-by">
        {a.author_name} · sent {longDate(a.created_at)} · {readingMinutes(a.body)} min read
        {a.status === "published" && a.slug && <> · <Link href={`/articles/${a.slug}`}>/articles/{a.slug}</Link></>}
      </p>
      <p className="doc-p">{a.summary}</p>
      <details open={open}>
        <summary>Read the article</summary>
        <Markdown text={a.body} className="doc-body" />
      </details>
      <ReviewActions id={a.id} status={a.status} slug={a.slug || ""} suggestedSlug={slugify(a.title).slice(0, 80)} note={a.review_note || ""} />
    </li>
  );
}

/**
 * The editor's queue. Anyone who is not an editor gets the ordinary
 * not-found page, signed in or not, so the address gives nothing away; and
 * had they reached this far, row-level security would hand them empty lists.
 */
export default async function Review() {
  const { supabase, user, editor } = await viewer();
  if (!user || !editor) notFound();

  const [pending, published, rejected] = await Promise.all([
    listByStatus(supabase, "pending"),
    listByStatus(supabase, "published"),
    listByStatus(supabase, "rejected", 30)
  ]);

  return (
    <DocShell crumbs={[{ t: "Articles", href: "/articles" }, { t: "Review queue" }]}>
      <h1>Review queue</h1>
      <p className="doc-lede">
        {pending.length === 0 ? "Nothing is waiting." : pending.length === 1 ? "One article is waiting." : `${pending.length} articles are waiting.`}{" "}
        Only you can open this page.
      </p>

      <section className="doc-sec">
        <h2>Waiting, oldest first</h2>
        {pending.length === 0 ? <p className="doc-empty">The queue is empty.</p> : (
          <ul className="doc-queue">{pending.map((a, i) => <Entry key={a.id} a={a} open={i === 0} />)}</ul>
        )}
      </section>

      <section className="doc-sec">
        <h2>Published</h2>
        {published.length === 0 ? <p className="doc-empty">Nothing published yet.</p> : (
          <ul className="doc-queue">{published.map((a) => <Entry key={a.id} a={a} open={false} />)}</ul>
        )}
      </section>

      {rejected.length > 0 && (
        <section className="doc-sec">
          <h2>Not accepted</h2>
          <ul className="doc-queue">{rejected.map((a) => <Entry key={a.id} a={a} open={false} />)}</ul>
        </section>
      )}
    </DocShell>
  );
}
