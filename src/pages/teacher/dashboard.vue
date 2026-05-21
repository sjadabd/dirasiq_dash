<script setup>
// =====================================================
// Teacher Dashboard v2 — rebuilt 2026-05-17.
// Tight, brand-aligned control panel:
//   • Compact hero with greeting + active subscription chip + quick actions
//   • 5 KPI cards (students / courses / sessions today / wallet / pending invoices)
//   • Today's sessions list with live state + action links
//   • Mini financial snapshot (deposits + student invoices)
//   • Subscription capacity (right rail) + QR + referral collapsed panel
//   • Section navigation grid (every teacher route in one tap)
// Brand palette: navy #0B2545, orange #FF8A00, sky #3FA9F5.
// Icons: ri-* (Remix) — per project ESLint rule.
// =====================================================

import teacher_api from "@/api/teacher/teacher_api";
import axiosInstance from "@/utils/axios";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// ---- Reactive state -------------------------------------------------------
const user = ref(null);
const contentUrl = ref(localStorage.getItem("content_url") || "");
const isLoading = ref(true);
const isLoadingSessions = ref(true);

const stats = ref({
  totalStudents: 0, totalCourses: 0,
  activeStudents: 0, activeCourses: 0,
  sessionsToday: 0,
  totalDeposit: 0, receivedDeposit: 0, remainingDeposit: 0,
  studentTotalDue: 0, studentAmountPaid: 0, studentAmountRemaining: 0,
});

const wallet = ref({ balance: 0 });
const walletLoading = ref(false);

const capacity = ref({ currentStudents: 0, maxStudents: 0, remaining: 0, canAdd: false });
const capacityLoading = ref(false);
const capacityError = ref("");

const upcomingToday = ref([]);

const referral = ref({
  referralCode: "", referralLink: "",
  total: 0, completed: 0, pending: 0, bonusSeats: 0,
});
const referralLoading = ref(false);
const referralPanelOpen = ref(false);

const apiHealthy = ref(null);

const snackbar = ref({ show: false, text: "", color: "success" });

// ---- Derived --------------------------------------------------------------
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 5) return "ليلة سعيدة";
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء النور";
  if (h < 21) return "مساء الخير";
  return "ليلة هادئة";
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString("ar-IQ", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
);

const capacityPct = computed(() => {
  if (!capacity.value.maxStudents) return 0;
  return Math.min(100, Math.round((capacity.value.currentStudents / capacity.value.maxStudents) * 100));
});

const depositPct = computed(() => {
  if (!stats.value.totalDeposit) return 0;
  return Math.round((stats.value.receivedDeposit / stats.value.totalDeposit) * 100);
});

const studentPaidPct = computed(() => {
  if (!stats.value.studentTotalDue) return 0;
  return Math.round((stats.value.studentAmountPaid / stats.value.studentTotalDue) * 100);
});

const kpiCards = computed(() => [
  {
    key: "students",
    label: "الطلاب",
    value: stats.value.totalStudents,
    sub: stats.value.activeStudents ? `${stats.value.activeStudents} نشطون` : "بدون طلاب بعد",
    icon: "ri-group-line",
    color: "primary",
    to: "/teacher/bookings/show-bookings",
  },
  {
    key: "courses",
    label: "الكورسات",
    value: stats.value.totalCourses,
    sub: stats.value.activeCourses ? `${stats.value.activeCourses} فعّالة` : "ابدأ بإضافة كورس",
    icon: "ri-book-open-line",
    color: "info",
    to: "/teacher/course/show-course",
  },
  {
    key: "sessionsToday",
    label: "حصص اليوم",
    value: stats.value.sessionsToday,
    sub: upcomingToday.value.length ? `${upcomingToday.value.length} قادمة` : "لا حصص اليوم",
    icon: "ri-calendar-event-line",
    color: "warning",
    to: "/teacher/sessions/manage-sessions",
  },
  {
    key: "wallet",
    label: "رصيد المحفظة",
    value: formatIQDShort(wallet.value.balance),
    sub: "اضغط لإدارة المحفظة",
    icon: "ri-wallet-3-line",
    color: "success",
    to: "/teacher/wallet",
    isText: true,
  },
  {
    key: "pendingInvoices",
    label: "متبقي على الطلاب",
    value: formatIQDShort(stats.value.studentAmountRemaining),
    sub: studentPaidPct.value ? `سُدِّد ${studentPaidPct.value}%` : "—",
    icon: "ri-bill-line",
    color: "error",
    to: "/teacher/invoices/manage-invoices",
    isText: true,
  },
]);

