<script setup>
// Teacher application — multi-step submit form (matches Flutter's
// TeacherApplicationFormScreen). Four steps, dual auth path
// (email/password OR Google), public subject/stage dropdowns with
// "other" fallback, file uploads via the existing X-Upload-Token
// flow, and post-submit branching (email → OTP screen, google →
// success screen).
//
// This page is public (`blank` layout). No JWT needed; the
// teacher_application_api uses the shared axios instance, which
// simply doesn't attach Authorization when not logged in.

import { useRoute, useRouter } from 'vue-router'
import TeacherAppApi from '@/api/teacher-application/teacher_application_api.js'
import { useGoogleIdentity } from '@/composables/useGoogleIdentity'

definePage({ meta: { layout: 'blank', public: true } })

const router = useRouter()
const route = useRoute()

// ----- Step machine ------------------------------------------------------
const STEP_LABELS = [
  'المعلومات الأساسية',
  'معلومات التدريس',
  'الملف الشخصي',
  'المستندات + الإرسال',
]

const stepCount = STEP_LABELS.length
const currentStep = ref(0)

// ----- Form state --------------------------------------------------------
const form = ref({
  authProvider: 'email', // 'email' | 'google'
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  gender: 'male',
  birthDate: '',
  city: '',
  area: '',
  subject: '',
  customSubject: '',
  gradeIds: [], // multi-select of grade UUIDs (replaces the legacy teachingStage)
  yearsOfExperience: 0,
  currentWorkplace: '',
  hasPhysicalCourses: false,
  estimatedStudentCount: 0,
  bio: '',
  facebookUrl: '',
  instagramUrl: '',
  telegramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
})

// ----- Google identity state --------------------------------------------
const { renderButton } = useGoogleIdentity()
const googleConnected = ref(false)
const googleEmail = ref('')
const googleIdToken = ref('')
const googleError = ref('')

watch([currentStep, () => form.value.authProvider], async () => {
  if (currentStep.value !== 0) return
  if (form.value.authProvider !== 'google') return
  await nextTick()
  setTimeout(() => {
    const ok = renderButton('google-apply-btn', identity => {
      googleIdToken.value = identity.idToken
      googleEmail.value = identity.email
      googleConnected.value = true
      googleError.value = ''
    })

    if (!ok) {
      googleError.value =
        'تعذر تحميل تسجيل الدخول بواسطة Google. تأكد من إعدادات الإنترنت.'
    }
  }, 50)
}, { immediate: true })

// ----- Public catalogs (subject + grades) -------------------------------
const subjectsCatalog = ref([])
const gradesCatalog = ref([]) // [{ id, name }]
const catalogLoading = ref(true)
const catalogError = ref('')

const OTHER_LABEL = 'أخرى'

async function loadCatalogs () {
  try {
    const [s, g] = await Promise.all([
      TeacherAppApi.getSubjects(),
      TeacherAppApi.getActiveGrades(),
    ])

    subjectsCatalog.value = Array.isArray(s?.data?.data) ? s.data.data : []
    const rawGrades = g?.data?.data
    gradesCatalog.value = Array.isArray(rawGrades)
      ? rawGrades
        .map(r => ({ id: r?.id ?? r?._id, name: r?.name ?? '' }))
        .filter(r => r.id && r.name)
      : []
  } catch (e) {
    catalogError.value =
      'تعذر تحميل قوائم المواد والمراحل — أعد تحميل الصفحة لاحقاً.'
  } finally {
    catalogLoading.value = false
  }
}
onMounted(loadCatalogs)

const subjectOptions = computed(() => [
  ...subjectsCatalog.value.map(s => ({ title: s, value: s })),
  { title: OTHER_LABEL, value: OTHER_LABEL },
])

const gradeOptions = computed(() =>
  gradesCatalog.value.map(g => ({ title: g.name, value: g.id })),
)

