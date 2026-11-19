"use client";

/**
 * Sovereign debt restructuring (SOV). Static reference from lib/sovereign.js
 * (cases, institutions, process, terms, law, checked by hand) plus the
 * creditor mix from the World Bank via /api/sov. `headlines` is the live
 * headline list the page builds from its news streams; `ask` opens the analyst.
 */
import { useEffect, useState } from "react";
import { CASES, STAGES, PLAYERS, STEPS, TERMS, LAW, SOV_QUESTIONS, CHECKED } from "@/lib/sovereign";

const PARTS = [
  ["imf", "IMF"],
  ["multilateral", "Development banks"],
  ["bilateral", "Governments"],
  ["bonds", "Bonds"],
  ["banks", "Banks and other lenders"],
  ["other", "Other"]
];

const bn = (v) => (v == null ? "–" : `$${(v / 1e9).toLocaleString("en-GB", { maximumFractionDigits: v < 1e10 ? 1 : 0 })}bn`);

function Sources({ list }) {
  if (!list?.length) return null;
  return (
    <div className="srcs sov-srcs">
      {list.map((s) => (
        <a key={s.u} href={s.u} target="_blank" rel="noopener noreferrer">{s.t}</a>
      ))}
    </div>
  );
}

function MixBar({ d }) {
  return (
    <div className="sov-track" role="img" aria-label={PARTS.map(([k, t]) => `${t} ${bn(d[k])}`).join(", ")}>
      {PARTS.map(([k, t]) => {
        const w = d[k] && d.total ? (100 * d[k]) / d.total : 0;
        return w >= 0.5 ? <span key={k} className={"sov-seg " + k} style={{ width: `${w}%` }} title={`${t}: ${bn(d[k])} (${Math.round(w)}%)`} /> : null;
      })}
    </div>
  );
}

function Key() {
  return (
    <div className="sov-key">
      {PARTS.map(([k, t]) => (
        <span key={k}><i className={"sov-sw " + k} />{t}</span>
      ))}
    </div>
  );
}

const pct = (v) => (v == null ? "–" : `${Math.round(v)}%`);
const STORE = "agdesk.sov";

