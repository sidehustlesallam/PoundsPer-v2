import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Panel from '../components/Panel';

const HPIPanel = ({ address }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHPIData = useCallback(async () => {
        if (!address || !address.locality) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Call the Worker API endpoint for HPI data
            const response = await axios.get(`http://localhost:8787/api/hpi?locality=${address.locality}`);
            
            if (response.data.success && response.data.hpi_data) {
                setData(response.data.hpi_data);
            } else {
                throw new Error(response.data.error || "Failed to fetch HPI data.");
            }
        } catch (err) {
            console.error("Error fetching HPI data:", err);
            setError(err.message || "Could not retrieve HPI data. Check locality and API status.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchHPIData();
    }, [fetchHPIData]);

    return (
        <Panel title="House Price Index (HPI)">
            {loading && <p>Loading HPI data...</p>}
            {error && <div className="error-message">{error}</div>}
            {!loading && data && (
                <div className="hpi-details">
                    <p><strong>HPI Index:</strong> {data.hpiIndex || 'N/A'}</p>
                    <p><strong>Adjusted Price:</strong> £{data.adjustedPrice.toLocaleString()}</p>
                    <p><strong>Updated Price/Sqft:</strong> £{data.updatedPricePerSqft} | <strong>Updated Price/Sqm:</strong> £{data.updatedPricePerSqm}</p>
                </div>
            )}
            {!loading && !data && !error && (
                <p>No HPI data available for this locality.</p>
            )}
        </Panel>
    );
};

export default HPIPanel;