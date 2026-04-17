import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../components/Panel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapPanel = ({ address }) => {
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!address || !address.lat || !address.lng) {
            setLoading(false);
            setError("Cannot display map: Latitude and Longitude are required for the selected address.");
            return;
        }

        // Initialize map only once
        if (!map) {
            const initialMap = L.map('map-container').setView([address.lat, address.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(initialMap);
            setMap(initialMap);
        } else {
            // If map exists, just move/zoom to the new coordinates
            map.setView([address.lat, address.lng], 15);
        }

        // Add marker to the current location
        L.marker([address.lat, address.lng]).addTo(map)
            .bindPopup("<b>Location Found</b><br>Address: " + address.fullAddress)
            .openPopup();

        setLoading(false);
    }, [address]);

    return (
        <Panel title="Location Map">
            <div id="map-container" style={{ height: '400px', width: '100%' }}>
                {/* Leaflet map will be rendered here */}
            </div>
            {loading && <p>Loading map...</p>}
            {error && <div className="error-message">{error}</div>}
            {!loading && !error && (
                <p className="map-note">Map centered on the selected address.</p>
            )}
        </Panel>
    );
};

export default MapPanel;