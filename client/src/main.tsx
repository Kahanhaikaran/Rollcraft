import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { loadAccessToken, saveAccessToken } from './lib/auth';
import { api, isDemoMode } from './lib/api';

async function initAuth() {
  const token = loadAccessToken();
  if (!token || isDemoMode()) return;

  try {
    const res = await api.refresh();
    saveAccessToken(res.accessToken);
  } catch {
    saveAccessToken(null);
  }
}

initAuth();

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
