# Module Documentation: £Per Data Panels

This document details the inputs, outputs, and replaceability considerations for each data panel module within the £Per dashboard.

## 1. EPC Panel (Energy Performance Certificate)
*   **Purpose:** Displays the energy efficiency rating of the property.
*   **Inputs:** UPRN (Unique Property Reference Number).
*   **Outputs:**
    *   Latest EPC Rating (A-G).
    *   Potential EPC Rating.
    *   Floor area (sqft and sqm).
*   **Data Source:** External EPC API (Requires `EPC_API_KEY`).
*   **Replaceability:** High. If the primary EPC API changes or becomes unavailable, this module must be updated to use an alternative rating source or a different API endpoint.

## 2. Recent Sales & Local Pricing Panel
*   **Purpose:** Provides historical sales data and calculates local pricing averages.
*   **Inputs:** Postcode.
*   **Outputs:**
    *   List of the 5 most recent sales in the postcode.
    *   Sale price, floor area, calculated £/sqft, and £/sqm for each sale.
    *   Local average pricing metrics.
*   **Data Source:** Land Registry SPARQL (Open Data).
*   **Replaceability:** Medium. While the SPARQL endpoint is stable, changes in the underlying Land Registry data schema could break the queries.

## 3. HPI Panel (House Price Index)
*   **Purpose:** Calculates an adjusted predicted property price based on local market trends.
*   **Inputs:** Locality (Postcode/Area).
*   **Outputs:**
    *   Adjusted predicted price.
    *   Updated £/sqft and £/sqm based on HPI adjustment.
*   **Data Source:** Land Registry SPARQL (Open Data).
*   **Replaceability:** Medium. Dependent on the SPARQL query structure and the availability of HPI data.

## 4. Schools Panel
*   **Purpose:** Identifies the nearest educational institutions and their ratings.
*   **Inputs:** Latitude and Longitude (of the property).
*   **Outputs:**
    *   List of nearest schools.
    *   Ofsted rating and inspection date.
*   **Data Source:** Overpass API (Open Data) and HTML Scraping (Open Data).
*   **Replaceability:** Low to Medium. Overpass API is robust, but the HTML scraping component is brittle and highly susceptible to changes in the target website's structure.

## 5. Utilities & Connectivity Panel
*   **Purpose:** Provides information on water provision and broadband speed prediction.
*   **Inputs:** UPRN (for water provider) and Lat/Lng (for broadband).
*   **Outputs:**
    *   Water provider name (static dataset).
    *   Predicted broadband speed (download/upload).
*   **Data Source:** Static Dataset (Water) and External API (Broadband).
*   **Replaceability:** Medium. The broadband data source is prone to changes in the underlying data provider's API.

## 6. Transport Panel
*   **Purpose:** Lists nearby public transport links.
*   **Inputs:** Latitude and Longitude (of the property).
*   **Outputs:**
    *   Nearest rail/tube stations.
    *   Distance and travel time estimates.
*   **Data Source:** Overpass API (Open Data).
*   **Replaceability:** High. Overpass API is a reliable source for geographical data, making this module relatively stable.

## 7. Flood Risk Panel
*   **Purpose:** Assesses the property's risk of flooding.
*   **Inputs:** Latitude and Longitude (of the property).
*   **Outputs:**
    *   Flood risk rating (e.g., Low, Medium, High).
*   **Data Source:** Environment Agency API (Requires `FLOOD_API_KEY`).
*   **Replaceability:** Medium. Dependent on the structure and availability of the Environment Agency API.

## 8. Map Panel
*   **Purpose:** Visual representation of the property and surrounding data points.
*   **Inputs:** Latitude and Longitude (of the property).
*   **Outputs:** Interactive map view with markers for the property, nearest schools, and transport links.
*   **Data Source:** Mapbox/Leaflet (Client-side rendering).
*   **Replaceability:** Low. This is a presentation layer and is less dependent on external data sources, focusing instead on visualization best practices.