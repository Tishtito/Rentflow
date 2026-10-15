import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ApiProvider } from '@rentflow/api';
import '@rentflow/ui/styles.css';
import { api, queryClient } from './api';
import { AppChrome } from './AppChrome';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiProvider client={api}>
      <QueryClientProvider client={queryClient}>
        <AppChrome />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>
  </StrictMode>,
);
