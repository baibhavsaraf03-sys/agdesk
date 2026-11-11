import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SignInToSubmit, SubmitForm, WithdrawButton } from "@/components/ArticleForms";
import { SITE_NAME } from "@/lib/pages";
import { STATUS_LABEL } from "@/lib/article-rules";
import { viewer, listMine, longDate } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Submit an article | ${SITE_NAME}`,
  description: "Send an economics article to Ledge Desk. Every submission is read by the editor before anything is published.",
  alternates: { canonical: "/articles/submit" }
};

export default async function Submit() {
  const { supabase, user, editor } = await viewer();
  const mine = user ? await listMine(supabase, user.id) : [];
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "";

  return (
    <DocShell crumbs={[{ t: "Articles", href: "/articles" }, { t: "Submit" }]}>
      <h1>Submit an article</h1>
      <p className="doc-lede">
        Send an article on an economics subject. The editor reads every submission; it is published only if it is
        approved, and you will see the decision here.
      </p>

      <section className="doc-sec">
        <h2>What gets accepted</h2>
        <ul className="doc-rules">
          <li>An argument about economics: trade, money, prices, labour, policy, markets, economic history.</li>
          <li>Your own work, with the sources for its figures linked or named.</li>
          <li>Between roughly 200 and 6,000 words, in plain English.</li>
          <li>No tips to buy or sell, no promotion of a product or service, nothing written to sell something.</li>
        </ul>
      </section>

      {!user ? (
        <section className="doc-sec">
          <h2>Sign in to write</h2>
          <p className="doc-p">An account is needed so the decision can reach you and so the article has an author.</p>
          <SignInToSubmit next="/articles/submit" />
        </section>
      ) : (
        <>
          {editor && (
            <p className="doc-p"><Link href="/articles/review">Go to the review queue</Link></p>
          )}
          <section className="doc-sec">
            <h2>Your article</h2>
            <SubmitForm defaultName={name} />
          </section>

          <section className="doc-sec">
            <h2>Your submissions</h2>
            {mine.length === 0 ? (
              <p className="doc-empty">Nothing sent yet.</p>
            ) : (
              <ul className="doc-list doc-arts">
                {mine.map((a) => (
                  <li key={a.id}>
                    {a.status === "published" && a.slug
                      ? <Link href={`/articles/${a.slug}`}>{a.title}</Link>
                      : <strong>{a.title}</strong>}
                    <span className={`doc-status ${a.status}`}>{STATUS_LABEL[a.status]} · sent {longDate(a.created_at)}</span>
                    {a.review_note && <span className="doc-note">Editor&apos;s note: {a.review_note}</span>}
                    {a.status === "pending" && <span><WithdrawButton id={a.id} /></span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </DocShell>
  );
}
