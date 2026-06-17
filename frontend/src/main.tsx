import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Set up axios to use the API URL from environment
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
