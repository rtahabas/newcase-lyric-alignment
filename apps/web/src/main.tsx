import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Tooltip from '@radix-ui/react-tooltip';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tooltip.Provider delayDuration={400}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Tooltip.Provider>
  </StrictMode>,
);
