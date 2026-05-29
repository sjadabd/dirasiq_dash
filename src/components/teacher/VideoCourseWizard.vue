<script setup>
// Phase 5 of the National Video Marketplace — the 5-step teacher wizard
// for creating a marketplace-aware video course.
//
// CONTRACT:
//   - Emits `submit` with the canonical Phase-3 payload (accessType +
//     gradeTargetIds + freeForEnrolledStudents + targetCourseIds +
//     freeStudentIds + priceIqd). The parent runs the create API call
//     and handles 4xx/5xx.
//   - Emits `cancel` when the teacher closes the dialog without saving.
//
// BACK-COMPAT:
//   The legacy create form sent { title, description, subject,
//   teachingStage, isFree, price, visibility, gradeId? }. This wizard
//   sends the SUPERSET — the new accessType-driven fields. The Phase 3
//   service layer accepts both shapes, so even if the wizard is shown
//   to a teacher who would have used the legacy path, the result is
//   the same row + same UX downstream.
//
// VALIDATION MIRRORING:
//   Every cross-field rule the backend enforces (Phase 3) is mirrored
//   client-side so the teacher gets immediate feedback before the
//   submit-time round trip:
//     - public_free_by_grade  → gradeTargetIds non-empty
//     - marketplace_paid      → gradeTargetIds non-empty AND priceIqd > 0
//     - enrolled_students_free → no price needed
//     - freeForEnrolledStudents → only with marketplace_paid
//
// UI VISIBILITY:
//   - Step 4 (Pricing) is rendered only for marketplace_paid.
//   - freeForEnrolledStudents toggle only renders inside Step 4.
//   - Step 3 hides targetCourseIds when the teacher has no live courses,
//     and freeStudentIds when they have no roster.

import { computed, ref, watch } from 'vue'
import Teacher from '@/api/teacher/teacher_api.js'

const emit = defineEmits(['submit', 'cancel'])

defineProps({
  // When true the parent dialog is in "submitting" state — disable the
  // submit button + show a spinner. The wizard itself doesn't own the
  // network call.
  submitting: { type: Boolean, default: false },

  // Optional initial error to surface above the Review step (e.g. a
  // 4xx from the parent's submit handler).
  externalError: { type: String, default: '' },
})

// ----- Step machine -------------------------------------------------------

const STEPS = [
  { n: 1, title: 'البيانات الأساسية',  icon: 'ri-edit-line' },
  { n: 2, title: 'نوع الوصول',           icon: 'ri-shield-user-line' },
  { n: 3, title: 'قواعد الإظهار',         icon: 'ri-eye-line' },
  { n: 4, title: 'التسعير',              icon: 'ri-money-dollar-circle-line' },
  { n: 5, title: 'المراجعة',             icon: 'ri-checkbox-circle-line' },
]
const currentStep = ref(1)

// ----- Form state ---------------------------------------------------------

const form = ref({
  // Step 1
  title:         '',
  description:   '',
  subject:       '',
  teachingStage: '',
  gradeId:       '',                       // for back-compat: also stored
  // Step 2
  accessType:    'public_free_by_grade',   // default — safest
  // Step 3
  gradeTargetIds:  [],                     // UUIDs from /grades/my-grades
  targetCourseIds: [],                     // UUIDs from /teacher/courses
  freeStudentIds:  [],                     // UUIDs from /teacher/students
  // Step 4
  priceIqd:                  0,
  freeForEnrolledStudents:   false,
})

// ----- Catalogs -----------------------------------------------------------

const catalogLoading = ref(false)
const subjectOptions = ref([])  // [{ title, value }]
const gradeOptions   = ref([])  // [{ title, value: gradeId, name }]
const courseOptions  = ref([])  // [{ title, value: courseId }]
const studentOptions = ref([])  // [{ title, value: studentId, subtitle }]

