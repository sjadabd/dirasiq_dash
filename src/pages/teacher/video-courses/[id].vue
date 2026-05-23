<script setup>
// Teacher manages a single video course — Phase 10.1.B.5 rewrite.
//
// Design goals (from product feedback):
//   - Read-only summary by default. Edits open via an explicit "Edit"
//     dialog. The page is no longer a giant always-on form.
//   - Cover image displayed with the canonical content_url resolved
//     (no more "/public/uploads/..." raw paths).
//   - Subject + teachingStage in the edit dialog use the teacher's OWN
//     subjects + grades (dropdowns, not free text).
//   - Lesson upload uses ONE dialog: title + description + file picker
//     + upload button. Errors and success surface IN-DIALOG (no
//     window.alert / confirm anywhere). Upload progress is tracked by
//     the global uploads store so navigating away doesn't lose it.
//   - Each lesson renders as a small card: thumbnail (resolved Bunny
//     URL), title, duration, Bunny status chip, and action menu
//     (play / edit / replace video / delete).
//   - Replace-video reuses the same upload dialog.
//   - Built-in HLS player dialog using hls.js (already shipped in the
//     bundle for the intro-video flow).

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Teacher from '@/api/teacher/teacher_api.js'
import { resolveContentUrl } from '@/utils/content-url.js'
import { useUploadsStore } from '@/stores/uploads.js'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const uploads = useUploadsStore()

// ----- Page state --------------------------------------------------------
const loading = ref(true)
const errorMessage = ref('')
const course = ref(null)
const lessons = ref([])

// ----- Catalogs (teacher's own subjects + grades) ------------------------
const subjectOptions = ref([])
const stageOptions = ref([])

async function loadCatalogs () {
  try {
    const [subjectsRes, gradesRes] = await Promise.all([
      Teacher.getAllSubjects().catch(() => null),
      Teacher.getAllMyGrades().catch(() => null),
    ])
    const subjectsData = subjectsRes?.data?.data || subjectsRes?.data || []
    const subjects = Array.isArray(subjectsData) ? subjectsData : (subjectsData.items || [])
    subjectOptions.value = subjects
      .map(s => ({ title: s.name || s.title || s.subject || String(s.id || ''), value: s.name || s.title || s.subject }))
      .filter(s => s.title)
    const gradesData = gradesRes?.data?.data || gradesRes?.data || []
    const grades = Array.isArray(gradesData) ? gradesData : (gradesData.items || [])
    stageOptions.value = grades
      .map(g => ({ title: g.name || g.gradeName || g.title || String(g.id || ''), value: g.id || g.name, name: g.name || g.gradeName || g.title, id: g.id }))
      .filter(g => g.title)
  } catch (_) { /* non-fatal */ }
}

// ----- Edit course dialog state -----------------------------------------
const editDialog = ref(false)
const editDraft = ref(null)
const editSubmitting = ref(false)
const editError = ref('')

function openEditDialog () {
  if (!course.value) return
  // Resolve the gradeId back from a teaching_stage NAME if the row only
  // carries a name (older rows pre-dropdown). Best-effort.
  const matchingStage = stageOptions.value.find(s => s.name === course.value.teachingStage)
  editDraft.value = {
    title: course.value.title,
    description: course.value.description || '',
    subject: course.value.subject || '',
    teachingStage: course.value.teachingStage || '',
    gradeId: course.value.gradeId || matchingStage?.id || '',
    isFree: !!course.value.isFree,
    price: Number(course.value.price || 0),
    visibility: course.value.visibility,
  }
  editError.value = ''
  editDialog.value = true
}
function onEditStageChange (value) {
  const found = stageOptions.value.find(s => s.value === value)
  if (!found) {
    editDraft.value.teachingStage = ''
    editDraft.value.gradeId = ''
    return
  }
  editDraft.value.teachingStage = found.name
  editDraft.value.gradeId = found.id || ''
}
async function submitEdit () {
  if (!editDraft.value.title.trim()) { editError.value = 'العنوان مطلوب'; return }
  if (!editDraft.value.subject) { editError.value = 'يجب اختيار المادة'; return }
  if (!editDraft.value.teachingStage) { editError.value = 'يجب اختيار المرحلة'; return }
  editSubmitting.value = true
  editError.value = ''
  try {
    const payload = {
      title: editDraft.value.title.trim(),
      description: editDraft.value.description.trim() || undefined,
      subject: editDraft.value.subject,
      teachingStage: editDraft.value.teachingStage,
      isFree: editDraft.value.isFree,
      price: editDraft.value.isFree ? 0 : Number(editDraft.value.price || 0),
      visibility: editDraft.value.visibility,
    }
    if (editDraft.value.gradeId) payload.gradeId = editDraft.value.gradeId
    await Teacher.updateVideoCourse(id.value, payload)
    editDialog.value = false
    await fetchAll()
    showToast('تم حفظ التعديلات. الدورة الآن قيد المراجعة من جديد.')
  } catch (err) {
    editError.value = err?.response?.data?.message || err?.message || 'تعذر الحفظ'
  } finally {
    editSubmitting.value = false
  }
}

