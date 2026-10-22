import { useMemo, useRef, useState } from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  Megaphone,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from 'lucide-react'

import { broadcast } from '../../api/endpoints'
import { errorMessage } from '../../api/client'

import {
  Button,
  Confirm,
  DataState,
  PageHeader,
  Panel,
  SelectInput,
  StatusBadge,
  TextArea,
  TextInput,
  useToast,
} from '../../components/ui'

import {
  dateTime,
  timeAgo,
} from '../../lib/format'

/* =========================================================
   INSUREX — ADMIN BROADCAST

   Send to All Customers
   Send to One Customer
   Notification Categories
   Delivery Feedback
   Sent Notification History
   Delete Notifications
   Duplicate Submission Protection
   Responsive Admin Interface

   Uses existing backend endpoints.
========================================================= */

const TYPES = [
  {
    value: 'ANNOUNCEMENT',
    label: 'Announcement',
  },
  {
    value: 'OFFER',
    label: 'Offer',
  },
  {
    value: 'ALERT',
    label: 'Alert',
  },
  {
    value: 'PAYMENT',
    label: 'Payment',
  },
  {
    value: 'POLICY',
    label: 'Policy',
  },
  {
    value: 'GENERAL',
    label: 'General',
  },
]

const MAX_TITLE = 100
const MAX_MESSAGE = 5000

/* =========================================================
   HELPERS
========================================================= */

function normalizeRows(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.content)) {
    return data.content
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.data?.content)) {
    return data.data.content
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications
  }

  if (Array.isArray(data?.customers)) {
    return data.customers
  }

  return []
}

function getCustomerId(customer) {
  return customer?.userId ?? customer?.id
}

function getNotificationId(notification) {
  return notification?.notificationId ?? notification?.id
}

function isUncertainError(error) {
  const status = error?.response?.status

  return (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    !error?.response ||
    status >= 500
  )
}

function typeLabel(value) {
  const match = TYPES.find(
    (item) => item.value === String(value ?? '').toUpperCase(),
  )

  return match?.label || value || 'General'
}

