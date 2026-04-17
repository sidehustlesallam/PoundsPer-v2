import React, { useState, useCallback } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';

const Dashboard = () => {
    const [postcode, setPostcode] = useState('');
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to fetch addresses based on postcode
    const fetchAddresses = useCallback(async (postcode) => {
        if (!postcode) {
            setAddresses([]);
            setSelectedAddress(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Assuming the Worker is deployed and accessible via a base URL
            const response = await axios.get(`http://localhost:8787/api/addresses?postcode=${postcode}`);
            
            if (response.data.addresses && response.data.addresses.length > 0) {
                setAddresses(response.data.addresses);
                // Select the first address by default
                setSelectedAddress(response.data.addresses[0]);
            } else {
                setAddresses([]);
                setSelectedAddress(null);
                setError("No addresses found for this postcode.");
            }
        } catch (err) {
            console.error("Error fetching addresses:", err);
            setError("Failed to connect to the backend API. Please check the Worker deployment.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle postcode change and trigger fetch
    const handlePostcodeChange = (e) => {
        const newPostcode = e.target.value;
        setPostcode(newPostcode);
        // Debounce or call fetchAddresses after a short delay for better UX
        // For now, we call it directly for simplicity.
        fetchAddresses(newPostcode);
    };

    return (
        <div className="dashboard-container">
            <header className="postcode-search-bar">
                <input
                    type="text"
                    placeholder="Enter UK Postcode (e.g., SW1A 0AA)"
                    value={postcode}
                    onChange={handlePostcodeChange}
                    className="postcode-input"
                />
                <button onClick={() => fetchAddresses(postcode)} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </header>

            {error && <div className="error-message">{error}</div>}

            {/* Address Selection Dropdown/List */}
            <div className="address-selection-panel">
                <h3>{postcode ? `Addresses in ${postcode}` : 'Enter a postcode to begin'}</h3>
                {loading && <p>Loading addresses...</p>}
                {!loading && addresses.length > 0 && (
                    <ul className="address-list">
                        {addresses.map((addr, index) => (
                            <li key={index} onClick={() => setSelectedAddress(addr)} className="address-item">
                                {addr.fullAddress}
                            </li>
                        ))}
                    </ul>
                )}
                {!loading && addresses.length === 0 && !error && (
                    <p>No addresses found or please enter a valid postcode.</p>
                )}
            </div>

            {/* Main Dashboard Layout */}
            {selectedAddress && (
                <DashboardLayout address={selectedAddress} />
            )}
        </div>
    );
};

export default Dashboard;