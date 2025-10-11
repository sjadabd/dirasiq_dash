<script setup>
import teacher_api from "@/api/teacher/teacher_api";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// بيانات المستخدم
const user = ref(null);
const isLoading = ref(true);
const isLoadingUpcoming = ref(true);

// إحصائيات المعلم
const stats = ref({
  totalStudents: 0,
  totalCourses: 0,
  activeStudents: 0,
  activeCourses: 0,
  sessionsToday: 0,
  totalDeposit: 0,
  receivedDeposit: 0,
  remainingDeposit: 0,
  studentTotalDue: 0,
  studentAmountPaid: 0,
  studentAmountRemaining: 0,
});

// دروس اليوم القادمة
const upcomingToday = ref([]);

// ترجمة حالة الجلسة
const translateState = (s) => {
  const key = (s || '').toLowerCase();
  switch (key) {
    case 'confirmed':
      return 'مؤكدة';
    case 'pending':
      return 'قيد الانتظار';
    case 'cancelled':
      return 'ملغاة';
    case 'rejected':
      return 'مرفوضة';
    default:
      return s || '';
  }
};

// تنسيق مبالغ الدينار العراقي
const formatIQD = (n) => {
  const num = Number(n ?? 0);
  try {
    return new Intl.NumberFormat('en-IQ').format(num) + ' د.ع';
  } catch (e) {
    return (num || 0).toLocaleString('en-IQ') + ' د.ع';
  }
};

onMounted(async () => {
  // جلب بيانات المستخدم من localStorage
  const userData = localStorage.getItem("user");
  if (userData) {
    user.value = JSON.parse(userData);
  } else {
    // إذا لم توجد بيانات المستخدم، توجيه لصفحة تسجيل الدخول
    router.push("/login");
    return;
  }

  // جلب الإحصائيات الحقيقية من الخادم
  try {
    const res = await teacher_api.getDashboard();
    const payload = res?.data?.data ?? res?.data ?? {};
    // تأمين القيم الافتراضية في حال غياب أي حقل
    stats.value = {
      totalStudents: Number(payload.totalStudents ?? 0),
      totalCourses: Number(payload.totalCourses ?? 0),
      activeStudents: Number(payload.activeStudents ?? 0),
      activeCourses: Number(payload.activeCourses ?? 0),
      sessionsToday: Number(payload.sessionsToday ?? 0),
      totalDeposit: Number(payload.totalDeposit ?? payload?.depositInvoices?.totalAmount ?? 0),
      receivedDeposit: Number(payload.receivedDeposit ?? payload?.depositInvoices?.receivedAmount ?? 0),
      remainingDeposit: Number(payload.remainingDeposit ?? payload?.depositInvoices?.remainingAmount ?? 0),
      studentTotalDue: Number(payload?.studentInvoices?.totalDue ?? 0),
      studentAmountPaid: Number(payload?.studentInvoices?.amountPaid ?? 0),
      studentAmountRemaining: Number(payload?.studentInvoices?.amountRemaining ?? 0),
    };
  } catch (e) {
    console.warn("Failed to load teacher dashboard:", e);
  } finally {
    isLoading.value = false;
  }

  // جلب الدروس القادمة لليوم
  try {
    const res2 = await teacher_api.getUpcomingToday();
    const items = res2?.data?.data ?? [];
    upcomingToday.value = Array.isArray(items) ? items : [];
  } catch (e) {
    console.warn("Failed to load upcoming today:", e);
  } finally {
    isLoadingUpcoming.value = false;
  }
});

// دالة تسجيل الخروج
const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  router.push("/login");
};

// دالة تحديث الملف الشخصي
const updateProfile = () => {
  router.push("/teacher/profile-setup");
};
</script>

