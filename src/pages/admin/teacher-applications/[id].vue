<script setup>
// Teacher Application — detail view (Phase 5).
//
// Renders every field on the application, the attached files (with secure
// preview), and the three action buttons:
//   - approve              → optional admin notes
//   - reject               → required rejection reason + optional notes
//   - request more info    → required admin notes
//
// File preview uses the auth-gated streaming endpoint. Since <img>/<iframe>
// tags can't carry an Authorization header, we fetch through axiosInstance
// (which DOES attach the JWT) and turn the response into an object URL.
// That URL is created on demand and revoked on unmount / view-close so we
// don't leak memory or expose blobs longer than needed.

import Admin from '@/api/admin/admin_api.js'
import axiosInstance from '@/utils/axios.js'

const router = useRouter()
const route = useRoute()
const id = computed(() => route.params.id)

const application = ref(null)
const files = ref([])
const loading = ref(false)
const errorMessage = ref('')

const breadcrumbItems = computed(() => [
  { title: 'الرئيسية',            to: '/admin/dashboard',           disabled: false },
  { title: 'طلبات الانضمام',      to: '/admin/teacher-applications', disabled: false },
  { title: application.value?.fullName || 'تفاصيل الطلب',           disabled: true },
])

const STATUS_META = {
  pending: { label: 'بانتظار المراجعة', color: 'warning', icon: 'ri-time-line' },
  needs_more_info: { label: 'معلومات إضافية',   color: 'info',    icon: 'ri-question-line' },
  approved: { label: 'مقبولة',           color: 'success', icon: 'ri-check-double-line' },
  rejected: { label: 'مرفوضة',           color: 'error',   icon: 'ri-close-circle-line' },
}

const FILE_KIND_LABEL = {
  profile_image: 'الصورة الشخصية',
  certificate_image: 'شهادة التدريس',
  national_id_image: 'الهوية الوطنية',
  optional_attachment: 'مرفق إضافي',
  intro_video: 'فيديو تعريفي',
}

async function loadAll () {
  loading.value = true
  errorMessage.value = ''
  try {
    const [appRes, filesRes] = await Promise.all([
      Admin.getTeacherApplication(id.value),
      Admin.listTeacherApplicationFiles(id.value),
    ])

    application.value = appRes?.data?.data || null
    files.value = filesRes?.data?.data || []
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || err?.message || 'تعذر تحميل تفاصيل الطلب'
  } finally {
    loading.value = false
  }
}

function fmtDate (iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ar-IQ', { dateStyle: 'long', timeStyle: 'short' }) }
  catch { return iso }
}
function fmtSize (bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} ب`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`
  
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
}

const status = computed(() => application.value?.applicationStatus)
const statusMeta = computed(() => STATUS_META[status.value] || STATUS_META.pending)
const isActionable = computed(() => status.value === 'pending' || status.value === 'needs_more_info')

// -- File preview -------------------------------------------------------------

const previewState = reactive({
  open: false,
  fileId: null,
  mimeType: '',
  filename: '',
  objectUrl: '',
  loading: false,
  errorMessage: '',
})

async function openPreview (file) {
  // Revoke any previous object URL before fetching a new one.
  if (previewState.objectUrl) {
    URL.revokeObjectURL(previewState.objectUrl)
    previewState.objectUrl = ''
  }
  previewState.fileId = file.id
  previewState.mimeType = file.mimeType
  previewState.filename = file.originalFilename || 'file'
  previewState.open = true
  previewState.loading = true
  previewState.errorMessage = ''

  try {
    const url = Admin.teacherApplicationFileUrl(id.value, file.id)
    const res = await axiosInstance.get(url, { responseType: 'blob' })

    previewState.objectUrl = URL.createObjectURL(res.data)
  } catch (err) {
    previewState.errorMessage =
      err?.response?.data?.message || err?.message || 'تعذر تحميل الملف'
  } finally {
    previewState.loading = false
  }
}

function closePreview () {
  previewState.open = false
  if (previewState.objectUrl) {
    URL.revokeObjectURL(previewState.objectUrl)
    previewState.objectUrl = ''
  }
}

onBeforeUnmount(() => {
  if (previewState.objectUrl) URL.revokeObjectURL(previewState.objectUrl)
})

