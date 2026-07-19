<script setup>
import Admin from '@/api/admin/admin_api.js'
import { formatLocaleDateTime12 } from '@/utils/time-format'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'pending_review', label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  { value: 'running', label: 'نشط', color: 'success', icon: 'ri-play-circle-line' },
  { value: 'approved', label: 'موافق عليه', color: 'info', icon: 'ri-check-line' },
  { value: 'rejected', label: 'مرفوض', color: 'error', icon: 'ri-close-circle-line' },
  { value: 'finished', label: 'منتهي', color: 'default', icon: 'ri-flag-line' },
  { value: 'budget_exhausted', label: 'نفدت الميزانية', color: 'secondary', icon: 'ri-money-dollar-circle-line' },
]

const activeStatus = ref(route.query.status || 'pending_review')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)
const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const detailOpen = ref(false)
const selected = ref(null)
const detailLoading = ref(false)
const rejectOpen = ref(false)
const rejectReason = ref('')
const actionLoading = ref(false)

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'طلبات الإعلانات', disabled: true },
]

function fmtDate(iso) {
  return formatLocaleDateTime12(iso)
}

function statusMeta(value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0]
}

function fmtIqd(v) {
  return Number(v || 0).toLocaleString('ar-IQ')
}

async function fetchPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.listAdvertisements({
      page: page.value,
      limit: limit.value,
      status: activeStatus.value,
    })
    const body = res?.data || {}
    items.value = Array.isArray(body.data) ? body.data : []
    total.value = Number(body.meta?.pagination?.total ?? 0)
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || err?.message || 'تعذر تحميل الإعلانات'
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  detailOpen.value = true
  detailLoading.value = true
  selected.value = row
  try {
    const res = await Admin.getAdvertisement(row.id)
    selected.value = { ...row, ...(res?.data?.data?.advertisement || res?.data?.advertisement || {}), wallet: res?.data?.data?.teacherWallet }
  } finally {
    detailLoading.value = false
  }
}

async function approveSelected() {
  if (!selected.value) return
  actionLoading.value = true
  try {
    await Admin.approveAdvertisement(selected.value.id, {})
    detailOpen.value = false
    await fetchPage()
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر الموافقة'
  } finally {
    actionLoading.value = false
  }
}

async function confirmReject() {
  if (!selected.value || !rejectReason.value.trim()) return
  actionLoading.value = true
  try {
    await Admin.rejectAdvertisement(selected.value.id, rejectReason.value.trim())
    rejectOpen.value = false
    detailOpen.value = false
    rejectReason.value = ''
    await fetchPage()
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر الرفض'
  } finally {
    actionLoading.value = false
  }
}

function syncRouteQuery() {
  router.replace({
    query: {
      ...route.query,
      status: activeStatus.value,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  })
}

function onTabChange(newStatus) {
  activeStatus.value = newStatus
  page.value = 1
  syncRouteQuery()
  fetchPage()
}

function goPage(newPage) {
  page.value = newPage
  syncRouteQuery()
  fetchPage()
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

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

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-megaphone-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">طلبات الإعلانات</h3>
        <VSpacer />
        <VBtn color="primary" variant="tonal" size="small" icon="ri-refresh-line" :loading="loading" @click="fetchPage" />
      </VCardTitle>
      <VCardText class="pt-0 text-medium-emphasis">
        مراجعة إعلانات المعلمين والموافقة عليها أو رفضها.
      </VCardText>
    </VCard>

    <VCard class="mb-4" rounded="lg" elevation="2">
      <VTabs :model-value="activeStatus" color="primary" align-tabs="center" grow @update:model-value="onTabChange">
        <VTab v-for="s in STATUSES" :key="s.value" :value="s.value">
          <VIcon :icon="s.icon" class="me-2" />
          {{ s.label }}
        </VTab>
      </VTabs>
    </VCard>

    <VCard elevation="3" rounded="lg">
      <VCardItem>
        <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable @click:close="errorMessage = ''">
          {{ errorMessage }}
        </VAlert>

        <template v-if="loading">
          <VSkeletonLoader v-for="n in 6" :key="n" type="list-item-two-line" class="mb-2" />
        </template>

        <div v-else-if="!items.length" class="text-center py-12">
          <VIcon icon="ri-inbox-line" size="64" color="grey-lighten-1" class="mb-4" />
          <div class="text-h6 text-medium-emphasis">لا توجد إعلانات بهذه الحالة</div>
        </div>

        <VTable v-else density="comfortable" class="text-no-wrap">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>المعلم</th>
              <th>الميزانية</th>
              <th>النقرات</th>
              <th>التاريخ</th>
              <th class="text-center">الحالة</th>
              <th class="text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in items" :key="row.id">
              <td>{{ row.title }}</td>
              <td>{{ row.teacherName || row.teacher_name || '—' }}</td>
              <td>{{ fmtIqd(row.budgetTotal ?? row.budget_total) }} د.ع</td>
              <td>{{ row.uniqueClicks ?? row.unique_clicks ?? 0 }}</td>
              <td>{{ fmtDate(row.createdAt ?? row.created_at) }}</td>
              <td class="text-center">
                <VChip :color="statusMeta(row.status).color" size="small" variant="tonal">
                  {{ statusMeta(row.status).label }}
                </VChip>
              </td>
              <td class="text-center">
                <VBtn size="small" variant="tonal" @click="openDetail(row)">عرض</VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardItem>

      <VDivider v-if="items.length" />
      <VCardActions v-if="items.length" class="justify-center py-4">
        <VPagination :model-value="page" :length="totalPages" :total-visible="7" @update:model-value="goPage" />
      </VCardActions>
    </VCard>

    <VDialog v-model="detailOpen" max-width="720">
      <VCard v-if="selected" rounded="lg">
        <VCardTitle class="pa-4">{{ selected.title }}</VCardTitle>
        <VCardText>
          <VSkeletonLoader v-if="detailLoading" type="article" />
          <template v-else>
            <p class="text-medium-emphasis mb-4">{{ selected.description }}</p>
            <div class="d-flex flex-wrap gap-4 mb-4">
              <div><strong>الميزانية:</strong> {{ fmtIqd(selected.budgetTotal) }} د.ع</div>
              <div><strong>المتبقي:</strong> {{ fmtIqd(selected.budgetRemaining) }} د.ع</div>
              <div><strong>سعر النقرة:</strong> {{ fmtIqd(selected.costPerClick) }} د.ع</div>
            </div>
            <div v-if="selected.wallet" class="text-caption text-medium-emphasis">
              محفظة المعلم: {{ fmtIqd(selected.wallet.balance) }} د.ع
            </div>
          </template>
        </VCardText>
        <VCardActions v-if="selected.status === 'pending_review'">
          <VSpacer />
          <VBtn color="error" variant="tonal" :loading="actionLoading" @click="rejectOpen = true">رفض</VBtn>
          <VBtn color="success" :loading="actionLoading" @click="approveSelected">موافقة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="rejectOpen" max-width="480">
      <VCard rounded="lg">
        <VCardTitle>سبب الرفض</VCardTitle>
        <VCardText>
          <VTextarea v-model="rejectReason" rows="4" label="السبب" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="rejectOpen = false">إلغاء</VBtn>
          <VBtn color="error" :loading="actionLoading" @click="confirmReject">تأكيد الرفض</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
