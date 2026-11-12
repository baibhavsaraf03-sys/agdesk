import { DocShell } from "@/components/Doc";
import { SITE_NAME } from "@/lib/pages";
import PushKeyMaker from "@/components/PushKeyMaker";

export const metadata = {
  title: `Notification keys | ${SITE_NAME}`,
  robots: { index: false, follow: false }
};

/**
 * A one-off tool for the site owner: makes the pair of keys that signs alert
 * notifications, in the browser, so the private half never passes through
 * this server, the repository or a chat. Harmless for anyone else to open:
 * a key made here does nothing until it is stored in the site's settings.
 */
export default function PushKeys() {
  return (
    <DocShell crumbs={[{ t: "Notification keys" }]}>
      <article className="doc-article">
        <p className="doc-k">For the site owner</p>
        <h1>Notification keys</h1>
        <p className="doc-lede">
          Alerts are signed with a pair of keys so phones and browsers know they come from this site. This page makes
          the pair on your own device; nothing is sent anywhere. You only need to do this once.
        </p>
      </article>
      <PushKeyMaker />
    </DocShell>
  );
}
