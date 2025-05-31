/**
 * Main entry point for the Task Nomade application
 * This file sets up React and renders the root component
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Create a root element for React to render into
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the main App component
// StrictMode is enabled for better development experience and catching potential issues
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Measure and report performance metrics
reportWebVitals();
