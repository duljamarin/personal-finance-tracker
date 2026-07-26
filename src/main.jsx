import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'

// Render immediately — i18n initialises asynchronously but react-i18next
// re-renders components once translations are ready. During the brief pre-init
// window, missing keys resolve to an empty string (parseMissingKeyHandler in
// i18n.js) rather than painting a raw key like "dashboard.title".
createRoot(document.getElementById('root')).render(<App />);
