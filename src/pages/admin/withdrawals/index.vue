<script setup>

// Teacher withdrawals (payouts) — super-admin review.
//
// Tabs are status filters. Pending requests can be approved or rejected;
// approved requests are marked paid (which requires uploading the transfer
// receipt image). The receipt is shown to the teacher in their wallet.

import Admin from '@/api/admin/admin_api.js'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'pending',  label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  { value: 'approved', label: 'تمت الموافقة',      color: 'info',    icon: 'ri-thumb-up-line' },
  { value: 'paid',     label: 'تم التحويل',        color: 'success', icon: 'ri-check-double-line' },
  { value: 'rejected', label: 'مرفوضة',            color: 'error',   icon: 'ri-close-circle-line' },
]

const PAYOUT_METHODS = [
  { value: 'bank_transfer', title: 'تحويل بنكي' },
  { value: 'wayl_manual',   title: 'Wayl يدوي' },
  { value: 'cash',          title: 'نقداً' },
  { value: 'other',         title: 'أخرى' },
]

const activeStatus = ref(route.query.status || 'pending')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'طلبات سحب الأساتذة', disabled: true },
]

// reject dialog
const rejectDialog = ref(false)
const rejectReason = ref('')
const acting = ref(false)
const current = ref(null)

// mark-paid dialog
const paidDialog = ref(false)
const payMethod = ref('bank_transfer')
const payReference = ref('')
const payDestination = ref('')
const receiptBase64 = ref('')
const receiptName = ref('')

// receipt viewer
const viewerDialog = ref(false)
const viewerUrl = ref('')

const SERVER_BASE = 'https://api.mulhimiq.com'

function fmtMoney (v) {
  const n = Number(v || 0)

  return Math.round(n).toLocaleString('en-US')
}

function fmtDate (iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function statusMeta (value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0]
}

