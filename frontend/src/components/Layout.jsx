
import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../auth/AuthContext'
import { notifications } from '../api/endpoints'
import { Icon, Logo } from './ui'
import { initials } from '../lib/format'

const USER_NAV = [
  {
    group: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: 'home', end: true },
      { to: '/app/plans', label: 'Buy insurance', icon: 'shield' },
    ],
  },
  {
    group: 'My cover',
    items: [
      { to: '/app/policies', label: 'My policies', icon: 'badge' },
      { to: '/app/purchases', label: 'Payments', icon: 'receipt' },
      { to: '/app/claims', label: 'My claims', icon: 'claim' },
      { to: '/app/reviews', label: 'Reviews', icon: 'star' },
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
      { to: '/app/profile', label: 'Profile', icon: 'user' },
    ],
  },
]

const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'chart', end: true },
    ],
  },
  {
    group: 'Customers',
    items: [
      { to: '/admin/users', label: 'Users', icon: 'users' },
      { to: '/admin/policy-holders', label: 'Policy holders', icon: 'user' },
    ],
  },
  {
    group: 'Insurance',
    items: [
      { to: '/admin/policies', label: 'Policies', icon: 'shield' },
      { to: '/admin/purchases', label: 'Purchases', icon: 'receipt' },
    ],
  },
  {
    group: 'Claims',
    items: [
      { to: '/admin/claims', label: 'Claims', icon: 'claim' },
      { to: '/admin/settlements', label: 'Settlements', icon: 'cash' },
      { to: '/admin/reviews', label: 'Reviews', icon: 'star' },
    ],
  },
  {
    group: 'Communicate',
    items: [
      { to: '/admin/broadcast', label: 'Broadcast', icon: 'megaphone' },
    ],
  },
]

export default function Layout({ role }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const { pathname } = useLocation()
  const navigate = useNavigate()

  const nav = role === 'ADMIN' ? ADMIN_NAV : USER_NAV

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notifications.unread,
    enabled: role === 'USER',
    refetchInterval: 60_000,
  })

  const unreadCount = unread.data?.count || 0

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className="shell">
      {open && (
        <div
          className="scrim"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${open ? 'open' : ''}`}
        aria-label="Main navigation"
      >
        <NavLink
          to={role === 'ADMIN' ? '/admin' : '/app'}
          className="brand"
        >
          <Logo />
          <span>
            InsureX
            <small>
              {role === 'ADMIN' ? 'Admin console' : 'Customer portal'}
            </small>
          </span>
        </NavLink>

        <nav className="nav">
          {nav.map((group) => (
            <div key={group.group}>
              <div className="nav-group">{group.group}</div>

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
                  {item.label}

                  {item.badge && unreadCount > 0 && (
                    <span className="count">{unreadCount}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="avatar">
            {initials(user?.username)}
          </div>

          <div className="who">
            <b>{user?.username || 'InsureX user'}</b>
            <span>
              {role === 'ADMIN' ? 'Administrator' : 'Customer'}
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

      <div className="main">
        <header className="topbar">
          <button
            className="btn ghost icon-btn"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            type="button"
          >
            <Icon name="menu" />
          </button>

          <span className="brand">
            <Logo size={26} />
            InsureX
          </span>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
