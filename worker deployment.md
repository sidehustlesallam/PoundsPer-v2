### **Cloudflare Worker Deployment Guide for £Per**

£Per uses a **single Cloudflare Worker** as its backend API layer.  
This Worker is responsible for:

- EPC data (API key required)  
- Broadband speed prediction (API key required)  
- Flood risk (API key required)  
- Recent sales (SPARQL, no key)  
- HPI (SPARQL, no key)  
- Schools (Overpass, no key)  
- Transport (Overpass, no key)  
- Ofsted ratings (scraping, no key)  
- Water provider (static dataset, no key)

The Worker file lives in the repository as:

```
cloudflare/worker.js
```

This file is **identical** in GitHub and Cloudflare.  
It contains **no secrets**.  
All sensitive values are stored **only** in Cloudflare environment variables.

---

## **1. Required Environment Variables**

Only three modules require API keys:

### **EPC**
```
EPC_BASE_URL
EPC_API_KEY
```

### **Broadband**
```
BROADBAND_BASE_URL
BROADBAND_API_KEY
```

### **Flood Risk**
```
FLOOD_BASE_URL
FLOOD_API_KEY
```

### **All other modules use open data sources**
- PPI (SPARQL) → no key  
- HPI (SPARQL) → no key  
- Schools (Overpass) → no key  
- Transport (Overpass) → no key  
- Ofsted (scraping) → no key  
- Water provider (static dataset) → no key  

---

## **2. Creating the Worker**

1. Log into Cloudflare  
2. Go to **Workers & Pages**  
3. Click **Create Worker**  
4. Name it something like:  
   ```
   per-api
   ```
5. Delete the default code  
6. Paste in the contents of:  
   ```
   cloudflare/worker.js
   ```
7. Save (but do not deploy yet)

---

## **3. Adding Secrets**

In the Worker:

1. Go to **Settings → Variables → Environment Variables**  
2. Add each required variable:

```
EPC_BASE_URL
EPC_API_KEY

BROADBAND_BASE_URL
BROADBAND_API_KEY

FLOOD_BASE_URL
FLOOD_API_KEY
```

Cloudflare stores these securely and they are **never** visible in GitHub.

---

## **4. Deploying the Worker**

Once secrets are configured:

1. Open the Worker  
2. Click **Deploy**  
3. Cloudflare will assign a URL such as:

```
https://per-api.<your-account>.workers.dev
```

Use this as your frontend API base URL.

---

## **5. Updating the Worker**

Whenever `cloudflare/worker.js` changes in the repo:

1. Open the file  
2. Copy the entire contents  
3. Open your Cloudflare Worker  
4. Paste the updated code  
5. Deploy  

Secrets remain intact — you do **not** need to re-enter them.

This ensures:

- GitHub always contains the canonical Worker code  
- Cloudflare always runs the latest version  
- No secrets ever leak into version control  

---

## **6. Local Development**

The Worker cannot run locally without secrets, but the frontend can run locally because:

- It calls the deployed Worker  
- The Worker handles all external API calls  

Set:

```
VITE_API_BASE_URL="https://per-api.<your-account>.workers.dev"
```

Then run your frontend normally.

---

## **7. Data Source Summary**

| Module | Source | API Key? |
|--------|--------|----------|
| EPC | EPC API | **Yes** |
| Broadband | Ofcom/ThinkBroadband | **Yes** |
| Flood Risk | Environment Agency | **Yes** |
| Recent Sales (PPI) | SPARQL | No |
| HPI | SPARQL | No |
| Schools | Overpass | No |
| Ofsted Ratings | Scraping | No |
| Transport | Overpass | No |
| Water Provider | Static dataset | No |

---

## **8. Security Model**

- No secrets in GitHub  
- No secrets in frontend  
- All secrets stored in Cloudflare  
- All external calls made server‑side  
- Worker code is public but harmless  
- API keys never leave Cloudflare  

---

## **9. Future Enhancements**

- Add staging vs production environments  
- Add caching (Cloudflare Cache API or KV)  
- Add rate limiting  
- Add authentication (for saved properties)  
- Add analytics  