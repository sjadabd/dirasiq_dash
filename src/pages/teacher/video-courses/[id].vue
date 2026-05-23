<script setup>
// Teacher manages a single video course — edit metadata, swap cover image,
// CRUD lessons, reorder, monitor Bunny processing state. Phase 10.1.B.3.

import Teacher from '@/api/teacher/teacher_api.js'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))

const loading = ref(true)
const errorMessage = ref('')
const course = ref(null)
const lessons = ref([])

// ----- Course editing state ----------------------------------------------
const draft = ref(null)
const saving = ref(false)
const saveError = ref('')

// ----- Cover image upload state ------------------------------------------
const coverFileInput = ref(null)
const coverUploading = ref(false)
const coverError = ref('')

// ----- Lesson dialog state -----------------------------------------------
const lessonDialog = ref(false)
const lessonDialogMode = ref('create') // 'create' | 'edit'
const lessonDraft = ref({ title: '', description: '' })
const lessonEditingId = ref(null)
const lessonSubmitting = ref(false)
const lessonError = ref('')

// ----- Lesson upload progress (Bunny direct-PUT) -------------------------
const uploadingLessonId = ref(null)
const uploadingProgress = ref(0)
const uploadingFileName = ref('')

// ----- Delete confirmation -----------------------------------------------
const deleteDialog = ref(false)
const deleteKind = ref('course') // 'course' | 'lesson'
const deleteLessonId = ref(null)
const deleting = ref(false)

// ----- Reorder state ------------------------------------------------------
const reorderMode = ref(false)
const reorderBusy = ref(false)

const COURSE_STATUS_VISUALS = {
  pending_review: { label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  approved:       { label: 'مقبولة',          color: 'success', icon: 'ri-check-double-line' },
  hidden:         { label: 'مخفية',           color: 'secondary', icon: 'ri-eye-off-line' },
  rejected:       { label: 'مرفوضة',          color: 'error',   icon: 'ri-close-circle-line' },
}
const BUNNY_STATUS_VISUALS = {
  pending:    { label: 'بانتظار الرفع',   color: 'secondary', icon: 'ri-time-line' },
  uploaded:   { label: 'تم الرفع',        color: 'info',      icon: 'ri-upload-line' },
  processing: { label: 'قيد المعالجة',    color: 'warning',   icon: 'ri-loader-2-line' },
  ready:      { label: 'جاهز',            color: 'success',   icon: 'ri-checkbox-circle-line' },
  failed:     { label: 'فشل',             color: 'error',     icon: 'ri-error-warning-line' },
}

const breadcrumbItems = computed(() => [
  { title: 'الرئيسية',         to: '/teacher/dashboard',     disabled: false },
  { title: 'دوراتي المرئية',   to: '/teacher/video-courses', disabled: false },
  { title: course.value?.title || '...', disabled: true },
])

const courseStatusChip = computed(() => {
  if (!course.value) return null
  return COURSE_STATUS_VISUALS[course.value.status] || {
    label: course.value.status, color: 'default', icon: 'ri-question-line',
  }
})

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
    if (course.value) syncDraftFromCourse()
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || err?.message || 'تعذر تحميل الدورة'
  } finally {
    loading.value = false
  }
}

function syncDraftFromCourse () {
  draft.value = {
    title: course.value.title,
    description: course.value.description || '',
    subject: course.value.subject,
    teachingStage: course.value.teachingStage,
    isFree: !!course.value.isFree,
    price: Number(course.value.price || 0),
    visibility: course.value.visibility,
  }
}

async function saveCourse () {
  saving.value = true
  saveError.value = ''
  try {
    await Teacher.updateVideoCourse(id.value, {
      title: draft.value.title.trim(),
      description: draft.value.description.trim() || undefined,
      subject: draft.value.subject.trim(),
      teachingStage: draft.value.teachingStage.trim(),
      isFree: draft.value.isFree,
      price: draft.value.isFree ? 0 : Number(draft.value.price || 0),
      visibility: draft.value.visibility,
    })
    await fetchAll()
  } catch (err) {
    saveError.value =
      err?.response?.data?.message || err?.message || 'تعذر حفظ التعديلات'
  } finally {
    saving.value = false
  }
}

function triggerCoverFilePicker () {
  coverFileInput.value?.click()
}