async function loadCatalogs () {
  catalogLoading.value = true
  try {
    const [subjectsRes, gradesRes, coursesRes, studentsRes] = await Promise.all([
      Teacher.getAllSubjects().catch(() => null),
      Teacher.getAllMyGrades().catch(() => null),
      Teacher.getCourse({ options: { page: 1, limit: 100 } }).catch(() => null),
      Teacher.getTeacherStudents().catch(() => null),
    ])

    // Subjects
    const subjectsData = subjectsRes?.data?.data || subjectsRes?.data || []
    const subjects = Array.isArray(subjectsData)
      ? subjectsData
      : (subjectsData.items || subjectsData.subjects || [])
    subjectOptions.value = subjects
      .map(s => ({
        title: s.name || s.title || s.subject || String(s.id || ''),
        value: s.name || s.title || s.subject,
      }))
      .filter(s => s.title)

    // Grades: /grades/my-grades returns junction-table rows
    //   { id, gradeId, gradeName, ... }
    // We send the REAL grades.id (gradeId), never the junction id.
    const gradesData = gradesRes?.data?.data || gradesRes?.data || []
    const grades = Array.isArray(gradesData)
      ? gradesData
      : (gradesData.items || gradesData.grades || [])
    gradeOptions.value = grades
      .map(g => {
        const realGradeId = g.gradeId || g.id
        const displayName = g.gradeName || g.name || g.title || ''
        return { title: displayName, value: realGradeId, name: displayName }
      })
      .filter(g => g.title && g.value)

    // Live courses for targetCourseIds
    const coursesPayload = coursesRes?.data
    const coursesData = coursesPayload?.data || coursesPayload || []
    const courses = Array.isArray(coursesData)
      ? coursesData
      : (coursesData.items || coursesData.courses || [])
    courseOptions.value = courses
      .map(c => ({
        title: c.courseName || c.course_name || c.title || `(دورة ${c.id})`,
        value: c.id,
      }))
      .filter(c => c.value)

    // Students for freeStudentIds
    const studentsPayload = studentsRes?.data
    const studentsData = studentsPayload?.data || studentsPayload || []
    const students = Array.isArray(studentsData)
      ? studentsData
      : (studentsData.items || studentsData.students || [])
    studentOptions.value = students
      .map(s => ({
        title: s.name || `(طالب ${s.id})`,
        value: s.id || s.studentId || s.student_id,
        subtitle: s.email || s.phone || '',
      }))
      .filter(s => s.value)
  } catch (_e) {
    // Non-fatal — the steps that depend on catalogs render an empty hint.
  } finally {
    catalogLoading.value = false
  }
}

// Mount: load catalogs.
loadCatalogs()

// ----- Stage <-> Grade coupling (back-compat) -----------------------------
//
// The Phase 3 backend still requires a non-empty `teachingStage` string.
// We mirror the chosen FIRST grade's name into teachingStage + gradeId
// to keep the legacy fields valid even though the new gradeTargetIds is
// the source of truth.

watch(
  () => form.value.gradeTargetIds,
  (ids) => {
    const first = (ids || [])[0]
    if (!first) {
      form.value.teachingStage = ''
      form.value.gradeId = ''
      return
    }
    const g = gradeOptions.value.find(opt => opt.value === first)
    if (g) {
      form.value.teachingStage = g.name
      form.value.gradeId = g.value
    }
  },
  { deep: true }
)

// ----- Access type metadata (radio cards) ---------------------------------

const ACCESS_TYPES = [
  {
    value: 'public_free_by_grade',
    title: 'كورس مجاني للمراحل',
    icon: 'ri-earth-line',
    color: 'success',
    blurb:
      'كورس مجاني يظهر لكل الطلاب ضمن المراحل التي تختارها. مناسب للمحتوى التعريفي أو الترويجي.',
  },
  {
    value: 'enrolled_students_free',
    title: 'مجاني لطلابك فقط',
    icon: 'ri-shield-user-line',
    color: 'info',
    blurb:
      'كورس مجاني، لكن يظهر فقط لطلابك الحضوريين (لديهم حجز نشط معك). لا يحتاج اختيار مراحل.',
  },
  {
    value: 'marketplace_paid',
    title: 'كورس مدفوع — السوق الوطني',
    icon: 'ri-store-2-line',
    color: 'warning',
    blurb:
      'كورس مدفوع متاح لأي طالب ضمن المراحل المختارة. يدفع عبر Wayl، ويُحوَّل صافي ربحك إلى محفظتك تلقائياً.',
  },
]

