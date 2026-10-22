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

import {
  LayoutDashboard,
  ShieldPlus,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  HandCoins,
  ClipboardList,
  Star,
  Bell,
  UserRound,
  UsersRound,
  UserRoundCheck,
  Shield,
  ShoppingBag,
  ClipboardCheck,
  Wallet,
  Megaphone,
  LogOut,
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import { notifications } from '../api/endpoints'
import { Icon, Logo } from './ui'
import { initials } from '../lib/format'

/* =========================================================
   INSUREX — APPLICATION LAYOUT

   Customer Navigation
   Admin Navigation
   Responsive Sidebar
   Mobile Menu
   Unread Notifications
   Secure Logout
   Keyboard Accessibility
   Role-Based Navigation
========================================================= */

/* =========================================================
   CUSTOMER NAVIGATION
========================================================= */

const USER_NAV = [
  {
    group: 'Overview',
    items: [
      {
        to: '/app',
        label: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
      },
      {
        to: '/app/plans',
        label: 'Buy insurance',
        icon: ShieldPlus,
      },
    ],
  },
  {
    group: 'My cover',
    items: [
      {
        to: '/app/policies',
        label: 'My policies',
        icon: ShieldCheck,
        end: true,
      },
      {
        to: '/app/policies?status=claimed',
        label: 'Claimed policies',
        icon: ShieldAlert,
        end: true,
      },
      {
        to: '/app/purchases',
        label: 'Payments',
        icon: CreditCard,
      },
      {
        to: '/app/refunds',
        label: 'Refunds',
        icon: HandCoins,
      },
      {
        to: '/app/claims',
        label: 'My claims',
        icon: ClipboardList,
      },
      {
        to: '/app/reviews',
        label: 'Reviews',
        icon: Star,
      },
    ],
  },
  {
    group: 'Account',
    items: [
      {
        to: '/app/notifications',
        label: 'Notifications',
        icon: Bell,
        badge: true,
      },
      {
        to: '/app/profile',
        label: 'Profile',
        icon: UserRound,
      },
    ],
  },
]

/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [
      {
        to: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
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
        icon: UsersRound,
      },
      {
        to: '/admin/policy-holders',
        label: 'Policy holders',
        icon: UserRoundCheck,
      },
    ],
  },
  {
    group: 'Insurance',
    items: [
      {
        to: '/admin/policies',
        label: 'Policies',
        icon: Shield,
      },
      {
        to: '/admin/purchases',
        label: 'Purchases',
        icon: ShoppingBag,
      },
    ],
  },
  {
    group: 'Claims',
    items: [
      {
        to: '/admin/claims',
        label: 'Claims',
        icon: ClipboardCheck,
      },
      {
        to: '/admin/settlements',
        label: 'Settlements',
        icon: Wallet,
      },
      {
        to: '/admin/reviews',
        label: 'Reviews',
        icon: Star,
      },
    ],
  },
  {
    group: 'Communicate',
    items: [
      {
        to: '/admin/broadcast',
        label: 'Broadcast',
        icon: Megaphone,
      },
    ],
  },
]

/* =========================================================
   HELPERS
========================================================= */

function getUnreadCount(data) {
  const raw =
    typeof data === 'number'
      ? data
      : data?.count ??
        data?.unreadCount ??
        data?.total ??
        0

  const count = Number(raw)

  return Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0
}

function isClaimedRoute(pathname, search) {
  return (
    pathname === '/app/policies' &&
    new URLSearchParams(search).get('status') ===
      'claimed'
  )
}

function isPoliciesRoute(pathname, search) {
  return (
    pathname === '/app/policies' &&
    !isClaimedRoute(pathname, search)
  )
}

/* =========================================================
   MAIN APPLICATION LAYOUT
========================================================= */

