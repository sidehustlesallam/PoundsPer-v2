# £Per — notes for coding agents

- **Handoff:** Read [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) first (routes, secrets, what is live vs placeholder, map/schools/UKHPI caveats).
- **Frontend:** Build-less (`index.html`, `app.js`, `js/**`). Tailwind + Leaflet from CDN only.
- **Worker:** `worker/src/index.js` — plain JavaScript. Deploy via **Cloudflare Dashboard** (copy/paste). **Do not add Wrangler** unless the user explicitly asks.
- **API base:** `js/api/resolve.js` → `API_BASE` (also used by `js/utils/fetch.js`).
- **EPC auth:** Worker secrets `EPC_EMAIL` + `EPC_API_KEY` (see DEVELOPMENT.md). Never commit credentials.
- **Contract:** Do not rename `js/panels/panel*.js` or panel DOM ids without user instruction. Normalise in `js/normalisers/` before panels consume data.
- **Context copy:** Methodology and footnotes (EPC tenure, HPI/PPD notes, Ofsted search details) live in `js/panels/footer-context.js` → `#page-data-context-body`, invoked from `renderAllPanels`, so panels stay visually clean.
- **Header layout:** Search chrome scrolls with the page; only the address dropdown uses a slim `sticky` bar (`index.html`) so it stays visible over the panels.
- **UKHPI / local authority:** Resolve and `/geo` must expose a **human** admin district name (postcodes.io `admin_district`) for `localAuthority`. Using `codes.admin_district` (ONS code like `E09000033`) breaks UKHPI label matching and leaves HPI columns empty — worker prefers name over code in `lookupPostcodeGeo` and `handleGeo`.
- **Resolve input:** Postcode **or** 7–12 digit UPRN (header has both fields; UPRN takes precedence when valid). Zoopla-style URLs are **not** implemented in `/resolve` yet.
- **Fragile integrations:** Ofsted schools = HTML regex; Land Registry = SPARQL shape assumptions. Touch those areas carefully and retest after upstream changes.
