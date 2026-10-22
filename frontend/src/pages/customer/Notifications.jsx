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

    onSuccess: async () => {
      setPageError('')
      await refreshNotifications()

      toast.success('Notification deleted.')
    },

    onError: (error) => {
      const message = errorMessage(
        error,
        'Unable to delete notification.',
      )

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
    <>
      <style>{`
        /* ===============================================
           INSUREX NOTIFICATIONS
        =============================================== */

        .ix-notifications-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ix-notification-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }

        .ix-notification-item.unread {
          background:
            rgba(15, 118, 110, 0.035);
        }

        .ix-notification-content {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .ix-notification-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ix-notification-message {
          margin: 8px 0;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .ix-notification-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .ix-notification-actions button {
          white-space: nowrap;
        }

        .ix-notification-source {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 650;
          background: #e0f2fe;
          color: #075985;
        }

        .ix-notification-unread {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #0d9488;
          flex-shrink: 0;
        }

        @media (max-width: 700px) {
          .ix-notification-item {
            gap: 10px;
            flex-wrap: wrap;
          }

          .ix-notification-content {
            flex-basis: calc(100% - 65px);
          }

          .ix-notification-actions {
            width: 100%;
            justify-content: flex-end;
            padding-left: 45px;
          }

          .ix-notifications-toolbar {
            align-items: stretch;
          }
        }

        @media (max-width: 400px) {
          .ix-notification-actions {
            padding-left: 0;
          }
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
                  className="empty"
                  style={{
                    padding: 30,
                    textAlign: 'center',
                  }}
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

            return shown.map((notification) => {
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
                    }`
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
            })
          }}
        </DataState>
      </Panel>
    </>
  )
}
