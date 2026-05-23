<script setup>
// Video courses — moderation queue (Phase 10.1.A).
//
// Tabs: pending_review / approved / hidden / rejected.
// Filters: subject (free-text) + teaching stage (free-text). Free-text
// search hits title / description / subject / teaching_stage.
//
// The page only renders the table; row-level actions live on the detail
// page so this stays a focused triage view.

import Admin from '@/api/admin/admin_api.js'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'pending_review', label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  { value: 'approved',       label: 'مقبولة',          color: 'success', icon: 'ri-check-double-line' },
  { value: 'hidden',         label: 'مخفية',           color: 'secondary', icon: 'ri-eye-off-line' },
  { value: 'rejected',       label: 'مرفوضة',          color: 'error',   icon: 'ri-close-circle-line' },
]

const activeStatus = ref(route.query.status || 'pending_review')
const search = ref(route.query.search || '')
const subject = ref(route.query.subject || '')
const teachingStage = ref(route.query.teachingStage || '')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'الدورات المرئية', disabled: true },
]

const headers = [
  { title: 'العنوان',       key: 'title',         sortable: false },
  { title: 'المادة',        key: 'subject',       sortable: false },
  { title: 'المرحلة',       key: 'teachingStage', sortable: false },
  { title: 'الرؤية',        key: 'visibility',    sortable: false, align: 'center' },
  { title: 'مجاني/مدفوع',   key: 'isFree',        sortable: false, align: 'center' },
  { title: 'الحالة',        key: 'status',        sortable: false, align: 'center' },
  { title: 'تاريخ الإضافة', key: 'createdAt',     sortable: false },
  { title: '',              key: 'actions',       sortable: false, align: 'center' },
]

async function fetchPage () {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.listVideoCourses({
      page: page.value,
      limit: limit.value,
      status: activeStatus.value,
      search: search.value || undefined,
      subject: subject.value || undefined,
      teachingStage: teachingStage.value || undefined,
    })
    const body = res?.data || {}
    items.value = Array.isArray(body.data) ? body.data : []
    total.value = Number(body.meta?.pagination?.total ?? 0)
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || err?.message || 'تعذر تحميل الدورات'
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
      subject: subject.value || undefined,
      teachingStage: teachingStage.value || undefined,
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
  subject.value = ''
  teachingStage.value = ''
  onSearchSubmit()
}

function onPageChange (newPage) {
  page.value = newPage
  syncRouteQuery()
  fetchPage()
}

function statusVisuals (statusValue) {
  return STATUSES.find(s => s.value === statusValue) || {
    label: statusValue, color: 'default', icon: 'ri-question-line',
  }
}

function formatDate (iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return iso }
}

function goToDetail (item) {
  router.push(`/admin/video-courses/${item.id}`)
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

onMounted(() => {
  fetchPage()
})

definePage({
  meta: { layout: 'default' },
})
</script>

<template>
  <div>
    <VBreadcrumbs :items="breadcrumbItems" class="px-0 mb-4" />

    <VCard>
      <VCardText>
        <div class="d-flex flex-wrap align-center mb-4 ga-2">
          <h2 class="text-h5 ma-0">الدورات المرئية</h2>
          <VSpacer />
          <VChip variant="tonal" color="info" size="small">
            {{ total }} دورة
          </VChip>
        </div>

        <!-- Status tabs -->
        <VTabs
          v-model="activeStatus"
          color="primary"
          class="mb-4"
          @update:model-value="onTabChange"
        >
          <VTab v-for="s in STATUSES" :key="s.value" :value="s.value">
            <VIcon :icon="s.icon" start size="18" />
            {{ s.label }}
          </VTab>
        </VTabs>

        <!-- Filter row -->
        <VRow dense class="mb-2">
          <VCol cols="12" md="4">
            <VTextField
              v-model="search"
              density="comfortable"
              variant="outlined"
              label="بحث في العنوان / الوصف"
              prepend-inner-icon="ri-search-line"
              clearable
              hide-details
              @keydown.enter="onSearchSubmit"
              @click:clear="clearSearch"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VTextField
              v-model="subject"
              density="comfortable"
              variant="outlined"
              label="المادة"
              hide-details
              @keydown.enter="onSearchSubmit"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VTextField
              v-model="teachingStage"
              density="comfortable"
              variant="outlined"
              label="المرحلة"
              hide-details
              @keydown.enter="onSearchSubmit"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VBtn
              block
              color="primary"
              @click="onSearchSubmit"
            >
              <VIcon start icon="ri-filter-line" /> تطبيق
            </VBtn>
          </VCol>
        </VRow>

        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ errorMessage }}
        </VAlert>

        <VDataTable
          :headers="headers"
          :items="items"
          :loading="loading"
          :items-per-page="limit"
          hide-default-footer
          item-value="id"
          density="comfortable"
          class="elevation-1"
        >
          <template #item.title="{ item }">
            <div class="font-weight-medium">{{ item.title }}</div>
            <div v-if="item.description" class="text-caption text-medium-emphasis text-truncate" style="max-width: 320px">
              {{ item.description }}
            </div>
          </template>

          <template #item.visibility="{ item }">
            <VChip
              v-if="item.visibility === 'public'"
              size="x-small"
              color="success"
              variant="tonal"
            >
              عامة
            </VChip>
            <VChip v-else size="x-small" color="secondary" variant="tonal">
              خاصة
            </VChip>
          </template>

          <template #item.isFree="{ item }">
            <VChip
              v-if="item.isFree"
              size="x-small"
              color="success"
              variant="tonal"
            >
              مجاني
            </VChip>
            <VChip v-else size="x-small" color="warning" variant="tonal">
              مدفوع
            </VChip>
          </template>

          <template #item.status="{ item }">
            <VChip
              :color="statusVisuals(item.status).color"
              size="small"
              variant="tonal"
            >
              <VIcon start size="14" :icon="statusVisuals(item.status).icon" />
              {{ statusVisuals(item.status).label }}
            </VChip>
          </template>

          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>

          <template #item.actions="{ item }">
            <VBtn
              size="small"
              variant="tonal"
              color="primary"
              @click="goToDetail(item)"
            >
              <VIcon start size="16" icon="ri-eye-line" />
              عرض
            </VBtn>
          </template>

          <template #no-data>
            <div class="text-center pa-4 text-medium-emphasis">
              لا يوجد دورات تطابق هذا الفلتر.
            </div>
          </template>
        </VDataTable>

        <div class="d-flex justify-center mt-4">
          <VPagination
            v-if="pageCount > 1"
            v-model="page"
            :length="pageCount"
            :total-visible="6"
            @update:model-value="onPageChange"
          />
        </div>
      </VCardText>
    </VCard>
  </div>
</template>
