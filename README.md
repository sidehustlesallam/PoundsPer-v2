

# £Per — High‑Precision UK Property Due‑Diligence Engine

£Per is a high‑precision due‑diligence engine that transforms raw UK property data into actionable intelligence.  
It ingests multiple UK data sources, normalises them, and renders a clean, surgical dashboard designed for investors, analysts, and acquisition teams.

Unlike Zoopla or Rightmove, £Per requires **no login**, loads instantly, and focuses on **analytical clarity**, not listings.

---

## 🚀 Core User Flow

1. **User enters a UK postcode**  
   - Backend returns all addresses in that postcode

2. **User selects an address**  
   The dashboard loads with:

### **A. EPC & Property Identity**
- Latest EPC rating (current & potential)  
- Floor area (sqft + sqm)  
- UPRN  
- **Requires EPC API key**

### **B. Recent Sales & Local Pricing**
- 5 most recent sales in postcode  
- Sale price, floor area, £/sqft, £/sqm  
- Local averages  
- **Powered by Land Registry SPARQL (no API key)**

### **C. Map**
- Exact property location  
- Mobile‑friendly, zoomable  

### **D. Schools & Ofsted**
- Nearest schools via **Overpass API (no key)**  
- Ofsted rating via **HTML scraping (no key)**  

### **E. Utilities & Connectivity**
- Water provider (static dataset)  
- Broadband speed prediction  
- **Broadband requires API key**

### **F. HPI‑Adjusted Pricing**
- HPI data via **Land Registry SPARQL (no key)**  
- Adjusted predicted price  
- Updated £/sqft and £/sqm  

### **G. Transport**
- Nearest rail/tube stations via **Overpass API (no key)**  

### **H. Flood Risk**
- Flood risk rating  
- **Requires Environment Agency API key**

---

## 🧱 Architecture Overview

### **Frontend**
- Modern JS or React  
- Component‑based  
- Fully responsive  
- Clean, minimal, investor‑friendly UI  

### **Backend**
A **single Cloudflare Worker**:

- Lives in the repo as `cloudflare/worker.js`  
- Contains **no secrets**  
- Uses Cloudflare `env` variables for sensitive values  
- Calls external APIs directly  
- Exposes internal API endpoints to the frontend  

---

## 🔐 Secrets & API Safety

Only **three modules** require API keys:

| Module | API Key Required? | Notes |
|--------|--------------------|-------|
| EPC | **Yes** | EPC API |
| Broadband | **Yes** | Ofcom/ThinkBroadband |
| Flood Risk | **Yes** | Environment Agency |

All other modules use **open data sources**:

| Module | Source | API Key? |
|--------|--------|----------|
| Recent Sales (PPI) | SPARQL | No |
| HPI | SPARQL | No |
| Schools | Overpass | No |
| Ofsted Ratings | Scraping | No |
| Transport | Overpass | No |
| Water Provider | Static dataset | No |

Secrets are stored **only** in Cloudflare Worker environment variables:

```
EPC_BASE_URL
EPC_API_KEY

BROADBAND_BASE_URL
BROADBAND_API_KEY

FLOOD_BASE_URL
FLOOD_API_KEY
```

---

## 📁 Repository Structure

```
/
├── cloudflare/
│   └── worker.js
├── src/
│   ├── components/
│   ├── panels/
│   ├── api/
│   ├── lib/
│   ├── styles/
│   └── pages/
├── public/
├── docs/
│   ├── WORKER_DEPLOYMENT.md
│   ├── DATA_SOURCES.md
│   ├── MODULES.md
│   └── FUTURE_ROADMAP.md
└── package.json
```

---

## 🛠 Cloudflare Worker Deployment

See `/docs/WORKER_DEPLOYMENT.md` for full instructions.

Summary:

1. Create a Worker  
2. Add required secrets  
3. Paste in `cloudflare/worker.js`  
4. Deploy  
5. Update Worker manually whenever the repo version changes  

---

## 🧩 Future‑Proofing

The architecture supports:

- User accounts (saved properties, notes, alerts)  
- Advertising modules  
- Additional data panels (crime, planning apps, energy tariffs, etc.)  
- Multi‑property comparison  
- Portfolio mode  

---

## 🧪 Local Development

Frontend calls the deployed Worker:

```
VITE_API_BASE_URL="https://your-worker.workers.dev"
```

Worker handles all external calls.

---

## 📄 License

Proprietary — all rights reserved.

