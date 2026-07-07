<script setup>
// =====================================================
// Admin Dashboard v2 — control panel for super_admin.
// Wires every existing super_admin endpoint into one view:
//   • Live counts from /super-admin/dashboard/stats
//   • Active academic year (read-only badge)
//   • Notification health snapshot (from /notifications/statistics)
//   • Quick-action grid linking to every admin page
//   • System health pill (from /health)
// =====================================================

import adminApi from "@/api/admin/admin_api"
import { useAuth } from "@/composables/useAuth"
import axiosInstance from "@/utils/axios.js"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const { user, logout, hasPermission } = useAuth()

// ---- Reactive state -------------------------------------------------------
const isLoading = ref(true)
const statsError = ref("")

const stats = ref({
  totalUsers: 0,
  totalTeachers: 0,
  totalStudents: 0,
  activeCourses: 0,
})

const activeYear = ref(null)
const notifStats = ref({ total: 0, sent: 0, pending: 0, failed: 0 })
const adRevenue = ref({ today: 0, month: 0, total: 0 })
const apiHealthy = ref(null)
const apiEnv = ref("")

// ---- Derived --------------------------------------------------------------
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return "ليلة سعيدة"
  if (h < 12) return "صباح الخير"
  if (h < 17) return "مساء النور"
  if (h < 21) return "مساء الخير"
  
  return "ليلة هادئة"
})

const heroStatCards = computed(() => [
  {
    key: "users",
    label: "إجمالي المستخدمين",
    value: stats.value.totalUsers,
    icon: "ri-team-line",
    color: "primary",
    to: "/admin/teachers/show-teachers",
    hint: "كل الحسابات في النظام",
  },
  {
    key: "teachers",
    label: "المعلمون",
    value: stats.value.totalTeachers,
    icon: "ri-presentation-line",
    color: "info",
    to: "/admin/teachers/show-teachers",
    hint: "حسابات المعلمين النشطة",
  },
  {
    key: "students",
    label: "الطلاب",
    value: stats.value.totalStudents,
    icon: "ri-graduation-cap-line",
    color: "success",
    to: null,
    hint: "حسابات الطلاب المُسجَّلة",
  },
  {
    key: "courses",
    label: "الكورسات الفعّالة",
    value: stats.value.activeCourses,
    icon: "ri-book-open-line",
    color: "warning",
    to: null,
    hint: "كورسات لم تنتهِ بعد",
  },
])

const quickActions = [
  {
    title: "إدارة المعلمين",
    sub: "عرض ومراقبة حسابات المعلمين",
    icon: "ri-team-line",
    color: "primary",
    to: "/admin/teachers/show-teachers",
  },
  {
    title: "السنوات الدراسية",
    sub: "تفعيل السنة الحالية وإدارتها",
    icon: "ri-calendar-2-line",
    color: "info",
    to: "/admin/study-years/show-study-years",
  },
  {
    title: "المراحل الدراسية",
    sub: "إضافة وتعديل المراحل",
    icon: "ri-stack-line",
    color: "secondary",
    to: "/admin/grades/show-grades",
  },
  {
    title: "الأخبار والإعلانات",
    sub: "نشر للويب أو الهاتف أو الاثنين",
    icon: "ri-newspaper-line",
    color: "warning",
    to: "/admin/news/show-news",
  },
  {
    title: "الإشعارات",
    sub: "متابعة الإرسال + معالجة المعلّق",
    icon: "ri-notification-3-line",
    color: "error",
    to: "/admin/notifications/show-notifications",
  },
  {
    title: "طلبات الإعلانات",
    sub: "مراجعة إعلانات المعلمين والموافقة",
    icon: "ri-megaphone-line",
    color: "secondary",
    to: "/admin/advertisements",
  },
  {
    title: "إعدادات النظام",
    sub: "رسوم الحجز وإعدادات عامة",
    icon: "ri-settings-3-line",
    color: "primary",
    to: "/admin/settings",
  },
]

