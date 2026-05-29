<script setup>
// Teacher's own video courses — list view (compact card grid).
//
// Phase 10.1.B.5 rewrite:
//   - Replaced the large cover-on-top cards with compact horizontal
//     cards (mini-thumbnail + title + chips + meta), 4 per row on lg+.
//   - Cover image now resolves via resolveContentUrl (absolute URL).
//   - Create dialog: subject + teachingStage are NOW DROPDOWNS sourced
//     from the teacher's own subjects + grades (no more free-text). The
//     teacher can't pick a subject/stage they don't already teach —
//     ensures the video catalog stays aligned with their classroom data.

import { useRouter, useRoute } from 'vue-router'
import Teacher from '@/api/teacher/teacher_api.js'
import { resolveContentUrl } from '@/utils/content-url.js'
import { useRealtimeSocket } from '@/composables/useRealtimeSocket'
import VideoCourseWizard from '@/components/teacher/VideoCourseWizard.vue'

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
const limit = ref(24)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

// Dropdown sources for the create dialog — the teacher's OWN subjects +
// grades (loaded once on mount).
const subjectOptions = ref([]) // { title, value }
const stageOptions = ref([])   // { title, value: gradeId, name }
const catalogLoading = ref(false)

// New-course dialog state — Phase 5 delegates the draft to the wizard
// component, so we only track the dialog open/loading/error here.
const dialogOpen = ref(false)
const creating = ref(false)
const createError = ref('')

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/teacher/dashboard', disabled: false },
  { title: 'الدورات المرئية', disabled: true },
]

async function loadCatalogs () {
  catalogLoading.value = true
  try {
    const [subjectsRes, gradesRes] = await Promise.all([
      Teacher.getAllSubjects().catch(() => null),
      Teacher.getAllMyGrades().catch(() => null),
    ])

    const subjectsData = subjectsRes?.data?.data || subjectsRes?.data || []
    const subjects = Array.isArray(subjectsData) ? subjectsData : (subjectsData.items || subjectsData.subjects || [])

    subjectOptions.value = subjects
      .map(s => ({
        title: s.name || s.title || s.subject || String(s.id || ''),
        value: s.name || s.title || s.subject,
      }))
      .filter(s => s.title)

    const gradesData = gradesRes?.data?.data || gradesRes?.data || []
    const grades = Array.isArray(gradesData) ? gradesData : (gradesData.items || gradesData.grades || [])


    // /grades/my-grades returns junction-table rows shaped as
    //   { id: <teacher_grades.id>, gradeId: <grades.id>, gradeName, ... }
    // We MUST use `gradeId` (the real grades.id) as the dropdown value +
    // the backend payload — sending the junction-row `id` instead triggers
    // a Postgres FK violation → HTTP 500 on POST /teacher/video-courses.
    stageOptions.value = grades
      .map(g => {
        const realGradeId = g.gradeId || g.id
        const displayName = g.gradeName || g.name || g.title || String(realGradeId || '')
        
        return {
          title: displayName,
          value: realGradeId,
          name: displayName,
          id: realGradeId,
        }
      })
      .filter(g => g.title && g.id)
  } catch (_e) {
    // Non-fatal — dropdowns will be empty; the create dialog shows a hint.
  } finally {
    catalogLoading.value = false
  }
}

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
  // Phase 5 — the wizard owns the draft now. We just open the dialog;
  // the wizard component resets its own state on every fresh mount via
  // the `:key` re-mount trick below.
  createError.value = ''
  dialogOpen.value = true
}

// Phase 5 wizard submit handler — the wizard emits the canonical
// Phase-3 payload (accessType + grade/target/free pivots + priceIqd +
// freeForEnrolledStudents). We pass it straight through to the
// existing createVideoCourse API.
async function onWizardSubmit (payload) {
  creating.value = true
  createError.value = ''
  try {
    const res = await Teacher.createVideoCourse(payload)
    const id = res?.data?.data?.course?.id
    dialogOpen.value = false
    if (id) router.push(`/teacher/video-courses/${id}`)
    else await fetchPage()
  } catch (err) {
    createError.value =
      err?.response?.data?.message || err?.message || 'تعذر إنشاء الدورة'
  } finally {
    creating.value = false
  }
}

