import {
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Wallet,
  ShieldCheck,
} from 'lucide-react'

import {
  claims,
  settlements,
} from '../../api/endpoints'

import {
  errorMessage,
} from '../../api/client'

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

import {
  date,
  inr,
  today,
} from '../../lib/format'

/* =========================================================
   INSUREX — ADMIN SETTLEMENTS

   Approved Claims
   Create Settlement
   Edit Pending Settlement
   Record Bank Transfer / Confirm Payment / Mark Failed
   Reject With Reason
   Delete Pending Settlement
   View Settlement Details
   Customer Notification Integration
   Automatic Data Synchronization
   Responsive Admin Interface

   Uses existing backend APIs.
========================================================= */

const SEARCH_FIELDS = [
  'settlementNumber',
  'claimNumber',
  'settlementStatus',
  'rejectionReason',
  'transactionReference',
]

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

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

  return []
}

function getClaimNumber(value) {
  return (
    value?.claimNumber ??
    value?.claim?.claimNumber ??
    null
  )
}

function positiveAmount(value) {
  const amount = Number(value)

  return Number.isFinite(amount) &&
    amount > 0
    ? amount
    : 0
}

function isPending(settlement) {
  return (
    normalizeStatus(
      settlement?.settlementStatus,
    ) === 'PENDING'
  )
}

function isProcessing(settlement) {
  return normalizeStatus(settlement?.settlementStatus) === 'PROCESSING'
}

function isFailed(settlement) {
  return normalizeStatus(settlement?.settlementStatus) === 'FAILED'
}

function isApprovedClaim(claim) {
  return (
    normalizeStatus(claim?.status) ===
    'APPROVED'
  )
}

function isUncertainError(error) {
  const status = error?.response?.status

  return (
    error?.insurexPaymentOutcomeUncertain === true ||
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    !error?.response ||
    status >= 500
  )
}

/* =========================================================
   SETTLEMENT FORM

   Named export preserved.
========================================================= */

