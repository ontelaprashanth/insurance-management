import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '../../api/endpoints'
import { Button, DataState, Icon, PageHeader, Panel, Segmented, useToast } from '../../components/ui'
import { timeAgo } from '../../lib/format'

const ICONS = { CLAIM: 'claim', SETTLEMENT: 'cash', PAYMENT: 'receipt', POLICY: 'shield', OFFER: 'megaphone', ANNOUNCEMENT: 'megaphone', ALERT: 'bell' }

export default function Notifications() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['notifications'], queryFn: notifications.mine })
  const [filter, setFilter] = useState('all')
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifications'] }) }

  const read = useMutation({ mutationFn: notifications.read, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: notifications.readAll, onSuccess: () => { refresh(); toast.success('All marked as read') } })
  const del = useMutation({ mutationFn: notifications.remove, onSuccess: () => { refresh(); toast.success('Deleted') }, onError: toast.error })

  const unread = (q.data || []).filter((n) => !n.isRead).length

  return (
    <>
      <PageHeader title="Notifications" subtitle="Payment receipts, claim decisions, payouts and announcements.">
        <Button onClick={() => readAll.mutate()} loading={readAll.isPending} disabled={unread === 0}>Mark all as read</Button>
      </PageHeader>
      <Panel flush>
        <div className="toolbar">
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: `Unread (${unread})` }]} />
        </div>
        <DataState query={q} empty={{ title: 'You are all caught up', text: 'New alerts will appear here.' }}>
          {(rows) => {
            const shown = rows.filter((n) => filter === 'all' || !n.isRead)
            if (shown.length === 0) return <div className="empty"><h4>No unread notifications</h4></div>
            return shown.map((n) => (
              <div key={n.notificationId} className={`list-item ${n.isRead ? '' : 'unread'}`}>
                <div className="dot-icon"><Icon name={ICONS[String(n.type).toUpperCase()] || 'bell'} /></div>
                <div className="grow">
                  <div className="row wrap" style={{ gap: 8 }}><b>{n.title}</b><span className="faint" style={{ fontSize: 12.5 }}>{timeAgo(n.createdAt)}</span></div>
                  <p className="muted">{n.message}</p>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  {!n.isRead && <Button size="sm" variant="ghost" onClick={() => read.mutate(n.notificationId)}>Mark read</Button>}
                  <Button size="sm" variant="ghost" className="icon-btn" aria-label="Delete notification" onClick={() => del.mutate(n.notificationId)}><Icon name="trash" size={16} /></Button>
                </div>
              </div>
            ))
          }}
        </DataState>
      </Panel>
    </>
  )
}
