import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './components/theme/ThemeProvider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
