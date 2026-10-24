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
                {shown.map((notification) => {
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
                        className="faint ix-notification-time"
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

                    <div className="faint ix-notification-datetime">
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