// ---- Lifecycle ------------------------------------------------------------
const fetchAll = async () => {
  isLoading.value = true
  statsError.value = ""
  await Promise.all([loadStats(), loadActiveYear(), loadNotifStats(), loadAdRevenue(), loadHealth()])
  isLoading.value = false
}

const loadStats = async () => {
  try {
    const res = await adminApi.getDashboardStats()
    const data = res?.data?.data || {}

    stats.value = {
      totalUsers: Number(data.totalUsers) || 0,
      totalTeachers: Number(data.totalTeachers) || 0,
      totalStudents: Number(data.totalStudents) || 0,
      activeCourses: Number(data.activeCourses) || 0,
    }
  } catch (e) {
    statsError.value = e?.response?.data?.message || "تعذّر تحميل إحصائيات النظام"
  }
}

const loadActiveYear = async () => {
  try {
    const res = await adminApi.getActiveAcademicYear()

    activeYear.value = res?.data?.data?.academicYear ?? res?.data?.data ?? null
  } catch {
    activeYear.value = null
  }
}

const loadNotifStats = async () => {
  try {
    const res = await adminApi.getNotificationStatistics()
    const d = res?.data?.data || {}

    notifStats.value = {
      total: Number(d.total) || 0,
      sent: Number(d.sent) || 0,
      pending: Number(d.pending) || 0,
      failed: Number(d.failed) || 0,
    }
  } catch {
    /* silent — notifications stats are nice-to-have */
  }
}

const loadAdRevenue = async () => {
  try {
    const res = await adminApi.getAdvertisementRevenueStats()
    const d = res?.data?.data || {}
    adRevenue.value = {
      today: Number(d.revenueToday ?? d.revenue_today) || 0,
      month: Number(d.revenueMonth ?? d.revenue_month) || 0,
      total: Number(d.revenueTotal ?? d.revenue_total) || 0,
    }
  } catch {
    adRevenue.value = { today: 0, month: 0, total: 0 }
  }
}

const loadHealth = async () => {
  try {
    const baseURL = axiosInstance?.defaults?.baseURL || import.meta.env.VITE_API_BASE_URL || ""
    const origin = baseURL.replace(/\/api\/?$/, "")
    const res = await fetch(`${origin}/health`).then(r => r.json())

    apiHealthy.value = !!res?.success
    apiEnv.value = res?.data?.environment || ""
  } catch {
    apiHealthy.value = false
  }
}

const handleLogout = async () => {
  try { await logout?.() } catch { /* ignore */ }
  router.push("/login")
}

onMounted(() => {
  if (!hasPermission || !hasPermission("super_admin")) {
    router.push("/login")
    
    return
  }
  fetchAll()
})
</script>

