/**
 * Reads for the articles section.
 *
 * Two kinds of reader. The public pages use a client with no cookies, so what
 * they show cannot depend on who is looking: published articles and nothing
 * else. The submit and review pages use the signed-in client, and row-level
 * security decides what comes back (your own submissions; everything, if you
 * are an editor). No service-role key is used anywhere in this section.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverClient } from "./supabase-server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CARD = "slug, title, summary, author_name, published_at";
const FULL = "id, slug, title, summary, body, author_name, status, review_note, created_at, updated_at, reviewed_at, published_at";

function publicClient() {
  if (!URL || !ANON) return null;
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Published articles, newest first. `ok` is false when the read failed. */
export async function listPublished(limit = 200) {
  const supabase = publicClient();
  if (!supabase) return { ok: false, articles: [] };
  try {
    const { data, error } = await supabase
      .from("articles")
      .select(CARD)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return { ok: false, articles: [] };
    return { ok: true, articles: data || [] };
  } catch {
    return { ok: false, articles: [] };
  }
}

/** One published article, or null. `ok` is false when the read itself failed. */
export async function getPublished(slug) {
  const supabase = publicClient();
  if (!supabase) return { ok: false, article: null };
  try {
    const { data, error } = await supabase
      .from("articles")
      .select(FULL)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { ok: false, article: null };
    return { ok: true, article: data };
  } catch {
    return { ok: false, article: null };
  }
}

/** Who is looking, and whether the database says they are an editor. */
export async function viewer() {
  try {
    const supabase = await serverClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { supabase, user: null, editor: false };
    const { data } = await supabase.rpc("is_article_editor");
    return { supabase, user, editor: data === true };
  } catch {
    return { supabase: null, user: null, editor: false };
  }
}

/** The signed-in account's own submissions, newest first. */
export async function listMine(supabase, userId) {
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, status, review_note, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return error ? [] : data || [];
}

/** Everything in one state, for the editor. Row-level security returns nothing to anyone else. */
export async function listByStatus(supabase, status, limit = 100) {
  const { data, error } = await supabase
    .from("articles")
    .select(FULL)
    .eq("status", status)
    .order(status === "pending" ? "created_at" : "updated_at", { ascending: status === "pending" })
    .limit(limit);
  return error ? [] : data || [];
}

export function longDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function readingMinutes(body) {
  const words = String(body || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
