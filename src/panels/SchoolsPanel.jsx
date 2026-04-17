import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Panel from '../components/Panel';

const SchoolsPanel = ({ address }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSchoolsData = useCallback(async () => {
        // For schools, we need lat/lng, which should come from the selected address.
        if (!address || !address.lat || !address.lng) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Call the Worker API endpoint for Schools data
            const response = await axios.get(`http://localhost:8787/api/schools?lat=${address.lat}&lng=${address.lng}`);
            
            if (response.data.success && response.data.schools && response.data.schools.length > 0) {
                setData(response.data.schools);
            } else {
                throw new Error(response.data.error || "Failed to fetch school data.");
            }
        } catch (err) {
            console.error("Error fetching school data:", err);
            setError(err.message || "Could not retrieve school data. Check coordinates and API status.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchSchoolsData();
    }, [fetchSchoolsData]);

    return (
        <Panel title="Local Schools">
            {loading && <p>Loading school data...</p>}
            {error && <div className="error-message">{error}</div>}
            {!loading && data && (
                <div className="school-list">
                    {data.map((school, index) => (
                        <div key={index} className="school-card">
                            <p><strong className="school-name">{school.name}</strong></p>
                            <p><strong>Rating:</strong> {school.rating}</p>
                            <p><strong>Distance:</strong> {school.distanceKm} km</p>
                        </div>
                    ))}
                </div>
            )}
            {!loading && !data && !error && (
                <p>No nearby schools found or coordinates are required.</p>
            )}
        </Panel>
    );
};

export default SchoolsPanel;