async function onCoverFileChosen (event) {
  const f = event.target.files?.[0]
  event.target.value = ''
  if (!f) return
  coverUploading.value = true
  coverError.value = ''
  try {
    await Teacher.uploadVideoCourseCoverImage(id.value, f)
    await fetchAll()
  } catch (err) {
    coverError.value =
      err?.response?.data?.message || err?.message || 'تعذر رفع صورة الغلاف'
  } finally {
    coverUploading.value = false
  }
}

// ----- Lesson CRUD --------------------------------------------------------

function openCreateLessonDialog () {
  lessonDialogMode.value = 'create'
  lessonDraft.value = { title: '', description: '' }
  lessonEditingId.value = null
  lessonError.value = ''
  lessonDialog.value = true
}

function openEditLessonDialog (lesson) {
  lessonDialogMode.value = 'edit'
  lessonDraft.value = {
    title: lesson.title,
    description: lesson.description || '',
  }
  lessonEditingId.value = lesson.id
  lessonError.value = ''
  lessonDialog.value = true
}

async function submitLessonDialog () {
  lessonSubmitting.value = true
  lessonError.value = ''
  try {
    if (lessonDialogMode.value === 'create') {
      // Create on backend → returns { lesson, upload contract }
      const res = await Teacher.createVideoLesson(id.value, {
        title: lessonDraft.value.title.trim(),
        description: lessonDraft.value.description.trim() || undefined,
      })
      const { lesson, upload } = res?.data?.data || {}
      if (!lesson || !upload) {
        throw new Error('استجابة الخادم غير صالحة')
      }
      lessonDialog.value = false
      // Refresh lesson list immediately so the new row shows "pending"
      await fetchAll()
      // Optionally start the file upload (file picker in a second step)
      lessonAwaitingUploadId.value = lesson.id
      lessonAwaitingUploadContract.value = upload
      lessonUploadHint.value = true
    } else {
      await Teacher.updateVideoLesson(id.value, lessonEditingId.value, {
        title: lessonDraft.value.title.trim(),
        description: lessonDraft.value.description.trim() || undefined,
      })
      lessonDialog.value = false
      await fetchAll()
    }
  } catch (err) {
    lessonError.value =
      err?.response?.data?.message || err?.message || 'تعذرت العملية'
  } finally {
    lessonSubmitting.value = false
  }
}

// ----- After-create file picker for the Bunny upload ---------------------
const lessonAwaitingUploadId = ref(null)
const lessonAwaitingUploadContract = ref(null)
const lessonUploadHint = ref(false)
const videoFileInput = ref(null)

function triggerVideoFilePicker () {
  videoFileInput.value?.click()
}

async function onVideoFileChosen (event) {
  const f = event.target.files?.[0]
  event.target.value = ''
  if (!f) return
  if (!lessonAwaitingUploadContract.value || !lessonAwaitingUploadId.value) return

  uploadingLessonId.value = lessonAwaitingUploadId.value
  uploadingProgress.value = 0
  uploadingFileName.value = f.name
  lessonUploadHint.value = false

  try {
    await Teacher.uploadBytesToBunny(lessonAwaitingUploadContract.value, f, {
      onProgress: (p) => { uploadingProgress.value = p },
    })
    // Backend webhook will eventually flip the lesson to processing → ready.
    // Poll once via the sync endpoint so the UI reflects 'uploaded' quickly.
    try {
      await Teacher.syncVideoLesson(id.value, lessonAwaitingUploadId.value)
    } catch (_) { /* best-effort */ }
  } catch (err) {
    uploadingProgress.value = 0
    // eslint-disable-next-line no-alert
    alert('تعذر رفع الفيديو إلى Bunny: ' + (err?.message || ''))
  } finally {
    uploadingLessonId.value = null
    uploadingProgress.value = 0
    uploadingFileName.value = ''
    lessonAwaitingUploadId.value = null
    lessonAwaitingUploadContract.value = null
    await fetchAll()
  }
}