async function fetchPage () {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.listWithdrawals({
      page: page.value,
      limit: limit.value,
      status: activeStatus.value,
    })

    const body = res?.data || {}

    items.value = Array.isArray(body.data) ? body.data : []
    total.value = Number(body.meta?.pagination?.total ?? 0)
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || err?.message || 'تعذر تحميل الطلبات'
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function syncRouteQuery () {
  router.replace({
    query: {
      ...route.query,
      status: activeStatus.value,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  })
}

function onTabChange (newStatus) {
  activeStatus.value = newStatus
  page.value = 1
  syncRouteQuery()
  fetchPage()
}

function goPage (newPage) {
  page.value = newPage
  syncRouteQuery()
  fetchPage()
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

// ---- actions --------------------------------------------------------------

async function approve (row) {
  acting.value = true
  errorMessage.value = ''
  try {
    await Admin.approveWithdrawal(row.id)
    await fetchPage()
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر الموافقة على الطلب'
  } finally {
    acting.value = false
  }
}

function openReject (row) {
  current.value = row
  rejectReason.value = ''
  rejectDialog.value = true
}

async function submitReject () {
  if (!rejectReason.value.trim()) return
  acting.value = true
  try {
    await Admin.rejectWithdrawal(current.value.id, rejectReason.value.trim())
    rejectDialog.value = false
    await fetchPage()
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر رفض الطلب'
  } finally {
    acting.value = false
  }
}

function openPaid (row) {
  current.value = row
  payMethod.value = 'bank_transfer'
  payReference.value = ''
  payDestination.value = row.requested_destination || ''
  receiptBase64.value = ''
  receiptName.value = ''
  paidDialog.value = true
}

function onReceiptPicked (event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'يجب اختيار صورة لوصل التحويل'

    return
  }
  receiptName.value = file.name

  const reader = new FileReader()

  reader.onload = () => { receiptBase64.value = String(reader.result || '') }
  reader.readAsDataURL(file)
}

async function submitPaid () {
  if (!receiptBase64.value) {
    errorMessage.value = 'يجب إرفاق صورة وصل التحويل'

    return
  }
  acting.value = true
  try {
    await Admin.markWithdrawalPaid(current.value.id, {
      method: payMethod.value,
      reference: payReference.value || undefined,
      destination: payDestination.value || undefined,
      receiptImage: receiptBase64.value,
    })
    paidDialog.value = false
    await fetchPage()
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر تأكيد التحويل'
  } finally {
    acting.value = false
  }
}

function viewReceipt (url) {
  viewerUrl.value = url.startsWith('http') ? url : `${SERVER_BASE}${url}`
  viewerDialog.value = true
}

onMounted(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.userType !== 'super_admin' && user?.user_type !== 'super_admin') {
      router.push('/login')

      return
    }
  } catch {
    router.push('/login')

    return
  }
  fetchPage()
})
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="ri-bank-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">
          طلبات سحب الأساتذة
        </h3>
        <VSpacer />
        <VBtn
          color="primary"
          variant="tonal"
          rounded="circle"
          size="small"
          icon="ri-refresh-line"
          :loading="loading"
          @click="fetchPage"
        />
      </VCardTitle>
    </VCard>

    <VCard
      class="mb-4"
      rounded="lg"
      elevation="2"
    >
      <VTabs
        :model-value="activeStatus"
        color="primary"
        align-tabs="center"
        grow
        @update:model-value="onTabChange"
      >
        <VTab
          v-for="s in STATUSES"
          :key="s.value"
          :value="s.value"
        >
          <VIcon
            :icon="s.icon"
            class="me-2"
          />
          {{ s.label }}
        </VTab>
      </VTabs>
    </VCard>

    <VCard
      elevation="3"
      rounded="lg"
    >
      <VCardItem>
        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-3"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </VAlert>

        <template v-if="loading">
          <VSkeletonLoader
            v-for="n in 6"
            :key="n"
            type="list-item-two-line"
            class="mb-2"
          />
        </template>

        <div
          v-else-if="!items.length"
          class="text-center py-12"
        >
          <VIcon
            icon="ri-inbox-line"
            size="64"
            color="grey-lighten-1"
            class="mb-4"
          />
          <div class="text-h6 text-medium-emphasis">
            لا توجد طلبات بهذه الحالة
          </div>
        </div>

        <VTable
          v-else
          density="comfortable"
          class="text-no-wrap"
        >
          <thead>
            <tr>
              <th>الأستاذ</th>
              <th>البريد</th>
              <th class="text-center">
                المبلغ (د.ع)
              </th>
              <th>تاريخ الطلب</th>
              <th class="text-center">
                الحالة
              </th>
              <th class="text-center">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in items"
              :key="row.id"
            >
              <td>{{ row.teacher_name }}</td>
              <td dir="ltr">
                {{ row.teacher_email }}
              </td>
              <td class="text-center font-weight-bold">
                {{ fmtMoney(row.amount_iqd) }}
              </td>
              <td>{{ fmtDate(row.created_at) }}</td>
              <td class="text-center">
                <VChip
                  :color="statusMeta(row.status).color"
                  size="small"
                  variant="tonal"
                >
                  {{ statusMeta(row.status).label }}
                </VChip>
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1">
                  <template v-if="row.status === 'pending'">
                    <VBtn
                      size="small"
                      color="success"
                      variant="tonal"
                      :loading="acting"
                      @click="approve(row)"
                    >
                      موافقة
                    </VBtn>
                    <VBtn
                      size="small"
                      color="error"
                      variant="tonal"
                      @click="openReject(row)"
                    >
                      رفض
                    </VBtn>
                  </template>
                  <template v-else-if="row.status === 'approved'">
                    <VBtn
                      size="small"
                      color="primary"
                      variant="elevated"
                      @click="openPaid(row)"
                    >
                      تأكيد التحويل
                    </VBtn>
                    <VBtn
                      size="small"
                      color="error"
                      variant="text"
                      @click="openReject(row)"
                    >
                      رفض
                    </VBtn>
                  </template>
                  <template v-else-if="row.status === 'paid'">
                    <VBtn
                      v-if="row.payout_receipt_url"
                      size="small"
                      color="info"
                      variant="tonal"
                      prepend-icon="ri-image-line"
                      @click="viewReceipt(row.payout_receipt_url)"
                    >
                      الوصل
                    </VBtn>
                  </template>
                  <template v-else>
                    <span class="text-medium-emphasis text-caption">
                      {{ row.rejection_reason || '—' }}
                    </span>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardItem>

      <VDivider v-if="items.length" />
      <VCardActions
        v-if="items.length"
        class="justify-center py-4"
      >
        <VPagination
          :model-value="page"
          :length="totalPages"
          :total-visible="7"
          @update:model-value="goPage"
        />
      </VCardActions>
    </VCard>

    <!-- Reject dialog -->
    <VDialog
      v-model="rejectDialog"
      max-width="480"
    >
      <VCard rounded="lg">
        <VCardTitle class="text-h6 py-4">
          رفض طلب السحب
        </VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-3 text-medium-emphasis">
            سيُعاد المبلغ إلى محفظة الأستاذ. اذكر سبب الرفض:
          </p>
          <VTextarea
            v-model="rejectReason"
            label="سبب الرفض"
            variant="outlined"
            rows="3"
            auto-grow
          />
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn
            variant="text"
            @click="rejectDialog = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="error"
            variant="elevated"
            :loading="acting"
            :disabled="!rejectReason.trim()"
            @click="submitReject"
          >
            تأكيد الرفض
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Mark-paid dialog -->
    <VDialog
      v-model="paidDialog"
      max-width="560"
    >
      <VCard rounded="lg">
        <VCardTitle class="text-h6 py-4">
          تأكيد تحويل المبلغ
        </VCardTitle>
        <VCardText>
          <p
            v-if="current"
            class="text-body-1 mb-4"
          >
            المبلغ: <strong>{{ fmtMoney(current.amount_iqd) }} د.ع</strong>
            — للأستاذ {{ current.teacher_name }}
          </p>
          <VSelect
            v-model="payMethod"
            :items="PAYOUT_METHODS"
            label="طريقة التحويل"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="payReference"
            label="رقم العملية / المرجع (اختياري)"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="payDestination"
            label="جهة الاستلام (اختياري)"
            variant="outlined"
            class="mb-3"
          />
          <VFileInput
            label="صورة وصل التحويل (إلزامية)"
            variant="outlined"
            accept="image/*"
            prepend-icon="ri-image-line"
            @change="onReceiptPicked"
          />
          <VImg
            v-if="receiptBase64"
            :src="receiptBase64"
            max-height="220"
            class="rounded mt-2"
          />
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn
            variant="text"
            @click="paidDialog = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="primary"
            variant="elevated"
            :loading="acting"
            :disabled="!receiptBase64"
            @click="submitPaid"
          >
            تأكيد التحويل
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Receipt viewer -->
    <VDialog
      v-model="viewerDialog"
      max-width="640"
    >
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center py-3">
          وصل التحويل
          <VSpacer />
          <VBtn
            icon="ri-close-line"
            variant="text"
            size="small"
            @click="viewerDialog = false"
          />
        </VCardTitle>
        <VCardText>
          <VImg
            :src="viewerUrl"
            max-height="600"
            contain
          />
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>
