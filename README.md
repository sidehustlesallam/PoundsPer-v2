# £Per — High-Precision UK Property Due-Diligence Engine

£Per is a high-precision due-diligence engine that transforms raw UK property data into actionable intelligence. It ingests multiple UK data sources, normalises them, and renders a clean, surgical dashboard designed for investors, analysts, and acquisition teams.

Unlike Zoopla or Rightmove, £Per requires **no login**, loads instantly, and focuses on **analytical clarity**, not listings.

---

## 🚀 Core User Flow

1.  **User enters a UK postcode:** The frontend calls the Worker API to fetch all associated addresses.
2.  **User selects an address:** The dashboard loads all subsequent data panels, using the selected property's UPRN, Latitude, and Longitude to fetch detailed information from the Worker.

### Dashboard Panels (Data Flow)
The dashboard is composed of modular panels, each fetching data independently from the secure backend Worker:

*   **EPC & Property Identity:** Latest EPC rating, Potential EPC rating, Floor area, UPRN.
*   **Recent Sales & Local Pricing:** Historical sales data and local pricing averages (via SPARQL).
*   **HPI-Adjusted Pricing:** Price adjustments based on the House Price Index (via SPARQL).
*   **Schools & Ofsted:** Nearest schools and their educational ratings (via Overpass API/Scraping).
*   **Utilities & Connectivity:** Water provider (static) and predicted broadband speed (via API).
*   **Transport:** Nearest public transport links (via Overpass API).
*   **Flood Risk:** Flood risk rating (via Environment Agency API).
*   **Location Map:** Interactive map showing the property's location and surrounding POIs.

---

## 🧱 Architecture Overview

### Frontend (Client-Side)
*   **Technology:** React/Vite (Modern JS framework).
*   **Design:** Component-based, fully responsive, and minimal UI/UX focused on data clarity.
*   **Communication:** The frontend *only* communicates with the single Cloudflare Worker API endpoint.

### Backend (Cloudflare Worker)
*   **File:** `cloudflare/worker.js`
*   **Role:** Acts as the secure, single point of entry for all external data. It handles API key management, rate limiting, data normalization, and error handling.
*   **Security:** **Crucially, no secrets are exposed to the frontend.** All sensitive calls are made server-side.

---

## 🔐 Secrets & API Safety

Only three modules require API keys, which are stored exclusively in Cloudflare Worker environment variables:
*   EPC API Key
*   Broadband API Key
*   Flood Risk API Key

All other modules use open data sources or static datasets.

---

## 📁 Repository Structure

```
/
├── cloudflare/
│   └── worker.js          # The core backend logic
├── src/
│   ├── components/
│   │   ├── Panel.jsx      # Reusable wrapper for all data panels
│   │   └── DashboardLayout.jsx # Assembles all panels
│   ├── panels/
│   │   ├── EPCPanel.jsx
│   │   ├── SalesPanel.jsx
│   │   ├── HPIPanel.jsx
│   │   ├── SchoolsPanel.jsx
│   │   ├── UtilitiesPanel.jsx
│   │   ├── TransportPanel.jsx
│   │   ├── FloodRiskPanel.jsx
│   │   ├── OfstedPanel.jsx
│   │   └── MapPanel.jsx
│   ├── pages/
│   │   └── Dashboard.jsx  # Main entry point for the frontend
│   ├── styles/
│   │   └── App.css        # Global styles
│   ├── App.jsx            # Root component
│   └── index.js           # Entry point (if using standard React setup)
├── docs/
│   ├── WORKER_DEPLOYMENT.md # Deployment guide
│   ├── DATA_SOURCES.md      # Data source catalog
│   ├── MODULES.md           # Panel technical specifications
│   ├── FUTURE_ROADMAP.md    # Planned enhancements
│   └── README.md            # This file
└── package.json
```

---

## 🛠 Development & Deployment Instructions

1.  **Frontend Setup:** Run `npm install` and then `npm run dev:client` (or equivalent Vite command).
2.  **Backend Setup:** The Worker must be deployed using `wrangler deploy` after setting all required environment variables in the Cloudflare dashboard.
3.  **Development Workflow:** Use `wrangler dev` for local testing of the Worker, and run the frontend development server concurrently.

**The project is complete and ready for production deployment.**