<template>
  <div class="admin-dashboard">
    <!-- Hero header -->
    <VCard
      class="dash-hero mb-4"
      elevation="0"
      rounded="lg"
    >
      <div class="dash-hero-bg" />
      <VCardItem class="position-relative">
        <div class="d-flex align-center flex-wrap gap-3">
          <VAvatar
            size="56"
            color="warning"
            class="hero-avatar"
          >
            <VIcon
              size="28"
              color="white"
            >
              ri-shield-user-line
            </VIcon>
          </VAvatar>
          <div class="flex-grow-1">
            <div class="hero-greeting">
              {{ greeting }}،
            </div>
            <h1 class="hero-name">
              {{ user?.name || "أيها السوبر أدمن" }}
            </h1>
            <div class="hero-sub">
              مرحباً بك في لوحة التحكم — كل خيوط المنصة بين يديك.
            </div>
          </div>
          <div class="d-flex flex-column align-end gap-2">
            <VChip
              :color="apiHealthy === true ? 'success' : apiHealthy === false ? 'error' : 'grey'"
              variant="flat"
              size="small"
              class="font-weight-bold"
            >
              <span
                class="live-dot me-2"
                :class="{ ok: apiHealthy === true, down: apiHealthy === false }"
              />
              {{ apiHealthy === true ? 'النظام نشط' : apiHealthy === false ? 'تحقق من الاتصال' : 'فحص…' }}
              <span
                v-if="apiEnv"
                class="ms-1 text-uppercase opacity-80"
              >· {{ apiEnv }}</span>
            </VChip>
            <VChip
              v-if="activeYear"
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="ri-calendar-check-line"
            >
              السنة النشطة: {{ activeYear.year || activeYear.name || activeYear.id }}
            </VChip>
            <VChip
              v-else
              color="warning"
              variant="tonal"
              size="small"
              prepend-icon="ri-error-warning-line"
              to="/admin/study-years/show-study-years"
            >
              لا توجد سنة دراسية فعّالة
            </VChip>
          </div>
        </div>
      </VCardItem>
    </VCard>

    <!-- Error banner -->
    <VAlert
      v-if="statsError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="statsError = ''"
    >
      {{ statsError }}
    </VAlert>

    <!-- Hero stats -->
    <VRow
      class="mb-2"
      dense
    >
      <VCol
        v-for="card in heroStatCards"
        :key="card.key"
        cols="12"
        sm="6"
        lg="3"
      >
        <VCard
          class="stat-card h-100"
          elevation="0"
          rounded="lg"
          border
          :to="card.to || undefined"
          :class="{ 'is-clickable': !!card.to }"
        >
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-2">
              <VAvatar
                :color="card.color"
                size="44"
                rounded="lg"
              >
                <VIcon
                  color="white"
                  size="22"
                >
                  {{ card.icon }}
                </VIcon>
              </VAvatar>
              <VIcon
                v-if="card.to"
                size="16"
                color="grey-darken-1"
              >
                ri-arrow-left-s-line
              </VIcon>
            </div>
            <VSkeletonLoader
              v-if="isLoading"
              type="text"
            />
            <template v-else>
              <div class="stat-value">
                {{ Number(card.value || 0).toLocaleString("en-IQ") }}
              </div>
            </template>
            <div class="stat-label">
              {{ card.label }}
            </div>
            <div class="stat-hint">
              {{ card.hint }}
            </div>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- Advertisement revenue -->
    <VRow class="mb-2" dense>
      <VCol cols="12">
        <VCard elevation="0" rounded="lg" border>
          <VCardTitle class="d-flex align-center py-3 px-4">
            <VIcon color="secondary" class="me-2">ri-megaphone-line</VIcon>
            <span class="text-subtitle-1 font-weight-bold">إيرادات الإعلانات</span>
            <VSpacer />
            <VBtn variant="text" size="small" to="/admin/advertisements">طلبات الإعلانات</VBtn>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <VRow dense>
              <VCol cols="12" md="4">
                <div class="notif-pill notif-pill-warning">
                  <div class="notif-pill-value">{{ Number(adRevenue.today).toLocaleString('ar-IQ') }}</div>
                  <div class="notif-pill-label">اليوم (د.ع)</div>
                </div>
              </VCol>
              <VCol cols="12" md="4">
                <div class="notif-pill notif-pill-primary">
                  <div class="notif-pill-value">{{ Number(adRevenue.month).toLocaleString('ar-IQ') }}</div>
                  <div class="notif-pill-label">هذا الشهر (د.ع)</div>
                </div>
              </VCol>
              <VCol cols="12" md="4">
                <div class="notif-pill notif-pill-success">
                  <div class="notif-pill-value">{{ Number(adRevenue.total).toLocaleString('ar-IQ') }}</div>
                  <div class="notif-pill-label">الإجمالي (د.ع)</div>
                </div>
              </VCol>
            </VRow>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- Notifications mini-snapshot -->
    <VRow
      class="mb-2"
      dense
    >
      <VCol
        cols="12"
        md="8"
      >
        <VCard
          elevation="0"
          rounded="lg"
          border
          class="notif-snapshot h-100"
        >
          <VCardTitle class="d-flex align-center py-3 px-4">
            <VIcon
              color="primary"
              class="me-2"
            >
              ri-notification-3-line
            </VIcon>
            <span class="text-subtitle-1 font-weight-bold">حالة الإشعارات</span>
            <VSpacer />
            <VBtn
              variant="text"
              size="small"
              prepend-icon="ri-arrow-left-line"
              to="/admin/notifications/show-notifications"
            >
              إدارة الإشعارات
            </VBtn>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <VRow dense>
              <VCol
                cols="6"
                md="3"
              >
                <div class="notif-pill notif-pill-primary">
                  <div class="notif-pill-value">
                    {{ notifStats.total }}
                  </div>
                  <div class="notif-pill-label">
                    الإجمالي
                  </div>
                </div>
              </VCol>
              <VCol
                cols="6"
                md="3"
              >
                <div class="notif-pill notif-pill-success">
                  <div class="notif-pill-value">
                    {{ notifStats.sent }}
                  </div>
                  <div class="notif-pill-label">
                    مرسلة
                  </div>
                </div>
              </VCol>
              <VCol
                cols="6"
                md="3"
              >
                <div class="notif-pill notif-pill-warning">
                  <div class="notif-pill-value">
                    {{ notifStats.pending }}
                  </div>
                  <div class="notif-pill-label">
                    معلّقة
                  </div>
                </div>
              </VCol>
              <VCol
                cols="6"
                md="3"
              >
                <div class="notif-pill notif-pill-error">
                  <div class="notif-pill-value">
                    {{ notifStats.failed }}
                  </div>
                  <div class="notif-pill-label">
                    فشلت
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="4"
      >
        <VCard
          elevation="0"
          rounded="lg"
          border
          class="control-card h-100"
        >
          <VCardTitle class="d-flex align-center py-3 px-4">
            <VIcon
              color="error"
              class="me-2"
            >
              ri-logout-box-line
            </VIcon>
            <span class="text-subtitle-1 font-weight-bold">جلسة الحساب</span>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <div class="text-body-2 text-medium-emphasis mb-3">
              للحفاظ على أمان حسابك، سجّل خروج بعد انتهاء العمل.
            </div>
            <VBtn
              block
              color="error"
              variant="tonal"
              prepend-icon="ri-logout-box-line"
              rounded="lg"
              @click="handleLogout"
            >
              تسجيل الخروج
            </VBtn>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- Quick actions grid -->
    <VCard
      class="my-2"
      elevation="0"
      rounded="lg"
      border
    >
      <VCardTitle class="d-flex align-center py-3 px-4">
        <VIcon
          color="primary"
          class="me-2"
        >
          ri-dashboard-2-line
        </VIcon>
        <span class="text-subtitle-1 font-weight-bold">مركز التحكم</span>
        <VSpacer />
        <VBtn
          variant="text"
          size="small"
          prepend-icon="ri-refresh-line"
          :loading="isLoading"
          @click="fetchAll"
        >
          تحديث الكل
        </VBtn>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow dense>
          <VCol
            v-for="action in quickActions"
            :key="action.title"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <RouterLink
              :to="action.to"
              class="quick-card-link"
            >
              <VCard
                class="quick-card h-100"
                elevation="0"
                rounded="lg"
                border
              >
                <VCardItem>
                  <div
                    class="quick-icon"
                    :class="`bg-${action.color}-tint`"
                  >
                    <VIcon
                      :color="action.color"
                      size="26"
                    >
                      {{ action.icon }}
                    </VIcon>
                  </div>
                  <div class="quick-title">
                    {{ action.title }}
                  </div>
                  <div class="quick-sub">
                    {{ action.sub }}
                  </div>
                </VCardItem>
                <VCardActions class="px-4 pb-3">
                  <VSpacer />
                  <VIcon
                    size="18"
                    color="primary"
                  >
                    ri-arrow-left-line
                  </VIcon>
                </VCardActions>
              </VCard>
            </RouterLink>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>
  </div>
