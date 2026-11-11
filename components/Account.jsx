"use client";

/**
 * Sign-in, sign-out and account deletion. Used by /signin, /account and the
 * article submission page.
 *
 * Two ways in, neither with a password: Google, or a one-time link sent to an
 * email address. Supabase runs both; this site never sees a password.
 */
import { useState } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { NEXT_COOKIE } from "@/lib/auth-paths";

function remember(next) {
  // An hour, the life of an emailed link.
  document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=3600; samesite=lax`;
}

function emailError(error) {
  const text = String(error?.message || "");
  if (/not authori[sz]ed/i.test(text)) return "Email sign-in is not switched on yet. Use Google for now.";
  if (error?.status === 429 || /rate limit|security purposes|only request this/i.test(text)) {
    return "Too many sign-in emails have been requested. Wait a few minutes and try again.";
  }
  if (/invalid|format|valid email/i.test(text)) return "That does not look like an email address.";
  return "The email could not be sent. Try again, or use Google.";
}

export function SignIn({ next = "/" }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);

  async function google() {
    const supabase = browserClient();
    if (!supabase) return setMsg({ bad: true, text: "Sign-in is not available on this copy of the site." });
    setBusy("google");
    setMsg(null);
    remember(next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) {
      setBusy("");
      setMsg({ bad: true, text: "Google sign-in could not start. Try again." });
    }
  }

  async function sendLink(e) {
    e.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setMsg({ bad: true, text: "That does not look like an email address." });
    const supabase = browserClient();
    if (!supabase) return setMsg({ bad: true, text: "Sign-in is not available on this copy of the site." });
    setBusy("email");
    setMsg(null);
    remember(next);
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setBusy("");
    if (error) return setMsg({ bad: true, text: emailError(error) });
    setMsg({
      text: `A sign-in link is on its way to ${address}. Open it in this browser: it works once and expires after an hour. Nothing after a few minutes? Check your spam folder, then ask again.`
    });
  }

  return (
    <div className="doc-form doc-signin">
      <button type="button" className="doc-btn pri" disabled={Boolean(busy)} onClick={google}>
        {busy === "google" ? "Opening Google" : "Continue with Google"}
      </button>
      <p className="doc-or">or with your email address</p>
      <form className="doc-field" onSubmit={sendLink} noValidate>
        <label htmlFor="si-email">Email address</label>
        <div className="doc-inline">
          <input id="si-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="doc-btn" disabled={Boolean(busy)}>{busy === "email" ? "Sending" : "Email me a link"}</button>
        </div>
        <p className="doc-hint">No password: we email you a one-time link that signs you in.</p>
      </form>
      {msg && <p className={"doc-msg" + (msg.bad ? " bad" : "")} role="status">{msg.text}</p>}
    </div>
  );
}

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    try {
      await browserClient()?.auth.signOut();
    } catch {}
    window.location.assign("/account");
  }
  return (
    <button type="button" className="doc-btn" disabled={busy} onClick={out}>{busy ? "Signing out" : "Sign out"}</button>
  );
}

export function DeleteAccount({ hasPublished }) {
  const [step, setStep] = useState("idle");
  const [alsoPublished, setAlsoPublished] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setStep("busy");
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ removePublished: alsoPublished })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "The account could not be deleted. Nothing was removed; try again.");
        return setStep("confirm");
      }
    } catch {
      setError("No connection. Nothing was removed; try again.");
      return setStep("confirm");
    }
    try {
      await browserClient()?.auth.signOut({ scope: "local" });
    } catch {}
    window.location.assign("/account?deleted=1");
  }

  return (
    <div className="doc-form">
      {hasPublished && (
        <label className="doc-check">
          <input type="checkbox" checked={alsoPublished} disabled={step === "busy"} onChange={(e) => setAlsoPublished(e.target.checked)} />
          <span>Also take down my published articles. Leave this unticked and they stay up under the name you gave.</span>
        </label>
      )}
      <div className="doc-actions">
        {step === "idle" ? (
          <button type="button" className="doc-btn warn" onClick={() => setStep("confirm")}>Delete my account</button>
        ) : (
          <>
            <button type="button" className="doc-btn warn" disabled={step === "busy"} onClick={remove}>
              {step === "busy" ? "Deleting" : "Yes, delete it for good"}
            </button>
            <button type="button" className="doc-btn" disabled={step === "busy"} onClick={() => setStep("idle")}>Keep my account</button>
          </>
        )}
      </div>
      {error && <p className="doc-msg bad" role="status">{error}</p>}
    </div>
  );
}
