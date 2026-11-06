// =========================================================
// INSUREX — MY POLICIES
// =========================================================
// Styles live in style.css (Part B sections 07 + Part M).
// This component has no inline <style> block.
//
// Features:
// - Health, Family, Life and Motor plan filters
// - Duplicate policy prevention
// - Coverage amount and premium display
// - Family member, vehicle and beneficiary details
// - Active, claimed, renewed, inactive and expired policies
// - Refund pending, processing, refunded and failed statuses
// - Claim eligibility and pending claim detection
// - Renewal navigation and duplicate renewal prevention
// - Automatic refresh for unresolved refunds
// - Search and URL-synchronized filters
// - Existing API calls and ClaimForm integration preserved
// =========================================================

import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import {
  AlertCircle,
  CarFront,
  CheckCircle2,
  Clock3,
  HeartPulse,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Users,
  UserRound,
  UserCheck,
  CalendarDays,
  IndianRupee,
} from 'lucide-react'

import {
  claims,
  policies,
  purchases,
} from '../../api/endpoints'

import {
  Button,
  DataState,
  PageHeader,
  Panel,
  Segmented,
  StatusBadge,
  SearchBox,
  useFilter,
} from '../../components/ui'

import { date, today } from '../../lib/format'
import ClaimForm from './ClaimForm'

/* =========================================================
   CONSTANTS
========================================================= */

const FIELDS = [
  'policyNumber',
  'coveredTypes',
  'status',
  'lifecycleStatus',
  'refundStatus',
  'category',
  'planCategory',
  'policyCategory',
  'policyType',
  'planType',
  'insuranceType',
  'productType',
  'planName',
  'vehicleRegistrationNumber',
  'registrationNumber',
  'vehicleNumber',
  'vehicleModel',
  'sumInsured',
  'coverageAmount',
  'premiumAmount',
  'familyMembers',
  'beneficiaries',
]

const SUCCESSFUL_CLAIM_STATUSES = new Set([
  'APPROVED',
  'SETTLED',
])

const PENDING_CLAIM_STATUSES = new Set([
  'PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
])

const REFUND_PENDING_STATUSES = new Set([
  'REFUND_PENDING',
  'PENDING',
  'REFUND_PROCESSING',
  'PROCESSING',
  'REFUND_REQUIRES_RECONCILIATION',
  'REQUIRES_RECONCILIATION',
])

const REFUNDED_STATUSES = new Set([
  'REFUNDED',
  'FULLY_REFUNDED',
  'PROCESSED',
])

const REFUND_FAILED_STATUSES = new Set([
  'REFUND_FAILED',
  'FAILED',
])

const VALID_FILTERS = new Set([
  'all',
  'active',
  'claimed',
  'renewed',
  'inactive',
  'expired',
])

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
]

const VALID_CATEGORIES = new Set([
  'all',
  'health',
  'family',
  'life',
  'motor',
])

const REFRESH_INTERVAL = 15000

/* =========================================================
   GENERAL HELPERS
========================================================= */

function normalizedStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  return []
}

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== '',
  ) ?? null
}

function policyNumberOf(value) {
  return (
    value?.policyNumber ??
    value?.policy?.policyNumber ??
    null
  )
}

function claimPolicyNumber(claim) {
  return (
    claim?.policyNumber ??
    claim?.policy?.policyNumber ??
    null
  )
}

