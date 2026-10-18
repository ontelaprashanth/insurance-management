
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claims, settlements } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import {
  Button,
  Confirm,
  DataState,
  Details,
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  Segmented,
  SelectInput,
  StatusBadge,
  Table,
  TextInput,
  useFilter,
  useToast,
} from '../../components/ui'
import { date, inr, today } from '../../lib/format'

/* Normalize status values consistently across the page. */
const normalizeStatus = (value) =>
  String(value ?? '').trim().toUpperCase()

/** Create or edit a settlement. */
export function SettlementForm({ settlement, claim, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()

  const cl = useQuery({
    queryKey: ['a-claims'],
    queryFn: claims.getAll,
  })

  const st = useQuery({
    queryKey: ['a-settlements'],
    queryFn: settlements.getAll,
  })

  const [f, setF] = useState({
    claimNumber: settlement?.claimNumber ?? claim?.claimNumber ?? '',
    amount: settlement?.amount ?? claim?.approvedAmount ?? '',
    settlementDate: settlement?.settlementDate || today(),
  })

  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: (body) =>
      settlement
        ? settlements.update(settlement.settlementNumber, body)
        : settlements.save(body),

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['a-settlements'] })
      await qc.invalidateQueries({ queryKey: ['a-claims'] })

      toast.success(
        settlement
          ? 'Settlement updated'
          : 'Settlement created. It is pending until you process it.'
      )

      onClose()
    },

    onError: (e) =>
      setError(errorMessage(e, 'Could not save this settlement.')),
  })

  const claimsList = Array.isArray(cl.data) ? cl.data : []
  const settlementsList = Array.isArray(st.data) ? st.data : []

  const eligible = claimsList.filter(
    (c) =>
      normalizeStatus(c.status) === 'APPROVED' &&
      (
        String(c.claimNumber) === String(settlement?.claimNumber) ||
        !settlementsList.some(
          (s) => String(s.claimNumber) === String(c.claimNumber)
        )
      )
  )

  const selected = claimsList.find(
    (c) => String(c.claimNumber) === String(f.claimNumber)
  )

  function pick(e) {
    const n = e.target.value
    const c = claimsList.find(
      (x) => String(x.claimNumber) === String(n)
    )

    setF((current) => ({
      ...current,
      claimNumber: n,
      amount: c?.approvedAmount ?? current.amount,
    }))

    setError('')
  }

  function submit() {
    if (!f.claimNumber) {
      setError('Choose the approved claim to settle.')
      return
    }

    if (!(Number(f.amount) > 0)) {
      setError('Enter the settlement amount.')
      return
    }

    if (
      selected?.approvedAmount != null &&
      Number(f.amount) > Number(selected.approvedAmount)
    ) {
      setError(
        `The amount cannot exceed the approved ${inr(selected.approvedAmount)}.`
      )
      return
    }

    if (!f.settlementDate) {
      setError('Choose the settlement date.')
      return
    }

    setError('')

    save.mutate({
      claimNumber: Number(f.claimNumber),
      amount: Number(f.amount),
      settlementDate: f.settlementDate,
    })
  }

  return (
    <Modal
      title={
        settlement
          ? `Edit settlement #${settlement.settlementNumber}`
          : 'New settlement'
      }
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="dark"
            loading={save.isPending}
            onClick={submit}
          >
            {settlement ? 'Save changes' : 'Create settlement'}
          </Button>
        </>
      }
    >
      <div className="stack">
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}

        <SelectInput
          label="Approved claim"
          value={f.claimNumber}
          onChange={pick}
          disabled={!!settlement || !!claim}
          placeholder={
            cl.isLoading
              ? 'Loading…'
              : eligible.length
                ? 'Choose a claim…'
                : 'No approved claims waiting'
          }
          options={eligible.map((c) => ({
            value: c.claimNumber,
            label: `#${c.claimNumber} · policy #${c.policyNumber} · approved ${inr(c.approvedAmount)}`,
          }))}
        />

        {selected && (
          <div className="alert info">
            Approved amount: <b>{inr(selected.approvedAmount)}</b>.
            {' '}Claimed: {inr(selected.amount)}.
          </div>
        )}

        <TextInput
          label="Settlement amount (₹)"
          type="number"
          min="1"
          value={f.amount}
          onChange={(e) =>
            setF((current) => ({
              ...current,
              amount: e.target.value,
            }))
          }
        />

        <TextInput
          label="Settlement date"
          type="date"
          value={f.settlementDate}
          onChange={(e) =>
            setF((current) => ({
              ...current,
              settlementDate: e.target.value,
            }))
          }
        />
      </div>
    </Modal>
  )
}

