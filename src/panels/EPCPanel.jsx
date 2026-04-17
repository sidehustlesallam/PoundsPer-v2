import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Panel from '../components/Panel';

const EPCPanel = ({ address }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEPCData = useCallback(async () => {
        if (!address || !address.uprn) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Call the Worker API endpoint for EPC data
            const response = await axios.get(`http://localhost:8787/api/epc?uprn=${address.uprn}`);
            
            if (response.data.success && response.data.data) {
                setData(response.data.data);
            } else {
                throw new Error(response.data.error || "Failed to fetch EPC data.");
            }
        } catch (err) {
            console.error("Error fetching EPC data:", err);
            setError(err.message || "Could not retrieve EPC data. Check UPRN and API status.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchEPCData();
    }, [fetchEPCData]);

    return (
        <Panel title="Energy Performance Certificate (EPC)">
            {loading && <p>Loading EPC data...</p>}
            {error && <div className="error-message">{error}</div>}
            {!loading && data && (
                <div className="epc-details">
                    <p><strong>EPC Source:</strong> {data.source}</p>
                    <p><strong>Energy Efficiency Rating:</strong> {data.efficiency_rating || 'N/A'}</p>
                    <p><strong>Environmental Rating:</strong> {data.environmental_rating || 'N/A'}</p>
                    <p><strong>Overall Assessment:</strong> {data.overall_assessment || 'Data available'}</p>
                    {/* Add more detailed display based on the actual data structure */}
                </div>
            )}
            {!loading && !data && !error && (
                <p>No EPC data available for this property.</p>
            )}
        </Panel>
    );
};

export default EPCPanel;