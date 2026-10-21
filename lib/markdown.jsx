/**
 * A small Markdown renderer for analyst replies.
 *
 * Why not a library: this needs headings, emphasis, code, lists, blockquotes,
 * links and tables, and nothing else. That is a hundred lines, against a
 * dependency tree that would be larger than the rest of the app.
 *
 * Why it is safe: it never produces an HTML string, so there is nothing for
 * `dangerouslySetInnerHTML` to interpret. Every output is a React element and
 * all text goes through React's own escaping. A reply containing a script tag
 * renders as the characters of a script tag. Link targets are restricted to
 * http, https and mailto; anything else renders as plain text, which rules out
 * `javascript:` URLs. That matters because this content is model output and a
 * visitor can influence it by what they ask.
 */

const SAFE_URL = /^(https?:|mailto:)/i;

function safeHref(url) {
  const u = String(url || "").trim();
  return SAFE_URL.test(u) ? u : null;
}

/** `code`, [links](url), **bold**, *italic*. Code wins, so markers inside it are literal. */
const INLINE =
  /(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\s]+\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;

function inline(text, k = "i") {
  if (!text) return null;
  const out = [];
  let last = 0;
  let n = 0;
  let m;
  INLINE.lastIndex = 0;

  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${k}-${n++}`;

    if (tok.startsWith("`")) {
      out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("[")) {
      const parts = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      const href = parts && safeHref(parts[2]);
      if (href) {
        out.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {parts[1]}
          </a>
        );
      } else {
        // Show the raw markdown rather than quietly dropping the target: a
        // link that will not render should look wrong, not look fine.
        out.push(tok);
      }
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

const splitRow = (line) =>
  line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

const isDivider = (line) => /^\s*\|?[\s:-]*-[\s|:-]*$/.test(line) && line.includes("-");

/**
 * Parses blocks. Deliberately line-based rather than a full CommonMark
 * implementation: a model writing a market note uses a narrow subset, and the
 * failure mode of this parser is text rendering as text.
 */
export function Markdown({ text, className = "md" }) {
  const src = String(text || "");
  if (!src.trim()) return null;

  const lines = src.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  let k = 0;

  const push = (node) => blocks.push(node);

  while (i < lines.length) {
    const line = lines[i];

    // Blank
    if (!line.trim()) { i++; continue; }

    // Fenced code
    if (/^\s*```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      push(<pre key={`b${k++}`}><code>{body.join("\n")}</code></pre>);
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length + 1, 6); // never an h1: the panel owns that
      const Tag = `h${level}`;
      push(<Tag key={`b${k++}`}>{inline(h[2], `h${k}`)}</Tag>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      push(<hr key={`b${k++}`} />);
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        body.push(splitRow(lines[i++]));
      }
      push(
        <div className="mdtablewrap" key={`b${k++}`}>
          <table>
            <thead>
              <tr>{head.map((c, x) => <th key={x}>{inline(c, `th${k}-${x}`)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((row, y) => (
                <tr key={y}>
                  {head.map((_, x) => <td key={x}>{inline(row[x] || "", `td${k}-${y}-${x}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i++].replace(/^\s*>\s?/, ""));
      }
      push(<blockquote key={`b${k++}`}>{inline(body.join(" "), `q${k}`)}</blockquote>);
      continue;
    }

    // Lists. A continuation line that is indented belongs to the previous item.
    const bullet = /^\s*[-*+]\s+(.*)$/;
    const number = /^\s*\d+[.)]\s+(.*)$/;
    const which = bullet.test(line) ? bullet : number.test(line) ? number : null;
    if (which) {
      const items = [];
      while (i < lines.length) {
        const mm = which.exec(lines[i]);
        if (mm) { items.push(mm[1]); i++; continue; }
        if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
          continue;
        }
        break;
      }
      const Tag = which === bullet ? "ul" : "ol";
      push(
        <Tag key={`b${k++}`}>
          {items.map((it, x) => <li key={x}>{inline(it, `li${k}-${x}`)}</li>)}
        </Tag>
      );
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para = [];
    while (i < lines.length && lines[i].trim()) {
      const l = lines[i];
      if (/^\s*(```|#{1,6}\s|>\s?|[-*+]\s|\d+[.)]\s)/.test(l)) break;
      if (l.includes("|") && i + 1 < lines.length && isDivider(lines[i + 1])) break;
      para.push(l);
      i++;
    }
    if (para.length) push(<p key={`b${k++}`}>{inline(para.join(" "), `p${k}`)}</p>);
    else i++;
  }

  return <div className={className}>{blocks}</div>;
}

export default Markdown;