export function SettlementForm({
  settlement,
  claim,
  onClose,
}) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const requestLock = useRef(false)

  const editing = Boolean(
    settlement?.settlementNumber,
  )

  const claimsQuery = useQuery({
    queryKey: ['a-claims'],
    queryFn: claims.getAll,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })

  const settlementsQuery = useQuery({
    queryKey: ['a-settlements'],
    queryFn: settlements.getAll,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })

  const [form, setForm] = useState({
    claimNumber:
      getClaimNumber(settlement) ??
      getClaimNumber(claim) ??
      '',

    amount:
      settlement?.amount ??
      claim?.approvedAmount ??
      '',

    settlementDate:
      settlement?.settlementDate ||
      today(),
  })

  const [formError, setFormError] =
    useState('')

  const [
    outcomeUncertain,
    setOutcomeUncertain,
  ] = useState(false)

  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  const claimsList = useMemo(
    () => normalizeRows(claimsQuery.data),
    [claimsQuery.data],
  )

  const settlementsList = useMemo(
    () => normalizeRows(
      settlementsQuery.data,
    ),
    [settlementsQuery.data],
  )

  const selectedClaim = useMemo(
    () =>
      claimsList.find(
        (item) =>
          String(getClaimNumber(item)) ===
          String(form.claimNumber),
      ) || null,
    [
      claimsList,
      form.claimNumber,
    ],
  )

  /* =======================================================
     ELIGIBLE CLAIMS

     A claim must be APPROVED.

     A new settlement cannot be created for a
     claim already linked to another settlement.

     The backend must enforce this rule too.
  ======================================================= */

  const eligibleClaims = useMemo(() => {
    return claimsList.filter((item) => {
      if (!isApprovedClaim(item)) {
        return false
      }

      const claimNumber =
        getClaimNumber(item)

      const isCurrent =
        editing &&
        String(claimNumber) ===
          String(
            getClaimNumber(settlement),
          )

      if (isCurrent) {
        return true
      }

      return !settlementsList.some(
        (existing) =>
          String(
            getClaimNumber(existing),
          ) === String(claimNumber),
      )
    })
  }, [
    claimsList,
    settlementsList,
    editing,
    settlement,
  ])

  /* =======================================================
     UPDATE CLAIM SELECTION
  ======================================================= */

  function selectClaim(event) {
    const claimNumber =
      event.target.value

    const selected = claimsList.find(
      (item) =>
        String(getClaimNumber(item)) ===
        String(claimNumber),
    )

    setForm((current) => ({
      ...current,
      claimNumber,
      amount:
        selected?.approvedAmount ??
        '',
    }))

    setFormError('')
  }

  /* =======================================================
     INVALIDATE RELATED DATA
  ======================================================= */

  async function refreshRelatedData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['a-settlements'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['a-claims'],
      }),
    ])
  }

  /* =======================================================
     CREATE OR UPDATE
  ======================================================= */

  const save = useMutation({
    mutationFn: (body) =>
      editing
        ? settlements.update(
            settlement.settlementNumber,
            body,
          )
        : settlements.save(body),

    retry: false,

    onSuccess: async () => {
      setFormError('')

      try {
        await refreshRelatedData()
      } catch {
        // The mutation succeeded even if
        // refreshing related data fails.
      }

      toast.success(
        editing
          ? 'Settlement updated successfully.'
          : 'Settlement created successfully.',
      )

      onClose()
    },

    onError: async (error) => {
      if (isUncertainError(error)) {
        setOutcomeUncertain(true)

        setFormError(
          'The server did not confirm the result. The settlement may have been saved. Do not submit again until you verify the latest settlement records.',
        )

        try {
          await refreshRelatedData()
        } catch {
          // Preserve the uncertainty warning.
        }

        return
      }

      setFormError(
        errorMessage(
          error,
          'Could not save this settlement.',
        ),
      )
    },

    onSettled: () => {
      requestLock.current = false
    },
  })

  /* =======================================================
     VALIDATION
  ======================================================= */

  function submit(event) {
    event?.preventDefault?.()

    if (
      requestLock.current ||
      save.isPending ||
      outcomeUncertain
    ) {
      return
    }

    if (
      claimsQuery.isPending ||
      settlementsQuery.isPending
    ) {
      setFormError(
        'Wait until claims and settlements finish loading.',
      )
      return
    }

    if (
      claimsQuery.isError ||
      settlementsQuery.isError
    ) {
      setFormError(
        'Unable to verify claim eligibility. Refresh the data before continuing.',
      )
      return
    }

    if (!form.claimNumber) {
      setFormError(
        'Choose an approved claim.',
      )
      return
    }

    if (!selectedClaim) {
      setFormError(
        'The selected claim could not be verified.',
      )
      return
    }

    if (!isApprovedClaim(selectedClaim)) {
      setFormError(
        'Only approved claims can receive a new or updated settlement.',
      )
      return
    }

    const alreadyAssigned =
      settlementsList.some(
        (existing) => {
          const sameClaim =
            String(
              getClaimNumber(existing),
            ) ===
            String(form.claimNumber)

          const differentSettlement =
            !editing ||
            String(
              existing.settlementNumber,
            ) !==
              String(
                settlement.settlementNumber,
              )

          return (
            sameClaim &&
            differentSettlement
          )
        },
      )

    if (alreadyAssigned) {
      setFormError(
        'This claim already has a settlement record.',
      )
      return
    }

    if (
      editing &&
      !isPending(settlement)
    ) {
      setFormError(
        'Only pending settlements can be edited.',
      )
      return
    }

    const amount = Number(form.amount)

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setFormError(
        'Enter a valid settlement amount greater than zero.',
      )
      return
    }

    const approvedAmount = Number(
      selectedClaim.approvedAmount,
    )

    if (
      selectedClaim.approvedAmount != null &&
      Number.isFinite(approvedAmount) &&
      amount > approvedAmount
    ) {
      setFormError(
        `Settlement amount cannot exceed the approved amount of ${inr(approvedAmount)}.`,
      )
      return
    }

    if (!form.settlementDate) {
      setFormError(
        'Choose a settlement date.',
      )
      return
    }

    setFormError('')
    requestLock.current = true

    save.mutate({
      claimNumber: Number(
        form.claimNumber,
      ),

      amount,

      settlementDate:
        form.settlementDate,
    })
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Modal
      title={
        editing
          ? `Edit settlement #${settlement.settlementNumber}`
          : 'New settlement'
      }
      onClose={
        save.isPending
          ? () => {}
          : onClose
      }
      footer={
        <div className="ix-settlement-modal-actions">
          <Button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
          >
            {outcomeUncertain
              ? 'Close'
              : 'Cancel'}
          </Button>

          {!outcomeUncertain && (
            <Button
              type="button"
              variant="dark"
              loading={save.isPending}
              disabled={
                save.isPending ||
                claimsQuery.isPending ||
                settlementsQuery.isPending ||
                claimsQuery.isError ||
                settlementsQuery.isError
              }
              onClick={submit}
            >
              {editing
                ? 'Save changes'
                : 'Create settlement'}
            </Button>
          )}
        </div>
      }
    >
      <div className="stack">
        {/* ERROR */}

        {formError && (
          <div
            className="alert error"
            role="alert"
          >
            <AlertCircle size={17} />

            <span>
              {formError}
            </span>
          </div>
        )}

        {/* CLAIM SELECT */}

        <SelectInput
          label="Approved claim"
          value={form.claimNumber}
          onChange={selectClaim}
          disabled={
            editing ||
            Boolean(claim) ||
            save.isPending ||
            outcomeUncertain
          }
          placeholder={
            claimsQuery.isPending
              ? 'Loading approved claims…'
              : eligibleClaims.length
                ? 'Choose a claim…'
                : 'No approved claims waiting'
          }
          options={eligibleClaims.map(
            (item) => ({
              value:
                getClaimNumber(item),

              label:
                `#${getClaimNumber(item)} · ` +
                `policy #${item.policyNumber ?? '—'} · ` +
                `approved ${inr(item.approvedAmount)}`,
            }),
          )}
        />

        {/* APPROVED CLAIM DETAILS */}

        {selectedClaim && (
          <div className="alert info">
            <ShieldCheck size={17} />

            <span>
              Approved amount:{' '}
              <strong>
                {inr(
                  selectedClaim.approvedAmount,
                )}
              </strong>

              {' · '}Claimed:{' '}

              <strong>
                {inr(
                  selectedClaim.amount,
                )}
              </strong>
            </span>
          </div>
        )}

        {/* SETTLEMENT AMOUNT */}

        <TextInput
          label="Settlement amount (₹)"
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          disabled={
            save.isPending ||
            outcomeUncertain
          }
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              amount:
                event.target.value,
            }))

            setFormError('')
          }}
        />

        {/* SETTLEMENT DATE */}

        <TextInput
          label="Settlement date"
          type="date"
          value={form.settlementDate}
          disabled={
            save.isPending ||
            outcomeUncertain
          }
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              settlementDate:
                event.target.value,
            }))

            setFormError('')
          }}
        />

        {/* INFORMATION */}

        <div className="alert info">
          <Clock3 size={17} />

          <span>
            Creating a settlement records
            the approved payout amount.
            Processing the settlement
            changes its status according
            to your backend workflow.
          </span>
        </div>
      </div>
    </Modal>
  )
}

