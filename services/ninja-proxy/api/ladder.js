// Ladder summary for the PoE2 Endgame Companion.
//
// The companion's DPS verdict ("strong" / "modest" / "low") was graded against
// three thresholds someone picked out of the air. This endpoint replaces them
// with numbers actually observed on the ladder.
//
// Two things make this server-side work necessary:
//
//   1. poe.ninja's builds endpoints moved to protobuf. There is no published
//      schema, so the payload is parsed schema-lessly (field number + wire
//      type) into a columnar table. Decoder ported from poe2-mcp's
//      src/api/poe_ninja_ladder.py, and RE-VERIFIED 2026-09-24 against a live
//      capture — see below.
//   2. Same CORS wall as the character endpoint — a browser can't call it.
//
// ## Column layout (verified against a live capture, 2026-09-24)
//
// This had never been checked against real traffic — it was written from the
// same understanding as the mock proxy that stood in for it in every prior
// test run, so nothing could have caught a shared misunderstanding. It turned
// out to have one: the schema had moved. Columns used to live under field 5;
// live traffic carries them under field 12, with two cell encodings rather
// than one:
//
//   - a column with a field 6 entry is NUMERIC: one blob of consecutive
//     protobuf varints, standard "packed repeated" wire form, one value per
//     row (confirmed on `level` — 100 rows, uniformly 100 — and on `life` /
//     `energyshield`, whose ranges are exactly what a top-of-ladder sample
//     should show).
//   - a column with repeated field 7 entries is a DISPLAY STRING per row
//     (`"280k"`, `"96k"`) — this is what `dps.total` and `ehp__str` carry, and
//     `toNumber()` below already parses that suffix form.
//
// `dps.total` and `ehp__str` replace the old flat `dps` / `ehp` keys. Two
// columns (`skills`, `keypassives`) carry neither shape — they are per-row
// lists — and are left undecoded since nothing here reads them.

const NINJA_BASE = "https://poe.ninja";

// --- schema-less protobuf ---------------------------------------------------

function readVarint(buf, i) {
  let v = 0;
  let shift = 0;
  while (i < buf.length) {
    const b = buf[i];
    v += (b & 0x7f) * Math.pow(2, shift);
    i += 1;
    if (!(b & 0x80)) return [v, i];
    shift += 7;
    if (shift > 56) return [null, i];
  }
  return [null, i];
}

function parseMessage(buf, depth = 0, maxDepth = 10) {
  const out = [];
  let i = 0;
  const n = buf.length;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  while (i < n) {
    const [tag, ni] = readVarint(buf, i);
    i = ni;
    if (tag === null || tag === 0) return null;
    const field = Math.floor(tag / 8);
    const wire = tag & 7;
    if (field === 0 || field > 4000) return null;

    if (wire === 0) {
      const [v, nj] = readVarint(buf, i);
      i = nj;
      if (v === null) return null;
      out.push([field, "int", v]);
    } else if (wire === 1) {
      if (i + 8 > n) return null;
      out.push([field, "f64", view.getFloat64(i, true)]);
      i += 8;
    } else if (wire === 2) {
      const [len, nj] = readVarint(buf, i);
      i = nj;
      if (len === null || i + len > n) return null;
      const chunk = buf.subarray(i, i + len);
      i += len;
      const sub =
        depth < maxDepth && chunk.length > 1
          ? parseMessage(chunk, depth + 1, maxDepth)
          : null;
      if (sub !== null) {
        out.push([field, "msg", sub]);
      } else {
        try {
          out.push([
            field,
            "str",
            new TextDecoder("utf-8", { fatal: true }).decode(chunk),
          ]);
        } catch {
          out.push([field, "bytes", chunk]);
        }
      }
    } else if (wire === 5) {
      if (i + 4 > n) return null;
      out.push([field, "f32", view.getFloat32(i, true)]);
      i += 4;
    } else {
      return null;
    }
  }
  return out;
}

/**
 * A field-6 blob is a run of consecutive varints with no length prefixes
 * between them — protobuf's standard "packed repeated" form for a scalar
 * field. Read until the blob is exhausted; one value per row.
 */
function decodePackedVarints(value) {
  const buf = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const out = [];
  let i = 0;
  while (i < buf.length) {
    const [v, ni] = readVarint(buf, i);
    if (v === null) return null;
    out.push(v);
    i = ni;
  }
  return out;
}

