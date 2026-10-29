import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { applyDocumentLanguage, detectLanguage } from './i18n/detectLanguage';

// Set <html lang dir> before the first paint so right-to-left pages never flash left-to-right.
applyDocumentLanguage(detectLanguage());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
