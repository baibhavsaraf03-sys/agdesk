import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SignIn } from "@/components/Account";
import { SITE_NAME } from "@/lib/pages";
import { safeNext, SIGNIN_ERRORS } from "@/lib/auth-paths";
import { viewer } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Sign in | ${SITE_NAME}`,
  description: "Sign in to Ledge Desk with Google or a one-time email link.",
  robots: { index: false, follow: true }
};

export default async function SignInPage({ searchParams }) {
  const q = await searchParams;
  const next = safeNext(q?.next) || "/";
  const error = SIGNIN_ERRORS[q?.error] || null;
  const { user } = await viewer();

  return (
    <DocShell crumbs={[{ t: "Sign in" }]}>
      <h1>Sign in</h1>
      {user ? (
        <>
          <p className="doc-lede">You are signed in as {user.email}.</p>
          <p className="doc-p">
            <Link href={next} className="doc-btn pri">Continue</Link>{" "}
            <Link href="/account" className="doc-btn">Your account</Link>
          </p>
        </>
      ) : (
        <>
          <p className="doc-lede">
            An account lets you use the analyst, keep a trading journal and submit articles. Everything else on the
            site works without one.
          </p>
          {error && <p className="doc-msg bad doc-alert" role="alert">{error}</p>}
          <SignIn next={next} />
          <p className="doc-hint doc-after">
            Signing in creates an account the first time. What is kept, and how to delete it, is on the{" "}
            <Link href="/privacy">privacy page</Link>.
          </p>
        </>
      )}
    </DocShell>
  );
}
