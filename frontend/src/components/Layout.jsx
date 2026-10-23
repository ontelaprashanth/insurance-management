
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
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import { notifications } from '../api/endpoints'
import { Icon, Logo } from './ui'
import { initials } from '../lib/format'

/* =========================================================
   INSUREX — REFINED APPLICATION LAYOUT
   Consistent alignment • Responsive • Emerald theme
   Existing navigation and authentication preserved
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
    new URLSearchParams(search).get('status') === 'claimed'
  )
}

function isPoliciesRoute(pathname, search) {
  return (
    pathname === '/app/policies' &&
    !isClaimedRoute(pathname, search)
  )
}

export default function Layout({ role }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const { pathname, search } = location

  const [open, setOpen] = useState(false)

  const menuButtonRef = useRef(null)
  const sidebarRef = useRef(null)

  const isAdmin = role === 'ADMIN'
  const nav = isAdmin ? ADMIN_NAV : USER_NAV
  const dashboardPath = isAdmin ? '/admin' : '/app'

  /* Close the mobile menu after navigation. */

  useEffect(() => {
    setOpen(false)
  }, [pathname, search])

  /* Prevent background scrolling while mobile menu is open. */

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  /* Keyboard support. */

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  /* Customer notification badge. */

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

  /* Preserve existing logout flow. */

  const handleLogout = useCallback(() => {
    setOpen(false)

    logout()

    navigate('/login', {
      replace: true,
    })
  }, [logout, navigate])

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  const toggleMenu = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const displayName =
    user?.username ||
    user?.name ||
    user?.email ||
    'InsureX user'

  /* Navigation link with a consistent icon column. */

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
        onClick={closeMenu}
        className={({ isActive }) =>
          `ix-nav-link ${
            (customActive ?? isActive) ? 'active' : ''
          }`
        }
      >
        <span className="ix-nav-icon-box">
          <NavIcon
            size={19}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </span>

        <span className="ix-nav-text">
          {item.label}
        </span>

        {item.badge && unreadCount > 0 && (
          <span
            className="ix-count"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        <ChevronRight
          className="ix-chevron"
          size={15}
          aria-hidden="true"
        />
      </NavLink>
    )
  }

  return (
    <div className={`ix-shell ${open ? 'ix-menu-open' : ''}`}>
      <style>{`
        .ix-shell {
          --ix-green: #047857;
          --ix-green-dark: #065f46;
          --ix-green-light: #10b981;
          --ix-sidebar: #073f30;
          --ix-text: #172b23;
          --ix-muted: #809087;
          --ix-border: #e5eee8;
          --ix-sidebar-width: 260px;

          display: flex;
          min-height: 100vh;
          min-height: 100dvh;
          color: var(--ix-text);
          background: #f6f9f7;
          isolation: isolate;
        }

        .ix-shell,
        .ix-shell * {
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
          padding: 22px 14px 13px;
          overflow: hidden;
          color: #e8f5ed;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(16,185,129,.13),
              transparent 38%
            ),
            linear-gradient(165deg, #073f30, #064e3b 55%, #063b2e);
          border-right: 1px solid rgba(255,255,255,.06);
          box-shadow: 5px 0 24px rgba(6,50,36,.05);
          animation: ix-sidebar-in .45s ease-out both;
          transition: transform .28s ease;
        }

        /* BRAND ALIGNMENT */

        .ix-shell .brand {
          position: relative;
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 11px;
          min-height: 49px;
          padding: 0 8px;
          color: #fff;
          text-decoration: none;
        }

        .ix-shell .brand > span {
          display: flex;
          flex-direction: column;
          min-width: 0;
          color: #fff;
          font-size: 1.13rem;
          font-weight: 850;
          line-height: 1.2;
          letter-spacing: -.035em;
        }

        .ix-shell .brand small {
          margin-top: 5px;
          color: #a9cabb;
          font-size: .69rem;
          font-weight: 550;
          letter-spacing: .025em;
        }

        .ix-shell .brand:focus-visible {
          border-radius: 10px;
          outline: 2px solid #6ee7b7;
          outline-offset: 3px;
        }

        /* NAVIGATION */

        .ix-shell .nav {
          flex: 1 1 auto;
          min-height: 0;
          margin-top: 22px;
          padding: 0 0 12px;
          overflow-x: hidden;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(167,243,208,.2) transparent;
        }

        .ix-shell .nav > div {
          margin: 0 0 20px;
        }

        .ix-shell .nav-group {
          display: flex;
          align-items: center;
          min-height: 20px;
          margin: 0 10px 8px;
          color: #91b9a4;
          font-size: .65rem;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .ix-shell .ix-nav-link {
          position: relative;
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) auto 15px;
          align-items: center;
          column-gap: 9px;
          width: 100%;
          min-height: 44px;
          margin: 3px 0;
          padding: 6px 9px;
          overflow: hidden;
          border: 1px solid transparent;
          border-radius: 10px;
          color: #c4ddd0;
          text-decoration: none;
          font-size: .835rem;
          font-weight: 570;
          line-height: 1.35;
          transition:
            color .18s ease,
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
          animation: ix-nav-in .32s ease-out both;
        }

        .ix-shell .ix-nav-link::before {
          position: absolute;
          top: 9px;
          bottom: 9px;
          left: 0;
          width: 3px;
          content: "";
          border-radius: 0 4px 4px 0;
          background: #6ee7b7;
          opacity: 0;
          transform: scaleY(.6);
          transition: opacity .18s ease, transform .18s ease;
        }

        .ix-shell .ix-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,.065);
          border-color: rgba(255,255,255,.045);
        }

        .ix-shell .ix-nav-link.active {
          color: #fff;
          background: linear-gradient(
            105deg,
            rgba(16,185,129,.23),
            rgba(16,185,129,.09)
          );
          border-color: rgba(110,231,183,.15);
          font-weight: 720;
        }

        .ix-shell .ix-nav-link.active::before {
          opacity: 1;
          transform: scaleY(1);
        }

        .ix-shell .ix-nav-link:focus-visible {
          outline: 2px solid #6ee7b7;
          outline-offset: 2px;
        }

        .ix-shell .ix-nav-icon-box {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          color: #a7cdb8;
          border-radius: 8px;
          transition:
            color .18s ease,
            background .18s ease;
        }

        .ix-shell .ix-nav-link:hover .ix-nav-icon-box {
          color: #d1fae5;
        }

        .ix-shell .ix-nav-link.active .ix-nav-icon-box {
          color: #a7f3d0;
          background: rgba(16,185,129,.14);
        }

        .ix-shell .ix-nav-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ix-shell .ix-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 21px;
          height: 21px;
          padding: 0 5px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 7px;
          color: #fff;
          background: #059669;
          font-size: .65rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .ix-shell .ix-chevron {
          color: #86ad98;
          opacity: 0;
          transform: translateX(-3px);
          transition: opacity .18s ease, transform .18s ease;
        }

        .ix-shell .ix-nav-link:hover .ix-chevron,
        .ix-shell .ix-nav-link.active .ix-chevron {
          opacity: .9;
          transform: translateX(0);
        }

        /* ACCOUNT FOOTER */

        .ix-shell .sidebar-foot {
          display: grid;
          grid-template-columns: 39px minmax(0, 1fr) 37px;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
          min-height: 64px;
          margin-top: auto;
          padding: 12px 5px 2px;
          border-top: 1px solid rgba(209,250,229,.13);
        }

        .ix-shell .avatar {
          display: grid;
          width: 39px;
          height: 39px;
          place-items: center;
          border: 1px solid rgba(167,243,208,.35);
          border-radius: 12px;
          color: #d1fae5;
          background: linear-gradient(
            145deg,
            rgba(16,185,129,.34),
            rgba(6,95,70,.8)
          );
          font-size: .76rem;
          font-weight: 850;
        }

        .ix-shell .who {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 4px;
        }

        .ix-shell .who b {
          overflow: hidden;
          color: #f0fdf4;
          font-size: .77rem;
          font-weight: 750;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ix-shell .who span {
          color: #9fc5b1;
          font-size: .68rem;
          line-height: 1.3;
        }

        .ix-shell .btn.icon-btn {
          display: inline-grid;
          align-items: center;
          justify-items: center;
          width: 37px;
          height: 37px;
          min-width: 37px;
          padding: 0;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 10px;
          color: #b9d8c7;
          background: rgba(255,255,255,.045);
          cursor: pointer;
          transition:
            color .18s ease,
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .ix-shell .sidebar-foot .btn.icon-btn:hover {
          color: #fff;
          background: rgba(239,68,68,.15);
          border-color: rgba(252,165,165,.25);
        }

        .ix-shell .btn.icon-btn:focus-visible {
          outline: 2px solid #6ee7b7;
          outline-offset: 3px;
        }

        /* MAIN CONTENT ALIGNMENT */

        .ix-shell .main {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 100vh;
          min-height: 100dvh;
          margin-left: var(--ix-sidebar-width);
        }

        .ix-shell .content {
          width: 100%;
          max-width: 1800px;
          min-width: 0;
          min-height: 100vh;
          min-height: 100dvh;
          margin: 0 auto;
          padding: clamp(20px, 2.4vw, 34px);
          animation: ix-content-in .35s ease-out both;
        }

        /* MOBILE HEADER */

        .ix-shell .topbar {
          position: sticky;
          z-index: 50;
          top: 0;
          display: none;
          align-items: center;
          gap: 12px;
          min-height: 64px;
          padding: 10px 18px;
          border-bottom: 1px solid #e5eee8;
          background: rgba(255,255,255,.94);
          box-shadow: 0 3px 16px rgba(15,45,30,.035);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .ix-shell .topbar .brand {
          gap: 9px;
          min-height: 40px;
          padding: 0;
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
        }

        /* MOBILE OVERLAY */

        .ix-shell .scrim {
          position: fixed;
          z-index: 70;
          inset: 0;
          background: rgba(5,30,21,.52);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          animation: ix-scrim-in .2s ease-out both;
        }

        /* ANIMATIONS */

        @keyframes ix-sidebar-in {
          from {
            opacity: .7;
            transform: translateX(-7px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes ix-nav-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-content-in {
          from {
            opacity: .7;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ix-scrim-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* TABLET */

        @media (max-width: 1000px) and (min-width: 901px) {
          .ix-shell {
            --ix-sidebar-width: 238px;
          }

          .ix-shell .sidebar {
            padding-right: 11px;
            padding-left: 11px;
          }

          .ix-shell .content {
            padding: 22px;
          }
        }

        /* MOBILE */

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
            min-height: calc(100dvh - 64px);
            padding: clamp(16px, 3vw, 25px);
          }
        }

        @media (max-width: 480px) {
          .ix-shell .topbar {
            min-height: 58px;
            padding: 9px 12px;
          }

          .ix-shell .content {
            min-height: calc(100dvh - 58px);
            padding: 15px 12px 24px;
          }

          .ix-shell .sidebar {
            padding: 18px 12px 12px;
          }

          .ix-shell .ix-nav-link {
            min-height: 44px;
          }
        }

        /* ACCESSIBILITY */

        @media (prefers-reduced-motion: reduce) {
          .ix-shell *,
          .ix-shell *::before,
          .ix-shell *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
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
        aria-label={isAdmin ? 'Admin navigation' : 'Customer navigation'}
      >
        <NavLink
          to={dashboardPath}
          className="brand"
          onClick={closeMenu}
        >
          <Logo size={40} />

          <span>
            InsureX
            <small>
              {isAdmin ? 'Admin console' : 'Customer portal'}
            </small>
          </span>
        </NavLink>

        <nav className="nav" aria-label="Main navigation">
          {nav.map((group) => (
            <div key={group.group}>
              <div className="nav-group">
                {group.group}
              </div>

              {group.items.map(renderNavItem)}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="avatar" aria-hidden="true">
            {initials(displayName)}
          </div>

          <div className="who">
            <b title={displayName}>{displayName}</b>
            <span>{isAdmin ? 'Administrator' : 'Customer'}</span>
          </div>

          <button
            className="btn icon-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            type="button"
          >
            <LogOut size={19} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <div className="main">
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

        <main className="content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
