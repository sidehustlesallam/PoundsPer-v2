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
            // NOTE: Replace 'http://localhost:8787' with the actual deployed Worker URL.
            const response = await axios.get(`http://localhost:8787/api/addresses?postcode=${postcode}`);
            
            if (response.data.addresses && response.data.addresses.length > 0) {
                setAddresses(response.data.addresses);
                // Attempt to maintain selection continuity
                const initialSelection = response.data.addresses.find(addr => addr.uprn === selectedAddress?.uprn);
                setSelectedAddress(initialSelection || response.data.addresses[0]);
            } else {
                setAddresses([]);
                setSelectedAddress(null);
                setError("No addresses found for this postcode.");
            }
        } catch (err) {
            console.error("Error fetching addresses:", err);
            setError("Failed to connect to the backend API. Please check the Worker deployment or network connection.");
        } finally {
            setLoading(false);
        }
    }, [selectedAddress]); // Dependency on selectedAddress to check for continuity

    // Handle postcode change and trigger fetch
    const handlePostcodeChange = (e) => {
        const newPostcode = e.target.value;
        setPostcode(newPostcode);
        // Clear previous selection when postcode changes
        setSelectedAddress(null);
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
                            <li key={index} onClick={() => {
                                setSelectedAddress(addr);
                            }} className="address-item">
                                {addr.fullAddress}
                            </li>
                        ))}
                    </ul>
                )}
                {!loading && addresses.length === 0 && !error && (
                    <p>No addresses found or please enter a valid postcode.</p>
                )}
            </div >

            {/* Main Dashboard Layout */}
            {selectedAddress && (
                <DashboardLayout address={selectedAddress} />
            )}
        </div >
    );
};

export default Dashboard;