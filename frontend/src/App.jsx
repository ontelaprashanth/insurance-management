import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import { useState } from 'react'

import { useAuth } from './auth/AuthContext'

import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'

/* =========================================================
   PUBLIC PAGES
========================================================= */

import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ForgotPassword from './pages/public/ForgotPassword'

/* =========================================================
   CUSTOMER PAGES
========================================================= */

import CustomerDashboard from './pages/customer/Dashboard'
import Plans from './pages/customer/Plans'
import BuyPolicy from './pages/customer/BuyPolicy'
import MyPolicies from './pages/customer/MyPolicies'
import MyPurchases from './pages/customer/MyPurchases'
import Refunds from './pages/customer/Refunds'
import MyClaims from './pages/customer/MyClaims'
import MyReviews from './pages/customer/MyReviews'
import Notifications from './pages/customer/Notifications'
import Profile from './pages/customer/Profile'

/* =========================================================
   ADMIN PAGES
========================================================= */

import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminPolicyHolders from './pages/admin/PolicyHolders'
import AdminPolicies from './pages/admin/Policies'
import AdminPurchases from './pages/admin/Purchases'
import AdminClaims from './pages/admin/Claims'
import AdminSettlements from './pages/admin/Settlements'
import AdminReviews from './pages/admin/Reviews'
import AdminBroadcast from './pages/admin/Broadcast'

/* =========================================================
   INSUREX — APPLICATION ROUTING

   Public Authentication
   Protected Customer Routes
   Protected Admin Routes
   JWT Session Restoration
   Session Recovery
   Insurance Purchases
   Policy Renewals
   Refund Tracking
   Claims and Notifications
========================================================= */

/* =========================================================
   ROLE-BASED HOME
========================================================= */

function home(user) {
  return user?.role === 'ADMIN'
    ? '/admin'
    : '/app'
}

/* =========================================================
   LOADING SCREEN
========================================================= */

function Splash() {
  return (
    <LoadingScreen
      message="Verifying your secure session..."
      fullScreen
    />
  )
}

/* =========================================================
   SESSION RECOVERY

   Shown when:
   - A JWT exists in sessionStorage
   - The backend could not verify it
   - The failure was not a confirmed invalid session

   This screen does NOT grant protected access.
   Authentication must succeed before continuing.
========================================================= */

