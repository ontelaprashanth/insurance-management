
import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'

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

  const menuButtonRef = useRef(null)
  const sidebarRef = useRef(null)

  const isAdmin = role === 'ADMIN'
  const nav = isAdmin ? ADMIN_NAV : USER_NAV
  const dashboardPath = isAdmin ? '/admin' : '/app'

  /* =======================================================
     CLOSE MOBILE MENU ON NAVIGATION
  ======================================================= */

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  /* =======================================================
     LOCK BACKGROUND SCROLLING
  ======================================================= */

  useEffect(() => {
    if (!open) return

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [open])

  /* =======================================================
     ESCAPE KEY SUPPORT
  ======================================================= */

  useEffect(() => {
    if (!open) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener(
      'keydown',
      handleEscape,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [open])

  /* =======================================================
     CUSTOMER UNREAD NOTIFICATIONS
  ======================================================= */

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notifications.unread,
    enabled: !isAdmin,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const unreadCount = Math.max(
    0,
    Number(unread.data?.count || 0) || 0,
  )

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = useCallback(() => {
    setOpen(false)
    logout()

    navigate('/login', {
      replace: true,
    })
  }, [logout, navigate])

  /* =======================================================
     NAVIGATION LINK
  ======================================================= */

  const renderNavItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end ?? false}
      className={({ isActive }) =>
        isActive ? 'active' : ''
      }
      onClick={() => setOpen(false)}
    >
      <Icon name={item.icon} />

      <span>{item.label}</span>

      {item.badge && unreadCount > 0 && (
        <span
          className="count"
          aria-label={`${unreadCount} unread notifications`}
        >
          {unreadCount > 99
            ? '99+'
            : unreadCount}
        </span>
      )}
    </NavLink>
  )

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="shell">

      {/* ===================================================
          MOBILE BACKDROP
      =================================================== */}

      {open && (
        <div
          className="scrim"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        id="insurex-sidebar"
        ref={sidebarRef}
        className={`sidebar ${open ? 'open' : ''}`}
        aria-label={
          isAdmin
            ? 'Admin navigation'
            : 'Customer navigation'
        }
      >

        {/* BRAND */}

        <NavLink
          to={dashboardPath}
          className="brand"
          onClick={() => setOpen(false)}
        >
          <Logo />

          <span>
            InsureX

            <small>
              {isAdmin
                ? 'Admin console'
                : 'Customer portal'}
            </small>
          </span>
        </NavLink>

        {/* NAVIGATION */}

        <nav
          className="nav"
          aria-label="Main navigation"
        >
          {nav.map((group) => (
            <div key={group.group}>

              <div className="nav-group">
                {group.group}
              </div>

              {group.items.map(renderNavItem)}

            </div>
          ))}
        </nav>

        {/* ACCOUNT FOOTER */}

        <div className="sidebar-foot">

          <div
            className="avatar"
            aria-hidden="true"
          >
            {initials(
              user?.username ||
              user?.name ||
              'InsureX',
            )}
          </div>

          <div className="who">

            <b title={user?.username || ''}>
              {user?.username ||
                'InsureX user'}
            </b>

            <span>
              {isAdmin
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

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <div className="main">

        {/* MOBILE TOPBAR */}

        <header className="topbar">

          <button
            ref={menuButtonRef}
            className="btn ghost icon-btn"
            onClick={() =>
              setOpen((current) => !current)
            }
            aria-label={
              open
                ? 'Close menu'
                : 'Open menu'
            }
            aria-expanded={open}
            aria-controls="insurex-sidebar"
            type="button"
          >
            <Icon
              name={open ? 'x' : 'menu'}
            />
          </button>

          <NavLink
            to={dashboardPath}
            className="brand"
            onClick={() => setOpen(false)}
          >
            <Logo size={26} />

            <span>
              InsureX
            </span>
          </NavLink>

        </header>

        {/* PAGE CONTENT */}

        <main
          className="content"
          id="main-content"
        >
          <Outlet />
        </main>

      </div>

    </div>
  )
}
