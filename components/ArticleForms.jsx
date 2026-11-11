"use client";

/**
 * The interactive parts of the articles section: signing in, the submission
 * form, withdrawing, and the editor's decision buttons. Everything else in
 * /articles is server-rendered and works without script.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { RULES, NEXT_COOKIE, checkSubmission } from "@/lib/article-rules";

const DRAFT_KEY = "agdesk.article-draft";

async function send(url, method, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "That did not work. Try again." };
    return data;
  } catch {
    return { error: "No connection. Nothing was sent; try again." };
  }
}

/** Google sign-in that comes back to `next` instead of the desk. */
export function SignInToSubmit({ next }) {
  const [state, setState] = useState("");

  async function go() {
    const supabase = browserClient();
    if (!supabase) return setState("Sign-in is not available on this copy of the site.");
    setState("Opening Google");
    // The destination travels in a short-lived cookie, not the redirect
    // address: Supabase only accepts redirect addresses it has been told
    // about, and the plain callback is the one already on its list.
    document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=900; samesite=lax`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) setState("Sign-in could not start. Try again.");
  }

  return (
    <div className="doc-form">
      <button type="button" className="doc-btn pri" onClick={go}>Sign in with Google</button>
      {state && <p className="doc-msg" role="status">{state}</p>}
    </div>
  );
}

function Count({ n, rule }) {
  const short = n < rule.min;
  const over = n > rule.max;
  return (
    <span className={"doc-count" + (over ? " bad" : "")}>
      {n.toLocaleString("en-GB")}
      {short ? ` of at least ${rule.min.toLocaleString("en-GB")}` : ` of ${rule.max.toLocaleString("en-GB")}`}
    </span>
  );
}

export function SubmitForm({ defaultName = "" }) {
  const router = useRouter();
  const [f, setF] = useState({ author_name: defaultName, title: "", summary: "", body: "", agreed: false });

  // Restore an unsent draft after the first paint, so the server and the
  // browser render the same empty form and nothing flickers into an error.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved) setF((cur) => ({ ...cur, ...saved, author_name: saved.author_name || cur.author_name, agreed: false }));
    } catch {
      // Storage is unavailable in private windows; start empty.
    }
  }, []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function set(key, value) {
    const next = { ...f, [key]: value };
    setF(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...next, agreed: undefined }));
    } catch {
      // Private windows refuse storage; the form still works, it just forgets.
    }
  }

  async function submit(e) {
    e.preventDefault();
    const { error } = checkSubmission(f);
    if (error) return setMsg({ bad: true, text: error });
    setBusy(true);
    setMsg(null);
    const out = await send("/api/articles", "POST", f);
    setBusy(false);
    if (out.error) return setMsg({ bad: true, text: out.error });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setF({ author_name: f.author_name, title: "", summary: "", body: "", agreed: false });
    setMsg({ text: "Sent. It is now waiting for review and appears in your submissions below." });
    router.refresh();
  }

  return (
    <form className="doc-form" onSubmit={submit}>
      <div className="doc-field">
        <label htmlFor="a-name">Your name, as it should appear</label>
        <input id="a-name" type="text" value={f.author_name} maxLength={RULES.name.max} autoComplete="name"
          onChange={(e) => set("author_name", e.target.value)} />
      </div>
      <div className="doc-field">
        <label htmlFor="a-title">Title <Count n={f.title.trim().length} rule={RULES.title} /></label>
        <input id="a-title" type="text" value={f.title} maxLength={RULES.title.max}
          onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="doc-field">
        <label htmlFor="a-sum">Summary: one or two sentences saying what the article argues <Count n={f.summary.trim().length} rule={RULES.summary} /></label>
        <textarea id="a-sum" rows={3} value={f.summary} maxLength={RULES.summary.max}
          onChange={(e) => set("summary", e.target.value)} />
      </div>
      <div className="doc-field">
        <label htmlFor="a-body">Article <Count n={f.body.trim().length} rule={RULES.body} /></label>
        <textarea id="a-body" rows={22} value={f.body} maxLength={RULES.body.max}
          onChange={(e) => set("body", e.target.value)} />
        <p className="doc-hint">
          Leave a blank line between paragraphs. Start a line with ## for a section heading, with - for a list item,
          with &gt; for a quotation. **bold**, *italic*, and [link text](https://address) for sources. Your draft is
          kept in this browser until you send it.
        </p>
      </div>
      <label className="doc-check">
        <input type="checkbox" checked={f.agreed} onChange={(e) => set("agreed", e.target.checked)} />
        <span>
          This is my own work, I have named my sources, and I agree to Ledge Desk publishing it under my name if it
          is accepted.
        </span>
      </label>
      <div className="doc-actions">
        <button type="submit" className="doc-btn pri" disabled={busy}>{busy ? "Sending" : "Send for review"}</button>
      </div>
      {msg && <p className={"doc-msg" + (msg.bad ? " bad" : "")} role="status">{msg.text}</p>}
    </form>
  );
}

export function WithdrawButton({ id }) {
  const router = useRouter();
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function withdraw() {
    setState("busy");
    const out = await send(`/api/articles?id=${encodeURIComponent(id)}`, "DELETE");
    if (out.error) {
      setError(out.error);
      return setState("idle");
    }
    router.refresh();
  }

  if (state === "idle") {
    return (
      <>
        <button type="button" className="doc-btn sm" onClick={() => setState("confirm")}>Withdraw</button>
        {error && <span className="doc-msg bad" role="status">{error}</span>}
      </>
    );
  }
  return (
    <span className="doc-actions">
      <button type="button" className="doc-btn sm warn" disabled={state === "busy"} onClick={withdraw}>
        {state === "busy" ? "Withdrawing" : "Withdraw and delete it"}
      </button>
      <button type="button" className="doc-btn sm" disabled={state === "busy"} onClick={() => setState("idle")}>Keep it</button>
    </span>
  );
}

/** The editor's controls for one article. `status` decides which decisions are offered. */
export function ReviewActions({ id, status, slug = "", suggestedSlug = "", note = "" }) {
  const router = useRouter();
  const [text, setText] = useState(note || "");
  const [address, setAddress] = useState(slug || suggestedSlug);
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState(null);

  async function act(action) {
    setBusy(action);
    setMsg(null);
    const out = await send("/api/articles/review", "POST", { id, action, note: text, slug: address });
    setBusy("");
    if (out.error) return setMsg({ bad: true, text: out.error });
    setConfirmDelete(false);
    router.refresh();
  }

  const working = Boolean(busy);

  return (
    <div className="doc-form doc-review">
      {status !== "published" && (
        <div className="doc-field">
          <label htmlFor={`slug-${id}`}>Address: /articles/</label>
          <input id={`slug-${id}`} type="text" className="code" value={address} disabled={Boolean(slug)}
            onChange={(e) => setAddress(e.target.value)} />
          {slug && <p className="doc-hint">Published before, so it keeps this address.</p>}
        </div>
      )}
      <div className="doc-field">
        <label htmlFor={`note-${id}`}>Note to the author (they see this beside their submission)</label>
        <textarea id={`note-${id}`} rows={3} value={text} maxLength={RULES.note.max} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="doc-actions">
        {status !== "published" && (
          <button type="button" className="doc-btn pri" disabled={working} onClick={() => act("publish")}>
            {busy === "publish" ? "Publishing" : "Approve and publish"}
          </button>
        )}
        {status === "pending" && (
          <button type="button" className="doc-btn" disabled={working} onClick={() => act("reject")}>
            {busy === "reject" ? "Saving" : "Do not accept"}
          </button>
        )}
        {status === "published" && (
          <button type="button" className="doc-btn" disabled={working} onClick={() => act("unpublish")}>
            {busy === "unpublish" ? "Saving" : "Unpublish, back to the queue"}
          </button>
        )}
        {!confirmDelete ? (
          <button type="button" className="doc-btn" disabled={working} onClick={() => setConfirmDelete(true)}>Delete</button>
        ) : (
          <>
            <button type="button" className="doc-btn warn" disabled={working} onClick={() => act("delete")}>
              {busy === "delete" ? "Deleting" : "Delete for good"}
            </button>
            <button type="button" className="doc-btn" disabled={working} onClick={() => setConfirmDelete(false)}>Keep it</button>
          </>
        )}
      </div>
      {msg && <p className={"doc-msg" + (msg.bad ? " bad" : "")} role="status">{msg.text}</p>}
    </div>
  );
}
