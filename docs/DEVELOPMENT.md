# £Per — development handoff

Use this file when reopening the project or a new chat session. It summarizes how the repo is structured, what is real vs placeholder, and where to edit.

## Stack constraints

- **Frontend:** `index.html` + `app.js` + ES modules under `js/`. No bundler, no npm required for the UI. Tailwind and Leaflet load from CDN in `index.html`.
- **Backend:** Single Cloudflare Worker script at `worker/src/index.js` (plain JavaScript). **No Wrangler config** is kept in the repo; deploy via **Cloudflare Dashboard** (paste/upload worker code).

## Worker secrets (Cloudflare Dashboard)

EPC Open Data Communities uses HTTP Basic auth: `Base64("email:apikey")`.

**Recommended:** set two **Secrets** on the Worker:

| Secret        | Purpose        |
|---------------|----------------|
| `EPC_EMAIL`   | EPC account email |
| `EPC_API_KEY` | EPC API key   |

Optional fallback: one secret `EPC_AUTH_B64` / `EPC_BASIC_B64` / `EPC_TOKEN` containing only the Base64 blob (the part after `Basic ` in curl examples). If both email+key and precomputed are set, **email + API key win**.

Never commit credentials. Rotate keys if exposed.

## API base URL (frontend)

The Worker origin is defined **once** in `js/api/resolve.js` as `API_BASE` (currently `https://royal-bar-6cc5.sidehustlesallam.workers.dev`). Other modules use `js/utils/fetch.js` which imports that base. Update here if the deployment URL changes.

## Worker routes (contract)

Implemented in `worker/src/index.js`:

- `GET /resolve?input=` — postcode geocode (postcodes.io) + **EPC domestic search** by postcode (many rows for dropdown); falls back to a single centroid row if EPC is unavailable.
- `GET /geo?postcode=`, `GET /address?uprn=`
- `GET /epc/search?postcode=` | `uprn=`, `GET /epc/certificate?rrn=` (value is **lmk-key**)
- `GET /ppi/recent`, `GET /hpi`, `GET /schools/nearby`, `GET /transport`, `GET /broadband`, `GET /flood`, `GET /radon`

`rrn` in the contract is used as the EPC **lmk-key** path parameter.

## Frontend data flow

1. User searches → `resolveAddresses()` → `/resolve` → dropdown options (each option may include `lmkKey`, `uprn`, `postcode`, `lat`, `lon`).
2. User selects an address → `loadDatasetForSelection()` in `app.js`:
   - Parallel fetches: geo, EPC search, PPI, HPI, schools, transport, broadband, flood, radon.
   - Then certificate fetch using **selected** `lmkKey`, and `/address?uprn=` when UPRN exists.
3. All JSON is passed through `js/normalisers/` before panels read `state.normalised`.
4. `js/panels/index.js` → `renderAllPanels(state)`.

## Normalisers (EPC field names)

EPC JSON often uses **hyphenated** keys. `js/normalisers/epc.js` maps aliases, including:

- Floor area: `total-floor-area`, etc.
- Ratings: `current-energy-rating`, `potential-energy-rating`
- Lodgement: `lodgement-date`

Extend `firstDefined` / pick helpers if new API shapes appear.

## Panels and DOM roots

| Panel | File | Root element id |
|-------|------|------------------|
| Registered Asset | `js/panels/panel1-identity.js` | `panel-identity` |
| Map | `js/panels/panel2-map.js` | `panel-map` |
| Market | `js/panels/panel3-market.js` | `panel-market` |
| Schools | `js/panels/panel4-schools.js` | `panel-schools` |
| Transport | `js/panels/panel5-transport.js` | `panel-transport` |
| Utilities | `js/panels/panel6-utilities.js` | `panel-utilities` |
| Risk | `js/panels/panel7-risk.js` | `panel-risk` |

## Implemented vs placeholder (Worker)

- **Live:** postcodes.io; EPC search/certificate/address (with auth); resolve enrichment from EPC.
- **Placeholder / empty structured JSON:** PPI, HPI series, schools list, transport stops, broadband speeds, flood/radon detail (see `worker/src/index.js` handlers — often include `meta.note`).

Next incremental work is usually wiring those modules to real upstreams without changing the public route shapes.

## Local testing

- Open `index.html` via a local static server if module CORS/file protocol is an issue (e.g. `npx serve` or VS Code Live Server). Not required for all browsers.
- Test Worker routes with curl or browser against the deployed `workers.dev` URL.

## Git

- `.gitignore` includes `node_modules/` and `dist/`. No Wrangler artifacts are required.

---

*Last intent: single source of truth for “how to resume” edits; keep in sync when architecture or secrets strategy changes.*
