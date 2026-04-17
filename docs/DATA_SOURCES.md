# Data Sources Documentation for £Per

This document catalogs all external and internal data sources utilized by the £Per due-diligence engine. Understanding these sources is critical for maintenance, debugging, and future expansion.

## 🌐 External APIs (Requires API Keys)

### 1. EPC API (Energy Performance Certificate)
*   **Purpose:** Provides the energy efficiency rating for a property.
*   **Data Type:** Structured JSON/API response.
*   **Key Inputs:** UPRN (Unique Property Reference Number).
*   **Key Outputs:** Latest EPC rating (A-G), Potential EPC rating, Floor area (sqft/sqm).
*   **Authentication:** Requires `EPC_API_KEY` and `EPC_BASE_URL` environment variables.
*   **Considerations:** The API must be called server-side (Worker) to protect the API key. The Worker must handle rate limiting and API version changes.

### 2. Broadband API (Ofcom/ThinkBroadband)
*   **Purpose:** Predicts available broadband speeds at a given location.
*   **Data Type:** Structured JSON/API response.
*   **Key Inputs:** Location coordinates (Lat/Lng) or UPRN.
*   **Key Outputs:** Predicted download and upload speeds.
*   **Authentication:** Requires `BROADBAND_API_KEY` and `BROADBAND_BASE_URL` environment variables.
*   **Considerations:** Must be called server-side (Worker). The API response structure must be robustly parsed.

### 3. Environment Agency API (Flood Risk)
*   **Purpose:** Determines the flood risk rating for a property.
*   **Data Type:** Structured JSON/API response.
*   **Key Inputs:** Location coordinates (Lat/Lng).
*   **Key Outputs:** Flood risk rating (e.g., Low, Medium, High).
*   **Authentication:** Requires `FLOOD_API_KEY` and `FLOOD_BASE_URL` environment variables.
*   **Considerations:** Must be called server-side (Worker). The API response must be validated against expected risk categories.

## 📊 Open Data Sources (No API Key Required)

### 4. Land Registry SPARQL (Property Price Index - PPI & HPI)
*   **Purpose:** Provides historical sales data and calculates localized price indices.
*   **Data Type:** SPARQL query results (Graph/JSON).
*   **Key Inputs:** Postcode, Locality.
*   **Key Outputs:** Sale price, floor area, calculated £/sqft, £/sqm, and HPI-adjusted price.
*   **Authentication:** None (Uses public SPARQL endpoints).
*   **Considerations:** Queries must be robust against changes in the underlying SPARQL endpoint structure. The Worker must handle complex graph traversal and data normalization.

### 5. Overpass API (Schools & Transport)
*   **Purpose:** Retrieves geographical data for points of interest (POIs).
*   **Data Type:** Overpass API response (GeoJSON/XML).
*   **Key Inputs:** Location coordinates (Lat/Lng) and search radius.
*   **Key Outputs:** List of nearby schools, nearest rail/tube stations.
*   **Authentication:** None.
*   **Considerations:** Rate limiting and query complexity must be managed within the Worker. The frontend should handle the display of GeoJSON data.

## 📄 Static & Scraping Sources

### 6. Ofsted Ratings
*   **Purpose:** Retrieves the educational inspection rating for local schools.
*   **Data Type:** HTML content.
*   **Key Inputs:** School name or location.
*   **Key Outputs:** Ofsted rating and inspection date.
*   **Authentication:** None.
*   **Considerations:** **Highly brittle.** Relies on HTML scraping, meaning any change to the target website's structure will break this module. This requires manual maintenance.

### 7. Water Provider Data
*   **Purpose:** Identifies the water utility provider for a property.
*   **Data Type:** Static JSON mapping/dataset.
*   **Key Inputs:** UPRN or Postcode.
*   **Key Outputs:** Name of the water provider.
*   **Authentication:** None.
*   **Considerations:** Requires periodic manual updates to the static dataset. This data should be stored in a local JSON file or database accessible by the Worker.