function recipientLabel(notification) {
  if (notification?.recipientType === 'ALL') {
    return 'All customers'
  }

  if (notification?.recipientType === 'USER') {
    return notification?.userId
      ? `Customer #${notification.userId}`
      : 'One customer'
  }

  if (notification?.userId) {
    return `Customer #${notification.userId}`
  }

  return 'Broadcast'
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Broadcast() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const sendLock = useRef(false)
  const deleteLock = useRef(false)

  /* =======================================================
     QUERIES
  ======================================================= */

  const customers = useQuery({
    queryKey: ['a-customers'],
    queryFn: broadcast.customers,

    staleTime: 30_000,

    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const history = useQuery({
    queryKey: ['a-broadcasts'],
    queryFn: broadcast.list,

    staleTime: 10_000,

    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'ANNOUNCEMENT',
    recipientType: 'ALL',
    userId: '',
  })

  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const [deleteId, setDeleteId] = useState(null)

  const [sendUncertain, setSendUncertain] = useState(false)
  const [deleteUncertainId, setDeleteUncertainId] = useState(null)

  const [historyFilter, setHistoryFilter] = useState('all')

  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  const customerList = useMemo(
    () => normalizeRows(customers.data),
    [customers.data],
  )

  const notificationList = useMemo(
    () =>
      normalizeRows(history.data)
        .slice()
        .sort((a, b) => {
          const left = Date.parse(a.createdAt || '') || 0
          const right = Date.parse(b.createdAt || '') || 0

          if (right !== left) {
            return right - left
          }

          return (
            Number(getNotificationId(b) || 0) -
            Number(getNotificationId(a) || 0)
          )
        }),
    [history.data],
  )

  const customerOptions = useMemo(
    () =>
      customerList
        .filter((customer) => getCustomerId(customer) != null)
        .map((customer) => {
          const id = getCustomerId(customer)

          return {
            value: String(id),
            label: `${
              customer.username ||
              customer.name ||
              customer.email ||
              'Customer'
            } (#${id})`,
          }
        }),
    [customerList],
  )

  /* =======================================================
     FILTER HISTORY
  ======================================================= */

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') {
      return notificationList
    }

    if (historyFilter === 'broadcast') {
      return notificationList.filter(
        (notification) =>
          notification.recipientType === 'ALL' ||
          (
            !notification.recipientType &&
            !notification.userId
          ),
      )
    }

    return notificationList.filter(
      (notification) =>
        notification.recipientType === 'USER' ||
        Boolean(notification.userId),
    )
  }, [
    notificationList,
    historyFilter,
  ])

  const selectedCustomer = customerList.find(
    (customer) =>
      String(getCustomerId(customer)) === String(form.userId),
  )

  const selectedNotification = notificationList.find(
    (notification) =>
      String(getNotificationId(notification)) === String(deleteId),
  )

  /* =======================================================
     REFRESH RELATED DATA
  ======================================================= */

  async function refreshNotifications() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['a-broadcasts'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      }),
    ])
  }

  /* =======================================================
     SEND NOTIFICATION
  ======================================================= */

  const send = useMutation({
    mutationFn: broadcast.send,

    retry: false,

    onSuccess: async (response) => {
      setError('')
      setSendUncertain(false)

      try {
        await refreshNotifications()
      } catch {
        // The notification was sent even if
        // refreshing the history fails.
      }

      const recipientCount = response?.recipientCount

      toast.success(
        response?.message
          ? (
              recipientCount != null
                ? `${response.message} (${recipientCount} recipients)`
                : response.message
            )
          : 'Notification sent successfully.',
      )

      setForm((previous) => ({
        ...previous,
        title: '',
        message: '',
      }))
    },

    onError: async (requestError) => {
      if (isUncertainError(requestError)) {
        setSendUncertain(true)

        setError(
          'The server did not confirm whether the notification was sent. Check the notification history before sending again to avoid duplicate messages.',
        )

        try {
          await refreshNotifications()
        } catch {
          // Preserve the warning.
        }

        return
      }

      setError(
        errorMessage(
          requestError,
          'Could not send the notification.',
        ),
      )
    },

    onSettled: () => {
      sendLock.current = false
    },
  })

  /* =======================================================
     SUBMIT VALIDATION
  ======================================================= */

  function submit(event) {
    event?.preventDefault?.()

    if (
      sendLock.current ||
      send.isPending ||
      sendUncertain
    ) {
      return
    }

    const title = form.title.trim()
    const message = form.message.trim()

    if (!title) {
      setError('Enter a notification title.')
      return
    }

    if (title.length > MAX_TITLE) {
      setError(
        `The title cannot exceed ${MAX_TITLE} characters.`,
      )
      return
    }

    if (!message) {
      setError('Write the notification message.')
      return
    }

    if (message.length > MAX_MESSAGE) {
      setError(
        `The message cannot exceed ${MAX_MESSAGE} characters.`,
      )
      return
    }

    if (form.recipientType === 'USER') {
      if (!form.userId) {
        setError('Choose a customer.')
        return
      }

      if (!selectedCustomer) {
        setError(
          'The selected customer could not be verified. Refresh the customer list.',
        )
        return
      }
    }

    if (
      form.recipientType === 'ALL' &&
      customers.isSuccess &&
      customerList.length === 0
    ) {
      setError(
        'No customers were found. Check the customer list before sending.',
      )
      return
    }

    setError('')
    sendLock.current = true

    send.mutate({
      title,
      message,
      type: form.type,
      recipientType: form.recipientType,

      userId:
        form.recipientType === 'USER'
          ? Number(form.userId)
          : undefined,
    })
  }

  /* =======================================================
     DELETE NOTIFICATION
  ======================================================= */

  const remove = useMutation({
    mutationFn: (notificationId) =>
      broadcast.remove(notificationId),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setDeleteUncertainId(null)

      try {
        await refreshNotifications()
      } catch {
        // The delete request succeeded.
      }

      toast.success('Notification deleted successfully.')
    },

    onError: async (requestError, notificationId) => {
      setDeleteId(null)

      if (isUncertainError(requestError)) {
        setDeleteUncertainId(notificationId)

        setPageError(
          `Deletion of notification #${notificationId} could not be confirmed. Refresh the history before trying again.`,
        )

        try {
          await refreshNotifications()
        } catch {
          // Preserve the warning.
        }

        return
      }

      toast.error(
        errorMessage(
          requestError,
          'Could not delete the notification.',
        ),
      )
    },

    onSettled: () => {
      deleteLock.current = false
    },
  })

  function confirmDelete() {
    if (
      !selectedNotification ||
      remove.isPending ||
      deleteLock.current
    ) {
      return
    }

    const notificationId = getNotificationId(selectedNotification)

    if (
      String(notificationId) === String(deleteUncertainId)
    ) {
      return
    }

    deleteLock.current = true
    remove.mutate(notificationId)
  }

  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  async function refreshHistory() {
    setPageError('')

    try {
      const result = await history.refetch()

      if (result.error) {
        throw result.error
      }

      await queryClient.invalidateQueries({
        queryKey: ['notifications'],
      })
    } catch (requestError) {
      setPageError(
        errorMessage(
          requestError,
          'Could not refresh notification history.',
        ),
      )
    }
  }

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalSent = notificationList.length

  const broadcastsSent = notificationList.filter(
    (notification) =>
      notification.recipientType === 'ALL' ||
      (
        !notification.recipientType &&
        !notification.userId
      ),
  ).length

  const individualSent = notificationList.filter(
    (notification) =>
      notification.recipientType === 'USER' ||
      Boolean(notification.userId),
  ).length

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>{`
        .ix-broadcast-summary {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .ix-broadcast-summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 15px;
          background: var(--surface, #fff);
        }

        .ix-broadcast-summary-card svg {
          flex-shrink: 0;
          opacity: 0.75;
        }

        .ix-broadcast-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 25px;
          font-weight: 750;
          line-height: 1.2;
        }

        .ix-broadcast-summary-card span {
          font-size: 13px;
        }

        .ix-broadcast-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) minmax(0, 1.15fr);
          align-items: start;
          gap: 18px;
        }

        .ix-broadcast-form {
          min-width: 0;
        }

        .ix-broadcast-form .stack {
          gap: 16px;
        }

        .ix-broadcast-form-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ix-broadcast-history {
          min-width: 0;
        }

        .ix-broadcast-history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line, #e2e8f0);
        }

        .ix-broadcast-history-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .ix-broadcast-filter {
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 8px;
          padding: 7px 11px;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }

        .ix-broadcast-filter.active {
          background: var(--primary, #334155);
          border-color: var(--primary, #334155);
          color: white;
        }

        .ix-broadcast-history-list {
          max-height: 720px;
          overflow-y: auto;
        }

        .ix-broadcast-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 17px 18px;
          border-bottom: 1px solid var(--line, #e2e8f0);
        }

        .ix-broadcast-item:last-child {
          border-bottom: 0;
        }

        .ix-broadcast-item-content {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .ix-broadcast-item-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ix-broadcast-item-message {
          margin: 9px 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          font-size: 13.5px;
          line-height: 1.6;
        }

        .ix-broadcast-item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12px;
        }

        .ix-broadcast-item-actions {
          flex-shrink: 0;
        }

        .ix-broadcast-char-count {
          display: block;
          text-align: right;
          margin-top: 4px;
          font-size: 12px;
        }

        @media (max-width: 1000px) {
          .ix-broadcast-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .ix-broadcast-summary {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .ix-broadcast-summary-card {
            padding: 14px;
          }

          .ix-broadcast-summary-card strong {
            font-size: 21px;
          }

          .ix-broadcast-item {
            padding: 14px;
            flex-wrap: wrap;
          }

          .ix-broadcast-item-actions {
            margin-left: auto;
          }

          .ix-broadcast-history-list {
            max-height: none;
          }
        }

        @media (max-width: 380px) {
          .ix-broadcast-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <PageHeader
        title="Broadcast"
        subtitle="Send announcements, offers, and alerts to all customers or an individual customer."
      >
        <Button
          type="button"
          onClick={refreshHistory}
          disabled={history.isFetching}
        >
          <RefreshCw size={16} />

          {history.isFetching
            ? 'Refreshing…'
            : 'Refresh history'}
        </Button>
      </PageHeader>

      {/* ===================================================
          PAGE ERROR
      =================================================== */}

      {pageError && (
        <div className="alert error" role="alert">
          <AlertCircle size={17} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="ix-broadcast-summary">
        <div className="ix-broadcast-summary-card">
          <Megaphone size={24} />

          <div>
            <span className="muted">
              Sent notifications
            </span>

            <strong>
              {history.isPending ? '…' : totalSent}
            </strong>
          </div>
        </div>

        <div className="ix-broadcast-summary-card">
          <Users size={24} />

          <div>
            <span className="muted">
              Broadcast records
            </span>

            <strong>
              {history.isPending ? '…' : broadcastsSent}
            </strong>
          </div>
        </div>

        <div className="ix-broadcast-summary-card">
          <Bell size={24} />

          <div>
            <span className="muted">
              Individual records
            </span>

            <strong>
              {history.isPending ? '…' : individualSent}
            </strong>
          </div>
        </div>
      </div>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="ix-broadcast-layout">

        {/* ===============================================
            NEW NOTIFICATION
        =============================================== */}

        <div className="ix-broadcast-form">
          <Panel title="New notification">
            <form
              className="stack"
              onSubmit={submit}
              noValidate
            >
              {error && (
                <div className="alert error" role="alert">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              {sendUncertain && (
                <div className="alert warn" role="status">
                  <Clock3 size={17} />

                  <span>
                    Sending is paused because the previous
                    request has an unknown outcome.
                    Review the history before trying again.
                  </span>
                </div>
              )}

              {/* RECIPIENTS */}

              <div className="form-grid">
                <SelectInput
                  label="Type"
                  value={form.type}
                  disabled={send.isPending}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))

                    setError('')
                  }}
                  options={TYPES}
                />

                <SelectInput
                  label="Send to"
                  value={form.recipientType}
                  disabled={send.isPending}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      recipientType: event.target.value,
                      userId: '',
                    }))

                    setError('')
                  }}
                  options={[
                    {
                      value: 'ALL',
                      label: 'All customers',
                    },
                    {
                      value: 'USER',
                      label: 'One customer',
                    },
                  ]}
                />

                {form.recipientType === 'USER' && (
                  <div className="full">
                    <SelectInput
                      label="Customer"
                      value={form.userId}
                      disabled={
                        send.isPending ||
                        customers.isPending
                      }
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          userId: event.target.value,
                        }))

                        setError('')
                      }}
                      options={customerOptions}
                      placeholder={
                        customers.isPending
                          ? 'Loading customers…'
                          : 'Choose a customer…'
                      }
                    />

                    {customers.isError && (
                      <div
                        className="alert error"
                        role="alert"
                        style={{ marginTop: 10 }}
                      >
                        Unable to load customers.

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => customers.refetch()}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TITLE */}

              <div>
                <TextInput
                  label="Title"
                  value={form.title}
                  maxLength={MAX_TITLE}
                  disabled={send.isPending}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      title: event.target.value.slice(
                        0,
                        MAX_TITLE,
                      ),
                    }))

                    setError('')
                  }}
                />

                <span className="muted ix-broadcast-char-count">
                  {form.title.length}/{MAX_TITLE}
                </span>
              </div>

              {/* MESSAGE */}

              <div>
                <TextArea
                  label="Message"
                  value={form.message}
                  disabled={send.isPending}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      message: event.target.value.slice(
                        0,
                        MAX_MESSAGE,
                      ),
                    }))

                    setError('')
                  }}
                />

                <span className="muted ix-broadcast-char-count">
                  {form.message.length}/{MAX_MESSAGE}
                </span>
              </div>

              {/* RECIPIENT PREVIEW */}

              <div className="alert info">
                <Users size={17} />

                <span>
                  {form.recipientType === 'ALL'
                    ? (
                        <>
                          This notification will be sent
                          to all eligible customers.
                          {customers.isSuccess && (
                            <>
                              {' '}Customer records found:{' '}
                              <strong>
                                {customerList.length}
                              </strong>.
                            </>
                          )}
                        </>
                      )
                    : (
                        selectedCustomer
                          ? (
                              <>
                                Recipient:{' '}
                                <strong>
                                  {selectedCustomer.username ||
                                    selectedCustomer.name ||
                                    `Customer #${form.userId}`}
                                </strong>
                              </>
                            )
                          : 'Select a customer to preview the recipient.'
                      )}
                </span>
              </div>

              {/* SEND BUTTON */}

              <div className="ix-broadcast-form-footer">
                <Button
                  type="button"
                  disabled={send.isPending}
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      title: '',
                      message: '',
                    }))

                    setError('')
                  }}
                >
                  Clear
                </Button>

                <Button
                  type="submit"
                  variant="dark"
                  loading={send.isPending}
                  disabled={
                    send.isPending ||
                    sendUncertain ||
                    (
                      form.recipientType === 'USER' &&
                      !form.userId
                    )
                  }
                >
                  <Send size={16} />

                  {form.recipientType === 'ALL'
                    ? 'Send to all customers'
                    : 'Send notification'}
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        {/* ===============================================
            SENT HISTORY
        =============================================== */}

        <div className="ix-broadcast-history">
          <Panel title="Sent notifications" flush>
            <div className="ix-broadcast-history-header">
              <div className="ix-broadcast-history-filters">
                {[
                  {
                    value: 'all',
                    label: 'All',
                  },
                  {
                    value: 'broadcast',
                    label: 'Broadcasts',
                  },
                  {
                    value: 'individual',
                    label: 'Individual',
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={
                      `ix-broadcast-filter ${
                        historyFilter === item.value
                          ? 'active'
                          : ''
                      }`
                    }
                    onClick={() => setHistoryFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <span className="muted" style={{ fontSize: 12 }}>
                {filteredHistory.length} records
              </span>
            </div>

            <DataState
              query={history}
              empty={{
                title: 'Nothing sent yet',
                text: 'Notifications you send will appear here.',
              }}
              rows={3}
            >
              {() =>
                filteredHistory.length === 0 ? (
                  <div
                    className="empty"
                    style={{ padding: 28 }}
                  >
                    <h4>No matching notifications</h4>

                    <p className="muted">
                      Try another history filter.
                    </p>

                    <Button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                    >
                      Show all
                    </Button>
                  </div>
                ) : (
                  <div className="ix-broadcast-history-list">
                    {filteredHistory.slice(0, 50).map(
                      (notification, index) => {
                        const notificationId =
                          getNotificationId(notification)

                        return (
                          <div
                            className="ix-broadcast-item"
                            key={
                              notificationId ??
                              `history-${index}`
                            }
                          >
                            <Megaphone
                              size={18}
                              style={{
                                marginTop: 3,
                                flexShrink: 0,
                                opacity: 0.7,
                              }}
                            />

                            <div className="ix-broadcast-item-content">
                              <div className="ix-broadcast-item-title">
                                <strong>
                                  {notification.title || 'Notification'}
                                </strong>

                                <StatusBadge
                                  value="GRAY"
                                  label={typeLabel(notification.type)}
                                />
                              </div>

                              <p className="muted ix-broadcast-item-message">
                                {notification.message || '—'}
                              </p>

                              <div className="faint ix-broadcast-item-meta">
                                <span
                                  title={dateTime(notification.createdAt)}
                                >
                                  <Clock3
                                    size={13}
                                    style={{
                                      verticalAlign: 'middle',
                                      marginRight: 4,
                                    }}
                                  />

                                  {timeAgo(notification.createdAt)}
                                </span>

                                <span>
                                  · {recipientLabel(notification)}
                                </span>
                              </div>

                              <div
                                className="faint"
                                style={{
                                  marginTop: 5,
                                  fontSize: 12,
                                }}
                              >
                                {dateTime(notification.createdAt)}
                              </div>
                            </div>

                            <div className="ix-broadcast-item-actions">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={
                                  remove.isPending ||
                                  (
                                    notificationId != null &&
                                    String(notificationId) ===
                                      String(deleteUncertainId)
                                  )
                                }
                                onClick={() =>
                                  setDeleteId(notificationId)
                                }
                              >
                                <Trash2 size={15} />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                )
              }
            </DataState>
          </Panel>
        </div>
      </div>

      {/* ===================================================
          DELETE CONFIRMATION
      =================================================== */}

      {selectedNotification && (
        <Confirm
          danger
          title="Delete notification?"
          message={
            `Delete "${selectedNotification.title}"? ` +
            'The backend will remove the notification according to its deletion rules.'
          }
          confirmLabel="Delete notification"
          loading={remove.isPending}
          onClose={() => {
            if (!remove.isPending) {
              setDeleteId(null)
            }
          }}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}
