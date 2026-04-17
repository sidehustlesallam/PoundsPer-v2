/**
 * £Per API — Cloudflare Worker (plain JavaScript, no build step).
 * Deploy manually via the Cloudflare Dashboard; bind a secret named EPC_TOKEN for EPC upstream calls.
 * Implements the strict API contract; CORS enabled; EPC_TOKEN never exposed to clients.
 */

const POSTCODES_BASE = "https://api.postcodes.io";
const EPC_BASE = "https://epc.opendatacommunities.org/api/v1";

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

async function epcAuthHeaders(env) {
  const token = env.EPC_TOKEN;
  if (!token) {
    return null;
  }
  const b64 = btoa(`${token}:`);
  return {
    Authorization: `Basic ${b64}`,
    Accept: "application/json",
  };
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
        return handleResolve(url, origin);
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
        return handlePpiRecent(url, origin);
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

async function handleResolve(url, origin) {
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

  const { res, body } = await fetchJson(
    `${POSTCODES_BASE}/postcodes/${encodeURIComponent(pc)}`
  );

  if (!res.ok || body.status === 404) {
    return json({ results: [], query: trimmed, notFound: true }, 200, origin);
  }

  if (body.error) {
    return json({ results: [], query: trimmed, error: body.error }, 200, origin);
  }

  const r = body.result || body;
  const postcode = r.postcode || pc;
  const id = `pc:${normalizePostcode(postcode)}`;
  const lat = r.latitude;
  const lon = r.longitude;
  const la = r.codes?.admin_district || r.admin_district || "";

  return json({
    results: [
      {
        id,
        label: `${postcode} — ${r.admin_district || "UK"}`,
        postcode: formatPostcode(postcode),
        postcodeNormalized: normalizePostcode(postcode),
        lat,
        lon,
        localAuthority: la,
        region: r.region || "",
        country: r.country || "",
        parliamentary_constituency: r.parliamentary_constituency || "",
      },
    ],
  }, 200, origin);
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
        warning: "EPC_TOKEN not set — address enrichment limited",
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
      { rows: [], message: "EPC_TOKEN not configured on worker" },
      200,
      origin
    );
  }

  const postcode = url.searchParams.get("postcode");
  const uprn = url.searchParams.get("uprn");
  let target = "";
  if (postcode) {
    target = `${EPC_BASE}/domestic/search?postcode=${encodeURIComponent(formatPostcode(normalizePostcode(postcode)))}`;
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
    return json({ certificate: null, message: "EPC_TOKEN not configured" }, 200, origin);
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

/** Land Registry PPD — recent transactions near postcode (simplified: postcode sector match via SPARQL is heavy; return structured empty + meta). */
async function handlePpiRecent(url, origin) {
  const postcode = url.searchParams.get("postcode") || "";
  const pc = normalizePostcode(postcode);
  if (!pc) {
    return json({ transactions: [], error: "Missing postcode" }, 400, origin);
  }

  return json(
    {
      transactions: [],
      postcode: formatPostcode(pc),
      meta: {
        note: "PPD integration can be wired to landregistry.data.gov.uk SPARQL",
      },
    },
    200,
    origin
  );
}

async function handleHpi(url, origin) {
  const la = url.searchParams.get("la") || "";
  const month = url.searchParams.get("month") || "";
  return json(
    {
      la: la || null,
      month: month || null,
      index: null,
      series: [],
      meta: {
        note: "ONS/Land Registry HPI series can be bound to la + month",
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