// ----- Resume upload for an existing lesson (re-issue contract) ----------
async function startReUpload (lesson) {
  // Lessons that were created earlier but never uploaded need a fresh
  // upload contract. We re-create the lesson (cleaning up the old Bunny
  // video first) — simplest path. A future phase can add a dedicated
  // "regenerate upload URL" endpoint that doesn't churn the row.
  // eslint-disable-next-line no-alert
  const confirmed = confirm(
    'سيتم إعادة رفع الفيديو لهذا الدرس. هل أنت متأكد؟'
  )
  if (!confirmed) return
  try {
    await Teacher.deleteVideoLesson(id.value, lesson.id)
    const res = await Teacher.createVideoLesson(id.value, {
      title: lesson.title,
      description: lesson.description || undefined,
    })
    const { lesson: newLesson, upload } = res?.data?.data || {}
    lessonAwaitingUploadId.value = newLesson.id
    lessonAwaitingUploadContract.value = upload
    lessonUploadHint.value = true
    await fetchAll()
  } catch (err) {
    // eslint-disable-next-line no-alert
    alert('تعذرت إعادة الإنشاء: ' + (err?.response?.data?.message || err?.message))
  }
}

async function syncLesson (lesson) {
  try {
    await Teacher.syncVideoLesson(id.value, lesson.id)
    await fetchAll()
  } catch (err) {
    // eslint-disable-next-line no-alert
    alert('تعذرت المزامنة: ' + (err?.response?.data?.message || err?.message))
  }
}

function askDeleteLesson (lesson) {
  deleteKind.value = 'lesson'
  deleteLessonId.value = lesson.id
  deleteDialog.value = true
}

function askDeleteCourse () {
  deleteKind.value = 'course'
  deleteLessonId.value = null
  deleteDialog.value = true
}

async function confirmDelete () {
  deleting.value = true
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
  } catch (err) {
    // eslint-disable-next-line no-alert
    alert('تعذر الحذف: ' + (err?.response?.data?.message || err?.message))
  } finally {
    deleting.value = false
  }
}

// ----- Reorder ------------------------------------------------------------

