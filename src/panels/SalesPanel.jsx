import React from 'react';
import Panel from '../components/Panel';

/**
 * Recent Sales Panel Component
 * Displays historical sales data for a postcode.
 * @param {object} props - Component props.
 * @param {string} props.title - Title of the panel.
 * @param {function} props.fetchData - Async function to fetch data.
 * @param {string} props.params - JSON string of parameters (e.g., postcode).
 */
const SalesPanel = ({ title, fetchData, params }) => {
    return (
        <Panel 
            title={title} 
            fetchData={fetchData} 
            params={params} 
        />
    );
};

export default SalesPanel;