<template>
  <div class="teacher-dashboard">
    <VContainer fluid class="pa-6">
      <!-- ترحيب -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard color="primary" variant="tonal" class="pa-6">
            <VRow align="center">
              <VCol cols="12" md="8">
                <h1 class="text-h4 mb-2">مرحباً {{ user?.name }}! 👋</h1>
                <p class="text-body-1 mb-0">
                  {{ user?.email }}
                </p>
                <p class="text-caption mt-2">
                  عضو منذ
                  {{ new Date(user?.createdAt).toLocaleDateString("en-IQ") }}
                </p>
              </VCol>
              <VCol cols="12" md="4" class="text-center">
                <VAvatar size="80" color="primary">
                  <VImg v-if="user?.profileImagePath" :src="`http://localhost:3000${user.profileImagePath}`"
                    alt="User Avatar" cover />
                  <VIcon v-else size="40">mdi-account</VIcon>
                </VAvatar>
              </VCol>
            </VRow>
          </VCard>
        </VCol>
      </VRow>

      <!-- الإحصائيات -->
      <VRow class="mb-6" style="justify-content: center;">

        <!-- المدفوعات والفواتير -->
        <VCol cols="12">
          <h2 class="text-h5 mb-4">المدفوعات والفواتير</h2>
        </VCol>

        <!-- ودائع الحجز (Deposit Invoices) -->
        <VCol cols="12" md="4">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="36" color="primary" class="mb-2">mdi-cash</VIcon>
            <div class="text-body-2 text-medium-emphasis mb-1">إجمالي مبالغ العربون</div>
            <div class="text-h5">{{ formatIQD(stats.totalDeposit) }}</div>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="36" color="success" class="mb-2">mdi-cash-check</VIcon>
            <div class="text-body-2 text-medium-emphasis mb-1">المستلم من العربون</div>
            <div class="text-h5">{{ formatIQD(stats.receivedDeposit) }}</div>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="36" color="warning" class="mb-2">mdi-cash-remove</VIcon>
            <div class="text-body-2 text-medium-emphasis mb-1">المتبقي من العربون</div>
            <div class="text-h5">{{ formatIQD(stats.remainingDeposit) }}</div>
          </VCard>
        </VCol>

        <!-- فواتير الطلاب (Student Invoices) -->
        <VCol cols="12" md="4">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="36" color="primary" class="mb-2">mdi-receipt</VIcon>
            <div class="text-body-2 text-medium-emphasis mb-1">إجمالي المستحق على الطلاب</div>
            <div class="text-h5">{{ formatIQD(stats.studentTotalDue) }}</div>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="36" color="success" class="mb-2">mdi-receipt-text-check</VIcon>
            <div class="text-body-2 text-medium-emphasis mb-1">المدفوع من الطلاب</div>
            <div class="text-h5">{{ formatIQD(stats.studentAmountPaid) }}</div>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="36" color="warning" class="mb-2">mdi-receipt-text-remove</VIcon>
            <div class="text-body-2 text-medium-emphasis mb-1">المتبقي على الطلاب</div>
            <div class="text-h5">{{ formatIQD(stats.studentAmountRemaining) }}</div>
          </VCard>
        </VCol>

        <VCol cols="12">
          <h2 class="text-h5 mb-4">إحصائياتك</h2>
        </VCol>

        <VCol cols="12" v-if="isLoading">
          <div class="d-flex justify-center py-6">
            <VProgressCircular indeterminate color="primary" size="48" />
          </div>
        </VCol>

        <template v-else>
          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center" elevation="2">
              <VIcon size="48" color="primary" class="mb-2">mdi-account-group</VIcon>
              <h3 class="text-h4">{{ stats.totalStudents }}</h3>
              <p class="text-body-2 text-medium-emphasis">إجمالي الطلاب</p>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center" elevation="2">
              <VIcon size="48" color="success" class="mb-2">mdi-book-open</VIcon>
              <h3 class="text-h4">{{ stats.totalCourses }}</h3>
              <p class="text-body-2 text-medium-emphasis">إجمالي الدورات</p>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center" elevation="2">
              <VIcon size="48" color="info" class="mb-2">mdi-account-check</VIcon>
              <h3 class="text-h4">{{ stats.activeStudents }}</h3>
              <p class="text-body-2 text-medium-emphasis">الطلاب النشطون</p>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center" elevation="2">
              <VIcon size="48" color="warning" class="mb-2">mdi-book-check</VIcon>
              <h3 class="text-h4">{{ stats.activeCourses }}</h3>
              <p class="text-body-2 text-medium-emphasis">الدورات النشطة</p>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center" elevation="2">
              <VIcon size="48" color="secondary" class="mb-2">mdi-calendar-clock</VIcon>
              <h3 class="text-h4">{{ stats.sessionsToday }}</h3>
              <p class="text-body-2 text-medium-emphasis">حصص اليوم</p>
            </VCard>
          </VCol>
        </template>
      </VRow>

      <!-- الدروس القادمة اليوم -->
      <VRow class="mb-6">
        <VCol cols="12">
          <h2 class="text-h5 mb-4">الدروس القادمة اليوم</h2>
        </VCol>

        <!-- Loading -->
        <VCol cols="12" v-if="isLoadingUpcoming">
          <div class="d-flex justify-center py-6">
            <VProgressCircular indeterminate color="primary" size="32" />
          </div>
        </VCol>

        <!-- Empty -->
        <VCol cols="12" v-else-if="!upcomingToday.length">
          <VAlert type="info" variant="tonal" border="start" border-color="info">
            لا توجد دروس قادمة اليوم.
          </VAlert>
        </VCol>

        <!-- List -->
        <template v-else>
          <VCol v-for="item in upcomingToday" :key="item.sessionId" cols="12" sm="6" md="4">
            <VCard elevation="2" class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-subtitle-1 fw-600">{{ item.courseName || 'دورة' }}</div>
                <VChip
                  :color="item.state === 'confirmed' ? 'success' : (item.state === 'pending' ? 'warning' : 'default')"
                  size="small">
                  {{ translateState(item.state) }}
                </VChip>
              </div>
              <div class="text-body-1 mb-1">{{ item.title }}</div>
              <div class="text-body-2 text-medium-emphasis">
                <VIcon size="18" class="me-1">mdi-clock-outline</VIcon>
                {{ item.startTime }} - {{ item.endTime }}
              </div>
            </VCard>
          </VCol>
        </template>
      </VRow>
    </VContainer>
  </div>
</template>

<style scoped>
.v-card {
  border-radius: 12px;
}

.v-list-item {
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.v-list-item:last-child {
  border-block-end: none;
}
</style>
