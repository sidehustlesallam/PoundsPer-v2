# £Per — Property Intelligence Engine

A forensic, panel-driven UK property dashboard: **postcode** or **UPRN** search, EPC-led identity, Land Registry recent sales, optional UKHPI context, Ofsted nearby providers (scraped), map, and placeholder modules for transport, utilities, and risk.

**Resume work:** read [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the authoritative file map, secrets, route behaviour, and known caveats (map DOM, Ofsted HTML, HPI).

---

## Live Worker

All JSON APIs are served from the Cloudflare Worker (paste `worker/src/index.js` in the dashboard). Frontend `API_BASE` is set in `js/api/resolve.js` (update when the deployment URL changes).

Example (replace with your deployed origin):

```
https://royal-bar-6cc5.sidehustlesallam.workers.dev
```

---

## How the app works

1. User enters a **UK postcode** and/or **UPRN** (separate fields in the header). If the UPRN field contains **7–12 digits**, that value is sent to `/resolve`; otherwise the postcode field is used.
2. **`/resolve`** returns dropdown rows (EPC-backed for postcode or UPRN, or postcodes.io centroid fallback when EPC has no rows for a postcode).
3. User selects an address.
4. **`loadDatasetForSelection()`** in `app.js` fetches in parallel: geo, EPC search, PPI, HPI, schools, transport, broadband, flood, radon; then EPC certificate and `/address` when applicable.
5. Responses are **normalised** under `js/normalisers/` into `state.normalised`.
6. **`renderAllPanels(state)`** paints all panels.

**Not implemented:** Zoopla URL parsing on `/resolve` (README historically mentioned it; treat as future scope).

---

## Panel layout

| Row | Panels |
|-----|--------|
| 1 | **Registered Asset** (`panel-identity`) — EPC-led identity: postcode, UPRN, ratings, **floor area m² + ft²**, **Date of EPC certificate** (inspection date if present, else lodgement), £/m² if transaction price exists, tenure |
| 1 | **Map** (`panel-map`) — Leaflet + OSM; must preserve `#leaflet-map` across re-renders (see `panel2-map.js`) |
| 2 | **Market** (`panel-market`) — Last **5** PPD sales (Land Registry SPARQL), address, ft², EPC rating, price, £/ft², HPI-adjusted £ / £/ft² when UKHPI series is available, market averages |
| 3 | **Schools** (`panel-schools`) — Ofsted search results (name link, category, rating, distance, last report) |
| 3 | **Transport** (`panel-transport`) — placeholder |
| 4 | **Utilities** (`panel-utilities`) — placeholder |
| 4 | **Risk** (`panel-risk`) — placeholder |

---

## API contract (GET)

Base URL = Worker origin (`API_BASE` on the client).

| Endpoint | Purpose |
|----------|---------|
| `/resolve?input=` | Postcode **or** 7–12 digit UPRN (see DEVELOPMENT.md) |
| `/geo?postcode=` | Geocode postcode |
| `/address?uprn=` | Address snippet from EPC |
| `/epc/search?postcode=` \| `uprn=` | EPC domestic search |
| `/epc/certificate?rrn=` | EPC certificate; `rrn` = **lmk-key** |
| `/ppi/recent?postcode=` | PPD via SPARQL + optional EPC floor/rating match |
| `/hpi?la=&month=&postcode=` | UKHPI SPARQL; `postcode` helps resolve LA when `la` is empty |
| `/schools/nearby?postcode=` | Ofsted HTML scrape near postcode (2 mi, 10 results) |
| `/transport?lat=&lon=` | Placeholder |
| `/broadband?postcode=` | Placeholder |
| `/flood?postcode=` | Placeholder |
| `/radon?postcode=` | Placeholder |

---

## Normalisation (`js/normalisers/`)

Each module has a normaliser. Rules include:

- **EPC:** Hyphenated API keys; `certificateDate` for display; sqm + sqft on rows.
- **PPI:** Integer prices, ISO dates, £/m² and £/ft² from area.
- **Schools:** Miles from metres; Ofsted strings passed through.
- **Geo / resolve / others:** See individual files under `js/normalisers/`.

---

## Frontend layout

```
js/
  state/       # global state
  api/         # Worker calls (resolve.js holds API_BASE)
  normalisers/
  panels/
  utils/
app.js
index.html
```

`app.js` orchestrates resolve, selection, fetches, normalisation, and `renderAllPanels`.

---

## UI theme (reference)

- Background `#0B0E13`, panels `#141820`, borders `#1F242D`
- Text: primary `#C7CBD4`, secondary `#8E95A3`
- Accents: blue `#60A5FA`, green `#4ADE80`, red `#F87171`, yellow `#FACC15`
- Fonts: Inter (UI), Roboto Mono (data) — loaded from Google Fonts in `index.html`

---

## Development setup

1. Clone the repo.
2. Open `index.html` or serve statically if modules need HTTP.
3. Deploy `worker/src/index.js` via **Cloudflare Dashboard** (no Wrangler in repo).
4. Set **`EPC_EMAIL`** and **`EPC_API_KEY`** on the Worker for EPC + PPI enrichment + resolve-by-postcode/UPRN EPC paths.

---

## Quick curl checks

```http
GET /resolve?input=SW1A1AA
GET /resolve?input=121234567890
GET /ppi/recent?postcode=SW1A1AA
GET /hpi?postcode=SW1A1AA&month=2026-01
GET /schools/nearby?postcode=N32EE
GET /epc/search?postcode=SW1A1AA
```

(Replace host with your `workers.dev` origin.)

---

## Future ideas

Crime, planning, tariffs, React migration, offline cache, portfolio mode, **Zoopla URL resolve**.

---

## Summary

This repo is a **build-less SPA** + **one Worker**: EPC-centric resolve, Land Registry SPARQL for PPI (and UKHPI attempt), Ofsted HTML for schools, Leaflet map, and placeholders for other environmental/utility modules. **`docs/DEVELOPMENT.md`** is the handoff file for agents and humans picking the project up later.
