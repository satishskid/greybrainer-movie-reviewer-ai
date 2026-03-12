/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { LensPreviewApp } from './LensPreviewApp';
import { DraftReviewApp } from './DraftReviewApp';
import './index.css'; // Import Tailwind CSS

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure an element with id='root' exists in your HTML.");
}

const root = ReactDOM.createRoot(rootElement);

// Render the application - API keys are now managed through BYOK system
root.render(
  <React.StrictMode>
    {window.location.pathname === '/lens' || window.location.pathname.startsWith('/lens/')
      ? <LensPreviewApp />
      : window.location.pathname.startsWith('/studio/drafts/')
        ? <DraftReviewApp />
        : <App />}
  </React.StrictMode>
);
