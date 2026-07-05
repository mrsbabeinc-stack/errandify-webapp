import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Lazy-load ResponsiveVoice.JS only when needed (speeds up app startup)
export const loadResponsiveVoice = () => {
  return new Promise<void>((resolve) => {
    if ((window as any).responsiveVoice) {
      console.log('[Hana] ResponsiveVoice already loaded');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://code.responsivevoice.org/responsivevoice.js';
    script.onload = () => {
      console.log('[Hana] ResponsiveVoice.JS loaded');
      resolve();
    };
    script.onerror = () => {
      console.warn('[Hana] Failed to load ResponsiveVoice');
      resolve(); // Don't break if it fails
    };
    document.head.appendChild(script);
  });
};

// Set up axios to use the API URL from environment
axios.defaults.baseURL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : window.location.origin);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
