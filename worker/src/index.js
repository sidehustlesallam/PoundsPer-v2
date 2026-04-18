/**
 * £Per API — Cloudflare Worker (plain JavaScript, no build step).
 * Deploy via Cloudflare Dashboard. EPC Open Data Communities auth (never commit secrets):
 *   Recommended — set two secrets: EPC_EMAIL and EPC_API_KEY (HTTP Basic = base64(email:apikey)).
 *   Fallback — EPC_AUTH_B64, EPC_BASIC_B64, or EPC_TOKEN = precomputed Base64 only (after "Basic ").
 * Implements the strict API contract; CORS enabled; credentials never exposed to clients.
 */

const POSTCODES_BASE = "https://api.postcodes.io";
const EPC_BASE = "https://epc.opendatacommunities.org/api/v1";
const LR_SPARQL_ENDPOINT = "https://landregistry.data.gov.uk/landregistry/query";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function errorJson(message, status = 500, origin) {
  return json({ error: message }, status, origin);
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

function normalizePostcode(pc) {
  if (!pc || typeof pc !== "string") return "";
  return pc.replace(/\s+/g, "").toUpperCase();
}

function formatPostcode(pc) {
  const n = normalizePostcode(pc);
  if (n.length < 5) return n;
  return `${n.slice(0, -3)} ${n.slice(-3)}`;
}

/** UK postcode loose pattern */
function looksLikePostcode(s) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(String(s).trim());
}

/**
 * EPC requires HTTP Basic: Authorization: Basic <Base64("email:apikey")>
 * Prefer EPC_EMAIL + EPC_API_KEY (easier key rotation). Precomputed Base64 is fallback only.
 */
function epcAuthHeaders(env) {
  const email = env.EPC_EMAIL;
  const apiKey = env.EPC_API_KEY;
  if (email && apiKey) {
    const raw = `${String(email).trim()}:${String(apiKey).trim()}`;
    return {
      Authorization: `Basic ${btoa(raw)}`,
      Accept: "application/json",
    };
  }
  const precomputed =
    env.EPC_AUTH_B64 || env.EPC_BASIC_B64 || env.EPC_TOKEN;
  if (precomputed && String(precomputed).trim()) {
    const token = String(precomputed).trim();
    return {
      Authorization: `Basic ${token}`,
      Accept: "application/json",
    };
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "*";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "GET") {
      return errorJson("Method not allowed", 405, origin);
    }

    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      if (path === "/resolve") {
        return handleResolve(url, env, origin);
      }
      if (path === "/geo") {
        return handleGeo(url, origin);
      }
      if (path === "/address") {
        return handleAddress(url, env, origin);
      }
      if (path === "/epc/search") {
        return handleEpcSearch(url, env, origin);
      }
      if (path === "/epc/certificate") {
        return handleEpcCertificate(url, env, origin);
      }
      if (path === "/ppi/recent") {
        return handlePpiRecent(url, env, origin);
      }
      if (path === "/hpi") {
        return handleHpi(url, origin);
      }
      if (path === "/schools/nearby") {
        return handleSchoolsNearby(url, origin);
      }
      if (path === "/transport") {
        return handleTransport(url, origin);
      }
      if (path === "/broadband") {
        return handleBroadband(url, origin);
      }
      if (path === "/flood") {
        return handleFlood(url, origin);
      }
      if (path === "/radon") {
        return handleRadon(url, origin);
      }

      return errorJson("Not found", 404, origin);
    } catch (e) {
      return errorJson(e.message || "Internal error", 500, origin);
    }
  },
};

async function lookupPostcodeGeo(pcFormatted) {
  const { res, body } = await fetchJson(
    `${POSTCODES_BASE}/postcodes/${encodeURIComponent(pcFormatted)}`
  );
  if (!res.ok || body.status === 404 || body.error) {
    return { ok: false, body };
  }
  const r = body.result || body;
  return {
    ok: true,
    postcode: r.postcode || pcFormatted,
    lat: r.latitude,
    lon: r.longitude,
    localAuthority: r.codes?.admin_district || r.admin_district || "",
    region: r.region || "",
    country: r.country || "",
    parliamentary_constituency: r.parliamentary_constituency || "",
  };
}