// -- Action modals (approve / reject / more-info) -----------------------------

const approveModal = reactive({ open: false, adminNotes: '', submitting: false, error: '' })
const rejectModal  = reactive({ open: false, rejectionReason: '', adminNotes: '', submitting: false, error: '' })
const infoModal    = reactive({ open: false, adminNotes: '', submitting: false, error: '' })

const alertState = reactive({ open: false, type: 'success', message: '' })
function showAlert (type, message) { alertState.type = type; alertState.message = message; alertState.open = true }

async function submitApprove () {
  approveModal.submitting = true; approveModal.error = ''
  try {
    await Admin.approveTeacherApplication(id.value, { adminNotes: approveModal.adminNotes?.trim() || undefined })
    approveModal.open = false
    approveModal.adminNotes = ''
    showAlert('success', 'تمت الموافقة على الطلب وتفعيل حساب المعلم')
    await loadAll()
  } catch (err) {
    approveModal.error = err?.response?.data?.message || err?.message || 'تعذر إكمال الموافقة'
  } finally {
    approveModal.submitting = false
  }
}

async function submitReject () {
  if (!rejectModal.rejectionReason || rejectModal.rejectionReason.trim().length < 5) {
    rejectModal.error = 'سبب الرفض مطلوب (5 أحرف على الأقل)'
    
    return
  }
  rejectModal.submitting = true; rejectModal.error = ''
  try {
    await Admin.rejectTeacherApplication(id.value, {
      rejectionReason: rejectModal.rejectionReason.trim(),
      adminNotes: rejectModal.adminNotes?.trim() || undefined,
    })
    rejectModal.open = false
    rejectModal.rejectionReason = ''
    rejectModal.adminNotes = ''
    showAlert('success', 'تم رفض الطلب')
    await loadAll()
  } catch (err) {
    rejectModal.error = err?.response?.data?.message || err?.message || 'تعذر إكمال الرفض'
  } finally {
    rejectModal.submitting = false
  }
}

async function submitMoreInfo () {
  if (!infoModal.adminNotes || infoModal.adminNotes.trim().length < 5) {
    infoModal.error = 'يرجى تحديد المعلومات المطلوبة (5 أحرف على الأقل)'
    
    return
  }
  infoModal.submitting = true; infoModal.error = ''
  try {
    await Admin.requestMoreInfoTeacherApplication(id.value, { adminNotes: infoModal.adminNotes.trim() })
    infoModal.open = false
    infoModal.adminNotes = ''
    showAlert('success', 'تم تحويل الطلب إلى بانتظار معلومات إضافية')
    await loadAll()
  } catch (err) {
    infoModal.error = err?.response?.data?.message || err?.message || 'تعذر تحويل الحالة'
  } finally {
    infoModal.submitting = false
  }
}

