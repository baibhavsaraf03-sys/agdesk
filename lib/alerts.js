/**
 * Lightweight headline clustering and digest picking.
 *
 * `cluster` groups items that share enough title keywords into the same
 * cluster, keeping only the freshest representative of each.
 *
 * `digestPick` draws a balanced sample across streams so no single
 * stream dominates the front-page digest.
 */

function tokenise(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const inter = [...setA].filter((x) => setB.has(x)).length;
  return inter / (setA.size + setB.size - inter || 1);
}

/**
 * Cluster an array of items by title similarity.
 * Returns one representative per cluster (the newest).
 */
export function cluster(items, threshold = 0.35) {
  if (!items || !items.length) return [];
  const reps = [];
  const used = new Set();

  const sorted = [...items].sort(
    (a, b) => new Date(b.published || 0) - new Date(a.published || 0)
  );

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    reps.push(sorted[i]);
    const tokA = tokenise(sorted[i].title);
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      if (jaccard(tokA, tokenise(sorted[j].title)) >= threshold) {
        used.add(j);
      }
    }
  }
  return reps;
}

/**
 * Pick a balanced digest from clustered streams.
 * @param {Object} byStream  – { streamKey: clusteredItems[] }
 * @param {Object} opts      – { digestSize, digestPerStreamMin }
 */
export function digestPick(
  byStream,
  { digestSize = 8, digestPerStreamMin = 1 } = {}
) {
  const keys = Object.keys(byStream).filter((k) => byStream[k].length);
  if (!keys.length) return [];

  const result = [];
  const taken = {};
  keys.forEach((k) => (taken[k] = 0));

  // guarantee minimum per stream
  for (const k of keys) {
    const items = byStream[k];
    for (let i = 0; i < Math.min(digestPerStreamMin, items.length); i++) {
      result.push({ ...items[i], _stream: k });
      taken[k]++;
    }
  }

  // fill remaining slots round-robin by recency
  const cursors = {};
  keys.forEach((k) => (cursors[k] = taken[k]));

  while (result.length < digestSize) {
    let added = false;
    for (const k of keys) {
      if (result.length >= digestSize) break;
      if (cursors[k] < byStream[k].length) {
        result.push({ ...byStream[k][cursors[k]], _stream: k });
        cursors[k]++;
        added = true;
      }
    }
    if (!added) break;
  }

  // sort final set by date
  result.sort(
    (a, b) => new Date(b.published || 0) - new Date(a.published || 0)
  );
  return result;
}
