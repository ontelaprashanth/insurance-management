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
   TanStack React Query
   JWT Authentication
   Secure Account Cache Isolation
   Toast Notifications
   Render Free Backend Support
   Payment / Refund Retry Protection
   Global Styles
========================================================= */

/* =========================================================
   QUERY RETRY POLICY

   Only retry safe GET requests.

   Never automatically retry:
   - Login
   - Policy purchases
   - Razorpay payment creation / verification
   - Policy renewals
   - Refund requests
   - Claims or settlement mutations

   A failed network response does not necessarily mean
   that the backend failed to process a transaction.
========================================================= */

function shouldRetryQuery(failureCount, error) {
  const status = error?.response?.status

  const method = String(
    error?.config?.method ?? 'get',
  ).toLowerCase()

  // Never retry requests that can modify data.
  if (method !== 'get') {
    return false
  }

  // Authentication and authorization errors.
  if (status === 401 || status === 403) {
    return false
  }

  // Invalid requests and missing resources.
  if (
    status === 400 ||
    status === 404 ||
    status === 409 ||
    status === 422
  ) {
    return false
  }

  // Do not retry cancelled requests.
  if (error?.code === 'ERR_CANCELED') {
    return false
  }

  // Retry safe reads once after temporary failures.
  const temporaryFailure =
    !status ||
    status === 408 ||
    status === 429 ||
    status >= 500

  return temporaryFailure && failureCount < 1
}

/* =========================================================
   REACT QUERY CLIENT

   Cache isolation:
   AuthContext clears this QueryClient whenever the
   authenticated account changes or logs out.

   Financial safety:
   Mutations are never automatically retried.
========================================================= */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,

      // A failed GET retry is delayed slightly.
      retryDelay: (attemptIndex) =>
        Math.min(
          1500 * 2 ** attemptIndex,
          5000,
        ),

      // Reduce unnecessary requests between pages.
      staleTime: 15_000,

      // Keep inactive query data for five minutes.
      gcTime: 5 * 60 * 1000,

      // Individual pages may enable focus polling.
      refetchOnWindowFocus: false,

      // Refresh stale data when reopening a page.
      refetchOnMount: true,

      // Revalidate after internet connectivity returns.
      refetchOnReconnect: true,

      // Pause network-dependent queries while offline.
      networkMode: 'online',

      // Let pages explicitly configure polling
      // for refund and payment status tracking.
      refetchInterval: false,
    },

    mutations: {
      // Critical: no automatic repeat of transactions.
      retry: false,

      networkMode: 'online',
    },
  },
})

/* =========================================================
   APPLICATION ROOT
========================================================= */

const rootElement =
  document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'InsureX root element was not found.',
  )
}

/* =========================================================
   PROVIDER ORDER

   QueryClientProvider
     BrowserRouter
       ToastProvider
         AuthProvider
           App

   AuthProvider requires QueryClientProvider.
   App requires AuthProvider and BrowserRouter.
========================================================= */

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
