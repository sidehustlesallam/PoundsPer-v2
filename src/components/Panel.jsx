import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Reusable wrapper component for all data panels.
 * Handles loading, error states, and API fetching logic.
 * @param {object} props - Component props.
 * @param {string} props.title - Title of the panel.
 * @param {function} props.fetchData - Async function to fetch data (receives necessary parameters).
 * @param {string} props.params - JSON string of parameters needed for fetching (e.g., JSON.stringify({ uprn: '...' })).
 */
const Panel = ({ title, fetchData, params }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!params) {
                setData(null);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // The fetchData function handles the actual API call using the provided parameters
                const result = await fetchData(params);
                setData(result);
            } catch (e) {
                console.error("Panel data fetching error:", e);
                setError("Failed to load data. Check API connectivity or parameters.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [fetchData, params]);

    return (
        <div className="data-panel card">
            <h3 className="panel-title">{title}</h3>
            {loading && <div className="loading-state">Loading data...</div>}
            {error && <div className="error-state">{error}</div>}
            {!loading && data && <div className="data-content">{/* Content rendered by child component */}</div>}
            {!loading && !data && !error && <div className="empty-state">No data available for this property.</div>}
        </div>
    );
};

export default Panel;