import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initPromise } from './i18n'

const root = createRoot(document.getElementById('root'));

initPromise.then(() => {
  root.render(<App />);
});
