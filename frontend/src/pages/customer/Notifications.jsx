import { useMemo, useState } from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { notifications } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  DataState,
  Icon,
  PageHeader,
  Panel,
  Segmented,
  useToast,
} from '../../components/ui'

import {
  timeAgo,
  dateTime,
} from '../../lib/format'

/* =========================================================
   INSUREX — CUSTOMER NOTIFICATIONS

   System Notifications
   Admin Broadcasts
   Unread Notification Tracking
   Mark Individual as Read
   Mark All as Read
   Delete Notifications
   Sidebar Badge Synchronization
   Responsive Mobile Layout

   BACKEND:
   GET    /api/notifications/my
   GET    /api/notifications/unread-count
   PUT    /api/notifications/read/{id}
   PUT    /api/notifications/read-all
   DELETE /api/notifications/{id}
========================================================= */

/* =========================================================
   NOTIFICATION ICONS
========================================================= */

const ICONS = {
  CLAIM: 'claim',
  SETTLEMENT: 'cash',
  PAYMENT: 'receipt',
  POLICY: 'shield',
  OFFER: 'megaphone',
  ANNOUNCEMENT: 'megaphone',
  BROADCAST: 'megaphone',
  ADMIN: 'megaphone',
  ALERT: 'bell',
  SYSTEM: 'bell',
  REFUND: 'receipt',
  RENEWAL: 'shield',
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeNotifications(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.content)) {
    return data.content
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications
  }

  return []
}

function notificationIcon(notification) {
  const type = String(
    notification?.type || '',
  ).toUpperCase()

  const source = String(
    notification?.source || '',
  ).toUpperCase()

  if (ICONS[type]) {
    return ICONS[type]
  }

  if (source === 'ADMIN') {
    return 'megaphone'
  }

  return 'bell'
}

function isUnread(notification) {
  return !(
    notification?.isRead === true ||
    notification?.isRead === 1 ||
    notification?.isRead === 'true'
  )
}

/* =========================================================
   NOTIFICATIONS PAGE
========================================================= */

