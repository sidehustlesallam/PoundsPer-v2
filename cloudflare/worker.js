/**
 * £Per Cloudflare Worker Backend
 * 
 * This worker acts as the secure intermediary for all external API calls,
 * protecting API keys and normalizing data for the frontend.
 * 
 * All external calls must be made server-side.
 * All sensitive values must be accessed via `env.*`.
 * 
 * @param {Request} request - The incoming request object.
 * @returns {Promise<Response>} - A structured JSON response.
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Basic routing based on the path
        if (path.startsWith('/api/addresses')) {
            return this.handleAddresses(request, env);
        } else if (path.startsWith('/api/epc')) {
            return this.handleEPC(request, env);
        } else if (path.startsWith('/api/sales')) {
            return this.handleSales(request, env);
        } else if (path.startsWith('/api/hpi')) {
            return this.handleHPI(request, env);
        } else if (path.startsWith('/api/schools')) {
            return this.handleSchools(request, env);
        } else if (path.startsWith('/api/utilities')) {
            return this.handleUtilities(request, env);
        } else if (path.startsWith('/api/transport')) {
            return this.handleTransport(request, env);
        } else if (path.startsWith('/api/flood')) {
            return this.handleFlood(request, env);
        } else {
            return new Response(JSON.stringify({ error: "Endpoint not found" }), {
                headers: { "Content-Type": "application/json" },
                status: 404
            });
        }
    },

    // --- Endpoint Handlers ---

    /**
     * GET /api/addresses?postcode=
     * Fetches all addresses for a given postcode.
     */
    async handleAddresses(request, env) {
        const { searchParams } = new URL(request.url);
        const postcode = searchParams.get('postcode');

        if (!postcode) {
            return new Response(JSON.stringify({ error: "Postcode is required." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        // --- IMPLEMENTATION REQUIRED ---
        // Use a dedicated UK address API (e.g., Postcode API, or a commercial service)
        // Example structure:
        // const addressUrl = `https://api.addressservice.com/postcode/${postcode}?key=${env.ADDRESS_API_KEY}`;
        // const response = await fetch(addressUrl);
        // const data = await response.json();

        // MOCK RESPONSE for development:
        const mockAddresses = [
            { fullAddress: "123 Main Street, London, SW1A 0AA", uprn: "1234567890123", lat: 51.5074, lng: -0.1278 },
            { fullAddress: "45 Oak Avenue, London, SW1A 0AA", uprn: "9876543210987", lat: 51.5080, lng: -0.1280 }
        ];

        return new Response(JSON.stringify({ 
            addresses: mockAddresses, 
            postcode: postcode,
            message: "Addresses fetched successfully (using mock data)."
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    },

    /**
     * GET /api/epc?uprn=
     * Fetches EPC data for a given UPRN.
     */
    async handleEPC(request, env) {
        const { searchParams } = new URL(request.url);
        const uprn = searchParams.get('uprn');

        if (!uprn) {
            return new Response(JSON.stringify({ error: "UPRN is required for EPC lookup." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        try {
            // Use environment variables for secure API calls
            const url = `${env.EPC_BASE_URL}/?uprn=${uprn}&api_key=${env.EPC_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            // MOCK RESPONSE for development:
            const mockData = {
                rating: "B",
                potentialRating: "C",
                floorAreaSqft: 1200,
                floorAreaSqm: 111.5,
                lastUpdated: new Date().toISOString()
            };

            return new Response(JSON.stringify({ 
                success: true, 
                data: mockData, 
                source: "EPC API"
            }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });

        } catch (e) {
            console.error("EPC API Error:", e);
            return new Response(JSON.stringify({ 
                success: false, 
                error: "Failed to fetch EPC data. Check API keys and network connectivity.",
                details: e.message
            }), {
                headers: { "Content-Type": "application/json" },
                status: 500
            });
        }
    },

    /**
     * GET /api/sales?postcode=
     * Fetches recent sales data for a given postcode.
     */
    async handleSales(request, env) {
        const { searchParams } = new URL(request.url);
        const postcode = searchParams.get('postcode');

        if (!postcode) {
            return new Response(JSON.stringify({ error: "Postcode is required for sales data." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        // --- IMPLEMENTATION REQUIRED ---
        // 1. Construct a SPARQL query targeting the Land Registry endpoint for the given postcode.
        // 2. Execute the query using a dedicated HTTP client or library.
        // 3. Parse the resulting graph data into a clean array of sale objects.

        // MOCK RESPONSE for development:
        const mockSales = [
            { date: "2024-10-01", price: 350000, areaSqft: 1100, areaSqm: 102, pricePerSqft: 318, pricePerSqm: 3430 },
            { date: "2024-09-15", price: 290000, areaSqft: 950, areaSqm: 88, pricePerSqft: 305, pricePerSqm: 3290 }
        ];

        return new Response(JSON.stringify({ 
            sales: mockSales, 
            postcode: postcode,
            message: "Sales data fetched successfully (using mock data). Remember to implement SPARQL query."
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    },

    /**
     * GET /api/hpi?locality=
     * Fetches HPI-adjusted pricing data for a given locality.
     */
    async handleHPI(request, env) {
        const { searchParams } = new URL(request.url);
        const locality = searchParams.get('locality');

        if (!locality) {
            return new Response(JSON.stringify({ error: "Locality is required for HPI lookup." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        // --- IMPLEMENTATION REQUIRED ---
        // 1. Construct a SPARQL query targeting the Land Registry endpoint for HPI data.
        // 2. Execute the query and parse the resulting graph data.

        // MOCK RESPONSE for development:
        const mockHpiData = {
            hpiIndex: 1.05,
            adjustedPrice: 370000,
            updatedPricePerSqft: 330,
            updatedPricePerSqm: 3600
        };

        return new Response(JSON.stringify({ 
            hpi_data: mockHpiData, 
            locality: locality,
            message: "HPI data fetched successfully (using mock data). Remember to implement SPARQL query."
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    },

    /**
     * GET /api/schools?lat=&lng=
     * Fetches nearby schools using Overpass API.
     */
    async handleSchools(request, env) {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!lat || !lng) {
            return new Response(JSON.stringify({ error: "Latitude and Longitude are required for school lookup." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        // --- IMPLEMENTATION REQUIRED ---
        // 1. Construct an Overpass API query to search for educational POIs within a radius.
        // 2. Execute the query and parse the resulting GeoJSON/XML.

        // MOCK RESPONSE for development:
        const mockSchools = [
            { name: "St. Jude's Primary School", rating: "Good", distanceKm: 0.5 },
            { name: "Riverside Academy", rating: "Outstanding", distanceKm: 1.2 }
        ];

        return new Response(JSON.stringify({ 
            schools: mockSchools, 
            lat: lat, 
            lng: lng,
            message: "Schools data fetched successfully (using mock data). Remember to implement Overpass API query."
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    },

    /**
     * GET /api/utilities?uprn=
     * Fetches water provider data for a given UPRN.
     */
    async handleUtilities(request, env) {
        const { searchParams } = new URL(request.url);
        const uprn = searchParams.get('uprn');

        if (!uprn) {
            return new Response(JSON.stringify({ error: "UPRN is required for utility lookup." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        // --- IMPLEMENTATION REQUIRED ---
        // 1. Lookup the UPRN against the static dataset (Water Provider).
        // 2. This should ideally be a simple in-memory map lookup or a database query.

        // MOCK RESPONSE for development:
        const mockProvider = "Thames Water";

        return new Response(JSON.stringify({ 
            water_provider: mockProvider, 
            uprn: uprn,
            broadband_speed: { download: "100-200 Mbps", upload: "20-50 Mbps" },
            message: "Utility data fetched successfully (using mock data). Remember to implement static dataset lookup."
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    },

    /**
     * GET /api/transport?lat=&lng=
     * Fetches nearby transport links using Overpass API.
     */
    async handleTransport(request, env) {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!lat || !lng) {
            return new Response(JSON.stringify({ error: "Latitude and Longitude are required for transport lookup." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        // --- IMPLEMENTATION REQUIRED ---
        // 1. Construct an Overpass API query to find transport POIs (stations, stops).
        // 2. Execute the query and parse the resulting GeoJSON/XML.

        // MOCK RESPONSE for development:
        const mockStations = [
            { name: "Victoria Station", type: "Rail", distanceKm: 1.1, travelTimeMin: 15 },
            { name: "Victoria Underground Station", type: "Tube", distanceKm: 0.8, travelTimeMin: 10 }
        ];

        return new Response(JSON.stringify({ 
            stations: mockStations, 
            lat: lat, 
            lng: lng,
            message: "Transport data fetched successfully (using mock data). Remember to implement Overpass API query."
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    },

    /**
     * GET /api/flood?lat=&lng=
     * Fetches flood risk data for a given location.
     */
    async handleFlood(request, env) {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!lat || !lng) {
            return new Response(JSON.stringify({ error: "Latitude and Longitude are required for flood risk lookup." }), {
                headers: { "Content-Type": "application/json" },
                status: 400
            });
        }

        try {
            // Use environment variables for secure API calls
            const url = `${env.FLOOD_BASE_URL}?lat=${lat}&lng=${lng}&api_key=${env.FLOOD_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            // MOCK RESPONSE for development:
            const mockData = {
                riskLevel: "Low",
                floodZone: "Zone 1",
                details: "Low risk of flooding from rivers and the sea."
            };

            return new Response(JSON.stringify({ 
                success: true, 
                data: mockData, 
                source: "Environment Agency API"
            }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });

        } catch (e) {
            console.error("Flood Risk API Error:", e);
            return new Response(JSON.stringify({ 
                success: false, 
                error: "Failed to fetch flood risk data. Check API keys and network connectivity.",
                details: e.message
            }), {
                headers: { "Content-Type": "application/json" },
                status: 500
            });
        }
    }
};
