<script setup>
// Teacher intro videos — super-admin moderation queue.
// Tabs: awaiting_review / approved / rejected / failed.
// Row actions: preview HLS, approve, reject (with notes).

import Admin from '@/api/admin/admin_api.js'
import { formatLocaleDateTime12 } from '@/utils/time-format'

const router = useRouter()
const route = useRoute()

const STATUSES = [
  { value: 'queue', label: 'صندوق الانتظار', color: 'primary', icon: 'ri-inbox-line' },
  { value: 'awaiting_review', label: 'جاهز للمراجعة', color: 'warning', icon: 'ri-time-line' },
  { value: 'in_progress', label: 'قيد المعالجة', color: 'info', icon: 'ri-loader-2-line' },
  { value: 'approved', label: 'معتمد', color: 'success', icon: 'ri-check-double-line' },
  { value: 'rejected', label: 'مرفوض', color: 'error', icon: 'ri-close-circle-line' },
  { value: 'failed', label: 'فشل', color: 'secondary', icon: 'ri-error-warning-line' },
]

const activeStatus = ref(route.query.status || 'queue')
const search = ref(route.query.search || '')
const page = ref(Number(route.query.page) || 1)
const limit = ref(20)

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const previewOpen = ref(false)
const previewItem = ref(null)
const previewVideoRef = ref(null)
let hlsInstance = null

const rejectOpen = ref(false)
const rejectTarget = ref(null)
const rejectNotes = ref('')
const actionLoading = ref(false)
const actionError = ref('')

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'الفيديوهات التعريفية', disabled: true },
]

const headers = [
  { title: 'الأستاذ', key: 'teacherName', sortable: false },
  { title: 'البريد', key: 'teacherEmail', sortable: false },
  { title: 'المدة', key: 'durationSeconds', sortable: false, align: 'center' },
  { title: 'الحالة', key: 'status', sortable: false, align: 'center' },
  { title: 'آخر تحديث', key: 'updatedAt', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'center' },
]

function statusMeta(value) {
  const extras = {
    pending: { label: 'بانتظار الرفع', color: 'secondary', icon: 'ri-time-line' },
    uploaded: { label: 'تم الرفع', color: 'info', icon: 'ri-upload-line' },
    processing: { label: 'قيد المعالجة', color: 'info', icon: 'ri-loader-2-line' },
    ready: { label: 'جاهز (قديم)', color: 'warning', icon: 'ri-checkbox-circle-line' },
  }
  return STATUSES.find(s => s.value === value)
    || extras[value]
    || { label: value || '—', color: 'default', icon: 'ri-question-line' }
}

function fmtDate(iso) {
  return formatLocaleDateTime12(iso) || '—'
}