function moveLesson (index, dir) {
  const target = index + dir
  if (target < 0 || target >= lessons.value.length) return
  const arr = [...lessons.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  lessons.value = arr
}

async function saveReorder () {
  reorderBusy.value = true
  try {
    await Teacher.reorderVideoLessons(id.value, lessons.value.map(l => l.id))
    reorderMode.value = false
    await fetchAll()
  } catch (err) {
    // eslint-disable-next-line no-alert
    alert('تعذر الحفظ: ' + (err?.response?.data?.message || err?.message))
  } finally {
    reorderBusy.value = false
  }
}

function formatDuration (s) {
  const n = Number(s || 0)
  if (!n) return '—'
  const m = Math.floor(n / 60)
  const sec = n % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

onMounted(() => { fetchAll() })

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
    </div>

    <template v-else-if="course && draft">
      <!-- ===== Course metadata + cover ===== -->
      <VCard class="mb-4">
        <VCardText>
          <div class="d-flex flex-wrap align-center mb-3 ga-3">
            <h2 class="text-h5 ma-0 flex-grow-1">{{ course.title }}</h2>
            <VChip
              v-if="courseStatusChip"
              :color="courseStatusChip.color"
              variant="tonal"
            >
              <VIcon start size="16" :icon="courseStatusChip.icon" />
              {{ courseStatusChip.label }}
            </VChip>
            <VBtn
              color="error"
              variant="text"
              size="small"
              @click="askDeleteCourse"
            >
              <VIcon start icon="ri-delete-bin-line" /> حذف الدورة
            </VBtn>
          </div>

          <VAlert
            v-if="course.reviewNotes"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <strong>ملاحظة من الإدارة:</strong> {{ course.reviewNotes }}
          </VAlert>

          <VRow dense>
            <VCol cols="12" md="4">
              <div class="cover-wrap" :class="{ uploading: coverUploading }">
                <VImg
                  :src="course.coverImage || ''"
                  :aspect-ratio="16/9"
                  cover
                  class="bg-grey-lighten-3 rounded"
                >
                  <template #placeholder>
                    <div class="d-flex align-center justify-center h-100">
                      <VIcon icon="ri-image-line" size="48" color="grey" />
                    </div>
                  </template>
                </VImg>
                <VBtn
                  size="small"
                  variant="elevated"
                  class="cover-upload-btn"
                  :loading="coverUploading"
                  @click="triggerCoverFilePicker"
                >
                  <VIcon start icon="ri-image-edit-line" /> غيّر الغلاف
                </VBtn>
                <input
                  ref="coverFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="d-none"
                  @change="onCoverFileChosen"
                >
              </div>
              <VAlert
                v-if="coverError"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-2"
              >
                {{ coverError }}
              </VAlert>
              <div class="text-caption text-medium-emphasis mt-1">
                JPG / PNG / WEBP — حتى 5 ميجابايت
              </div>
            </VCol>

            <VCol cols="12" md="8">
              <VTextField
                v-model="draft.title"
                label="العنوان"
                density="comfortable"
                variant="outlined"
                class="mb-2"
                hide-details
              />
              <VTextarea
                v-model="draft.description"
                label="الوصف"
                rows="3"
                density="comfortable"
                variant="outlined"
                class="mb-2"
                hide-details
              />
              <VRow dense>
                <VCol cols="6">
                  <VTextField
                    v-model="draft.subject"
                    label="المادة"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                  />
                </VCol>
                <VCol cols="6">
                  <VTextField
                    v-model="draft.teachingStage"
                    label="المرحلة"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                  />
                </VCol>
              </VRow>
              <div class="d-flex align-center ga-3 my-2">
                <VSwitch
                  v-model="draft.isFree"
                  label="مجاني"
                  color="success"
                  density="compact"
                  inset
                  hide-details
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
                  style="max-width: 200px"
                />
                <VSelect
                  v-model="draft.visibility"
                  :items="[
                    { title: 'خاصة', value: 'private' },
                    { title: 'عامة', value: 'public' },
                  ]"
                  label="الرؤية"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  style="max-width: 220px"
                />
              </div>

              <VAlert
                v-if="saveError"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                {{ saveError }}
              </VAlert>

              <div class="d-flex justify-end ga-2">
                <VBtn variant="text" @click="syncDraftFromCourse">تراجع</VBtn>
                <VBtn color="primary" :loading="saving" @click="saveCourse">
                  <VIcon start icon="ri-save-line" /> حفظ التعديلات
                </VBtn>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                * أي تعديل يعيد الدورة إلى حالة "بانتظار المراجعة" من قبل الإدارة.
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <!-- ===== Lessons ===== -->
      <VCard>
        <VCardText>
          <div class="d-flex align-center mb-3 ga-2">
            <h3 class="text-h6 ma-0">الدروس</h3>
            <VChip variant="tonal" color="info" size="small">{{ lessons.length }}</VChip>
            <VSpacer />
            <template v-if="!reorderMode">
              <VBtn
                v-if="lessons.length > 1"
                variant="tonal"
                size="small"
                @click="reorderMode = true"
              >
                <VIcon start icon="ri-arrow-up-down-line" /> إعادة ترتيب
              </VBtn>
              <VBtn color="primary" @click="openCreateLessonDialog">
                <VIcon start icon="ri-add-line" /> درس جديد
              </VBtn>
            </template>
            <template v-else>
              <VBtn variant="text" @click="reorderMode = false; fetchAll()">إلغاء</VBtn>
              <VBtn color="primary" :loading="reorderBusy" @click="saveReorder">
                <VIcon start icon="ri-save-line" /> احفظ الترتيب
              </VBtn>
            </template>
          </div>

          <div v-if="lessons.length === 0" class="text-center pa-4 text-medium-emphasis">
            لم تضف دروساً بعد. اضغط "درس جديد" لإضافة أول درس.
          </div>

          <VList v-else density="comfortable" class="bg-transparent">
            <VListItem
              v-for="(lesson, idx) in lessons"
              :key="lesson.id"
              class="border rounded mb-2"
              :ripple="false"
            >
              <template #prepend>
                <VAvatar size="36" color="primary" variant="tonal">
                  <span>{{ idx + 1 }}</span>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">
                {{ lesson.title }}
              </VListItemTitle>
              <VListItemSubtitle v-if="lesson.description" class="text-caption">
                {{ lesson.description }}
              </VListItemSubtitle>
              <template v-if="uploadingLessonId === lesson.id" #append>
                <div class="d-flex flex-column align-end" style="min-width: 180px">
                  <div class="text-caption">{{ uploadingFileName }}</div>
                  <VProgressLinear
                    :model-value="uploadingProgress"
                    color="primary"
                    height="6"
                    rounded
                  />
                  <div class="text-caption text-medium-emphasis">{{ uploadingProgress }}%</div>
                </div>
              </template>
              <template v-else #append>
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
                  <template v-if="!reorderMode">
                    <VBtn
                      v-if="['pending', 'failed'].includes(lesson.bunnyStatus)"
                      size="small"
                      variant="text"
                      color="primary"
                      @click="startReUpload(lesson)"
                    >
                      <VIcon icon="ri-upload-line" />
                    </VBtn>
                    <VBtn
                      v-if="['uploaded', 'processing'].includes(lesson.bunnyStatus)"
                      size="small"
                      variant="text"
                      @click="syncLesson(lesson)"
                      title="تحديث الحالة من Bunny"
                    >
                      <VIcon icon="ri-refresh-line" />
                    </VBtn>
                    <VBtn size="small" variant="text" @click="openEditLessonDialog(lesson)">
                      <VIcon icon="ri-pencil-line" />
                    </VBtn>
                    <VBtn size="small" variant="text" color="error" @click="askDeleteLesson(lesson)">
                      <VIcon icon="ri-delete-bin-line" />
                    </VBtn>
                  </template>
                  <template v-else>
                    <VBtn size="small" variant="text" :disabled="idx === 0" @click="moveLesson(idx, -1)">
                      <VIcon icon="ri-arrow-up-line" />
                    </VBtn>
                    <VBtn size="small" variant="text" :disabled="idx === lessons.length - 1" @click="moveLesson(idx, 1)">
                      <VIcon icon="ri-arrow-down-line" />
                    </VBtn>
                  </template>
                </div>
              </template>
            </VListItem>
          </VList>

          <!-- Hidden file input for video upload -->
          <input
            ref="videoFileInput"
            type="file"
            accept="video/*"
            class="d-none"
            @change="onVideoFileChosen"
          >
        </VCardText>
      </VCard>
    </template>

    <!-- ===== Lesson create/edit dialog ===== -->
    <VDialog v-model="lessonDialog" max-width="480" persistent>
      <VCard>
        <VCardTitle>
          {{ lessonDialogMode === 'create' ? 'إضافة درس جديد' : 'تعديل الدرس' }}
        </VCardTitle>
        <VCardText>
          <VTextField
            v-model="lessonDraft.title"
            label="عنوان الدرس *"
            density="comfortable"
            variant="outlined"
            class="mb-3"
            hide-details
          />
          <VTextarea
            v-model="lessonDraft.description"
            label="الوصف (اختياري)"
            rows="3"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VAlert
            v-if="lessonError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ lessonError }}
          </VAlert>
          <VAlert
            v-if="lessonDialogMode === 'create'"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            بعد الحفظ سيُطلب منك اختيار ملف الفيديو ورفعه مباشرةً إلى Bunny Stream.
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="lessonSubmitting" @click="lessonDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="lessonSubmitting" @click="submitLessonDialog">
            {{ lessonDialogMode === 'create' ? 'إنشاء' : 'حفظ' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== After-create video file picker prompt ===== -->
    <VDialog v-model="lessonUploadHint" max-width="420" persistent>
      <VCard>
        <VCardTitle>ارفع فيديو الدرس</VCardTitle>
        <VCardText>
          تم إنشاء الدرس على المنصة. لرفع ملف الفيديو إلى Bunny Stream الآن،
          اضغط الزر أدناه واختر الملف من جهازك.
        </VCardText>
        <VCardActions>
          <VBtn
            variant="text"
            @click="lessonUploadHint = false; lessonAwaitingUploadId = null; lessonAwaitingUploadContract = null"
          >
            لاحقاً
          </VBtn>
          <VSpacer />
          <VBtn color="primary" @click="lessonUploadHint = false; triggerVideoFilePicker()">
            <VIcon start icon="ri-upload-line" /> اختر الملف
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== Delete confirmation ===== -->
    <VDialog v-model="deleteDialog" max-width="420" persistent>
      <VCard>
        <VCardTitle>
          {{ deleteKind === 'course' ? 'حذف الدورة' : 'حذف الدرس' }}
        </VCardTitle>
        <VCardText>
          <VAlert type="error" variant="tonal" density="compact">
            {{ deleteKind === 'course'
              ? 'سيتم حذف الدورة وجميع دروسها. الإجراء لا يمكن التراجع عنه من واجهة الأستاذ.'
              : 'سيتم حذف الدرس وحذف الفيديو من Bunny Stream.' }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="deleting" @click="deleteDialog = false">إلغاء</VBtn>
          <VBtn color="error" :loading="deleting" @click="confirmDelete">حذف</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.cover-wrap { position: relative; }
.cover-wrap .cover-upload-btn { position: absolute; bottom: 8px; inset-inline-end: 8px; }
.cover-wrap.uploading { opacity: .6; }
</style>
