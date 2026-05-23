<script setup>
// Video course — moderation detail page (Phase 10.1.A).
//
// Loads the course + its lessons. Surfaces course metadata, lesson Bunny
// processing status (PENDING → UPLOADED → PROCESSING → READY | FAILED), and
// the four moderation actions: approve / hide / reject / delete.

import Admin from '@/api/admin/admin_api.js'

const route = useRoute()
const router = useRouter()

const id = computed(() => String(route.params.id))

const loading = ref(true)
const errorMessage = ref('')
const course = ref(null)
const lessons = ref([])

// Action modal state — a single dialog handles approve/hide/reject by
// dispatching to the right API method on confirm.
const dialog = ref(false)
const dialogMode = ref('approve') // approve | hide | reject | delete
const reviewNotes = ref('')
const acting = ref(false)
const actionError = ref('')

const COURSE_STATUS_VISUALS = {
  pending_review: { label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  approved:       { label: 'مقبولة',           color: 'success', icon: 'ri-check-double-line' },
  hidden:         { label: 'مخفية',            color: 'secondary', icon: 'ri-eye-off-line' },
  rejected:       { label: 'مرفوضة',           color: 'error',   icon: 'ri-close-circle-line' },
}

const BUNNY_STATUS_VISUALS = {
  pending:    { label: 'بانتظار الرفع',    color: 'secondary', icon: 'ri-time-line' },
  uploaded:   { label: 'تم الرفع',         color: 'info',      icon: 'ri-upload-line' },
  processing: { label: 'قيد المعالجة',     color: 'warning',   icon: 'ri-loader-2-line' },
  ready:      { label: 'جاهز',             color: 'success',   icon: 'ri-checkbox-circle-line' },
  failed:     { label: 'فشل',              color: 'error',     icon: 'ri-error-warning-line' },
}

const breadcrumbItems = computed(() => [
  { title: 'الرئيسية',         to: '/admin/dashboard',     disabled: false },
  { title: 'الدورات المرئية',  to: '/admin/video-courses', disabled: false },
  { title: course.value?.title || '...', disabled: true },
])

async function fetchCourse () {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.getVideoCourse(id.value)
    const body = res?.data?.data || {}
    course.value = body.course || null
    lessons.value = Array.isArray(body.lessons) ? body.lessons : []
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || err?.message || 'تعذر تحميل الدورة'
  } finally {
    loading.value = false
  }
}

function openDialog (mode) {
  dialogMode.value = mode
  reviewNotes.value = ''
  actionError.value = ''
  dialog.value = true
}

async function confirmAction () {
  acting.value = true
  actionError.value = ''
  try {
    if (dialogMode.value === 'approve') {
      await Admin.approveVideoCourse(id.value, { reviewNotes: reviewNotes.value || undefined })
    } else if (dialogMode.value === 'hide') {
      await Admin.hideVideoCourse(id.value, { reviewNotes: reviewNotes.value || undefined })
    } else if (dialogMode.value === 'reject') {
      if (!reviewNotes.value || reviewNotes.value.trim().length < 3) {
        actionError.value = 'سبب الرفض مطلوب (3 أحرف على الأقل).'
        acting.value = false
        return
      }
      await Admin.rejectVideoCourse(id.value, { reviewNotes: reviewNotes.value.trim() })
    } else if (dialogMode.value === 'delete') {
      await Admin.deleteVideoCourse(id.value)
      dialog.value = false
      router.push('/admin/video-courses')
      return
    }
    dialog.value = false
    await fetchCourse()
  } catch (err) {
    actionError.value =
      err?.response?.data?.message || err?.message || 'تعذرت العملية'
  } finally {
    acting.value = false
  }
}

const dialogConfig = computed(() => {
  switch (dialogMode.value) {
    case 'approve':
      return { title: 'الموافقة على الدورة', confirmLabel: 'موافقة', color: 'success', notesRequired: false, notesLabel: 'ملاحظة (اختياري)' }
    case 'hide':
      return { title: 'إخفاء الدورة', confirmLabel: 'إخفاء', color: 'secondary', notesRequired: false, notesLabel: 'سبب الإخفاء (اختياري)' }
    case 'reject':
      return { title: 'رفض الدورة', confirmLabel: 'رفض', color: 'error', notesRequired: true, notesLabel: 'سبب الرفض (مطلوب)' }
    case 'delete':
      return { title: 'حذف الدورة', confirmLabel: 'حذف', color: 'error', notesRequired: false, notesLabel: '' }
    default:
      return { title: '', confirmLabel: '', color: 'primary', notesRequired: false, notesLabel: '' }
  }
})