onMounted(loadAll)
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Loading -->
    <div
      v-if="loading && !application"
      class="my-4"
    >
      <VSkeletonLoader type="article" />
      <VSkeletonLoader
        type="article"
        class="mt-4"
      />
    </div>

    <!-- Error -->
    <VAlert
      v-else-if="errorMessage && !application"
      type="error"
      variant="tonal"
      class="my-4"
    >
      {{ errorMessage }}
    </VAlert>

    <!-- Detail -->
    <template v-else-if="application">
      <!-- Header card -->
      <VCard
        class="my-4"
        elevation="3"
        rounded="lg"
      >
        <VCardItem>
          <VRow align="center">
            <VCol
              cols="12"
              md="auto"
            >
              <VAvatar
                size="64"
                color="primary"
                variant="tonal"
              >
                <VIcon
                  icon="ri-user-line"
                  size="32"
                />
              </VAvatar>
            </VCol>
            <VCol>
              <div class="text-h5 font-weight-bold">
                {{ application.fullName }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                {{ application.subject }} — {{ application.teachingStage }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                تاريخ التقديم: {{ fmtDate(application.createdAt) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="auto"
            >
              <VChip
                :color="statusMeta.color"
                variant="elevated"
                size="large"
                :prepend-icon="statusMeta.icon"
              >
                {{ statusMeta.label }}
              </VChip>
            </VCol>
          </VRow>
        </VCardItem>

        <VDivider v-if="isActionable" />

        <VCardActions
          v-if="isActionable"
          class="px-4 py-3 d-flex flex-wrap ga-2"
        >
          <VBtn
            color="success"
            variant="flat"
            prepend-icon="ri-check-line"
            @click="approveModal.open = true"
          >
            موافقة
          </VBtn>
          <VBtn
            color="info"
            variant="tonal"
            prepend-icon="ri-question-line"
            @click="infoModal.open = true"
          >
            طلب معلومات إضافية
          </VBtn>
          <VBtn
            color="error"
            variant="tonal"
            prepend-icon="ri-close-line"
            @click="rejectModal.open = true"
          >
            رفض
          </VBtn>
        </VCardActions>
      </VCard>

      <!-- Decision history -->
      <VCard
        v-if="application.approvedAt || application.rejectedAt || application.needsMoreInfoAt"
        class="mb-4"
        elevation="2"
        rounded="lg"
      >
        <VCardTitle class="text-subtitle-1">
          سجل القرارات
        </VCardTitle>
        <VDivider />
        <VCardItem>
          <div
            v-if="application.approvedAt"
            class="d-flex align-center mb-2"
          >
            <VIcon
              icon="ri-check-double-line"
              color="success"
              class="me-2"
            />
            <span>تمت الموافقة: {{ fmtDate(application.approvedAt) }}</span>
          </div>
          <div
            v-if="application.rejectedAt"
            class="d-flex align-center mb-2"
          >
            <VIcon
              icon="ri-close-circle-line"
              color="error"
              class="me-2"
            />
            <span>تم الرفض: {{ fmtDate(application.rejectedAt) }}</span>
          </div>
          <div
            v-if="application.needsMoreInfoAt"
            class="d-flex align-center mb-2"
          >
            <VIcon
              icon="ri-question-line"
              color="info"
              class="me-2"
            />
            <span>طُلبت معلومات إضافية: {{ fmtDate(application.needsMoreInfoAt) }}</span>
          </div>
          <VAlert
            v-if="application.rejectionReason"
            type="error"
            variant="tonal"
            class="mt-3"
            density="compact"
          >
            <div class="font-weight-bold mb-1">
              سبب الرفض المُبلَّغ للمتقدّم:
            </div>
            <div style="white-space: pre-wrap">
              {{ application.rejectionReason }}
            </div>
          </VAlert>
          <VAlert
            v-if="application.adminNotes"
            type="info"
            variant="tonal"
            class="mt-3"
            density="compact"
          >
            <div class="font-weight-bold mb-1">
              ملاحظات الإدارة:
            </div>
            <div style="white-space: pre-wrap">
              {{ application.adminNotes }}
            </div>
          </VAlert>
        </VCardItem>
      </VCard>

      <!-- Fields card -->
      <VCard
        class="mb-4"
        elevation="2"
        rounded="lg"
      >
        <VCardTitle class="text-subtitle-1">
          المعلومات الكاملة
        </VCardTitle>
        <VDivider />
        <VCardItem>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <b>البريد الإلكتروني:</b> <span dir="ltr">{{ application.email }}</span>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>الهاتف:</b> <span dir="ltr">{{ application.phone }}</span>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>الجنس:</b> {{ application.gender === 'male' ? 'ذكر' : 'أنثى' }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>تاريخ الميلاد:</b> {{ fmtDate(application.birthDate) }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>المدينة:</b> {{ application.city }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>المنطقة:</b> {{ application.area }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>المادة:</b> {{ application.subject }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>المرحلة:</b> {{ application.teachingStage }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>سنوات الخبرة:</b> {{ application.yearsOfExperience }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>عدد الطلاب المتوقَّع:</b> {{ application.estimatedStudentCount }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>مكان العمل الحالي:</b> {{ application.currentWorkplace || '—' }}
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <b>كورسات حضورية:</b> {{ application.hasPhysicalCourses ? 'نعم' : 'لا' }}
            </VCol>
            <VCol cols="12">
              <b>النبذة:</b><div
                class="mt-1"
                style="white-space: pre-wrap"
              >
                {{ application.bio || '—' }}
              </div>
            </VCol>
            <VCol
              v-if="application.facebookUrl || application.instagramUrl || application.telegramUrl || application.tiktokUrl || application.youtubeUrl"
              cols="12"
            >
              <b>الروابط الاجتماعية:</b>
              <div class="d-flex flex-wrap ga-2 mt-2">
                <VChip
                  v-if="application.facebookUrl"
                  prepend-icon="ri-facebook-circle-line"
                  :href="application.facebookUrl"
                  target="_blank"
                  variant="outlined"
                >
                  Facebook
                </VChip>
                <VChip
                  v-if="application.instagramUrl"
                  prepend-icon="ri-instagram-line"
                  :href="application.instagramUrl"
                  target="_blank"
                  variant="outlined"
                >
                  Instagram
                </VChip>
                <VChip
                  v-if="application.telegramUrl"
                  prepend-icon="ri-telegram-line"
                  :href="application.telegramUrl"
                  target="_blank"
                  variant="outlined"
                >
                  Telegram
                </VChip>
                <VChip
                  v-if="application.tiktokUrl"
                  prepend-icon="ri-tiktok-line"
                  :href="application.tiktokUrl"
                  target="_blank"
                  variant="outlined"
                >
                  TikTok
                </VChip>
                <VChip
                  v-if="application.youtubeUrl"
                  prepend-icon="ri-youtube-line"
                  :href="application.youtubeUrl"
                  target="_blank"
                  variant="outlined"
                >
                  YouTube
                </VChip>
              </div>
            </VCol>
          </VRow>
        </VCardItem>
      </VCard>

      <!-- Files card -->
      <VCard
        class="mb-4"
        elevation="2"
        rounded="lg"
      >
        <VCardTitle class="text-subtitle-1">
          المرفقات
          <VChip
            class="ms-2"
            size="small"
            color="primary"
          >
            {{ files.length }}
          </VChip>
        </VCardTitle>
        <VDivider />
        <VCardItem>
          <div
            v-if="!files.length"
            class="text-medium-emphasis text-center py-6"
          >
            لم يرفق المتقدّم أيّ ملفات بعد.
          </div>
          <VRow v-else>
            <VCol
              v-for="f in files"
              :key="f.id"
              cols="12"
              md="6"
              lg="4"
            >
              <VCard
                variant="outlined"
                class="pa-3 h-100"
              >
                <div class="d-flex align-center mb-2">
                  <VIcon
                    :icon="f.mimeType.startsWith('image/') ? 'ri-image-line' : f.mimeType === 'application/pdf' ? 'ri-file-pdf-line' : 'ri-video-line'"
                    color="primary"
                    class="me-2"
                  />
                  <div class="text-subtitle-2 font-weight-bold">
                    {{ FILE_KIND_LABEL[f.kind] || f.kind }}
                  </div>
                </div>
                <div
                  class="text-caption text-medium-emphasis mb-1"
                  dir="ltr"
                >
                  {{ f.originalFilename || '—' }}
                </div>
                <div class="text-caption text-medium-emphasis mb-3">
                  {{ f.mimeType }} · {{ fmtSize(f.byteSize) }}
                </div>
                <VBtn
                  color="primary"
                  variant="tonal"
                  size="small"
                  block
                  prepend-icon="ri-eye-line"
                  @click="openPreview(f)"
                >
                  معاينة الملف
                </VBtn>
              </VCard>
            </VCol>
          </VRow>
        </VCardItem>
      </VCard>
    </template>

    <!-- Preview modal -->
    <VDialog
      v-model="previewState.open"
      max-width="900"
      @update:model-value="(v) => { if (!v) closePreview() }"
    >
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center">
          <VIcon
            icon="ri-file-line"
            class="me-2"
          />
          <span dir="ltr">{{ previewState.filename }}</span>
          <VSpacer />
          <VBtn
            icon="ri-close-line"
            variant="text"
            @click="closePreview"
          />
        </VCardTitle>
        <VDivider />
        <VCardItem
          class="text-center"
          style="min-height: 320px"
        >
          <VProgressCircular
            v-if="previewState.loading"
            indeterminate
            color="primary"
            size="48"
          />
          <VAlert
            v-else-if="previewState.errorMessage"
            type="error"
            variant="tonal"
          >
            {{ previewState.errorMessage }}
          </VAlert>
          <template v-else-if="previewState.objectUrl">
            <img
              v-if="previewState.mimeType.startsWith('image/')"
              :src="previewState.objectUrl"
              alt="preview"
              style="max-width: 100%; max-height: 75vh; object-fit: contain"
            >
            <iframe
              v-else-if="previewState.mimeType === 'application/pdf'"
              :src="previewState.objectUrl"
              style="width: 100%; height: 70vh; border: none"
              title="PDF preview"
            />
            <video
              v-else-if="previewState.mimeType.startsWith('video/')"
              :src="previewState.objectUrl"
              controls
              playsinline
              style="max-width: 100%; max-height: 75vh"
            />
            <a
              v-else
              :href="previewState.objectUrl"
              :download="previewState.filename"
              class="text-primary"
            >تحميل الملف</a>
          </template>
        </VCardItem>
      </VCard>
    </VDialog>

    <!-- Approve modal -->
    <VDialog
      v-model="approveModal.open"
      max-width="520"
    >
      <VCard rounded="lg">
        <VCardTitle>تأكيد الموافقة</VCardTitle>
        <VDivider />
        <VCardItem>
          <p class="text-body-2 mb-3">
            ستُنشأ هذه العملية حساب معلم فعّال للمتقدّم، وسيتمكّن من تسجيل الدخول فوراً بإيميله وكلمة المرور.
          </p>
          <VTextarea
            v-model="approveModal.adminNotes"
            label="ملاحظات داخلية (اختيارية — لن تظهر للمتقدّم)"
            variant="outlined"
            rows="3"
            counter="2000"
          />
          <VAlert
            v-if="approveModal.error"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            {{ approveModal.error }}
          </VAlert>
        </VCardItem>
        <VDivider />
        <VCardActions class="justify-end">
          <VBtn
            variant="text"
            @click="approveModal.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="success"
            variant="flat"
            :loading="approveModal.submitting"
            @click="submitApprove"
          >
            تأكيد الموافقة
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Reject modal -->
    <VDialog
      v-model="rejectModal.open"
      max-width="520"
    >
      <VCard rounded="lg">
        <VCardTitle>رفض الطلب</VCardTitle>
        <VDivider />
        <VCardItem>
          <VTextarea
            v-model="rejectModal.rejectionReason"
            label="سبب الرفض (سيظهر للمتقدّم)"
            variant="outlined"
            rows="3"
            counter="2000"
            required
            :rules="[v => (v && v.trim().length >= 5) || 'يجب 5 أحرف على الأقل']"
          />
          <VTextarea
            v-model="rejectModal.adminNotes"
            label="ملاحظات داخلية (اختيارية)"
            variant="outlined"
            rows="2"
            counter="2000"
            class="mt-2"
          />
          <VAlert
            v-if="rejectModal.error"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            {{ rejectModal.error }}
          </VAlert>
        </VCardItem>
        <VDivider />
        <VCardActions class="justify-end">
          <VBtn
            variant="text"
            @click="rejectModal.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="error"
            variant="flat"
            :loading="rejectModal.submitting"
            @click="submitReject"
          >
            تأكيد الرفض
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Request-more-info modal -->
    <VDialog
      v-model="infoModal.open"
      max-width="520"
    >
      <VCard rounded="lg">
        <VCardTitle>طلب معلومات إضافية</VCardTitle>
        <VDivider />
        <VCardItem>
          <VTextarea
            v-model="infoModal.adminNotes"
            label="حدّد المعلومات أو المستندات المطلوبة (سيرى المتقدّم هذه الملاحظة)"
            variant="outlined"
            rows="4"
            counter="2000"
            required
          />
          <VAlert
            v-if="infoModal.error"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            {{ infoModal.error }}
          </VAlert>
        </VCardItem>
        <VDivider />
        <VCardActions class="justify-end">
          <VBtn
            variant="text"
            @click="infoModal.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="info"
            variant="flat"
            :loading="infoModal.submitting"
            @click="submitMoreInfo"
          >
            إرسال
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Toast / alert -->
    <VSnackbar
      v-model="alertState.open"
      :color="alertState.type"
      location="top center"
      timeout="3500"
    >
      {{ alertState.message }}
    </VSnackbar>
  </div>
</template>