// ----- File slots --------------------------------------------------------
const FILE_KINDS = [
  { kind: 'profile_image',     label: 'الصورة الشخصية',    accept: 'image/jpeg,image/png,image/webp', hint: 'JPG / PNG / WEBP — حتى 5MB' },
  { kind: 'certificate_image', label: 'شهادة التدريس',     accept: 'image/jpeg,image/png,image/webp,application/pdf', hint: 'JPG / PNG / WEBP / PDF — حتى 10MB' },
  { kind: 'national_id_image', label: 'الهوية الوطنية',    accept: 'image/jpeg,image/png,image/webp', hint: 'JPG / PNG / WEBP — حتى 5MB' },
  { kind: 'optional_attachment', label: 'مرفق إضافي (اختياري)', accept: 'image/jpeg,image/png,image/webp,application/pdf', hint: 'JPG / PNG / WEBP / PDF — حتى 10MB' },
  { kind: 'intro_video',       label: 'فيديو تعريفي',      accept: 'video/mp4', hint: 'MP4 — حتى 50MB' },
]

const pickedFiles = ref({}) // { [kind]: File }
const fileProgress = ref({}) // { [kind]: 0..100 }
const fileError = ref({})    // { [kind]: string }

// ----- Submit state ------------------------------------------------------
const submitting = ref(false)
const submitError = ref('')

// ----- Step validators --------------------------------------------------
function isNonEmpty (v) { return String(v ?? '').trim().length > 0 }
function emailValid (v) {
  const s = String(v || '').trim()
  
  return s.length > 5 && s.includes('@') && s.includes('.')
}
function phoneValid (v) {
  const s = String(v || '').trim()
  
  return s.length >= 10 && s.length <= 15
}

function validateStep (idx) {
  if (idx === 0) {
    const f = form.value
    if (!isNonEmpty(f.firstName) || !isNonEmpty(f.lastName)) return 'الاسم الأول والأخير مطلوبان'
    if (!phoneValid(f.phone)) return 'رقم الهاتف يجب أن يحتوي على 10–15 رقم'
    if (f.authProvider === 'email') {
      if (!emailValid(f.email)) return 'صيغة البريد الإلكتروني غير صحيحة'
      if (String(f.password || '').length < 6) return 'كلمة المرور 6 أحرف على الأقل'
    } else {
      if (!googleConnected.value || !googleIdToken.value) return 'يرجى تسجيل الدخول عبر Google قبل المتابعة'
    }
    if (!['male', 'female'].includes(f.gender)) return 'الجنس مطلوب'
    if (!isNonEmpty(f.birthDate)) return 'تاريخ الميلاد مطلوب'
    if (!isNonEmpty(f.city) || !isNonEmpty(f.area)) return 'المدينة والمنطقة مطلوبتان'
    
    return null
  }
  if (idx === 1) {
    const f = form.value
    if (!isNonEmpty(f.subject)) return 'المادة مطلوبة'
    if (f.subject === OTHER_LABEL && !isNonEmpty(f.customSubject)) return 'يرجى تحديد المادة'
    if (!Array.isArray(f.gradeIds) || f.gradeIds.length === 0) return 'يجب اختيار مرحلة دراسية واحدة على الأقل'
    if (Number(f.yearsOfExperience) < 0) return 'سنوات الخبرة غير صحيحة'

    return null
  }

  // Steps 2 + 3 have no hard requirements
  return null
}

function next () {
  const err = validateStep(currentStep.value)
  if (err) { submitError.value = err 

    return }
  submitError.value = ''
  if (currentStep.value < stepCount - 1) currentStep.value++
}
function prev () {
  submitError.value = ''
  if (currentStep.value > 0) currentStep.value--
}

