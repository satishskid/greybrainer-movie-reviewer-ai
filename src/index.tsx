/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { LensPreviewApp } from './LensPreviewApp';
import { DraftReviewApp } from './DraftReviewApp';
import { DraftsListApp } from './DraftsListApp';
import './index.css'; // Import Tailwind CSS

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure an element with id='root' exists in your HTML.");
}

const root = ReactDOM.createRoot(rootElement);

function resolveApp() {
  const path = window.location.pathname;
  if (path === '/lens' || path.startsWith('/lens/')) return <LensPreviewApp />;
  if (path === '/studio/drafts' || path === '/studio/drafts/') return <DraftsListApp />;
  if (path.startsWith('/studio/drafts/')) return <DraftReviewApp />;
  return <App />;
}

// Render the application - API keys are now managed through BYOK system
root.render(
  <React.StrictMode>
    {resolveApp()}
  </React.StrictMode>
);