/* =========================================================
   ADMIN SETTLEMENTS PAGE
========================================================= */

export default function Settlements() {
  const queryClient = useQueryClient()
  const toast = useToast()

  /* =======================================================
     STATE
  ======================================================= */

  const [status, setStatus] =
    useState('all')

  const [form, setForm] =
    useState(null)

  const [viewId, setViewId] =
    useState(null)

  const [transferId, setTransferId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [failId, setFailId] = useState(null)
  const [transferReference, setTransferReference] = useState('')
  const [transferDate, setTransferDate] = useState(today())
  const [confirmationRemarks, setConfirmationRemarks] = useState('')
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const [actionError, setActionError] = useState('')

  const [deleteId, setDeleteId] =
    useState(null)

  const [rejectId, setRejectId] =
    useState(null)

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState('')

  const [
    rejectError,
    setRejectError,
  ] = useState('')

  const [pageError, setPageError] =
    useState('')

  const [verifyingAction, setVerifyingAction] = useState(false)

  const [
    uncertainActions,
    setUncertainActions,
  ] = useState(() => new Set())

  const actionLock = useRef(false)

  /* =======================================================
     FETCH SETTLEMENTS
  ======================================================= */

  const q = useQuery({
    queryKey: ['a-settlements'],

    queryFn: settlements.getAll,

    staleTime: 10_000,

    refetchOnMount: 'always',

    refetchOnWindowFocus: true,

    refetchOnReconnect: true,

    refetchInterval: 30_000,

    refetchIntervalInBackground: false,
  })

  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  const all = useMemo(
    () =>
      normalizeRows(q.data).map(
        (settlement) => ({
          ...settlement,

          claimNumber:
            getClaimNumber(settlement),

          settlementStatus:
            normalizeStatus(
              settlement.settlementStatus,
            ),
        }),
      ),
    [q.data],
  )

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    search,
    setSearch,
    searched,
  ] = useFilter(
    all,
    SEARCH_FIELDS,
  )

  /* =======================================================
     FILTERED ROWS
  ======================================================= */

  const rows = useMemo(
    () =>
      (searched || [])
        .filter(
          (settlement) =>
            status === 'all' ||
            settlement.settlementStatus ===
              status,
        )
        .slice()
        .sort(
          (a, b) =>
            Number(
              b.settlementNumber || 0,
            ) -
            Number(
              a.settlementNumber || 0,
            ),
        ),
    [
      searched,
      status,
    ],
  )

  /* =======================================================
     LATEST SELECTED RECORDS
  ======================================================= */

  function findSettlement(id) {
    if (id == null) {
      return null
    }

    return (
      all.find(
        (item) =>
          String(item.settlementNumber) ===
          String(id),
      ) || null
    )
  }

  const viewed = findSettlement(viewId)

  const transferring = findSettlement(transferId)
  const confirming = findSettlement(confirmId)
  const failing = findSettlement(failId)

  const deleting = findSettlement(
    deleteId,
  )

  const rejecting = findSettlement(
    rejectId,
  )

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const result = {
      pendingCount: 0,
      pendingAmount: 0,

      processingCount: 0,
      processingAmount: 0,
      failedCount: 0,
      failedAmount: 0,

      settledCount: 0,
      settledAmount: 0,

      rejectedCount: 0,
      rejectedAmount: 0,

      totalCount: all.length,
      totalAmount: 0,
    }

    for (const settlement of all) {
      const amount = positiveAmount(
        settlement.amount,
      )

      result.totalAmount += amount

      switch (
        settlement.settlementStatus
      ) {
        case 'PENDING':
          result.pendingCount += 1
          result.pendingAmount += amount
          break

        case 'PROCESSING':
          result.processingCount += 1
          result.processingAmount += amount
          break

        case 'FAILED':
          result.failedCount += 1
          result.failedAmount += amount
          break

        case 'SETTLED':
          result.settledCount += 1
          result.settledAmount += amount
          break

        case 'REJECTED':
          result.rejectedCount += 1
          result.rejectedAmount += amount
          break

        default:
          break
      }
    }

    return result
  }, [all])

  /* =======================================================
     INVALIDATE RELATED DATA
  ======================================================= */

  async function refreshRelatedData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['a-settlements'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['a-claims'],
      }),
    ])
  }

  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  async function refreshSettlements() {
    setPageError('')

    try {
      const result = await q.refetch()

      if (result.error) {
        throw result.error
      }

      await queryClient.invalidateQueries({
        queryKey: ['a-claims'],
        refetchType: 'active',
      })
    } catch (error) {
      setPageError(
        errorMessage(
          error,
          'Unable to refresh settlements.',
        ),
      )
    }
  }

  /* =======================================================
     ACTION HELPERS
  ======================================================= */

  function actionKey(action, id) {
    return `${action}:${id}`
  }

  function markUncertain(action, id) {
    const key = actionKey(action, id)

    setUncertainActions((current) => {
      const next = new Set(current)
      next.add(key)
      return next
    })
  }

  function actionBlocked(action, id) {
    return uncertainActions.has(actionKey(action, id))
  }

  // A timeout or server error does not prove a financial action failed.
  // Allow a deliberate retry only after a successful fresh server read
  // verifies that the record is still in the expected source state.
  async function verifyUncertainActions() {
    if (verifyingAction || busy) return
    setVerifyingAction(true)
    setPageError('')
    try {
      const latest = normalizeRows(await settlements.getAll())
      const remaining = new Set()
      const messages = []
      for (const key of uncertainActions) {
        const separator = key.indexOf(':')
        const action = key.slice(0, separator)
        const id = key.slice(separator + 1)
        const record = latest.find(item => String(item.settlementNumber) === id)
        const currentStatus = normalizeStatus(record?.settlementStatus)
        const expected = {
          transfer: ['PENDING', 'FAILED'],
          confirm: ['PROCESSING'],
          fail: ['PROCESSING'],
          reject: ['PENDING'],
          delete: ['PENDING'],
        }[action] || []
        if (!record) {
          remaining.add(key)
          messages.push(`Settlement #${id} is no longer present. Verify its history before proceeding.`)
        } else if (expected.includes(currentStatus)) {
          // Fresh data shows the operation has not advanced its status.
          // The admin may explicitly submit again if appropriate.
        } else {
          remaining.add(key)
          messages.push(`Settlement #${id} is now ${currentStatus}. Review it before another action.`)
        }
      }
      setUncertainActions(remaining)
      await queryClient.invalidateQueries({ queryKey: ['a-settlements'] })
      await queryClient.invalidateQueries({ queryKey: ['a-claims'] })
      setActionError('')
      setRejectError('')
      setPageError(messages.length ? messages.join(' ') : 'Latest settlement states verified. Review the records before submitting another action.')
    } catch (error) {
      setPageError(errorMessage(error, 'Unable to verify the latest settlement states. Actions remain blocked.'))
    } finally {
      setVerifyingAction(false)
    }
  }

     /* =======================================================
      MANUAL BANK TRANSFER ACTIONS
   ======================================================= */

   const bankAction = useMutation({
     mutationFn: async ({ action, id, body }) => {
       const latest = await settlements.get(id)
       const currentStatus = normalizeStatus(latest?.settlementStatus)
       const allowed = {
         transfer: ['PENDING', 'FAILED'],
         confirm: ['PROCESSING'],
         fail: ['PROCESSING'],
       }[action] || []
       if (!allowed.includes(currentStatus)) {
         const error = new Error(`Settlement is now ${currentStatus || 'unavailable'}. Refresh and review before continuing.`)
         error.insurexPreflightError = true
         throw error
       }
       if (action === 'confirm' && (!latest.transactionReference || !latest.transferDate)) {
         const error = new Error('Bank reference or transfer date is missing. Confirmation is blocked.')
         error.insurexPreflightError = true
         throw error
       }
       if (action === 'transfer') return settlements.transfer(id, body)
       if (action === 'confirm') return settlements.confirm(id, body)
       if (action === 'fail') return settlements.fail(id, body.reason)
       throw new Error('Unsupported settlement action.')
     },
     retry: false,
     onSuccess: async (_data, variables) => {
       setTransferId(null)
       setConfirmId(null)
       setFailId(null)
       setActionError('')
       setPageError('')
       setTransferReference('')
       setConfirmationRemarks('')
       setFailureReason('')
       setPaymentVerified(false)
       try { await refreshRelatedData() } catch { /* Mutation succeeded. */ }
       toast.success({
         transfer: 'Bank transfer recorded. Awaiting confirmation.',
         confirm: 'Settlement confirmed by administrator.',
         fail: 'Transfer failure recorded. Claim remains approved.',
       }[variables.action])
     },
     onError: async (error, variables) => {
       if (!error?.insurexPreflightError && isUncertainError(error)) {
         markUncertain(variables.action, variables.id)
         setActionError('The server response is uncertain. Check the refreshed settlement record before taking another action.')
         try { await refreshRelatedData() } catch { /* Keep warning. */ }
       } else {
         setActionError(errorMessage(error, 'Unable to update settlement.'))
       }
     },
     onSettled: () => { actionLock.current = false },
   })

   function submitBankAction(action, settlement, body) {
     if (!settlement || actionLock.current || bankAction.isPending ||
         actionBlocked(action, settlement.settlementNumber)) return
     setActionError('')
     actionLock.current = true
     bankAction.mutate({ action, id: settlement.settlementNumber, body })
   }

   function submitTransfer() {
     if (!transferring || !(isPending(transferring) || isFailed(transferring))) return
     const reference = transferReference.trim()
     if (!reference || reference.length > 150) {
       setActionError('Enter a bank reference / UTR (maximum 150 characters).')
       return
     }
     if (!transferDate || transferDate > today()) {
       setActionError('Enter a valid transfer date that is not in the future.')
       return
     }
     submitBankAction('transfer', transferring, {
       transactionReference: reference,
       transferDate,
     })
   }

   function submitConfirmation() {
     if (!confirming || !isProcessing(confirming)) return
     if (!paymentVerified || !confirmationRemarks.trim()) {
       setActionError('Verify the bank payment and enter confirmation evidence before proceeding.')
       return
     }
     submitBankAction('confirm', confirming, {
       paymentVerified: true,
       confirmationRemarks: confirmationRemarks.trim(),
     })
   }

   function submitFailure() {
     if (!failing || !isProcessing(failing)) return
     if (!failureReason.trim()) {
       setActionError('Enter a reason why the bank transfer failed.')
       return
     }
     submitBankAction('fail', failing, { reason: failureReason.trim() })
   }

