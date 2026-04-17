import React from 'react';
import Panel from '../components/Panel';

/**
 * Transport Panel Component
 * Displays nearby public transport links.
 * @param {object} props - Component props.
 * @param {string} props.title - Title of the panel.
 * @param {function} props.fetchData - Async function to fetch data.
 * @param {string} props.params - JSON string of parameters (e.g., lat, lng).
 */
const TransportPanel = ({ title, fetchData, params }) => {
    return (
        <Panel 
            title={title} 
            fetchData={fetchData} 
            params={params} 
        />
    );
};

export default TransportPanel;