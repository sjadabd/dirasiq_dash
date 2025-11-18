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
</script>

<template>
  <div class="teacher-dashboard">
    <VContainer fluid class="pa-6">
      <!-- ترحيب -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard color="primary" variant="tonal" class="pa-6">
            <VRow align="center">
              <VCol cols="12" md="6" style="display: flex; flex-flow: row wrap; align-items: center; gap: 8px;">
                <VAvatar size="80" color="primary">
                  <VImg v-if="user?.profileImagePath" :src="`https://api.mulhimiq.com${user.profileImagePath}`"
                    alt="User Avatar" cover />
                  <VIcon v-else size="40">mdi-account</VIcon>
                </VAvatar>
                <div>
                  <h1 class="text-h4 mb-2">مرحباً {{ user?.name }}! 👋</h1>
                  <p class="text-body-1 mb-0">
                    {{ user?.email }}
                  </p>
                  <p class="text-caption mt-2">
                    عضو منذ
                    {{ new Date(user?.createdAt).toLocaleDateString("en-IQ") }}
                  </p>
                </div>
              </VCol>
              <VCol cols="12" md="6" class="text-center" style="display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;">

                <div style="display: flex; flex-flow: row wrap; align-items: center; gap: 8px;">
                  <div>
                    <p class="mb-0" style=" color: rgba(0, 0, 0, 70%);font-size: 12px;">رمز تسجيل حضور الطلاب عن طريق
                      التطبيق</p>
                    <img style=" block-size: 80px;inline-size: 80px; object-fit: contain;" v-if="user?.qr"
                      :src="`https://api.mulhimiq.com${user.qr}`" alt="رمز حضور الطلاب" />
                  </div>
                </div>
                <VBtn v-if="user?.qr" size="small" variant="tonal" color="primary" @click="printQr">
                  <VIcon start size="18">mdi-printer</VIcon>
                  طباعة الرمز
                </VBtn>
              </VCol>
            </VRow>
          </VCard>
        </VCol>
      </VRow>

      <!-- الإحصائيات -->
      <VRow class="mb-6" style="justify-content: center;">

        <!-- سعة الاشتراك للطلاب -->
        <VCol cols="12" md="12">
          <VCard class="pa-4" elevation="2">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center gap-2">
                <VIcon size="28" color="primary">mdi-account-group</VIcon>
                <div>
                  <div class="text-subtitle-1 fw-600">سعة اشتراك الطلاب</div>
                  <div class="text-caption text-medium-emphasis">
                    تقرير بعدد الطلاب المسموح به والمتبقّي في باقتك الحالية
                  </div>
                </div>
              </div>
              <VBtn size="small" variant="text" :loading="capacityLoading" @click="() => {
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
                تحديث
              </VBtn>
            </div>

            <VAlert v-if="capacityError" type="error" variant="tonal" class="mb-3" density="comfortable">
              {{ capacityError }}
            </VAlert>

            <div class="d-flex flex-wrap gap-4">
              <div>
                <div class="text-caption text-medium-emphasis">الطلاب الحاليون</div>
                <div class="text-h6 font-weight-bold">
                  {{ capacity.currentStudents }}
                </div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">الحد الأقصى في الباقة</div>
                <div class="text-h6 font-weight-bold">
                  {{ capacity.maxStudents }}
                </div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">المتبقّي</div>
                <div class="text-h6 font-weight-bold">
                  {{ capacity.remaining }}
                </div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">إمكانية إضافة طلاب جدد</div>
                <div class="text-subtitle-2 font-weight-bold" :class="capacity.canAdd ? 'text-success' : 'text-error'">
                  {{ capacity.canAdd ? 'يمكن إضافة طلاب جدد' : 'لا يمكن إضافة طلاب جدد' }}
                </div>
              </div>
            </div>
          </VCard>
        </VCol>

        <!-- برنامج الإحالات للمعلم -->
        <VCol cols="12" md="12">
          <VCard class="pa-4" elevation="2">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center gap-2">
                <VIcon size="28" color="secondary">mdi-account-multiple-plus</VIcon>
                <div>
                  <div class="text-subtitle-1 fw-600">برنامج إحالة المعلمين</div>
                  <div class="text-caption text-medium-emphasis">
                    شارك كود الدعوة الخاص بك لتحصل على مقاعد إضافية عند اشتراك المعلمين المدعوين
                  </div>
                </div>
              </div>
            </div>

            <VAlert v-if="referralError" type="error" variant="tonal" class="mb-3" density="comfortable">
              {{ referralError }}
            </VAlert>

            <div v-if="referralLoading" class="d-flex justify-center py-4">
              <VProgressCircular indeterminate color="primary" size="32" />
            </div>

            <template v-else>
              <!-- كود الدعوة والرابط -->
              <div class="d-flex flex-column flex-md-row gap-4 mb-4">
                <div class="flex-grow-1">
                  <div class="text-caption text-medium-emphasis mb-1">كود الدعوة الخاص بك</div>
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <VBtn size="small" variant="tonal" color="primary"
                      @click="() => copyToClipboard(referralDashboard.referralCode)">
                      نسخ الكود
                    </VBtn>
                  </div>
                </div>
                <div class="flex-grow-1">
                  <div class="text-caption text-medium-emphasis mb-1">رابط الدعوة للمشاركة</div>
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <VBtn size="small" variant="tonal" color="secondary"
                      @click="() => copyToClipboard('https://mulhimiq.com' + referralDashboard.referralLink)">
                      نسخ رابط الدعوة
                    </VBtn>
                  </div>
                </div>
              </div>

              <!-- كروت الإحصائيات -->
              <div class="d-flex flex-wrap gap-4 mb-4">
                <div>
                  <div class="text-caption text-medium-emphasis">إجمالي الإحالات</div>
                  <div class="text-h6 font-weight-bold">
                    {{ referralDashboard.referrals.total }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-medium-emphasis">الإحالات المكتملة</div>
                  <div class="text-h6 font-weight-bold">
                    {{ referralDashboard.referrals.completed }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-medium-emphasis">قيد الانتظار</div>
                  <div class="text-h6 font-weight-bold">
                    {{ referralDashboard.referrals.pending }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-medium-emphasis">إجمالي المقاعد الإضافية من الإحالات</div>
                  <div class="text-h6 font-weight-bold">
                    {{ referralDashboard.bonuses.totalBonusSeats }}
                  </div>
                </div>
              </div>

              <!-- جدول المكافآت الفعّالة -->
              <div>
                <div class="text-subtitle-2 mb-2">المكافآت الفعّالة حالياً</div>
                <VAlert v-if="!referralDashboard.bonuses.activeBonuses.length" type="info" variant="tonal"
                  density="comfortable">
                  لا توجد مكافآت إحالة فعّالة حالياً.
                </VAlert>
                <VTable v-else density="comfortable">
                  <thead>
                    <tr>
                      <th class="text-start">نوع المكافأة</th>
                      <th class="text-start">عدد المقاعد</th>
                      <th class="text-start">ينتهي في</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="b in referralDashboard.bonuses.activeBonuses" :key="b.id">
                      <td>
                        {{ b.bonusType === 'referral_referrer' ? 'مقاعد إحالة' : (b.bonusType || 'مكافأة') }}
                      </td>
                      <td>{{ b.bonusValue }}</td>
                      <td>
                        {{ b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('en-IQ') : '—' }}
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </template>
          </VCard>
        </VCol>

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

      <!-- Snackbar للتنبيهات العامة (مثل نجاح/فشل النسخ) -->
      <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="bottom right" timeout="3000">
        {{ snackbar.text }}
      </VSnackbar>
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