export default function Notifications() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [filter, setFilter] = useState('all')
  const [pageError, setPageError] = useState('')
  const [exitingId, setExitingId] = useState(null)

  /* =======================================================
     FETCH NOTIFICATIONS
  ======================================================= */

  const q = useQuery({
    queryKey: ['notifications'],

    queryFn: notifications.mine,

    staleTime: 0,

    refetchOnMount: 'always',

    refetchOnWindowFocus: true,

    refetchOnReconnect: true,

    refetchInterval: 60_000,

    refetchIntervalInBackground: false,
  })

  /* =======================================================
     NORMALIZE DATA
  ======================================================= */

  const rows = useMemo(
    () => normalizeNotifications(q.data),
    [q.data],
  )

  /* =======================================================
     UNREAD COUNT
  ======================================================= */

  const unread = useMemo(
    () => rows.filter(isUnread).length,
    [rows],
  )

  /* =======================================================
     FILTERED NOTIFICATIONS
  ======================================================= */

  const shown = useMemo(() => {
    const filtered =
      filter === 'unread'
        ? rows.filter(isUnread)
        : rows

    return [...filtered].sort((a, b) => {
      const first = new Date(
        a.createdAt || 0,
      ).getTime()

      const second = new Date(
        b.createdAt || 0,
      ).getTime()

      return (
        (Number.isFinite(second) ? second : 0) -
        (Number.isFinite(first) ? first : 0)
      )
    })
  }, [rows, filter])

  /* =======================================================
     SYNCHRONIZE NOTIFICATIONS

     Both the notification list and the sidebar's
     unread count share the "notifications" prefix.
  ======================================================= */

  async function refreshNotifications() {
    await queryClient.invalidateQueries({
      queryKey: ['notifications'],
    })
  }

  /* =======================================================
     MARK ONE NOTIFICATION AS READ
  ======================================================= */

  const read = useMutation({
    mutationFn: (notificationId) =>
      notifications.read(notificationId),

    onSuccess: async () => {
      setPageError('')
      await refreshNotifications()
    },

    onError: (error) => {
      const message = errorMessage(
        error,
        'Unable to mark notification as read.',
      )

      setPageError(message)
      toast.error(message)
    },
  })

  /* =======================================================
     MARK ALL NOTIFICATIONS AS READ
  ======================================================= */

  const readAll = useMutation({
    mutationFn: () =>
      notifications.readAll(),

    onSuccess: async () => {
      setPageError('')
      await refreshNotifications()

      toast.success(
        'All notifications marked as read.',
      )
    },

    onError: (error) => {
      const message = errorMessage(
        error,
        'Unable to mark all notifications as read.',
      )

      setPageError(message)
      toast.error(message)
    },
  })

  /* =======================================================
     DELETE NOTIFICATION
  ======================================================= */

  const del = useMutation({
    mutationFn: (notificationId) =>
      notifications.remove(notificationId),

    onSuccess: async (_result, notificationId) => {
      setPageError('')
      // Animate only after the server confirms deletion.
      setExitingId(notificationId)
      await new Promise((resolve) => setTimeout(resolve, 380))
      try {
        await refreshNotifications()
      } finally {
        setExitingId(null)
      }
      toast.success('Notification deleted.')
    },

    onError: (error) => {
      const message = errorMessage(
        error,
        'Unable to delete notification.',
      )

      setExitingId(null)
      setPageError(message)
      toast.error(message)
    },
  })

  /* =======================================================
     PREVENT CONFLICTING ACTIONS
  ======================================================= */

  const busy =
    read.isPending ||
    readAll.isPending ||
    del.isPending

  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  async function handleRefresh() {
    setPageError('')

    try {
      const result = await q.refetch()

      if (result.error) {
        throw result.error
      }

      await queryClient.invalidateQueries({
        queryKey: [
          'notifications',
          'unread',
        ],
      })
    } catch (error) {
      setPageError(
        errorMessage(
          error,
          'Unable to refresh notifications.',
        ),
      )
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="ix-notifications-page">
      <style>{`
        @keyframes ixNotifyRise { from { opacity:0; transform:translateY(18px) scale(.975); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes ixNotifyFloat { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-4px) rotate(5deg); } }
        @keyframes ixNotifyShimmer { from { transform:translateX(-180%) skewX(-15deg); } to { transform:translateX(420%) skewX(-15deg); } }
        .ix-notifications-page { color:#163d2d; }
        .ix-notification-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin:0 0 18px; }
        .ix-notification-stat { position:relative; overflow:hidden; display:flex; align-items:center; gap:13px; min-width:0; padding:18px; border:1px solid #bee4ce; border-radius:18px; background:linear-gradient(135deg,#fff,#edf9f1); box-shadow:0 7px 20px rgba(14,92,56,.07); animation:ixNotifyRise .55s both; }
        .ix-notification-stat:nth-child(2) { animation-delay:90ms; } .ix-notification-stat:nth-child(3) { animation-delay:180ms; }
        .ix-notification-stat-icon { width:43px; height:43px; border-radius:13px; background:#d6f3e2; color:#137d4a; display:grid; place-items:center; flex-shrink:0; animation:ixNotifyFloat 3.7s ease-in-out infinite; }
        .ix-notification-stat-label { display:block; color:#476b59; font-size:12px; font-weight:650; }
        .ix-notification-stat strong { display:block; font-size:25px; line-height:1.25; color:#103f2b; margin-top:3px; }
        .ix-notifications-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:15px 17px; border-bottom:1px solid #d5e9db; }
        .ix-notification-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; padding:17px; }
        .ix-notification-item { position:relative; isolation:isolate; overflow:hidden; display:flex; align-items:flex-start; flex-wrap:wrap; gap:12px; min-width:0; padding:18px; border:1px solid #d2e9dc; border-radius:18px; background:linear-gradient(145deg,#fff,#f5fcf7); box-shadow:0 5px 18px rgba(17,89,55,.06); animation:ixNotifyRise .55s cubic-bezier(.2,.8,.2,1) both; animation-delay:calc(min(var(--ix-notification-index,0),8)*65ms); transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease; }
        .ix-notification-item.unread { background:linear-gradient(145deg,#f0fcf4,#e7f7ed); border-color:#88cba5; box-shadow:0 7px 20px rgba(18,111,68,.09); }
        .ix-notification-item::before { content:''; position:absolute; inset:0 auto 0 -40%; width:25%; background:linear-gradient(90deg,transparent,rgba(55,181,105,.12),transparent); pointer-events:none; z-index:0; transform:translateX(-180%) skewX(-15deg); }
        .ix-notification-item:hover { transform:translateY(-5px); border-color:#48a875; box-shadow:0 17px 32px rgba(14,98,58,.15); }
        .ix-notification-item:hover::before { animation:ixNotifyShimmer .85s ease-out 1; }
        .ix-notification-item > * { position:relative; z-index:1; }
        .ix-notification-item .dot-icon { width:44px; height:44px; flex:0 0 44px; border-radius:14px; display:grid; place-items:center; background:#d7f4e4; color:#127b49; animation:ixNotifyFloat 3.8s ease-in-out infinite; }
        .ix-notification-content { flex:1 1 190px; min-width:0; overflow-wrap:anywhere; }
        .ix-notification-title { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .ix-notification-title b { color:#103e2a; font-size:15px; line-height:1.4; }
        .ix-notification-title .faint,.ix-notification-content > .faint { color:#537565 !important; opacity:1 !important; }
        .ix-notification-message { margin:9px 0; color:#315844 !important; opacity:1 !important; line-height:1.65; white-space:pre-wrap; overflow-wrap:anywhere; font-size:13.5px; }
        .ix-notification-source { display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; font-size:11px; font-weight:750; background:#d8f4e3; color:#126a42; }
        .ix-notification-unread { width:8px; height:8px; flex-shrink:0; border-radius:50%; background:#0a9d58; box-shadow:0 0 0 4px rgba(10,157,88,.13); }
        .ix-notification-actions { width:100%; display:flex; justify-content:flex-end; gap:9px; flex-wrap:wrap; padding-top:12px; border-top:1px solid #d6eadc; }
        .ix-notification-actions button { white-space:nowrap; transition:transform .2s ease,box-shadow .2s ease; }
        .ix-notification-actions button:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 5px 14px rgba(15,108,63,.13); }
        .ix-notification-item:focus-within { outline:2px solid #3b9c69; outline-offset:2px; }
        .ix-notification-empty { padding:36px 18px; text-align:center; color:#315844; }
        .ix-notification-empty h4 { color:#12452e; margin:12px 0 5px; }
        @media(max-width:900px) { .ix-notification-grid { grid-template-columns:1fr; } }
        @media(max-width:600px) { .ix-notification-summary { gap:9px; } .ix-notification-stat { padding:12px; gap:8px; flex-direction:column; align-items:flex-start; } .ix-notification-stat-icon { width:35px; height:35px; } .ix-notification-stat strong { font-size:21px; } .ix-notification-grid { padding:11px; gap:11px; } .ix-notification-item { padding:15px; } .ix-notifications-toolbar { align-items:stretch; padding:12px; } }
        @media(max-width:380px) { .ix-notification-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } .ix-notification-stat:nth-child(3) { grid-column:1/-1; flex-direction:row; align-items:center; } }
        @media(prefers-reduced-motion:reduce) { .ix-notification-item,.ix-notification-stat,.ix-notification-stat-icon,.ix-notification-item .dot-icon,.ix-notification-item::before { animation:none !important; transition:none !important; } .ix-notification-item:hover,.ix-notification-actions button:hover { transform:none !important; } }

        /* Clean notification inbox: flat list instead of cards */
        .ix-notification-summary { display:flex; flex-wrap:wrap; align-items:center; gap:8px 22px; padding:12px 16px; margin:0 0 14px; border-bottom:1px solid #dcebe2; background:transparent; }
        .ix-notification-stat, .ix-notification-stat:nth-child(2), .ix-notification-stat:nth-child(3) { display:flex; flex-direction:row; align-items:center; gap:9px; padding:3px 0; margin:0; border:0; border-radius:0; background:transparent; box-shadow:none; animation:none; min-width:0; }
        .ix-notification-stat-icon { width:28px; height:28px; border-radius:8px; background:#e8f6ed; animation:none; }
        .ix-notification-stat-label { font-size:12px; }
        .ix-notification-stat strong { font-size:17px; margin-top:0; }
        .ix-notification-grid { display:block; padding:0; }
        .ix-notification-item, .ix-notification-item.unread { display:flex; align-items:flex-start; flex-wrap:nowrap; gap:13px; padding:17px 18px; margin:0; border:0; border-bottom:1px solid #e1ede5; border-radius:0; box-shadow:none; background:transparent; animation:none; transform:none; transition:background-color .2s ease; }
        .ix-notification-item.unread { background:#f0faf4; border-left:3px solid #1c9556; padding-left:15px; }
        .ix-notification-item:hover, .ix-notification-item.unread:hover { transform:none; box-shadow:none; border-color:#e1ede5; background:#f4faf6; }
        .ix-notification-item::before, .ix-notification-item:hover::before { content:none; animation:none; }
        .ix-notification-item .dot-icon { width:38px; height:38px; flex:0 0 38px; border-radius:10px; animation:none; }
        .ix-notification-content { flex:1 1 auto; }
        .ix-notification-actions { width:auto; flex:0 0 auto; align-self:center; border:0; padding:0; gap:7px; }
        .ix-notification-actions button:not(:disabled):hover { transform:none; box-shadow:none; }
        @media(max-width:700px) {
          .ix-notification-summary { gap:8px 16px; padding:10px 12px; }
          .ix-notification-stat, .ix-notification-stat:nth-child(3) { flex-direction:row; align-items:center; }
          .ix-notification-item, .ix-notification-item.unread { flex-wrap:wrap; padding:14px 12px; gap:10px; }
          .ix-notification-item.unread { padding-left:9px; }
          .ix-notification-content { flex:1 1 calc(100% - 52px); }
          .ix-notification-actions { width:100%; justify-content:flex-end; padding-left:48px; }
        }
        @media(max-width:380px) { .ix-notification-summary { display:flex; } .ix-notification-stat:nth-child(3) { grid-column:auto; } }
        /* Spacious inbox rows with restrained motion, not cards */
        @keyframes ixInboxEnter { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ixInboxUnreadPulse { 0%,100% { box-shadow:0 0 0 3px rgba(10,157,88,.10); } 50% { box-shadow:0 0 0 6px rgba(10,157,88,.035); } }
        .ix-notification-grid { padding:8px 0 12px; }
        .ix-notification-item, .ix-notification-item.unread {
          padding-top:25px; padding-bottom:25px; gap:18px;
          animation:ixInboxEnter .48s cubic-bezier(.22,.8,.2,1) both;
          animation-delay:calc(min(var(--ix-notification-index, 0), 8) * 55ms);
          transition:background-color .24s ease, padding-left .24s ease;
        }
        .ix-notification-item.unread { padding-left:15px; }
        .ix-notification-item:hover, .ix-notification-item.unread:hover { background:#f1faf5; }
        .ix-notification-title { gap:10px; row-gap:6px; }
        .ix-notification-message { margin:12px 0 10px; line-height:1.75; }
        .ix-notification-item .dot-icon { transition:transform .28s ease,background-color .28s ease; }
        .ix-notification-item:hover .dot-icon { transform:translateY(-2px) scale(1.06); background:#cef0dc; }
        .ix-notification-unread { animation:ixInboxUnreadPulse 2.7s ease-in-out infinite; }
        .ix-notification-actions { gap:10px; }
        .ix-notification-actions button { transition:transform .2s ease,background-color .2s ease; }
        .ix-notification-actions button:not(:disabled):hover { transform:translateY(-2px); box-shadow:none; }
        @media(max-width:700px) {
          .ix-notification-item, .ix-notification-item.unread { padding-top:21px; padding-bottom:21px; gap:12px; }
          .ix-notification-item.unread { padding-left:9px; }
          .ix-notification-actions { padding-top:6px; }
        }
        /* Modern micro-interactions: server-confirmed delete, reading and refresh */
        @keyframes ixInboxDelete {
          0% { opacity:1; transform:translateX(0) scale(1); max-height:500px; padding-top:25px; padding-bottom:25px; }
          45% { opacity:.35; transform:translateX(24px) scale(.985); max-height:500px; padding-top:25px; padding-bottom:25px; }
          100% { opacity:0; transform:translateX(65px) scale(.97); max-height:0; padding-top:0; padding-bottom:0; border-bottom-width:0; }
        }
        @keyframes ixInboxRead { 0% { background:#dcfce7; } 100% { background:transparent; } }
        @keyframes ixInboxSpin { to { transform:rotate(360deg); } }
        .ix-notification-item.ix-notification-exiting,
        .ix-notification-item.unread.ix-notification-exiting {
          animation:ixInboxDelete .38s cubic-bezier(.25,.7,.2,1) both !important;
          pointer-events:none;
          overflow:hidden;
        }
        .ix-notification-item.ix-notification-reading { background:#e5f8eb; }
        .ix-notification-actions button:focus-visible { outline:2px solid #15834c; outline-offset:3px; }
        .ix-notifications-toolbar button:disabled { opacity:.65; }
        @media(prefers-reduced-motion:reduce) {
          .ix-notification-item.ix-notification-exiting,
          .ix-notification-item.unread.ix-notification-exiting { animation:none !important; opacity:.35; }
          .ix-notification-item, .ix-notification-item.unread, .ix-notification-unread { animation:none !important; }
          .ix-notification-item .dot-icon, .ix-notification-actions button { transition:none !important; }
          .ix-notification-item:hover .dot-icon, .ix-notification-actions button:not(:disabled):hover { transform:none !important; }
        }

      `}</style>

      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <PageHeader
        title="Notifications"
        subtitle="Payment receipts, claim decisions, payouts and announcements."
      >
        <Button
          onClick={() =>
            readAll.mutate()
          }
          loading={readAll.isPending}
          disabled={
            unread === 0 ||
            busy ||
            q.isPending
          }
        >
          Mark all as read
        </Button>
      </PageHeader>

      <div className="ix-notification-summary" aria-label="Notification overview">
        {[
          { label: 'All notifications', value: rows.length, icon: 'bell' },
          { label: 'Unread', value: unread, icon: 'alert' },
          { label: 'Admin announcements', value: rows.filter((n) => String(n.source || '').toUpperCase() === 'ADMIN').length, icon: 'megaphone' },
        ].map((item) => (
          <div className="ix-notification-stat" key={item.label}>
            <span className="ix-notification-stat-icon"><Icon name={item.icon} size={21} /></span>
            <div><span className="ix-notification-stat-label">{item.label}</span><strong>{q.isPending ? '…' : item.value}</strong></div>
          </div>
        ))}
      </div>

      {/* ===================================================
          ERROR MESSAGE
      =================================================== */}

      {pageError && (
        <div
          className="alert error"
          role="alert"
        >
          <Icon
            name="bell"
            size={17}
          />

          <span>
            {pageError}
          </span>

          <Button
            size="sm"
            onClick={() =>
              setPageError('')
            }
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ===================================================
          NOTIFICATION LIST
      =================================================== */}

      <Panel flush>

        {/* ===============================================
            TOOLBAR
        =============================================== */}

        <div className="toolbar ix-notifications-toolbar">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: 'all',
                label: 'All',
              },
              {
                value: 'unread',
                label: `Unread (${unread})`,
              },
            ]}
          />

          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={q.isFetching || busy}
          >
            <Icon
              name="refresh"
              size={16}
            />

            {q.isFetching
              ? 'Refreshing...'
              : 'Refresh'}
          </Button>
        </div>

        {/* ===============================================
            DATA STATE
        =============================================== */}

        <DataState
          query={q}
          empty={{
            title: 'You are all caught up',
            text: 'New alerts will appear here.',
          }}
        >
          {() => {
            if (shown.length === 0) {
              return (
                <div
                  className="ix-notification-empty"
                >
                  <Icon
                    name="bell"
                    size={28}
                  />

                  <h4>
                    {filter === 'unread'
                      ? 'No unread notifications'
                      : 'No notifications yet'}
                  </h4>

                  <p className="muted">
                    {filter === 'unread'
                      ? 'You have read all your notifications.'
                      : 'New alerts will appear here.'}
                  </p>
                </div>
              )
            }

            return (
              <div className="ix-notification-grid" aria-label="Notification history">
                {shown.map((notification, index) => {
              const unreadItem =
                isUnread(notification)

              const fromAdmin =
                String(
                  notification.source || '',
                ).toUpperCase() === 'ADMIN'

              const notificationId =
                notification.notificationId

              const readingThis =
                read.isPending &&
                String(read.variables) ===
                  String(notificationId)

              const deletingThis =
                del.isPending &&
                String(del.variables) ===
                  String(notificationId)

              return (
                <div
                  key={notificationId}
                  style={{ '--ix-notification-index': index }}
                  className={
                    `list-item ix-notification-item ${
                      unreadItem
                        ? 'unread'
                        : ''
                    } ${String(exitingId) === String(notificationId) && exitingId != null ? 'ix-notification-exiting' : ''} ${readingThis ? 'ix-notification-reading' : ''}`
                  }
                >
                  {/* ===================================
                      ICON
                  =================================== */}

                  <div className="dot-icon">
                    <Icon
                      name={notificationIcon(
                        notification,
                      )}
                    />
                  </div>

                  {/* ===================================
                      CONTENT
                  =================================== */}

                  <div className="ix-notification-content">

                    <div className="ix-notification-title">
                      <b>
                        {notification.title ||
                          'Notification'}
                      </b>

                      {unreadItem && (
                        <span
                          className="ix-notification-unread"
                          aria-label="Unread"
                          title="Unread notification"
                        />
                      )}

                      {fromAdmin && (
                        <span className="ix-notification-source">
                          Admin announcement
                        </span>
                      )}

                      <span
                        className="faint"
                        style={{
                          fontSize: 12.5,
                        }}
                        title={
                          dateTime(
                            notification.createdAt,
                          )
                        }
                      >
                        {timeAgo(
                          notification.createdAt,
                        )}
                      </span>
                    </div>

                    <p
                      className="muted ix-notification-message"
                    >
                      {notification.message ||
                        'No message provided.'}
                    </p>

                    <div
                      className="faint"
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {dateTime(
                        notification.createdAt,
                      )}
                    </div>
                  </div>

                  {/* ===================================
                      ACTIONS
                  =================================== */}

                  <div className="ix-notification-actions">

                    {unreadItem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={readingThis}
                        disabled={busy}
                        onClick={() =>
                          read.mutate(
                            notificationId,
                          )
                        }
                      >
                        {readingThis
                          ? 'Saving...'
                          : 'Mark read'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete notification"
                      title="Delete notification"
                      loading={deletingThis}
                      disabled={busy}
                      onClick={() =>
                        del.mutate(
                          notificationId,
                        )
                      }
                    >
                      <Icon
                        name="trash"
                        size={16}
                      />
                    </Button>
                  </div>
                </div>
              )
                })}
              </div>
            )
          }}
        </DataState>
      </Panel>
    </div>
  )
}
