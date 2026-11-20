import Link from "next/link";
import { DocShell } from "@/components/Doc";
import { SITE_NAME } from "@/lib/pages";

export const metadata = {
  title: `Accessibility | ${SITE_NAME}`,
  description: "How Ledge Desk is built to be usable by everyone, the settings that help, and the parts that are not yet fully accessible.",
  alternates: { canonical: "/accessibility" }
};

export default function Accessibility() {
  return (
    <DocShell crumbs={[{ t: "Accessibility" }]}>
      <article className="doc-article">
        <p className="doc-k">Last updated 20 November 2026</p>
        <h1>Accessibility</h1>
        <p className="doc-lede">
          Ledge Desk should be usable by anyone, whatever device, eyesight or way of browsing they use. We aim to meet
          the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. This page says what is in place and where
          the site still falls short.
        </p>
      </article>

      <section className="doc-sec">
        <h2>What is in place</h2>
        <ul className="doc-rules">
          <li><strong>Keyboard:</strong> every screen can be reached from the keyboard. Press / to open the command bar and type a screen&apos;s code; Escape closes the menu.</li>
          <li><strong>Two themes:</strong> Noir (dark) and Blanc (light), switched from the top bar or the menu.</li>
          <li><strong>Less motion:</strong> if your device asks for reduced motion, the site&apos;s fades and transitions are switched off.</li>
          <li><strong>Plain English:</strong> turn it on and any jargon on screen can be tapped for a plain explanation.</li>
          <li><strong>Phones and touch:</strong> buttons are at least 40 pixels high on touch screens, and nothing you need to read is smaller than 11.5 pixels on a phone.</li>
          <li><strong>Text first:</strong> prices, changes and verdicts are written as text and words (up, down, a minus sign), not shown by colour alone.</li>
          <li><strong>Zoom:</strong> the layout reflows on narrow and zoomed screens; wide charts scroll sideways instead of shrinking their labels.</li>
          <li><strong>Reading pages:</strong> <Link href="/learn">lessons</Link>, the <Link href="/glossary">glossary</Link>, <Link href="/articles">articles</Link> and this page are plain web pages that work without JavaScript and read well in a screen reader.</li>
        </ul>
      </section>

      <section className="doc-sec">
        <h2>Known limits</h2>
        <ul className="doc-rules">
          <li><strong>Live quote tables and charts</strong> are TradingView&apos;s free widgets, embedded from TradingView. We cannot change how they work with screen readers. The figures that matter most are also given as text on the same screen or in the written reads.</li>
          <li><strong>The dials on Home and the Doomsday charts</strong> are drawings; their values are written beside them, but the drawings themselves carry no extra detail for a screen reader.</li>
          <li><strong>The desk is one long page</strong> that changes screen without loading a new page, so some screen readers may not announce the change of screen.</li>
        </ul>
        <p className="doc-p">
          We are working through these. If a screen does not work for you, the analyst (AGN) can
          summarise any screen as plain text: open it and press <em>Summarise this screen</em>.
        </p>
      </section>
    </DocShell>
  );
}