// ----- Derived flags ------------------------------------------------------

const isMarketplacePaid = computed(
  () => form.value.accessType === 'marketplace_paid'
)
const isEnrolledFree = computed(
  () => form.value.accessType === 'enrolled_students_free'
)
const needsGrades = computed(
  () =>
    form.value.accessType === 'public_free_by_grade' ||
    form.value.accessType === 'marketplace_paid'
)

// freeForEnrolledStudents toggle visibility — only for marketplace_paid.
watch(isMarketplacePaid, (val) => {
  if (!val) form.value.freeForEnrolledStudents = false
})

// Watch accessType — clear price if switching away from marketplace_paid.
watch(
  () => form.value.accessType,
  (newType) => {
    if (newType !== 'marketplace_paid') {
      form.value.priceIqd = 0
      form.value.freeForEnrolledStudents = false
    }
    // enrolled_students_free does not need grades.
    if (newType === 'enrolled_students_free') {
      form.value.gradeTargetIds = []
    }
  }
)

// ----- Commission preview --------------------------------------------------

const commissionPreview = ref(null)
const commissionLoading = ref(false)
const commissionError   = ref('')
let commissionDebounce = null

async function recomputeCommission () {
  const price = Number(form.value.priceIqd)
  if (!isMarketplacePaid.value || !Number.isFinite(price) || price <= 0) {
    commissionPreview.value = null
    commissionError.value = ''
    return
  }
  commissionLoading.value = true
  commissionError.value = ''
  try {
    const res = await Teacher.getCommissionPreview(price)
    const data = res?.data?.data || null
    commissionPreview.value = data
  } catch (err) {
    commissionError.value =
      err?.response?.data?.message || err?.message || 'تعذّر حساب العمولة'
    commissionPreview.value = null
  } finally {
    commissionLoading.value = false
  }
}

watch(
  [() => form.value.priceIqd, isMarketplacePaid],
  () => {
    clearTimeout(commissionDebounce)
    commissionDebounce = setTimeout(recomputeCommission, 350)
  }
)

// ----- Validation ---------------------------------------------------------
//
// Each step returns an error string (empty = pass). Submit walks all
// steps; on a failure we jump to the failing step.

const errorMessage = ref('')

function validateStep (n) {
  const f = form.value
  if (n === 1) {
    if (!f.title.trim()) return 'عنوان الدورة مطلوب'
    if (!f.subject) return 'يجب اختيار المادة'
    if (!f.description.trim()) return ''
    return ''
  }
  if (n === 2) {
    if (!['public_free_by_grade', 'enrolled_students_free', 'marketplace_paid'].includes(f.accessType)) {
      return 'يرجى اختيار نوع الوصول'
    }
    return ''
  }
  if (n === 3) {
    if (needsGrades.value && (!Array.isArray(f.gradeTargetIds) || f.gradeTargetIds.length === 0)) {
      return 'يجب اختيار مرحلة دراسية واحدة على الأقل لهذا النوع'
    }
    return ''
  }
  if (n === 4) {
    // Step 4 only renders for marketplace_paid; skip otherwise.
    if (!isMarketplacePaid.value) return ''
    const p = Number(f.priceIqd)
    if (!Number.isFinite(p) || p <= 0) return 'السعر يجب أن يكون أكبر من 0'
    if (p > 1_000_000) return 'السعر تجاوز الحد الأقصى المسموح'
    if (f.freeForEnrolledStudents && f.accessType !== 'marketplace_paid') {
      return 'الإتاحة المجانية لطلابك متاحة فقط مع النوع المدفوع'
    }
    return ''
  }
  return ''
}