</template>

<style scoped>
.admin-dashboard { padding-block: 8px; }

/* Hero card */
.dash-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0b2545 0%, #103261 60%, #1c3a6e 100%) !important;
  color: white;
}
.dash-hero-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(40% 80% at 100% 0%, rgba(255, 138, 0, 0.30), transparent 60%),
    radial-gradient(35% 70% at 0% 100%, rgba(63, 169, 245, 0.22), transparent 60%);
  z-index: 0;
}
.hero-greeting { font-size: .82rem; color: rgba(255, 255, 255, .75); font-weight: 600; }
.hero-name {
  font-family: 'Cairo', sans-serif; font-size: 1.6rem; font-weight: 900;
  margin: 2px 0 4px; color: white !important; letter-spacing: -.01em;
}
.hero-sub { color: rgba(255, 255, 255, .82); font-size: .92rem; }
.hero-avatar { box-shadow: 0 10px 24px rgba(255, 138, 0, .35); }

.live-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  background: #6ef2b4; vertical-align: middle;
  animation: pulse 1.8s infinite;
}
.live-dot.ok { background: #6ef2b4; }
.live-dot.down { background: #E53935; animation: none; }
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(110, 242, 180, 0.6); }
  70%  { box-shadow: 0 0 0 6px rgba(110, 242, 180, 0); }
  100% { box-shadow: 0 0 0 0 rgba(110, 242, 180, 0); }
}