// ----- File picker handlers ---------------------------------------------
function pickFile (kind, event) {
  const f = event.target.files?.[0]

  event.target.value = ''
  if (!f) return
  pickedFiles.value = { ...pickedFiles.value, [kind]: f }
  fileError.value = { ...fileError.value, [kind]: '' }
  fileProgress.value = { ...fileProgress.value, [kind]: 0 }
}
function dropFile (kind) {
  const { [kind]: _gone, ...rest } = pickedFiles.value

  pickedFiles.value = rest
  fileError.value = { ...fileError.value, [kind]: '' }
}
function clickFileInput (kind) {
  const el = document.getElementById(`file-${kind}`)
  if (el) el.click()
}

// ----- Submit pipeline ---------------------------------------------------
async function submit () {
  // Final validate sweep across all steps
  for (let i = 0; i < stepCount; i++) {
    const err = validateStep(i)
    if (err) { submitError.value = err; currentStep.value = i 

      return }
  }
  submitError.value = ''
  submitting.value = true

  try {
    const f = form.value

    // Resolve the OTHER fallback for subject. Grades are now ids only.
    const finalSubject = f.subject === OTHER_LABEL ? f.customSubject.trim() : String(f.subject || '').trim()

    /** @type {Record<string, any>} */
    const payload = {
      authProvider: f.authProvider,
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      phone: f.phone.trim(),
      gender: f.gender,
      birthDate: f.birthDate,
      city: f.city.trim(),
      area: f.area.trim(),
      subject: finalSubject,
      gradeIds: [...f.gradeIds],
      yearsOfExperience: Number(f.yearsOfExperience || 0),
      hasPhysicalCourses: !!f.hasPhysicalCourses,
      estimatedStudentCount: Number(f.estimatedStudentCount || 0),
    }


    // Optional fields — only send when filled.
    const optionalMap = {
      currentWorkplace: f.currentWorkplace,
      bio: f.bio,
      facebookUrl: f.facebookUrl,
      instagramUrl: f.instagramUrl,
      telegramUrl: f.telegramUrl,
      tiktokUrl: f.tiktokUrl,
      youtubeUrl: f.youtubeUrl,
    }

    for (const [k, v] of Object.entries(optionalMap)) {
      const s = String(v || '').trim()
      if (s) payload[k] = s
    }
    if (f.authProvider === 'email') {
      payload.email = f.email.trim()
      payload.password = f.password
    } else {
      payload.googleToken = googleIdToken.value
    }

    const submitRes = await TeacherAppApi.submit(payload)
    const data = submitRes?.data?.data || {}
    const applicationId = data.id
    const uploadToken = data.uploadToken
    const emailForReceipts = f.authProvider === 'google' ? googleEmail.value : f.email.trim()

    if (!applicationId) throw new Error('استجابة الخادم غير صالحة (لا يوجد applicationId)')

    // Upload files sequentially with progress. Failures are NON-FATAL —
    // the application row is already created, the user can re-upload
    // later via support.
    for (const slot of FILE_KINDS) {
      const file = pickedFiles.value[slot.kind]
      if (!file) continue
      try {
        await TeacherAppApi.uploadFile({
          applicationId,
          uploadToken,
          kind: slot.kind,
          file,
          onProgress: p => {
            fileProgress.value = { ...fileProgress.value, [slot.kind]: p }
          },
        })
        fileProgress.value = { ...fileProgress.value, [slot.kind]: 100 }
      } catch (uerr) {
        fileError.value = {
          ...fileError.value,
          [slot.kind]:
            uerr?.response?.data?.message
            || uerr?.message
            || 'فشل رفع الملف',
        }

        // Continue with the next file
      }
    }

    // Branch: email path → OTP; google path → success.
    if (f.authProvider === 'email') {
      router.replace({
        path: `/apply-as-teacher/otp/${applicationId}`,
        query: { email: emailForReceipts },
      })
    } else {
      router.replace({
        path: '/apply-as-teacher/success',
        query: emailForReceipts ? { email: emailForReceipts } : {},
      })
    }
  } catch (err) {
    const apiErrs = err?.response?.data?.errors
    if (Array.isArray(apiErrs) && apiErrs.length > 0) {
      submitError.value = apiErrs
        .map(e => `${e.field || e.code || ''}: ${e.message}`.trim())
        .join(' • ')
    } else {
      submitError.value =
        err?.response?.data?.message
        || err?.message
        || 'حدث خطأ غير متوقع. حاول مرة أخرى.'
    }
  } finally {
    submitting.value = false
  }
}