export default function Settlements() {
  const qc = useQueryClient()
  const toast = useToast()

  const q = useQuery({
    queryKey: ['a-settlements'],
    queryFn: settlements.getAll,
  })

  const [status, setStatus] = useState('all')
  const [form, setForm] = useState(null)
  const [view, setView] = useState(null)
  const [proc, setProc] = useState(null)
  const [del, setDel] = useState(null)

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  /*
   * Normalize the query data once. All summary counts, totals,
   * filters and row actions use the same normalized records.
   */
  const all = (Array.isArray(q.data) ? q.data : []).map((s) => ({
    ...s,
    settlementStatus: normalizeStatus(s.settlementStatus),
  }))

  const [search, setSearch, searched] = useFilter(
    all,
    ['settlementNumber', 'claimNumber', 'settlementStatus', 'rejectionReason']
  )

  const rows = searched.filter(
    (s) => status === 'all' || s.settlementStatus === status
  )

  const total = (targetStatus) =>
    all
      .filter((s) => s.settlementStatus === targetStatus)
      .reduce((sum, s) => sum + Number(s.amount || 0), 0)

  const count = (targetStatus) =>
    all.filter((s) => s.settlementStatus === targetStatus).length

  const refresh = async (message) => {
    await qc.invalidateQueries({ queryKey: ['a-settlements'] })
    toast.success(message)
  }

  const process = useMutation({
    mutationFn: (s) => settlements.process(s.settlementNumber),

    onSuccess: async () => {
      await refresh('Settlement processed. The customer has been notified.')
      setProc(null)
    },

    onError: (e) => {
      toast.error(errorMessage(e, 'Could not process settlement.'))
      setProc(null)
    },
  })

  const remove = useMutation({
    mutationFn: (s) => settlements.remove(s.settlementNumber),

    onSuccess: async () => {
      await refresh('Settlement deleted.')
      setDel(null)
    },

    onError: (e) => {
      toast.error(errorMessage(e, 'Could not delete settlement.'))
      setDel(null)
    },
  })

  const reject = useMutation({
    mutationFn: ({ settlementNumber, rejectionReason }) =>
      settlements.reject(settlementNumber, rejectionReason),

    onSuccess: async () => {
      setRejectTarget(null)
      setRejectionReason('')
      setRejectError('')

      await qc.invalidateQueries({ queryKey: ['a-settlements'] })

      toast.success('Settlement rejected. The customer has been notified.')
    },

    onError: (e) => {
      setRejectError(
        errorMessage(e, 'Could not reject this settlement.')
      )
    },
  })

  function openReject(settlement) {
    setRejectTarget(settlement)
    setRejectionReason('')
    setRejectError('')
  }

  function closeReject() {
    if (reject.isPending) return

    setRejectTarget(null)
    setRejectionReason('')
    setRejectError('')
  }

  function submitRejection(e) {
    e?.preventDefault()

    if (!rejectTarget || reject.isPending) return

    const reason = rejectionReason.trim()

    if (!reason) {
      setRejectError('Please enter a rejection reason.')
      return
    }

    if (reason.length > 1000) {
      setRejectError('The rejection reason cannot exceed 1000 characters.')
      return
    }

    setRejectError('')

    reject.mutate({
      settlementNumber: rejectTarget.settlementNumber,
      rejectionReason: reason,
    })
  }

  return (
    <>
      <PageHeader
        title="Settlements"
        subtitle="Manage payouts for approved claims, process settlements, and record rejection reasons."
      >
        <Button
          type="button"
          variant="primary"
          icon="plus"
          onClick={() => setForm({})}
        >
          New settlement
        </Button>
      </PageHeader>

      {/* Summary ledger */}
      <div className="ledger" style={{ marginBottom: 20 }}>
        <div>
          <div className="label">Pending</div>
          <div className="value">{count('PENDING')}</div>
          <div className="sub">{inr(total('PENDING'))} to pay</div>
        </div>

        <div>
          <div className="label">Settled</div>
          <div className="value">{count('SETTLED')}</div>
          <div className="sub">{inr(total('SETTLED'))} paid out</div>
        </div>

        <div>
          <div className="label">Rejected</div>
          <div className="value">{count('REJECTED')}</div>
          <div className="sub">{inr(total('REJECTED'))} rejected</div>
        </div>

        <div>
          <div className="label">All settlements</div>
          <div className="value">{all.length}</div>
          <div className="sub">
            Total value: {inr(
              all.reduce((sum, s) => sum + Number(s.amount || 0), 0)
            )}
          </div>
        </div>
      </div>

      <Panel flush>
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search settlement, claim or rejection reason"
          />

          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SETTLED', label: 'Settled' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No settlements yet',
            text: 'When a claim is approved, create a settlement to pay it out.',
          }}
          emptyAction={
            <Button
              type="button"
              variant="dark"
              onClick={() => setForm({})}
            >
              New settlement
            </Button>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>No matching settlements</h4>
                <p>Try changing the status filter or search term.</p>
              </div>
            ) : (
              <Table
                rowKey="settlementNumber"
                rows={rows
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(b.settlementNumber) -
                      Number(a.settlementNumber)
                  )}
                onRowClick={setView}
                columns={[
                  {
                    key: 'settlementNumber',
                    header: 'Settlement',
                    render: (s) => <b>#{s.settlementNumber}</b>,
                  },
                  {
                    key: 'claimNumber',
                    header: 'Claim',
                    render: (s) => `#${s.claimNumber}`,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    render: (s) => <b>{inr(s.amount)}</b>,
                  },
                  {
                    key: 'settlementDate',
                    header: 'Date',
                    render: (s) => date(s.settlementDate),
                  },
                  {
                    key: 'settlementStatus',
                    header: 'Status',
                    render: (s) => (
                      <StatusBadge value={s.settlementStatus} />
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (s) => {
                      const pending = s.settlementStatus === 'PENDING'
                      const rejected = s.settlementStatus === 'REJECTED'

                      const stop = (fn) => (e) => {
                        e.stopPropagation()
                        fn()
                      }

                      return (
                        <div className="actions">
                          {pending && (
                            <Button
                              type="button"
                              size="sm"
                              variant="dark"
                              onClick={stop(() => setProc(s))}
                            >
                              Process
                            </Button>
                          )}

                          {pending && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={stop(() => setForm(s))}
                            >
                              Edit
                            </Button>
                          )}

                          {pending && (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={stop(() => openReject(s))}
                            >
                              Reject
                            </Button>
                          )}

                          {pending && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={stop(() => setDel(s))}
                            >
                              Delete
                            </Button>
                          )}

                          {!pending && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={stop(() => setView(s))}
                            >
                              {rejected ? 'View reason' : 'View'}
                            </Button>
                          )}
                        </div>
                      )
                    },
                  },
                ]}
              />
            )
          }
        </DataState>
      </Panel>

      {form && (
        <SettlementForm
          settlement={form.settlementNumber ? form : null}
          onClose={() => setForm(null)}
        />
      )}

      {view && (
        <Modal
          title={`Settlement #${view.settlementNumber}`}
          onClose={() => setView(null)}
          footer={
            <Button type="button" onClick={() => setView(null)}>
              Close
            </Button>
          }
        >
          <Details
            items={[
              ['Claim', `#${view.claimNumber}`],
              ['Amount', inr(view.amount)],
              ['Date', date(view.settlementDate)],
              ['Status', <StatusBadge value={view.settlementStatus} />],
              ...(normalizeStatus(view.settlementStatus) === 'REJECTED'
                ? [[
                    'Rejection reason',
                    view.rejectionReason || 'No rejection reason was provided.',
                  ]]
                : []),
            ]}
          />
        </Modal>
      )}

      {rejectTarget && (
        <Modal
          title={`Reject settlement #${rejectTarget.settlementNumber}`}
          onClose={closeReject}
          footer={
            <>
              <Button
                type="button"
                onClick={closeReject}
                disabled={reject.isPending}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="danger"
                loading={reject.isPending}
                disabled={!rejectionReason.trim()}
                onClick={submitRejection}
              >
                Confirm rejection
              </Button>
            </>
          }
        >
          <form className="stack" onSubmit={submitRejection}>
            {rejectError && (
              <div className="alert error" role="alert">
                {rejectError}
              </div>
            )}

            <div className="alert info">
              Settlement amount: <b>{inr(rejectTarget.amount)}</b>
              {' · '}
              Claim #{rejectTarget.claimNumber}
            </div>

            <div className="field">
              <label htmlFor="settlement-rejection-reason">
                Rejection reason <b aria-hidden="true">*</b>
              </label>

              <textarea
                id="settlement-rejection-reason"
                className="textarea"
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value.slice(0, 1000))
                  if (rejectError) setRejectError('')
                }}
                placeholder="Explain why this settlement is being rejected..."
                rows={5}
                maxLength={1000}
                required
                disabled={reject.isPending}
                style={{
                  width: '100%',
                  minHeight: 130,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />

              <small className="hint">
                {rejectionReason.length}/1000 characters. This reason will
                be saved and included in the customer notification.
              </small>
            </div>
          </form>
        </Modal>
      )}

      {proc && (
        <Confirm
          title="Process this settlement?"
          message={`This marks ${inr(proc.amount)} for claim #${proc.claimNumber} as paid and notifies the customer. It cannot be edited or deleted afterwards.`}
          confirmLabel={`Process ${inr(proc.amount)}`}
          loading={process.isPending}
          onClose={() => setProc(null)}
          onConfirm={() => process.mutate(proc)}
        />
      )}

      {del && (
        <Confirm
          danger
          title="Delete this settlement?"
          message={`Settlement #${del.settlementNumber} (${inr(del.amount)}) will be removed. The claim stays approved and can be settled again.`}
          confirmLabel="Delete settlement"
          loading={remove.isPending}
          onClose={() => setDel(null)}
          onConfirm={() => remove.mutate(del)}
        />
      )}
    </>
  )
}
