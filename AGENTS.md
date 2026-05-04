# £Per — notes for coding agents

- **Read order:** Start with `[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)` (source of truth for routes, secrets, and deploy/testing). Then use the **Repository layout & session handoff** section in this file for tree + wiring context.
- **Stack constraints:** Frontend is build-less (`index.html`, `app.js`, `js/`); Tailwind + Leaflet are CDN-loaded. Worker is a single plain JS file at `worker/src/index.js`.
- **Deploy model:** Deploy Worker via **Cloudflare Dashboard** copy/paste. **Do not add Wrangler** unless explicitly requested.
- **Worker update reminder:** If `worker/src/index.js` changes in a task, explicitly remind the user to redeploy that updated worker code to Cloudflare Dashboard before testing/prod use.
- **Docs sync rule:** When behaviour, routes, panel contracts, or orchestration change, update **all three** docs in the same task/PR: `AGENTS.md`, `README.md`, and `docs/DEVELOPMENT.md`.
- **Core contracts:** Do not rename `js/panels/panel*.js` or panel DOM ids without instruction. Keep panel input shapes stable through `js/normalisers/`.
- **High-risk integrations:** Ofsted parsing (HTML regex) and Land Registry SPARQL assumptions are fragile; retest these paths after related changes.
- **Current scope:** Resolve supports postcode or 7-12 digit UPRN (UPRN wins). Zoopla URLs are not implemented. Transport/utilities/risk routes are still worker placeholders.

---

## Repository layout & session handoff

Use this block when reopening the project: it maps the tree, entry points, and wiring so you do not need a full-folder pass before coding. For route-by-route behaviour, secrets, and curl examples, still use [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) (source of truth for the Worker contract).

### Folder structure

```
.
├── index.html                 # Page shell: header (postcode + UPRN + search + locate), sticky #address-select, panel sections, footer #page-data-context-body; Tailwind + Leaflet CDN
├── app.js                     # init(), runResolve(), runResolveFromDeviceLocation(), loadDatasetForSelection(); wires API → normalisers → renderAllPanels
├── README.md                  # Product overview + API table (keep in sync with worker when routes change)
├── AGENTS.md                  # This file — agent constraints + layout handoff
├── .gitignore                 # node_modules/, dist/
├── docs/
│   └── DEVELOPMENT.md         # Quick resume, stack, secrets, routes, placeholder wiring, local testing
├── worker/
│   └── src/
│       └── index.js           # Single Cloudflare Worker: CORS, all GET handlers, postcodes.io, EPC proxy, Land Registry SPARQL (PPD + UKHPI), Ofsted HTML scrape, placeholder transport/utilities/risk
└── js/
    ├── api/
    │   ├── index.js           # Re-exports API helpers
    │   ├── resolve.js         # API_BASE (Worker origin) + resolveAddresses() — only resolve uses raw fetch; rest use getJson
    │   ├── geo.js             # /geo, /address
    │   ├── epc.js             # /epc/search, /epc/certificate
    │   ├── ppi.js             # /ppi/recent
    │   ├── hpi.js             # /hpi
    │   ├── schools.js         # /schools/nearby
    │   ├── transport.js       # /transport?lat=&lon=
    │   ├── broadband.js       # /broadband?postcode=
    │   ├── flood.js           # /flood?postcode=
    │   ├── radon.js           # /radon?postcode=
    │   └── nearby-postcodes.js # Direct postcodes.io nearest lookup (lat/lon), used by panel8 shortcut chips
    ├── utils/
    │   ├── fetch.js           # getJson(path) → API_BASE + path; throws on !res.ok
    │   ├── format.js          # toInt, toFloat, formatDateIso, formatGbp, formatNumber
    │   ├── math.js            # sqm↔sqft, price per area, metresToMiles, mapRiskLevel
    │   ├── postcode.js        # normalizePostcode, formatPostcode
    │   ├── dom.js             # el(id), small DOM helpers
    │   └── index.js           # Re-exports utils
    ├── state/
    │   └── index.js           # state { selection, loading, errors, raw, normalised }; resetState, setSelection, setLoading, setError, clearErrors
    ├── normalisers/
    │   ├── index.js           # normaliseResolveResponse, Geo, Address, EPC, PPI, HPI, Schools, Transport, Broadband, Flood, Radon (+ re-exports from hpi.js)
    │   ├── epc.js             # Hyphenated EPC keys → rows + certificate shape (certificateDate = inspection || lodgement)
    │   ├── ppi.js             # transactions + worker HPI fields (adjustedPrice, hpiSale, …)
    │   ├── hpi.js             # series + adjustPriceForHpi / hpiIndexForTransaction (client fallback for market/footer)
    │   ├── schools.js         # schools[] + meta; miles from distanceMetres
    │   ├── transport.js       # stops[], lat/lon, meta
    │   ├── broadband.js       # Mbps + tech[] + meta
    │   ├── flood.js           # riskLevel + floodRisk[] + meta (worker `UNKNOWN` → normalised `riskLevel` **LOW** for display)
    │   ├── radon.js           # band, riskLevel, meta (same UNKNOWN → LOW pattern)
    │   └── nearby-postcodes.js # up to 4 nearest postcode chips; deduped; excludes active postcode
    └── panels/
        ├── index.js           # renderAllPanels → panel1–8 then renderFooterContext
        ├── panel1-identity.js # #panel-identity — Registered Asset (identity): EPC + address + cert + selection + last sale + HPI projections
        ├── panel2-map.js      # #panel-map — Leaflet; preserves #leaflet-map node across re-renders
        ├── panel3-market.js   # #panel-market — PPD table, HPI cols (worker adjustedPrice else client /hpi series)
        ├── panel4-schools.js  # #panel-schools — Ofsted rows, 3/10 expand
        ├── panel5-transport.js
        ├── panel6-utilities.js
        ├── panel7-risk.js
        ├── panel8-nearby-postcodes.js # #panel-nearby-postcodes — quick links to nearby postcodes (re-run resolve)
        └── footer-context.js  # #page-data-context-body — tenure, HPI/PPD copy, per-sale HPI maths, Ofsted meta
```

