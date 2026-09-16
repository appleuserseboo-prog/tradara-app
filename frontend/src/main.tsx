// ==========================================
// FILE: src/main.tsx
// ==========================================

import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA Service Worker Registration with auto-update handling to prevent white screens
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('Tradara App Registered!', reg);

        // Check if there's a waiting worker on first load (indicates an update is ready)
        if (reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
        }

        // Listen for new service worker updates being installed
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available; force it to take over immediately
                newWorker.postMessage('SKIP_WAITING');
              }
            });
          }
        });
      })
      .catch(err => console.error('App Registration failed:', err));

    // Reload the page automatically once the new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}