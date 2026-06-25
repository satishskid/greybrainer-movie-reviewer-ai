/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { LensPreviewApp } from './LensPreviewApp';
import { DraftReviewApp } from './DraftReviewApp';
import { DraftsListApp } from './DraftsListApp';
import { PublishLaneApp } from './PublishLaneApp';
import './index.css'; // Import Tailwind CSS

const ENGINE_BUILD_ID = 'engine-assets-2026-06-25-v2';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure an element with id='root' exists in your HTML.");
}

document.documentElement.dataset.engineBuild = ENGINE_BUILD_ID;

const root = ReactDOM.createRoot(rootElement);

function resolveApp() {
  const path = window.location.pathname.replace(/^\/engine(?=\/|$)/, '') || '/';
  if (path === '/lens' || path.startsWith('/lens/')) return <LensPreviewApp />;
  if (path === '/studio/publish-lane' || path.startsWith('/studio/publish-lane/')) return <PublishLaneApp />;
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