// ----- Cover image change ------------------------------------------------
const coverFileInput = ref(null)
const coverUploading = ref(false)
const coverError = ref('')

function triggerCoverFilePicker () { coverFileInput.value?.click() }
async function onCoverFileChosen (event) {
  const f = event.target.files?.[0]
  event.target.value = ''
  if (!f) return
  coverUploading.value = true
  coverError.value = ''
  try {
    await Teacher.uploadVideoCourseCoverImage(id.value, f)
    await fetchAll()
    showToast('تم تحديث صورة الغلاف.')
  } catch (err) {
    coverError.value = err?.response?.data?.message || err?.message || 'تعذر رفع صورة الغلاف'
  } finally {
    coverUploading.value = false
  }
}

// ----- Lesson dialog (create OR replace-video) --------------------------
const lessonDialog = ref(false)
const lessonDialogMode = ref('create') // 'create' | 'replace'
const lessonDraft = ref({ title: '', description: '' })
const lessonReplacingId = ref(null)
const lessonFileInputRef = ref(null)
const lessonFile = ref(null)
const lessonSubmitting = ref(false)
const lessonError = ref('')
const lessonProgress = ref(0)
const lessonSuccess = ref(false)

function openCreateLessonDialog () {
  lessonDialogMode.value = 'create'
  lessonDraft.value = { title: '', description: '' }
  lessonReplacingId.value = null
  lessonFile.value = null
  lessonError.value = ''
  lessonProgress.value = 0
  lessonSuccess.value = false
  lessonDialog.value = true
}
function openReplaceLessonDialog (lesson) {
  lessonDialogMode.value = 'replace'
  lessonDraft.value = { title: lesson.title || '', description: lesson.description || '' }
  lessonReplacingId.value = lesson.id
  lessonFile.value = null
  lessonError.value = ''
  lessonProgress.value = 0
  lessonSuccess.value = false
  lessonDialog.value = true
}
function pickLessonFile () { lessonFileInputRef.value?.click() }
function onLessonFileChosen (event) {
  const f = event.target.files?.[0]
  event.target.value = ''
  if (!f) return
  if (!String(f.type || '').startsWith('video/')) {
    lessonError.value = 'الملف يجب أن يكون فيديو (MP4 يُفضّل)'
    return
  }
  lessonFile.value = f
  lessonError.value = ''
}

async function submitLessonDialog () {
  if (!lessonDraft.value.title.trim()) { lessonError.value = 'عنوان الدرس مطلوب'; return }
  if (!lessonFile.value) { lessonError.value = 'يرجى اختيار ملف الفيديو'; return }
  lessonSubmitting.value = true
  lessonError.value = ''
  lessonProgress.value = 0
  try {
    // Replace flow: delete the old lesson (best-effort) then create fresh.
    if (lessonDialogMode.value === 'replace' && lessonReplacingId.value) {
      try { await Teacher.deleteVideoLesson(id.value, lessonReplacingId.value) }
      catch (_) { /* still attempt the create */ }
    }
    const res = await Teacher.createVideoLesson(id.value, {
      title: lessonDraft.value.title.trim(),
      description: lessonDraft.value.description.trim() || undefined,
    })
    const { lesson, upload } = res?.data?.data || {}
    if (!lesson || !upload) throw new Error('استجابة الخادم غير صالحة')

    // Refresh the local list immediately so the lesson appears in 'pending'.
    await fetchAll()

    // Hand the upload off to the global Pinia store. The store keeps the
    // XHR alive across navigation. We also keep a reference here so the
    // in-dialog progress bar mirrors the same XHR while the user watches.
    const slot = uploads.startUpload({
      lessonId: lesson.id,
      courseId: id.value,
      courseTitle: course.value?.title || '',
      lessonTitle: lesson.title,
      fileName: lessonFile.value.name,
      file: lessonFile.value,
      uploadContract: upload,
    })

    // In-dialog progress tracking — watch the store slot.
    const interval = setInterval(() => {
      if (!slot) return
      lessonProgress.value = slot.progress
      if (slot.status === 'completed') {
        clearInterval(interval)
        lessonSuccess.value = true
        lessonSubmitting.value = false
        fetchAll()
        setTimeout(() => { lessonDialog.value = false }, 1500)
      } else if (slot.status === 'failed' || slot.status === 'cancelled') {
        clearInterval(interval)
        lessonError.value = slot.errorMessage || 'فشل الرفع'
        lessonSubmitting.value = false
      }
    }, 350)
  } catch (err) {
    lessonError.value = err?.response?.data?.message || err?.message || 'تعذر إنشاء الدرس'
    lessonSubmitting.value = false
  }
}

