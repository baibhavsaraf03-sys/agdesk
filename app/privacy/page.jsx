import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SITE_NAME } from "@/lib/pages";

export const metadata = {
  title: `Privacy | ${SITE_NAME}`,
  description: "What Ledge Desk keeps about you, why, who else handles it, and how to delete it.",
  alternates: { canonical: "/privacy" }
};

// The analyst's provider is chosen by environment variable; name the one actually in use.
const ANALYST = (process.env.AGENT_PROVIDER || "anthropic").toLowerCase() === "gemini" ? "Google (Gemini)" : "Anthropic";

export default function Privacy() {
  return (
    <DocShell crumbs={[{ t: "Privacy" }]}>
      <article className="doc-article">
        <p className="doc-k">Last updated 11 November 2026</p>
        <h1>Privacy</h1>
        <p className="doc-lede">
          Ledge Desk keeps as little about you as it can. Most of the site works without an account, and nothing on it
          tracks you or shows you advertising.
        </p>
      </article>

      <section className="doc-sec">
        <h2>Without an account</h2>
        <p className="doc-p">
          Nothing about you is stored by this site. Your browser keeps a few settings on your own device: light or dark
          theme, the last screen you opened, lessons you have finished, your chart layout, a watchlist, an unsent article draft, and your own analyst
          key if you add one. Clearing your browser&apos;s site data removes all of it.
        </p>
      </section>

      <section className="doc-sec">
        <h2>With an account</h2>
        <ul className="doc-rules">
          <li><strong>Your sign-in:</strong> email address, the name your Google account supplies (if you use Google), how you sign in, and when the account was created and last used.</li>
          <li><strong>Your journal:</strong> the entries you save. Only your account can read them; the database enforces that.</li>
          <li><strong>Your watchlist:</strong> the list of market symbols you choose to follow. Only your account can read it.</li>
          <li><strong>A daily count of analyst messages</strong>, for the free usage limit. Not the messages themselves.</li>
          <li><strong>Articles you submit:</strong> the name you give, the title and text, the editor&apos;s decision and any note. Published articles are public under that name.</li>
          <li><strong>Sign-in cookies</strong> that keep you signed in. These are needed for the account to work, so there is no banner asking about them.</li>
        </ul>
        <p className="doc-p">
          Passwords are never involved. You sign in through Google, or with a one-time link sent to your email address.
        </p>
      </section>

      <section className="doc-sec">
        <h2>Who else handles it</h2>
        <ul className="doc-rules">
          <li><strong>Supabase</strong> runs the database and the sign-in system, and keeps short-lived technical logs of sign-ins.</li>
          <li><strong>Vercel</strong> hosts the site and, like any web host, records requests in its logs.</li>
          <li><strong>Google</strong>, if you choose to sign in with it. The site&apos;s typefaces are also loaded from Google Fonts.</li>
          <li><strong>An email delivery service</strong> sends the sign-in links.</li>
          <li><strong>{ANALYST}</strong> receives what you type to the analyst in order to write a reply. This site does not keep the conversation; it is gone when you leave the page.</li>
        </ul>
      </section>

      <section className="doc-sec">
        <h2>Why it is kept, and for how long</h2>
        <p className="doc-p">
          Only to provide what you signed up for: signing you in, keeping your journal, applying the usage limit and
          publishing the articles you send. Nothing is sold, shared for marketing or used to build a profile of you. It is
          kept until you delete your account.
        </p>
      </section>

      <section className="doc-sec">
        <h2>Deleting it</h2>
        <p className="doc-p">
          Delete your account yourself, at any time, on <Link href="/account">your account page</Link>. That removes your
          sign-in, journal, watchlist, usage count and unpublished articles straight away. You choose whether your published articles
          come down too. Copies held in backups and logs by the services above expire on their own schedules.
        </p>
        <p className="doc-p">
          If you are in the UK and unhappy with how your information is handled, you can complain to the Information
          Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.
        </p>
      </section>
    </DocShell>
  );
}