/** Decode a /builds/{version}/search response into {total, columns, rows}. */
export function decodeSearchResponse(bytes) {
  const msg = parseMessage(bytes);
  if (!msg || msg[0]?.[1] !== "msg") throw new Error("unrecognised search response shape");
  const env = msg[0][2];

  const total = env.find(([f, k]) => f === 1 && k === "int")?.[2] ?? null;
  const columns = {};
  const order = [];

  for (const [f, kind, value] of env) {
    if (f !== 12 || kind !== "msg") continue;
    let colName = value.find(([ff, kk]) => ff === 1 && kk === "str")?.[2];
    if (!colName) continue;
    if (colName in columns) colName = `${colName}_2`;

    const packed = value.find(([ff]) => ff === 6);
    if (packed) {
      const cells = packed[1] === "str" || packed[1] === "bytes" ? decodePackedVarints(packed[2]) : null;
      if (!cells) continue;
      columns[colName] = cells;
      order.push(colName);
      continue;
    }

    const cells = [];
    for (const [ff, kk, cell] of value) {
      if (ff !== 7) continue;
      if (kk === "msg") {
        const display = cell.find(([g, w]) => g === 1 && w === "str")?.[2];
        const number = cell.find(([g, w]) => g === 2 && w === "int")?.[2];
        cells.push(display !== undefined ? display : (number ?? null));
      } else {
        cells.push(kk === "str" ? cell : null);
      }
    }
    // A column with neither a field 6 blob nor field 7 cells is a per-row
    // list value (skills, keypassives) this decoder does not read.
    if (!cells.length) continue;
    columns[colName] = cells;
    order.push(colName);
  }

  const rowCount = Math.max(0, ...order.map((c) => columns[c].length));
  const rows = [];
  for (let idx = 0; idx < rowCount; idx += 1) {
    const row = {};
    for (const name of order) row[name] = columns[name][idx] ?? null;
    rows.push(row);
  }
  return { total, columns: order, rows };
}

// --- helpers ----------------------------------------------------------------

/** "205k" / "1.0M" / 1497 / "" -> number | null. */
export function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v !== "string" || v.trim() === "") return null;
  const m = /^([\d.]+)\s*([kKmMbB]?)$/.exec(v.trim().replace(/,/g, ""));
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] ?? 1;
  return n * mult;
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarise(values) {
  const s = values.filter((v) => typeof v === "number" && v > 0).sort((a, b) => a - b);
  if (s.length === 0) return null;
  return {
    n: s.length,
    p25: Math.round(quantile(s, 0.25)),
    median: Math.round(quantile(s, 0.5)),
    p75: Math.round(quantile(s, 0.75)),
    max: Math.round(s[s.length - 1]),
  };
}

// --- handler ----------------------------------------------------------------

/**
 * The index-state snapshot entry for a league.
 *
 * Matches the slug first (`url`, what core sends as `league`). If nothing
 * matches, falls back to the display name core sends as `name` (or the
 * `league` value itself), case-insensitively, so a league whose
 * slug core derives wrongly is still found: poe.ninja's own index says what
 * "HC Forbidden Rites" is called, so the proxy asks it instead of guessing.
 * The display-name field is read as `name`, falling back to `displayName`,
 * because the field name has not been re-checked against live traffic since
 * the 0.5.5 league launch.
 */
export function findSnapshot(snapshotVersions, league, displayName = league) {
  const list = Array.isArray(snapshotVersions) ? snapshotVersions : [];
  const bySlug = list.find((s) => s && s.url === league);
  if (bySlug) return bySlug;
  if (!displayName) return null;
  const wanted = String(displayName).trim().toLowerCase();
  return (
    list.find((s) => {
      const name = s && (s.name ?? s.displayName);
      return typeof name === "string" && name.trim().toLowerCase() === wanted;
    }) ?? null
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { league, class: className, name: leagueName } = req.query;
  if (!league) {
    res.status(400).json({ error: "league query param is required" });
    return;
  }

  try {
    const idxRes = await fetch(`${NINJA_BASE}/poe2/api/data/index-state`);
    if (!idxRes.ok) {
      res.status(502).json({ error: `index-state returned ${idxRes.status}` });
      return;
    }
    const idx = await idxRes.json();
    const snap = findSnapshot(idx.snapshotVersions, league, leagueName || league);
    if (!snap) {
      res.status(404).json({ error: `no ladder snapshot for league "${league}"` });
      return;
    }

    const params = new URLSearchParams({ overview: snap.snapshotName });
    if (className) params.set("class", className);
    const searchUrl = `${NINJA_BASE}/poe2/api/builds/${snap.version}/search?${params}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      res.status(502).json({ error: `builds search returned ${searchRes.status}` });
      return;
    }
    const decoded = decodeSearchResponse(
      new Uint8Array(await searchRes.arrayBuffer())
    );

    const rows = decoded.rows;
    const levels = rows.map((r) => toNumber(r.level)).filter((v) => v !== null);
    const pool = rows.map((r) => {
      const life = toNumber(r.life) ?? 0;
      const es = toNumber(r.energyshield) ?? 0;
      return life + es;
    });

    // The ladder snapshot moves at most hourly, and every visitor asking about
    // the same class wants the same answer, so cache hard at the edge.
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({
      league,
      class: className || null,
      snapshot: snap.snapshotName,
      /** Rows actually returned. The endpoint ignores pagination; this is one page. */
      sampleSize: rows.length,
      /** How many builds match the filter in total — NOT how many were sampled. */
      totalInPool: decoded.total,
      levelRange: levels.length
        ? { min: Math.min(...levels), max: Math.max(...levels) }
        : null,
      dps: summarise(rows.map((r) => toNumber(r["dps.total"]))),
      ehp: summarise(rows.map((r) => toNumber(r.ehp__str))),
      pool: summarise(pool),
      /**
       * Stated in the payload so a consumer cannot present this as a
       * population percentile — it is the top of the ladder, nothing else.
       */
      caveat:
        "Top-of-ladder sample only. poe.ninja's builds search returns a single page and ignores pagination, so these figures describe the highest-ranked builds matching the filter, not the player population.",
    });
  } catch (err) {
    res.status(502).json({ error: `Ladder fetch failed: ${String(err)}` });
  }
}