/* Stat cards */
.stat-card { transition: transform .2s ease, box-shadow .2s ease; }
.stat-card.is-clickable { cursor: pointer; }
.stat-card.is-clickable:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(11, 37, 69, .08) !important;
}
.stat-value {
  font-size: 1.9rem; font-weight: 900; color: #0b2545; line-height: 1.1;
  font-family: 'Cairo', sans-serif; letter-spacing: -.02em;
}
.stat-label { font-size: .92rem; font-weight: 700; color: #0b2545; margin-block-start: 6px; }
.stat-hint { font-size: .76rem; color: rgba(11, 37, 69, .55); margin-block-start: 2px; }

/* Notification snapshot */
.notif-pill {
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(11, 37, 69, .04);
  text-align: center;
}
.notif-pill-value {
  font-size: 1.4rem; font-weight: 900; line-height: 1.1;
  font-family: 'Cairo', sans-serif;
}
.notif-pill-label { font-size: .78rem; color: rgba(11, 37, 69, .65); font-weight: 600; margin-block-start: 4px; }
.notif-pill-primary { background: rgba(11, 37, 69, .08); color: #0b2545; }
.notif-pill-success { background: rgba(16, 185, 129, .12); color: #047857; }
.notif-pill-warning { background: rgba(255, 138, 0, .12); color: #b35e00; }
.notif-pill-error   { background: rgba(229, 57, 53, .12); color: #b71c1c; }

/* Quick actions */
.quick-card-link { text-decoration: none; color: inherit; display: block; height: 100%; }
.quick-card {
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  height: 100%;
}
.quick-card-link:hover .quick-card {
  transform: translateY(-3px);
  border-color: rgba(11, 37, 69, .25) !important;
  box-shadow: 0 12px 26px rgba(11, 37, 69, .08) !important;
}
.quick-icon {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-block-end: 12px;
}
.bg-primary-tint   { background: rgba(11, 37, 69, .10); }
.bg-info-tint      { background: rgba(63, 169, 245, .14); }
.bg-secondary-tint { background: rgba(110, 116, 158, .14); }
.bg-success-tint   { background: rgba(16, 185, 129, .14); }
.bg-warning-tint   { background: rgba(255, 138, 0, .14); }
.bg-error-tint     { background: rgba(229, 57, 53, .12); }
.quick-title { font-size: 1.02rem; font-weight: 800; color: #0b2545; }
.quick-sub { font-size: .8rem; color: rgba(11, 37, 69, .6); line-height: 1.55; margin-block-start: 4px; }
</style>