/** Any country in the World Bank's debt statistics, from /api/sov. */
function CountryLookup({ ask }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [iso, setIso] = useState(null);
  const [d, setD] = useState(null);
  const [state, setState] = useState("idle");

  useEffect(() => {
    let live = true;
    fetch("/api/sov?list=1").then((r) => r.json()).then((j) => live && setList(j.countries || [])).catch(() => {});
    try {
      const saved = localStorage.getItem(STORE);
      if (saved && /^[A-Z]{3}$/.test(saved)) setIso(saved);
    } catch {}
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!iso) return;
    let live = true;
    setState("loading");
    fetch(`/api/sov?country=${iso}`)
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(new Error(j.error || r.status)))))
      .then((j) => { if (live) { setD(j); setState(j.rows?.length ? "ok" : "empty"); } })
      .catch(() => live && setState("failed"));
    try { localStorage.setItem(STORE, iso); } catch {}
    return () => { live = false; };
  }, [iso]);

  function pick(value) {
    const v = value.trim().toLowerCase();
    if (!v) return;
    const hit = list.find((c) => c.name.toLowerCase() === v || c.iso.toLowerCase() === v)
      || list.find((c) => c.name.toLowerCase().startsWith(v))
      || list.find((c) => c.name.toLowerCase().includes(v));
    if (hit) { setIso(hit.iso); setText(hit.name); }
  }

  const last = d?.rows?.at(-1);
  const kase = CASES.find((c) => c.iso === iso);
  const maxLender = d?.lenders?.[0]?.value || 1;

  return (
    <div className="sov-look">
      <form className="sov-search" onSubmit={(e) => { e.preventDefault(); pick(text); }}>
        <label htmlFor="sov-country">Look up a country</label>
        <input
          id="sov-country"
          type="search"
          list="sov-countries"
          placeholder={list.length ? `Any of ${list.length} countries, e.g. Nepal` : "Loading countries…"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const exact = list.find((c) => c.name.toLowerCase() === e.target.value.trim().toLowerCase());
            if (exact) setIso(exact.iso);
          }}
          autoComplete="off"
        />
        <datalist id="sov-countries">
          {list.map((c) => <option key={c.iso} value={c.name} />)}
        </datalist>
        <button className="btn" type="submit">Show</button>
      </form>
      <p className="trf-note">Covers the low- and middle-income countries that report to the World Bank. Rich countries such as the UK or Japan are not in these statistics.</p>

      {state === "loading" && <div className="empty">Loading {list.find((c) => c.iso === iso)?.name || iso}…</div>}
      {state === "failed" && <div className="empty">The World Bank figures for this country could not be loaded just now.</div>}
      {state === "empty" && <div className="empty">The World Bank has no recent debt figures for {d?.name || iso}.</div>}

      {state === "ok" && last && (
        <div className="sov-country">
          <div className="sov-country-head">
            <h3>{d.name}</h3>
            <span>end-{last.year}</span>
          </div>
          <dl className="sov-stats">
            <div><dt>External debt</dt><dd>{bn(last.total)}</dd></div>
            <div><dt>Share of national income</dt><dd>{pct(last.gni)}</dd></div>
            <div><dt>Debt service, share of exports</dt><dd>{pct(last.service)}</dd></div>
            <div><dt>Owed to the IMF</dt><dd>{bn(last.imf)}</dd></div>
          </dl>

          <Key />
          <MixBar d={last} />

          {kase && (
            <div className="sov-flag">
              <b>{STAGES[kase.stage]}.</b> {kase.now} <span className="dim">See {kase.name} under The cases above.</span>
            </div>
          )}

          {d.lenders?.length > 0 && (
            <div className="sec">
              <div className="trackhead">
                <span className="tt">Largest lenders to the government</span>
                <span className="tc">end-{d.lendersYear}</span>
              </div>
              <ol className="sov-lenders">
                {d.lenders.map((l) => (
                  <li key={l.id}>
                    <span className="sov-lname">{l.name}</span>
                    <span className="sov-lbar"><i style={{ width: `${(100 * l.value) / maxLender}%` }} /></span>
                    <span className="sov-lval">{bn(l.value)}</span>
                  </li>
                ))}
              </ol>
              <p className="trf-note">Public and publicly guaranteed debt by creditor. A country means all its lenders together (for China: its policy banks, state companies and commercial banks).</p>
            </div>
          )}

          <div className="sec">
            <div className="trackhead">
              <span className="tt">Over ten years</span>
              <span className="tc">US$ billions</span>
            </div>
            <div className="sov-tablewrap">
              <table className="sov-table">
                <thead>
                  <tr><th>Year</th><th>Total</th><th>Development banks</th><th>Governments</th><th>Bonds</th><th>Banks and other</th><th>IMF</th><th>% of income</th><th>Service, % of exports</th></tr>
                </thead>
                <tbody>
                  {[...d.rows].reverse().map((r) => (
                    <tr key={r.year}>
                      <td>{r.year}</td>
                      {["total", "multilateral", "bilateral", "bonds", "banks", "imf"].map((k) => (
                        <td key={k}>{r[k] == null ? "–" : (r[k] / 1e9).toFixed(1)}</td>
                      ))}
                      <td>{pct(r.gni)}</td>
                      <td>{pct(r.service)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="btnrow">
            <button
              className="btn"
              onClick={() => ask(
                `${d.name}'s external debt, from the World Bank's International Debt Statistics (US$ billions, end of year):\n` +
                  d.rows.map((r) => `${r.year}: total ${(r.total / 1e9).toFixed(1)}, development banks ${r.multilateral == null ? "n/a" : (r.multilateral / 1e9).toFixed(1)}, governments ${r.bilateral == null ? "n/a" : (r.bilateral / 1e9).toFixed(1)}, bonds ${r.bonds == null ? "n/a" : (r.bonds / 1e9).toFixed(1)}, IMF ${r.imf == null ? "n/a" : (r.imf / 1e9).toFixed(1)}, ${r.gni == null ? "" : Math.round(r.gni) + "% of national income, "}${r.service == null ? "" : "debt service " + Math.round(r.service) + "% of exports"}`).join("\n") +
                  (d.lenders?.length ? `\nLargest lenders (${d.lendersYear}): ` + d.lenders.map((l) => `${l.name} ${(l.value / 1e9).toFixed(1)}`).join(", ") : "") +
                  `\n\nIn plain English: how has this debt changed, who matters most if it ever had to be restructured, and how stretched does it look? Use only these figures and say what they cannot show.`,
                `Explain ${d.name}'s debt`
              )}
            >
              Ask the analyst about {d.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditorMix() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/sov")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => live && setData(j))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);

  if (failed) return <div className="empty">The World Bank figures could not be loaded just now.</div>;
  if (!data) return <div className="empty">Loading the World Bank figures…</div>;
  const rows = CASES.filter((c) => data.countries?.[c.iso]);
  if (!rows.length) return <div className="empty">The World Bank has no recent figures for these countries.</div>;

  return (
    <div className="sov-mix">
      <Key />
      {rows.map((c) => {
        const d = data.countries[c.iso];
        return (
          <div className="sov-bar" key={c.iso}>
            <div className="sov-bar-head">
              <b>{c.name}</b>
              <span>{bn(d.total)} external debt, end-{d.year}{d.service != null && ` · debt service ${Math.round(d.service)}% of exports`}</span>
            </div>
            <MixBar d={d} />
          </div>
        );
      })}
      <p className="trf-note">
        Public and publicly guaranteed external debt by creditor, plus IMF credit; &quot;Other&quot; is private debt without a government
        guarantee and short-term debt. Debt service is all external debt service as a share of exports of goods, services and income.
        Source: World Bank, International Debt Statistics, latest year published.
      </p>
    </div>
  );
}

export default function Sovereign({ ask, headlines }) {
  return (
    <>
      <p className="prose dim">
        When a government cannot pay its debts there is no bankruptcy court. Instead the IMF sizes the hole, government lenders
        agree their share in a committee, private bondholders negotiate theirs, and courts in New York and London deal with anyone
        who refuses. This screen tracks the live cases, who sits at the table, and the law. Case details checked {CHECKED}.
      </p>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">The cases</span>
          <span className="tc">checked {CHECKED}</span>
        </div>
        <div className="sov-cases">
          {CASES.map((c) => (
            <details className={"sov-case " + c.stage} key={c.id}>
              <summary>
                <span className="sov-name"><b>{c.name}</b><span>{c.frame}</span></span>
                <span className="sov-stage">{STAGES[c.stage]}</span>
                <span className="sov-def">Default: {c.default}</span>
              </summary>
              <p className="prose">{c.now}</p>
              <dl className="sov-dl">
                <div><dt>IMF</dt><dd>{c.imf}</dd></div>
                <div><dt>Government lenders</dt><dd>{c.official}</dd></div>
                <div><dt>Private creditors</dt><dd>{c.private}</dd></div>
              </dl>
              <Sources list={c.src} />
            </details>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Who they owe</span>
          <span className="tc">World Bank, annual</span>
        </div>
        <CreditorMix />
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Any country</span>
          <span className="tc">World Bank, annual</span>
        </div>
        <CountryLookup ask={ask} />
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">In today&apos;s headlines</span>
        </div>
        {headlines}
        <div className="btnrow">
          {SOV_QUESTIONS.map(([label, q]) => (
            <button key={label} className="chip" onClick={() => ask(q, label)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">How a restructuring runs</span>
        </div>
        <ol className="sov-steps">
          {STEPS.map((s) => (
            <li key={s.t}><b>{s.t}</b><span>{s.d}</span></li>
          ))}
        </ol>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Who sits at the table</span>
        </div>
        <div className="sov-players">
          {PLAYERS.map((p) => (
            <div className="sov-player" key={p.name}>
              <div className="sov-player-head">
                <h3>{p.name}</h3>
                <span>{p.short}</span>
              </div>
              <p className="sov-role">{p.role}</p>
              {p.body.map((b, i) => <p className="prose" key={i}>{b}</p>)}
              <Sources list={p.src} />
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">Terms that decide the outcome</span>
        </div>
        <dl className="sov-dl terms">
          {TERMS.map((t) => (
            <div key={t.t}><dt>{t.t}</dt><dd>{t.d}</dd></div>
          ))}
        </dl>
      </div>

      <div className="sec">
        <div className="trackhead">
          <span className="tt">In the courts</span>
          <span className="tc">holdouts, vulture funds and the law</span>
        </div>
        <div className="sov-law">
          {LAW.map((l) => (
            <div className="sov-law-item" key={l.t}>
              <h3>{l.t}</h3>
              <p className="prose">{l.d}</p>
              <Sources list={l.src} />
            </div>
          ))}
        </div>
        <p className="trf-note">General information about the law, not legal advice.</p>
      </div>
    </>
  );
}
