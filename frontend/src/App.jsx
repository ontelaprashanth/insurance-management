
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'

import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ForgotPassword from './pages/public/ForgotPassword'

import CustomerDashboard from './pages/customer/Dashboard'
import Plans from './pages/customer/Plans'
import BuyPolicy from './pages/customer/BuyPolicy'
import MyPolicies from './pages/customer/MyPolicies'
import MyPurchases from './pages/customer/MyPurchases'
import MyClaims from './pages/customer/MyClaims'
import MyReviews from './pages/customer/MyReviews'
import Notifications from './pages/customer/Notifications'
import Profile from './pages/customer/Profile'

import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminPolicyHolders from './pages/admin/PolicyHolders'
import AdminPolicies from './pages/admin/Policies'
import AdminPurchases from './pages/admin/Purchases'
import AdminClaims from './pages/admin/Claims'
import AdminSettlements from './pages/admin/Settlements'
import AdminReviews from './pages/admin/Reviews'
import AdminBroadcast from './pages/admin/Broadcast'

const home = (user) =>
  user?.role === 'ADMIN' ? '/admin' : '/app'

function Splash() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
      }}
    >
      <span
        className="spinner"
        style={{
          width: 28,
          height: 28,
          color: '#0F3D3E',
        }}
      />
    </div>
  )
}

// Protect customer and admin routes.
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
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  if (user.role !== role) {
    return <Navigate to={home(user)} replace />
  }

  return children
}

// Allow guests to access public pages only.
function GuestOnly({ children }) {
  const { user, booting } = useAuth()

  if (booting) {
    return <Splash />
  }

  if (user) {
    return <Navigate to={home(user)} replace />
  }

  return children
}

// Show Landing page by default.
function RootPage() {
  const { user, booting } = useAuth()

  if (booting) {
    return <Splash />
  }

  if (user) {
    return <Navigate to={home(user)} replace />
  }

  return <Landing />
}

export default function App() {
  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<RootPage />} />

      {/* Login */}
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />

      {/* Registration */}
      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />

      {/* Forgot password */}
      <Route
        path="/forgot-password"
        element={
          <GuestOnly>
            <ForgotPassword />
          </GuestOnly>
        }
      />

      {/* Customer routes */}
      <Route
        path="/app"
        element={
          <Guard role="USER">
            <Layout role="USER" />
          </Guard>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="plans" element={<Plans />} />
        <Route
          path="plans/:policyNumber/buy"
          element={<BuyPolicy />}
        />
        <Route path="policies" element={<MyPolicies />} />
        <Route path="purchases" element={<MyPurchases />} />
        <Route path="claims" element={<MyClaims />} />
        <Route path="reviews" element={<MyReviews />} />
        <Route
          path="notifications"
          element={<Notifications />}
        />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <Guard role="ADMIN">
            <Layout role="ADMIN" />
          </Guard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route
          path="policy-holders"
          element={<AdminPolicyHolders />}
        />
        <Route path="policies" element={<AdminPolicies />} />
        <Route path="purchases" element={<AdminPurchases />} />
        <Route path="claims" element={<AdminClaims />} />
        <Route
          path="settlements"
          element={<AdminSettlements />}
        />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="broadcast" element={<AdminBroadcast />} />
      </Route>

      {/* Redirect index.html to the Landing page */}
      <Route
        path="/index.html"
        element={<Navigate to="/" replace />}
      />

      {/* Redirect unknown URLs */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}