function formatDate (iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function formatDuration (seconds) {
  const s = Number(seconds || 0)
  if (!s) return '—'
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

const courseStatus = computed(() => {
  if (!course.value) return null
  return COURSE_STATUS_VISUALS[course.value.status] || { label: course.value.status, color: 'default', icon: 'ri-question-line' }
})

onMounted(() => {
  fetchCourse()
})

definePage({
  meta: { layout: 'default' },
})
</script>

<template>
  <div>
    <VBreadcrumbs :items="breadcrumbItems" class="px-0 mb-4" />

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
      <div class="text-medium-emphasis mt-2">جارٍ التحميل…</div>
    </div>

    <template v-else-if="course">
      <!-- Course header -->
      <VCard class="mb-4">
        <VCardText>
          <div class="d-flex flex-wrap align-center mb-3 ga-3">
            <div class="flex-grow-1">
              <h2 class="text-h5 ma-0">{{ course.title }}</h2>
              <div class="text-medium-emphasis mt-1">
                {{ course.subject }} · {{ course.teachingStage }}
              </div>
            </div>
            <VChip
              v-if="courseStatus"
              :color="courseStatus.color"
              variant="tonal"
            >
              <VIcon start size="16" :icon="courseStatus.icon" />
              {{ courseStatus.label }}
            </VChip>
          </div>

          <VRow dense class="mb-2">
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">الوصف</div>
              <div>{{ course.description || '—' }}</div>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-medium-emphasis">الرؤية</div>
              <VChip
                size="small"
                :color="course.visibility === 'public' ? 'success' : 'secondary'"
                variant="tonal"
              >
                {{ course.visibility === 'public' ? 'عامة' : 'خاصة' }}
              </VChip>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-medium-emphasis">السعر</div>
              <VChip
                size="small"
                :color="course.isFree ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ course.isFree ? 'مجاني' : `${course.price} د.ع` }}
              </VChip>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-medium-emphasis">تاريخ الإضافة</div>
              <div>{{ formatDate(course.createdAt) }}</div>
            </VCol>
            <VCol cols="6" md="3">
              <div class="text-caption text-medium-emphasis">آخر تحديث</div>
              <div>{{ formatDate(course.updatedAt) }}</div>
            </VCol>
            <VCol v-if="course.reviewedAt" cols="6" md="3">
              <div class="text-caption text-medium-emphasis">تاريخ المراجعة</div>
              <div>{{ formatDate(course.reviewedAt) }}</div>
            </VCol>
            <VCol v-if="course.reviewNotes" cols="12">
              <div class="text-caption text-medium-emphasis">ملاحظات المراجع</div>
              <div class="pa-2 mt-1 rounded" style="background: rgba(0,0,0,0.04)">
                {{ course.reviewNotes }}
              </div>
            </VCol>
          </VRow>

          <!-- Moderation actions -->
          <div class="d-flex flex-wrap ga-2 mt-4">
            <VBtn
              color="success"
              :disabled="course.status === 'approved'"
              @click="openDialog('approve')"
            >
              <VIcon start icon="ri-check-line" /> موافقة
            </VBtn>
            <VBtn
              color="secondary"
              :disabled="course.status === 'hidden'"
              @click="openDialog('hide')"
            >
              <VIcon start icon="ri-eye-off-line" /> إخفاء
            </VBtn>
            <VBtn
              color="error"
              :disabled="course.status === 'rejected'"
              @click="openDialog('reject')"
            >
              <VIcon start icon="ri-close-circle-line" /> رفض
            </VBtn>
            <VSpacer />
            <VBtn
              color="error"
              variant="text"
              @click="openDialog('delete')"
            >
              <VIcon start icon="ri-delete-bin-line" /> حذف
            </VBtn>
          </div>
        </VCardText>
      </VCard>

      <!-- Lessons -->
      <VCard>
        <VCardText>
          <div class="d-flex align-center mb-3">
            <h3 class="text-h6 ma-0">الدروس ({{ lessons.length }})</h3>
          </div>
          <div v-if="lessons.length === 0" class="text-center pa-4 text-medium-emphasis">
            لم يضف الأستاذ أي درس بعد.
          </div>
          <VList v-else density="comfortable" class="bg-transparent">
            <VListItem
              v-for="lesson in lessons"
              :key="lesson.id"
              class="border rounded mb-2"
              :ripple="false"
            >
              <template #prepend>
                <VAvatar size="36" color="primary" variant="tonal">
                  <span>{{ lesson.displayOrder + 1 }}</span>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">
                {{ lesson.title }}
              </VListItemTitle>
              <VListItemSubtitle v-if="lesson.description" class="text-caption">
                {{ lesson.description }}
              </VListItemSubtitle>
              <template #append>
                <div class="d-flex align-center ga-2">
                  <span class="text-caption text-medium-emphasis">
                    {{ formatDuration(lesson.durationSeconds) }}
                  </span>
                  <VChip
                    size="x-small"
                    :color="(BUNNY_STATUS_VISUALS[lesson.bunnyStatus] || {}).color || 'default'"
                    variant="tonal"
                  >
                    <VIcon start size="12" :icon="(BUNNY_STATUS_VISUALS[lesson.bunnyStatus] || {}).icon || 'ri-question-line'" />
                    {{ (BUNNY_STATUS_VISUALS[lesson.bunnyStatus] || {}).label || lesson.bunnyStatus }}
                  </VChip>
                </div>
              </template>
            </VListItem>
          </VList>
        </VCardText>
      </VCard>
    </template>

    <!-- Confirmation dialog -->
    <VDialog v-model="dialog" max-width="480" persistent>
      <VCard>
        <VCardTitle>{{ dialogConfig.title }}</VCardTitle>
        <VCardText>
          <VAlert
            v-if="dialogMode === 'delete'"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            هل أنت متأكد من حذف الدورة؟ سيتم إخفاؤها فوراً من كل الواجهات. هذا
            الإجراء قابل للاستعادة فقط عبر قاعدة البيانات.
          </VAlert>
          <VTextarea
            v-if="dialogMode !== 'delete'"
            v-model="reviewNotes"
            :label="dialogConfig.notesLabel"
            rows="3"
            density="comfortable"
            variant="outlined"
            hide-details="auto"
          />
          <VAlert
            v-if="actionError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ actionError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="acting" @click="dialog = false">إلغاء</VBtn>
          <VBtn
            :color="dialogConfig.color"
            :loading="acting"
            @click="confirmAction"
          >
            {{ dialogConfig.confirmLabel }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