async function fetchPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.listIntroVideos({
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
      err?.response?.data?.message || err?.message || 'تعذر تحميل القائمة'
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function syncRouteQuery() {
  router.replace({
    query: {
      ...route.query,
      status: activeStatus.value,
      search: search.value || undefined,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  })
}

function onTabChange(newStatus) {
  activeStatus.value = newStatus
  page.value = 1
  syncRouteQuery()
  fetchPage()
}

function onSearchSubmit() {
  page.value = 1
  syncRouteQuery()
  fetchPage()
}

function onPageChange(newPage) {
  page.value = newPage
  syncRouteQuery()
  fetchPage()
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

async function destroyHls() {
  if (hlsInstance) {
    try { hlsInstance.destroy() } catch { /* ignore */ }
    hlsInstance = null
  }
  const video = previewVideoRef.value
  if (video) {
    video.removeAttribute('src')
    video.load()
  }
}

async function openPreview(item) {
  previewItem.value = item
  previewOpen.value = true
  await nextTick()
  await destroyHls()
  const url = item?.manifestUrl
  const video = previewVideoRef.value
  if (!url || !video) return

  const isM3u8 = String(url).includes('.m3u8')
  if (!isM3u8) {
    video.src = url
    return
  }
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
    return
  }
  try {
    const mod = await import('hls.js')
    const Hls = mod.default || mod
    if (Hls && Hls.isSupported()) {
      hlsInstance = new Hls()
      hlsInstance.loadSource(url)
      hlsInstance.attachMedia(video)
    }
  } catch (err) {
    console.error('[intro-videos] HLS preview error', err)
  }
}

watch(previewOpen, async open => {
  if (!open) await destroyHls()
})

async function approve(item) {
  actionLoading.value = true
  actionError.value = ''
  try {
    await Admin.approveIntroVideo(item.teacherId)
    await fetchPage()
  } catch (err) {
    actionError.value =
      err?.response?.data?.message || err?.message || 'تعذر الموافقة'
  } finally {
    actionLoading.value = false
  }
}

async function syncFromBunny(item) {
  actionLoading.value = true
  actionError.value = ''
  try {
    const res = await Admin.syncIntroVideo(item.teacherId)
    const status = res?.data?.data?.introVideo?.status || res?.data?.data?.bunnyStatus
    if (status && !['awaiting_review', 'ready'].includes(status)) {
      actionError.value = `تمت المزامنة — الحالة الحالية: ${status}. إن كان الفيديو جاهزاً على Bunny وما زال معلقاً، تأكد من تشغيل migration 061.`
    }
    await fetchPage()
  } catch (err) {
    actionError.value =
      err?.response?.data?.message || err?.message || 'تعذرت المزامنة من Bunny'
  } finally {
    actionLoading.value = false
  }
}

function openReject(item) {
  rejectTarget.value = item
  rejectNotes.value = ''
  actionError.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  if (!rejectTarget.value) return
  const notes = rejectNotes.value.trim()
  if (!notes) {
    actionError.value = 'ملاحظة الرفض مطلوبة'
    return
  }
  actionLoading.value = true
  actionError.value = ''
  try {
    await Admin.rejectIntroVideo(rejectTarget.value.teacherId, { notes })
    rejectOpen.value = false
    await fetchPage()
  } catch (err) {
    actionError.value =
      err?.response?.data?.message || err?.message || 'تعذر الرفض'
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.userType !== 'super_admin' && user?.user_type !== 'super_admin') {
      router.push('/login')
      return
    }
  } catch {
    router.push('/login')
    return
  }
  fetchPage()
})

onBeforeUnmount(() => {
  destroyHls()
})

definePage({
  meta: { layout: 'default' },
})
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
          <h2 class="text-h5 ma-0">
            الفيديوهات التعريفية للأساتذة
          </h2>
          <VSpacer />
          <VChip
            variant="tonal"
            color="info"
            size="small"
          >
            {{ total }} فيديو
          </VChip>
        </div>

        <VTabs
          v-model="activeStatus"
          color="primary"
          class="mb-4"
          @update:model-value="onTabChange"
        >
          <VTab
            v-for="s in STATUSES"
            :key="s.value"
            :value="s.value"
          >
            <VIcon
              :icon="s.icon"
              start
              size="18"
            />
            {{ s.label }}
          </VTab>
        </VTabs>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <VTextField
            v-model="search"
            density="compact"
            hide-details
            placeholder="بحث بالاسم أو البريد…"
            style="max-inline-size: 280px;"
            @keyup.enter="onSearchSubmit"
          />
          <VBtn
            color="primary"
            @click="onSearchSubmit"
          >
            بحث
          </VBtn>
        </div>

        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-3"
        >
          {{ errorMessage }}
        </VAlert>
        <VAlert
          v-if="actionError"
          type="error"
          variant="tonal"
          class="mb-3"
        >
          {{ actionError }}
        </VAlert>

        <VDataTableServer
          :headers="headers"
          :items="items"
          :items-length="total"
          :loading="loading"
          :page="page"
          :items-per-page="limit"
          item-value="teacherId"
          class="text-no-wrap"
          @update:page="onPageChange"
        >
          <template #item.teacherName="{ item }">
            <div class="font-weight-medium">
              {{ item.teacherName || '—' }}
            </div>
          </template>

          <template #item.durationSeconds="{ item }">
            {{ item.durationSeconds != null ? `${item.durationSeconds} ث` : '—' }}
          </template>

          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="statusMeta(item.status).color"
              variant="tonal"
            >
              {{ statusMeta(item.status).label }}
            </VChip>
          </template>

          <template #item.updatedAt="{ item }">
            {{ fmtDate(item.updatedAt) }}
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-1 justify-center">
              <VBtn
                icon
                size="small"
                variant="text"
                :disabled="actionLoading"
                @click="syncFromBunny(item)"
              >
                <VIcon icon="ri-refresh-line" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  مزامنة من Bunny
                </VTooltip>
              </VBtn>
              <VBtn
                icon
                size="small"
                variant="text"
                :disabled="!item.manifestUrl"
                @click="openPreview(item)"
              >
                <VIcon icon="ri-play-circle-line" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  معاينة
                </VTooltip>
              </VBtn>
              <VBtn
                icon
                size="small"
                variant="text"
                color="success"
                :disabled="!['awaiting_review','ready'].includes(item.status) || actionLoading"
                @click="approve(item)"
              >
                <VIcon icon="ri-check-line" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  موافقة
                </VTooltip>
              </VBtn>
              <VBtn
                icon
                size="small"
                variant="text"
                color="error"
                :disabled="!['awaiting_review','ready'].includes(item.status) || actionLoading"
                @click="openReject(item)"
              >
                <VIcon icon="ri-close-line" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  رفض
                </VTooltip>
              </VBtn>
            </div>
          </template>

          <template #bottom>
            <div class="d-flex justify-center py-3">
              <VPagination
                v-model="page"
                :length="pageCount"
                :total-visible="5"
                @update:model-value="onPageChange"
              />
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <VDialog
      v-model="previewOpen"
      max-width="720"
    >
      <VCard>
        <VCardTitle class="d-flex align-center">
          معاينة — {{ previewItem?.teacherName || '' }}
          <VSpacer />
          <VBtn
            icon
            variant="text"
            @click="previewOpen = false"
          >
            <VIcon icon="ri-close-line" />
          </VBtn>
        </VCardTitle>
        <VCardText>
          <video
            ref="previewVideoRef"
            controls
            playsinline
            style="width: 100%; max-height: 70vh; background: #000; border-radius: 8px;"
          />
        </VCardText>
      </VCard>
    </VDialog>

    <VDialog
      v-model="rejectOpen"
      max-width="480"
    >
      <VCard>
        <VCardTitle>رفض الفيديو التعريفي</VCardTitle>
        <VCardText>
          <VTextarea
            v-model="rejectNotes"
            label="سبب الرفض *"
            rows="3"
            auto-grow
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="rejectOpen = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="error"
            :loading="actionLoading"
            @click="confirmReject"
          >
            رفض
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