function next () {
  errorMessage.value = ''
  const err = validateStep(currentStep.value)
  if (err) {
    errorMessage.value = err
    return
  }
  // Skip Step 4 if not marketplace_paid.
  let nextStep = currentStep.value + 1
  if (nextStep === 4 && !isMarketplacePaid.value) nextStep = 5
  if (nextStep <= STEPS.length) currentStep.value = nextStep
}

function prev () {
  errorMessage.value = ''
  let nextStep = currentStep.value - 1
  if (nextStep === 4 && !isMarketplacePaid.value) nextStep = 3
  if (nextStep >= 1) currentStep.value = nextStep
}

function goToStep (n) {
  errorMessage.value = ''
  if (n < currentStep.value) {
    currentStep.value = n
    return
  }
  // Forward jump: validate every step in between.
  for (let i = currentStep.value; i < n; i++) {
    const err = validateStep(i)
    if (err) {
      currentStep.value = i
      errorMessage.value = err
      return
    }
  }
  currentStep.value = n
}

// ----- Submit -------------------------------------------------------------

function buildPayload () {
  const f = form.value
  const payload = {
    title: f.title.trim(),
    description: f.description.trim() || undefined,
    subject: f.subject,
    teachingStage: f.teachingStage,
    accessType: f.accessType,
  }

  // New strict-path fields. The backend (Phase 3) requires:
  //   - gradeTargetIds for public_free_by_grade + marketplace_paid
  //   - priceIqd > 0 for marketplace_paid
  if (needsGrades.value) {
    payload.gradeTargetIds = [...f.gradeTargetIds]
  }
  if (isMarketplacePaid.value) {
    payload.priceIqd = Number(f.priceIqd)
    payload.freeForEnrolledStudents = !!f.freeForEnrolledStudents
  }

  // Optional pivots — only send when non-empty so the backend treats
  // them as "no change to the pivot" on omit.
  if (Array.isArray(f.targetCourseIds) && f.targetCourseIds.length > 0) {
    payload.targetCourseIds = [...f.targetCourseIds]
  }
  if (Array.isArray(f.freeStudentIds) && f.freeStudentIds.length > 0 && isMarketplacePaid.value) {
    payload.freeStudentIds = [...f.freeStudentIds]
  }

  // Legacy back-compat — the service layer reads gradeId when
  // accessType is omitted, but we still send it so older readers (admin
  // moderation panel, etc.) see a value.
  if (f.gradeId) payload.gradeId = f.gradeId

  return payload
}

function submit () {
  errorMessage.value = ''
  for (let i = 1; i <= STEPS.length; i++) {
    // Skip step 4 if not marketplace_paid.
    if (i === 4 && !isMarketplacePaid.value) continue
    const err = validateStep(i)
    if (err) {
      currentStep.value = i
      errorMessage.value = err
      return
    }
  }
  emit('submit', buildPayload())
}

function cancel () {
  emit('cancel')
}

// ----- Derived UI helpers --------------------------------------------------

const accessTypeMeta = computed(
  () => ACCESS_TYPES.find(t => t.value === form.value.accessType) || ACCESS_TYPES[0]
)

const fmtIqd = (n) => {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('en-IQ').format(num) + ' د.ع'
}
</script>

