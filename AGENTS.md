# £Per — notes for coding agents

- **Handoff:** Read `[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)` first — it now starts with a **Quick resume** checklist, then routes, secrets, and a dedicated section on **transport / utilities / risk placeholders** (worker paths, client API files, normalisers, panels).
- **Frontend:** Build-less (`index.html`, `app.js`, `js/`**). Tailwind + Leaflet from CDN only.
- **Worker:** `worker/src/index.js` — plain JavaScript. Deploy via **Cloudflare Dashboard** (copy/paste). **Do not add Wrangler** unless the user explicitly asks.
- **API base:** `js/api/resolve.js` → `API_BASE` (also used by `js/utils/fetch.js`).
- **EPC auth:** Worker secrets `EPC_EMAIL` + `EPC_API_KEY` (see DEVELOPMENT.md). Never commit credentials.
- **Contract:** Do not rename `js/panels/panel*.js` or panel DOM ids without user instruction. Normalise in `js/normalisers/` before panels consume data.
- **Context copy:** Methodology and footnotes (EPC tenure, HPI/PPD notes, Ofsted search details) live in `js/panels/footer-context.js` → `#page-data-context-body`, invoked from `renderAllPanels`, so panels stay visually clean.
- **Header layout:** Search chrome scrolls with the page; only the address dropdown uses a slim `sticky` bar (`index.html`) so it stays visible over the panels.
- **Location lookup:** Header includes `#locate-btn` ("Use my location") + `#locate-status`. `app.js` uses browser geolocation, reverse geocodes nearest postcode via postcodes.io, writes postcode into `#search-input`, clears UPRN, then runs normal `/resolve`.
- **UKHPI / local authority:** Resolve and `/geo` must expose a **human** admin district name (postcodes.io `admin_district`) for `localAuthority`. Using `codes.admin_district` (ONS code like `E09000033`) breaks UKHPI label matching and leaves HPI columns empty — worker prefers name over code in `lookupPostcodeGeo` and `handleGeo`.
- **HPI on market rows:** `/ppi/recent` enriches each sale with UKHPI from Land Registry SPARQL (`…/id/region/{slug}` + monthly observations). Fallback: LA → postcodes.io region → `united-kingdom`. Client uses `adjustedPrice` when present; `/hpi` is the secondary path for the same formula in the UI.
- **Expandable rows:** `panel3-market.js` shows 3 rows by default and toggles to 10 with `...see more...` / `Show fewer`; `panel4-schools.js` shows 5 by default and toggles to 10. These are panel-local toggles, not global state.
- **Footer HPI math copy:** `js/panels/footer-context.js` now renders per-sale plain-English HPI calculations (plus monospace equation lines) under **HPI & market references** using the same worker-first/fallback math as the Market panel.
- **Resolve input:** Postcode **or** 7–12 digit UPRN (header has both fields; UPRN takes precedence when valid). Zoopla-style URLs are **not** implemented in `/resolve` yet.
- **Fragile integrations:** Ofsted schools = HTML regex; Land Registry = SPARQL shape assumptions. Touch those areas carefully and retest after upstream changes.
- **Transport / utilities / risk:** Still **placeholders** in the Worker (`/transport?lat=&lon=`, `/broadband?postcode=`, `/flood?postcode=`, `/radon?postcode=`). The Utilities panel only consumes **broadband** today; the Risk panel consumes **flood** + **radon**. Any real integrations should preserve normalised shapes in `js/normalisers/` unless the user asks to change panel contracts.

