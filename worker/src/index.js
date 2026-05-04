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
const OFSTED_REPORTS_BASE = "https://reports.ofsted.gov.uk";

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

/** UK UPRN is numeric, typically 7–12 digits (spaces ignored). */
function looksLikeUprn(s) {
  const t = String(s || "").replace(/\s+/g, "");
  return /^\d{7,12}$/.test(t);
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
    // Human name (e.g. "Westminster") for UKHPI label CONTAINS; codes.admin_district is ONS code (e.g. E09000033).
    localAuthority: r.admin_district || r.codes?.admin_district || "",
    region: r.region || "",
    country: r.country || "",
    parliamentary_constituency: r.parliamentary_constituency || "",
  };
}

/**
 * Resolve by UPRN: EPC domestic search only; geocode each row’s postcode for map centroid.
 */
async function handleResolveByUprn(uprnDigits, env, origin) {
  const headers = epcAuthHeaders(env);
  if (!headers) {
    return json(
      {
        results: [],
        query: uprnDigits,
        hint: "EPC auth not configured on worker — cannot resolve by UPRN.",
        source: "uprn",
      },
      200,
      origin
    );
  }

  const epcSearchUrl = `${EPC_BASE}/domestic/search?${new URLSearchParams({
    uprn: uprnDigits,
    size: "50",
  }).toString()}`;
  const { res, body } = await fetchJson(epcSearchUrl, { headers });
  if (!res.ok) {
    return json(
      {
        results: [],
        query: uprnDigits,
        hint: "EPC search by UPRN failed.",
        status: res.status,
        source: "uprn",
      },
      200,
      origin
    );
  }

  const epcRows = body && Array.isArray(body.rows) ? body.rows : [];
  if (!epcRows.length) {
    return json(
      {
        results: [],
        query: uprnDigits,
        hint: "No domestic EPC records found for this UPRN.",
        source: "uprn",
      },
      200,
      origin
    );
  }

  const geoCache = new Map();
  async function geoForPostcode(pcDisp) {
    if (!pcDisp || !String(pcDisp).trim()) return null;
    const key = normalizePostcode(pcDisp);
    if (geoCache.has(key)) return geoCache.get(key);
    const g = await lookupPostcodeGeo(formatPostcode(key));
    geoCache.set(key, g);
    return g;
  }

  const results = [];
  const seen = new Set();
  for (const row of epcRows) {
    const lmk = row["lmk-key"] || row.lmkKey || "";
    if (!lmk || seen.has(lmk)) continue;
    seen.add(lmk);
    const rowPcRaw = row.postcode || "";
    const rowPc = rowPcRaw
      ? formatPostcode(normalizePostcode(rowPcRaw))
      : "";
    const geo = rowPc ? await geoForPostcode(rowPc) : null;
    const a1 =
      row.address1 ||
      row["address-line-1"] ||
      row["address_line_1"] ||
      "";
    const a2 = row.address2 || row["address-line-2"] || row["address_line_2"] || "";
    const a3 = row.address3 || row["address-line-3"] || row["address_line_3"] || "";
    const parts = [a1, a2, a3].filter((x) => x && String(x).trim());
    const line = parts.join(", ");
    const pcNorm = rowPc ? normalizePostcode(rowPc) : "";
    const label = line
      ? `${line} — ${rowPc || uprnDigits}`
      : `UPRN ${uprnDigits} — EPC ${lmk.slice(0, 8)}…`;
    results.push({
      id: `epc:${lmk}`,
      label,
      addressLine: line,
      hasEpc: true,
      postcode: rowPc || "",
      postcodeNormalized: pcNorm,
      lat: geo && geo.ok ? geo.lat : "",
      lon: geo && geo.ok ? geo.lon : "",
      localAuthority:
        row["local-authority"] ||
        (geo && geo.ok ? geo.localAuthority : "") ||
        "",
      region: geo && geo.ok ? geo.region || "" : "",
      country: geo && geo.ok ? geo.country || "" : "",
      parliamentary_constituency:
        geo && geo.ok ? geo.parliamentary_constituency || "" : "",
      uprn: row.uprn != null ? String(row.uprn) : uprnDigits,
      lmkKey: lmk,
    });
  }

  if (results.length === 0) {
    return json(
      {
        results: [],
        query: uprnDigits,
        hint: "No usable EPC rows for this UPRN.",
        source: "uprn",
      },
      200,
      origin
    );
  }

  return json(
    {
      results,
      query: uprnDigits,
      source: "uprn+epc+postcodes",
    },
    200,
    origin
  );
}