### Read order (typical change)

1. [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — **Quick resume**, secrets, full route list, placeholder matrix (transport / broadband / flood / radon).
2. This file — contracts and fragile areas.
3. Touch only what you need: **`app.js`** for orchestration or new parallel fetches; **`worker/src/index.js`** for new/changed JSON routes; **`js/api/`** + **`js/utils/fetch.js`** for client calls; **`js/normalisers/`** for shapes panels consume; **`js/panels/`** for UI only.

### Orchestration & state (single mental model)

- **`loadDatasetForSelection(sel)`** (`app.js`): `resetState` → set selection → parallel `Promise.allSettled` for geo, EPC search, PPI, HPI, schools, transport (uses **selection lat/lon**), broadband, flood, radon (use **postcode**), and nearby postcode candidates (uses **selection lat/lon** via postcodes.io); then normalises slices; then optional **EPC certificate** (`lmkKey` from selection or first EPC row) and **`/address`** when UPRN known; maps `state.errors` fetch keys to panel keys; `renderAllPanels(state)`.
- **`state.raw` keys** (filled by fetches): `geo`, `epcSearch`, `ppi`, `hpi`, `schools`, `transport`, `broadband`, `flood`, `radon`, `nearbyPostcodes`, `epcCertificate`, `address`.
- **`state.normalised` slices** (assigned in `app.js`): `geo`, `address`, `epcSearch`, `epcCertificate`, `ppi`, `hpi`, `schools`, `transport`, `broadband`, `flood`, `radon`, `nearbyPostcodes`. `js/state/index.js` also defines `identity: {}`, but **`app.js` never fills it** — the Registered Asset (`panel1-identity`) reads `epcSearch`, `epcCertificate`, and `address` instead. Panels read **`normalised`**, not `raw`.
- **Errors → UI**: `global` (resolve/locate); `identity` / EPC cert; `geo` → also **`map`**; `ppi` or `hpi` → **`market`**; `schools` → **`schools`**; `transport` → **`transport`**; `broadband` → **`utilities`**; `flood` or `radon` → **`risk`**; `nearbyPostcodes` → **nearby postcode chips panel**.

### Worker ↔ client map (where to edit)

| Worker route (GET) | Worker handler area | Client API | Normaliser | Panel / footer |
|--------------------|---------------------|-------------|--------------|----------------|
| `/resolve` | `handleResolve`, UPRN branch | `resolve.js` | `normalisers/index.js` `normaliseResolveResponse` | Populates `#address-select`; selection drives rest |
| `/geo`, `/address` | `handleGeo`, `handleAddress` | `geo.js` | `normaliseGeoResponse`, `normaliseAddressResponse` | Map + identity / address line |
| `/epc/search`, `/epc/certificate` | `handleEpcSearch`, `handleEpcCertificate` | `epc.js` | `epc.js` | Identity, market EPC col |
| `/ppi/recent`, `/hpi` | `handlePpiRecent`, `handleHpi` + SPARQL helpers | `ppi.js`, `hpi.js` | `ppi.js`, `hpi.js` | `panel3-market.js`, `footer-context.js` |
| `/schools/nearby` | `handleSchoolsNearby` + Ofsted parse | `schools.js` | `schools.js` | `panel4-schools.js`, footer |
| `/transport`, `/broadband`, `/flood`, `/radon` | `handleTransport`, etc. (placeholders) | matching `js/api/*.js` | matching `normalisers/*.js` | `panel5`–`panel7` |
| postcodes.io nearest (`/postcodes?lat=&lon=`) | client-side call only | `nearby-postcodes.js` | `nearby-postcodes.js` | `panel8-nearby-postcodes.js` |

### DOM ids (contract — do not rename without user instruction)

| Id | Role |
|----|------|
| `#search-input`, `#uprn-input`, `#search-btn` | Postcode / UPRN / Search |
| `#locate-btn`, `#locate-status` | Geolocation → nearest postcode via postcodes.io |
| `#address-select` | Sticky strip; option `dataset.payload` = JSON selection row |
| `#panel-identity` … `#panel-risk` | Panel mount points (see `index.html` + panel files) |
| `#panel-nearby-postcodes` | Nearby postcode shortcuts panel (before footer notes) |
| `#page-data-context-body` | Footer “Notes & data context” (`footer-context.js`) |
| `#leaflet-map` | Map container — must not be blindly replaced once Leaflet is bound (`panel2-map.js`) |

### Implementation notes worth remembering

- **No npm build** for the UI; ES modules in the browser; Worker is one plain JS file (no Wrangler in repo unless requested).
- **`resolveAddresses`** uses `fetch` directly; all other endpoints use **`getJson`** from `js/utils/fetch.js` (same `API_BASE`).
- **UKHPI / LA:** Worker uses postcodes.io **`admin_district` human name** before ONS code for `localAuthority` — required for UKHPI label discovery (see DEVELOPMENT.md Land Registry section).
- **Risk normalisers:** Worker placeholders return `UNKNOWN`; **`flood.js` / `radon.js`** map that to **`LOW`** for `riskLevel` so the risk panel uses the green tier — if you return real bands from the worker, align normalisers and **`panel7-risk.js`** colours/wording.
- **Expand / collapse:** Market and schools use **module-level** `let` flags (`panel3-market.js`, `panel4-schools.js`); not in `state` — resetting behaviour on full navigation may need a deliberate choice if you add routing later.

