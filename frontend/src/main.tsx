import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import { getApiUrl } from './utils/apiUrl';
import './index.css';

// Nothing should import this file. It is the entry point: it runs for its side
// effects (mounting the app), so being imported as a dependency makes HMR
// re-execute it and mount a second root. loadResponsiveVoice used to be
// exported from here for that reason — it now lives in utils/responsiveVoice.

// Set up axios to use the API URL from environment.
//
// This used to fall back to http://localhost:8080, which is not where the
// backend runs — it listens on 3000, and the other 338 call sites in this app
// say so. Anything relying on axios's default baseURL was pointed at a dead
// port whenever VITE_API_URL was unset.
//
// getApiUrl falls back to the page's own origin instead, which is right in
// both environments: in dev that is the Vite server, whose proxy forwards
// /api to the backend, and in production the API is served from the same
// origin. No port is hardcoded either way.
const apiUrl = getApiUrl();
console.log('[API Config] VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('[API Config] Using:', apiUrl || '(same origin)');
axios.defaults.baseURL = apiUrl;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
