
import { useEffect, useState, useCallback } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../auth/AuthContext'
import { notifications } from '../api/endpoints'
import { Icon, Logo } from './ui'
import { initials } from '../lib/format'

/* =========================================================
   INSUREX — CUSTOMER NAVIGATION
========================================================= */

const USER_NAV = [
  {
    group: 'Overview',
    items: [
      {
        to: '/app',
        label: 'Dashboard',
        icon: 'home',
        end: true,
      },
      {
        to: '/app/plans',
        label: 'Buy insurance',
        icon: 'shield',
      },
    ],
  },
  {
    group: 'My cover',
    items: [
      {
        to: '/app/policies',
        label: 'My policies',
        icon: 'badge',
      },
      {
        to: '/app/purchases',
        label: 'Payments',
        icon: 'receipt',
      },
      {
        to: '/app/refunds',
        label: 'Refunds',
        icon: 'cash',
      },
      {
        to: '/app/claims',
        label: 'My claims',
        icon: 'claim',
      },
      {
        to: '/app/reviews',
        label: 'Reviews',
        icon: 'star',
      },
    ],
  },
  {
    group: 'Account',
    items: [
      {
        to: '/app/notifications',
        label: 'Notifications',
        icon: 'bell',
        badge: true,
      },
      {
        to: '/app/profile',
        label: 'Profile',
        icon: 'user',
      },
    ],
  },
]

/* =========================================================
   INSUREX — ADMIN NAVIGATION
========================================================= */

const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [
      {
        to: '/admin',
        label: 'Dashboard',
        icon: 'chart',
        end: true,
      },
    ],
  },
  {
    group: 'Customers',
    items: [
      {
        to: '/admin/users',
        label: 'Users',
        icon: 'users',
      },
      {
        to: '/admin/policy-holders',
        label: 'Policy holders',
        icon: 'user',
      },
    ],
  },
  {
    group: 'Insurance',
    items: [
      {
        to: '/admin/policies',
        label: 'Policies',
        icon: 'shield',
      },
      {
        to: '/admin/purchases',
        label: 'Purchases',
        icon: 'receipt',
      },
    ],
  },
  {
    group: 'Claims',
    items: [
      {
        to: '/admin/claims',
        label: 'Claims',
        icon: 'claim',
      },
      {
        to: '/admin/settlements',
        label: 'Settlements',
        icon: 'cash',
      },
      {
        to: '/admin/reviews',
        label: 'Reviews',
        icon: 'star',
      },
    ],
  },
  {
    group: 'Communicate',
    items: [
      {
        to: '/admin/broadcast',
        label: 'Broadcast',
        icon: 'megaphone',
      },
    ],
  },
]

/* =========================================================
   MAIN APPLICATION LAYOUT
========================================================= */

export default function Layout({ role }) {
  const { user, logout } = useAuth()

  const [open, setOpen] = useState(false)

  const { pathname } = useLocation()
  const navigate = useNavigate()

  const nav = role === 'ADMIN' ? ADMIN_NAV : USER_NAV

  /* Close mobile sidebar after navigation */

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  /* Lock background scrolling while mobile menu is open */

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  /* Close sidebar with Escape */

  useEffect(() => {
    if (!open) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  /* Customer unread notifications */

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notifications.unread,
    enabled: role === 'USER',
    refetchInterval: 60_000,
  })

  const unreadCount = Number(unread.data?.count || 0)

  /* Logout */

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className="shell">

      {/* MOBILE BACKDROP */}

      {open && (
        <div
          className="scrim"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`sidebar ${open ? 'open' : ''}`}
        aria-label="Main navigation"
      >

        {/* BRAND */}

        <NavLink
          to={role === 'ADMIN' ? '/admin' : '/app'}
          className="brand"
        >
          <Logo />

          <span>
            InsureX

            <small>
              {role === 'ADMIN'
                ? 'Admin console'
                : 'Customer portal'}
            </small>
          </span>
        </NavLink>

        {/* NAVIGATION */}

        <nav className="nav">
          {nav.map((group) => (
            <div key={group.group}>

              <div className="nav-group">
                {group.group}
              </div>

              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'active' : ''
                  }
                >
                  <Icon name={item.icon} />

                  <span>{item.label}</span>

                  {item.badge && unreadCount > 0 && (
                    <span className="count">
                      {unreadCount > 99
                        ? '99+'
                        : unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}

            </div>
          ))}
        </nav>

        {/* ACCOUNT FOOTER */}

        <div className="sidebar-foot">

          <div className="avatar">
            {initials(user?.username)}
          </div>

          <div className="who">
            <b>
              {user?.username || 'InsureX user'}
            </b>

            <span>
              {role === 'ADMIN'
                ? 'Administrator'
                : 'Customer'}
            </span>
          </div>

          <button
            className="btn icon-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            type="button"
          >
            <Icon name="logout" />
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}

      <div className="main">

        {/* MOBILE TOPBAR */}

        <header className="topbar">

          <button
            className="btn ghost icon-btn"
            onClick={() =>
              setOpen((current) => !current)
            }
            aria-label={
              open ? 'Close menu' : 'Open menu'
            }
            aria-expanded={open}
            aria-controls="insurex-sidebar"
            type="button"
          >
            <Icon name="menu" />
          </button>

          <NavLink
            to={role === 'ADMIN' ? '/admin' : '/app'}
            className="brand"
          >
            <Logo size={26} />
            <span>InsureX</span>
          </NavLink>

        </header>

        {/* PAGE CONTENT */}

        <main className="content">
          <Outlet />
        </main>

      </div>
    </div>
  )
}