function SessionRecovery() {
  const {
    refresh,
    logout,
    sessionChecking,
  } = useAuth()

  const [error, setError] = useState('')

  async function retry() {
    setError('')

    try {
      await refresh()
    } catch {
      setError(
        'The server is still unavailable or your session could not be verified. Please try again.',
      )
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background:
          'linear-gradient(145deg, #f0fdfa 0%, #f8fafc 55%, #eff6ff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '36px 28px',
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow:
            '0 20px 55px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            margin: '0 auto 20px',
            display: 'grid',
            placeItems: 'center',
            background: '#ccfbf1',
            color: '#0f766e',
            fontSize: 30,
          }}
        >
          🛡
        </div>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 750,
            color: '#0f172a',
            marginBottom: 12,
          }}
        >
          Reconnecting to InsureX
        </h2>

        <p
          style={{
            color: '#64748b',
            lineHeight: 1.7,
            fontSize: 14,
            marginBottom: 22,
          }}
        >
          Your previous session is still stored, but
          we could not verify it with the server.
          Render may be starting up. Your account
          information remains protected until
          verification succeeds.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: 12,
              marginBottom: 18,
              borderRadius: 10,
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={sessionChecking}
          onClick={retry}
          style={{
            width: '100%',
            minHeight: 46,
            padding: '12px 18px',
            borderRadius: 12,
            border: 0,
            background: '#0f766e',
            color: '#ffffff',
            fontWeight: 650,
            cursor: sessionChecking
              ? 'wait'
              : 'pointer',
            opacity: sessionChecking ? 0.7 : 1,
          }}
        >
          {sessionChecking
            ? 'Verifying session...'
            : 'Retry connection'}
        </button>

        <button
          type="button"
          disabled={sessionChecking}
          onClick={logout}
          style={{
            width: '100%',
            marginTop: 12,
            padding: 12,
            border: 0,
            background: 'transparent',
            color: '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign out and use another account
        </button>

        <p
          style={{
            marginTop: 18,
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          InsureX Secure Insurance Platform
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   SESSION GATE

   Centralized authentication decision:

   1. Booting -> Loading
   2. Authenticated -> Continue
   3. Stored JWT, verification unavailable -> Recovery
   4. No session -> Continue to public/redirect logic
========================================================= */

function SessionGate({ children }) {
  const {
    user,
    booting,
    hasStoredSession,
  } = useAuth()

  if (booting) {
    return <Splash />
  }

  if (!user && hasStoredSession) {
    return <SessionRecovery />
  }

  return children
}

/* =========================================================
   PROTECTED ROUTES

   USER:
   - Customer pages only

   ADMIN:
   - Admin pages only

   Direct URLs and page refreshes are supported.
========================================================= */

function Guard({ role, children }) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <SessionGate>
      {!user ? (
        <Navigate
          to="/login"
          state={{
            from:
              location.pathname +
              location.search +
              location.hash,
          }}
          replace
        />
      ) : user.role !== role ? (
        <Navigate
          to={home(user)}
          replace
        />
      ) : (
        children
      )}
    </SessionGate>
  )
}

/* =========================================================
   GUEST-ONLY ROUTES

   Logged-in users cannot access login/register
   unless they sign out first.
========================================================= */

function GuestOnly({ children }) {
  const { user } = useAuth()

  return (
    <SessionGate>
      {user ? (
        <Navigate
          to={home(user)}
          replace
        />
      ) : (
        children
      )}
    </SessionGate>
  )
}

/* =========================================================
   ROOT PAGE

   Guest -> Landing
   USER  -> Customer Dashboard
   ADMIN -> Admin Dashboard
========================================================= */

function RootPage() {
  const { user } = useAuth()

  return (
    <SessionGate>
      {user ? (
        <Navigate
          to={home(user)}
          replace
        />
      ) : (
        <Landing />
      )}
    </SessionGate>
  )
}

/* =========================================================
   APPLICATION
========================================================= */

export default function App() {
  return (
    <Routes>
      {/* ===================================================
          PUBLIC ROUTES
      =================================================== */}

      <Route
        path="/"
        element={<RootPage />}
      />

      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />

      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />

      <Route
        path="/forgot-password"
        element={
          <GuestOnly>
            <ForgotPassword />
          </GuestOnly>
        }
      />

      {/* ===================================================
          CUSTOMER ROUTES
      =================================================== */}

      <Route
        path="/app"
        element={
          <Guard role="USER">
            <Layout role="USER" />
          </Guard>
        }
      >
        {/* Dashboard */}

        <Route
          index
          element={<CustomerDashboard />}
        />

        {/* Insurance Plans */}

        <Route
          path="plans"
          element={<Plans />}
        />

        {/* Buy Insurance */}

        <Route
          path="plans/:policyNumber/buy"
          element={<BuyPolicy />}
        />

        {/* Renew Existing Policy */}

        <Route
          path="renew/:policyNumber"
          element={<BuyPolicy />}
        />

        {/* My Policies */}

        <Route
          path="policies"
          element={<MyPolicies />}
        />

        {/* Purchases and Payments */}

        <Route
          path="purchases"
          element={<MyPurchases />}
        />

        {/* Refund Tracking */}

        <Route
          path="refunds"
          element={<Refunds />}
        />

        {/* Claims */}

        <Route
          path="claims"
          element={<MyClaims />}
        />

        {/* Reviews */}

        <Route
          path="reviews"
          element={<MyReviews />}
        />

        {/* Notifications */}

        <Route
          path="notifications"
          element={<Notifications />}
        />

        {/* Profile */}

        <Route
          path="profile"
          element={<Profile />}
        />
      </Route>

      {/* ===================================================
          ADMIN ROUTES
      =================================================== */}

      <Route
        path="/admin"
        element={
          <Guard role="ADMIN">
            <Layout role="ADMIN" />
          </Guard>
        }
      >
        {/* Dashboard */}

        <Route
          index
          element={<AdminDashboard />}
        />

        {/* Users */}

        <Route
          path="users"
          element={<AdminUsers />}
        />

        {/* Policy Holders */}

        <Route
          path="policy-holders"
          element={<AdminPolicyHolders />}
        />

        {/* Policies */}

        <Route
          path="policies"
          element={<AdminPolicies />}
        />

        {/* Purchases */}

        <Route
          path="purchases"
          element={<AdminPurchases />}
        />

        {/* Claims */}

        <Route
          path="claims"
          element={<AdminClaims />}
        />

        {/* Settlements */}

        <Route
          path="settlements"
          element={<AdminSettlements />}
        />

        {/* Reviews */}

        <Route
          path="reviews"
          element={<AdminReviews />}
        />

        {/* Broadcast Notifications */}

        <Route
          path="broadcast"
          element={<AdminBroadcast />}
        />
      </Route>

      {/* ===================================================
          FALLBACK ROUTES
      =================================================== */}

      <Route
        path="/index.html"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  )
}