function onWizardCancel () {
  if (creating.value) return
  dialogOpen.value = false
}

function statusVisuals (s) {
  return STATUSES.find(x => x.value === s) || { label: s, color: 'default', icon: 'ri-question-line' }
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

const noTeachingDataHint = computed(() => {
  if (catalogLoading.value) return ''
  if (subjectOptions.value.length === 0 && stageOptions.value.length === 0) {
    return 'لم تضِف بعد مواد أو مراحل دراسية إلى ملفك. أضِفها من قسم "المواد الدراسية" و"المراحل" قبل إنشاء دورة.'
  }
  if (subjectOptions.value.length === 0) return 'لم تضِف موادًا. أضِف مادة على الأقل من قسم "المواد".'
  if (stageOptions.value.length === 0) return 'لم تضِف مراحل. أضِف مرحلة على الأقل قبل إنشاء دورة مرئية.'
  
  return ''
})

onMounted(() => {
  fetchPage()
  loadCatalogs()
})

// Realtime: refresh the list + show a snackbar when the admin approves /
// rejects ANY of this teacher's courses. Filtering by recipient happens
// server-side (RealtimeService emits to `user:<teacherId>`), so any event
// that reaches this client is for this teacher.
function _showSnack (msg, color) {
  // Lazy: leverage the existing global v-snackbar pattern via window
  // dispatch — pages here already use raw alert() in some places, so a
  // simple toast via console + DOM is the lightweight fallback. Replace
  // with a real Vuetify snackbar if the team adopts one app-wide.
  try {
    const ev = new CustomEvent('app:toast', { detail: { msg, color } })

    window.dispatchEvent(ev)
  } catch (_) { /* nop */ }
  console.info(`[realtime] ${msg}`)
}

useRealtimeSocket({
  'video-course:approved': data => {
    const title = data?.course?.title || ''

    _showSnack(`تمت الموافقة على دورة "${title}"`, 'success')
    fetchPage()
  },
  'video-course:rejected': data => {
    const title = data?.course?.title || ''

    _showSnack(`تم رفض دورة "${title}"`, 'error')
    fetchPage()
  },
})

definePage({ meta: { layout: 'default' } })
</script>

<template>
  <div>
    <VBreadcrumbs
      :items="breadcrumbItems"
      class="px-0 mb-4"
    />

    <VCard>
      <VCardText>
        <div class="d-flex flex-wrap align-center mb-4 ga-2">
          <h2 class="text-h6 ma-0">
            دوراتي المرئية
          </h2>
          <VChip
            variant="tonal"
            color="info"
            size="x-small"
          >
            {{ total }}
          </VChip>
          <VSpacer />
          <VBtn
            color="primary"
            size="small"
            @click="openCreateDialog"
          >
            <VIcon
              start
              size="16"
              icon="ri-add-line"
            /> دورة جديدة
          </VBtn>
        </div>

        <VTabs
          v-model="activeStatus"
          color="primary"
          density="compact"
          class="mb-4"
          @update:model-value="onTabChange"
        >
          <VTab
            v-for="s in STATUSES"
            :key="s.value"
            :value="s.value"
            class="text-caption"
          >
            <VIcon
              :icon="s.icon"
              start
              size="14"
            />
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

        <div
          v-if="loading"
          class="text-center pa-6"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
        </div>

        <div
          v-else-if="items.length === 0"
          class="empty-state"
        >
          <VIcon
            icon="ri-video-line"
            size="48"
            class="mb-2"
            color="grey"
          />
          <div class="text-medium-emphasis">
            لا توجد دورات في هذه الحالة.
          </div>
          <VBtn
            class="mt-3"
            color="primary"
            variant="tonal"
            size="small"
            @click="openCreateDialog"
          >
            إنشاء أول دورة
          </VBtn>
        </div>

        <VRow
          v-else
          dense
        >
          <VCol
            v-for="item in items"
            :key="item.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <article
              class="course-card"
              role="button"
              tabindex="0"
              @click="() => router.push(`/teacher/video-courses/${item.id}`)"
              @keydown.enter="() => router.push(`/teacher/video-courses/${item.id}`)"
            >
              <div class="course-cover">
                <img
                  v-if="item.coverImage"
                  :src="resolveContentUrl(item.coverImage)"
                  alt=""
                  @error="(e) => e.target.style.display='none'"
                >
                <div
                  v-else
                  class="cover-placeholder"
                >
                  <VIcon
                    icon="ri-video-line"
                    size="28"
                    color="grey"
                  />
                </div>
                <VChip
                  :color="statusVisuals(item.status).color"
                  size="x-small"
                  variant="elevated"
                  class="course-status-chip"
                >
                  <VIcon
                    start
                    size="11"
                    :icon="statusVisuals(item.status).icon"
                  />
                  {{ statusVisuals(item.status).label }}
                </VChip>
              </div>
              <div class="course-body">
                <div class="course-title">
                  {{ item.title }}
                </div>
                <div class="course-meta">
                  <span class="meta-piece">
                    <VIcon
                      icon="ri-book-2-line"
                      size="12"
                    />
                    {{ item.subject || '—' }}
                  </span>
                  <span class="meta-piece">
                    <VIcon
                      icon="ri-graduation-cap-line"
                      size="12"
                    />
                    {{ item.teachingStage || '—' }}
                  </span>
                </div>
                <div class="course-footer">
                  <VChip
                    size="x-small"
                    :color="item.isFree ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    {{ item.isFree ? 'مجاني' : `${item.price} د.ع` }}
                  </VChip>
                  <span class="footer-spacer" />
                  <span class="course-date">{{ formatDate(item.createdAt) }}</span>
                </div>
              </div>
            </article>
          </VCol>
        </VRow>

        <div class="d-flex justify-center mt-4">
          <VPagination
            v-if="pageCount > 1"
            v-model="page"
            :length="pageCount"
            :total-visible="6"
            density="comfortable"
            @update:model-value="onPageChange"
          />
        </div>
      </VCardText>
    </VCard>

    <!-- ============ Create-course dialog (Phase 5 wizard) ============ -->
    <!--
      Phase 5: the simple form is replaced by the 5-step wizard. The
      same trigger button + dialog shell stay; only the inner content
      swaps. We use `:key="dialogOpen"` so the wizard's internal state
      resets on every fresh open without us tracking a draft here.
    -->
    <VDialog
      v-model="dialogOpen"
      max-width="780"
      persistent
      scrollable
    >
      <VCard>
        <VCardTitle class="dialog-title d-flex align-center ga-2">
          <VIcon
            icon="ri-video-add-line"
            color="primary"
            start
          />
          إنشاء دورة مرئية جديدة
        </VCardTitle>
        <VCardText class="pa-4">
          <VAlert
            v-if="noTeachingDataHint"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            {{ noTeachingDataHint }}
          </VAlert>

          <VideoCourseWizard
            v-if="dialogOpen"
            :key="dialogOpen ? 'open' : 'closed'"
            :submitting="creating"
            :external-error="createError"
            @submit="onWizardSubmit"
            @cancel="onWizardCancel"
          />
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 40px 0;
  text-align: center;
  border: 1px dashed rgba(11,37,69,.12);
  border-radius: 10px;
  background: rgba(11,37,69,.02);
}

/* ============ Compact course card ============ */
.course-card {
  display: block;
  width: 100%;
  border: 1px solid rgba(11,37,69,.08);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  cursor: pointer;
  text-align: start;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.course-card:hover,
.course-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(11,37,69,.08);
  border-color: rgba(11,37,69,.18);
  outline: none;
}
.course-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, rgba(11,37,69,.06), rgba(63,169,245,.06));
}
.course-cover img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.cover-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.course-status-chip {
  position: absolute;
  top: 8px; inset-inline-end: 8px;
  font-size: 10px !important;
}
.course-body { padding: 10px 12px 12px; }
.course-title {
  font-size: 14px;
  font-weight: 700;
  color: #0B2545;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}
.course-meta {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-bottom: 8px;
}
.meta-piece {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px;
  color: #6b7280;
}
.course-footer {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px;
  color: #6b7280;
}
.footer-spacer { flex: 1; }
.course-date { font-size: 10px; color: #9ca3af; }

.dialog-title { font-size: 17px; font-weight: 700; }
</style>
