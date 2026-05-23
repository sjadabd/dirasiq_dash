<script setup>
// Teacher's own video courses — list view (Phase 10.1.B.3).

import Teacher from '@/api/teacher/teacher_api.js'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'all',            label: 'الكل',              color: 'default',   icon: 'ri-list-check' },
  { value: 'pending_review', label: 'بانتظار المراجعة', color: 'warning',   icon: 'ri-time-line' },
  { value: 'approved',       label: 'مقبولة',           color: 'success',   icon: 'ri-check-double-line' },
  { value: 'hidden',         label: 'مخفية',            color: 'secondary', icon: 'ri-eye-off-line' },
  { value: 'rejected',       label: 'مرفوضة',           color: 'error',     icon: 'ri-close-circle-line' },
]

const activeStatus = ref(route.query.status || 'all')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

// New-course dialog state
const dialogOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const draft = ref({
  title: '',
  description: '',
  subject: '',
  teachingStage: '',
  isFree: true,
  price: 0,
  visibility: 'private',
})

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/teacher/dashboard', disabled: false },
  { title: 'الدورات المرئية', disabled: true },
]

async function fetchPage () {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Teacher.listMyVideoCourses({
      page: page.value,
      limit: limit.value,
      status: activeStatus.value === 'all' ? undefined : activeStatus.value,
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
      status: activeStatus.value !== 'all' ? activeStatus.value : undefined,
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

function onPageChange (newPage) {
  page.value = newPage
  syncRouteQuery()
  fetchPage()
}

function openCreateDialog () {
  draft.value = {
    title: '',
    description: '',
    subject: '',
    teachingStage: '',
    isFree: true,
    price: 0,
    visibility: 'private',
  }
  createError.value = ''
  dialogOpen.value = true
}

async function submitCreate () {
  creating.value = true
  createError.value = ''
  try {
    const res = await Teacher.createVideoCourse({
      title: draft.value.title.trim(),
      description: draft.value.description.trim() || undefined,
      subject: draft.value.subject.trim(),
      teachingStage: draft.value.teachingStage.trim(),
      isFree: draft.value.isFree,
      price: draft.value.isFree ? 0 : Number(draft.value.price || 0),
      visibility: draft.value.visibility,
    })
    const id = res?.data?.data?.course?.id
    dialogOpen.value = false
    if (id) {
      router.push(`/teacher/video-courses/${id}`)
    } else {
      await fetchPage()
    }
  } catch (err) {
    createError.value =
      err?.response?.data?.message || err?.message || 'تعذر إنشاء الدورة'
  } finally {
    creating.value = false
  }
}

function statusVisuals (s) {
  return STATUSES.find(x => x.value === s) || {
    label: s, color: 'default', icon: 'ri-question-line',
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

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

onMounted(() => { fetchPage() })

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
          <h2 class="text-h5 ma-0">دوراتي المرئية</h2>
          <VChip variant="tonal" color="info" size="small">{{ total }}</VChip>
          <VSpacer />
          <VBtn color="primary" @click="openCreateDialog">
            <VIcon start icon="ri-add-line" /> إنشاء دورة جديدة
          </VBtn>
        </div>

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

        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ errorMessage }}
        </VAlert>

        <div v-if="loading" class="text-center pa-6">
          <VProgressCircular indeterminate color="primary" />
        </div>

        <div v-else-if="items.length === 0" class="text-center pa-6 text-medium-emphasis">
          لا يوجد دورات في هذه الحالة.
        </div>

        <VRow v-else dense>
          <VCol v-for="item in items" :key="item.id" cols="12" md="6" lg="4">
            <VCard
              variant="outlined"
              class="h-100 cursor-pointer"
              @click="() => router.push(`/teacher/video-courses/${item.id}`)"
            >
              <VImg
                :src="item.coverImage || ''"
                :aspect-ratio="16/9"
                cover
                class="bg-grey-lighten-3"
              >
                <template #placeholder>
                  <div class="d-flex align-center justify-center h-100">
                    <VIcon icon="ri-image-line" size="48" color="grey" />
                  </div>
                </template>
              </VImg>
              <VCardText>
                <div class="d-flex align-center mb-2 ga-2">
                  <VChip
                    :color="statusVisuals(item.status).color"
                    size="x-small"
                    variant="tonal"
                  >
                    <VIcon start size="12" :icon="statusVisuals(item.status).icon" />
                    {{ statusVisuals(item.status).label }}
                  </VChip>
                  <VChip
                    size="x-small"
                    :color="item.visibility === 'public' ? 'success' : 'secondary'"
                    variant="tonal"
                  >
                    {{ item.visibility === 'public' ? 'عامة' : 'خاصة' }}
                  </VChip>
                </div>
                <div class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ item.title }}
                </div>
                <div class="text-caption text-medium-emphasis text-truncate">
                  {{ item.subject }} · {{ item.teachingStage }}
                </div>
                <div class="text-caption mt-2 text-medium-emphasis">
                  {{ formatDate(item.createdAt) }}
                </div>
                <div v-if="item.reviewNotes" class="text-caption mt-2 text-warning">
                  <VIcon size="14" icon="ri-information-line" /> ملاحظة من الإدارة
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

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

    <!-- Create-course dialog -->
    <VDialog v-model="dialogOpen" max-width="520" persistent>
      <VCard>
        <VCardTitle>إنشاء دورة مرئية جديدة</VCardTitle>
        <VCardText>
          <VTextField
            v-model="draft.title"
            label="عنوان الدورة *"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hide-details
          />
          <VTextarea
            v-model="draft.description"
            label="الوصف"
            rows="3"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hide-details
          />
          <VRow dense>
            <VCol cols="6">
              <VTextField
                v-model="draft.subject"
                label="المادة *"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model="draft.teachingStage"
                label="المرحلة *"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
          </VRow>
          <VSwitch
            v-model="draft.isFree"
            label="مجاني"
            color="success"
            density="compact"
            inset
            hide-details
            class="my-2"
          />
          <VTextField
            v-if="!draft.isFree"
            v-model.number="draft.price"
            type="number"
            min="0"
            label="السعر (د.ع)"
            density="comfortable"
            variant="outlined"
            hide-details
            class="mb-3"
          />
          <VSelect
            v-model="draft.visibility"
            :items="[
              { title: 'خاصة (مخفية حتى النشر)', value: 'private' },
              { title: 'عامة (تظهر بعد موافقة الإدارة)', value: 'public' },
            ]"
            label="الرؤية"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VAlert
            v-if="createError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ createError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="creating" @click="dialogOpen = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="creating" @click="submitCreate">إنشاء</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.cursor-pointer { cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
.cursor-pointer:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
</style>