<template>
  <div class="vc-wizard">
    <!-- Stepper header -->
    <div class="vc-steps">
      <div
        v-for="s in STEPS"
        :key="s.n"
        class="vc-step"
        :class="{
          'is-active': currentStep === s.n,
          'is-done':   currentStep > s.n,
          'is-hidden': s.n === 4 && !isMarketplacePaid,
        }"
        role="button"
        tabindex="0"
        @click="goToStep(s.n)"
        @keydown.enter="goToStep(s.n)"
      >
        <div class="vc-step-icon">
          <VIcon
            :icon="currentStep > s.n ? 'ri-check-line' : s.icon"
            size="18"
          />
        </div>
        <div class="vc-step-meta">
          <div class="vc-step-n">
            خطوة {{ s.n }}
          </div>
          <div class="vc-step-title">
            {{ s.title }}
          </div>
        </div>
      </div>
    </div>

    <!-- Error banner -->
    <VAlert
      v-if="errorMessage || externalError"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      {{ errorMessage || externalError }}
    </VAlert>

    <!-- ============ Step 1: Basic Info ============ -->
    <section v-show="currentStep === 1">
      <VRow dense>
        <VCol cols="12">
          <VTextField
            v-model="form.title"
            label="عنوان الدورة *"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="ri-edit-line"
            counter="200"
            maxlength="200"
          />
        </VCol>
        <VCol cols="12">
          <VTextarea
            v-model="form.description"
            label="وصف الدورة (اختياري)"
            variant="outlined"
            density="comfortable"
            rows="4"
            prepend-inner-icon="ri-file-text-line"
            counter="10000"
            maxlength="10000"
          />
        </VCol>
        <VCol
          cols="12"
          sm="6"
        >
          <VSelect
            v-model="form.subject"
            :items="subjectOptions"
            :loading="catalogLoading"
            label="المادة *"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="ri-book-2-line"
            no-data-text="لا توجد مواد — أضِف مادة في قسم المواد"
          />
        </VCol>
        <VCol
          cols="12"
          sm="6"
        >
          <VAlert
            v-if="subjectOptions.length === 0 && !catalogLoading"
            type="warning"
            variant="tonal"
            density="compact"
            icon="ri-information-line"
          >
            يجب أن تُضيف مادة واحدة على الأقل قبل إنشاء كورس مرئي.
          </VAlert>
        </VCol>
      </VRow>
    </section>

    <!-- ============ Step 2: Access Type ============ -->
    <section v-show="currentStep === 2">
      <div class="text-body-2 text-medium-emphasis mb-3">
        اختر كيف يصل الطلاب إلى هذا الكورس. يمكنك تغييره لاحقاً من صفحة الكورس.
      </div>
      <VRow dense>
        <VCol
          v-for="t in ACCESS_TYPES"
          :key="t.value"
          cols="12"
        >
          <VCard
            :variant="form.accessType === t.value ? 'tonal' : 'outlined'"
            :color="form.accessType === t.value ? t.color : undefined"
            class="access-card"
            @click="form.accessType = t.value"
          >
            <VCardText class="d-flex align-start ga-3 py-3">
              <div class="access-icon">
                <VIcon
                  :icon="t.icon"
                  :color="t.color"
                  size="26"
                />
              </div>
              <div class="flex-grow-1">
                <div class="d-flex align-center ga-2">
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ t.title }}
                  </div>
                  <VChip
                    v-if="form.accessType === t.value"
                    :color="t.color"
                    size="x-small"
                    variant="elevated"
                  >
                    مختار
                  </VChip>
                </div>
                <div class="text-body-2 text-medium-emphasis mt-1">
                  {{ t.blurb }}
                </div>
              </div>
              <VRadio
                :model-value="form.accessType"
                :value="t.value"
                hide-details
                density="compact"
                :color="t.color"
              />
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ============ Step 3: Visibility Rules ============ -->
    <section v-show="currentStep === 3">
      <div class="text-body-2 text-medium-emphasis mb-3">
        حدّد المراحل والكورسات المرتبطة. هذه الإعدادات تتحكم بمن يرى الكورس فعلياً.
      </div>

      <!-- Grade targets -->
      <VAlert
        v-if="!needsGrades"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
        icon="ri-information-line"
      >
        النوع المختار "مجاني لطلابك" — لا يحتاج اختيار مراحل. الوصول يعتمد على وجود حجز نشط للطالب معك.
      </VAlert>

      <VSelect
        v-if="needsGrades"
        v-model="form.gradeTargetIds"
        :items="gradeOptions"
        :loading="catalogLoading"
        label="المراحل الدراسية المستهدفة *"
        hint="يمكنك اختيار أكثر من مرحلة"
        persistent-hint
        multiple
        chips
        closable-chips
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="ri-graduation-cap-line"
        no-data-text="لا توجد مراحل — أضِف مرحلة في قسم المراحل"
        class="mb-3"
      />

      <!-- targetCourseIds — UI only -->
      <VSelect
        v-if="courseOptions.length > 0"
        v-model="form.targetCourseIds"
        :items="courseOptions"
        label="ربط بكورسات حضورية (اختياري)"
        hint="عند ربط الكورس بدورة حضورية، يظهر داخل صفحة الدورة لطلابها. لا يؤثر على من يستطيع الشراء/المشاهدة."
        persistent-hint
        multiple
        chips
        closable-chips
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="ri-link"
        class="mb-3"
      />

      <!-- freeStudentIds — only for marketplace_paid + if roster exists -->
      <VSelect
        v-if="isMarketplacePaid && studentOptions.length > 0"
        v-model="form.freeStudentIds"
        :items="studentOptions"
        item-title="title"
        item-value="value"
        label="منح وصول مجاني لطلاب محددين (اختياري)"
        hint="الطلاب المختارون يحصلون على الكورس بدون دفع — مفيد للمتفوقين أو منح خاصة."
        persistent-hint
        multiple
        chips
        closable-chips
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="ri-user-star-line"
        class="mb-3"
      />

      <VAlert
        v-if="isMarketplacePaid && studentOptions.length === 0 && !catalogLoading"
        type="info"
        variant="tonal"
        density="compact"
        icon="ri-information-line"
      >
        لا يوجد طلاب مرتبطون بك حالياً — يمكنك تخطي خانة "منح وصول مجاني" وإضافتها لاحقاً.
      </VAlert>
    </section>

    <!-- ============ Step 4: Pricing (marketplace_paid only) ============ -->
    <section v-show="currentStep === 4 && isMarketplacePaid">
      <div class="text-body-2 text-medium-emphasis mb-3">
        حدّد سعر بيع الكورس. النظام يحسب عمولة المنصة وصافي ربحك مباشرة.
      </div>

      <VRow dense>
        <VCol
          cols="12"
          sm="6"
        >
          <VTextField
            v-model.number="form.priceIqd"
            type="number"
            min="0"
            label="سعر البيع (د.ع) *"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="ri-money-dollar-circle-line"
            suffix="د.ع"
          />
        </VCol>
        <VCol
          cols="12"
          sm="6"
        >
          <VSwitch
            v-model="form.freeForEnrolledStudents"
            label="مجاني لطلابي الحضوريين"
            color="info"
            inset
            density="compact"
            hide-details
          />
          <div class="text-caption text-medium-emphasis mt-1">
            عند التفعيل: طلابك الحضوريون يحصلون على الكورس مجاناً دون شراء.
          </div>
        </VCol>
      </VRow>

      <!-- Live commission preview -->
      <VCard
        variant="outlined"
        class="mt-4"
      >
        <VCardText>
          <div class="d-flex align-center mb-2">
            <VIcon
              icon="ri-calculator-line"
              start
              size="20"
              color="primary"
            />
            <strong>معاينة العمولة وصافي الربح</strong>
            <VSpacer />
            <VProgressCircular
              v-if="commissionLoading"
              indeterminate
              size="20"
              width="2"
              color="primary"
            />
          </div>
          <VAlert
            v-if="commissionError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-2"
          >
            {{ commissionError }}
          </VAlert>
          <div
            v-if="commissionPreview"
            class="commission-grid"
          >
            <div class="commission-cell">
              <div class="commission-label">
                سعر البيع
              </div>
              <div class="commission-value">
                {{ fmtIqd(commissionPreview.grossSalePriceIqd) }}
              </div>
            </div>
            <div class="commission-cell">
              <div class="commission-label">
                عمولة المنصة ({{ commissionPreview.commissionPercent }}%)
              </div>
              <div class="commission-value text-error">
                − {{ fmtIqd(commissionPreview.commissionAmountIqd) }}
              </div>
            </div>
            <div class="commission-cell commission-net">
              <div class="commission-label">
                صافي ربحك
              </div>
              <div class="commission-value text-success">
                {{ fmtIqd(commissionPreview.netToTeacherIqd) }}
              </div>
            </div>
          </div>
          <div
            v-else-if="!commissionLoading && !commissionError"
            class="text-caption text-medium-emphasis"
          >
            أدخل سعراً أكبر من 0 لمعرفة صافي ربحك.
          </div>
        </VCardText>
      </VCard>
    </section>

    <!-- ============ Step 5: Review ============ -->
    <section v-show="currentStep === 5">
      <div class="text-body-2 text-medium-emphasis mb-3">
        راجع جميع البيانات قبل الإرسال. يمكنك التراجع لأي خطوة لتعديلها.
      </div>

      <VCard
        variant="outlined"
        class="mb-3"
      >
        <VCardText>
          <div class="review-section-title">
            <VIcon
              icon="ri-edit-line"
              start
              size="18"
            /> الأساسيات
          </div>
          <div class="review-row">
            <span>العنوان:</span><strong>{{ form.title || '—' }}</strong>
          </div>
          <div class="review-row">
            <span>المادة:</span><strong>{{ form.subject || '—' }}</strong>
          </div>
          <div
            v-if="form.description"
            class="review-row"
          >
            <span>الوصف:</span><span class="review-blurb">{{ form.description }}</span>
          </div>
        </VCardText>
      </VCard>

      <VCard
        variant="outlined"
        class="mb-3"
      >
        <VCardText>
          <div class="review-section-title">
            <VIcon
              :icon="accessTypeMeta.icon"
              start
              size="18"
              :color="accessTypeMeta.color"
            /> نوع الوصول
          </div>
          <div class="review-row">
            <strong>{{ accessTypeMeta.title }}</strong>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ accessTypeMeta.blurb }}
          </div>
        </VCardText>
      </VCard>

      <VCard
        variant="outlined"
        class="mb-3"
      >
        <VCardText>
          <div class="review-section-title">
            <VIcon
              icon="ri-eye-line"
              start
              size="18"
            /> الإظهار
          </div>
          <div
            v-if="needsGrades"
            class="review-row"
          >
            <span>المراحل:</span>
            <span>
              <VChip
                v-for="id in form.gradeTargetIds"
                :key="id"
                size="x-small"
                class="me-1 mb-1"
                color="primary"
                variant="tonal"
              >
                {{ gradeOptions.find(g => g.value === id)?.title || id }}
              </VChip>
              <span
                v-if="form.gradeTargetIds.length === 0"
                class="text-medium-emphasis"
              >—</span>
            </span>
          </div>
          <div
            v-if="form.targetCourseIds.length > 0"
            class="review-row"
          >
            <span>مرتبط بدورات:</span>
            <span>
              <VChip
                v-for="id in form.targetCourseIds"
                :key="id"
                size="x-small"
                class="me-1 mb-1"
                variant="tonal"
              >
                {{ courseOptions.find(c => c.value === id)?.title || id }}
              </VChip>
            </span>
          </div>
          <div
            v-if="isMarketplacePaid && form.freeStudentIds.length > 0"
            class="review-row"
          >
            <span>طلاب مستثنون (مجاني):</span>
            <strong>{{ form.freeStudentIds.length }} طالب</strong>
          </div>
        </VCardText>
      </VCard>

      <VCard
        v-if="isMarketplacePaid"
        variant="outlined"
        class="mb-3"
      >
        <VCardText>
          <div class="review-section-title">
            <VIcon
              icon="ri-money-dollar-circle-line"
              start
              size="18"
            /> التسعير
          </div>
          <div class="review-row">
            <span>سعر البيع:</span><strong>{{ fmtIqd(form.priceIqd) }}</strong>
          </div>
          <div
            v-if="commissionPreview"
            class="review-row"
          >
            <span>صافي الربح المتوقّع:</span>
            <strong class="text-success">{{ fmtIqd(commissionPreview.netToTeacherIqd) }}</strong>
          </div>
          <div class="review-row">
            <span>مجاني للطلاب الحضوريين:</span>
            <strong>{{ form.freeForEnrolledStudents ? 'نعم' : 'لا' }}</strong>
          </div>
        </VCardText>
      </VCard>

      <VAlert
        type="info"
        variant="tonal"
        density="compact"
        icon="ri-information-line"
      >
        بعد الإنشاء، يصبح الكورس "بانتظار المراجعة" حتى يوافق عليه المدير. يمكنك إضافة الدروس + الصورة من صفحة الكورس فوراً.
      </VAlert>
    </section>

    <!-- Nav buttons -->
    <div class="vc-nav mt-4">
      <VBtn
        v-if="currentStep > 1"
        variant="text"
        :disabled="submitting"
        @click="prev"
      >
        <VIcon
          start
          icon="ri-arrow-right-line"
        /> السابق
      </VBtn>
      <VSpacer />
      <VBtn
        variant="text"
        :disabled="submitting"
        @click="cancel"
      >
        إلغاء
      </VBtn>
      <VBtn
        v-if="currentStep < STEPS.length"
        color="primary"
        :disabled="submitting"
        @click="next"
      >
        التالي
        <VIcon
          end
          icon="ri-arrow-left-line"
        />
      </VBtn>
      <VBtn
        v-else
        color="success"
        :loading="submitting"
        @click="submit"
      >
        <VIcon
          start
          icon="ri-check-line"
        />
        إنشاء الكورس
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.vc-wizard {
  display: flex;
  flex-direction: column;
}

