"use client";

import { useState } from "react";

/** base64url without padding, as the Web Push standard writes keys. */
function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A P-256 key pair in the form web-push expects: public as the raw point, private as the scalar. */
async function makePair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { publicKey: b64url(raw), privateKey: jwk.d };
}

function Copy({ label, value }) {
  const [done, setDone] = useState(false);
  return (
    <div className="pk-row">
      <div className="pk-label">{label}</div>
      <code className="pk-val">{value}</code>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          } catch {}
        }}
      >
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function PushKeyMaker() {
  const [pair, setPair] = useState(null);
  const [err, setErr] = useState("");
  return (
    <section className="doc-sec">
      {!pair ? (
        <div className="btnrow">
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                setPair(await makePair());
              } catch {
                setErr("This browser cannot make the keys. Try a recent Chrome, Edge, Firefox or Safari.");
              }
            }}
          >
            Make the keys
          </button>
        </div>
      ) : (
        <>
          <Copy label="Public key" value={pair.publicKey} />
          <Copy label="Private key (secret)" value={pair.privateKey} />
          <p className="doc-p">
            Keep this page open until both are stored. Leaving or reloading it makes a new pair, and the old one is
            gone for good. The private key is never shown again.
          </p>
        </>
      )}
      {err && <p className="doc-p">{err}</p>}
    </section>
  );
}
