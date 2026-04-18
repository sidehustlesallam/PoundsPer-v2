# £Per — development handoff

Use this file when reopening the project or a new chat session. It describes stack, deployment, data sources, and what is implemented vs still thin.

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
| `GET /transport`, `GET /broadband`, `GET /flood`, `GET /radon` | Structured placeholders + `meta.note` (see worker) |

## Frontend data flow

1. User enters **postcode** and/or **UPRN** (`index.html`); Search calls `resolveAddresses()` → `/resolve` with whichever token applies (UPRN wins when the UPRN field holds 7–12 digits).
2. Dropdown populated from normalised resolve results; user picks a row.
3. `loadDatasetForSelection()` in `app.js` runs parallel GETs (geo, EPC search, PPI, HPI, schools, transport, broadband, flood, radon), then EPC certificate + `/address` when UPRN/lmk available.
4. All slices pass through `js/normalisers/` → `state.normalised`.
5. `js/panels/index.js` → `renderAllPanels(state)` (which ends by calling `renderFooterContext(state)`).

## Page footer — data context (`js/panels/footer-context.js`)

Long-form **methodology and references** live in the footer (`#page-data-context-body` in `index.html`), not inside the main panels, so panel layouts stay compact.

`footer-context.js` renders:

- **Tenure (EPC):** short explanation plus the current property’s reported tenure (same source the identity panel used).
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
| Notes & data context (footer) | `js/panels/footer-context.js` | `page-data-context-body` |

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
| Transport, broadband, flood, radon | **Placeholder** JSON + `meta.note` |

## Land Registry SPARQL

- Endpoint: `https://landregistry.data.gov.uk/landregistry/query` (POST, `Accept: application/sparql-results+json`, form body `query=`).
- PPD and UKHPI queries live in `worker/src/index.js` (builder helpers + `sparqlBindingValue`, `monthKeyFromUkhpiBinding`, etc.).
- **UKHPI + postcodes.io:** UKHPI SPARQL matches `rdfs:label` with `CONTAINS` on the **district name** (e.g. “Westminster”). postcodes.io exposes that as `result.admin_district`; `result.codes.admin_district` is the **ONS code** (e.g. `E09000033`). The worker must prefer `admin_district` for `localAuthority` / `/hpi?la=` or the HPI series and adjusted columns stay empty.

## Local testing

- Static UI: open `index.html` or use a small static server if ES module file:// issues.
- Worker: curl or browser against `API_BASE` routes.

## Git

`.gitignore` includes `node_modules/` and `dist/`. No Wrangler artifacts required.

---

*Keep this file aligned with the worker and UI when adding routes, secrets, or upstream integrations.*