// ----- Init referral code from query (?ref=…) ---------------------------
onMounted(() => {
  // Currently the backend doesn't read referralCode on
  // /api/teacher-applications, but if it's added later this is the seam.
  void route.query.ref
})
</script>

<template>
  <div class="apply-form-wrap">
    <RouterLink
      to="/apply-as-teacher"
      class="back-link"
      aria-label="رجوع"
    >
      <VIcon
        icon="ri-arrow-right-line"
        size="20"
      />
    </RouterLink>

    <div class="apply-form-shell">
      <header class="form-header">
        <h1 class="form-heading">
          تقديم طلب الانضمام كأستاذ
        </h1>
        <p class="form-sub">
          خطوة {{ currentStep + 1 }} من {{ stepCount }} — {{ STEP_LABELS[currentStep] }}
        </p>
        <VProgressLinear
          :model-value="((currentStep + 1) / stepCount) * 100"
          color="primary"
          height="6"
          rounded
          class="mt-3"
        />
      </header>

      <!-- ============ Step 1: Basic info ============ -->
      <section
        v-show="currentStep === 0"
        class="step-section"
      >
        <div class="auth-toggle">
          <div class="toggle-label">
            طريقة التسجيل
          </div>
          <div class="toggle-row">
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: form.authProvider === 'email' }"
              @click="form.authProvider = 'email'; googleConnected = false; googleIdToken = ''; googleEmail = ''"
            >
              <VIcon
                icon="ri-mail-line"
                size="18"
              /> البريد الإلكتروني
            </button>
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: form.authProvider === 'google' }"
              @click="form.authProvider = 'google'"
            >
              <VIcon
                icon="ri-google-fill"
                size="18"
              /> Google
            </button>
          </div>
        </div>

        <VRow dense>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.firstName"
              label="الاسم الأول *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-user-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.lastName"
              label="الاسم الأخير *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-user-line"
            />
          </VCol>
          <VCol cols="12">
            <VTextField
              v-model="form.phone"
              label="رقم الهاتف (10–15 رقم) *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-phone-line"
            />
          </VCol>

          <template v-if="form.authProvider === 'email'">
            <VCol cols="12">
              <VTextField
                v-model="form.email"
                type="email"
                label="البريد الإلكتروني *"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-mail-line"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="form.password"
                type="password"
                label="كلمة المرور (6 أحرف على الأقل) *"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-lock-2-line"
              />
            </VCol>
          </template>
          <template v-else>
            <VCol cols="12">
              <div
                class="google-connect"
                :class="{ connected: googleConnected }"
              >
                <div class="google-connect-head">
                  <VIcon
                    :icon="googleConnected ? 'ri-checkbox-circle-line' : 'ri-google-fill'"
                    :color="googleConnected ? 'success' : 'primary'"
                  />
                  <span v-if="googleConnected">
                    تم ربط حساب Google: <strong>{{ googleEmail }}</strong>
                  </span>
                  <span v-else>
                    سجّل الدخول عبر Google لتأكيد بريدك الإلكتروني
                  </span>
                </div>
                <div
                  id="google-apply-btn"
                  class="google-btn-host"
                />
                <VAlert
                  v-if="googleError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                >
                  {{ googleError }}
                </VAlert>
                <div class="google-fine">
                  لن نرى كلمة مرور حساب Google الخاص بك — نحتاج فقط لتأكيد البريد.
                </div>
              </div>
            </VCol>
          </template>

          <VCol
            cols="12"
            sm="6"
          >
            <VSelect
              v-model="form.gender"
              :items="[
                { title: 'ذكر', value: 'male' },
                { title: 'أنثى', value: 'female' },
              ]"
              label="الجنس *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-genderless-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.birthDate"
              type="date"
              label="تاريخ الميلاد *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-calendar-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.city"
              label="المدينة *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-map-pin-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.area"
              label="المنطقة *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-map-pin-2-line"
            />
          </VCol>
        </VRow>
      </section>

      <!-- ============ Step 2: Teaching info ============ -->
      <section
        v-show="currentStep === 1"
        class="step-section"
      >
        <VAlert
          v-if="catalogError"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ catalogError }}
        </VAlert>

        <VRow dense>
          <VCol cols="12">
            <VSelect
              v-model="form.subject"
              :items="subjectOptions"
              :loading="catalogLoading"
              label="المادة التي تُدرّسها *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-book-2-line"
            />
          </VCol>
          <VCol
            v-if="form.subject === OTHER_LABEL"
            cols="12"
          >
            <VTextField
              v-model="form.customSubject"
              label="حدّد المادة *"
              variant="outlined"
              density="comfortable"
            />
          </VCol>

          <VCol cols="12">
            <VSelect
              v-model="form.gradeIds"
              :items="gradeOptions"
              :loading="catalogLoading"
              label="المراحل الدراسية التي تُدرّسها *"
              hint="يمكنك اختيار أكثر من مرحلة"
              persistent-hint
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-graduation-cap-line"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model.number="form.yearsOfExperience"
              type="number"
              min="0"
              label="سنوات الخبرة *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-medal-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model.number="form.estimatedStudentCount"
              type="number"
              min="0"
              label="عدد الطلاب المتوقّع"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-group-line"
            />
          </VCol>
          <VCol cols="12">
            <VTextField
              v-model="form.currentWorkplace"
              label="مكان العمل الحالي (اختياري)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-building-line"
            />
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="form.hasPhysicalCourses"
              label="أُقدّم كورسات حضورية"
              color="primary"
              inset
              density="compact"
              hide-details
            />
          </VCol>
        </VRow>
      </section>

      <!-- ============ Step 3: Profile ============ -->
      <section
        v-show="currentStep === 2"
        class="step-section"
      >
        <VRow dense>
          <VCol cols="12">
            <VTextarea
              v-model="form.bio"
              label="نبذة عنك (اختياري)"
              rows="3"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-file-text-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.facebookUrl"
              label="Facebook (اختياري)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-facebook-circle-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.instagramUrl"
              label="Instagram (اختياري)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-instagram-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.telegramUrl"
              label="Telegram (اختياري)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-telegram-line"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <VTextField
              v-model="form.tiktokUrl"
              label="TikTok (اختياري)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-tiktok-line"
            />
          </VCol>
          <VCol cols="12">
            <VTextField
              v-model="form.youtubeUrl"
              label="YouTube (اختياري)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-youtube-line"
            />
          </VCol>
        </VRow>
      </section>

      <!-- ============ Step 4: Uploads ============ -->
      <section
        v-show="currentStep === 3"
        class="step-section"
      >
        <p class="upload-note">
          كل المرفقات اختيارية لكنّها تُسرّع المراجعة. الصور تُتحقّق على
          الخادم بنمط magic-byte. حد الفيديو 50 ميجابايت (MP4).
        </p>
        <div class="upload-grid">
          <div
            v-for="slot in FILE_KINDS"
            :key="slot.kind"
            class="upload-row"
          >
            <div class="upload-meta">
              <div class="upload-title">
                {{ slot.label }}
              </div>
              <div class="upload-hint">
                {{ slot.hint }}
              </div>
              <div
                v-if="fileError[slot.kind]"
                class="upload-err"
              >
                {{ fileError[slot.kind] }}
              </div>
            </div>
            <div class="upload-actions">
              <template v-if="!pickedFiles[slot.kind]">
                <input
                  :id="`file-${slot.kind}`"
                  type="file"
                  :accept="slot.accept"
                  class="hidden-input"
                  @change="(e) => pickFile(slot.kind, e)"
                >
                <VBtn
                  size="small"
                  variant="tonal"
                  @click="clickFileInput(slot.kind)"
                >
                  <VIcon
                    start
                    icon="ri-attachment-line"
                  /> إرفاق
                </VBtn>
              </template>
              <template v-else>
                <div class="picked-name">
                  {{ pickedFiles[slot.kind].name }}
                </div>
                <VProgressLinear
                  v-if="submitting && fileProgress[slot.kind] !== undefined"
                  :model-value="fileProgress[slot.kind] || 0"
                  color="primary"
                  height="4"
                  rounded
                />
                <VBtn
                  v-if="!submitting"
                  size="small"
                  variant="text"
                  color="error"
                  @click="dropFile(slot.kind)"
                >
                  إلغاء
                </VBtn>
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ Footer / nav ============ -->
      <VAlert
        v-if="submitError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        {{ submitError }}
      </VAlert>

      <div class="form-nav">
        <VBtn
          v-if="currentStep > 0"
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
          v-if="currentStep < stepCount - 1"
          color="primary"
          size="large"
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
          color="primary"
          size="large"
          :loading="submitting"
          @click="submit"
        >
          <VIcon
            start
            icon="ri-send-plane-line"
          />
          إرسال الطلب
        </VBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apply-form-wrap {
  min-height: 100dvh;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(11,37,69,0.06), transparent 60%),
    linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
  padding: 24px 16px 48px;
  position: relative;
}
.back-link {
  position: absolute;
  inset-inline-start: 16px;
  inset-block-start: 16px;
  display: inline-flex;
  width: 40px; height: 40px;
  align-items: center; justify-content: center;
  border-radius: 999px;
  background: #fff;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}
.apply-form-shell {
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
  border: 1px solid rgba(11,37,69,.05);
}
.form-header { text-align: center; margin-bottom: 18px; }
.form-heading { margin: 0; font-size: 22px; font-weight: 800; color: #0B2545; }
.form-sub { margin: 6px 0 0; color: #4b5563; font-size: 13px; }
.step-section { margin-top: 14px; }
.auth-toggle { margin-bottom: 12px; }
.toggle-label { font-size: 13px; color: #4b5563; margin-bottom: 6px; font-weight: 600; }
.toggle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.toggle-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(11,37,69,.15);
  background: #fafbff;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
  transition: background-color .15s, border-color .15s;
}
.toggle-btn.active {
  background: rgb(var(--v-theme-primary));
  color: #fff;
  border-color: rgb(var(--v-theme-primary));
}
.google-connect {
  border: 1px solid rgba(11,37,69,.15);
  border-radius: 10px;
  background: #fafbff;
  padding: 12px;
}
.google-connect.connected {
  border-color: rgba(34,197,94,.4);
  background: rgba(34,197,94,.04);
}
.google-connect-head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}
.google-btn-host { min-height: 44px; display: flex; justify-content: center; }
.google-fine { margin-top: 6px; font-size: 11px; color: #6b7280; }

.upload-note { color: #4b5563; font-size: 13px; margin-bottom: 10px; }
.upload-grid { display: grid; gap: 10px; }
.upload-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(11,37,69,.08);
  border-radius: 10px;
  background: #fafbff;
}
.upload-title { font-weight: 700; color: #0B2545; }
.upload-hint { font-size: 12px; color: #6b7280; }
.upload-err { font-size: 12px; color: rgb(var(--v-theme-error)); margin-top: 4px; }
.upload-actions {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  min-width: 220px;
}
.picked-name {
  font-size: 12px; color: #1f2937;
  max-width: 220px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hidden-input { display: none; }

.form-nav {
  margin-top: 24px;
  display: flex; align-items: center;
}
</style>
