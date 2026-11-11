import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { LESSONS, lessonTracks, SITE_NAME } from "@/lib/pages";

export const metadata = {
  title: `Learn markets from zero: ${LESSONS.length} lessons | ${SITE_NAME}`,
  description:
    "Free lessons that start from nothing: what a market is, what shares, futures and options are, how money is actually lost, and how to read a price. Each with a real example and its risk.",
  alternates: { canonical: "/learn" }
};

export default function LearnIndex() {
  return (
    <DocShell crumbs={[{ t: "Lessons" }]}>
      <h1>Learn markets from zero</h1>
      <p className="doc-lede">
        {LESSONS.length} short lessons, in order. Each one explains a single idea in plain English, shows it in a real
        example, and says where it goes wrong. Read the first track before you put money anywhere.
      </p>
      {lessonTracks().map((g) => (
        <section className="doc-sec" key={g.tr}>
          <h2><span className="doc-k">Track {g.tr}</span>{g.name}</h2>
          <ol className="doc-list" start={g.lessons[0].n}>
            {g.lessons.map((l) => (
              <li key={l.slug}>
                <Link href={`/learn/${l.slug}`}>{l.title}</Link>
                <span>{l.summary}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </DocShell>
  );
}
