import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

/**
 * Linking a visitor's brokerage account, read-only, through SnapTrade's
 * OAuth apps ("OAuth with SnapTrade Personal"). The visitor connects their
 * broker inside their own free SnapTrade Personal account and then approves
 * Ledge Desk with the `read` scope only, so this site can never place,
 * change or cancel an order.
 *
 * Tokens are encrypted here (AES-256-GCM, key derived from the OAuth client
 * secret) before they reach the database, so the `broker_links` row holds
 * only ciphertext even for its owner. Positions are fetched when the visitor
 * opens the screen and are never stored.
 *
 * Vercel environment: SNAPTRADE_OAUTH_CLIENT_ID, SNAPTRADE_OAUTH_CLIENT_SECRET.
 * Callback registered in SnapTrade: <site>/api/broker/callback.
 */

const ISSUER = "https://api.snaptrade.com";
const API = "https://api.snaptrade.com";
const TIMEOUT = 15000;

const CLIENT_ID = process.env.SNAPTRADE_OAUTH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SNAPTRADE_OAUTH_CLIENT_SECRET || "";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ledgedesk.com").replace(/\/+$/, "");

export const REDIRECT_URI = `${SITE}/api/broker/callback`;
export const configured = () => Boolean(CLIENT_ID && CLIENT_SECRET);

/* ---------------- encryption ---------------- */

function key() {
  return Buffer.from(hkdfSync("sha256", CLIENT_SECRET, "ledge-desk", "broker-tokens-v1", 32));
}

/** JSON in, "v1.<iv>.<tag>.<data>" (base64url) out. */
export function seal(obj) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

/** The reverse of seal, or null if it was sealed with another key or tampered with. */
export function unseal(text) {
  try {
    const [v, iv, tag, data] = String(text || "").split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

/* ---------------- OAuth ---------------- */

let metaPromise = null;
async function meta() {
  if (!metaPromise) {
    metaPromise = fetchJson(`${ISSUER}/.well-known/oauth-authorization-server`).catch((err) => {
      metaPromise = null;
      throw err;
    });
  }
  return metaPromise;
}

async function fetchJson(url, init = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, cache: "no-store" });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 300) };
    }
    if (!res.ok) {
      const err = new Error(body?.error_description || body?.detail || body?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = body?.error;
      throw err;
    }
    return body;
  } finally {
    clearTimeout(t);
  }
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

/** `{ url, state, verifier }`: send the visitor to `url`, keep state and verifier in a cookie. */
export async function authorizationUrl() {
  const m = await meta();
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL(m.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", "read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { url: url.toString(), state, verifier };
}

async function tokenRequest(body) {
  const m = await meta();
  const raw = await fetchJson(m.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`
    },
    body: new URLSearchParams({ ...body, client_id: CLIENT_ID }).toString()
  });
  if (!raw?.access_token) throw new Error("SnapTrade sent no access token.");
  return {
    access: raw.access_token,
    refresh: raw.refresh_token || null,
    expires: Date.now() + 1000 * (Number(raw.expires_in) || 3600),
    scope: raw.scope || "read"
  };
}

export const exchangeCode = (code, verifier) =>
  tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI, code_verifier: verifier });

export const refreshTokens = (refresh) => tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });

/** Revokes the refresh token (which also ends its access token). Errors are swallowed: the row is removed regardless. */
export async function revoke(tokens) {
  try {
    const m = await meta();
    if (!m.revocation_endpoint || !tokens?.refresh) return;
    await fetchJson(m.revocation_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`
      },
      body: new URLSearchParams({ token: tokens.refresh, token_type_hint: "refresh_token", client_id: CLIENT_ID }).toString()
    });
  } catch {
    /* nothing to do */
  }
}

/* ---------------- data ---------------- */

const api = (path, access) => fetchJson(`${API}${path}`, { headers: { authorization: `Bearer ${access}`, accept: "application/json" } });

const num = (v) => (v == null || v === "" || !isFinite(Number(v)) ? null : Number(v));

/** One position in plain fields; P/L in the position's currency. Shorts have negative units. */
export function normalisePosition(p) {
  const ins = p?.instrument || {};
  const kind = ins.kind || "stock";
  const units = num(p?.units);
  const price = num(p?.price);
  const cost = num(p?.cost_basis);
  const mult = kind === "option" ? 100 : 1;
  const value = units != null && price != null ? units * price * mult : null;
  const pnl = units != null && price != null && cost != null ? (price - cost) * units * mult : null;
  const paid = units != null && cost != null ? Math.abs(units * cost * mult) : null;
  return {
    symbol: String(ins.symbol || ins.raw_symbol || "?").slice(0, 40),
    name: ins.description ? String(ins.description).slice(0, 80) : null,
    kind,
    units,
    price,
    cost,
    value,
    pnl,
    pnlPct: pnl != null && paid ? pnl / paid : null,
    currency: p?.currency || ins.currency || null,
    cash: Boolean(p?.cash_equivalent) || kind === "cash"
  };
}

/** Every investment account with its positions, fetched now. */
export async function portfolio(access) {
  const all = await api("/accounts/all", access);
  const accounts = (all?.results || []).filter((a) => !a.kind || a.kind === "investment");
  const out = [];
  for (const a of accounts.slice(0, 12)) {
    let positions = [];
    let asOf = null;
    let error = null;
    try {
      const r = await api(`/accounts/${encodeURIComponent(a.id)}/positions/all`, access);
      positions = (r?.results || []).map(normalisePosition).filter((p) => p.units);
      asOf = r?.data_freshness?.as_of || null;
    } catch (err) {
      error = err.status === 429 ? "The broker's limit was reached; try again in a minute." : "Positions could not be fetched for this account.";
    }
    out.push({
      id: a.id,
      name: a.display_name || a.raw_type || "Account",
      number: a.masked_account_number || null,
      type: a.cash_or_margin || null,
      paper: Boolean(a.is_paper),
      value: num(a.net_value?.amount),
      currency: a.net_value?.currency || null,
      status: a.status || null,
      asOf,
      error,
      positions
    });
  }
  return out;
}
