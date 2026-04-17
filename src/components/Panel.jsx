import React from 'react';
import './Panel.css';

/**
 * Reusable wrapper component for all data panels.
 * Handles common UI/UX elements like loading states, error messages, and titles.
 * @param {object} props
 * @param {string} props.title - The title of the panel.
 * @param {React.ReactNode} props.children - The content of the panel (the actual data component).
 * @param {string} [props.className] - Optional additional class name for styling.
 */
const Panel = ({ title, children, className = '' }) => {
    return (
        <div className={`panel-container ${className}`}>
            <h2 className="panel-title">{title}</h2>
            <div className="panel-content">
                {children}
            </div>
        </div>
    );
};

export default Panel;