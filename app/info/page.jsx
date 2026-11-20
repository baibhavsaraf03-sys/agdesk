import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SITE_NAME } from "@/lib/pages";
import { ACROSS, FEATURE_AREAS, HOW, PAGES } from "@/lib/features";

export const metadata = {
  title: `Everything on ${SITE_NAME}`,
  description:
    "Every screen and feature on Ledge Desk: live markets, charts, calendar, currencies, sovereign debt, insider buying, alerts, a watchlist, read-only broker linking, lessons and more.",
  alternates: { canonical: "/info" }
};

export default function Info() {
  return (
    <DocShell crumbs={[{ t: "Everything on Ledge Desk" }]}>
      <article className="doc-article">
        <h1>Everything on Ledge Desk</h1>
        <p className="doc-lede">
          A free market desk for beginners and traders alike. This is every screen and what you can do on it. Each
          name opens the screen; the short code beside it also works in the command bar.
        </p>
      </article>

      {FEATURE_AREAS.map((a) => (
        <section className="doc-sec" key={a.id}>
          <h2><span className="doc-k">{a.lede}</span>{a.t}</h2>
          <ul className="doc-list info-list">
            {a.items.map((f) => (
              <li key={f.c}>
                <div className="info-head">
                  <Link href={`/#${f.c}`}>{f.t}</Link>
                  <code className="info-code">{f.c}</code>
                  {f.account && <em className="info-tag">{f.account === true ? "free account" : `free account ${f.account}`}</em>}
                </div>
                <span>{f.d}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="doc-sec">
        <h2>Everywhere on the desk</h2>
        <ul className="doc-rules">
          {ACROSS.map((x) => <li key={x.t}><strong>{x.t}:</strong> {x.d}</li>)}
        </ul>
      </section>

      <section className="doc-sec">
        <h2>Pages you can read without the desk</h2>
        <ul className="doc-list">
          {PAGES.map((p) => <li key={p.href}><Link href={p.href}>{p.t}</Link><span>{p.d}</span></li>)}
        </ul>
      </section>

      <section className="doc-sec">
        <h2>Where the information comes from</h2>
        <ul className="doc-rules">
          {HOW.map((h) => <li key={h}>{h}</li>)}
        </ul>
        <p className="doc-p">
          An account is free and only needed for the features marked above. Read <Link href="/privacy">what is kept</Link> and
          the <Link href="/#TERMS">terms</Link>.
        </p>
      </section>
    </DocShell>
  );
}
