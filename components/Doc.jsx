/**
 * The frame for the server-rendered reading pages (lessons, glossary, articles).
 *
 * Deliberately plain HTML with ordinary links: these pages exist to be read
 * by people arriving from a search and by the crawler that sent them, so
 * nothing here depends on JavaScript.
 */
import Link from "next/link";

export function DocShell({ children, crumbs = [] }) {
  return (
    <div className="doc">
      <header className="doc-top">
        <Link href="/" className="doc-mark">LEDGE&middot;DESK</Link>
        <nav className="doc-nav" aria-label="Sections">
          <Link href="/learn">Lessons</Link>
          <Link href="/glossary">Glossary</Link>
          <Link href="/articles">Articles</Link>
          <Link href="/account">Account</Link>
          <Link href="/" className="doc-cta">Open the desk</Link>
        </nav>
      </header>
      <main className="doc-main">
        {crumbs.length > 0 && (
          <nav className="doc-crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i}>{c.href ? <Link href={c.href}>{c.t}</Link> : c.t}</span>
            ))}
          </nav>
        )}
        {children}
      </main>
      <footer className="doc-foot">
        <p>
          Educational material, not investment advice. Futures and options are leveraged: losses can exceed the amount
          deposited, and regulators consistently find that most individual traders lose money.
        </p>
        <p>
          <Link href="/learn">Lessons</Link> · <Link href="/glossary">Glossary</Link> · <Link href="/articles">Articles</Link> · <Link href="/#TERMS">Terms</Link> · <Link href="/privacy">Privacy</Link>
        </p>
      </footer>
    </div>
  );
}

/** Text with **bold** runs. The content files use nothing else inline. */
export function Inline({ text }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}

/** Structured data for search engines. */
export function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
