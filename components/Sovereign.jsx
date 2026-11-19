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
  ["banks", "Banks"],
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
      <div className="sov-key">
        {PARTS.map(([k, t]) => (
          <span key={k}><i className={"sov-sw " + k} />{t}</span>
        ))}
      </div>
      {rows.map((c) => {
        const d = data.countries[c.iso];
        return (
          <div className="sov-bar" key={c.iso}>
            <div className="sov-bar-head">
              <b>{c.name}</b>
              <span>{bn(d.total)} external debt, end-{d.year}{d.service != null && ` · debt service ${Math.round(d.service)}% of exports`}</span>
            </div>
            <div className="sov-track" role="img" aria-label={PARTS.map(([k, t]) => `${t} ${bn(d[k])}`).join(", ")}>
              {PARTS.map(([k]) => {
                const w = d[k] && d.total ? (100 * d[k]) / d.total : 0;
                return w >= 0.5 ? <span key={k} className={"sov-seg " + k} style={{ width: `${w}%` }} title={`${bn(d[k])}`} /> : null;
              })}
            </div>
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
