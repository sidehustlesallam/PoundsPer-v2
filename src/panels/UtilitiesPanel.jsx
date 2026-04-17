import React from 'react';
import Panel from '../components/Panel';

/**
 * Utilities Panel Component
 * Displays water provider and broadband connectivity data.
 * @param {object} props - Component props.
 * @param {string} props.title - Title of the panel.
 * @param {function} props.fetchData - Async function to fetch data.
 * @param {string} props.params - JSON string of parameters (e.g., UPRN, lat, lng).
 */
const UtilitiesPanel = ({ title, fetchData, params }) => {
    return (
        <Panel 
            title={title} 
            fetchData={fetchData} 
            params={params} 
        />
    );
};

export default UtilitiesPanel;