export default function Layout({ role }) {
  const { user, logout } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()

  const { pathname, search } = location

  const [open, setOpen] = useState(false)

  const menuButtonRef = useRef(null)
  const sidebarRef = useRef(null)

  const isAdmin = role === 'ADMIN'

  const nav = isAdmin
    ? ADMIN_NAV
    : USER_NAV

  const dashboardPath = isAdmin
    ? '/admin'
    : '/app'

  /* =======================================================
     CLOSE MOBILE MENU AFTER NAVIGATION
  ======================================================= */

  useEffect(() => {
    setOpen(false)
  }, [pathname, search])

  /* =======================================================
     PREVENT BACKGROUND SCROLLING

     Applies only when the mobile sidebar is open.
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
     KEYBOARD ACCESSIBILITY

     Escape closes the sidebar.
     Focus returns to the menu button.
  ======================================================= */

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [open])

  /* =======================================================
     CUSTOMER UNREAD NOTIFICATIONS

     ADMIN does not call customer notification API.

     Polls every 60 seconds while the page is active.
  ======================================================= */

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],

    queryFn: notifications.unread,

    enabled: !isAdmin && Boolean(user),

    staleTime: 15_000,

    refetchInterval: 60_000,

    refetchIntervalInBackground: false,

    refetchOnWindowFocus: true,

    refetchOnReconnect: true,
  })

  const unreadCount = getUnreadCount(
    unread.data,
  )

  /* =======================================================
     LOGOUT

     AuthContext clears:
     - JWT token
     - Current user
     - React Query cache
  ======================================================= */

  const handleLogout = useCallback(() => {
    setOpen(false)

    logout()

    navigate('/login', {
      replace: true,
    })
  }, [
    logout,
    navigate,
  ])

  /* =======================================================
     MOBILE MENU
  ======================================================= */

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  const toggleMenu = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  /* =======================================================
     NAVIGATION ITEM
  ======================================================= */

  const renderNavItem = (item) => {
    const NavIcon = item.icon

    let customActive

    if (
      item.to ===
      '/app/policies?status=claimed'
    ) {
      customActive = isClaimedRoute(
        pathname,
        search,
      )
    } else if (
      item.to === '/app/policies'
    ) {
      customActive = isPoliciesRoute(
        pathname,
        search,
      )
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end ?? false}
        className={({ isActive }) =>
          customActive ?? isActive
            ? 'active'
            : ''
        }
        onClick={closeMenu}
      >
        <NavIcon
          className="sidebar-nav-icon"
          size={21}
          strokeWidth={1.9}
          aria-hidden="true"
        />

        <span>
          {item.label}
        </span>

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
  }

  /* =======================================================
     DISPLAY NAME
  ======================================================= */

  const displayName =
    user?.username ||
    user?.name ||
    user?.email ||
    'InsureX user'

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
          onClick={closeMenu}
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

        {/* ===============================================
            BRAND
        =============================================== */}

        <NavLink
          to={dashboardPath}
          className="brand"
          onClick={closeMenu}
        >
          <Logo size={40} />

          <span>
            InsureX

            <small>
              {isAdmin
                ? 'Admin console'
                : 'Customer portal'}
            </small>
          </span>
        </NavLink>

        {/* ===============================================
            NAVIGATION
        =============================================== */}

        <nav
          className="nav"
          aria-label="Main navigation"
        >
          {nav.map((group) => (
            <div key={group.group}>

              <div className="nav-group">
                {group.group}
              </div>

              {group.items.map(
                renderNavItem,
              )}

            </div>
          ))}
        </nav>

        {/* ===============================================
            ACCOUNT FOOTER
        =============================================== */}

        <div className="sidebar-foot">

          <div
            className="avatar"
            aria-hidden="true"
          >
            {initials(displayName)}
          </div>

          <div className="who">

            <b title={displayName}>
              {displayName}
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
            <LogOut
              size={20}
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <div className="main">

        {/* ===============================================
            MOBILE TOPBAR
        =============================================== */}

        <header className="topbar">

          <button
            ref={menuButtonRef}
            className="btn ghost icon-btn"
            onClick={toggleMenu}
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
              name={
                open
                  ? 'x'
                  : 'menu'
              }
            />
          </button>

          <NavLink
            to={dashboardPath}
            className="brand"
            onClick={closeMenu}
          >
            <Logo size={34} />

            <span>
              InsureX
            </span>
          </NavLink>

        </header>

        {/* ===============================================
            PAGE CONTENT
        =============================================== */}

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
