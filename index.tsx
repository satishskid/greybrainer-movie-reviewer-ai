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

const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // For fallback

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure an element with id='root' exists in your HTML.");
}

const root = ReactDOM.createRoot(rootElement);

const renderErrorScreen = (title: string, messages: string[]) => {
  root.render(
    <React.StrictMode>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        padding: '20px', 
        textAlign: 'center', 
        fontFamily: "'Inter var', 'Inter', sans-serif",
        backgroundColor: '#0f172a', // slate-900
        color: '#f1f5f9' // slate-100
      }}>
        <h1 style={{ fontSize: '2em', color: '#f43f5e', marginBottom: '1em' }}>{title}</h1>
        {messages.map((msg, index) => (
          <p key={index} style={{ fontSize: '1.1em', marginBottom: '0.5em', maxWidth: '600px' }} dangerouslySetInnerHTML={{ __html: msg }}></p>
        ))}
        <p style={{ fontSize: '0.9em', color: '#94a3b8', marginTop: '2em' }}>
          Please refer to the setup documentation for guidance on environment variable configuration.
        </p>
      </div>
    </React.StrictMode>
  );
};

if (!GEMINI_API_KEY) {
  console.error("Critical Error: Missing Gemini API Key. AI features will not function.");
  renderErrorScreen("AI Service Configuration Error", [
    "The Gemini API Key (<code>VITE_API_KEY</code>) is missing.",
    "This key is essential for primary AI-powered analysis features.",
    "Please ensure <code>VITE_API_KEY</code> is correctly set in your <code>.env</code> file."
  ]);
} else {
  if (!GROQ_API_KEY) {
    console.warn("Warning: Missing Groq API Key (VITE_GROQ_API_KEY). Fallback API functionality will be unavailable. Primary Gemini API will still function.");
  }
  // Render the full application if Gemini API key is present
  // Firebase authentication can be handled within the App component or specific routes
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}