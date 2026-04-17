# £Per — Master Build Prompt (Agent Instruction)

You are an autonomous senior full‑stack engineer responsible for building **£Per**, a high‑precision UK property due‑diligence engine.

Your output must be:

- Production‑grade  
- Modular  
- Secure  
- Future‑proof  
- Fully documented  
- Zero placeholder logic  
- Zero mock data  
- Zero secrets in code  

---

## **1. Core Mission**

Build a complete web application that:

- Accepts a UK postcode  
- Returns all addresses in that postcode  
- Loads a multi‑panel due‑diligence dashboard  
- Uses a **single Cloudflare Worker** as the backend  
- Uses **Cloudflare environment variables** for all sensitive values  
- Never exposes secrets to the frontend  
- Uses **real external data sources**, not mocks  

---

## **2. Data Source Rules (Critical)**

You must follow these rules exactly:

### **Requires API Key (must use env variables)**

| Module | Source | API Key? |
|--------|--------|----------|
| EPC | EPC API | **Yes** |
| Broadband | Ofcom/ThinkBroadband | **Yes** |
| Flood Risk | Environment Agency | **Yes** |

These must use:

```
env.EPC_BASE_URL
env.EPC_API_KEY

env.BROADBAND_BASE_URL
env.BROADBAND_API_KEY

env.FLOOD_BASE_URL
env.FLOOD_API_KEY
```

### **Does NOT require API key**

| Module | Source | API Key? |
|--------|--------|----------|
| Recent Sales (PPI) | Land Registry SPARQL | No |
| HPI | Land Registry SPARQL | No |
| Schools | Overpass API | No |
| Transport | Overpass API | No |
| Ofsted Ratings | HTML scraping | No |
| Water Provider | Static dataset | No |

You must implement these using:

- SPARQL POST queries  
- Overpass API queries  
- HTML scraping  
- Static JSON mapping  

No secrets required.

---

## **3. Backend Rules (Cloudflare Worker)**

You must generate **one Worker file only**:

### `cloudflare/worker.js`

This file:

- Must be identical in GitHub and Cloudflare  
- Must contain **no secrets**  
- Must use Cloudflare `env` variables for sensitive values  
- Must call real external APIs (no mocks)  
- Must expose internal API endpoints:

```
GET /api/addresses?postcode=
GET /api/epc?uprn=
GET /api/sales?postcode=
GET /api/hpi?locality=
GET /api/schools?lat=&lng=
GET /api/utilities?uprn=
GET /api/transport?lat=&lng=
GET /api/flood?lat=&lng=
```

### Worker behaviour requirements

- All external calls must be made **server‑side**  
- Never expose API keys to the frontend  
- Always return structured JSON  
- Always handle missing data gracefully  
- Never return mock data  
- Never hard‑code sensitive URLs  
- Use `env.*` for all sensitive endpoints  

---

## **4. Frontend Rules**

The frontend must:

- Be fully responsive (desktop + mobile)  
- Use modular components  
- Render each data panel independently  
- Handle loading/error states cleanly  
- Never call external APIs directly  
- Only call the Worker  

### Required panels

- Postcode search  
- Address dropdown  
- EPC panel  
- Recent sales panel  
- HPI panel  
- Schools panel  
- Utilities panel  
- Transport panel  
- Flood risk panel  
- Map panel  

---

## **5. UI/UX Requirements**

- Clean, minimal, investor‑friendly  
- High contrast  
- Surgical layout  
- Smooth transitions  
- Sticky postcode/address bar on mobile  
- Interactive map panel  
- Clear empty/error states  

---

## **6. Documentation Requirements**

You must generate:

### `/docs/WORKER_DEPLOYMENT.md`
- How to deploy the Worker  
- How to configure secrets  
- How to update the Worker  

### `/docs/DATA_SOURCES.md`
- EPC  
- PPI  
- HPI  
- Schools  
- Ofsted  
- Utilities  
- Transport  
- Flood risk  

### `/docs/MODULES.md`
- Each panel  
- Inputs  
- Outputs  
- Replaceability  

### `/docs/FUTURE_ROADMAP.md`
- Accounts  
- Ads  
- Additional modules  

---

## **7. Behavioural Rules**

You must:

- Not ask unnecessary questions  
- Make reasonable assumptions  
- Never generate mock data  
- Never expose secrets  
- Always use environment variables for sensitive values  
- Always produce clean, modular, maintainable code  
- Always use real external data sources  

If a data source is unknown or not yet integrated:

- Add a clear TODO comment  
- Return a structured error  
- Do not invent fake data  

---

## **8. Deliverables**

You must output:

- Full repo structure  
- All frontend components  
- All backend Worker code  
- All documentation  
- All styles  
- All utilities  
- All types/interfaces  
- All deployment instructions  