/* =======================================================
     DELETE SETTLEMENT
  ======================================================= */

  const remove = useMutation({
    mutationFn: (settlementNumber) =>
      settlements.remove(
        settlementNumber,
      ),

    retry: false,

    onSuccess: async () => {
      setDeleteId(null)
      setPageError('')

      try {
        await refreshRelatedData()
      } catch {
        // Deletion already succeeded.
      }

      toast.success(
        'Settlement deleted successfully.',
      )
    },

    onError: async (error, id) => {
      setDeleteId(null)

      if (isUncertainError(error)) {
        markUncertain('delete', id)

        setPageError(
          `Deletion of settlement #${id} could not be confirmed. Refresh before retrying.`,
        )

        try {
          await refreshRelatedData()
        } catch {
          // Preserve the warning.
        }

        return
      }

      toast.error(
        errorMessage(
          error,
          'Could not delete settlement.',
        ),
      )
    },

    onSettled: () => {
      actionLock.current = false
    },
  })

  /* =======================================================
     REJECT SETTLEMENT
  ======================================================= */

  const reject = useMutation({
    mutationFn: ({
      settlementNumber,
      rejectionReason: reason,
    }) =>
      settlements.reject(
        settlementNumber,
        reason,
      ),

    retry: false,

    onSuccess: async () => {
      setRejectId(null)
      setRejectionReason('')
      setRejectError('')
      setPageError('')

      try {
        await refreshRelatedData()
      } catch {
        // Rejection already succeeded.
      }

      toast.success(
        'Settlement rejected successfully.',
      )
    },

    onError: async (
      error,
      variables,
    ) => {
      if (isUncertainError(error)) {
        markUncertain(
          'reject',
          variables.settlementNumber,
        )

        setRejectError(
          'The rejection outcome could not be confirmed. Refresh the settlement status before taking further action.',
        )

        try {
          await refreshRelatedData()
        } catch {
          // Preserve the warning.
        }

        return
      }

      setRejectError(
        errorMessage(
          error,
          'Could not reject this settlement.',
        ),
      )
    },

    onSettled: () => {
      actionLock.current = false
    },
  })

  /* =======================================================
     DELETE ACTION
  ======================================================= */

  function submitDelete() {
    if (
      !deleting ||
      !isPending(deleting) ||
      actionLock.current ||
      remove.isPending ||
      actionBlocked(
        'delete',
        deleting.settlementNumber,
      )
    ) {
      return
    }

    actionLock.current = true

    remove.mutate(
      deleting.settlementNumber,
    )
  }

  /* =======================================================
     REJECT ACTION
  ======================================================= */

  function openReject(settlement) {
    setRejectId(
      settlement.settlementNumber,
    )

    setRejectionReason('')
    setRejectError('')
  }

  function closeReject() {
    if (reject.isPending) {
      return
    }

    setRejectId(null)
    setRejectionReason('')
    setRejectError('')
  }

  function submitRejection(event) {
    event?.preventDefault?.()

    if (
      !rejecting ||
      !isPending(rejecting) ||
      reject.isPending ||
      actionLock.current ||
      actionBlocked(
        'reject',
        rejecting.settlementNumber,
      )
    ) {
      return
    }

    const reason =
      rejectionReason.trim()

    if (!reason) {
      setRejectError(
        'Please enter a rejection reason.',
      )
      return
    }

    if (reason.length > 1000) {
      setRejectError(
        'The rejection reason cannot exceed 1000 characters.',
      )
      return
    }

    actionLock.current = true
    setRejectError('')

    reject.mutate({
      settlementNumber:
        rejecting.settlementNumber,

      rejectionReason: reason,
    })
  }

  /* =======================================================
     GLOBAL ACTION STATUS
  ======================================================= */

  const busy =
    bankAction.isPending ||
    remove.isPending ||
    reject.isPending

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <PageHeader
        title="Settlements"
        subtitle="Manage settlements for approved insurance claims."
      >
        <Button
          type="button"
          variant="primary"
          icon="plus"
          disabled={busy}
          onClick={() =>
            setForm({})
          }
        >
          New settlement
        </Button>

        <Button
          type="button"
          onClick={refreshSettlements}
          disabled={
            q.isFetching ||
            busy
          }
        >
          <RefreshCw size={16} />

          {q.isFetching
            ? 'Refreshing…'
            : 'Refresh'}
        </Button>
        {uncertainActions.size > 0 && (
          <Button type="button" disabled={verifyingAction || busy} onClick={verifyUncertainActions}>
            {verifyingAction ? 'Verifying…' : 'Verify uncertain actions'}
          </Button>
        )}
      </PageHeader>

      {/* ===================================================
          PAGE ERROR
      =================================================== */}

      {pageError && (
        <div
          className="alert error"
          role="alert"
        >
          <AlertCircle size={17} />

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
          SUMMARY LEDGER
      =================================================== */}

      <div className="ledger ix-settlement-ledger">
        <div>
          <div className="label">
            Pending
          </div>

          <div className="value">
            {q.isPending
              ? '…'
              : summary.pendingCount}
          </div>

          <div className="sub">
            {inr(summary.pendingAmount)}
            {' '}awaiting processing
          </div>
        </div>

        <div>
          <div className="label">Processing</div>
          <div className="value">{q.isPending ? '…' : summary.processingCount}</div>
          <div className="sub">{inr(summary.processingAmount)} awaiting bank confirmation</div>
        </div>

        <div>
          <div className="label">Failed</div>
          <div className="value">{q.isPending ? '…' : summary.failedCount}</div>
          <div className="sub">{inr(summary.failedAmount)} eligible for transfer retry</div>
        </div>

        <div>
          <div className="label">
            Settled
          </div>

          <div className="value">
            {q.isPending
              ? '…'
              : summary.settledCount}
          </div>

          <div className="sub">
            {inr(summary.settledAmount)}
            {' '}recorded as settled
          </div>
        </div>

        <div>
          <div className="label">
            Rejected
          </div>

          <div className="value">
            {q.isPending
              ? '…'
              : summary.rejectedCount}
          </div>

          <div className="sub">
            {inr(summary.rejectedAmount)}
            {' '}rejected
          </div>
        </div>

        <div>
          <div className="label">
            All settlements
          </div>

          <div className="value">
            {q.isPending
              ? '…'
              : summary.totalCount}
          </div>

          <div className="sub">
            Total recorded:{' '}
            {inr(summary.totalAmount)}
          </div>
        </div>
      </div>

      {/* ===================================================
          RESPONSIVE STYLES
      =================================================== */}

      <style>{`
        .ix-settlement-ledger {
          margin-bottom: 20px;
        }

        .ix-settlement-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ix-settlement-table {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ix-settlement-table .table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
        }

        .ix-settlement-table table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
        }

        .ix-settlement-table th,
        .ix-settlement-table td {
          padding: 14px 15px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .ix-settlement-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: nowrap;
          gap: 6px;
        }

        .ix-settlement-actions button {
          flex-shrink: 0;
          white-space: nowrap;
        }

        .ix-settlement-modal-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 700px) {
          .ix-settlement-table table {
            min-width: 800px;
          }

          .ix-settlement-table th,
          .ix-settlement-table td {
            padding: 12px 11px;
          }

          .ix-settlement-modal-actions {
            justify-content: stretch;
          }

          .ix-settlement-modal-actions > * {
            flex: 1;
          }
        }
      `}</style>

      {/* ===================================================
          SETTLEMENTS TABLE
      =================================================== */}

      <Panel flush>
        <div className="toolbar ix-settlement-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search settlement, claim or rejection reason"
          />

          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              {
                value: 'all',
                label: 'All',
              },
              {
                value: 'PENDING',
                label: 'Pending',
              },
              {
                value: 'PROCESSING',
                label: 'Processing',
              },
              {
                value: 'FAILED',
                label: 'Failed',
              },
              {
                value: 'SETTLED',
                label: 'Settled',
              },
              {
                value: 'REJECTED',
                label: 'Rejected',
              },
            ]}
          />
        </div>

        <DataState
          query={q}
          empty={{
            title: 'No settlements yet',
            text: 'Create a settlement after approving an insurance claim.',
          }}
          emptyAction={
            <Button
              type="button"
              variant="dark"
              onClick={() =>
                setForm({})
              }
            >
              New settlement
            </Button>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>
                  No matching settlements
                </h4>

                <p className="muted">
                  Try changing the search
                  term or status filter.
                </p>

                <Button
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className="ix-settlement-table"
                role="region"
                aria-label="Admin settlements table"
                tabIndex={0}
              >
                <Table
                  rowKey="settlementNumber"
                  rows={rows}
                  onRowClick={(settlement) =>
                    setViewId(
                      settlement.settlementNumber,
                    )
                  }
                  columns={[
                    {
                      key: 'settlementNumber',
                      header: 'Settlement',
                      render: (s) => (
                        <b>
                          #{s.settlementNumber}
                        </b>
                      ),
                    },

                    {
                      key: 'claimNumber',
                      header: 'Claim',
                      render: (s) =>
                        `#${s.claimNumber}`,
                    },

                    {
                      key: 'amount',
                      header: 'Amount',
                      render: (s) => (
                        <strong>
                          {inr(s.amount)}
                        </strong>
                      ),
                    },

                    {
                      key: 'settlementDate',
                      header: 'Date',
                      render: (s) =>
                        date(
                          s.settlementDate,
                        ),
                    },

                    {
                      key: 'settlementStatus',
                      header: 'Status',
                      render: (s) => (
                        <StatusBadge
                          value={
                            s.settlementStatus
                          }
                        />
                      ),
                    },

                    {
                      key: 'actions',
                      header: '',
                      align: 'right',

                      render: (s) => {
                        const pending =
                          isPending(s)

                        const rejected =
                          s.settlementStatus ===
                          'REJECTED'

                        const blocked =
                          busy

                        function stop(
                          event,
                          action,
                        ) {
                          event?.stopPropagation?.()

                          action()
                        }

                        return (
                          <div className="ix-settlement-actions">

                             {(pending || isFailed(s)) && (
                               <Button
                                 type="button"
                                 size="sm"
                                 variant="dark"
                                 disabled={blocked || actionBlocked('transfer', s.settlementNumber)}
                                 onClick={(event) => stop(event, () => {
                                   setActionError('')
                                   setTransferReference('')
                                   setTransferDate(today())
                                   setTransferId(s.settlementNumber)
                                 })}
                               >
                                 {isFailed(s) ? 'Retry transfer' : 'Record transfer'}
                               </Button>
                             )}
                             {isProcessing(s) && (
                               <>
                                 <Button type="button" size="sm" variant="dark"
                                   disabled={blocked || actionBlocked('confirm', s.settlementNumber)}
                                   onClick={(event) => stop(event, () => {
                                     setActionError('')
                                     setPaymentVerified(false)
                                     setConfirmationRemarks('')
                                     setConfirmId(s.settlementNumber)
                                   })}>
                                   Confirm payment
                                 </Button>
                                 <Button type="button" size="sm" variant="danger"
                                   disabled={blocked || actionBlocked('fail', s.settlementNumber)}
                                   onClick={(event) => stop(event, () => {
                                     setActionError('')
                                     setFailureReason('')
                                     setFailId(s.settlementNumber)
                                   })}>
                                   Mark failed
                                 </Button>
                               </>
                             )}

                            {pending && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={blocked}
                                onClick={(event) =>
                                  stop(
                                    event,
                                    () => setForm(s),
                                  )
                                }
                              >
                                Edit
                              </Button>
                            )}

                            {pending && (
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                disabled={
                                  blocked ||
                                  actionBlocked(
                                    'reject',
                                    s.settlementNumber,
                                  )
                                }
                                onClick={(event) =>
                                  stop(
                                    event,
                                    () => openReject(s),
                                  )
                                }
                              >
                                Reject
                              </Button>
                            )}

                            {pending && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={
                                  blocked ||
                                  actionBlocked(
                                    'delete',
                                    s.settlementNumber,
                                  )
                                }
                                onClick={(event) =>
                                  stop(
                                    event,
                                    () => setDeleteId(
                                      s.settlementNumber,
                                    ),
                                  )
                                }
                              >
                                Delete
                              </Button>
                            )}

                            {!pending && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={(event) =>
                                  stop(
                                    event,
                                    () => setViewId(
                                      s.settlementNumber,
                                    ),
                                  )
                                }
                              >
                                {rejected
                                  ? 'View reason'
                                  : 'View'}
                              </Button>
                            )}
                          </div>
                        )
                      },
                    },
                  ]}
                />
              </div>
            )
          }
        </DataState>
      </Panel>

      {/* ===================================================
          CREATE / EDIT FORM
      =================================================== */}

      {form && (
        <SettlementForm
          key={
            form.settlementNumber ||
            'new'
          }
          settlement={
            form.settlementNumber
              ? form
              : null
          }
          onClose={() =>
            setForm(null)
          }
        />
      )}

      {/* ===================================================
          SETTLEMENT DETAILS
      =================================================== */}

      {viewed && (
        <Modal
          title={`Settlement #${viewed.settlementNumber}`}
          onClose={() =>
            setViewId(null)
          }
          footer={
            <Button
              type="button"
              onClick={() =>
                setViewId(null)
              }
            >
              Close
            </Button>
          }
        >
          <Details
            items={[
              [
                'Settlement',
                `#${viewed.settlementNumber}`,
              ],
              [
                'Claim',
                `#${viewed.claimNumber}`,
              ],
              [
                'Amount',
                inr(viewed.amount),
              ],
              [
                'Settlement date',
                date(
                  viewed.settlementDate,
                ),
              ],
              [
                'Status',
                <StatusBadge
                  value={
                    viewed.settlementStatus
                  }
                />,
              ],
              ['Bank reference', viewed.transactionReference || '—'],
              ['Transfer date', viewed.transferDate ? date(viewed.transferDate) : '—'],
              ['Recorded by', viewed.transferRecordedBy || '—'],
              ['Confirmed by', viewed.confirmedBy || '—'],
              ['Confirmed at', viewed.confirmedAt || '—'],
              ['Confirmation remarks', viewed.confirmationRemarks || '—'],
              ...(
                ['REJECTED', 'FAILED'].includes(viewed.settlementStatus)
                  ? [[
                      viewed.settlementStatus === 'FAILED' ? 'Failure reason' : 'Rejection reason',
                      viewed.rejectionReason ||
                        'No rejection reason was provided.',
                    ]]
                  : []
              ),
            ]}
          />

          {viewed.settlementStatus ===
            'SETTLED' && (
            <div
              className="alert success"
              style={{
                marginTop: 16,
              }}
            >
              <CheckCircle2 size={17} />

              <span>
                This settlement is recorded
                as settled by the backend.
              </span>
            </div>
          )}
        </Modal>
      )}

      {/* ===================================================
          REJECT SETTLEMENT
      =================================================== */}

      {rejecting && (
        <Modal
          title={`Reject settlement #${rejecting.settlementNumber}`}
          onClose={closeReject}
          footer={
            <div className="ix-settlement-modal-actions">
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
                disabled={
                  reject.isPending ||
                  !rejectionReason.trim() ||
                  actionBlocked(
                    'reject',
                    rejecting.settlementNumber,
                  )
                }
                onClick={submitRejection}
              >
                Confirm rejection
              </Button>
            </div>
          }
        >
          <form
            className="stack"
            onSubmit={submitRejection}
          >
            {rejectError && (
              <div
                className="alert error"
                role="alert"
              >
                <AlertCircle size={17} />

                <span>
                  {rejectError}
                </span>
              </div>
            )}

            <div className="alert info">
              <Wallet size={17} />

              <span>
                Settlement amount:{' '}
                <strong>
                  {inr(
                    rejecting.amount,
                  )}
                </strong>

                {' · '}Claim{' '}

                <strong>
                  #{rejecting.claimNumber}
                </strong>
              </span>
            </div>

            <div className="field">
              <label htmlFor="settlement-rejection-reason">
                Rejection reason *
              </label>

              <textarea
                id="settlement-rejection-reason"
                className="textarea"
                value={rejectionReason}
                onChange={(event) => {
                  setRejectionReason(
                    event.target.value.slice(
                      0,
                      1000,
                    ),
                  )

                  setRejectError('')
                }}
                placeholder="Explain why this settlement is being rejected..."
                rows={5}
                maxLength={1000}
                required
                disabled={
                  reject.isPending ||
                  actionBlocked(
                    'reject',
                    rejecting.settlementNumber,
                  )
                }
                style={{
                  width: '100%',
                  minHeight: 130,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />

              <small className="hint">
                {rejectionReason.length}/1000
                {' '}characters.
                The backend records this
                reason and handles any
                customer notification.
              </small>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================
          MANUAL BANK TRANSFER ACTIONS
      =================================================== */}

             {transferring && (
         <Modal title={`Record bank transfer · #${transferring.settlementNumber}`}
           onClose={() => { if (!bankAction.isPending) { setTransferId(null); setActionError('') } }}
           footer={<div className="ix-settlement-modal-actions">
             <Button disabled={bankAction.isPending} onClick={() => setTransferId(null)}>Cancel</Button>
             <Button variant="dark" loading={bankAction.isPending}
               disabled={bankAction.isPending || actionBlocked('transfer', transferring.settlementNumber)}
               onClick={submitTransfer}>Record transfer</Button>
           </div>}>
           <div className="stack">
             <div className="alert info">Recording a transfer does not mark the claim settled. Check the bank reference before saving.</div>
             {actionError && <div className="alert error" role="alert">{actionError}</div>}
             <TextInput label="Bank reference / UTR" value={transferReference}
               disabled={bankAction.isPending} onChange={e => setTransferReference(e.target.value.slice(0,150))} />
             <TextInput label="Transfer date" type="date" value={transferDate}
               disabled={bankAction.isPending} onChange={e => setTransferDate(e.target.value)} />
           </div>
         </Modal>
       )}

       {confirming && (
         <Modal title={`Confirm settlement · #${confirming.settlementNumber}`}
           onClose={() => { if (!bankAction.isPending) { setConfirmId(null); setActionError('') } }}
           footer={<div className="ix-settlement-modal-actions">
             <Button disabled={bankAction.isPending} onClick={() => setConfirmId(null)}>Cancel</Button>
             <Button variant="dark" loading={bankAction.isPending}
               disabled={bankAction.isPending || !paymentVerified || !confirmationRemarks.trim() || actionBlocked('confirm', confirming.settlementNumber)}
               onClick={submitConfirmation}>Confirm payment</Button>
           </div>}>
           <div className="stack">
             <div className="alert info">Confirm only after independently checking the bank statement or transfer receipt. This is an administrator attestation, not automatic bank verification.</div>
             <Details items={[
               ['Claim', `#${confirming.claimNumber}`],
               ['Amount', inr(confirming.amount)],
               ['Bank reference', confirming.transactionReference || 'Missing'],
               ['Transfer date', date(confirming.transferDate)],
             ]} />
             {actionError && <div className="alert error" role="alert">{actionError}</div>}
             <div className="field">
               <label htmlFor="ix-confirmation-remarks">How was payment verified? *</label>
               <textarea id="ix-confirmation-remarks" className="textarea" rows={3} maxLength={1000}
                 style={{width:'100%',boxSizing:'border-box'}} value={confirmationRemarks}
                 onChange={e => setConfirmationRemarks(e.target.value)} disabled={bankAction.isPending} />
             </div>
             <label style={{display:'flex',gap:10,alignItems:'flex-start'}}>
               <input type="checkbox" checked={paymentVerified} disabled={bankAction.isPending}
                 onChange={e => setPaymentVerified(e.target.checked)} />
               I checked the bank records and confirm this transfer succeeded.
             </label>
           </div>
         </Modal>
       )}

       {failing && (
         <Modal title={`Record transfer failure · #${failing.settlementNumber}`}
           onClose={() => { if (!bankAction.isPending) { setFailId(null); setActionError('') } }}
           footer={<div className="ix-settlement-modal-actions">
             <Button disabled={bankAction.isPending} onClick={() => setFailId(null)}>Cancel</Button>
             <Button variant="danger" loading={bankAction.isPending}
               disabled={bankAction.isPending || !failureReason.trim() || actionBlocked('fail', failing.settlementNumber)}
               onClick={submitFailure}>Mark transfer failed</Button>
           </div>}>
           <div className="stack">
             <div className="alert info">The claim stays APPROVED. The settlement can be retried with a new bank transfer reference.</div>
             {actionError && <div className="alert error" role="alert">{actionError}</div>}
             <div className="field">
               <label htmlFor="ix-failure-reason">Bank failure reason *</label>
               <textarea id="ix-failure-reason" className="textarea" rows={4} maxLength={1000}
                 style={{width:'100%',boxSizing:'border-box'}} value={failureReason}
                 onChange={e => setFailureReason(e.target.value)} disabled={bankAction.isPending} />
             </div>
           </div>
         </Modal>
       )}

      {/* ===================================================
          DELETE CONFIRMATION
      =================================================== */}

      {deleting && (
        <Confirm
          danger
          title="Delete this settlement?"
          message={
            `Delete settlement #${deleting.settlementNumber} ` +
            `for ${inr(deleting.amount)}? ` +
            'Only pending settlements should be deleted.'
          }
          confirmLabel="Delete settlement"
          loading={remove.isPending}
          onClose={() => {
            if (!remove.isPending) {
              setDeleteId(null)
            }
          }}
          onConfirm={submitDelete}
        />
      )}
    </>
  )
}
