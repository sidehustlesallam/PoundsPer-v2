# £Per — development handoff

Use this file when reopening the project or a new chat session. It describes stack, deployment, data sources, and what is implemented vs still thin.

## Quick resume (next session)

1. Read this file top to bottom, then skim [`AGENTS.md`](../AGENTS.md) and [`README.md`](../README.md).
2. **Worker:** one script — [`worker/src/index.js`](../worker/src/index.js). Deploy only through the **Cloudflare Dashboard** (paste or upload); there is **no Wrangler** in the repo unless someone adds it deliberately. If `worker/src/index.js` changes, remind the user to redeploy before testing/prod use.
3. **Frontend entry:** [`app.js`](../app.js) → `loadDatasetForSelection()` (parallel fetches after address pick) → [`js/normalisers/`](../js/normalisers/) → [`js/panels/`](../js/panels/) via `renderAllPanels`.
4. **API origin:** [`js/api/resolve.js`](../js/api/resolve.js) exports `API_BASE`; all worker GETs go through [`js/utils/fetch.js`](../js/utils/fetch.js).
5. **EPC-dependent routes** need Worker secrets `EPC_EMAIL` + `EPC_API_KEY` (see below).
6. **Panels 5–7** (transport, utilities, risk) are still **worker placeholders** — see [Transport / utilities / risk (placeholders)](#transport--utilities--risk-placeholders). No separate `transport.js` / `utilities.js` / `risk.js` worker modules in the repo yet.
7. **Panel 8** (`panel-nearby-postcodes`) uses a **client-side** postcodes.io nearest lookup (`lat/lon`) to show up to 4 deduped nearby postcode shortcut chips (excluding the active postcode), and clicking a chip re-runs resolve.
8. **Docs maintenance rule:** whenever behaviour/contracts/orchestration change, update this file, [`README.md`](../README.md), and [`AGENTS.md`](../AGENTS.md) in the same task/PR.

## Stack constraints

- **Frontend:** `index.html` + `app.js` + ES modules under `js/`. No bundler; no npm required for the UI. Tailwind and Leaflet load from CDN in `index.html`.
- **Header chrome:** The title, strapline, postcode/UPRN inputs, and Search button live in a normal-flow `<header>` (they scroll away). Only the **address `<select>`** sits in a separate **`sticky top-0`** strip between header and `<main>`, so changing property while reading lower panels does not cover the dashboard.
- **Backend:** Single Cloudflare Worker at `worker/src/index.js` (plain JavaScript). **No Wrangler config** in the repo; deploy via **Cloudflare Dashboard** (paste/upload the worker script).

## Worker secrets (Cloudflare Dashboard)

EPC Open Data Communities uses HTTP Basic auth: `Base64("email:apikey")`.

| Secret | Purpose |
|--------|---------|
| `EPC_EMAIL` | EPC account email |
| `EPC_API_KEY` | EPC API key |

Optional fallback: `EPC_AUTH_B64` / `EPC_BASIC_B64` / `EPC_TOKEN` = Base64 blob only (the part after `Basic ` in curl). If both email+key and precomputed exist, **email + key win**.

Never commit credentials.

## API base URL (frontend)

Defined **once** in `js/api/resolve.js` as `API_BASE`. `js/utils/fetch.js` uses that base for all Worker GETs. Update when the deployment URL changes.

## Worker routes (`worker/src/index.js`)

| Route | Behaviour |
|-------|-----------|
| `GET /resolve?input=` | **Postcode:** postcodes.io geocode + EPC domestic search by postcode (many rows); centroid fallback if no EPC. **UPRN:** if `input` is 7–12 digits (spaces ignored), EPC domestic search by UPRN; each row geocoded via its postcode for `lat`/`lon`/LA. **Zoopla URL:** not implemented — treat as future work. |
| `GET /geo?postcode=` | postcodes.io |
| `GET /address?uprn=` | EPC domestic search by UPRN (first row address fields) |
| `GET /epc/search?postcode=` \| `uprn=` | Proxies EPC API (auth required) |
| `GET /epc/certificate?rrn=` | `rrn` = EPC **lmk-key** |
| `GET /ppi/recent?postcode=` | Land Registry **SPARQL** (PPD): last 5 sales by postcode; optional EPC domestic search (same secrets) to attach floor area + rating per row. **UKHPI enrichment (same response):** postcodes.io → local authority name → UKHPI region slug (`/id/region/{slug}`) via label discovery; monthly series from SPARQL; each row gets `hpiSale`, `hpiNow`, `factor`, `adjustedPrice`, `localAuthority`, `hpiTier` (`la` \| `region` \| `uk`), `meta.hpi` summary. Fallback order: LA → postcodes.io **region** → `united-kingdom`. |
| `GET /hpi?la=&month=&postcode=` | UKHPI via Land Registry **SPARQL** on a fixed `…/id/region/{slug}` (slug from label discovery on `la`, else postcode geo with LA → region → UK fallback). Returns `index` + `series` (month → house price index). **Requires a human district name** for `la` when no `postcode` (or a postcode that resolves to one): discovery uses `rdfs:label` text, not ONS codes (see Land Registry section below). |
| `GET /schools/nearby?postcode=` | postcodes.io for lat/lon; **HTML fetch** of [reports.ofsted.gov.uk](https://reports.ofsted.gov.uk) search (childcare → nursery school/school with nursery, open, **2 mile** radius, **10** rows). Parsed with regex on `li.search-result` — fragile if Ofsted change markup. |
| `GET /transport?lat=&lon=` | **Placeholder:** requires numeric `lat` / `lon` (client sends centroid from selection). Returns `{ stops: [], lat, lon, meta }` (empty stops + `meta.note`). |
| `GET /broadband?postcode=` | **Placeholder:** normalised postcode + null Mbps + empty `tech` + `meta.note` (Utilities panel consumes this). |
| `GET /flood?postcode=` | **Placeholder:** `riskLevel: "UNKNOWN"`, empty `floodRisk[]`, `meta.note` (Risk panel — river/flood slice). |
| `GET /radon?postcode=` | **Placeholder:** `band` / `riskLevel` `"UNKNOWN"`, `meta.note` (Risk panel — radon slice). |

## Transport / utilities / risk (placeholders)

These three UI panels are live in the layout but **not** backed by real external datasets in the Worker yet.

| Concern | Worker route | Client API module | Normaliser | Panel |
|--------|--------------|-------------------|-------------|--------|
| Transport | `/transport?lat=&lon=` | [`js/api/transport.js`](../js/api/transport.js) | [`js/normalisers/transport.js`](../js/normalisers/transport.js) | [`js/panels/panel5-transport.js`](../js/panels/panel5-transport.js) |
| Utilities (broadband only today) | `/broadband?postcode=` | [`js/api/broadband.js`](../js/api/broadband.js) | [`js/normalisers/broadband.js`](../js/normalisers/broadband.js) | [`js/panels/panel6-utilities.js`](../js/panels/panel6-utilities.js) |
| Risk (flood + radon) | `/flood?postcode=` and `/radon?postcode=` | [`js/api/flood.js`](../js/api/flood.js), [`js/api/radon.js`](../js/api/radon.js) | [`js/normalisers/flood.js`](../js/normalisers/flood.js), [`js/normalisers/radon.js`](../js/normalisers/radon.js) | [`js/panels/panel7-risk.js`](../js/panels/panel7-risk.js) |

Orchestration: [`app.js`](../app.js) `loadDatasetForSelection()` passes **lat/lon** from the resolved property into `getTransport`, and **postcode** into broadband/flood/radon. Errors for broadband are surfaced on the utilities panel key (`setError("utilities", …)`); flood and radon share the risk panel error slot.

When replacing placeholders, keep normalisers as the single shape the panels read (`state.normalised.*`), or extend them in step with worker JSON changes.

## Frontend data flow

1. User enters **postcode** and/or **UPRN** (`index.html`); Search calls `resolveAddresses()` → `/resolve` with whichever token applies (UPRN wins when the UPRN field holds 7–12 digits).
2. Dropdown populated from normalised resolve results; user picks a row.
3. `loadDatasetForSelection()` in `app.js` runs parallel GETs (geo, EPC search, PPI, HPI, schools, transport, broadband, flood, radon), then EPC certificate + `/address` when UPRN/lmk available.
4. The same dataset load also fetches nearby postcode candidates from postcodes.io (`lat/lon`) for the nearby-postcodes shortcut panel.
5. All slices pass through `js/normalisers/` → `state.normalised`.
6. `js/panels/index.js` → `renderAllPanels(state)` (panels 1–8; then `renderFooterContext(state)`).

## Page footer — data context (`js/panels/footer-context.js`)

Long-form **methodology and references** live in the footer (`#page-data-context-body` in `index.html`), not inside the main panels, so panel layouts stay compact.

`footer-context.js` renders:

- **Tenure (EPC):** short explanation plus the current property’s reported tenure (same source the Registered Asset panel uses).
- **HPI & market references:** UKHPI adjustment explanation, reference index line, and any `hpi.meta.note` / `ppi.meta.note` strings from the worker.
- **Nearby schools (Ofsted):** worker `schools.meta.note` (search radius, parser status, errors).

Update `renderFooterContext` when you add new explanatory copy that would clutter a panel.

## Normalisers (`js/normalisers/`)

EPC hyphenated keys are normalised in `epc.js` (`firstDefined` helpers). Notable fields:

- `certificateDate`: inspection date if present, else lodgement (for “Date of EPC certificate” in UI).
- Floor area → `floorAreaSqm` / `floorAreaSqft` on rows.

Extend pick helpers if API shapes change.

## Panels and DOM roots

| Panel | File | Root id |
|-------|------|---------|
| Registered Asset | `js/panels/panel1-identity.js` | `panel-identity` |
| Map | `js/panels/panel2-map.js` | `panel-map` |
| Market | `js/panels/panel3-market.js` | `panel-market` |
| Schools | `js/panels/panel4-schools.js` | `panel-schools` |
| Transport | `js/panels/panel5-transport.js` | `panel-transport` |
| Utilities | `js/panels/panel6-utilities.js` | `panel-utilities` |
| Risk | `js/panels/panel7-risk.js` | `panel-risk` |
| Nearby Postcodes | `js/panels/panel8-nearby-postcodes.js` | `panel-nearby-postcodes` |
| Notes & data context (footer) | `js/panels/footer-context.js` | `page-data-context-body` |

### Registered Asset panel

`panel1-identity.js` now shows:

- title address with postcode appended (instead of a separate postcode row),
- last sale price/date when a Land Registry transaction match is found,
- HPI projection line with two values:
  - matched-sale HPI-adjusted price (worker `adjustedPrice` first, then `/hpi` fallback),
  - area projection = market-average HPI-adjusted £/ft² × subject floor area.
- Last-sale/HPI matching now uses weighted address similarity (including house-number tokens) to avoid brittle strict-string misses.

### Map panel (important)

`panel2-map.js` must **not** replace `#leaflet-map` with `innerHTML` on every render — Leaflet binds to a DOM node. Reuse the existing `#leaflet-map` when coords are still valid; only create/destroy on error/no-coords transitions. See `destroyMap()` in that file.

### Market panel

PPD table only: address, ft², EPC rating, price, £/ft², HPI-adjusted £ and £/ft² (when worker supplies `adjustedPrice` per row or client falls back to `/hpi` series), market average row. Prefer **worker-enriched** PPI (`/ppi/recent`) for HPI columns. HPI/PPD explanatory text is in the footer (`footer-context.js`).

### Schools panel

Shows Ofsted-derived rows: name (link), category, rating, distance (mi), last report. Depends on worker scrape. Ofsted search `meta.note` is in the footer (`footer-context.js`).

## Implemented vs placeholder (summary)

| Area | Status |
|------|--------|
| Resolve (postcode + UPRN), geo, EPC search/certificate/address | **Live** (EPC auth required for EPC paths) |
| Map (Leaflet) | **Live** (see reuse note above) |
| PPI (PPD SPARQL) + EPC enrichment on worker | **Live** |
| HPI (UKHPI SPARQL) | **Live** for series + HPI-adjusted market columns when `localAuthority` is a district **name**; empty series usually means LA label mismatch or upstream SPARQL/bindings change |
| Schools (Ofsted HTML) | **Live** (fragile to HTML changes; respect Ofsted terms/rate limits) |
| Nearby postcode shortcut chips (client-side postcodes.io nearest) | **Live** (deduped, excludes active postcode, click to re-run resolve) |
| Transport, broadband, flood, radon | **Placeholder** JSON + `meta.note` |

## Land Registry SPARQL

- Endpoint: `https://landregistry.data.gov.uk/landregistry/query` (POST, `Accept: application/sparql-results+json`, form body `query=`).
- PPD and UKHPI queries live in `worker/src/index.js` (builder helpers + `sparqlBindingValue`, `monthKeyFromUkhpiBinding`, etc.).
- **UKHPI + postcodes.io:** UKHPI SPARQL matches `rdfs:label` with `CONTAINS` on the **district name** (e.g. “Westminster”). postcodes.io exposes that as `result.admin_district`; `result.codes.admin_district` is the **ONS code** (e.g. `E09000033`). The worker must prefer `admin_district` for `localAuthority` / `/hpi?la=` or the HPI series and adjusted columns stay empty.

## Local testing

- Static UI: open `index.html` or use a small static server if ES module file:// issues.
- Worker: curl or browser against `API_BASE` routes. Example placeholder checks (swap host for your Worker):

```http
GET /transport?lat=51.5&lon=-0.12
GET /broadband?postcode=SW1A1AA
GET /flood?postcode=SW1A1AA
GET /radon?postcode=SW1A1AA
```

## Git

`.gitignore` includes `node_modules/` and `dist/`. No Wrangler artifacts required.

---

*Keep this file aligned with the worker and UI when adding routes, secrets, or upstream integrations. After any Worker or panel contract change, update this file and [`README.md`](../README.md) API tables in the same PR or commit.*