// ----- Edit lesson (title/description only) -----------------------------
const editLessonDialog = ref(false)
const editLessonDraft = ref({ id: '', title: '', description: '' })
const editLessonSubmitting = ref(false)
const editLessonError = ref('')

function openEditLessonDialog (lesson) {
  editLessonDraft.value = {
    id: lesson.id,
    title: lesson.title || '',
    description: lesson.description || '',
  }
  editLessonError.value = ''
  editLessonDialog.value = true
}
async function submitEditLesson () {
  if (!editLessonDraft.value.title.trim()) { editLessonError.value = 'العنوان مطلوب'; return }
  editLessonSubmitting.value = true
  editLessonError.value = ''
  try {
    await Teacher.updateVideoLesson(id.value, editLessonDraft.value.id, {
      title: editLessonDraft.value.title.trim(),
      description: editLessonDraft.value.description.trim() || undefined,
    })
    editLessonDialog.value = false
    await fetchAll()
    showToast('تم تحديث الدرس.')
  } catch (err) {
    editLessonError.value = err?.response?.data?.message || err?.message || 'تعذر الحفظ'
  } finally {
    editLessonSubmitting.value = false
  }
}

// ----- Delete lesson / course confirmations -----------------------------
const deleteDialog = ref(false)
const deleteKind = ref('course') // 'course' | 'lesson'
const deleteLessonId = ref(null)
const deleteSubmitting = ref(false)
const deleteError = ref('')

function askDeleteCourse () {
  deleteKind.value = 'course'
  deleteLessonId.value = null
  deleteError.value = ''
  deleteDialog.value = true
}
function askDeleteLesson (lesson) {
  deleteKind.value = 'lesson'
  deleteLessonId.value = lesson.id
  deleteError.value = ''
  deleteDialog.value = true
}
async function confirmDelete () {
  deleteSubmitting.value = true
  deleteError.value = ''
  try {
    if (deleteKind.value === 'course') {
      await Teacher.deleteVideoCourse(id.value)
      deleteDialog.value = false
      router.push('/teacher/video-courses')
      return
    }
    if (deleteKind.value === 'lesson' && deleteLessonId.value) {
      await Teacher.deleteVideoLesson(id.value, deleteLessonId.value)
    }
    deleteDialog.value = false
    await fetchAll()
    showToast(deleteKind.value === 'lesson' ? 'تم حذف الدرس.' : 'تم حذف الدورة.')
  } catch (err) {
    deleteError.value = err?.response?.data?.message || err?.message || 'تعذر الحذف'
  } finally {
    deleteSubmitting.value = false
  }
}

// ----- HLS player dialog ------------------------------------------------
const playerDialog = ref(false)
const playerLesson = ref(null)
const playerVideoEl = ref(null)
let _hlsInstance = null

async function openPlayer (lesson) {
  if (lesson.bunnyStatus !== 'ready' || !lesson.bunnyPlaybackUrl) {
    showToast('الفيديو لم يكتمل المعالجة بعد. حاول بعد قليل.')
    return
  }
  playerLesson.value = lesson
  playerDialog.value = true
  await nextTick()
  const url = resolveContentUrl(lesson.bunnyPlaybackUrl)
  const video = playerVideoEl.value
  if (!video) return
  // Native HLS (Safari/iOS) — just set src.
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
    return
  }
  // Everywhere else: hls.js.
  try {
    const mod = await import('hls.js')
    const Hls = mod.default || mod
    if (Hls && Hls.isSupported()) {
      _hlsInstance = new Hls()
      _hlsInstance.loadSource(url)
      _hlsInstance.attachMedia(video)
    } else {
      video.src = url
    }
  } catch (_) {
    video.src = url
  }
}
function closePlayer () {
  playerDialog.value = false
  if (_hlsInstance) {
    try { _hlsInstance.destroy() } catch (_) { /* no-op */ }
    _hlsInstance = null
  }
  if (playerVideoEl.value) {
    try { playerVideoEl.value.pause() } catch (_) { /* no-op */ }
  }
  playerLesson.value = null
}
onBeforeUnmount(closePlayer)

// ----- Reorder (kept from previous version, polished) -------------------
const reorderMode = ref(false)
const reorderBusy = ref(false)
function moveLesson (idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= lessons.value.length) return
  const arr = [...lessons.value]
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  lessons.value = arr
}
async function saveReorder () {
  reorderBusy.value = true
  try {
    await Teacher.reorderVideoLessons(id.value, lessons.value.map(l => l.id))
    reorderMode.value = false
    await fetchAll()
    showToast('تم حفظ الترتيب.')
  } catch (err) {
    showToast(err?.response?.data?.message || 'تعذر حفظ الترتيب.', 'error')
  } finally {
    reorderBusy.value = false
  }
}

