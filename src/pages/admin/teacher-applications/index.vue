<script setup>
// Teacher Applications — list view (Phase 5).
//
// Tabs: pending / needs_more_info / approved / rejected.
// Each tab is a status filter; pagination + free-text search stay shared
// so switching tabs preserves the search term but resets pagination.
//
// The page itself only renders the table; the row-level actions
// (approve/reject/more-info) live on the detail page. We expose only a
// "view" action here to keep the list focused.

import Admin from '@/api/admin/admin_api.js'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'pending',          label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  { value: 'needs_more_info',  label: 'معلومات إضافية',   color: 'info',    icon: 'ri-question-line' },
  { value: 'approved',         label: 'مقبولة',           color: 'success', icon: 'ri-check-double-line' },
  { value: 'rejected',         label: 'مرفوضة',           color: 'error',   icon: 'ri-close-circle-line' },
]

// Tab state — kept in the URL so a refresh / share preserves it.
const activeStatus = ref(route.query.status || 'pending')
const search = ref(route.query.search || '')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'طلبات الانضمام للأساتذة', disabled: true },
]

const headers = [
  { title: 'الاسم الكامل',  key: 'fullName',       sortable: false },
  { title: 'البريد',        key: 'email',          sortable: false },
  { title: 'الهاتف',        key: 'phone',          sortable: false },
  { title: 'المادة',        key: 'subject',        sortable: false },
  { title: 'الخبرة',        key: 'yearsOfExperience', sortable: false, align: 'center' },
  { title: 'المدينة',       key: 'city',           sortable: false },
  { title: 'تاريخ التقديم', key: 'createdAt',      sortable: false },
  { title: '',              key: 'actions',        sortable: false, align: 'center' },
]

async function fetchPage () {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.listTeacherApplications({
      page: page.value,
      limit: limit.value,
      status: activeStatus.value,
      search: search.value || undefined,
    })

    const body = res?.data || {}

    items.value = Array.isArray(body.data) ? body.data : []
    total.value = Number(body.meta?.pagination?.total ?? 0)
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || err?.message || 'تعذر تحميل الطلبات'
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
      search: search.value || undefined,
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

function onSearchSubmit () {
  page.value = 1
  syncRouteQuery()
  fetchPage()
}

function clearSearch () {
  search.value = ''
  onSearchSubmit()
}

function goPage (newPage) {
  page.value = newPage
  syncRouteQuery()
  fetchPage()
}

function viewDetail (item) {
  router.push({ path: `/admin/teacher-applications/${item.id}` })
}

function formatDate (iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

onMounted(fetchPage)
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Header strip -->
    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="ri-user-add-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">
          طلبات انضمام الأساتذة
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

    <!-- Tabs -->
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

    <!-- Filters -->
    <VCard
      class="mb-4"
      elevation="2"
      rounded="lg"
    >
      <VCardItem>
        <VRow class="align-center">
          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model="search"
              label="بحث بالاسم أو البريد أو الهاتف أو المادة"
              variant="outlined"
              density="comfortable"
              clearable
              prepend-inner-icon="ri-search-line"
              @keyup.enter="onSearchSubmit"
              @click:clear="clearSearch"
            />
          </VCol>
          <VCol
            cols="12"
            md="6"
            class="d-flex justify-end align-center"
          >
            <VChip
              color="primary"
              variant="elevated"
            >
              {{ total.toLocaleString('ar-IQ') }} سجل
            </VChip>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Table card -->
    <VCard
      elevation="3"
      rounded="lg"
    >
      <VCardItem>
        <!-- Error banner -->
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

        <!-- Loading skeleton -->
        <template v-if="loading">
          <VSkeletonLoader
            v-for="n in 6"
            :key="n"
            type="list-item-avatar-two-line"
            class="mb-2"
          />
        </template>

        <!-- Empty state -->
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

        <!-- Data table -->
        <VTable
          v-else
          density="comfortable"
          class="text-no-wrap"
        >
          <thead>
            <tr>
              <th
                v-for="h in headers"
                :key="h.key"
                :class="h.align === 'center' ? 'text-center' : ''"
              >
                {{ h.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in items"
              :key="row.id"
              style="cursor: pointer"
              @click="viewDetail(row)"
            >
              <td>{{ row.fullName }}</td>
              <td dir="ltr">
                {{ row.email }}
              </td>
              <td dir="ltr">
                {{ row.phone }}
              </td>
              <td>{{ row.subject }}</td>
              <td class="text-center">
                {{ row.yearsOfExperience }} سنة
              </td>
              <td>{{ row.city }}</td>
              <td>{{ formatDate(row.createdAt) }}</td>
              <td class="text-center">
                <VBtn
                  icon="ri-eye-line"
                  variant="tonal"
                  color="primary"
                  size="small"
                  @click.stop="viewDetail(row)"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardItem>

      <!-- Pagination -->
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
