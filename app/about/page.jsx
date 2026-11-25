import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SITE_NAME } from "@/lib/pages";

export const metadata = {
  title: `About ${SITE_NAME}`,
  description: "Who made Ledge Desk, why it exists, and which parts are written by AI.",
  alternates: { canonical: "/about" }
};

// Written in the owner's voice (25 Nov). He should read it and change anything that isn't how he'd say it.
export default function About() {
  return (
    <DocShell crumbs={[{ t: "About" }]}>
      <article className="doc-article doc-body">
        <h1>About Ledge Desk</h1>
        <p className="doc-lede">
          I'm Baibhav. I'm doing an MLitt in Global Social and Political Thought at the University of St Andrews, and
          most of my writing is about sovereign debt: what happens when countries can't pay, and the funds that buy
          their bonds cheap and sue for the full amount.
        </p>

        <h2>Why I made it</h2>
        <p>
          The tools professionals use to watch markets cost tens of thousands a year. The free ones either bury you in
          numbers or try to sell you a trade. I wanted one place where someone starting out could see what markets are
          doing, read why in plain English, and learn the basics before risking anything, while still being useful to
          people who already trade.
        </p>
        <p>
          Some screens come straight out of my own reading. The <Link href="/#SOV">sovereign debt</Link> screen tracks
          the restructurings and court cases I write about. <Link href="/#DOOM">Doomsday</Link> is an argument I wanted
          to test in public: that the AI boom looks like a bubble, set against the best case that it isn't.
        </p>

        <h2>What AI does here, and what it doesn't</h2>
        <p>
          I build the site with the help of AI coding tools, and AI writes the hourly market notes. It drafts them from
          public figures and named publishers' headlines, it is told never to invent a number, and the notes say they
          are AI-written. It never touches the lessons, the glossary or the reference pages, which stay as they were
          checked. If you find a mistake anywhere, I want to know.
        </p>

        <h2>What it isn't</h2>
        <p>
          It isn't investment advice, and I'm not a financial adviser. Prices are delayed. Nothing here is paid for by
          the companies it mentions. <Link href="/info">Everything on the desk</Link> lists every screen, and{" "}
          <Link href="/privacy">Privacy</Link> says what is kept about you.
        </p>

        <p className="about-sign">Baibhav, St Andrews</p>
      </article>
    </DocShell>
  );
}
