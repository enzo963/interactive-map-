import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { routes } from './routes';
import { matchRoute } from './router/matchRoute';
import { preloadInitialRoute } from './router/preloadInitialRoute';
import { applyDocumentLanguage, detectLanguage } from './i18n/detectLanguage';

// Set <html lang> before the first paint (screen readers, hyphenation).
applyDocumentLanguage(detectLanguage());

// Give the requested route a short head start. If it stalls, mount navigation
// and the genuine loading state after at most 150 ms instead of waiting forever.
try {
  await preloadInitialRoute(matchRoute(routes, window.location.pathname)?.route.load);
} catch {
  // Render normally so the route boundary can show actionable import recovery.
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