const quickActions = [
  { label: "كورس جديد", icon: "ri-add-circle-line", color: "primary", to: "/teacher/course/show-course" },
  { label: "حصة جديدة", icon: "ri-calendar-event-line", color: "info", to: "/teacher/sessions/manage-sessions" },
  { label: "فاتورة طالب", icon: "ri-bill-line", color: "warning", to: "/teacher/invoices/create-invoices" },
  { label: "واجب", icon: "ri-task-line", color: "secondary", to: "/teacher/assignments/manage-assignments" },
  { label: "امتحان", icon: "ri-file-list-3-line", color: "error", to: "/teacher/exams/manage-exams" },
];

const sectionsNav = [
  { title: "المواد الدراسية", icon: "ri-book-2-line", to: "/teacher/subjects/show-subjects" },
  { title: "الكورسات", icon: "ri-graduation-cap-line", to: "/teacher/course/show-course" },
  { title: "الحجوزات", icon: "ri-calendar-check-line", to: "/teacher/bookings/show-bookings" },
  { title: "الجدول الأسبوعي", icon: "ri-calendar-event-line", to: "/teacher/sessions/manage-sessions" },
  { title: "الواجبات", icon: "ri-task-line", to: "/teacher/assignments/manage-assignments" },
  { title: "الامتحانات", icon: "ri-file-list-3-line", to: "/teacher/exams/manage-exams" },
  { title: "التقييمات", icon: "ri-award-line", to: "/teacher/evaluations/manage-evaluations" },
  { title: "فواتير العربون", icon: "ri-wallet-3-line", to: "/teacher/payments/reservations/show-reservation-payments" },
  { title: "فواتير الطلاب", icon: "ri-bill-line", to: "/teacher/invoices/manage-invoices" },
  { title: "المصاريف", icon: "ri-hand-coin-line", to: "/teacher/expenses/manage-expenses" },
  { title: "التقارير", icon: "ri-bar-chart-2-line", to: "/teacher/reports/financial" },
  { title: "الإشعارات", icon: "ri-notification-3-line", to: "/teacher/notifications/show-notifications" },
];

// ---- Helpers --------------------------------------------------------------
function formatIQD(n) {
  const num = Number(n ?? 0);
  return new Intl.NumberFormat("en-IQ").format(num) + " د.ع";
}
function formatIQDShort(n) {
  const num = Number(n ?? 0);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1) + "M د.ع";
  if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K د.ع";
  return new Intl.NumberFormat("en-IQ").format(num) + " د.ع";
}
function resolveAsset(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = (contentUrl.value || axiosInstance?.defaults?.baseURL?.replace(/\/api\/?$/, "") || "").replace(/\/+$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}
function stateLabel(s) {
  return ({ confirmed: "مؤكدة", pending: "قيد الانتظار", cancelled: "ملغاة", rejected: "مرفوضة" })[s] || s || "";
}
function stateColor(s) {
  return ({ confirmed: "success", pending: "warning", cancelled: "grey", rejected: "error" })[s] || "primary";
}
function formatTimeRange(start, end) {
  if (!start) return "";
  return end ? `${start} – ${end}` : start;
}
function copyToClipboard(text) {
  const val = String(text || "");
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(val)
      .then(() => (snackbar.value = { show: true, text: "تم النسخ بنجاح", color: "success" }))
      .catch(() => (snackbar.value = { show: true, text: "تعذّر النسخ", color: "error" }));
  }
}

// ---- Data loaders ---------------------------------------------------------
async function loadDashboard() {
  try {
    const res = await teacher_api.getDashboard();
    const p = res?.data?.data ?? {};
    if (res?.data?.content_url) contentUrl.value = res.data.content_url;
    stats.value = {
      totalStudents: Number(p.totalStudents) || 0,
      totalCourses: Number(p.totalCourses) || 0,
      activeStudents: Number(p.activeStudents) || 0,
      activeCourses: Number(p.activeCourses) || 0,
      sessionsToday: Number(p.sessionsToday) || 0,
      totalDeposit: Number(p.depositInvoices?.totalAmount ?? p.totalDeposit) || 0,
      receivedDeposit: Number(p.depositInvoices?.receivedAmount ?? p.receivedDeposit) || 0,
      remainingDeposit: Number(p.depositInvoices?.remainingAmount ?? p.remainingDeposit) || 0,
      studentTotalDue: Number(p.studentInvoices?.totalDue) || 0,
      studentAmountPaid: Number(p.studentInvoices?.amountPaid) || 0,
      studentAmountRemaining: Number(p.studentInvoices?.amountRemaining) || 0,
    };
  } catch (e) {
    console.warn("dashboard load failed:", e);
  } finally {
    isLoading.value = false;
  }
}

