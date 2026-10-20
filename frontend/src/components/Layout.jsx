
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
   INSUREX — CUSTOMER NAVIGATION
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
   INSUREX — ADMIN NAVIGATION
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

  const renderNavItem = (item) => {
    const NavIcon = item.icon

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end ?? false}
        className={({ isActive }) =>
          isActive ? 'active' : ''
        }
        onClick={() => setOpen(false)}
      >
        <NavIcon
          className="sidebar-nav-icon"
          size={21}
          strokeWidth={1.9}
          aria-hidden="true"
        />

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
  }

  /* =======================================================
     RENDER
  ======================================================= */

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
            <LogOut
              size={20}
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </button>

        </div>

      </aside>

      {/* MAIN CONTENT */}

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
            <Logo size={34} />

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
