import React, { useState, useEffect } from 'react';
import Panel from '../components/Panel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Map Panel Component
 * Displays an interactive map of the property location.
 * Note: This component assumes Leaflet is available in the environment.
 * @param {object} props - Component props.
 * @param {string} props.title - Title of the panel.
 * @param {function} props.fetchData - Async function to fetch data (optional, for coordinates).
 * @param {string} props.params - JSON string of parameters (e.g., lat, lng).
 */
const MapPanel = ({ title, fetchData, params }) => {
    const [map, setMap] = useState(null);
    const [center, setCenter] = useState([0, 0]);
    const [zoom, setZoom] = useState(13);

    useEffect(() => {
        if (params) {
            try {
                const coords = JSON.parse(params);
                const lat = parseFloat(coords.lat);
                const lng = parseFloat(coords.lng);

                if (!isNaN(lat) && !isNaN(lng)) {
                    setCenter([lat, lng]);
                    setZoom(15);
                }
            } catch (e) {
                console.error("Invalid coordinates provided for map:", e);
            }
        }
    }, [params]);

    // This panel is primarily visual and relies on coordinates passed via params.
    // We keep the Panel wrapper structure but handle map initialization manually.
    return (
        <div className="data-panel card map-container">
            <h3 className="panel-title">{title}</h3>
            <div id="map" style={{ height: '400px', width: '100%' }} className="map-placeholder"></div>
            <p className="map-info">Map visualization requires Leaflet.js library setup.</p>
        </div>
    );
};

export default MapPanel;