async function loadCapacity() {
  capacityLoading.value = true;
  capacityError.value = "";
  try {
    const res = await teacher_api.getRemainingStudents();
    const ok = res?.data?.success ?? res?.success;
    const d = res?.data?.data ?? res?.data ?? {};
    if (!ok) throw new Error(res?.data?.message || "تعذر جلب السعة");
    capacity.value = {
      currentStudents: Number(d.currentStudents) || 0,
      maxStudents: Number(d.maxStudents) || 0,
      remaining: Number(d.remaining) || 0,
      canAdd: !!d.canAdd,
    };
  } catch (e) {
    capacityError.value = e?.response?.data?.message || e?.message || "تعذّر جلب السعة";
  } finally {
    capacityLoading.value = false;
  }
}

async function loadWallet() {
  walletLoading.value = true;
  try {
    const res = await teacher_api.getWallet();
    const d = res?.data?.data ?? res?.data ?? {};
    wallet.value = { balance: Number(d.balance) || 0 };
  } catch (e) {
    console.warn("wallet load failed:", e);
  } finally {
    walletLoading.value = false;
  }
}

async function loadUpcoming() {
  isLoadingSessions.value = true;
  try {
    const res = await teacher_api.getUpcomingToday();
    const items = res?.data?.data ?? [];
    upcomingToday.value = Array.isArray(items) ? items : [];
  } catch (e) {
    console.warn("upcoming load failed:", e);
  } finally {
    isLoadingSessions.value = false;
  }
}

async function loadReferral() {
  referralLoading.value = true;
  try {
    const res = await teacher_api.getReferralDashboard();
    const p = res?.data?.data ?? {};
    referral.value = {
      referralCode: p.referralCode || "",
      referralLink: p.referralLink || "",
      total: Number(p.referrals?.total) || 0,
      completed: Number(p.referrals?.completed) || 0,
      pending: Number(p.referrals?.pending) || 0,
      bonusSeats: Number(p.bonuses?.totalBonusSeats) || 0,
    };
  } catch (e) {
    console.warn("referral load failed:", e);
  } finally {
    referralLoading.value = false;
  }
}

async function loadHealth() {
  try {
    const baseURL = axiosInstance?.defaults?.baseURL || import.meta.env.VITE_API_BASE_URL || "";
    const origin = baseURL.replace(/\/api\/?$/, "");
    const r = await fetch(`${origin}/health`).then((res) => res.json());
    apiHealthy.value = !!r?.success;
  } catch {
    apiHealthy.value = false;
  }
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadCapacity(), loadWallet(), loadUpcoming()]);
}

// ---- Wayl return polling (preserved from v1) ------------------------------
function pollAfterWaylReturnIfNeeded() {
  let pending = null;
  try { pending = JSON.parse(localStorage.getItem("pending_wayl_action") || "null"); }
  catch { pending = null; }
  if (!pending?.createdAt) return;
  const ageMs = Date.now() - Number(pending.createdAt);
  if (Number.isNaN(ageMs) || ageMs > 2 * 60 * 1000) return;
  const startedAt = Date.now();
  const t = setInterval(async () => {
    await Promise.all([loadDashboard(), loadCapacity(), loadWallet()]);
    if (Date.now() - startedAt >= 45000) {
      clearInterval(t);
      localStorage.removeItem("pending_wayl_action");
    }
  }, 4000);
}

