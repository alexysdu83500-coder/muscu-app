import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import React from "react";
import ReactDOM from "react-dom/client";
import "./services/storageService"; // effet de bord : polyfill window.storage si absent
import "./styles/globals.css";
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