function getRenewalSourceNumber(policy) {
  return (
    policy?.renewedFromPolicyNumber ??
    policy?.renewalSourcePolicyNumber ??
    policy?.renewedFromPurchase?.policyNumber ??
    policy?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function getPurchaseRenewalSource(purchase) {
  return (
    purchase?.renewedFromPolicyNumber ??
    purchase?.renewalSourcePolicyNumber ??
    purchase?.renewedFromPurchase?.policyNumber ??
    purchase?.renewedFromPurchase?.policy?.policyNumber ??
    null
  )
}

function isSuccessfulPurchase(purchase) {
  return normalizedStatus(purchase?.paymentStatus) === 'PAID'
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isFinite(Number(value))
  ) {
    return '—'
  }

  return Number(value).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

function getObjectValue(object, keys) {
  for (const key of keys) {
    const value = object?.[key]

    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value
    }
  }

  return null
}

/* =========================================================
   CATEGORY AND PLAN HELPERS
========================================================= */

function getFamilyMembers(policy, purchase) {
  const sources = [
    policy,
    policy?.plan,
    policy?.policyDetails,
    policy?.healthDetails,
    purchase,
    purchase?.plan,
    purchase?.policyDetails,
  ]

  const keys = [
    'familyMembers',
    'insuredMembers',
    'members',
    'dependents',
    'coveredMembers',
    'memberDetails',
    'familyDetails',
  ]

  for (const source of sources) {
    for (const key of keys) {
      if (Array.isArray(source?.[key]) && source[key].length) {
        return source[key]
      }
    }
  }

  return []
}

function getPolicyCategory(policy, purchase) {
  const sources = [
    policy,
    policy?.plan,
    policy?.policyDetails,
    purchase,
    purchase?.plan,
  ]

  const values = []

  for (const source of sources) {
    if (!source) continue

    values.push(
      source.category,
      source.planCategory,
      source.policyCategory,
      source.policyType,
      source.planType,
      source.insuranceType,
      source.productType,
      source.coverageType,
      source.planName,
      source.name,
      source.coveredTypes,
    )
  }

  const text = values
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const vehicle = getVehicleDetails(policy, purchase)
  const familyMembers = getFamilyMembers(policy, purchase)

  if (
    vehicle.registration ||
    vehicle.model ||
    /\b(motor|vehicle|car|bike|two wheeler|two-wheeler|four wheeler|four-wheeler|automobile|motorcycle)\b/i.test(text)
  ) {
    return 'motor'
  }

  if (/\blife\b/i.test(text)) {
    return 'life'
  }

  if (
    familyMembers.length > 0 ||
    /\b(family|family floater|dependent|dependents)\b/i.test(text)
  ) {
    return 'family'
  }

  if (
    /\b(health|medical|hospital|hospitalization|mediclaim)\b/i.test(text)
  ) {
    return 'health'
  }

  return 'other'
}

function getPlanDetails(policy, purchase) {
  const plan = policy?.plan || purchase?.plan || {}
  const policyDetails = policy?.policyDetails || {}
  const purchaseDetails = purchase?.policyDetails || {}

  const sources = [
    policy,
    policyDetails,
    plan,
    purchase,
    purchaseDetails,
  ]

  const find = (keys) => {
    for (const source of sources) {
      const value = getObjectValue(source, keys)
      if (value !== null) return value
    }

    return null
  }

  return {
    coverage: find([
      'sumInsured',
      'sumInsuredAmount',
      'coverageAmount',
      'insuredAmount',
      'coverageLimit',
      'maximumCoverage',
      'coverAmount',
      'benefitAmount',
    ]),

    premium: find([
      'premiumAmount',
      'totalPremium',
      'premium',
      'amountPaid',
      'purchaseAmount',
      'price',
      'planPrice',
    ]),

    planName: find([
      'planName',
      'name',
      'policyName',
      'productName',
    ]),

    duration: find([
      'durationYears',
      'policyTerm',
      'duration',
      'termYears',
      'term',
    ]),
  }
}

/* =========================================================
   VEHICLE DETAILS
========================================================= */

function getVehicleDetails(policy, purchase) {
  const sources = [
    policy,
    policy?.vehicle,
    policy?.vehicleDetails,
    policy?.insuredVehicle,
    policy?.motorDetails,
    purchase,
    purchase?.vehicle,
    purchase?.vehicleDetails,
    purchase?.insuredVehicle,
  ]

  const find = (keys) => {
    for (const source of sources) {
      const value = getObjectValue(source, keys)
      if (value !== null) return value
    }

    return null
  }

  return {
    registration: find([
      'vehicleRegistrationNumber',
      'registrationNumber',
      'vehicleNumber',
      'registrationNo',
      'vehicleRegNumber',
    ]),

    make: find([
      'vehicleMake',
      'make',
      'manufacturer',
      'brand',
    ]),

    model: find([
      'vehicleModel',
      'model',
      'makerModel',
      'modelName',
    ]),

    year: find([
      'vehicleYear',
      'manufacturingYear',
      'registrationYear',
      'year',
    ]),

    type: find([
      'vehicleType',
      'typeOfVehicle',
      'vehicleCategory',
    ]),

    fuel: find([
      'fuelType',
      'fuel',
    ]),

    color: find([
      'vehicleColor',
      'color',
    ]),

    chassis: find([
      'chassisNumber',
      'chassisNo',
    ]),

    engine: find([
      'engineNumber',
      'engineNo',
    ]),

    usage: find([
      'vehicleUsage',
      'usageType',
      'usage',
    ]),
  }
}

/* =========================================================
   FAMILY MEMBER DETAILS
========================================================= */

function getMemberDetails(member) {
  return {
    name: firstValue(
      member?.fullName,
      member?.memberName,
      member?.name,
      member?.insuredName,
      member?.customerName,
    ),

    relationship: firstValue(
      member?.relationship,
      member?.relation,
      member?.relationshipWithPolicyholder,
    ),

    age: firstValue(
      member?.age,
      member?.memberAge,
    ),

    dateOfBirth: firstValue(
      member?.dateOfBirth,
      member?.dob,
      member?.birthDate,
    ),

    gender: firstValue(
      member?.gender,
      member?.sex,
    ),

    coverage: firstValue(
      member?.sumInsured,
      member?.coverageAmount,
      member?.insuredAmount,
      member?.individualCoverage,
    ),
  }
}

/* =========================================================
   BENEFICIARY DETAILS
========================================================= */

function getBeneficiaries(policy, purchase) {
  const sources = [
    policy,
    policy?.lifeDetails,
    policy?.policyDetails,
    purchase,
    purchase?.lifeDetails,
    purchase?.policyDetails,
  ]

  const keys = [
    'beneficiaries',
    'nominees',
    'nomineeDetails',
    'beneficiaryDetails',
    'nomineeList',
  ]

  for (const source of sources) {
    for (const key of keys) {
      if (Array.isArray(source?.[key]) && source[key].length) {
        return source[key]
      }
    }
  }

  return []
}

/* =========================================================
   CATEGORY LABELS
========================================================= */

function categoryLabel(category) {
  switch (category) {
    case 'health':
      return 'Health Insurance'
    case 'family':
      return 'Family Health Insurance'
    case 'life':
      return 'Life Insurance'
    case 'motor':
      return 'Motor Insurance'
    default:
      return 'Insurance'
  }
}

/* =========================================================
   REFUND HELPERS
========================================================= */

function getRefundStatus(policy, purchase) {
  const purchaseStatus = normalizedStatus(purchase?.refundStatus)
  const policyStatus = normalizedStatus(policy?.refundStatus)
  const lifecycleStatus = normalizedStatus(policy?.lifecycleStatus)

  if (purchaseStatus && purchaseStatus !== 'NOT_REFUNDED') {
    return purchaseStatus
  }

  if (policyStatus && policyStatus !== 'NOT_REFUNDED') {
    return policyStatus
  }

  if (
    lifecycleStatus.startsWith('REFUND_') ||
    lifecycleStatus === 'REFUNDED'
  ) {
    return lifecycleStatus
  }

  return purchaseStatus || policyStatus || ''
}

function isRefundPending(status) {
  return REFUND_PENDING_STATUSES.has(normalizedStatus(status))
}

function isRefunded(status) {
  return REFUNDED_STATUSES.has(normalizedStatus(status))
}

function isRefundFailed(status) {
  return REFUND_FAILED_STATUSES.has(normalizedStatus(status))
}

function refundStatusLabel(status) {
  switch (normalizedStatus(status)) {
    case 'REFUND_PENDING':
    case 'PENDING':
      return 'Refund pending'

    case 'REFUND_PROCESSING':
    case 'PROCESSING':
      return 'Refund processing'

    case 'REFUND_REQUIRES_RECONCILIATION':
    case 'REQUIRES_RECONCILIATION':
      return 'Under verification'

    case 'REFUNDED':
    case 'FULLY_REFUNDED':
    case 'PROCESSED':
      return 'Refunded'

    case 'REFUND_FAILED':
    case 'FAILED':
      return 'Refund failed'

    default:
      return 'Not refunded'
  }
}

/* =========================================================
   RENEWAL HELPERS
========================================================= */

function isRenewedPolicy(policy, purchase) {
  return (
    getRenewalSourceNumber(policy) != null ||
    getPurchaseRenewalSource(purchase) != null
  )
}

function renewalUrl(policyNumber) {
  return `/app/renew/${encodeURIComponent(String(policyNumber))}`
}

/* =========================================================
   CLAIM HELPERS
========================================================= */

function hasSuccessfulClaim(policy, relatedClaims) {
  if (
    policy?.hasSuccessfulClaim === true ||
    policy?.claimApproved === true
  ) {
    return true
  }

  if (
    SUCCESSFUL_CLAIM_STATUSES.has(
      normalizedStatus(policy?.claimStatus),
    )
  ) {
    return true
  }

  if (
    Array.isArray(policy?.claims) &&
    policy.claims.some((claim) =>
      SUCCESSFUL_CLAIM_STATUSES.has(
        normalizedStatus(claim?.status),
      ),
    )
  ) {
    return true
  }

  return relatedClaims.some((claim) =>
    SUCCESSFUL_CLAIM_STATUSES.has(
      normalizedStatus(claim?.status),
    ),
  )
}

function isPendingClaim(policy, relatedClaims) {
  const embeddedStatuses = Array.isArray(policy?.claims)
    ? policy.claims.map((claim) => normalizedStatus(claim?.status))
    : [normalizedStatus(policy?.claimStatus)]

  return (
    embeddedStatuses.some((status) =>
      PENDING_CLAIM_STATUSES.has(status),
    ) ||
    relatedClaims.some((claim) =>
      PENDING_CLAIM_STATUSES.has(normalizedStatus(claim?.status)),
    )
  )
}

/* =========================================================
   POLICY STATUS
========================================================= */

function getPolicyStatus(policy, relatedClaims, relatedPurchase) {
  const backendStatus = normalizedStatus(policy?.status)
  const lifecycleStatus = normalizedStatus(policy?.lifecycleStatus)

  const refundStatus = getRefundStatus(policy, relatedPurchase)

  if (isRefunded(refundStatus) || lifecycleStatus === 'REFUNDED') {
    return 'REFUNDED'
  }

  if (isRefundFailed(refundStatus)) {
    return 'REFUND_FAILED'
  }

  if (
    isRefundPending(refundStatus) ||
    isRefundPending(lifecycleStatus)
  ) {
    if (
      refundStatus === 'REFUND_REQUIRES_RECONCILIATION' ||
      refundStatus === 'REQUIRES_RECONCILIATION' ||
      lifecycleStatus === 'REFUND_REQUIRES_RECONCILIATION'
    ) {
      return 'REFUND_REQUIRES_RECONCILIATION'
    }

    if (
      refundStatus === 'REFUND_PROCESSING' ||
      refundStatus === 'PROCESSING'
    ) {
      return 'REFUND_PROCESSING'
    }

    return 'REFUND_PENDING'
  }

  if (
    hasSuccessfulClaim(policy, relatedClaims) ||
    backendStatus === 'CLAIMED' ||
    lifecycleStatus === 'CLAIMED'
  ) {
    return 'CLAIMED'
  }

  if (
    backendStatus === 'RENEWED' ||
    lifecycleStatus === 'RENEWED'
  ) {
    return 'RENEWED'
  }

  if (
    lifecycleStatus &&
    !['ACTIVE', 'INACTIVE', 'NEW'].includes(lifecycleStatus)
  ) {
    return lifecycleStatus
  }

  if (
    backendStatus &&
    !['ACTIVE', 'INACTIVE'].includes(backendStatus)
  ) {
    return backendStatus
  }

  if (
    policy?.expiryDate &&
    String(policy.expiryDate).slice(0, 10) <= today()
  ) {
    return 'EXPIRED'
  }

  if (
    backendStatus === 'INACTIVE' ||
    lifecycleStatus === 'INACTIVE' ||
    policy?.isActive === false
  ) {
    return 'INACTIVE'
  }

  return policy?.isActive === true || backendStatus === 'ACTIVE'
    ? 'ACTIVE'
    : 'INACTIVE'
}

/* =========================================================
   BADGES
========================================================= */

function PolicyStatusBadge({ policy }) {
  const status = policy.displayStatus

  if (status === 'REFUNDED') {
    return <StatusBadge value="REFUNDED" label="Refunded" />
  }

  if (isRefundPending(status)) {
    return (
      <StatusBadge
        value="PENDING"
        label={refundStatusLabel(status)}
      />
    )
  }

  if (isRefundFailed(status)) {
    return <StatusBadge value="FAILED" label="Refund failed" />
  }

  return <StatusBadge value={status} />
}

const CATEGORY_BADGES = {
  health: {
    label: 'Health',
    icon: HeartPulse,
    className: 'ix-category-health',
  },
  family: {
    label: 'Family Health',
    icon: Users,
    className: 'ix-category-family',
  },
  life: {
    label: 'Life',
    icon: ShieldCheck,
    className: 'ix-category-life',
  },
  motor: {
    label: 'Motor',
    icon: CarFront,
    className: 'ix-category-motor',
  },
}

function PolicyCategoryBadge({ category }) {
  const item = CATEGORY_BADGES[category]
  if (!item) return null

  const Icon = item.icon

  return (
    <span className={`ix-category-badge ${item.className}`}>
      <Icon size={14} aria-hidden="true" />
      {item.label}
    </span>
  )
}

/* =========================================================
   REUSABLE DETAIL COMPONENTS
========================================================= */

function DetailItem({ label, value }) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  return (
    <div className="ix-extra-detail">
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  )
}

