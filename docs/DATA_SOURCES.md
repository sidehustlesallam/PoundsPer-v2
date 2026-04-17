# £Per Data Sources Documentation

This document provides a comprehensive overview of all external data sources utilized by the £Per engine. Each source is critical for the due-diligence dashboard and must be maintained for accuracy.

## 🌐 Data Source Overview

| Module | Source Name | API/Method | Key Parameters | Data Type | Limitations/Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Addresses** | UK Postcode/Address API | External API Call | Postcode | Structured JSON | Requires a commercial API key. Coverage may be limited to specific postcodes. |
| **EPC** | Energy Performance Certificate | Open Data Commons API | UPRN | CSV/Structured Data | Data is historical and may not reflect current energy efficiency. Requires `EPC_API_KEY`. |
| **Sales** | Recent Property Sales (PPI) | Land Registry SPARQL | Postcode | Graph Data | Data is limited to recorded sales. Requires complex SPARQL querying. |
| **HPI** | Housing Price Index | Land Registry SPARQL | Locality | Graph Data | Provides an index for price adjustment. Requires complex SPARQL querying. |
| **Schools** | Educational Facilities | Overpass API | Lat/Lng, Radius | GeoJSON/XML | Coverage depends on the OpenStreetMap data quality. Only provides POI data, not official ratings. |
| **Utilities** | Water Provider & Broadband | Static Dataset / API | UPRN | Structured JSON | Water provider is typically static. Broadband speed requires a dedicated, reliable data source. |
| **Transport** | Transport Links | Overpass API | Lat/Lng, Radius | GeoJSON/XML | Provides general POIs (stations, stops). Requires filtering to identify relevant transport types. |
| **Flood Risk** | Environment Agency Flood Data | External API Call | Lat/Lng | Structured JSON | Data is based on official flood risk maps. Requires `FLOOD_API_KEY`. |

## ⚙️ Implementation Notes

*   **API Keys:** All sources requiring external keys must use the corresponding `env.*` variables in the Cloudflare Worker.
*   **Query Complexity:** Sources like Sales and HPI require advanced graph querying (SPARQL) and are the most complex to maintain.
*   **Data Freshness:** The freshness and completeness of the data are entirely dependent on the external source's update cycle.
