import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
// CI/CD trigger.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);
