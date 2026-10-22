
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

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
   Customer Dashboard
   Insurance Purchases
   Policy Renewals
   Refund Tracking
   Claims & Notifications
   Admin Management
   Animated Loading Screen
========================================================= */

/* =========================================================
   ROLE-BASED HOME PAGE
========================================================= */

const home = (user) => {
  if (user?.role === 'ADMIN') {
    return '/admin'
  }

  return '/app'
}

/* =========================================================
   ANIMATED APPLICATION LOADING SCREEN
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
   PROTECTED ROUTES

   - Wait for session initialization.
   - Show branded loading animation.
   - Redirect unauthenticated users to login.
   - Restrict access by user role.
========================================================= */

function Guard({ role, children }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return <Splash />
  }

  if (!user) {
    return (
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
    )
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={home(user)}
        replace
      />
    )
  }

  return children
}

/* =========================================================
   GUEST-ONLY ROUTES

   Signed-in users should not return to login
   or registration unnecessarily.
========================================================= */

function GuestOnly({ children }) {
  const { user, booting } = useAuth()

  if (booting) {
    return <Splash />
  }

  if (user) {
    return (
      <Navigate
        to={home(user)}
        replace
      />
    )
  }

  return children
}

/* =========================================================
   ROOT PAGE

   Guest -> Landing
   USER  -> Customer Dashboard
   ADMIN -> Admin Dashboard
========================================================= */

function RootPage() {
  const { user, booting } = useAuth()

  if (booting) {
    return <Splash />
  }

  if (user) {
    return (
      <Navigate
        to={home(user)}
        replace
      />
    )
  }

  return <Landing />
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

          Accessible only to USER accounts.
      =================================================== */}

      <Route
        path="/app"
        element={
          <Guard role="USER">
            <Layout role="USER" />
          </Guard>
        }
      >

        {/* Customer Dashboard */}

        <Route
          index
          element={<CustomerDashboard />}
        />

        {/* Explore Insurance */}

        <Route
          path="plans"
          element={<Plans />}
        />

        {/* Buy Insurance - Existing Route */}

        <Route
          path="plans/:policyNumber/buy"
          element={<BuyPolicy />}
        />

        {/* =================================================
            POLICY RENEWAL - NEW ROUTE

            URL:
            /app/renew/:policyNumber

            The parameter is the original purchased
            policy number, NOT the insurance plan ID.

            Uses the existing BuyPolicy component
            with renewal mode enabled.
        ================================================= */}

        <Route
          path="renew/:policyNumber"
          element={<BuyPolicy />}
        />

        {/* Purchased Policies */}

        <Route
          path="policies"
          element={<MyPolicies />}
        />

        {/* Payments & Refund Submission */}

        <Route
          path="purchases"
          element={<MyPurchases />}
        />

        {/* Dedicated Refund Tracking */}

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

        {/* Customer Profile */}

        <Route
          path="profile"
          element={<Profile />}
        />

      </Route>

      {/* ===================================================
          ADMIN ROUTES

          Accessible only to ADMIN accounts.
      =================================================== */}

      <Route
        path="/admin"
        element={
          <Guard role="ADMIN">
            <Layout role="ADMIN" />
          </Guard>
        }
      >

        {/* Admin Dashboard */}

        <Route
          index
          element={<AdminDashboard />}
        />

        {/* Customer Management */}

        <Route
          path="users"
          element={<AdminUsers />}
        />

        {/* Policy Holder Management */}

        <Route
          path="policy-holders"
          element={<AdminPolicyHolders />}
        />

        {/* Insurance Policy Management */}

        <Route
          path="policies"
          element={<AdminPolicies />}
        />

        {/* Customer Purchase Management */}

        <Route
          path="purchases"
          element={<AdminPurchases />}
        />

        {/* Claims Management */}

        <Route
          path="claims"
          element={<AdminClaims />}
        />

        {/* Settlements Management */}

        <Route
          path="settlements"
          element={<AdminSettlements />}
        />

        {/* Customer Reviews */}

        <Route
          path="reviews"
          element={<AdminReviews />}
        />

        {/* Admin Broadcast Notifications */}

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