.vc-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  border-radius: 8px;
}
.vc-step {
  flex: 1 1 140px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color .15s, border-color .15s;
}
.vc-step.is-hidden { display: none; }
.vc-step:hover    { background: rgba(var(--v-theme-primary), 0.04); }
.vc-step.is-active{
  background: rgba(var(--v-theme-primary), 0.10);
  border-color: rgba(var(--v-theme-primary), 0.35);
}
.vc-step.is-done .vc-step-icon { color: rgb(var(--v-theme-success)); }
.vc-step-icon {
  display: inline-flex;
  width: 32px; height: 32px;
  align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-surface-variant), 0.7);
  flex-shrink: 0;
}
.vc-step-meta { min-width: 0; }
.vc-step-n {
  font-size: 11px;
  color: rgba(0,0,0,.5);
  font-weight: 600;
}
.vc-step-title { font-size: 13px; font-weight: 700; }

.access-card { cursor: pointer; }

.commission-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.commission-cell {
  padding: 10px;
  border-radius: 6px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
}
.commission-net  { background: rgba(var(--v-theme-success), 0.10); }
.commission-label { font-size: 12px; color: rgba(0,0,0,.6); }
.commission-value { font-size: 18px; font-weight: 800; margin-top: 4px; }

.review-section-title {
  display: flex; align-items: center;
  font-weight: 700; margin-bottom: 6px;
}
.review-row {
  display: flex; gap: 8px; align-items: baseline;
  font-size: 13px; margin: 2px 0;
}
.review-row > span:first-child {
  color: rgba(0,0,0,.55);
  min-width: 120px;
}
.review-blurb { color: rgba(0,0,0,.7); }

.vc-nav { display: flex; align-items: center; gap: 8px; }

@media (max-width: 600px) {
  .commission-grid { grid-template-columns: 1fr; }
}
</style>
