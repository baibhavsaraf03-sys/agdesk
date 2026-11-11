import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { TERMS, SITE_NAME } from "@/lib/pages";

export const metadata = {
  title: `Markets glossary: ${TERMS.length} terms in plain English | ${SITE_NAME}`,
  description:
    "Trading and commodity-market terms explained without jargon: backwardation, basis, contango, margin, open interest and more.",
  alternates: { canonical: "/glossary" }
};

export default function GlossaryIndex() {
  return (
    <DocShell crumbs={[{ t: "Glossary" }]}>
      <h1>Markets glossary</h1>
      <p className="doc-lede">{TERMS.length} terms, each explained the way you would to someone who has never traded.</p>
      <dl className="doc-gloss">
        {TERMS.map((t) => (
          <div key={t.slug}>
            <dt><Link href={`/glossary/${t.slug}`}>{t.term}</Link></dt>
            <dd>{t.def}</dd>
          </div>
        ))}
      </dl>
    </DocShell>
  );
}
