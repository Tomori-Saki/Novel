import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from './ui/theme/themeStore';
import { initReaderPrefs } from './ui/theme/readerPrefs';
import './styles.css';

initTheme();
initReaderPrefs();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
