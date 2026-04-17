# £Per — notes for coding agents

- **Handoff doc:** Start with [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) (architecture, secrets, routes, placeholders).
- **Frontend:** Build-less (`index.html`, `app.js`, `js/**`). Tailwind/Leaflet via CDN only.
- **Worker:** `worker/src/index.js` — plain JavaScript. Deploy via Cloudflare Dashboard; **do not add Wrangler config** unless the user explicitly asks.
- **API URL:** Single base in `js/api/resolve.js` (`API_BASE`).
- **EPC auth:** Worker secrets `EPC_EMAIL` + `EPC_API_KEY` (see DEVELOPMENT.md). Never commit credentials.
- **Contract:** Do not rename `js/` layout files from the master spec without user instruction; normalise all API data before UI use.
