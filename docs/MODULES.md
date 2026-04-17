# £Per Module Documentation

This document details the inputs, outputs, and functional scope for every data panel/module displayed on the £Per dashboard.

## 🧩 Module Breakdown

### 1. Postcode Search (Core Input)
*   **Inputs:** UK Postcode (String).
*   **Outputs:** Array of structured addresses, including `fullAddress`, `uprn`, `lat`, `lng`.
*   **Notes:** This is the primary entry point. The output feeds the Address Selector and the Map Panel.

### 2. Address Selector (Core Input)
*   **Inputs:** Selected Address Object (from Postcode Search).
*   **Outputs:** Confirmed `UPRN`, `Lat`, `Lng`, and `FullAddress` for the selected property.
*   **Notes:** This component validates and passes the core identifiers to all subsequent panels.

### 3. EPC Panel (Energy Performance Certificate)
*   **Inputs:** UPRN (String).
*   **Outputs:** Structured data including EPC rating (A-G), energy efficiency score, and key recommendations.
*   **Notes:** Critical for assessing immediate property value and sustainability.

### 4. Recent Sales Panel (PPI)
*   **Inputs:** Postcode (String).
*   **Outputs:** Array of sale records, including `date`, `price`, `areaSqft`, `pricePerSqft`, and `pricePerSqm`.
*   **Notes:** Provides market context. The calculation of derived metrics (e.g., price per square foot) is crucial for comparison.

### 5. HPI Panel (Housing Price Index)
*   **Inputs:** Locality (String).
*   **Outputs:** Index values (`hpiIndex`), adjusted price estimates (`adjustedPrice`), and updated price metrics.
*   **Notes:** Used to normalize property values against regional market trends.

### 6. Schools Panel
*   **Inputs:** Lat/Lng (Coordinates).
*   **Outputs:** Array of nearby schools, including `name`, `rating`, and `distanceKm`.
*   **Notes:** A key factor for family buyers. The data is location-based and requires accurate coordinates.

### 7. Utilities Panel
*   **Inputs:** UPRN (String).
*   **Outputs:** Water provider name (String), Broadband speed details (Object).
*   **Notes:** Provides essential infrastructure information. The broadband data should ideally be linked to the UPRN.

### 8. Transport Panel
*   **Inputs:** Lat/Lng (Coordinates).
*   **Outputs:** Array of nearby transport links, including `name`, `type` (Rail/Tube), `distanceKm`, and `travelTimeMin`.
*   **Notes:** Measures connectivity and commute feasibility.

### 9. Flood Risk Panel
*   **Inputs:** Lat/Lng (Coordinates).
*   **Outputs:** Risk level (String), Flood Zone (String), and detailed risk description (String).
*   **Notes:** A mandatory due-diligence check. The output must be displayed with high visibility.

### 10. Map Panel
*   **Inputs:** Lat/Lng (Coordinates).
*   **Outputs:** Interactive map visualization with markers for the property and nearby POIs (schools, stations).
*   **Notes:** This is the visual centerpiece, integrating all location-based data.
