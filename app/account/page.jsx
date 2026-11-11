import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SignIn, SignOutButton, DeleteAccount } from "@/components/Account";
import { SITE_NAME } from "@/lib/pages";
import { viewer, listMine, longDate } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Your account | ${SITE_NAME}`,
  robots: { index: false, follow: true }
};

const METHOD = { google: "Google", email: "Email link" };

export default async function AccountPage({ searchParams }) {
  const q = await searchParams;
  const { supabase, user } = await viewer();

  if (!user) {
    return (
      <DocShell crumbs={[{ t: "Account" }]}>
        <h1>Your account</h1>
        {q?.deleted ? (
          <p className="doc-lede">Your account has been deleted, along with everything listed on the privacy page.</p>
        ) : (
          <>
            <p className="doc-lede">Sign in to see your account.</p>
            <SignIn next="/account" />
          </>
        )}
      </DocShell>
    );
  }

  const mine = await listMine(supabase, user.id);
  const published = mine.filter((a) => a.status === "published").length;
  const waiting = mine.length - published;
  const methods = [...new Set([...(user.app_metadata?.providers || []), user.app_metadata?.provider].filter(Boolean))]
    .map((p) => METHOD[p] || p);

  return (
    <DocShell crumbs={[{ t: "Account" }]}>
      <h1>Your account</h1>

      <dl className="doc-gloss doc-facts">
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Signs in with</dt><dd>{methods.join(" and ") || "Unknown"}</dd></div>
        <div><dt>Member since</dt><dd>{longDate(user.created_at)}</dd></div>
        <div>
          <dt>Articles</dt>
          <dd>
            {mine.length === 0 ? "None sent." : `${published} published, ${waiting} not published.`}{" "}
            <Link href="/articles/submit">{mine.length === 0 ? "Submit one" : "See your submissions"}</Link>
          </dd>
        </div>
      </dl>

      <div className="doc-actions doc-after">
        <Link href="/" className="doc-btn pri">Open the desk</Link>
        <SignOutButton />
      </div>

      <section className="doc-sec">
        <h2>Delete your account</h2>
        <p className="doc-p">
          This removes your sign-in, your journal, your analyst usage count and any articles that are not published.
          It cannot be undone. Signing in again later starts a new, empty account.
        </p>
        <DeleteAccount hasPublished={published > 0} />
      </section>

      <p className="doc-hint doc-after">
        What is kept and why: <Link href="/privacy">privacy</Link>.
      </p>
    </DocShell>
  );
}
