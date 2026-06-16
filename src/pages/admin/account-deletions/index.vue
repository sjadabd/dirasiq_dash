<script setup>
import Admin from '@/api/admin/admin_api.js'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'pending', label: 'بانتظار المعالجة', color: 'warning', icon: 'ri-time-line' },
  { value: 'completed', label: 'تم الحذف', color: 'success', icon: 'ri-check-double-line' },
  { value: 'cancelled', label: 'ملغاة', color: 'error', icon: 'ri-close-circle-line' },
]

const USER_TYPES = {
  student: { label: 'طالب', color: 'primary' },
  teacher: { label: 'أستاذ', color: 'secondary' },
}

const activeStatus = ref(route.query.status || 'pending')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'طلبات حذف الحساب', disabled: true },
]

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function statusMeta(value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0]
}

function userTypeMeta(value) {
  if (!value) return { label: '—', color: 'default' }

  return USER_TYPES[value] || { label: value, color: 'default' }
}

async function fetchPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.listAccountDeletionRequests({
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

    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="ri-user-unfollow-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">
          طلبات حذف الحساب
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
      <VCardText class="pt-0 text-medium-emphasis">
        عرض الطلبات المقدّمة من التطبيق. لا يتم حذف أي حساب تلقائياً حالياً — ستُضاف إدارة المعالجة لاحقاً.
      </VCardText>
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
              <th>البريد الإلكتروني</th>
              <th class="text-center">
                نوع الحساب
              </th>
              <th>الهاتف</th>
              <th>سبب الحذف</th>
              <th>تاريخ الطلب</th>
              <th class="text-center">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in items"
              :key="row.id"
            >
              <td class="text-lowercase">
                {{ row.email }}
              </td>
              <td class="text-center">
                <VChip
                  :color="userTypeMeta(row.user_type).color"
                  size="small"
                  variant="tonal"
                >
                  {{ userTypeMeta(row.user_type).label }}
                </VChip>
              </td>
              <td>{{ row.phone || '—' }}</td>
              <td class="text-truncate" style="max-width: 240px;">
                {{ row.reason || '—' }}
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
  </div>
</template>