// ---- QR print -------------------------------------------------------------
function printQr() {
  const qrPath = user.value?.qr;
  if (!qrPath) return;
  const qrUrl = resolveAsset(qrPath);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>طباعة رمز الحضور</title><style>
    @page{size:A4 portrait;margin:20mm}
    body{font-family:'Cairo',system-ui,sans-serif;text-align:center}
    .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 40mm)}
    h1{margin:0 0 12px;font-size:24px;color:#0b2545}
    p{margin:0 0 20px;font-size:18px;color:#334}
    img{width:280px;height:280px;object-fit:contain;border:2px solid #0b2545;padding:12px;border-radius:12px}
    .name{margin-top:16px;font-size:20px;font-weight:700;color:#0b2545}
    .note{margin-top:8px;font-size:14px;color:#666}
  </style></head><body><div class="wrap">
    <h1>تسجيل الحضور عبر تطبيق ملهم</h1>
    <p>يرجى من الطالب مسح رمز QR أدناه باستخدام تطبيق Mulhim IQ لتسجيل الحضور.</p>
    <img src="${qrUrl}" alt="رمز حضور الطلاب">
    <div class="name">${user.value?.name || ""}</div>
    <div class="note">في حال تعذّر المسح، يرجى مراجعة المعلم.</div>
  </div><script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}<\/script></body></html>`);
  win.document.close();
}

// ---- Lifecycle ------------------------------------------------------------
onMounted(async () => {
  const userData = localStorage.getItem("user");
  if (!userData) { router.push("/login"); return; }
  try { user.value = JSON.parse(userData); } catch { user.value = {}; }

  await Promise.all([refreshAll(), loadReferral(), loadHealth()]);
  pollAfterWaylReturnIfNeeded();
});
</script>

<template>
  <div class="teacher-dash">
    <!-- 1. HERO ============================================== -->
    <VCard class="hero-card mb-4" elevation="0" rounded="lg">
      <div class="hero-mesh" />
      <VCardItem class="position-relative">
        <VRow align="center" class="g-3">
          <VCol cols="12" md="7">
            <div class="d-flex align-center gap-3 flex-wrap">
              <VAvatar size="64" color="warning" class="hero-avatar">
                <VImg v-if="user?.profileImagePath" :src="resolveAsset(user.profileImagePath)" alt="avatar" cover />
                <VIcon v-else size="32" color="white">ri-user-3-line</VIcon>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="hero-greet">{{ greeting }} ✨</div>
                <h1 class="hero-name">{{ user?.name || "أيها المعلم" }}</h1>
                <div class="hero-date">{{ todayLabel }}</div>
              </div>
            </div>
          </VCol>
          <VCol cols="12" md="5" class="d-flex justify-md-end align-center gap-2 flex-wrap">
            <VChip :color="apiHealthy ? 'success' : apiHealthy === false ? 'error' : 'grey'"
              variant="flat" size="small" class="font-weight-bold">
              <span class="live-dot me-2" :class="{ ok: apiHealthy, down: apiHealthy === false }" />
              {{ apiHealthy ? "النظام نشط" : apiHealthy === false ? "خارج الخدمة" : "فحص…" }}
            </VChip>
            <VBtn color="warning" variant="flat" rounded="lg" prepend-icon="ri-refresh-line"
              :loading="isLoading" class="hero-refresh" @click="refreshAll">
              تحديث
            </VBtn>
          </VCol>
        </VRow>

        <!-- Quick actions row -->
        <VDivider class="my-4" color="white" opacity="0.18" />
        <div class="quick-actions">
          <RouterLink v-for="a in quickActions" :key="a.label" :to="a.to" class="qa-link">
            <div class="qa-pill" :class="`qa-${a.color}`">
              <VIcon size="18" color="white">{{ a.icon }}</VIcon>
              <span>{{ a.label }}</span>
            </div>
          </RouterLink>
        </div>
      </VCardItem>
    </VCard>

    <!-- 2. KPI ROW =========================================== -->
    <VRow class="mb-2" dense>
      <VCol v-for="card in kpiCards" :key="card.key" cols="12" sm="6" md="4" lg="auto" class="flex-lg-grow-1">
        <RouterLink :to="card.to" class="kpi-link">
          <VCard class="kpi-card h-100" elevation="0" rounded="lg" border>
            <VCardItem>
              <div class="d-flex align-center justify-space-between mb-1">
                <div :class="`kpi-icon kpi-icon-${card.color}`">
                  <VIcon size="20" color="white">{{ card.icon }}</VIcon>
                </div>
                <VIcon size="16" color="grey-darken-1">ri-arrow-left-s-line</VIcon>
              </div>
              <VSkeletonLoader v-if="isLoading" type="text" />
              <template v-else>
                <div class="kpi-value" :class="{ 'kpi-value-text': card.isText }">{{ card.value }}</div>
              </template>
              <div class="kpi-label">{{ card.label }}</div>
              <div class="kpi-sub">{{ card.sub }}</div>
            </VCardItem>
          </VCard>
        </RouterLink>
      </VCol>
    </VRow>

    <!-- 3. MAIN GRID — left wide, right rail =================== -->
    <VRow dense>
      <!-- ------ LEFT (8 cols on lg) ---------------------------- -->
      <VCol cols="12" lg="8">
        <!-- Today's sessions -->
        <VCard class="mb-4 panel" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="primary" class="me-2">ri-calendar-event-line</VIcon>
            <span>حصص اليوم</span>
            <VSpacer />
            <VChip size="small" color="primary" variant="tonal">
              {{ upcomingToday.length }} {{ upcomingToday.length === 1 ? "حصة" : "حصص" }}
            </VChip>
          </VCardTitle>
          <VDivider />
          <VCardItem v-if="isLoadingSessions">
            <VSkeletonLoader v-for="n in 3" :key="n" type="list-item-avatar" class="mb-1" />
          </VCardItem>
          <VCardItem v-else-if="!upcomingToday.length">
            <div class="empty-block">
              <VIcon size="40" color="grey-lighten-1" class="mb-2">ri-calendar-line</VIcon>
              <h4 class="text-subtitle-1 mb-1">لا توجد حصص لليوم</h4>
              <p class="text-caption mb-3">جدولك خفيف اليوم — استمتع بوقتك!</p>
              <VBtn size="small" color="primary" variant="tonal" prepend-icon="ri-add-line"
                to="/teacher/sessions/manage-sessions">إضافة حصة</VBtn>
            </div>
          </VCardItem>
          <VList v-else class="session-list">
            <VListItem v-for="s in upcomingToday" :key="s.sessionId" class="session-item">
              <template #prepend>
                <VAvatar :color="stateColor(s.state)" size="44" class="me-2">
                  <VIcon color="white">ri-time-line</VIcon>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">{{ s.title || s.courseName || "حصة" }}</VListItemTitle>
              <VListItemSubtitle class="d-flex align-center gap-2 flex-wrap mt-1">
                <span class="text-body-2"><VIcon size="14" class="me-1">ri-book-2-line</VIcon>{{ s.courseName || "—" }}</span>
                <span class="text-body-2"><VIcon size="14" class="me-1">ri-time-line</VIcon>{{ formatTimeRange(s.startTime, s.endTime) }}</span>
                <VChip size="x-small" :color="stateColor(s.state)" variant="tonal">{{ stateLabel(s.state) }}</VChip>
              </VListItemSubtitle>
              <template #append>
                <VBtn size="small" variant="text" color="primary" :to="`/teacher/sessions/manage-sessions`"
                  prepend-icon="ri-eye-line">عرض</VBtn>
              </template>
            </VListItem>
          </VList>
        </VCard>

        <!-- Financial snapshot — 2 mini cards -->
        <VRow dense>
          <VCol cols="12" md="6">
            <VCard class="panel h-100" elevation="0" rounded="lg" border>
              <VCardTitle class="panel-head">
                <VIcon color="info" class="me-2">ri-wallet-3-line</VIcon>
                <span>فواتير العربون</span>
                <VSpacer />
                <VChip size="x-small" color="success" variant="tonal">{{ depositPct }}%</VChip>
              </VCardTitle>
              <VDivider />
              <VCardItem>
                <div class="fin-row">
                  <span>الإجمالي</span>
                  <strong>{{ formatIQD(stats.totalDeposit) }}</strong>
                </div>
                <div class="fin-row">
                  <span class="text-success">المستلم</span>
                  <strong class="text-success">{{ formatIQD(stats.receivedDeposit) }}</strong>
                </div>
                <div class="fin-row">
                  <span class="text-warning">المتبقّي</span>
                  <strong class="text-warning">{{ formatIQD(stats.remainingDeposit) }}</strong>
                </div>
                <VProgressLinear :model-value="depositPct" color="success" rounded height="6" class="mt-3" />
                <VBtn block size="small" color="primary" variant="tonal" rounded="lg" class="mt-3"
                  prepend-icon="ri-arrow-left-line"
                  to="/teacher/payments/reservations/show-reservation-payments">
                  إدارة فواتير العربون
                </VBtn>
              </VCardItem>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard class="panel h-100" elevation="0" rounded="lg" border>
              <VCardTitle class="panel-head">
                <VIcon color="error" class="me-2">ri-bill-line</VIcon>
                <span>فواتير الطلاب</span>
                <VSpacer />
                <VChip size="x-small" color="success" variant="tonal">{{ studentPaidPct }}%</VChip>
              </VCardTitle>
              <VDivider />
              <VCardItem>
                <div class="fin-row">
                  <span>المستحق الكلي</span>
                  <strong>{{ formatIQD(stats.studentTotalDue) }}</strong>
                </div>
                <div class="fin-row">
                  <span class="text-success">المسدّد</span>
                  <strong class="text-success">{{ formatIQD(stats.studentAmountPaid) }}</strong>
                </div>
                <div class="fin-row">
                  <span class="text-warning">المتبقّي</span>
                  <strong class="text-warning">{{ formatIQD(stats.studentAmountRemaining) }}</strong>
                </div>
                <VProgressLinear :model-value="studentPaidPct" color="success" rounded height="6" class="mt-3" />
                <VBtn block size="small" color="primary" variant="tonal" rounded="lg" class="mt-3"
                  prepend-icon="ri-arrow-left-line" to="/teacher/invoices/manage-invoices">
                  إدارة فواتير الطلاب
                </VBtn>
              </VCardItem>
            </VCard>
          </VCol>
        </VRow>

        <!-- Section nav grid -->
        <VCard class="mt-4 panel" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="primary" class="me-2">ri-grid-line</VIcon>
            <span>الأقسام</span>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <div class="nav-grid">
              <RouterLink v-for="s in sectionsNav" :key="s.title" :to="s.to" class="nav-tile">
                <div class="nav-tile-icon">
                  <VIcon size="22" color="primary">{{ s.icon }}</VIcon>
                </div>
                <span class="nav-tile-label">{{ s.title }}</span>
              </RouterLink>
            </div>
          </VCardItem>
        </VCard>
      </VCol>

      <!-- ------ RIGHT RAIL (4 cols on lg) ---------------------- -->
      <VCol cols="12" lg="4">
        <!-- Subscription capacity -->
        <VCard class="mb-4 panel" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="primary" class="me-2">ri-account-circle-line</VIcon>
            <span>سعة الاشتراك</span>
            <VSpacer />
            <VBtn icon="ri-refresh-line" size="x-small" variant="text" :loading="capacityLoading"
              @click="loadCapacity" />
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <VAlert v-if="capacityError" type="error" variant="tonal" density="compact" class="mb-3">
              {{ capacityError }}
            </VAlert>
            <div class="capacity-wrap">
              <VProgressCircular :model-value="capacityPct" :size="138" :width="11"
                :color="capacity.canAdd ? 'success' : 'error'">
                <div class="text-center">
                  <div class="cap-current">{{ capacity.currentStudents }}</div>
                  <div class="cap-max">من {{ capacity.maxStudents }}</div>
                </div>
              </VProgressCircular>
            </div>
            <div class="d-flex justify-space-between mt-3">
              <div class="text-center flex-grow-1">
                <div class="text-caption text-medium-emphasis">المتبقّي</div>
                <div class="text-h6 font-weight-bold text-success">{{ capacity.remaining }}</div>
              </div>
              <VDivider vertical />
              <div class="text-center flex-grow-1">
                <div class="text-caption text-medium-emphasis">الحالة</div>
                <div class="text-subtitle-2 font-weight-bold" :class="capacity.canAdd ? 'text-success' : 'text-error'">
                  {{ capacity.canAdd ? "متاحة" : "ممتلئة" }}
                </div>
              </div>
            </div>
            <VBtn block size="small" color="warning" variant="tonal" rounded="lg" class="mt-3"
              prepend-icon="ri-vip-crown-line" to="/teacher/billing/pricing">
              ترقية الباقة
            </VBtn>
          </VCardItem>
        </VCard>

        <!-- QR card -->
        <VCard class="mb-4 panel" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="primary" class="me-2">ri-qr-code-line</VIcon>
            <span>رمز حضور الطلاب</span>
          </VCardTitle>
          <VDivider />
          <VCardItem class="text-center">
            <div v-if="user?.qr" class="qr-wrap">
              <img :src="resolveAsset(user.qr)" alt="رمز حضور الطلاب" class="qr-img" />
            </div>
            <div v-else class="empty-block">
              <VIcon size="40" color="grey-lighten-1">ri-qr-code-line</VIcon>
              <p class="text-caption text-medium-emphasis mt-2">جارٍ إنشاء الرمز…</p>
            </div>
            <VBtn v-if="user?.qr" block size="small" color="primary" variant="tonal" rounded="lg" class="mt-3"
              prepend-icon="ri-printer-line" @click="printQr">
              طباعة الرمز (A4)
            </VBtn>
          </VCardItem>
        </VCard>

        <!-- Referral — collapsible -->
        <VCard class="panel" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head cursor-pointer" @click="referralPanelOpen = !referralPanelOpen">
            <VIcon color="warning" class="me-2">ri-share-forward-line</VIcon>
            <span>برنامج الإحالة</span>
            <VSpacer />
            <VChip v-if="referral.total" size="x-small" color="warning" variant="tonal" class="me-2">
              {{ referral.total }} إحالة
            </VChip>
            <VIcon size="20">{{ referralPanelOpen ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line" }}</VIcon>
          </VCardTitle>
          <VExpandTransition>
            <div v-show="referralPanelOpen">
              <VDivider />
              <VCardItem>
                <div v-if="referralLoading" class="text-center py-4">
                  <VProgressCircular indeterminate color="primary" size="32" />
                </div>
                <template v-else>
                  <div class="ref-row">
                    <span class="ref-label">كود الدعوة</span>
                    <div class="d-flex align-center gap-1">
                      <code class="ref-code">{{ referral.referralCode.slice(0, 12) }}…</code>
                      <VBtn icon="ri-file-copy-line" size="x-small" variant="text"
                        @click="copyToClipboard(referral.referralCode)" />
                    </div>
                  </div>
                  <div class="ref-stats mt-3">
                    <div>
                      <div class="ref-num text-primary">{{ referral.total }}</div>
                      <div class="ref-cap">الإجمالي</div>
                    </div>
                    <div>
                      <div class="ref-num text-success">{{ referral.completed }}</div>
                      <div class="ref-cap">مكتملة</div>
                    </div>
                    <div>
                      <div class="ref-num text-warning">{{ referral.pending }}</div>
                      <div class="ref-cap">معلّقة</div>
                    </div>
                    <div>
                      <div class="ref-num text-info">{{ referral.bonusSeats }}</div>
                      <div class="ref-cap">مقاعد إضافية</div>
                    </div>
                  </div>
                  <VBtn block size="small" color="warning" variant="tonal" rounded="lg" class="mt-3"
                    prepend-icon="ri-link"
                    @click="copyToClipboard('https://mulhimiq.com' + referral.referralLink)">
                    نسخ رابط الدعوة
                  </VBtn>
                </template>
              </VCardItem>
            </div>
          </VExpandTransition>
        </VCard>
      </VCol>
    </VRow>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="bottom" timeout="2400" rounded="pill">
      <div class="d-flex align-center gap-2">
        <VIcon>{{ snackbar.color === "success" ? "ri-check-line" : "ri-error-warning-line" }}</VIcon>
        {{ snackbar.text }}
      </div>
    </VSnackbar>
  </div>
</template>

<style scoped>
/* =====================================================
   Teacher Dashboard v2 — brand-aligned, compact, modern
   navy #0B2545 · orange #FF8A00 · sky #3FA9F5
   ===================================================== */

.teacher-dash { padding-block: 4px; }

/* ------- HERO ---------- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #050d1f 0%, #0b2545 55%, #122e54 100%) !important;
  color: white;
}
.hero-mesh {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(40% 80% at 100% 0%, rgba(255, 138, 0, 0.30), transparent 60%),
    radial-gradient(35% 70% at 0% 100%, rgba(63, 169, 245, 0.22), transparent 60%);
}
.hero-avatar { box-shadow: 0 10px 24px rgba(255, 138, 0, .35); }
.hero-greet { font-size: .82rem; color: rgba(255, 255, 255, .78); font-weight: 600; }
.hero-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.5rem; font-weight: 900;
  color: white !important; margin: 2px 0 4px;
  letter-spacing: -.01em;
}
.hero-date { color: rgba(255, 255, 255, .72); font-size: .82rem; }
.hero-refresh { font-weight: 800; text-transform: none; letter-spacing: 0; }

.live-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
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

/* Quick actions inside hero */
.quick-actions {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.qa-link { text-decoration: none; }
.qa-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .10);
  border: 1px solid rgba(255, 255, 255, .15);
  color: white;
  font-weight: 700; font-size: .9rem;
  backdrop-filter: blur(8px);
  transition: all .2s ease;
}
.qa-pill:hover { transform: translateY(-2px); background: rgba(255, 255, 255, .16); }
.qa-primary:hover  { border-color: rgba(63, 169, 245, .7); background: rgba(63, 169, 245, .22); }
.qa-info:hover     { border-color: rgba(63, 169, 245, .7); background: rgba(63, 169, 245, .22); }
.qa-warning:hover  { border-color: rgba(255, 138, 0, .7);  background: rgba(255, 138, 0, .22); }
.qa-secondary:hover{ border-color: rgba(110, 116, 158, .7); background: rgba(110, 116, 158, .22); }
.qa-error:hover    { border-color: rgba(229, 57, 53, .7);  background: rgba(229, 57, 53, .22); }

/* ------- KPI ---------- */
.kpi-link { text-decoration: none; color: inherit; display: block; height: 100%; }
.kpi-card {
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  height: 100%; min-width: 0;
}
.kpi-link:hover .kpi-card {
  transform: translateY(-3px);
  border-color: rgba(11, 37, 69, .25) !important;
  box-shadow: 0 10px 24px rgba(11, 37, 69, .08) !important;
}
.kpi-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.kpi-icon-primary  { background: linear-gradient(135deg, #0b2545 0%, #103261 100%); }
.kpi-icon-info     { background: linear-gradient(135deg, #3FA9F5 0%, #2E8DDC 100%); }
.kpi-icon-success  { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
.kpi-icon-warning  { background: linear-gradient(135deg, #FF8A00 0%, #FFB766 100%); }
.kpi-icon-error    { background: linear-gradient(135deg, #E53935 0%, #b71c1c 100%); }
.kpi-icon-secondary{ background: linear-gradient(135deg, #6e749e 0%, #4b5078 100%); }
.kpi-value {
  font-family: "Cairo", sans-serif;
  font-size: 1.8rem; font-weight: 900; color: #0b2545;
  line-height: 1.1; letter-spacing: -.02em; margin-top: 8px;
}
.kpi-value-text { font-size: 1.25rem; }
.kpi-label { font-size: .82rem; color: #0b2545; font-weight: 700; margin-top: 4px; }
.kpi-sub   { font-size: .72rem; color: rgba(11, 37, 69, .55); margin-top: 2px; }

/* ------- Panel cards ---------- */
.panel { background: white; }
.panel-head {
  display: flex; align-items: center;
  padding: 12px 16px !important;
  font-size: .98rem; font-weight: 700; color: #0b2545;
}
.empty-block {
  text-align: center; padding: 32px 16px; color: rgba(11, 37, 69, .65);
}

/* Sessions list */
.session-list { padding: 0; }
.session-item {
  padding-block: 12px !important;
  border-bottom: 1px solid rgba(11, 37, 69, .06);
}
.session-item:last-child { border-bottom: none; }

/* Financial rows */
.fin-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-block: 6px;
  font-size: .92rem;
}
.fin-row + .fin-row { border-top: 1px dashed rgba(11, 37, 69, .07); }

/* Section navigation grid */
.nav-grid {
  display: grid; gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}
@media (max-width: 960px) { .nav-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .nav-grid { grid-template-columns: repeat(2, 1fr); } }
.nav-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  background: rgba(11, 37, 69, .04);
  text-decoration: none;
  color: #0b2545;
  transition: all .2s ease;
  text-align: center;
}
.nav-tile:hover {
  background: linear-gradient(135deg, #0b2545 0%, #103261 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(11, 37, 69, .15);
}
.nav-tile:hover .v-icon { color: #FF8A00 !important; }
.nav-tile-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: white;
  box-shadow: 0 4px 10px rgba(11, 37, 69, .06);
}
.nav-tile:hover .nav-tile-icon { background: rgba(255, 255, 255, .12); box-shadow: none; }
.nav-tile-label {
  font-size: .8rem; font-weight: 700;
}

/* Capacity */
.capacity-wrap {
  display: flex; justify-content: center;
  padding-block: 8px;
}
.cap-current { font-size: 1.8rem; font-weight: 900; color: #0b2545; line-height: 1; }
.cap-max { font-size: .76rem; color: rgba(11, 37, 69, .6); margin-top: 4px; }

/* QR */
.qr-wrap {
  display: inline-block;
  padding: 12px;
  background: white;
  border: 2px solid rgba(11, 37, 69, .08);
  border-radius: 12px;
}
.qr-img {
  width: 140px; height: 140px; object-fit: contain; display: block;
}

/* Referral */
.cursor-pointer { cursor: pointer; }
.ref-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(11, 37, 69, .04);
}
.ref-label { font-size: .8rem; color: rgba(11, 37, 69, .65); font-weight: 600; }
.ref-code {
  font-family: monospace; font-size: .88rem; color: #0b2545;
  background: white; padding: 4px 8px; border-radius: 6px;
}
.ref-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;
}
.ref-num { font-family: "Cairo", sans-serif; font-size: 1.3rem; font-weight: 900; line-height: 1; }
.ref-cap { font-size: .68rem; color: rgba(11, 37, 69, .6); font-weight: 600; margin-top: 4px; }

/* Helper to allow flex wrap with auto width on KPI row at lg */
@media (min-width: 1280px) {
  .flex-lg-grow-1 { flex: 1 1 0%; min-width: 0; }
}
</style>