/**
 * Resolve: prefer many EPC domestic certificates for the postcode (dropdown per property);
 * fall back to a single postcodes.io centroid row if EPC is unavailable or returns nothing.
 * Numeric 7–12 digit input is treated as UPRN (EPC domestic search).
 */
async function handleResolve(url, env, origin) {
  const input = url.searchParams.get("input") || "";
  const trimmed = input.trim();
  if (!trimmed) {
    return json({ results: [] }, 200, origin);
  }

  const compactUprn = trimmed.replace(/\s+/g, "");
  if (looksLikeUprn(compactUprn)) {
    return handleResolveByUprn(compactUprn, env, origin);
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
  const seenAddressKeys = new Set();

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
        const addrKey = normAddrMatch(`${line} ${rowPc}`);
        if (addrKey) seenAddressKeys.add(addrKey);
        results.push({
          id: `epc:${lmk}`,
          label,
          addressLine: line,
          hasEpc: true,
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

  // Fallback source for addresses that may not have EPC rows:
  // Land Registry PPD addresses (distinct address forms by postcode).
  // This is still not a full national address database, but it helps surface
  // non-EPC properties that have appeared in PPD data.
  const ppdFallbackRows = await fetchDistinctPpdAddressesForPostcode(pcDisp);
  for (const row of ppdFallbackRows) {
    const line = [row.paon, row.saon, row.street, row.town]
      .filter((x) => x && String(x).trim())
      .join(", ");
    const rowPc = formatPostcode(normalizePostcode(row.postcode || pcDisp));
    const addrKey = normAddrMatch(`${line} ${rowPc}`);
    if (!addrKey || seenAddressKeys.has(addrKey)) continue;
    seenAddressKeys.add(addrKey);
    const label = line ? `${line} — ${rowPc}` : rowPc;
    results.push({
      id: `ppd:${addrKey}`,
      label,
      addressLine: line,
      hasEpc: false,
      postcode: rowPc,
      postcodeNormalized: normalizePostcode(rowPc),
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

  results.sort((a, b) => compareAddressResults(a, b));

  if (results.length === 0) {
    results.push({
      id: `pc:${pcNorm}`,
      label: `${pcDisp} — ${geo.localAuthority || "UK"}`,
      addressLine: "",
      hasEpc: false,
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

function extractPrimaryAddressText(result) {
  const line = String(result?.addressLine || "").trim();
  if (line) return line;
  const label = String(result?.label || "").trim();
  if (!label) return "";
  return label.split("—")[0].trim();
}

function firstNumberInAddress(s) {
  const m = String(s || "").match(/\b(\d+)\b/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function compareAddressResults(a, b) {
  const aAddr = extractPrimaryAddressText(a);
  const bAddr = extractPrimaryAddressText(b);
  const aNum = firstNumberInAddress(aAddr);
  const bNum = firstNumberInAddress(bAddr);
  if (aNum !== bNum) return aNum - bNum;
  return aAddr.localeCompare(bAddr, "en-GB", {
    numeric: true,
    sensitivity: "base",
  });
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
        // Human name (e.g. "Westminster") for UKHPI label CONTAINS; codes.admin_district is ONS code (e.g. E09000033).
        localAuthority: r.admin_district || r.codes?.admin_district || "",
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
LIMIT 10
`.trim();
}

function buildPpdDistinctAddressesSparql(postcodeFormatted) {
  const lit = sparqlStringLiteral(postcodeFormatted);
  return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>

SELECT DISTINCT ?paon ?saon ?street ?town ?postcode
WHERE {
  VALUES ?postcode { "${lit}"^^xsd:string }
  ?addr lrcommon:postcode ?postcode .
  ?transx lrppi:propertyAddress ?addr .
  OPTIONAL { ?addr lrcommon:paon ?paon }
  OPTIONAL { ?addr lrcommon:saon ?saon }
  OPTIONAL { ?addr lrcommon:street ?street }
  OPTIONAL { ?addr lrcommon:town ?town }
}
LIMIT 600
`.trim();
}

async function fetchDistinctPpdAddressesForPostcode(postcodeFormatted) {
  const query = buildPpdDistinctAddressesSparql(postcodeFormatted);
  const { res, parsed } = await landRegistrySparql(query);
  if (!res.ok || !parsed || !parsed.results || !Array.isArray(parsed.results.bindings)) {
    return [];
  }
  const rows = parsed.results.bindings.map((b) => ({
    paon: sparqlBindingValue(b, "paon"),
    saon: sparqlBindingValue(b, "saon"),
    street: sparqlBindingValue(b, "street"),
    town: sparqlBindingValue(b, "town"),
    postcode: sparqlBindingValue(b, "postcode") || postcodeFormatted,
  }));
  return rows;
}

/**
 * UKHPI period key (YYYY-MM): refMonth literal/URI, refPeriodStart (xsd:date),
 * or observation URI …/month/YYYY-MM (Land Registry pattern).
 */
function monthKeyFromUkhpiBinding(b) {
  const rm = sparqlBindingValue(b, "refMonth");
  if (rm) {
    const s = String(rm).trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    const m = s.match(/(\d{4}-\d{2})/);
    if (m) return m[1];
    return s.length >= 7 ? s.slice(0, 7) : "";
  }
  const rp = sparqlBindingValue(b, "refPeriodStart");
  if (rp) {
    const s = String(rp).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
    const m = s.match(/(\d{4}-\d{2})/);
    return m ? m[1] : "";
  }
  const obs = sparqlBindingValue(b, "obs");
  if (obs) {
    const m = String(obs).match(/\/month\/(\d{4}-\d{2})/i);
    if (m) return m[1];
  }
  return "";
}

/** Normalise postcodes.io / EPC admin district strings for UKHPI label CONTAINS. */
function ukhpiLaFilterToken(la) {
  let s = String(la || "").trim();
  if (!s) return "";
  s = s.replace(
    /^(city of|london borough of|royal borough of|borough of)\s+/i,
    ""
  );
  s = s.trim();
  if (s.includes(",")) {
    s = s.split(",")[0].trim();
    s = s.replace(
      /^(city of|london borough of|royal borough of|borough of)\s+/i,
      ""
    );
  }
  return s.trim();
}

/** Allow only Land Registry region slug characters in interpolated URIs. */
function validateUkhpiSlug(slug) {
  const s = String(slug || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,80}$/.test(s)) return "";
  return s;
}

function regionSlugFromRegionUri(uri) {
  const m = String(uri || "").match(/\/id\/region\/([^/#?]+)\s*$/i);
  if (!m) return "";
  return validateUkhpiSlug(m[1]);
}

/** Latest UKHPI index on or before sale month (same semantics as frontend hpiIndexForTransaction). */
function ukhpiIndexForObservedMonth(monthsAsc, byMonth, saleYyyyMm) {
  if (!saleYyyyMm || !/^\d{4}-\d{2}$/.test(saleYyyyMm) || !monthsAsc.length) {
    return null;
  }
  const last = monthsAsc[monthsAsc.length - 1];
  if (saleYyyyMm > last) return byMonth.get(last) ?? null;
  let chosen = null;
  for (const m of monthsAsc) {
    if (m <= saleYyyyMm) chosen = byMonth.get(m);
    else break;
  }
  if (chosen != null) return chosen;
  return byMonth.get(monthsAsc[0]) ?? null;
}

/** Discover `…/id/region/{slug}` by matching `rdfs:label` (CONTAINS). */
async function discoverUkhpiSlugForLabelSearch(searchToken) {
  const token = ukhpiLaFilterToken(searchToken);
  if (!token || token.length < 2) return { slug: "", label: "" };
  const esc = sparqlStringLiteral(token);
  const q = `
PREFIX ukhpi: <http://landregistry.data.gov.uk/def/ukhpi/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?region ?regionName
WHERE {
  ?obs ukhpi:refRegion ?region ;
       ukhpi:housePriceIndex ?hpiVal .
  ?region rdfs:label ?regionName .
  FILTER ( CONTAINS(lcase(str(?regionName)), lcase("${esc}")) )
}
LIMIT 50
`.trim();
  const { res, parsed } = await landRegistrySparql(q);
  if (!res.ok || !parsed || !parsed.results || !Array.isArray(parsed.results.bindings)) {
    return { slug: "", label: "" };
  }
  const bindings = parsed.results.bindings;
  const tokenLower = token.toLowerCase();
  let bestSlug = "";
  let bestLabel = "";
  let bestScore = -1;
  for (const b of bindings) {
    const label = sparqlBindingValue(b, "regionName").trim();
    const regionUri = sparqlBindingValue(b, "region");
    const slug = regionSlugFromRegionUri(regionUri);
    if (!slug || !label) continue;
    const ll = label.toLowerCase();
    let score = 0;
    if (ll === tokenLower) score = 1000;
    else if (ll.startsWith(`${tokenLower} `) || ll.endsWith(` ${tokenLower}`)) score = 800;
    else if (ll.includes(tokenLower)) score = 400 + Math.min(tokenLower.length, 30);
    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
      bestLabel = label;
    }
  }
  return { slug: bestSlug, label: bestLabel };
}

/** All monthly points for a fixed UKHPI refRegion slug (deterministic; SPARQL only). */
async function fetchUkhpiSeriesPointsForSlug(slug) {
  const s = validateUkhpiSlug(slug);
  if (!s) return [];
  const regionUri = `http://landregistry.data.gov.uk/id/region/${s}`;
  const q = `
PREFIX ukhpi: <http://landregistry.data.gov.uk/def/ukhpi/>

SELECT ?refMonth ?refPeriodStart ?hpiVal
WHERE {
  ?obs ukhpi:refRegion <${regionUri}> ;
       ukhpi:housePriceIndex ?hpiVal .
  OPTIONAL { ?obs ukhpi:refMonth ?refMonth }
  OPTIONAL { ?obs ukhpi:refPeriodStart ?refPeriodStart }
}
LIMIT 3000
`.trim();
  const { res, parsed } = await landRegistrySparql(q);
  if (!res.ok || !parsed || !parsed.results || !Array.isArray(parsed.results.bindings)) {
    return [];
  }
  const points = parsed.results.bindings
    .map((b) => {
      const mk = monthKeyFromUkhpiBinding(b);
      const hpiStr = sparqlBindingValue(b, "hpiVal");
      const val = parseFloat(hpiStr);
      return {
        month: mk,
        value: Number.isFinite(val) ? val : 0,
      };
    })
    .filter((p) => p.month && /^\d{4}-\d{2}$/.test(p.month) && p.value > 0);

  const byMonth = new Map();
  for (const p of points) {
    byMonth.set(p.month, p.value);
  }
  const monthsAsc = [...byMonth.keys()].sort((a, b) => a.localeCompare(b));
  return monthsAsc.map((m) => ({ month: m, value: byMonth.get(m) }));
}

/**
 * LA → UKHPI slug+series, else postcodes.io region → series, else UK `united-kingdom`.
 */
async function ukhpiFetchSlugSeriesForGeo(geo) {
  if (!geo || !geo.ok) return null;
  const laName = geo.localAuthority || "";
  const regionName = geo.region || "";

  if (laName) {
    const d = await discoverUkhpiSlugForLabelSearch(laName);
    if (d.slug) {
      const pts = await fetchUkhpiSeriesPointsForSlug(d.slug);
      if (pts.length) {
        return { slug: d.slug, label: d.label, tier: "la", points: pts };
      }
    }
  }
  if (regionName) {
    const d = await discoverUkhpiSlugForLabelSearch(regionName);
    if (d.slug) {
      const pts = await fetchUkhpiSeriesPointsForSlug(d.slug);
      if (pts.length) {
        return { slug: d.slug, label: d.label, tier: "region", points: pts };
      }
    }
  }
  const pts = await fetchUkhpiSeriesPointsForSlug("united-kingdom");
  if (pts.length) {
    return {
      slug: "united-kingdom",
      label: "United Kingdom",
      tier: "uk",
      points: pts,
    };
  }
  return null;
}

/**
 * Enrich PPD rows in-place: postcode → LA (postcodes.io), UKHPI slug+series,
 * factor = hpiNow / hpiSale, adjustedPrice = price × factor. Nulls when HPI missing.
 */
async function enrichPpiTransactionsWithUkhpi(postcodeFormatted, transactions) {
  const geo = await lookupPostcodeGeo(postcodeFormatted);
  const baseMeta = {
    hpiTier: null,
    hpiRegionSlug: null,
    hpiMatchedRegion: null,
    localAuthorityFromPostcode: "",
    hpiReferenceMonth: null,
    hpiNote: "",
  };

  for (const t of transactions) {
    t.saleMonth = t.date && t.date.length >= 7 ? t.date.slice(0, 7) : "";
    t.hpiSale = null;
    t.hpiNow = null;
    t.factor = null;
    t.adjustedPrice = null;
    t.hpiReferenceMonth = null;
    t.hpiRegionSlug = null;
    t.hpiTier = null;
    t.hpiMatchedRegion = null;
    t.localAuthority = "";
  }

  if (!geo.ok) {
    return {
      ...baseMeta,
      hpiNote: "Postcode not found; HPI enrichment skipped.",
    };
  }

  const laName = geo.localAuthority || "";
  baseMeta.localAuthorityFromPostcode = laName;

  const bundle = await ukhpiFetchSlugSeriesForGeo(geo);
  if (!bundle || !bundle.points.length) {
    for (const t of transactions) {
      t.localAuthority = laName;
    }
    return {
      ...baseMeta,
      hpiNote: "No UKHPI series for local authority, region, or UK fallback.",
    };
  }

  const byMonth = new Map();
  for (const p of bundle.points) {
    if (p.month && p.value > 0) byMonth.set(p.month, p.value);
  }
  const monthsAsc = [...byMonth.keys()].sort((a, b) => a.localeCompare(b));
  const hpiNowMonth = monthsAsc.length ? monthsAsc[monthsAsc.length - 1] : null;
  const hpiNowVal =
    hpiNowMonth != null ? byMonth.get(hpiNowMonth) : null;

  const tierWord =
    bundle.tier === "la"
      ? "local authority"
      : bundle.tier === "region"
        ? "region"
        : "UK";

  for (const t of transactions) {
    t.localAuthority = laName;
    t.hpiRegionSlug = bundle.slug;
    t.hpiTier = bundle.tier;
    t.hpiMatchedRegion = bundle.label;

    const saleMonth = t.saleMonth;
    if (!hpiNowVal || hpiNowVal <= 0 || !saleMonth || !t.price) continue;

    const saleIdx = ukhpiIndexForObservedMonth(monthsAsc, byMonth, saleMonth);
    if (saleIdx == null || saleIdx <= 0) continue;

    t.hpiSale = Math.round(saleIdx * 100) / 100;
    t.hpiNow = Math.round(hpiNowVal * 100) / 100;
    t.factor = Math.round((hpiNowVal / saleIdx) * 1e6) / 1e6;
    t.adjustedPrice = Math.round(t.price * (hpiNowVal / saleIdx));
    t.hpiReferenceMonth = hpiNowMonth;
  }

  return {
    hpiTier: bundle.tier,
    hpiRegionSlug: bundle.slug,
    hpiMatchedRegion: bundle.label,
    localAuthorityFromPostcode: laName,
    hpiReferenceMonth: hpiNowMonth,
    hpiNote: `UKHPI (${tierWord}: ${bundle.label}); reference month ${hpiNowMonth}.`,
  };
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

  const hpiMeta = await enrichPpiTransactionsWithUkhpi(postcodeOut, transactions);
  const baseNote = epcRows.length
    ? "PPD from Land Registry SPARQL; floor area matched from EPC domestic search where possible."
    : "PPD from Land Registry SPARQL; set EPC_EMAIL + EPC_API_KEY to enrich with EPC floor areas.";

  return json(
    {
      transactions,
      postcode: postcodeOut,
      meta: {
        note: baseNote,
        source: "landregistry-sparql",
        hpi: hpiMeta,
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

  let geo = { ok: false, localAuthority: "", region: "" };
  if (pcHint) {
    geo = await lookupPostcodeGeo(formatPostcode(normalizePostcode(pcHint)));
  }
  if (!ukhpiLaFilterToken(la) && geo.ok && geo.localAuthority) {
    la = geo.localAuthority;
  }

  let bundle = null;
  if (ukhpiLaFilterToken(la)) {
    const d = await discoverUkhpiSlugForLabelSearch(la);
    if (d.slug) {
      const pts = await fetchUkhpiSeriesPointsForSlug(d.slug);
      if (pts.length) {
        bundle = { slug: d.slug, label: d.label, tier: "la", points: pts };
      }
    }
  }
  if (!bundle && geo.ok) {
    bundle = await ukhpiFetchSlugSeriesForGeo(geo);
  }

  const laOut = la || (geo.ok ? geo.localAuthority : "") || "";

  if (!bundle || !bundle.points.length) {
    return json(
      {
        la: laOut || null,
        month: month || null,
        index: null,
        series: [],
        meta: {
          note:
            "No UKHPI series (try la= district name, postcode=, or check Land Registry).",
          source: "landregistry-ukhpi-sparql",
        },
      },
      200,
      origin
    );
  }

  const byMonth = new Map();
  for (const p of bundle.points) {
    if (p.month && p.value > 0) byMonth.set(p.month, p.value);
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

  return json(
    {
      la: laOut || bundle.label,
      month: chosenMonth || month || null,
      index: chosenVal != null && chosenVal > 0 ? chosenVal : null,
      series,
      meta: {
        note:
          chosenVal != null && chosenVal > 0
            ? `UKHPI (${bundle.tier}) ${bundle.label}.`
            : "UKHPI series present but reference index missing.",
        source: "landregistry-ukhpi-sparql",
        hpiTier: bundle.tier,
        hpiRegionSlug: bundle.slug,
      },
    },
    200,
    origin
  );
}

function decodeHtmlEntities(s) {
  return String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function milesTextToMetres(text) {
  const m = String(text).match(/([\d.]+)\s*miles?/i);
  if (!m) return 0;
  const miles = parseFloat(m[1]);
  return Number.isFinite(miles) && miles >= 0
    ? Math.round(miles * 1609.344)
    : 0;
}

/**
 * Parse Ofsted "Find an inspection report" HTML (results list).
 * Matches markup from reports.ofsted.gov.uk search (class names may change).
 */
function parseOfstedSearchResults(html) {
  const itemRe =
    /<h3 class="search-result__title[^"]*"[^>]*>\s*<a href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h3>\s*<ul class="search-result__provider-info">\s*<li>\s*Category:\s*<strong>([^<]*)<\/strong>\s*<\/li>\s*<\/ul>\s*<address class="search-result__address">\s*([^<]*?)\s*<\/address>\s*<strong class="address-distance">\s*([^<]*?)\s*<\/strong>\s*(?:<ul class="search-result__provider-info">\s*<li>\s*Rating:\s*<strong>([^<]*)<\/strong>\s*<\/li>\s*<\/ul>\s*)?\s*<ul class="search-result__provider-info">\s*<li>\s*Latest report:\s*<strong>\s*<time>([^<]*)<\/time>\s*<\/strong>\s*<\/li>\s*<li>\s*URN:\s*<strong>([^<]*)<\/strong>\s*<\/li>\s*<\/ul>/gi;

  const schools = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const href = decodeHtmlEntities(m[1]).trim();
    const name = decodeHtmlEntities(m[2]).trim();
    const category = decodeHtmlEntities(m[3]).trim();
    const address = decodeHtmlEntities(m[4]).trim();
    const distText = decodeHtmlEntities(m[5]).trim();
    const rating = m[6] ? decodeHtmlEntities(m[6]).trim() : "";
    const lastReport = decodeHtmlEntities(m[7]).trim();
    const urn = decodeHtmlEntities(m[8]).trim();
    const path = href.startsWith("http") ? href : `${OFSTED_REPORTS_BASE}${href}`;
    schools.push({
      name,
      phase: category,
      type: "Ofsted",
      distanceMetres: milesTextToMetres(distText),
      ofstedRating: rating,
      address,
      urn,
      lastReport,
      reportUrl: path,
    });
  }
  return schools;
}

const OFSTED_RADIUS_MILES = 2;
const OFSTED_MAX_RESULTS = 10;
const OFSTED_RADIUS_METRES = Math.round(OFSTED_RADIUS_MILES * 1609.344);

function buildOfstedSearchUrl(postcodeFormatted, lat, lon) {
  const p = new URLSearchParams();
  p.set("q", "");
  p.set("location", postcodeFormatted);
  const la = lat != null ? Number(lat) : NaN;
  const lo = lon != null ? Number(lon) : NaN;
  if (Number.isFinite(la) && Number.isFinite(lo)) {
    p.set("lat", String(la));
    p.set("lon", String(lo));
  } else {
    p.set("lat", "");
    p.set("lon", "");
  }
  p.set("radius", String(OFSTED_RADIUS_MILES));
  p.set("level_1_types", "2");
  p.set("level_2_types", "7");
  p.set("latest_report_date_start", "");
  p.set("latest_report_date_end", "");
  p.append("status[]", "1");
  p.set("start", "0");
  p.set("rows", String(OFSTED_MAX_RESULTS));
  return `${OFSTED_REPORTS_BASE}/search?${p.toString()}`;
}

async function handleSchoolsNearby(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ schools: [], error: "Missing postcode" }, 400, origin);
  }

  const pcOut = formatPostcode(pc);
  const { res: pcRes, body } = await fetchJson(
    `${POSTCODES_BASE}/postcodes/${encodeURIComponent(pcOut)}`
  );
  const r = body.result || body;
  const lat = pcRes.ok ? r.latitude : undefined;
  const lon = pcRes.ok ? r.longitude : undefined;

  let schools = [];
  let ofstedNote = "";
  try {
    const ofstedUrl = buildOfstedSearchUrl(pcOut, lat, lon);
    const oRes = await fetch(ofstedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PoundsPerWorker/1.0; residential-property-dashboard)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    if (!oRes.ok) {
      ofstedNote = `Ofsted search returned HTTP ${oRes.status}.`;
    } else {
      const html = await oRes.text();
      schools = parseOfstedSearchResults(html)
        .filter((s) => {
          const d = Number(s.distanceMetres) || 0;
          if (d <= 0) return true;
          return d <= OFSTED_RADIUS_METRES;
        })
        .slice(0, OFSTED_MAX_RESULTS);
      if (!schools.length && html.includes("search-result")) {
        ofstedNote =
          "Ofsted HTML was fetched but no listings matched the parser (markup may have changed).";
      } else if (!schools.length) {
        ofstedNote =
          "No Ofsted results block found in the response (blocked, cookie wall, or layout change).";
      }
    }
  } catch (e) {
    ofstedNote = e.message || "Ofsted fetch failed";
  }

  return json(
    {
      schools,
      postcode: pcOut,
      lat,
      lon,
      meta: {
        note:
          ofstedNote ||
          (schools.length
            ? `Nearest open providers (Ofsted): childcare → nursery school / school with nursery, within ~${OFSTED_RADIUS_MILES} miles of the postcode (up to ${OFSTED_MAX_RESULTS} shown).`
            : "No schools parsed from Ofsted for this postcode."),
        source: "reports.ofsted.gov.uk",
      },
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
