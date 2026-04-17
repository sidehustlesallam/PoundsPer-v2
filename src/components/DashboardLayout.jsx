import React from 'react';
import EPCPanel from '../panels/EPCPanel';
import SalesPanel from '../panels/SalesPanel';
import HPIPanel from '../panels/HPIPanel';
import SchoolsPanel from '../panels/SchoolsPanel';
import UtilitiesPanel from '../panels/UtilitiesPanel';
import TransportPanel from '../panels/TransportPanel';
import FloodRiskPanel from '../panels/FloodRiskPanel';
import OfstedPanel from '../panels/OfstedPanel';
import MapPanel from '../panels/MapPanel';

/**
 * DashboardLayout component
 * Assembles all data panels into the main dashboard view.
 * @param {object} props - Component props.
 * @param {object} props.address - The selected property address object.
 * @param {function} props.fetchDataPanel - Function to handle fetching data for a panel.
 * @param {string} props.params - JSON string of parameters for the panel.
 */
const DashboardLayout = ({ address, fetchDataPanel, params }) => {
    // Define the order and structure of the panels
    const panels = [
        { 
            Component: EPCPanel, 
            title: "EPC Rating", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: SalesPanel, 
            title: "Recent Sales & Local Pricing", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: HPIPanel, 
            title: "HPI-Adjusted Pricing", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: SchoolsPanel, 
            title: "Local Schools & Ofsted", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: UtilitiesPanel, 
            title: "Utilities & Connectivity", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: TransportPanel, 
            title: "Transport Links", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: FloodRiskPanel, 
            title: "Flood Risk Assessment", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: OfstedPanel, 
            title: "Ofsted Ratings", 
            params: params, 
            fetchData: fetchDataPanel 
        },
        { 
            Component: MapPanel, 
            title: "Location Map", 
            params: params, 
            fetchData: fetchDataPanel 
        },
    ];

    return (
        <div className="dashboard-layout">
            <div className="panel-grid">
                {/* Map panel often needs to be prominent */}
                <div className="map-col">
                    <MapPanel 
                        title="Location Map" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                </div>
                
                {/* Other panels in a grid */}
                <div className="panel-grid-2">
                    <EPCPanel 
                        title="EPC Rating" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                    <SalesPanel 
                        title="Recent Sales & Local Pricing" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                </div>
                <div className="panel-grid-2">
                    <HPIPanel 
                        title="HPI-Adjusted Pricing" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                    <SchoolsPanel 
                        title="Local Schools & Ofsted" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                </div>
                <div className="panel-grid-2">
                    <UtilitiesPanel 
                        title="Utilities & Connectivity" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                    <TransportPanel 
                        title="Transport Links" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                </div>
                <div className="panel-grid-2">
                    <FloodRiskPanel 
                        title="Flood Risk Assessment" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                    <OfstedPanel 
                        title="Ofsted Ratings" 
                        fetchData={fetchDataPanel} 
                        params={params} 
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;