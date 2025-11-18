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

// سعة اشتراك الطلاب (من الباقة)
const capacity = ref({
  currentStudents: 0,
  maxStudents: 0,
  remaining: 0,
  canAdd: false,
})
const capacityLoading = ref(false)
const capacityError = ref('')

// Snackbar محلي للتنبيهات الاحترافية (نسخ الكود والرابط وغيرها)
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

// نظام الإحالات للمعلم
const referralLoading = ref(false)
const referralError = ref('')
const referralDashboard = ref({
  referralCode: '',
  referralLink: '',
  referrals: {
    pending: 0,
    completed: 0,
    rejected: 0,
    total: 0,
  },
  bonuses: {
    totalBonusSeats: 0,
    activeBonuses: [],
  },
})

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

// نسخ نص إلى الحافظة
const copyToClipboard = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text || ''))
    } else {
      const input = document.createElement('input')
      input.value = String(text || '')
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    snackbar.value = {
      show: true,
      text: 'تم نسخ النص بنجاح',
      color: 'success',
    }
  } catch (e) {
    console.warn('Failed to copy text:', e)
    snackbar.value = {
      show: true,
      text: 'تعذر نسخ النص، يرجى المحاولة مرة أخرى',
      color: 'error',
    }
  }
}

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

  // جلب تقرير سعة الاشتراك
  try {
    capacityLoading.value = true
    capacityError.value = ''
    const resCap = await teacher_api.getRemainingStudents()
    const ok = resCap?.data?.success || resCap?.success
    const data = resCap?.data?.data || resCap?.data || resCap

    if (!ok || !data) {
      throw new Error(resCap?.data?.message || 'تعذر جلب تقرير السعة')
    }

    capacity.value = {
      currentStudents: Number(data.currentStudents) || 0,
      maxStudents: Number(data.maxStudents) || 0,
      remaining: Number(data.remaining) || 0,
      canAdd: Boolean(data.canAdd),
    }
  } catch (e) {
    console.warn('Failed to load subscription capacity:', e)
    capacityError.value =
      e?.response?.data?.message ||
      e?.message ||
      'تعذر جلب تقرير السعة، يرجى المحاولة لاحقًا'
  } finally {
    capacityLoading.value = false
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

  // جلب إحصائيات نظام الإحالات
  try {
    referralLoading.value = true
    referralError.value = ''
    const resRef = await teacher_api.getReferralDashboard()
    const ok = resRef?.data?.success || resRef?.success
    const payload = resRef?.data?.data || resRef?.data || resRef
    if (!ok || !payload) {
      throw new Error(resRef?.data?.message || 'تعذر جلب إحصائيات الإحالات')
    }

    referralDashboard.value = {
      referralCode: payload.referralCode || '',
      referralLink: payload.referralLink || '',
      referrals: {
        pending: Number(payload?.referrals?.pending ?? 0),
        completed: Number(payload?.referrals?.completed ?? 0),
        rejected: Number(payload?.referrals?.rejected ?? 0),
        total: Number(payload?.referrals?.total ?? 0),
      },
      bonuses: {
        totalBonusSeats: Number(payload?.bonuses?.totalBonusSeats ?? 0),
        activeBonuses: Array.isArray(payload?.bonuses?.activeBonuses)
          ? payload.bonuses.activeBonuses
          : [],
      },
    }
  } catch (e) {
    console.warn('Failed to load referral dashboard:', e)
    referralError.value =
      e?.response?.data?.message ||
      e?.message ||
      'تعذر جلب إحصائيات برنامج الإحالات'
  } finally {
    referralLoading.value = false
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

// طباعة رمز QR في ورقة A4 مع رسالة للطلاب
const printQr = () => {
  const qrPath = user.value?.qr;
  if (!qrPath) return;
  const qrUrl = `https://api.mulhimiq.com${qrPath}`;

  const win = window.open('', '_blank');
  if (!win) return;

  const html = `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>طباعة رمز الحضور</title>
    <style>
      @page { size: A4 portrait; margin: 20mm; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Naskh Arabic", Arial, sans-serif; }
      .container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 40mm); text-align: center; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { margin: 0 0 20px; font-size: 18px; }
      img { width: 260px; height: 260px; object-fit: contain; }
      .note { margin-top: 16px; font-size: 14px; color: #555; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>تسجيل الحضور عبر التطبيق</h1>
      <p>يرجى من الطالب مسح رمز QR أدناه باستخدام التطبيق لتسجيل حضورك.</p>
      <img src="${qrUrl}" alt="رمز حضور الطلاب" />
      <div class="note">في حال تعذّر المسح، يرجى مراجعة المعلم.</div>
    </div>
    <script>
      window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 300); };
    <\/script>
  </body>
  </html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
};

// حساب نسبة الطلاب
const getCapacityPercentage = () => {
  if (capacity.value.maxStudents === 0) return 0;
  return Math.round((capacity.value.currentStudents / capacity.value.maxStudents) * 100);
};

// حساب نسبة العربون المستلم
const getDepositPercentage = () => {
  if (stats.value.totalDeposit === 0) return 0;
  return Math.round((stats.value.receivedDeposit / stats.value.totalDeposit) * 100);
};

// حساب نسبة المدفوع من الطلاب
const getStudentPaidPercentage = () => {
  if (stats.value.studentTotalDue === 0) return 0;
  return Math.round((stats.value.studentAmountPaid / stats.value.studentTotalDue) * 100);
};
</script>

<template>
  <div class="teacher-dashboard">
    <VContainer fluid class="pa-4 pa-md-8">
      <!-- Enhanced welcome section with gradient background and better layout -->
      <VRow class="mb-8">
        <VCol cols="12">
          <VCard class="welcome-card overflow-hidden" elevation="8">
            <div class="welcome-gradient"></div>
            <VCardText class="pa-6 pa-md-8 position-relative">
              <VRow align="center">
                <VCol cols="12" md="8">
                  <div class="d-flex align-center gap-4 flex-wrap">
                    <VAvatar size="100" class="avatar-glow" color="white"
                      style="border: 4px solid rgba(255, 255, 255, 30%);">
                      <VImg v-if="user?.profileImagePath" :src="`https://api.mulhimiq.com${user.profileImagePath}`"
                        alt="User Avatar" cover />
                      <VIcon v-else size="50" color="primary">mdi-account</VIcon>
                    </VAvatar>
                    <div class="welcome-text">
                      <h1 class="text-h3 text-white mb-2 font-weight-bold">مرحباً {{ user?.name }}! 👋</h1>
                      <p class="text-h6 mb-2 text-white" style="opacity: 0.95;">
                        {{ user?.email }}
                      </p>
                      <VChip color="white" variant="flat" size="small" class="mt-1">
                        <VIcon start size="16">mdi-calendar-check</VIcon>
                        عضو منذ {{ new Date(user?.createdAt).toLocaleDateString("ar-IQ") }}
                      </VChip>
                    </div>
                  </div>
                </VCol>
                <VCol cols="12" md="4">
                  <VCard class="qr-card text-center pa-4" elevation="4">
                    <div class="text-caption mb-2 font-weight-bold">رمز الحضور للطلاب</div>
                    <img v-if="user?.qr" class="qr-image mx-auto" :src="`https://api.mulhimiq.com${user.qr}`"
                      alt="رمز حضور الطلاب" />
                    <VBtn v-if="user?.qr" block size="small" variant="tonal" color="primary" class="mt-3"
                      @click="printQr">
                      <VIcon start size="18">mdi-printer</VIcon>
                      طباعة الرمز
                    </VBtn>
                  </VCard>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Stats overview with icon badges and better visual hierarchy -->
      <VRow class="mb-8">
        <VCol cols="12">
          <h2 class="text-h4 mb-6 font-weight-bold d-flex align-center gap-2">
            <VIcon color="primary" size="32">mdi-chart-box</VIcon>
            نظرة عامة على الإحصائيات
          </h2>
        </VCol>

        <VCol cols="12" v-if="isLoading">
          <div class="d-flex justify-center align-center" style="min-block-size: 200px;">
            <div class="text-center">
              <VProgressCircular indeterminate color="primary" size="64" width="6" />
              <p class="mt-4 text-medium-emphasis">جاري تحميل البيانات...</p>
            </div>
          </div>
        </VCol>

        <template v-else>
          <VCol cols="12" sm="6" lg="3">
            <VCard class="stat-card stat-card-primary h-100" elevation="3">
              <VCardText class="pa-6">
                <div class="d-flex justify-space-between align-start mb-4">
                  <div>
                    <p class="text-caption text-medium-emphasis mb-1">إجمالي الطلاب</p>
                    <h3 class="text-h3 font-weight-bold">{{ stats.totalStudents }}</h3>
                  </div>
                  <div class="stat-icon stat-icon-primary">
                    <VIcon size="32" color="white">mdi-account-group</VIcon>
                  </div>
                </div>
                <VProgressLinear :model-value="100" color="primary" height="6" rounded />
              </VCardText>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" lg="3">
            <VCard class="stat-card stat-card-success h-100" elevation="3">
              <VCardText class="pa-6">
                <div class="d-flex justify-space-between align-start mb-4">
                  <div>
                    <p class="text-caption text-medium-emphasis mb-1">إجمالي الدورات</p>
                    <h3 class="text-h3 font-weight-bold">{{ stats.totalCourses }}</h3>
                  </div>
                  <div class="stat-icon stat-icon-success">
                    <VIcon size="32" color="white">mdi-book-open-variant</VIcon>
                  </div>
                </div>
                <VProgressLinear :model-value="100" color="success" height="6" rounded />
              </VCardText>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" lg="3">
            <VCard class="stat-card stat-card-info h-100" elevation="3">
              <VCardText class="pa-6">
                <div class="d-flex justify-space-between align-start mb-4">
                  <div>
                    <p class="text-caption text-medium-emphasis mb-1">الطلاب النشطون</p>
                    <h3 class="text-h3 font-weight-bold">{{ stats.activeStudents }}</h3>
                  </div>
                  <div class="stat-icon stat-icon-info">
                    <VIcon size="32" color="white">mdi-account-check</VIcon>
                  </div>
                </div>
                <VProgressLinear
                  :model-value="stats.totalStudents > 0 ? (stats.activeStudents / stats.totalStudents) * 100 : 0"
                  color="info" height="6" rounded />
              </VCardText>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" lg="3">
            <VCard class="stat-card stat-card-warning h-100" elevation="3">
              <VCardText class="pa-6">
                <div class="d-flex justify-space-between align-start mb-4">
                  <div>
                    <p class="text-caption text-medium-emphasis mb-1">حصص اليوم</p>
                    <h3 class="text-h3 font-weight-bold">{{ stats.sessionsToday }}</h3>
                  </div>
                  <div class="stat-icon stat-icon-warning">
                    <VIcon size="32" color="white">mdi-calendar-today</VIcon>
                  </div>
                </div>
                <VProgressLinear :model-value="100" color="warning" height="6" rounded />
              </VCardText>
            </VCard>
          </VCol>
        </template>
      </VRow>

      <!-- Capacity section with circular progress and enhanced design -->
      <VRow class="mb-8">
        <VCol cols="12">
          <h2 class="text-h4 mb-6 font-weight-bold d-flex align-center gap-2">
            <VIcon color="primary" size="32">mdi-account-multiple</VIcon>
            إدارة السعة والإحالات
          </h2>
        </VCol>

        <VCol cols="12" lg="6">
          <VCard class="capacity-card h-100" elevation="4">
            <VCardText class="pa-6">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <h3 class="text-h5 font-weight-bold mb-1">سعة اشتراك الطلاب</h3>
                  <p class="text-body-2 text-medium-emphasis">متابعة عدد الطلاب المسموح به في باقتك</p>
                </div>
                <VBtn icon size="small" variant="text" :loading="capacityLoading" @click="() => {
                  capacityLoading = true; teacher_api.getRemainingStudents().then(resCap => {
                    const ok = resCap?.data?.success || resCap?.success
                    const data = resCap?.data?.data || resCap?.data || resCap
                    if (ok && data) {
                      capacity = {
                        currentStudents: Number(data.currentStudents) || 0,
                        maxStudents: Number(data.maxStudents) || 0,
                        remaining: Number(data.remaining) || 0,
                        canAdd: Boolean(data.canAdd),
                      }
                    }
                  }).catch(e => {
                    console.warn('Failed to refresh subscription capacity:', e)
                  }).finally(() => { capacityLoading = false })
                }">
                  <VIcon>mdi-refresh</VIcon>
                </VBtn>
              </div>

              <VAlert v-if="capacityError" type="error" variant="tonal" class="mb-4" density="comfortable">
                {{ capacityError }}
              </VAlert>

              <div class="d-flex justify-center align-center mb-6">
                <div class="position-relative">
                  <VProgressCircular :model-value="getCapacityPercentage()" :size="180" :width="12"
                    :color="capacity.canAdd ? 'success' : 'error'" class="capacity-progress">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold">{{ capacity.currentStudents }}</div>
                      <div class="text-caption text-medium-emphasis">من {{ capacity.maxStudents }}</div>
                    </div>
                  </VProgressCircular>
                </div>
              </div>

              <VRow>
                <VCol cols="6">
                  <VCard color="success" variant="tonal" class="pa-4 text-center">
                    <VIcon size="24" color="success" class="mb-2">mdi-check-circle</VIcon>
                    <div class="text-h6 font-weight-bold">{{ capacity.remaining }}</div>
                    <div class="text-caption">مقعد متبقي</div>
                  </VCard>
                </VCol>
                <VCol cols="6">
                  <VCard :color="capacity.canAdd ? 'success' : 'error'" variant="tonal" class="pa-4 text-center">
                    <VIcon size="24" :color="capacity.canAdd ? 'success' : 'error'" class="mb-2">
                      {{ capacity.canAdd ? 'mdi-account-plus' : 'mdi-account-off' }}
                    </VIcon>
                    <div class="text-caption font-weight-bold">
                      {{ capacity.canAdd ? 'يمكن إضافة طلاب' : 'السعة مكتملة' }}
                    </div>
                  </VCard>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Enhanced referral section with better visual presentation -->
        <VCol cols="12" lg="6">
          <VCard class="referral-card h-100" elevation="4">
            <VCardText class="pa-6">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <h3 class="text-h5 font-weight-bold mb-1">برنامج إحالة المعلمين</h3>
                  <p class="text-body-2 text-medium-emphasis">احصل على مقاعد إضافية عند دعوة معلمين جدد</p>
                </div>
              </div>

              <VAlert v-if="referralError" type="error" variant="tonal" class="mb-4" density="comfortable">
                {{ referralError }}
              </VAlert>

              <div v-if="referralLoading" class="d-flex justify-center py-8">
                <VProgressCircular indeterminate color="primary" size="48" />
              </div>

              <template v-else>
                <VRow class="mb-4">
                  <VCol cols="12" md="6">
                    <VCard color="primary" variant="tonal" class="pa-4">
                      <div class="text-caption mb-2">كود الدعوة</div>
                      <div class="d-flex align-center gap-2">
                        <code class="text-h6 font-weight-bold flex-grow-1">{{ referralDashboard.referralCode }}</code>
                        <VBtn icon size="small" variant="text"
                          @click="() => copyToClipboard(referralDashboard.referralCode)">
                          <VIcon>mdi-content-copy</VIcon>
                        </VBtn>
                      </div>
                    </VCard>
                  </VCol>
                  <VCol cols="12" md="6">
                    <VCard color="secondary" variant="tonal" class="pa-4">
                      <div class="text-caption mb-2">رابط الدعوة</div>
                      <VBtn block size="small" variant="flat" color="secondary"
                        @click="() => copyToClipboard('https://mulhimiq.com' + referralDashboard.referralLink)">
                        <VIcon start size="18">mdi-link-variant</VIcon>
                        نسخ الرابط
                      </VBtn>
                    </VCard>
                  </VCol>
                </VRow>

                <VRow class="mb-4">
                  <VCol cols="6" sm="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-primary">{{ referralDashboard.referrals.total }}</div>
                      <div class="text-caption text-medium-emphasis">الإجمالي</div>
                    </div>
                  </VCol>
                  <VCol cols="6" sm="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-success">{{ referralDashboard.referrals.completed }}
                      </div>
                      <div class="text-caption text-medium-emphasis">مكتملة</div>
                    </div>
                  </VCol>
                  <VCol cols="6" sm="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-warning">{{ referralDashboard.referrals.pending }}</div>
                      <div class="text-caption text-medium-emphasis">قيد الانتظار</div>
                    </div>
                  </VCol>
                  <VCol cols="6" sm="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-info">{{ referralDashboard.bonuses.totalBonusSeats }}
                      </div>
                      <div class="text-caption text-medium-emphasis">مقاعد إضافية</div>
                    </div>
                  </VCol>
                </VRow>

                <VDivider class="my-4" />

                <div class="text-subtitle-2 mb-3 font-weight-bold">المكافآت الفعّالة</div>
                <VAlert v-if="!referralDashboard.bonuses.activeBonuses.length" type="info" variant="tonal"
                  density="comfortable">
                  لا توجد مكافآت فعّالة حالياً
                </VAlert>
                <div v-else class="bonuses-list">
                  <VCard v-for="b in referralDashboard.bonuses.activeBonuses" :key="b.id" class="pa-3 mb-2"
                    variant="tonal" color="success">
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="font-weight-bold">{{ b.bonusType === 'referral_referrer' ? 'مقاعد إحالة' : 'مكافأة'
                        }}</div>
                        <div class="text-caption">{{ b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('ar-IQ') :
                          'بدون انتهاء' }}</div>
                      </div>
                      <VChip color="success" size="small">{{ b.bonusValue }} مقعد</VChip>
                    </div>
                  </VCard>
                </div>
              </template>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Financial overview with progress bars and better visualization -->
      <VRow class="mb-8">
        <VCol cols="12">
          <h2 class="text-h4 mb-6 font-weight-bold d-flex align-center gap-2">
            <VIcon color="primary" size="32">mdi-cash-multiple</VIcon>
            نظرة عامة على المدفوعات
          </h2>
        </VCol>

        <VCol cols="12" lg="6">
          <VCard class="financial-card h-100" elevation="4">
            <VCardText class="pa-6">
              <div class="d-flex align-center gap-3 mb-4">
                <div class="financial-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                  <VIcon size="32" color="white">mdi-cash-register</VIcon>
                </div>
                <div>
                  <h3 class="text-h6 font-weight-bold">فواتير العربون</h3>
                  <p class="text-caption text-medium-emphasis mb-0">إجمالي ومدفوعات العربون</p>
                </div>
              </div>

              <div class="mb-4">
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-body-2">نسبة التحصيل</span>
                  <span class="text-h6 font-weight-bold text-success">{{ getDepositPercentage() }}%</span>
                </div>
                <VProgressLinear :model-value="getDepositPercentage()" color="success" height="8" rounded />
              </div>

              <VRow>
                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center pa-3 rounded"
                    style="background-color: rgba(var(--v-theme-primary), 0.1);">
                    <div>
                      <VIcon size="20" color="primary" class="me-2">mdi-cash</VIcon>
                      <span class="text-body-2">إجمالي العربون</span>
                    </div>
                    <span class="text-h6 font-weight-bold">{{ formatIQD(stats.totalDeposit) }}</span>
                  </div>
                </VCol>
                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center pa-3 rounded"
                    style="background-color: rgba(var(--v-theme-success), 0.1);">
                    <div>
                      <VIcon size="20" color="success" class="me-2">mdi-cash-check</VIcon>
                      <span class="text-body-2">المستلم</span>
                    </div>
                    <span class="text-h6 font-weight-bold text-success">{{ formatIQD(stats.receivedDeposit) }}</span>
                  </div>
                </VCol>
                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center pa-3 rounded"
                    style="background-color: rgba(var(--v-theme-warning), 0.1);">
                    <div>
                      <VIcon size="20" color="warning" class="me-2">mdi-cash-minus</VIcon>
                      <span class="text-body-2">المتبقي</span>
                    </div>
                    <span class="text-h6 font-weight-bold text-warning">{{ formatIQD(stats.remainingDeposit) }}</span>
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="6">
          <VCard class="financial-card h-100" elevation="4">
            <VCardText class="pa-6">
              <div class="d-flex align-center gap-3 mb-4">
                <div class="financial-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                  <VIcon size="32" color="white">mdi-receipt-text</VIcon>
                </div>
                <div>
                  <h3 class="text-h6 font-weight-bold">فواتير الطلاب</h3>
                  <p class="text-caption text-medium-emphasis mb-0">المستحقات والمدفوعات</p>
                </div>
              </div>

              <div class="mb-4">
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-body-2">نسبة السداد</span>
                  <span class="text-h6 font-weight-bold text-success">{{ getStudentPaidPercentage() }}%</span>
                </div>
                <VProgressLinear :model-value="getStudentPaidPercentage()" color="success" height="8" rounded />
              </div>

              <VRow>
                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center pa-3 rounded"
                    style="background-color: rgba(var(--v-theme-primary), 0.1);">
                    <div>
                      <VIcon size="20" color="primary" class="me-2">mdi-receipt</VIcon>
                      <span class="text-body-2">إجمالي المستحق</span>
                    </div>
                    <span class="text-h6 font-weight-bold">{{ formatIQD(stats.studentTotalDue) }}</span>
                  </div>
                </VCol>
                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center pa-3 rounded"
                    style="background-color: rgba(var(--v-theme-success), 0.1);">
                    <div>
                      <VIcon size="20" color="success" class="me-2">mdi-cash-check</VIcon>
                      <span class="text-body-2">المدفوع</span>
                    </div>
                    <span class="text-h6 font-weight-bold text-success">{{ formatIQD(stats.studentAmountPaid) }}</span>
                  </div>
                </VCol>
                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center pa-3 rounded"
                    style="background-color: rgba(var(--v-theme-warning), 0.1);">
                    <div>
                      <VIcon size="20" color="warning" class="me-2">mdi-cash-minus</VIcon>
                      <span class="text-body-2">المتبقي</span>
                    </div>
                    <span class="text-h6 font-weight-bold text-warning">{{ formatIQD(stats.studentAmountRemaining)
                    }}</span>
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Enhanced upcoming sessions with modern card design -->
      <VRow class="mb-8">
        <VCol cols="12">
          <h2 class="text-h4 mb-6 font-weight-bold d-flex align-center gap-2">
            <VIcon color="primary" size="32">mdi-calendar-clock</VIcon>
            الدروس القادمة اليوم
          </h2>
        </VCol>

        <VCol cols="12" v-if="isLoadingUpcoming">
          <div class="d-flex justify-center align-center" style="min-block-size: 200px;">
            <div class="text-center">
              <VProgressCircular indeterminate color="primary" size="48" />
              <p class="mt-4 text-medium-emphasis">جاري تحميل الدروس...</p>
            </div>
          </div>
        </VCol>

        <VCol cols="12" v-else-if="!upcomingToday.length">
          <VCard class="pa-8 text-center" elevation="2">
            <VIcon size="80" color="grey-lighten-1" class="mb-4">mdi-calendar-blank</VIcon>
            <h3 class="text-h5 mb-2">لا توجد دروس قادمة اليوم</h3>
            <p class="text-body-2 text-medium-emphasis">استمتع بيومك! 🎉</p>
          </VCard>
        </VCol>

        <template v-else>
          <VCol v-for="item in upcomingToday" :key="item.sessionId" cols="12" sm="6" lg="4">
            <VCard class="session-card h-100" elevation="3" hover>
              <div class="session-card-accent" :style="{
                background: item.state === 'confirmed' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                  item.state === 'pending' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
              }">
              </div>
              <VCardText class="pa-6">
                <div class="d-flex justify-space-between align-center mb-3">
                  <VChip
                    :color="item.state === 'confirmed' ? 'success' : (item.state === 'pending' ? 'warning' : 'default')"
                    size="small" variant="flat">
                    <VIcon start size="16">
                      {{ item.state === 'confirmed' ? 'mdi-check-circle' :
                        item.state === 'pending' ? 'mdi-clock-outline' : 'mdi-close-circle' }}
                    </VIcon>
                    {{ translateState(item.state) }}
                  </VChip>
                </div>

                <h4 class="text-h6 font-weight-bold mb-2">{{ item.title }}</h4>
                <p class="text-body-2 text-medium-emphasis mb-3">{{ item.courseName || 'دورة' }}</p>

                <div class="d-flex align-center gap-2 text-body-2">
                  <VIcon size="18" color="primary">mdi-clock-outline</VIcon>
                  <span>{{ item.startTime }} - {{ item.endTime }}</span>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </template>
      </VRow>

      <!-- Snackbar للتنبيهات -->
      <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="bottom" timeout="3000" rounded="pill">
        <div class="d-flex align-center gap-2">
          <VIcon>{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</VIcon>
          {{ snackbar.text }}
        </div>
      </VSnackbar>
    </VContainer>
  </div>
</template>

<style scoped>
/* Added comprehensive modern styles with gradients, animations, and enhanced visual design */
.teacher-dashboard {
  background: linear-gradient(to bottom, #f8f9fa 0%, #fff 100%);
  min-block-size: 100vh;
}

/* Welcome Card Styles */
.welcome-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px !important;
}

.welcome-gradient {
  position: absolute;
  background: linear-gradient(135deg, #52657b 0%, #0b2545 100%);
  inset: 0;
  opacity: 1;
}

.welcome-text h1 {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 10%);
}

.avatar-glow {
  box-shadow: 0 8px 24px rgba(102, 126, 234, 40%);
  transition: transform 0.3s ease;
}

.avatar-glow:hover {
  transform: scale(1.05);
}

.qr-card {
  border-radius: 16px !important;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 95%) !important;
}

.qr-image {
  padding: 8px;
  border-radius: 12px;
  background: white;
  block-size: 120px;
  inline-size: 120px;
  object-fit: contain;
}

/* Stat Cards */
.stat-card {
  border: 1px solid rgba(0, 0, 0, 5%);
  border-radius: 16px !important;
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 10%) !important;
  transform: translateY(-4px);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  block-size: 56px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 15%);
  inline-size: 56px;
}