/* =========================================================
   FAMILY MEMBERS
========================================================= */

function FamilyMembersSection({ members }) {
  if (!members?.length) return null

  return (
    <section className="ix-policy-extra-section">
      <div className="ix-policy-extra-heading">
        <Users size={17} aria-hidden="true" />
        <strong>Covered family members</strong>
        <span>{members.length}</span>
      </div>

      <div className="ix-family-member-grid">
        {members.map((member, index) => {
          const details = getMemberDetails(member)

          return (
            <div
              className="ix-family-member-card"
              key={member?.memberId ?? member?.id ?? index}
            >
              <div className="ix-member-name">
                <div className="ix-member-avatar">
                  <UserRound size={19} aria-hidden="true" />
                </div>

                <div className="ix-member-name-content">
                  <span>Insured member</span>
                  <strong>
                    {details.name || `Member ${index + 1}`}
                  </strong>
                </div>
              </div>

              <div className="ix-family-member-details">
                <DetailItem
                  label="Relationship"
                  value={details.relationship}
                />

                <DetailItem
                  label="Gender"
                  value={details.gender}
                />

                <DetailItem
                  label="Age"
                  value={details.age}
                />

                <DetailItem
                  label="Date of birth"
                  value={
                    details.dateOfBirth
                      ? date(details.dateOfBirth)
                      : null
                  }
                />

                <DetailItem
                  label="Individual coverage"
                  value={
                    details.coverage != null
                      ? formatMoney(details.coverage)
                      : null
                  }
                />
              </div>

              <div className="ix-member-coverage-status">
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Coverage currently active</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* =========================================================
   VEHICLE DETAILS
========================================================= */

function VehicleDetailsSection({ vehicle }) {
  const entries = [
    ['Registration number', vehicle.registration],
    ['Manufacturer', vehicle.make],
    ['Model', vehicle.model],
    ['Manufacturing year', vehicle.year],
    ['Vehicle type', vehicle.type],
    ['Fuel type', vehicle.fuel],
    ['Color', vehicle.color],
    ['Chassis number', vehicle.chassis],
    ['Engine number', vehicle.engine],
    ['Vehicle usage', vehicle.usage],
  ].filter(([, value]) =>
    value !== null && value !== undefined && value !== '',
  )

  if (!entries.length) return null

  return (
    <section className="ix-policy-extra-section">
      <div className="ix-policy-extra-heading">
        <CarFront size={17} aria-hidden="true" />
        <strong>Insured vehicle details</strong>
      </div>

      <div className="ix-extra-details-grid">
        {entries.map(([label, value]) => (
          <DetailItem
            key={label}
            label={label}
            value={value}
          />
        ))}
      </div>
    </section>
  )
}

/* =========================================================
   BENEFICIARY DETAILS
========================================================= */

function BeneficiariesSection({ beneficiaries }) {
  if (!beneficiaries?.length) return null

  return (
    <section className="ix-policy-extra-section">
      <div className="ix-policy-extra-heading">
        <UserCheck size={17} aria-hidden="true" />
        <strong>Nominee / Beneficiary details</strong>
        <span>{beneficiaries.length}</span>
      </div>

      <div className="ix-family-member-grid">
        {beneficiaries.map((person, index) => {
          const name = firstValue(
            person?.fullName,
            person?.beneficiaryName,
            person?.nomineeName,
            person?.name,
          )

          const relationship = firstValue(
            person?.relationship,
            person?.relation,
          )

          const share = firstValue(
            person?.percentage,
            person?.sharePercentage,
            person?.allocationPercentage,
          )

          return (
            <div
              className="ix-family-member-card"
              key={person?.id ?? person?.beneficiaryId ?? index}
            >
              <div className="ix-member-name">
                <div className="ix-member-avatar">
                  <UserCheck size={19} aria-hidden="true" />
                </div>

                <div className="ix-member-name-content">
                  <span>Nominee</span>
                  <strong>
                    {name || `Beneficiary ${index + 1}`}
                  </strong>
                </div>
              </div>

              <div className="ix-family-member-details">
                <DetailItem
                  label="Relationship"
                  value={relationship}
                />

                <DetailItem
                  label="Share"
                  value={share != null ? `${share}%` : null}
                />

                <DetailItem
                  label="Age"
                  value={person?.age}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* =========================================================
   POLICY ACTION
========================================================= */

function PolicyAction({ policy, onClaim }) {
  if (
    policy.refundPending ||
    policy.refunded ||
    policy.refundFailed
  ) {
    return (
      <span className="muted ix-policy-action-label">
        {refundStatusLabel(policy.refundStatus)}
      </span>
    )
  }

  if (policy.alreadyRenewed) {
    return (
      <span className="muted ix-policy-action-label">
        Already renewed
      </span>
    )
  }

  if (policy.canRequestRenewal) {
    return (
      <Link
        className="btn primary ix-policy-action-btn"
        to={renewalUrl(policy.policyNumber)}
      >
        <RefreshCw size={15} aria-hidden="true" />
        Renew policy
      </Link>
    )
  }

  return (
    <Button
      size="sm"
      disabled={!policy.canFileClaim}
      title={
        policy.canFileClaim
          ? 'File a claim'
          : policy.pendingClaim
            ? 'A claim is already being processed'
            : policy.displayStatus === 'EXPIRED'
              ? 'Claims cannot be started for an expired policy'
              : policy.isActive === false
                ? 'This policy is not active'
                : 'Claims require an active policy'
      }
      onClick={() => {
        if (policy.canFileClaim) onClaim(policy)
      }}
    >
      {policy.displayStatus === 'EXPIRED'
        ? 'Expired'
        : policy.pendingClaim
          ? 'Claim pending'
          : policy.displayStatus === 'CLAIMED'
            ? 'Claimed'
            : 'File a claim'}
    </Button>
  )
}

/* =========================================================
   COMPONENT
========================================================= */

export default function MyPolicies() {
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedFilter = searchParams.get('status') || 'all'

  const status = VALID_FILTERS.has(requestedFilter)
    ? requestedFilter
    : 'all'

  const requestedCategory = searchParams.get('category') || 'all'

  const category = VALID_CATEGORIES.has(requestedCategory)
    ? requestedCategory
    : 'all'

  const claimedSection = status === 'claimed'

  const [claimFor, setClaimFor] = useState(null)
  const [refreshError, setRefreshError] = useState('')

  /* =======================================================
     QUERIES
  ======================================================= */

  const policiesQuery = useQuery({
    queryKey: ['my-policies'],
    queryFn: policies.mine,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  })

  const claimsQuery = useQuery({
    queryKey: ['my-claims'],
    queryFn: claims.mine,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const purchasesQuery = useQuery({
    queryKey: ['my-purchases'],
    queryFn: purchases.mine,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    refetchInterval: (query) => {
      const purchaseRows = normalizeRows(query.state.data)

      return purchaseRows.some((purchase) =>
        isRefundPending(purchase.refundStatus),
      )
        ? REFRESH_INTERVAL
        : false
    },

    refetchIntervalInBackground: false,
  })

  /* =======================================================
     NORMALIZE DATA / PREVENT DUPLICATE POLICY NUMBERS
  ======================================================= */

  const policyRows = useMemo(() => {
    const rows = normalizeRows(policiesQuery.data)
    const uniquePolicies = new Map()

    for (const policy of rows) {
      const number = policyNumberOf(policy)

      if (number == null) {
        uniquePolicies.set(
          `unknown-${uniquePolicies.size}`,
          policy,
        )
        continue
      }

      const key = String(number)

      if (!uniquePolicies.has(key)) {
        uniquePolicies.set(key, policy)
      }
    }

    return [...uniquePolicies.values()]
  }, [policiesQuery.data])

  const claimRows = useMemo(
    () => normalizeRows(claimsQuery.data),
    [claimsQuery.data],
  )

  const purchaseRows = useMemo(
    () => normalizeRows(purchasesQuery.data),
    [purchasesQuery.data],
  )

  /* =======================================================
     PAID PURCHASE / POLICY SYNCHRONIZATION
  ======================================================= */

  const unlinkedPaidPurchases = useMemo(() => {
    const knownPolicyNumbers = new Set(
      policyRows
        .map(policyNumberOf)
        .filter((number) => number != null)
        .map(String),
    )

    return purchaseRows.filter((purchase) => {
      if (!isSuccessfulPurchase(purchase)) return false

      const number = policyNumberOf(purchase)

      return (
        number != null &&
        !knownPolicyNumbers.has(String(number))
      )
    })
  }, [policyRows, purchaseRows])

  /* =======================================================
     INDEX CLAIMS
  ======================================================= */

  const claimsByPolicy = useMemo(() => {
    const map = new Map()

    for (const claim of claimRows) {
      const number = claimPolicyNumber(claim)
      if (number == null) continue

      const key = String(number)

      if (!map.has(key)) map.set(key, [])
      map.get(key).push(claim)
    }

    return map
  }, [claimRows])

  /* =======================================================
     INDEX PURCHASES
  ======================================================= */

  const purchasesByPolicy = useMemo(() => {
    const map = new Map()

    for (const purchase of purchaseRows) {
      const number = policyNumberOf(purchase)
      if (number == null) continue

      const key = String(number)
      const existing = map.get(key)

      if (
        !existing ||
        Number(purchase.purchaseId || 0) >
          Number(existing.purchaseId || 0)
      ) {
        map.set(key, purchase)
      }
    }

    return map
  }, [purchaseRows])

  /* =======================================================
     TRACK COMPLETED RENEWALS
  ======================================================= */

  const renewedSourceNumbers = useMemo(() => {
    const set = new Set()

    for (const policy of policyRows) {
      const source = getRenewalSourceNumber(policy)

      if (source != null) set.add(String(source))
    }

    for (const purchase of purchaseRows) {
      const source = getPurchaseRenewalSource(purchase)

      if (
        source != null &&
        isSuccessfulPurchase(purchase)
      ) {
        set.add(String(source))
      }
    }

    return set
  }, [policyRows, purchaseRows])

  /* =======================================================
     ENRICH POLICY DATA
  ======================================================= */

  const enrichedPolicies = useMemo(
    () =>
      policyRows.map((policy) => {
        const number = String(policy.policyNumber)

        const relatedClaims = claimsByPolicy.get(number) || []
        const relatedPurchase = purchasesByPolicy.get(number) || null

        const refundStatus = getRefundStatus(policy, relatedPurchase)

        const baseStatus = getPolicyStatus(
          policy,
          relatedClaims,
          relatedPurchase,
        )

        const alreadyRenewed = renewedSourceNumbers.has(number)

        const displayStatus =
          alreadyRenewed &&
          !isRefundPending(baseStatus) &&
          !isRefunded(baseStatus) &&
          !isRefundFailed(baseStatus)
            ? 'RENEWED'
            : baseStatus

        const hasClaimHistory =
          relatedClaims.length > 0 ||
          (Array.isArray(policy.claims) && policy.claims.length > 0) ||
          policy.hasSuccessfulClaim === true ||
          policy.claimApproved === true ||
          Boolean(normalizedStatus(policy.claimStatus)) ||
          normalizedStatus(policy.status) === 'CLAIMED' ||
          normalizedStatus(policy.lifecycleStatus) === 'CLAIMED'

        const claimCount =
          relatedClaims.length ||
          (Array.isArray(policy.claims) ? policy.claims.length : 0)

        const pendingClaim = isPendingClaim(policy, relatedClaims)

        const renewalChild = isRenewedPolicy(policy, relatedPurchase)

        const refundPending =
          !isRefundFailed(refundStatus) &&
          !isRefunded(refundStatus) &&
          (
            isRefundPending(refundStatus) ||
            isRefundPending(policy.lifecycleStatus)
          )

        const refunded =
          isRefunded(refundStatus) ||
          normalizedStatus(policy.lifecycleStatus) === 'REFUNDED'

        const refundFailed =
          isRefundFailed(refundStatus) ||
          normalizedStatus(policy.lifecycleStatus) === 'REFUND_FAILED'

        const coverageCurrentlyValid =
          Boolean(policy.startDate && policy.expiryDate) &&
          String(policy.startDate).slice(0, 10) <= today() &&
          String(policy.expiryDate).slice(0, 10) > today()

        const coverageActive =
          policy.isActive === true &&
          ['', 'ACTIVE'].includes(
            normalizedStatus(policy.lifecycleStatus),
          ) &&
          coverageCurrentlyValid &&
          !alreadyRenewed &&
          !refundPending &&
          !refunded &&
          !refundFailed

        const canFileClaim =
          coverageActive &&
          !pendingClaim &&
          !hasSuccessfulClaim(policy, relatedClaims)

        const canRequestRenewal =
          displayStatus === 'CLAIMED' &&
          !alreadyRenewed &&
          !renewalChild &&
          relatedPurchase != null &&
          isSuccessfulPurchase(relatedPurchase) &&
          !refundPending &&
          !refunded &&
          !refundFailed

        const policyCategory = getPolicyCategory(
          policy,
          relatedPurchase,
        )

        const planDetails = getPlanDetails(policy, relatedPurchase)

        const familyMembers = getFamilyMembers(
          policy,
          relatedPurchase,
        )

        const vehicleDetails = getVehicleDetails(
          policy,
          relatedPurchase,
        )

        const beneficiaries = getBeneficiaries(
          policy,
          relatedPurchase,
        )

        return {
          ...policy,
          displayStatus,
          refundStatus,
          refundPending,
          refunded,
          refundFailed,
          pendingClaim,
          hasClaimHistory,
          claimCount,
          alreadyRenewed,
          renewalChild,
          coverageActive,
          canFileClaim,
          canRequestRenewal,
          policyCategory,
          planDetails,
          familyMembers,
          vehicleDetails,
          beneficiaries,
        }
      }),
    [
      policyRows,
      claimsByPolicy,
      purchasesByPolicy,
      renewedSourceNumbers,
    ],
  )

  /* =======================================================
     SEARCH
  ======================================================= */

  const [search, setSearch, searched] = useFilter(
    enrichedPolicies,
    FIELDS,
  )

  /* =======================================================
     CATEGORY COUNTS
  ======================================================= */

  const categoryCounts = useMemo(() => ({
    all: enrichedPolicies.length,

    health: enrichedPolicies.filter(
      (policy) =>
        ['health', 'family'].includes(policy.policyCategory),
    ).length,

    family: enrichedPolicies.filter(
      (policy) => policy.policyCategory === 'family',
    ).length,

    life: enrichedPolicies.filter(
      (policy) => policy.policyCategory === 'life',
    ).length,

    motor: enrichedPolicies.filter(
      (policy) => policy.policyCategory === 'motor',
    ).length,
  }), [enrichedPolicies])

  const CATEGORY_OPTIONS = [
    {
      value: 'all',
      label: `All plans (${categoryCounts.all})`,
    },
    {
      value: 'health',
      label: `Health (${categoryCounts.health})`,
    },
    {
      value: 'family',
      label: `Family (${categoryCounts.family})`,
    },
    {
      value: 'life',
      label: `Life (${categoryCounts.life})`,
    },
    {
      value: 'motor',
      label: `Motor (${categoryCounts.motor})`,
    },
  ]

  /* =======================================================
     FILTER
  ======================================================= */

  const rows = useMemo(
    () =>
      (searched || []).filter((policy) => {
        if (category === 'health') {
          if (!['health', 'family'].includes(policy.policyCategory)) {
            return false
          }
        } else if (
          category !== 'all' &&
          policy.policyCategory !== category
        ) {
          return false
        }

        if (status === 'all') return true

        if (status === 'renewed') {
          return policy.displayStatus === 'RENEWED'
        }

        if (status === 'active') {
          return policy.coverageActive
        }

        if (status === 'claimed') {
          return policy.hasClaimHistory
        }

        return policy.displayStatus === status.toUpperCase()
      }),
    [searched, status, category],
  )

  function changeStatus(nextStatus) {
    if (!VALID_FILTERS.has(nextStatus)) return

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (nextStatus === 'all') {
        next.delete('status')
      } else {
        next.set('status', nextStatus)
      }

      return next
    })
  }

  function changeCategory(nextCategory) {
    if (!VALID_CATEGORIES.has(nextCategory)) return

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (nextCategory === 'all') {
        next.delete('category')
      } else {
        next.set('category', nextCategory)
      }

      return next
    })
  }

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(
    () => ({
      total: enrichedPolicies.length,

      active: enrichedPolicies.filter(
        (policy) => policy.coverageActive,
      ).length,

      claimed: enrichedPolicies.filter(
        (policy) => policy.hasClaimHistory,
      ).length,

      linkedClaims: claimRows.filter((claim) =>
        enrichedPolicies.some(
          (policy) =>
            String(policy.policyNumber) ===
            String(claimPolicyNumber(claim)),
        ),
      ).length,

      renewed: enrichedPolicies.filter(
        (policy) => policy.displayStatus === 'RENEWED',
      ).length,

      refunds: enrichedPolicies.filter(
        (policy) => policy.refundPending,
      ).length,
    }),
    [enrichedPolicies, claimRows],
  )

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshing =
    policiesQuery.isFetching ||
    claimsQuery.isFetching ||
    purchasesQuery.isFetching

  async function refreshAll() {
    setRefreshError('')

    try {
      const results = await Promise.all([
        policiesQuery.refetch(),
        claimsQuery.refetch(),
        purchasesQuery.refetch(),
      ])

      const failure = results.find((result) => result.error)

      if (failure) throw failure.error
    } catch (error) {
      setRefreshError(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to refresh policy information.',
      )
    }
  }

  const query = {
    ...policiesQuery,

    isLoading:
      policiesQuery.isLoading ||
      claimsQuery.isLoading ||
      purchasesQuery.isLoading,

    isError:
      policiesQuery.isError ||
      claimsQuery.isError ||
      purchasesQuery.isError,

    error:
      policiesQuery.error ||
      claimsQuery.error ||
      purchasesQuery.error,

    refetch: refreshAll,
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="ix-policies-page">
      <PageHeader
        title={claimedSection ? 'Claimed policies' : 'My policies'}
        subtitle={
          claimedSection
            ? 'Review policies with claim history, including policies renewed after a claim.'
            : 'Manage your health, family, life and motor insurance coverage, claims, refunds and renewals.'
        }
      >
        <Link className="btn primary" to="/app/plans">
          Buy insurance
        </Link>
      </PageHeader>

      {/* SUMMARY */}

      {claimedSection ? (
        <div className="ix-policy-summary-grid">
          <Panel>
            <div className="ix-policy-summary-card">
              <ShieldCheck size={22} aria-hidden="true" />
              <div>
                <div className="muted">Policies with claims</div>
                <strong>{query.isLoading ? '…' : summary.claimed}</strong>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="ix-policy-summary-card">
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <div className="muted">Linked claims</div>
                <strong>{query.isLoading ? '…' : summary.linkedClaims}</strong>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="ix-policy-summary-card">
              <RefreshCw size={22} aria-hidden="true" />
              <div>
                <div className="muted">Renewed after claim</div>
                <strong>
                  {query.isLoading
                    ? '…'
                    : enrichedPolicies.filter(
                        (policy) =>
                          policy.hasClaimHistory &&
                          policy.alreadyRenewed,
                      ).length}
                </strong>
              </div>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="ix-policy-summary-grid">
          <Panel>
            <div className="ix-policy-summary-card">
              <ShieldCheck size={22} aria-hidden="true" />
              <div>
                <div className="muted">Total policies</div>
                <strong>{query.isLoading ? '…' : summary.total}</strong>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="ix-policy-summary-card">
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <div className="muted">Active</div>
                <strong>{query.isLoading ? '…' : summary.active}</strong>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="ix-policy-summary-card">
              <RefreshCw size={22} aria-hidden="true" />
              <div>
                <div className="muted">Renewed</div>
                <strong>{query.isLoading ? '…' : summary.renewed}</strong>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="ix-policy-summary-card">
              <RotateCcw size={22} aria-hidden="true" />
              <div>
                <div className="muted">Pending refunds</div>
                <strong>{query.isLoading ? '…' : summary.refunds}</strong>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* CATEGORY FILTER */}

      {!claimedSection && (
        <section
          className="ix-policy-category-section"
          aria-label="Filter policies by insurance category"
        >
          <div className="ix-policy-category-heading">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Insurance categories</span>
          </div>

          <div className="ix-policy-category-filter">
            <Segmented
              value={category}
              onChange={changeCategory}
              options={CATEGORY_OPTIONS}
            />
          </div>
        </section>
      )}

      {/* PURCHASE SYNCHRONIZATION */}

      {!query.isLoading &&
        !query.isError &&
        unlinkedPaidPurchases.length > 0 && (
          <div className="alert info ix-policy-alert" role="status">
            <Clock3 size={17} aria-hidden="true" />
            <span>
              {unlinkedPaidPurchases.length} paid{' '}
              {unlinkedPaidPurchases.length === 1
                ? 'purchase has'
                : 'purchases have'}{' '}
              a policy number missing from the policy history response.
              Refresh after verifying policy ownership and purchase linking.
            </span>

            <Button size="sm" onClick={refreshAll} disabled={refreshing}>
              <RefreshCw size={15} aria-hidden="true" />
              Refresh
            </Button>
          </div>
        )}

      {/* REFUND NOTICE */}

      {summary.refunds > 0 && (
        <div className="alert info ix-policy-alert" role="status">
          <Clock3 size={17} aria-hidden="true" />
          <span>
            {summary.refunds} policy
            {summary.refunds === 1 ? ' has' : ' policies have'}
            {' '}a refund awaiting processing or verification.
            Refund information refreshes automatically.
          </span>
        </div>
      )}

      {refreshError && (
        <div className="alert error ix-policy-alert" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{refreshError}</span>
        </div>
      )}

      {/* POLICY LIST */}

      <Panel flush>
        <div className="toolbar ix-policy-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by policy number or plan"
          />

          {!claimedSection && (
            <Segmented
              value={status}
              onChange={changeStatus}
              options={FILTER_OPTIONS}
            />
          )}

          <Button onClick={refreshAll} disabled={refreshing}>
            <RefreshCw size={15} aria-hidden="true" />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        <DataState
          query={query}
          empty={{
            title: 'No policies yet',
            text: 'Once you buy an insurance plan, it will appear here.',
          }}
          emptyAction={
            <Link className="btn primary" to="/app/plans">
              Browse plans
            </Link>
          }
        >
          {() =>
            rows.length === 0 ? (
              <div className="empty">
                <h4>
                  {claimedSection
                    ? 'No claimed policies found'
                    : category !== 'all'
                      ? `No ${categoryLabel(category).toLowerCase()} policies found`
                      : 'No matching policies'}
                </h4>

                <p>
                  {claimedSection
                    ? 'Policies with claims will appear here. Try clearing your search.'
                    : category !== 'all'
                      ? 'Try another insurance category or clear your search.'
                      : 'Try another search or status filter.'}
                </p>
              </div>
            ) : claimedSection ? (
              <div className="ix-claimed-list" aria-label="Claimed policy history">
                {rows.map((policy) => (
                  <article
                    className="ix-claimed-card"
                    key={String(policy.policyNumber)}
                  >
                    <div className="ix-claimed-top">
                      <div>
                        <div className="muted">Insurance policy</div>
                        <strong>#{policy.policyNumber}</strong>
                        <div>
                          <PolicyCategoryBadge category={policy.policyCategory} />
                        </div>
                      </div>

                      <PolicyStatusBadge policy={policy} />
                    </div>

                    <div className="ix-claimed-meta">
                      <div>
                        <small>Cover type</small>
                        <b>{policy.coveredTypes || '—'}</b>
                      </div>

                      <div>
                        <small>Claims recorded</small>
                        <b>{policy.claimCount || 'Recorded'}</b>
                      </div>

                      <div>
                        <small>Started</small>
                        <b>{date(policy.startDate)}</b>
                      </div>

                      <div>
                        <small>Expires</small>
                        <b>{date(policy.expiryDate)}</b>
                      </div>
                    </div>

                    <div className="ix-claimed-footer">
                      <span className="muted">
                        {policy.alreadyRenewed
                          ? 'Renewal completed'
                          : 'Claim history available'}
                      </span>

                      <Link className="btn primary ix-policy-action-btn" to="/app/claims">
                        View claims
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ix-policy-card-grid" aria-label="My policies">
                {rows.map((policy) => {
                  const plan = policy.planDetails
                  const vehicle = policy.vehicleDetails

                  const isFamily = policy.policyCategory === 'family'
                  const isMotor = policy.policyCategory === 'motor'
                  const isLife = policy.policyCategory === 'life'

                  return (
                    <article
                      className="ix-policy-card"
                      key={String(policy.policyNumber)}
                    >
                      {/* POLICY HEADER */}

                      <div className="ix-policy-card-head">
                        <div className="ix-policy-card-identity">
                          <span className="ix-policy-eyebrow">
                            Insurance policy
                          </span>

                          <h3>#{policy.policyNumber}</h3>

                          <span className="ix-policy-cover">
                            {plan.planName ||
                              policy.coveredTypes ||
                              categoryLabel(policy.policyCategory)}
                          </span>

                          <PolicyCategoryBadge category={policy.policyCategory} />
                        </div>

                        <PolicyStatusBadge policy={policy} />
                      </div>

                      {/* PLAN COVERAGE AND PREMIUM */}

                      {(plan.coverage != null ||
                        plan.premium != null ||
                        plan.duration != null) && (
                        <div className="ix-policy-plan-summary">
                          {plan.coverage != null && (
                            <div className="ix-policy-plan-chip">
                              <ShieldCheck size={15} aria-hidden="true" />
                              <span>Coverage</span>
                              <strong>{formatMoney(plan.coverage)}</strong>
                            </div>
                          )}

                          {plan.premium != null && (
                            <div className="ix-policy-plan-chip">
                              <IndianRupee size={15} aria-hidden="true" />
                              <span>Premium</span>
                              <strong>{formatMoney(plan.premium)}</strong>
                            </div>
                          )}

                          {plan.duration != null && (
                            <div className="ix-policy-plan-chip">
                              <CalendarDays size={15} aria-hidden="true" />
                              <span>Term</span>
                              <strong>
                                {typeof plan.duration === 'number'
                                  ? `${plan.duration} years`
                                  : plan.duration}
                              </strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* COMMON POLICY DETAILS */}

                      <div className="ix-policy-card-details">
                        <div>
                          <span>Start date</span>
                          <strong>{date(policy.startDate)}</strong>
                        </div>

                        <div>
                          <span>Expiry date</span>
                          <strong>{date(policy.expiryDate)}</strong>
                        </div>

                        <div>
                          <span>Policy term</span>
                          <strong>
                            {policy.durationYears != null
                              ? `${policy.durationYears} yr`
                              : plan.duration != null
                                ? plan.duration
                                : '—'}
                          </strong>
                        </div>

                        <div>
                          <span>Claims recorded</span>
                          <strong>
                            {policy.claimCount ||
                              (policy.hasClaimHistory ? 'Recorded' : '0')}
                          </strong>
                        </div>
                      </div>

                      {/* FAMILY HEALTH DETAILS */}

                      {isFamily && (
                        <FamilyMembersSection
                          members={policy.familyMembers}
                        />
                      )}

                      {/* MOTOR DETAILS */}

                      {isMotor && (
                        <VehicleDetailsSection vehicle={vehicle} />
                      )}

                      {/* LIFE BENEFICIARIES */}

                      {isLife && (
                        <BeneficiariesSection
                          beneficiaries={policy.beneficiaries}
                        />
                      )}

                      {/* POLICY FOOTER */}

                      <div className="ix-policy-card-footer">
                        <span className="ix-policy-card-hint">
                          {policy.alreadyRenewed
                            ? 'Previous cover renewed'
                            : policy.refundPending
                              ? 'Refund pending or processing'
                              : policy.pendingClaim
                                ? 'Claim under review'
                                : policy.displayStatus === 'ACTIVE'
                                  ? 'Coverage currently active'
                                  : 'Policy details'}
                        </span>

                        <PolicyAction
                          policy={policy}
                          onClaim={setClaimFor}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          }
        </DataState>
      </Panel>

      {/* CLAIM FORM */}

      {claimFor && (
        <ClaimForm
          policy={claimFor}
          onClose={() => setClaimFor(null)}
        />
      )}
    </div>
  )
}
