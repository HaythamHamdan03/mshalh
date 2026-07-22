import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'Noto Kufi Arabic', Tahoma, Arial, sans-serif",
            direction: 'rtl',
            background: '#FFFDF8',
            color: '#3B2615',
            border: '1px solid #E7D8BD',
          },
          success: { iconTheme: { primary: '#2F6B3F', secondary: '#FFFDF8' } },
          error: { iconTheme: { primary: '#A33A2A', secondary: '#FFFDF8' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
