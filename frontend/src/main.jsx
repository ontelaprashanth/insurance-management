
import React from 'react'
import ReactDOM from 'react-dom/client'

import { BrowserRouter } from 'react-router-dom'

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

import App from './App'

import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './components/ui'

import './styles.css'

/* =========================================================
   INSUREX — APPLICATION ENTRY POINT

   React 18
   React Router
   React Query
   JWT Authentication
   Toast Notifications
   Global Styles
========================================================= */

/* =========================================================
   REACT QUERY CONFIGURATION
========================================================= */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Do not retry unauthorized or forbidden requests.
      retry: (failureCount, error) => {
        const status = error?.response?.status

        if (status === 401 || status === 403) {
          return false
        }

        return failureCount < 1
      },

      // Avoid unnecessary API requests.
      staleTime: 15_000,

      // Pages can explicitly enable this when needed.
      refetchOnWindowFocus: false,

      // Refresh data when a component mounts if stale.
      refetchOnMount: true,

      // Do not automatically refetch during a network outage.
      refetchOnReconnect: true,
    },

    mutations: {
      // Avoid repeating financial transactions.
      retry: false,
    },
  },
})

/* =========================================================
   APPLICATION ROOT
========================================================= */

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'InsureX root element was not found.',
  )
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
