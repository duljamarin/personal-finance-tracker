import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'

// Render immediately — i18n initialises asynchronously but react-i18next
// re-renders components once translations are ready, so there is no flash
// of untranslated keys (keys resolve to empty string via useSuspense:false).
createRoot(document.getElementById('root')).render(<App />);
