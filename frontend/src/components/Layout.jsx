
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
  ChevronRight,
  CircleHelp,
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import { notifications } from '../api/endpoints'
import { Icon, Logo } from './ui'
import { initials } from '../lib/format'

/* =========================================================
   INSUREX — PREMIUM APPLICATION LAYOUT

   Emerald visual identity
   Responsive customer/admin navigation
   Animated sidebar and navigation
   Accessible mobile menu
   Unread notifications
   Existing authentication and logout
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
   MAIN LAYOUT
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
     CLOSE MOBILE MENU ON NAVIGATION
  ======================================================= */

  useEffect(() => {
    setOpen(false)
  }, [pathname, search])

  /* =======================================================
     MOBILE SCROLL LOCK
  ======================================================= */

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  /* =======================================================
     KEYBOARD ACCESSIBILITY
  ======================================================= */

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }

      if (event.key === 'Tab' && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll(
          'a[href], button:not([disabled])'
        )

        if (!focusable.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault()
          last.focus()
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  /* =======================================================
     CUSTOMER UNREAD NOTIFICATIONS

     Admin does not call the customer notification endpoint.
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

  const unreadCount = getUnreadCount(unread.data)

  /* =======================================================
     LOGOUT

     Uses the existing AuthContext logout implementation.
  ======================================================= */

  const handleLogout = useCallback(() => {
    setOpen(false)

    logout()

    navigate('/login', {
      replace: true,
    })
  }, [logout, navigate])

  /* =======================================================
     MOBILE MENU CONTROLS
  ======================================================= */

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  const toggleMenu = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  /* =======================================================
     DISPLAY NAME
  ======================================================= */

  const displayName =
    user?.username ||
    user?.name ||
    user?.email ||
    'InsureX user'

  const displayInitials = initials(displayName)

  /* =======================================================
     NAVIGATION ITEM
  ======================================================= */

  const renderNavItem = (item) => {
    const NavIcon = item.icon

    let customActive

    if (item.to === '/app/policies?status=claimed') {
      customActive = isClaimedRoute(pathname, search)
    } else if (item.to === '/app/policies') {
      customActive = isPoliciesRoute(pathname, search)
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end ?? false}
        className={({ isActive }) => {
          const active = customActive ?? isActive

          return `ix-nav-link${active ? ' active' : ''}`
        }}
        onClick={closeMenu}
      >
        <span className="ix-nav-icon-wrap">
          <NavIcon
            className="ix-nav-icon"
            size={19}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </span>

        <span className="ix-nav-label">
          {item.label}
        </span>

        {item.badge && unreadCount > 0 && (
          <span
            className="ix-notification-count"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        <ChevronRight
          className="ix-nav-chevron"
          size={15}
          aria-hidden="true"
        />
      </NavLink>
    )
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={`ix-shell${open ? ' ix-menu-open' : ''}`}
    >
      <style>{`
        .ix-shell {
          --ix-green: #047857;
          --ix-green-dark: #065f46;
          --ix-green-deep: #064e3b;
          --ix-green-bright: #10b981;
          --ix-green-soft: #ecfdf5;
          --ix-green-pale: #f5fbf7;
          --ix-text: #172b23;
          --ix-muted: #819087;
          --ix-border: #e6eee8;
          --ix-sidebar-width: 258px;

          min-height: 100vh;
          min-height: 100dvh;
          color: var(--ix-text);
          background: #f6f9f7;
          isolation: isolate;
        }

        .ix-shell *,
        .ix-shell *::before,
        .ix-shell *::after {
          box-sizing: border-box;
        }

        /* SIDEBAR */

        .ix-shell .sidebar {
          position: fixed;
          z-index: 80;
          inset: 0 auto 0 0;
          display: flex;
          flex-direction: column;
          width: var(--ix-sidebar-width);
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          padding: 22px 15px 14px;
          color: #e8f5ed;
          background:
            radial-gradient(
              ellipse at 0% 0%,
              rgba(16,185,129,.16),
              transparent 42%
            ),
            linear-gradient(
              175deg,
              #073f30 0%,
              #064e3b 46%,
              #063b2e 100%
            );
          border-right: 1px solid rgba(255,255,255,.07);
          box-shadow: 8px 0 35px rgba(5,46,34,.06);
          animation: ixSidebarAppear .55s cubic-bezier(.2,.7,.25,1) both;
          transition: transform .3s cubic-bezier(.2,.7,.25,1);
        }

        .ix-shell .sidebar::before {
          position: absolute;
          top: -90px;
          right: -110px;
          width: 240px;
          height: 240px;
          content: "";
          border: 1px solid rgba(167,243,208,.09);
          border-radius: 50%;
          box-shadow:
            0 0 0 25px rgba(167,243,208,.025),
            0 0 0 55px rgba(167,243,208,.02);
          pointer-events: none;
        }

        .ix-shell .sidebar::after {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 110px;
          content: "";
          background: linear-gradient(
            0deg,
            rgba(3,35,26,.18),
            transparent
          );
          pointer-events: none;
        }

        /* BRAND */

        .ix-shell .brand {
          position: relative;
          z-index: 1;
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 11px;
          min-width: 0;
          padding: 2px 8px 23px;
          color: inherit;
          text-decoration: none;
        }

        .ix-shell .brand > span {
          display: flex;
          flex-direction: column;
          min-width: 0;
          color: #fff;
          font-size: 1.15rem;
          font-weight: 850;
          letter-spacing: -.04em;
          line-height: 1.2;
        }

        .ix-shell .brand small {
          display: block;
          margin-top: 5px;
          color: #a9cabb;
          font-size: .7rem;
          font-weight: 550;
          letter-spacing: .025em;
        }

        .ix-shell .brand:focus-visible {
          border-radius: 10px;
          outline: 2px solid #6ee7b7;
          outline-offset: 3px;
        }

        /* NAVIGATION SCROLL AREA */

        .ix-shell .nav {
          position: relative;
          z-index: 1;
          flex: 1;
          min-height: 0;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 5px 0 16px;
          scrollbar-color: rgba(167,243,208,.24) transparent;
          scrollbar-width: thin;
        }

        .ix-shell .nav > div {
          margin-bottom: 19px;
        }

        .ix-shell .nav-group {
          margin: 0 10px 9px;
          color: #8fb8a4;
          font-size: .65rem;
          font-weight: 800;
          letter-spacing: .14em;
          line-height: 1.5;
          text-transform: uppercase;
        }

        /* NAVIGATION LINKS */

        .ix-shell .ix-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 43px;
          margin: 3px 0;
          padding: 9px 10px;
          overflow: hidden;
          border: 1px solid transparent;
          border-radius: 11px;
          color: #c4ddd0;
          text-decoration: none;
          font-size: .84rem;
          font-weight: 570;
          line-height: 1.35;
          transition:
            color .2s ease,
            background .2s ease,
            border-color .2s ease,
            transform .2s ease,
            box-shadow .2s ease;
          animation: ixNavEnter .38s ease-out both;
        }

        .ix-shell .nav > div:nth-child(1) .ix-nav-link:nth-of-type(1) {
          animation-delay: .04s;
        }

        .ix-shell .ix-nav-link::before {
          position: absolute;
          top: 10px;
          bottom: 10px;
          left: 0;
          width: 3px;
          content: "";
          border-radius: 0 4px 4px 0;
          background: #6ee7b7;
          opacity: 0;
          transform: scaleY(.5);
          transition: opacity .2s ease, transform .2s ease;
        }

        .ix-shell .ix-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,.075);
          border-color: rgba(255,255,255,.055);
          transform: translateX(2px);
        }

        .ix-shell .ix-nav-link.active {
          color: #fff;
          font-weight: 730;
          background: linear-gradient(
            105deg,
            rgba(16,185,129,.24),
            rgba(16,185,129,.10)
          );
          border-color: rgba(110,231,183,.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
        }

        .ix-shell .ix-nav-link.active::before {
          opacity: 1;
          transform: scaleY(1);
        }

        .ix-shell .ix-nav-link:focus-visible {
          outline: 2px solid #6ee7b7;
          outline-offset: 2px;
        }

        .ix-shell .ix-nav-icon-wrap {
          display: grid;
          flex: 0 0 29px;
          width: 29px;
          height: 29px;
          place-items: center;
          border-radius: 8px;
          color: #a7cdb8;
          transition:
            color .2s ease,
            background .2s ease,
            transform .2s ease;
        }

        .ix-shell .ix-nav-link:hover .ix-nav-icon-wrap {
          color: #d1fae5;
          transform: scale(1.05);
        }

        .ix-shell .ix-nav-link.active .ix-nav-icon-wrap {
          color: #a7f3d0;
          background: rgba(16,185,129,.15);
        }

        .ix-shell .ix-nav-label {
          flex: 1;
          min-width: 0;
        }

        .ix-shell .ix-nav-chevron {
          flex-shrink: 0;
          color: #86ad98;
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity .2s ease, transform .2s ease;
        }

        .ix-shell .ix-nav-link:hover .ix-nav-chevron,
        .ix-shell .ix-nav-link.active .ix-nav-chevron {
          opacity: .9;
          transform: translateX(0);
        }

        .ix-shell .ix-notification-count {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          min-width: 21px;
          height: 21px;
          padding: 0 6px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 7px;
          color: #fff;
          background: #059669;
          font-size: .66rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 2px 9px rgba(0,0,0,.12);
          animation: ixBadgePop .35s cubic-bezier(.2,.8,.2,1.3) both;
        }

        /* ACCOUNT FOOTER */

        .ix-shell .sidebar-foot {
          position: relative;
          z-index: 2;
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 10px;
          margin-top: 5px;
          padding: 13px 6px 4px;
          border-top: 1px solid rgba(209,250,229,.13);
        }

        .ix-shell .avatar {
          display: grid;
          flex: 0 0 38px;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(167,243,208,.4);
          border-radius: 12px;
          color: #d1fae5;
          background: linear-gradient(
            145deg,
            rgba(16,185,129,.35),
            rgba(6,95,70,.75)
          );
          font-size: .76rem;
          font-weight: 850;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.1);
        }

        .ix-shell .who {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-width: 0;
          gap: 4px;
        }

        .ix-shell .who b {
          overflow: hidden;
          color: #f0fdf4;
          font-size: .78rem;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ix-shell .who span {
          color: #9fc5b1;
          font-size: .69rem;
          font-weight: 550;
        }

        /* BUTTONS */

        .ix-shell .btn.icon-btn {
          display: inline-grid;
          flex: 0 0 37px;
          width: 37px;
          height: 37px;
          min-width: 37px;
          place-items: center;
          padding: 0;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 10px;
          color: #b9d8c7;
          background: rgba(255,255,255,.045);
          cursor: pointer;
          transition:
            color .2s ease,
            background .2s ease,
            border-color .2s ease,
            transform .2s ease;
        }

        .ix-shell .sidebar-foot .btn.icon-btn:hover {
          color: #fff;
          background: rgba(239,68,68,.16);
          border-color: rgba(252,165,165,.28);
          transform: translateY(-1px);
        }

        .ix-shell .btn.icon-btn:focus-visible {
          outline: 2px solid #6ee7b7;
          outline-offset: 3px;
        }

        /* MAIN CONTENT */

        .ix-shell .main {
          min-width: 0;
          min-height: 100vh;
          min-height: 100dvh;
          margin-left: var(--ix-sidebar-width);
          background:
            radial-gradient(
              ellipse at 100% 0%,
              rgba(16,185,129,.035),
              transparent 35%
            ),
            #f6f9f7;
        }

        .ix-shell .content {
          width: 100%;
          min-width: 0;
          min-height: 100vh;
          min-height: 100dvh;
          padding: clamp(20px, 3vw, 34px);
          animation: ixContentEnter .45s ease-out both;
        }

        /* MOBILE TOP BAR */

        .ix-shell .topbar {
          position: sticky;
          z-index: 50;
          top: 0;
          display: none;
          align-items: center;
          gap: 12px;
          min-height: 65px;
          padding: 10px 17px;
          border-bottom: 1px solid rgba(220,232,224,.9);
          background: rgba(255,255,255,.92);
          box-shadow: 0 4px 20px rgba(15,45,30,.035);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .ix-shell .topbar .brand {
          gap: 9px;
          padding: 0;
          color: var(--ix-text);
        }

        .ix-shell .topbar .brand > span {
          color: var(--ix-green-dark);
          font-size: 1.05rem;
        }

        .ix-shell .topbar .btn.icon-btn {
          color: #17684d;
          background: #f0faf4;
          border-color: #d7eee0;
        }

        .ix-shell .topbar .btn.icon-btn:hover {
          background: #dcfce7;
          transform: translateY(-1px);
        }

        /* BACKDROP */

        .ix-shell .scrim {
          position: fixed;
          z-index: 70;
          inset: 0;
          background: rgba(5,30,21,.53);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          animation: ixScrimIn .22s ease-out both;
        }

        /* ANIMATIONS */

        @keyframes ixSidebarAppear {
          from {
            opacity: .65;
            transform: translateX(-9px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes ixNavEnter {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ixContentEnter {
          from {
            opacity: .65;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ixBadgePop {
          from {
            opacity: 0;
            transform: scale(.75);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes ixScrimIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* TABLET AND MOBILE */

        @media (max-width: 900px) {
          .ix-shell .sidebar {
            width: min(290px, 86vw);
            transform: translateX(-105%);
            box-shadow: 12px 0 40px rgba(0,0,0,.18);
          }

          .ix-shell .sidebar.open {
            transform: translateX(0);
          }

          .ix-shell .main {
            margin-left: 0;
          }

          .ix-shell .topbar {
            display: flex;
          }

          .ix-shell .content {
            min-height: calc(100dvh - 65px);
            padding: clamp(16px, 3vw, 26px);
          }

          .ix-shell .sidebar .brand {
            padding-bottom: 24px;
          }
        }

        @media (max-width: 480px) {
          .ix-shell .topbar {
            min-height: 59px;
            padding: 9px 12px;
          }

          .ix-shell .content {
            min-height: calc(100dvh - 59px);
            padding: 15px 12px 24px;
          }

          .ix-shell .sidebar {
            padding: 18px 13px 12px;
          }

          .ix-shell .ix-nav-link {
            min-height: 44px;
          }
        }

        /* REDUCED MOTION ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .ix-shell *,
          .ix-shell *::before,
          .ix-shell *::after {
            animation: none !important;
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* MOBILE BACKDROP */}

      {open && (
        <div
          className="scrim"
          onClick={closeMenu}
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
        aria-hidden={undefined}
      >
        {/* BRAND */}

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
          <div className="avatar" aria-hidden="true">
            {displayInitials}
          </div>

          <div className="who">
            <b title={displayName}>
              {displayName}
            </b>

            <span>
              {isAdmin ? 'Administrator' : 'Customer'}
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
              size={19}
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
            onClick={toggleMenu}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="insurex-sidebar"
            type="button"
          >
            <Icon name={open ? 'x' : 'menu'} />
          </button>

          <NavLink
            to={dashboardPath}
            className="brand"
            onClick={closeMenu}
          >
            <Logo size={34} />
            <span>InsureX</span>
          </NavLink>
        </header>

        {/* PAGE CONTENT */}

        <main className="content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
