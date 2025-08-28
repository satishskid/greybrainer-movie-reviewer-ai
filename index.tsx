import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';

// TODO: Replace with your actual Firebase configuration
// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_AUTH_DOMAIN",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };

// Initialize Firebase (uncomment and configure)
// const firebaseApp = initializeApp(firebaseConfig);
// export const auth = getAuth(firebaseApp); // Export auth if needed by components

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure an element with id='root' exists in your HTML.");
}

const root = ReactDOM.createRoot(rootElement);

// Render the application - API keys are now managed through BYOK system
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);