/**
 * Resolve: prefer many EPC domestic certificates for the postcode (dropdown per property);
 * fall back to a single postcodes.io centroid row if EPC is unavailable or returns nothing.
 */
async function handleResolve(url, env, origin) {
  const input = url.searchParams.get("input") || "";
  const trimmed = input.trim();
  if (!trimmed) {
    return json({ results: [] }, 200, origin);
  }

  let pc = trimmed;
  if (!looksLikePostcode(trimmed)) {
    const compact = normalizePostcode(trimmed);
    if (compact.length >= 5 && compact.length <= 8) {
      pc = formatPostcode(compact);
    } else {
      return json({
        results: [],
        query: trimmed,
        hint: "Enter a full UK postcode (e.g. SW1A 1AA)",
      }, 200, origin);
    }
  } else {
    pc = formatPostcode(normalizePostcode(trimmed));
  }

  const geo = await lookupPostcodeGeo(pc);
  if (!geo.ok) {
    return json(
      { results: [], query: trimmed, notFound: true },
      200,
      origin
    );
  }

  const pcNorm = normalizePostcode(geo.postcode || pc);
  const pcDisp = formatPostcode(pcNorm);
  const headers = epcAuthHeaders(env);
  const results = [];

  if (headers) {
    const epcSearchUrl = `${EPC_BASE}/domestic/search?${new URLSearchParams({
      postcode: pcDisp,
      size: "500",
    }).toString()}`;
    const { res, body } = await fetchJson(epcSearchUrl, { headers });
    if (res.ok && body && Array.isArray(body.rows) && body.rows.length) {
      const seen = new Set();
      for (const row of body.rows) {
        const lmk = row["lmk-key"] || row.lmkKey || "";
        if (!lmk || seen.has(lmk)) continue;
        seen.add(lmk);
        const a1 =
          row.address1 ||
          row["address-line-1"] ||
          row["address_line_1"] ||
          "";
        const a2 = row.address2 || row["address-line-2"] || row["address_line_2"] || "";
        const a3 = row.address3 || row["address-line-3"] || row["address_line_3"] || "";
        const parts = [a1, a2, a3].filter((x) => x && String(x).trim());
        const line = parts.join(", ");
        const rowPc = formatPostcode(
          normalizePostcode(row.postcode || pcDisp)
        );
        const label = line
          ? `${line} — ${rowPc}`
          : `${rowPc} — EPC ${lmk.slice(0, 8)}…`;
        results.push({
          id: `epc:${lmk}`,
          label,
          postcode: rowPc,
          postcodeNormalized: normalizePostcode(rowPc),
          lat: geo.lat,
          lon: geo.lon,
          localAuthority:
            row["local-authority"] || geo.localAuthority || "",
          region: geo.region || "",
          country: geo.country || "",
          parliamentary_constituency: geo.parliamentary_constituency || "",
          uprn: row.uprn != null ? String(row.uprn) : "",
          lmkKey: lmk,
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({
      id: `pc:${pcNorm}`,
      label: `${pcDisp} — ${geo.localAuthority || "UK"}`,
      postcode: pcDisp,
      postcodeNormalized: pcNorm,
      lat: geo.lat,
      lon: geo.lon,
      localAuthority: geo.localAuthority || "",
      region: geo.region || "",
      country: geo.country || "",
      parliamentary_constituency: geo.parliamentary_constituency || "",
      uprn: "",
      lmkKey: "",
    });
  }

  return json(
    {
      results,
      query: trimmed,
      source:
        results.length > 1 || (results[0] && results[0].id.startsWith("epc:"))
          ? "epc+postcodes"
          : "postcodes",
    },
    200,
    origin
  );
}

async function handleGeo(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = formatPostcode(normalizePostcode(postcode));
  if (!pc.replace(/\s/g, "")) {
    return json({ result: null, error: "Missing postcode" }, 400, origin);
  }

  const { res, body } = await fetchJson(
    `${POSTCODES_BASE}/postcodes/${encodeURIComponent(pc)}`
  );
  if (!res.ok) {
    return json({ result: null, notFound: true }, 200, origin);
  }
  const r = body.result || body;
  return json(
    {
      result: {
        postcode: r.postcode,
        lat: r.latitude,
        lon: r.longitude,
        localAuthority: r.codes?.admin_district || r.admin_district || "",
      },
    },
    200,
    origin
  );
}

async function handleAddress(url, env, origin) {
  const uprn = url.searchParams.get("uprn") || "";
  if (!uprn) {
    return json({ address: null, error: "Missing uprn" }, 400, origin);
  }

  const headers = await epcAuthHeaders(env);
  if (!headers) {
    return json(
      {
        address: {
          uprn,
          line1: "",
          postcode: "",
          source: "epc_unconfigured",
        },
        warning: "EPC auth not set — address enrichment limited",
      },
      200,
      origin
    );
  }

  const { res, body } = await fetchJson(
    `${EPC_BASE}/domestic/search?uprn=${encodeURIComponent(uprn)}`,
    { headers }
  );

  if (!res.ok) {
    return json({ address: { uprn, line1: "", postcode: "" }, epcError: true }, 200, origin);
  }

  const rows = body.rows || [];
  const first = rows[0] || {};
  return json(
    {
      address: {
        uprn,
        line1: first.address1 || first.address || "",
        line2: first.address2 || "",
        line3: first.address3 || "",
        postcode: first.postcode || "",
        localAuthority: first["local-authority"] || first.localAuthority || "",
        lmkKey: first["lmk-key"] || "",
      },
    },
    200,
    origin
  );
}

async function handleEpcSearch(url, env, origin) {
  const headers = await epcAuthHeaders(env);
  if (!headers) {
    return json(
      { rows: [], message: "EPC auth not configured on worker" },
      200,
      origin
    );
  }

  const postcode = url.searchParams.get("postcode");
  const uprn = url.searchParams.get("uprn");
  let target = "";
  if (postcode) {
    const q = new URLSearchParams({
      postcode: formatPostcode(normalizePostcode(postcode)),
      size: "500",
    });
    target = `${EPC_BASE}/domestic/search?${q.toString()}`;
  } else if (uprn) {
    target = `${EPC_BASE}/domestic/search?uprn=${encodeURIComponent(uprn)}`;
  } else {
    return json({ error: "Provide postcode or uprn" }, 400, origin);
  }

  const { res, body } = await fetchJson(target, { headers });
  if (!res.ok) {
    return json({ rows: [], status: res.status, upstream: body }, res.status, origin);
  }
  return json(body, 200, origin);
}

async function handleEpcCertificate(url, env, origin) {
  const headers = await epcAuthHeaders(env);
  if (!headers) {
    return json({ certificate: null, message: "EPC auth not configured" }, 200, origin);
  }

  const rrn = url.searchParams.get("rrn") || "";
  if (!rrn) {
    return json({ error: "Missing rrn (lmk-key)" }, 400, origin);
  }

  const target = `${EPC_BASE}/domestic/certificate/${encodeURIComponent(rrn)}`;
  const { res, body } = await fetchJson(target, { headers });
  if (!res.ok) {
    return json({ certificate: null, status: res.status }, res.status, origin);
  }
  return json(body, 200, origin);
}

function sparqlStringLiteral(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

async function landRegistrySparql(query) {
  const body = new URLSearchParams();
  body.set("query", query);
  const res = await fetch(LR_SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { res, parsed, text };
}

function sparqlBindingValue(binding, name) {
  const cell = binding[name];
  if (!cell || typeof cell !== "object") return "";
  if (cell.value != null && cell.value !== undefined) return String(cell.value);
  return "";
}

function normAddrMatch(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenScore(a, b) {
  const ta = normAddrMatch(a)
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const tb = new Set(
    normAddrMatch(b)
      .split(/\s+/)
      .filter((w) => w.length > 1)
  );
  if (!ta.length || !tb.size) return 0;
  let score = 0;
  for (const t of ta) {
    if (tb.has(t)) score += t.length;
  }
  return score;
}

function epcAddressBlob(row) {
  const a1 =
    row.address1 ||
    row["address-line-1"] ||
    row["address_line_1"] ||
    "";
  const a2 =
    row.address2 || row["address-line-2"] || row["address_line_2"] || "";
  const a3 =
    row.address3 || row["address-line-3"] || row["address_line_3"] || "";
  return [a1, a2, a3].filter((x) => x && String(x).trim()).join(" ");
}

function epcFloorSqm(row) {
  const raw =
    row["total-floor-area"] ??
    row.totalFloorArea ??
    row["total_floor_area"] ??
    "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function epcEnergyRating(row) {
  const r = String(
    row["current-energy-rating"] ??
      row.currentEnergyRating ??
      row["current_energy_rating"] ??
      ""
  ).trim();
  return r ? r.toUpperCase() : "";
}

/** Best EPC search row for a Land Registry address line (floor area + rating when present). */
function bestEpcMatchForLine(epcRows, lrLine) {
  const line = normAddrMatch(lrLine);
  if (!line) return { sqm: 0, rating: "" };
  let bestSqm = 0;
  let bestRating = "";
  let bestScore = -1;
  for (const row of epcRows) {
    const blob = epcAddressBlob(row);
    const nBlob = normAddrMatch(blob);
    let score = tokenScore(lrLine, blob);
    if (nBlob && (nBlob.includes(line) || line.includes(nBlob))) {
      score += 50;
    }
    if (score <= 0) continue;
    const sqm = epcFloorSqm(row);
    const rating = epcEnergyRating(row);
    const better =
      score > bestScore ||
      (score === bestScore &&
        (sqm > bestSqm || (sqm === bestSqm && rating && !bestRating)));
    if (better) {
      bestScore = score;
      bestSqm = sqm;
      bestRating = rating;
    }
  }
  return { sqm: bestSqm, rating: bestRating };
}

async function fetchEpcRowsForPostcode(postcodeDisplay, env) {
  const headers = epcAuthHeaders(env);
  if (!headers) return [];
  const q = new URLSearchParams({
    postcode: postcodeDisplay,
    size: "500",
  });
  const { res, body } = await fetchJson(
    `${EPC_BASE}/domestic/search?${q.toString()}`,
    { headers }
  );
  if (!res.ok || !body || !Array.isArray(body.rows)) return [];
  return body.rows;
}

function buildPpdRecentSparql(postcodeFormatted) {
  const lit = sparqlStringLiteral(postcodeFormatted);
  return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>

SELECT ?paon ?saon ?street ?town ?postcode ?amount ?date ?category ?ptypeLabel
WHERE {
  VALUES ?postcode { "${lit}"^^xsd:string }

  ?addr lrcommon:postcode ?postcode .

  ?transx lrppi:propertyAddress ?addr ;
          lrppi:pricePaid ?amount ;
          lrppi:transactionDate ?date ;
          lrppi:transactionCategory/skos:prefLabel ?category .
  OPTIONAL { ?transx lrppi:propertyType/skos:prefLabel ?ptypeLabel . }
  OPTIONAL { ?addr lrcommon:paon ?paon }
  OPTIONAL { ?addr lrcommon:saon ?saon }
  OPTIONAL { ?addr lrcommon:street ?street }
  OPTIONAL { ?addr lrcommon:town ?town }
}
ORDER BY DESC(?date)
LIMIT 5
`.trim();
}

function monthKeyFromRefMonthBinding(b) {
  const v = sparqlBindingValue(b, "refMonth");
  if (!v) return "";
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  const m = String(v).match(/(\d{4}-\d{2})/);
  return m ? m[1] : v.slice(0, 7);
}

function ukhpiLaFilterToken(la) {
  let s = String(la || "").trim();
  if (!s) return "";
  s = s.replace(
    /^(city of|london borough of|royal borough of|borough of)\s+/i,
    ""
  );
  return s.trim();
}

function buildUkhpiSparql(laFilterToken) {
  const lit = sparqlStringLiteral(laFilterToken);
  return `
PREFIX ukhpi: <http://landregistry.data.gov.uk/def/ukhpi/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?region ?refMonth ?ukhpi ?volume ?regionName
WHERE {
  ?obs ukhpi:refRegion ?region ;
       ukhpi:refMonth ?refMonth ;
       ukhpi:housePriceIndex ?ukhpi .
  OPTIONAL { ?obs ukhpi:salesVolume ?volume }
  ?region rdfs:label ?regionName .
  FILTER (lang(?regionName) = "" || langMatches(lang(?regionName), "en"))
  FILTER (CONTAINS(lcase(str(?regionName)), lcase("${lit}")))
}
ORDER BY DESC(?refMonth)
LIMIT 300
`.trim();
}

/** Land Registry PPD via SPARQL; optional EPC domestic search for floor area when worker has EPC auth. */
async function handlePpiRecent(url, env, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ transactions: [], error: "Missing postcode" }, 400, origin);
  }

  const postcodeOut = formatPostcode(pc);
  const query = buildPpdRecentSparql(postcodeOut);
  const { res, parsed } = await landRegistrySparql(query);

  if (!res.ok || !parsed || !parsed.results || !Array.isArray(parsed.results.bindings)) {
    return json(
      {
        transactions: [],
        postcode: postcodeOut,
        meta: {
          note: "Land Registry SPARQL did not return JSON results.",
          status: res.status,
        },
      },
      200,
      origin
    );
  }

  const bindings = parsed.results.bindings;
  const transactions = bindings.map((b) => {
    const amountStr = sparqlBindingValue(b, "amount");
    const dateStr = sparqlBindingValue(b, "date");
    const price = Math.round(Number(amountStr)) || 0;
    const ptype = sparqlBindingValue(b, "ptypeLabel");
    const category = sparqlBindingValue(b, "category");
    const paon = sparqlBindingValue(b, "paon");
    const saon = sparqlBindingValue(b, "saon");
    const street = sparqlBindingValue(b, "street");
    const town = sparqlBindingValue(b, "town");
    const addrParts = [paon, saon, street, town].filter((x) => x && String(x).trim());
    const address = addrParts.length ? addrParts.join(", ") : postcodeOut;
    return {
      price,
      amount: price,
      date: dateStr ? dateStr.slice(0, 10) : "",
      propertyType: ptype || category || "",
      tenure: "",
      postcode: sparqlBindingValue(b, "postcode") || postcodeOut,
      address,
      paon,
      saon,
      street,
      town,
      sqm: 0,
      floorAreaSqm: 0,
      epcRating: "",
    };
  });

  const epcRows = await fetchEpcRowsForPostcode(postcodeOut, env);
  for (const t of transactions) {
    const line = [t.paon, t.saon, t.street, t.town].filter(Boolean).join(" ");
    const match = bestEpcMatchForLine(epcRows, line);
    t.sqm = match.sqm;
    t.floorAreaSqm = match.sqm;
    t.epcRating = match.rating;
  }

  return json(
    {
      transactions,
      postcode: postcodeOut,
      meta: {
        note: epcRows.length
          ? "PPD from Land Registry SPARQL; floor area matched from EPC domestic search where possible."
          : "PPD from Land Registry SPARQL; set EPC_EMAIL + EPC_API_KEY to enrich with EPC floor areas.",
        source: "landregistry-sparql",
      },
    },
    200,
    origin
  );
}

async function handleHpi(url, origin) {
  let la = url.searchParams.get("la") || "";
  const month = url.searchParams.get("month") || "";
  const pcHint = url.searchParams.get("postcode") || "";

  if (!ukhpiLaFilterToken(la) && pcHint) {
    const geo = await lookupPostcodeGeo(formatPostcode(normalizePostcode(pcHint)));
    if (geo.ok && geo.localAuthority) {
      la = geo.localAuthority;
    }
  }

  const token = ukhpiLaFilterToken(la);

  if (!token || token.length < 2) {
    return json(
      {
        la: la || null,
        month: month || null,
        index: null,
        series: [],
        meta: {
          note:
            "Missing local authority for UKHPI (pass la= or postcode= so we can resolve admin district).",
        },
      },
      200,
      origin
    );
  }

  const query = buildUkhpiSparql(token);
  const { res, parsed } = await landRegistrySparql(query);

  if (!res.ok || !parsed || !parsed.results || !Array.isArray(parsed.results.bindings)) {
    return json(
      {
        la,
        month: month || null,
        index: null,
        series: [],
        meta: {
          note: "UKHPI SPARQL request failed or returned no bindings.",
          status: res.status,
        },
      },
      200,
      origin
    );
  }

  let rows = parsed.results.bindings;
  if (!rows.length) {
    return json(
      {
        la,
        month: month || null,
        index: null,
        series: [],
        meta: { note: "No UKHPI rows matched this local authority label." },
      },
      200,
      origin
    );
  }

  const region0 = sparqlBindingValue(rows[0], "region");
  if (region0) {
    rows = rows.filter((b) => sparqlBindingValue(b, "region") === region0);
  }

  const points = rows
    .map((b) => {
      const mk = monthKeyFromRefMonthBinding(b);
      const ukhpiStr = sparqlBindingValue(b, "ukhpi");
      const val = parseFloat(ukhpiStr);
      return {
        month: mk,
        value: Number.isFinite(val) ? val : 0,
        volume: sparqlBindingValue(b, "volume"),
        regionName: sparqlBindingValue(b, "regionName"),
      };
    })
    .filter((p) => p.month);

  const byMonth = new Map();
  for (const p of points) {
    if (p.month && p.value > 0) {
      byMonth.set(p.month, p.value);
    }
  }
  const monthsAsc = [...byMonth.keys()].sort((a, b) => a.localeCompare(b));
  const series = monthsAsc.map((m) => ({
    month: m,
    value: byMonth.get(m),
    index: byMonth.get(m),
  }));

  const target = /^\d{4}-\d{2}$/.test(month) ? month : "";
  let chosenMonth = null;
  let chosenVal = null;
  if (target && monthsAsc.length) {
    const atOrBefore = monthsAsc.filter((m) => m <= target);
    const key = atOrBefore.length ? atOrBefore[atOrBefore.length - 1] : null;
    if (key) {
      chosenMonth = key;
      chosenVal = byMonth.get(key);
    }
  }
  if ((chosenVal == null || chosenVal <= 0) && monthsAsc.length) {
    const key = monthsAsc[monthsAsc.length - 1];
    chosenMonth = key;
    chosenVal = byMonth.get(key);
  }

  const regionLabel = sparqlBindingValue(rows[0], "regionName") || la;

  return json(
    {
      la,
      month: chosenMonth || month || null,
      index: chosenVal != null && chosenVal > 0 ? chosenVal : null,
      series,
      meta: {
        note:
          chosenVal != null && chosenVal > 0
            ? `UKHPI house price index (${regionLabel}).`
            : "UKHPI matched region but index value missing.",
        source: "landregistry-ukhpi-sparql",
      },
    },
    200,
    origin
  );
}

async function handleSchoolsNearby(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ schools: [], error: "Missing postcode" }, 400, origin);
  }

  const { body } = await fetchJson(
    `${POSTCODES_BASE}/postcodes/${encodeURIComponent(formatPostcode(pc))}`
  );
  const r = body.result || body;
  const lat = r.latitude;
  const lon = r.longitude;

  return json(
    {
      schools: [],
      postcode: formatPostcode(pc),
      lat,
      lon,
      meta: { note: "DfE / Edubase proximity search can be added here" },
    },
    200,
    origin
  );
}

async function handleTransport(url, origin) {
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return json({ stops: [], error: "Invalid lat/lon" }, 400, origin);
  }

  return json(
    {
      stops: [],
      lat,
      lon,
      meta: { note: "National Rail / TfL stops can be integrated" },
    },
    200,
    origin
  );
}

async function handleBroadband(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ coverage: null, error: "Missing postcode" }, 400, origin);
  }

  return json(
    {
      postcode: formatPostcode(pc),
      maxDownloadMbps: null,
      maxUploadMbps: null,
      tech: [],
      meta: { note: "Ofcom coverage API integration placeholder" },
    },
    200,
    origin
  );
}

async function handleFlood(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ risk: null, error: "Missing postcode" }, 400, origin);
  }

  return json(
    {
      postcode: formatPostcode(pc),
      riskLevel: "UNKNOWN",
      floodRisk: [],
      meta: { note: "Environment Agency flood map API placeholder" },
    },
    200,
    origin
  );
}

async function handleRadon(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ band: null, error: "Missing postcode" }, 400, origin);
  }

  return json(
    {
      postcode: formatPostcode(pc),
      band: "UNKNOWN",
      riskLevel: "UNKNOWN",
      meta: { note: "UKHSA radon postcode lookup placeholder" },
    },
    200,
    origin
  );
}
