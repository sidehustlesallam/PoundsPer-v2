import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Panel from '../components/Panel';

const SalesPanel = ({ address }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSalesData = useCallback(async () => {
        if (!address || !address.postcode) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Call the Worker API endpoint for Sales data
            const response = await axios.get(`http://localhost:8787/api/sales?postcode=${address.postcode}`);
            
            if (response.data.success && response.data.sales && response.data.sales.length > 0) {
                setData(response.data.sales);
            } else {
                throw new Error(response.data.error || "Failed to fetch sales data.");
            }
        } catch (err) {
            console.error("Error fetching sales data:", err);
            setError(err.message || "Could not retrieve sales data. Check postcode and API status.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData]);

    return (
        <Panel title="Recent Property Sales (PPI)">
            {loading && <p>Loading sales data...</p>}
            {error && <div className="error-message">{error}</div>}
            {!loading && data && (
                <div className="sales-list">
                    {data.map((sale, index) => (
                        <div key={index} className="sale-card">
                            <p><strong>Date:</strong> {sale.date}</p>
                            <p><strong>Price:</strong> £{sale.price.toLocaleString()}</p>
                            <p><strong>Area:</strong> {sale.areaSqft} sqft ({sale.areaSqm} sqm)</p>
                            <p><strong>Price/Sqft:</strong> £{sale.pricePerSqft} | <strong>Price/Sqm:</strong> £{sale.pricePerSqm}</p>
                        </div>
                    ))}
                </div>
            )}
            {!loading && !data && !error && (
                <p>No recent sales data found for this postcode.</p>
            )}
        </Panel>
    );
};

export default SalesPanel;