.stat-icon-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.stat-icon-info {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon-warning {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

/* Capacity and Referral Cards */
.capacity-card,
.referral-card {
  border: 1px solid rgba(0, 0, 0, 5%);
  border-radius: 20px !important;
}

.capacity-progress {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 10%));
}

/* Financial Cards */
.financial-card {
  border: 1px solid rgba(0, 0, 0, 5%);
  border-radius: 20px !important;
}

.financial-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  block-size: 56px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 15%);
  inline-size: 56px;
}

/* Session Cards */
.session-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 5%);
  border-radius: 16px !important;
  transition: all 0.3s ease;
}

.session-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 15%) !important;
  transform: translateY(-4px);
}

.session-card-accent {
  position: absolute;
  block-size: 4px;
  inset-block-start: 0;
  inset-inline: 0;
}

/* Bonuses List */
.bonuses-list {
  max-block-size: 200px;
  overflow-y: auto;
}

.bonuses-list::-webkit-scrollbar {
  inline-size: 6px;
}

.bonuses-list::-webkit-scrollbar-track {
  border-radius: 10px;
  background: rgba(0, 0, 0, 5%);
}

.bonuses-list::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(0, 0, 0, 20%);
}

.bonuses-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 30%);
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .welcome-text h1 {
    font-size: 1.75rem !important;
  }

  .stat-card {
    margin-block-end: 12px;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.v-card {
  animation: fadeIn 0.5s ease-out;
}
</style>
