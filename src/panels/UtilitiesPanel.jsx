import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Panel from '../components/Panel';

const UtilitiesPanel = ({ address }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUtilitiesData = useCallback(async () => {
        if (!address || !address.uprn) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Call the Worker API endpoint for Utility data
            const response = await axios.get(`http://localhost:8787/api/utilities?uprn=${address.uprn}`);
            
            if (response.data.success && response.data.water_provider) {
                setData(response.data);
            } else {
                throw new Error(response.data.error || "Failed to fetch utility data.");
            }
        } catch (err) {
            console.error("Error fetching utility data:", err);
            setError(err.message || "Could not retrieve utility data. Check UPRN and API status.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchUtilitiesData();
    }, [fetchUtilitiesData]);

    return (
        <Panel title="Utilities & Infrastructure">
            {loading && <p>Loading utility data...</p>}
            {error && <div className="error-message">{error}</div>}
            {!loading && data && (
                <div className="utility-details">
                    <p><strong>Water Provider:</strong> {data.water_provider}</p>
                    <p><strong>Broadband Speed:</strong> {data.broadband_speed?.download} / {data.broadband_speed?.upload}</p>
                    <p className="todo-note">
                        <strong className="todo-note-text">TODO:</strong> Implement static dataset lookup for water provider and real broadband speed API integration.
                    </p>
                </div>
            )}
            {!loading && !data && !error && (
                <p>No utility data available for this property.</p>
            )}
        </Panel>
    );
};

export default UtilitiesPanel;