// ----- Sync (for stuck lessons) -----------------------------------------
async function syncLesson (lesson) {
  try {
    await Teacher.syncVideoLesson(id.value, lesson.id)
    await fetchAll()
    showToast('تم تحديث حالة الدرس.')
  } catch (err) {
    showToast(err?.response?.data?.message || 'تعذرت المزامنة', 'error')
  }
}

// ----- Toast (a single shared snackbar) ---------------------------------
const toast = ref({ open: false, text: '', color: 'success' })
function showToast (text, color = 'success') {
  toast.value = { open: true, text, color }
}

// ----- Loaders -----------------------------------------------------------
async function fetchAll () {
  loading.value = true
  errorMessage.value = ''
  try {
    const [c, l] = await Promise.all([
      Teacher.getMyVideoCourse(id.value),
      Teacher.getMyVideoCourseLessons(id.value),
    ])
    course.value = c?.data?.data?.course || null
    lessons.value = Array.isArray(l?.data?.data?.lessons) ? l.data.data.lessons : []
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || err?.message || 'تعذر تحميل الدورة'
  } finally {
    loading.value = false
  }
}

// ----- Format helpers ---------------------------------------------------
function formatDate (iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
function formatDuration (s) {
  const n = Number(s || 0)
  if (!n) return '—'
  const m = Math.floor(n / 60)
  const sec = n % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const COURSE_STATUS_VISUALS = {
  pending_review: { label: 'بانتظار المراجعة', color: 'warning',   icon: 'ri-time-line' },
  approved:       { label: 'مقبولة',          color: 'success',   icon: 'ri-check-double-line' },
  hidden:         { label: 'مخفية',           color: 'secondary', icon: 'ri-eye-off-line' },
  rejected:       { label: 'مرفوضة',          color: 'error',     icon: 'ri-close-circle-line' },
}
const BUNNY_STATUS_VISUALS = {
  pending:    { label: 'بانتظار الرفع',   color: 'secondary', icon: 'ri-time-line' },
  uploaded:   { label: 'تم الرفع',        color: 'info',      icon: 'ri-upload-line' },
  processing: { label: 'قيد المعالجة',    color: 'warning',   icon: 'ri-loader-2-line' },
  ready:      { label: 'جاهز',            color: 'success',   icon: 'ri-checkbox-circle-line' },
  failed:     { label: 'فشل',             color: 'error',     icon: 'ri-error-warning-line' },
}
const courseStatusChip = computed(() => course.value
  ? (COURSE_STATUS_VISUALS[course.value.status] || { label: course.value.status, color: 'default', icon: 'ri-question-line' })
  : null)

const breadcrumbItems = computed(() => [
  { title: 'الرئيسية',         to: '/teacher/dashboard',     disabled: false },
  { title: 'دوراتي المرئية',   to: '/teacher/video-courses', disabled: false },
  { title: course.value?.title || '...', disabled: true },
])

onMounted(() => {
  fetchAll()
  loadCatalogs()
})

definePage({ meta: { layout: 'default' } })
</script>

<template>
  <div>
    <VBreadcrumbs :items="breadcrumbItems" class="px-0 mb-3" />

    <VAlert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-3">
      {{ errorMessage }}
    </VAlert>

    <div v-if="loading" class="text-center pa-6">
      <VProgressCircular indeterminate color="primary" />
    </div>

    <template v-else-if="course">
      <!-- =================== READ-ONLY SUMMARY =================== -->
      <VCard class="mb-3 course-summary-card">
        <div class="summary-grid">
          <div class="summary-cover">
            <img
              v-if="course.coverImage"
              :src="resolveContentUrl(course.coverImage)"
              alt=""
              class="cover-img"
              @error="(e) => e.target.style.display = 'none'"
            >
            <div v-else class="cover-empty">
              <VIcon icon="ri-image-line" size="44" color="grey" />
              <div class="text-caption mt-1 text-medium-emphasis">لا توجد صورة غلاف</div>
            </div>
            <VBtn
              size="x-small"
              variant="elevated"
              class="cover-change-btn"
              :loading="coverUploading"
              @click="triggerCoverFilePicker"
            >
              <VIcon start size="14" icon="ri-image-edit-line" /> غيّر الغلاف
            </VBtn>
            <input
              ref="coverFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="d-none"
              @change="onCoverFileChosen"
            >
          </div>

          <div class="summary-body">
            <div class="summary-head">
              <div>
                <h1 class="summary-title">{{ course.title }}</h1>
                <div class="summary-sub">
                  <VChip
                    v-if="courseStatusChip"
                    size="x-small"
                    variant="tonal"
                    :color="courseStatusChip.color"
                  >
                    <VIcon start size="12" :icon="courseStatusChip.icon" />
                    {{ courseStatusChip.label }}
                  </VChip>
                  <VChip
                    size="x-small"
                    :color="course.visibility === 'public' ? 'success' : 'secondary'"
                    variant="tonal"
                  >
                    {{ course.visibility === 'public' ? 'عامة' : 'خاصة' }}
                  </VChip>
                  <VChip
                    size="x-small"
                    :color="course.isFree ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    {{ course.isFree ? 'مجاني' : `${course.price} د.ع` }}
                  </VChip>
                </div>
              </div>
              <div class="summary-actions">
                <VBtn size="small" variant="tonal" color="primary" @click="openEditDialog">
                  <VIcon start size="16" icon="ri-edit-2-line" /> تعديل
                </VBtn>
                <VBtn size="small" variant="text" color="error" @click="askDeleteCourse">
                  <VIcon icon="ri-delete-bin-line" />
                </VBtn>
              </div>
            </div>

            <p v-if="course.description" class="summary-desc">{{ course.description }}</p>

            <dl class="summary-meta">
              <div><dt>المادة</dt><dd>{{ course.subject || '—' }}</dd></div>
              <div><dt>المرحلة</dt><dd>{{ course.teachingStage || '—' }}</dd></div>
              <div><dt>الإضافة</dt><dd>{{ formatDate(course.createdAt) }}</dd></div>
              <div><dt>آخر تحديث</dt><dd>{{ formatDate(course.updatedAt) }}</dd></div>
            </dl>

            <VAlert
              v-if="course.reviewNotes"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              <strong>ملاحظة من الإدارة:</strong> {{ course.reviewNotes }}
            </VAlert>
            <VAlert
              v-if="coverError"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              {{ coverError }}
            </VAlert>
          </div>
        </div>
      </VCard>

      <!-- =================== LESSONS =================== -->
      <VCard>
        <VCardText>
          <div class="d-flex align-center mb-3 ga-2">
            <h3 class="text-subtitle-1 font-weight-bold ma-0">الدروس</h3>
            <VChip size="x-small" variant="tonal" color="info">{{ lessons.length }}</VChip>
            <VSpacer />
            <template v-if="!reorderMode">
              <VBtn
                v-if="lessons.length > 1"
                size="small"
                variant="tonal"
                @click="reorderMode = true"
              >
                <VIcon start size="14" icon="ri-arrow-up-down-line" /> ترتيب
              </VBtn>
              <VBtn color="primary" size="small" @click="openCreateLessonDialog">
                <VIcon start size="14" icon="ri-add-line" /> درس جديد
              </VBtn>
            </template>
            <template v-else>
              <VBtn variant="text" size="small" @click="reorderMode = false; fetchAll()">إلغاء</VBtn>
              <VBtn color="primary" size="small" :loading="reorderBusy" @click="saveReorder">احفظ الترتيب</VBtn>
            </template>
          </div>

          <div v-if="lessons.length === 0" class="empty-state">
            <VIcon icon="ri-video-add-line" size="40" color="grey" />
            <div class="text-medium-emphasis mt-2">لم تضف دروساً بعد.</div>
            <VBtn class="mt-3" color="primary" variant="tonal" size="small" @click="openCreateLessonDialog">
              إضافة أول درس
            </VBtn>
          </div>

          <VRow v-else dense>
            <VCol
              v-for="(lesson, idx) in lessons"
              :key="lesson.id"
              cols="12" sm="6" md="4" lg="3"
            >
              <article class="lesson-card" :class="{ 'is-ready': lesson.bunnyStatus === 'ready' }">
                <div class="lesson-thumb">
                  <img
                    v-if="lesson.bunnyThumbnailUrl"
                    :src="resolveContentUrl(lesson.bunnyThumbnailUrl)"
                    alt=""
                    @error="(e) => e.target.style.display = 'none'"
                  >
                  <div v-else class="thumb-placeholder">
                    <VIcon icon="ri-film-line" size="28" color="grey" />
                  </div>
                  <button
                    v-if="lesson.bunnyStatus === 'ready'"
                    type="button"
                    class="play-overlay"
                    @click="openPlayer(lesson)"
                  >
                    <VIcon icon="ri-play-fill" size="34" color="white" />
                  </button>
                  <span class="lesson-order">#{{ idx + 1 }}</span>
                  <span class="lesson-duration" v-if="lesson.durationSeconds">{{ formatDuration(lesson.durationSeconds) }}</span>
                </div>
                <div class="lesson-body">
                  <div class="lesson-title">{{ lesson.title }}</div>
                  <div class="lesson-status">
                    <VChip
                      size="x-small"
                      variant="tonal"
                      :color="(BUNNY_STATUS_VISUALS[lesson.bunnyStatus] || {}).color || 'default'"
                    >
                      <VIcon start size="11" :icon="(BUNNY_STATUS_VISUALS[lesson.bunnyStatus] || {}).icon || 'ri-question-line'" />
                      {{ (BUNNY_STATUS_VISUALS[lesson.bunnyStatus] || {}).label || lesson.bunnyStatus }}
                    </VChip>
                  </div>
                </div>
                <div class="lesson-actions">
                  <template v-if="!reorderMode">
                    <VBtn
                      v-if="['uploaded','processing'].includes(lesson.bunnyStatus)"
                      icon size="x-small" variant="text"
                      title="تحديث الحالة من Bunny"
                      @click="syncLesson(lesson)"
                    ><VIcon icon="ri-refresh-line" size="16" /></VBtn>
                    <VBtn
                      icon size="x-small" variant="text"
                      title="تعديل البيانات"
                      @click="openEditLessonDialog(lesson)"
                    ><VIcon icon="ri-pencil-line" size="16" /></VBtn>
                    <VBtn
                      icon size="x-small" variant="text"
                      title="استبدال الفيديو"
                      @click="openReplaceLessonDialog(lesson)"
                    ><VIcon icon="ri-upload-2-line" size="16" /></VBtn>
                    <VBtn
                      icon size="x-small" variant="text" color="error"
                      title="حذف"
                      @click="askDeleteLesson(lesson)"
                    ><VIcon icon="ri-delete-bin-line" size="16" /></VBtn>
                  </template>
                  <template v-else>
                    <VBtn icon size="x-small" variant="text" :disabled="idx === 0" @click="moveLesson(idx, -1)">
                      <VIcon icon="ri-arrow-up-line" size="16" />
                    </VBtn>
                    <VBtn icon size="x-small" variant="text" :disabled="idx === lessons.length - 1" @click="moveLesson(idx, 1)">
                      <VIcon icon="ri-arrow-down-line" size="16" />
                    </VBtn>
                  </template>
                </div>
              </article>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>

    <!-- =================== EDIT COURSE DIALOG =================== -->
    <VDialog v-model="editDialog" max-width="540" persistent scrollable>
      <VCard v-if="editDraft">
        <VCardTitle class="dlg-title">تعديل الدورة</VCardTitle>
        <VCardText>
          <VTextField v-model="editDraft.title" label="العنوان *" density="comfortable" variant="outlined" class="mb-3" hide-details />
          <VTextarea v-model="editDraft.description" label="الوصف" rows="2" density="comfortable" variant="outlined" class="mb-3" hide-details />
          <VSelect
            v-model="editDraft.subject"
            :items="subjectOptions"
            label="المادة *"
            density="comfortable" variant="outlined" hide-details class="mb-3"
          />
          <VSelect
            :model-value="editDraft.gradeId || ''"
            :items="stageOptions"
            label="المرحلة *"
            density="comfortable" variant="outlined" hide-details class="mb-3"
            @update:model-value="onEditStageChange"
          />
          <div class="d-flex align-center ga-3 mb-3">
            <VSwitch v-model="editDraft.isFree" label="مجاني" color="success" density="compact" inset hide-details />
            <VTextField
              v-if="!editDraft.isFree"
              v-model.number="editDraft.price"
              type="number" min="0"
              label="السعر (د.ع)"
              density="comfortable" variant="outlined" hide-details
            />
          </div>
          <VSelect
            v-model="editDraft.visibility"
            :items="[
              { title: 'خاصة', value: 'private' },
              { title: 'عامة',  value: 'public' },
            ]"
            label="الرؤية"
            density="comfortable" variant="outlined" hide-details
          />
          <VAlert v-if="editError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ editError }}
          </VAlert>
          <div class="hint-row">* أي تعديل يعيد الدورة إلى حالة "بانتظار المراجعة".</div>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" :disabled="editSubmitting" @click="editDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="editSubmitting" @click="submitEdit">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- =================== LESSON CREATE/REPLACE DIALOG =================== -->
    <VDialog v-model="lessonDialog" max-width="520" persistent scrollable>
      <VCard>
        <VCardTitle class="dlg-title">
          {{ lessonDialogMode === 'create' ? 'إضافة درس جديد' : 'استبدال فيديو الدرس' }}
        </VCardTitle>
        <VCardText>
          <VTextField
            v-model="lessonDraft.title"
            label="عنوان الدرس *"
            density="comfortable" variant="outlined" class="mb-3" hide-details
            :disabled="lessonSubmitting && lessonProgress > 0"
          />
          <VTextarea
            v-model="lessonDraft.description"
            label="الوصف (اختياري)"
            rows="2"
            density="comfortable" variant="outlined" hide-details
            :disabled="lessonSubmitting && lessonProgress > 0"
          />

          <!-- File picker -->
          <div class="file-picker mt-3" :class="{ 'has-file': !!lessonFile }">
            <input
              ref="lessonFileInputRef"
              type="file"
              accept="video/*"
              class="d-none"
              @change="onLessonFileChosen"
            >
            <template v-if="!lessonFile">
              <VIcon icon="ri-upload-cloud-2-line" size="32" color="primary" />
              <div class="file-hint">اختر ملف الفيديو (MP4 يُفضّل، حتى 1GB)</div>
              <VBtn
                size="small"
                variant="tonal"
                class="mt-2"
                @click="pickLessonFile"
                :disabled="lessonSubmitting"
              >تصفّح…</VBtn>
            </template>
            <template v-else>
              <VIcon icon="ri-film-line" size="28" color="primary" />
              <div class="file-name" :title="lessonFile.name">{{ lessonFile.name }}</div>
              <div class="file-size">{{ (lessonFile.size / (1024*1024)).toFixed(1) }} MB</div>
              <VBtn
                v-if="!lessonSubmitting"
                size="x-small"
                variant="text"
                color="error"
                @click="lessonFile = null"
              >إزالة</VBtn>
            </template>
          </div>

          <!-- Progress / success / error -->
          <VProgressLinear
            v-if="lessonSubmitting && lessonProgress > 0 && !lessonSuccess"
            :model-value="lessonProgress"
            color="primary"
            height="6"
            rounded
            class="mt-3"
          />
          <div v-if="lessonSubmitting && lessonProgress > 0 && !lessonSuccess" class="text-center text-caption mt-1">
            {{ lessonProgress }}%
          </div>

          <VAlert
            v-if="lessonError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >{{ lessonError }}</VAlert>
          <VAlert
            v-if="lessonSuccess"
            type="success"
            variant="tonal"
            density="compact"
            class="mt-3"
          >تم رفع الفيديو. سيتم معالجته على Bunny.</VAlert>

          <div class="hint-row mt-2">
            <VIcon size="13" icon="ri-information-line" />
            يمكنك إغلاق هذا الحوار — الرفع سيستمر في الخلفية.
          </div>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" :disabled="lessonSubmitting && lessonProgress > 0 && !lessonSuccess" @click="lessonDialog = false">
            إغلاق
          </VBtn>
          <VBtn
            color="primary"
            :loading="lessonSubmitting && !lessonSuccess"
            :disabled="lessonSuccess"
            @click="submitLessonDialog"
          >
            <VIcon start icon="ri-upload-2-line" />
            {{ lessonSuccess ? 'تم' : 'رفع' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- =================== EDIT LESSON META DIALOG =================== -->
    <VDialog v-model="editLessonDialog" max-width="480" persistent>
      <VCard>
        <VCardTitle class="dlg-title">تعديل بيانات الدرس</VCardTitle>
        <VCardText>
          <VTextField v-model="editLessonDraft.title" label="عنوان الدرس *" density="comfortable" variant="outlined" class="mb-3" hide-details />
          <VTextarea v-model="editLessonDraft.description" label="الوصف" rows="2" density="comfortable" variant="outlined" hide-details />
          <VAlert v-if="editLessonError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ editLessonError }}
          </VAlert>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" :disabled="editLessonSubmitting" @click="editLessonDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="editLessonSubmitting" @click="submitEditLesson">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- =================== DELETE CONFIRM DIALOG =================== -->
    <VDialog v-model="deleteDialog" max-width="420" persistent>
      <VCard>
        <VCardTitle class="dlg-title">
          {{ deleteKind === 'course' ? 'حذف الدورة' : 'حذف الدرس' }}
        </VCardTitle>
        <VCardText>
          <VAlert type="error" variant="tonal" density="compact">
            {{ deleteKind === 'course'
              ? 'سيتم حذف الدورة وجميع دروسها. الإجراء غير قابل للاسترجاع من واجهة الأستاذ.'
              : 'سيتم حذف الدرس وحذف الفيديو من Bunny.' }}
          </VAlert>
          <VAlert v-if="deleteError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ deleteError }}
          </VAlert>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" :disabled="deleteSubmitting" @click="deleteDialog = false">إلغاء</VBtn>
          <VBtn color="error" :loading="deleteSubmitting" @click="confirmDelete">حذف</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- =================== HLS PLAYER DIALOG =================== -->
    <VDialog v-model="playerDialog" max-width="900" @update:model-value="(v) => !v && closePlayer()">
      <VCard>
        <VCardTitle class="dlg-title player-title">
          <VIcon start icon="ri-play-circle-line" />
          {{ playerLesson?.title }}
          <VSpacer />
          <VBtn icon variant="text" size="small" @click="closePlayer">
            <VIcon icon="ri-close-line" />
          </VBtn>
        </VCardTitle>
        <VCardText class="player-body">
          <video
            ref="playerVideoEl"
            controls
            playsinline
            class="player-video"
            :poster="playerLesson?.bunnyThumbnailUrl ? resolveContentUrl(playerLesson.bunnyThumbnailUrl) : ''"
          />
        </VCardText>
      </VCard>
    </VDialog>

    <!-- =================== TOAST =================== -->
    <VSnackbar v-model="toast.open" :color="toast.color" location="bottom end" timeout="3000">
      {{ toast.text }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.course-summary-card { overflow: hidden; }

.summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}
@media (min-width: 768px) {
  .summary-grid { grid-template-columns: 280px 1fr; }
}

.summary-cover {
  position: relative;
  background: linear-gradient(135deg, rgba(11,37,69,.06), rgba(63,169,245,.04));
  aspect-ratio: 16 / 9;
  min-height: 160px;
}
@media (min-width: 768px) {
  .summary-cover { aspect-ratio: auto; min-height: 0; height: 100%; }
}
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-empty {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.cover-change-btn {
  position: absolute;
  bottom: 8px; inset-inline-end: 8px;
  font-size: 11px !important;
}

.summary-body { padding: 18px 20px; }
.summary-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  margin-bottom: 8px;
}
.summary-title {
  margin: 0;
  font-size: 18px; font-weight: 800;
  color: #0B2545;
  line-height: 1.4;
}
.summary-sub {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-top: 6px;
}
.summary-actions { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.summary-desc {
  font-size: 13px; color: #4b5563;
  margin: 8px 0 0;
  line-height: 1.7;
}
.summary-meta {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
  margin: 14px 0 0;
}
.summary-meta div { display: flex; align-items: baseline; gap: 6px; }
.summary-meta dt { font-size: 11px; color: #6b7280; min-width: 70px; margin: 0; }
.summary-meta dd { font-size: 13px; color: #0B2545; margin: 0; font-weight: 500; }

/* ============ Lesson card ============ */
.lesson-card {
  display: block;
  border: 1px solid rgba(11,37,69,.08);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.lesson-card:hover {
  border-color: rgba(11,37,69,.16);
  box-shadow: 0 3px 10px rgba(11,37,69,.06);
}
.lesson-card.is-ready { border-color: rgba(34,197,94,.25); }
.lesson-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #111827;
}
.lesson-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(11,37,69,.08), rgba(11,37,69,.16));
}
.lesson-order {
  position: absolute; top: 6px; inset-inline-start: 6px;
  background: rgba(0,0,0,.55); color: #fff;
  font-size: 10px; padding: 2px 6px; border-radius: 4px;
}
.lesson-duration {
  position: absolute; bottom: 6px; inset-inline-end: 6px;
  background: rgba(0,0,0,.65); color: #fff;
  font-size: 10px; padding: 2px 6px; border-radius: 4px;
}
.play-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.20);
  border: 0; padding: 0; cursor: pointer;
  transition: background-color .15s;
}
.play-overlay:hover { background: rgba(0,0,0,.35); }

.lesson-body {
  padding: 8px 10px 4px;
}
.lesson-title {
  font-size: 13px;
  font-weight: 700;
  color: #0B2545;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lesson-status { margin-top: 4px; }
.lesson-actions {
  display: flex; justify-content: flex-end; align-items: center; gap: 2px;
  padding: 4px 6px 6px;
  border-top: 1px solid rgba(11,37,69,.04);
}

/* ============ Misc ============ */
.empty-state {
  padding: 40px 0;
  text-align: center;
  border: 1px dashed rgba(11,37,69,.12);
  border-radius: 10px;
  background: rgba(11,37,69,.02);
}
.dlg-title { font-size: 16px !important; font-weight: 700 !important; }
.hint-row {
  font-size: 11px; color: #6b7280;
  margin-top: 6px;
  display: inline-flex; align-items: center; gap: 4px;
}

.file-picker {
  border: 1.5px dashed rgba(11,37,69,.18);
  border-radius: 10px;
  padding: 18px 16px;
  text-align: center;
  background: #fafbff;
  transition: background-color .15s;
}
.file-picker.has-file { background: rgba(63,169,245,.06); border-color: rgba(63,169,245,.4); }
.file-hint { color: #6b7280; font-size: 13px; margin-top: 6px; }
.file-name {
  font-size: 13px; font-weight: 600; color: #0B2545;
  margin-top: 4px;
  max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-size { font-size: 11px; color: #6b7280; }

/* ============ Player ============ */
.player-title { display: flex; align-items: center; gap: 8px; }
.player-body { padding: 0 !important; background: #000; }
.player-video {
  width: 100%;
  max-height: 70vh;
  background: #000;
  display: block;
}
</style>
