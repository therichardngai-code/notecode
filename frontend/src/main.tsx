import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { router } from './app/router';
import { ThemeProvider } from '@/shared/components/theme-provider';

// Detect Electron environment and enable transparent background
const isElectron = navigator.userAgent.toLowerCase().includes('electron');
if (isElectron) {
  document.body.classList.add('electron-mode');
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
