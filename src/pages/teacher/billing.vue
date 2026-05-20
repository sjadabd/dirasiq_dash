<script setup>
// =====================================================
// Teacher Billing v2 — rebuilt 2026-05-17.
// Brand-aligned plan & subscription control:
//   • Hero with current plan + status pill
//   • 3-card top row: Active Plan / Capacity / Wallet (with topup)
//   • Integrated pricing cards (no external AppPricing dep — branded)
//   • Wayl flow preserved for paid plans, instant activation for free
//   • FAQ accordion at the bottom
// =====================================================

import teacher_api from "@/api/teacher/teacher_api";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

definePage({ meta: { layout: "default", requiresAuth: true } });

const router = useRouter();

// ---- State ----------------------------------------------------------------
const capacity = ref({ currentStudents: 0, maxStudents: 0, remaining: 0, canAdd: false });
const capacityLoading = ref(false);
const capacityError = ref("");

const wallet = ref({ balance: 0 });
const walletLoading = ref(false);

const plans = ref([]);
const plansLoading = ref(true);
const plansError = ref("");

const topupDialog = ref(false);
const topupAmount = ref(50000);
const topupSubmitting = ref(false);

const snackbar = ref({ show: false, message: "", color: "success" });

// Track which plan card is currently submitting (loading per card).
const planSubmitting = ref(null); // plan id

// ---- Derived --------------------------------------------------------------
const currentPlan = computed(() => plans.value.find(p => p.current) || null);

const capacityPct = computed(() => {
  if (!capacity.value.maxStudents) return 0;
  return Math.min(100, Math.round((capacity.value.currentStudents / capacity.value.maxStudents) * 100));
});

// ---- Formatters -----------------------------------------------------------
function formatIQD(n) {
  return new Intl.NumberFormat("en-IQ").format(Number(n) || 0) + " د.ع";
}
function formatIQDShort(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M د.ع";
  if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K د.ع";
  return new Intl.NumberFormat("en-IQ").format(num) + " د.ع";
}

// ---- Data loaders ---------------------------------------------------------
async function fetchCapacity() {
  capacityLoading.value = true;
  capacityError.value = "";
  try {
    const res = await teacher_api.getRemainingStudents();
    const ok = res?.data?.success || res?.success;
    const data = res?.data?.data || res?.data || res;
    if (!ok || !data) throw new Error(res?.data?.message || "تعذر جلب تقرير السعة");
    capacity.value = {
      currentStudents: Number(data.currentStudents) || 0,
      maxStudents: Number(data.maxStudents) || 0,
      remaining: Number(data.remaining) || 0,
      canAdd: Boolean(data.canAdd),
    };
  } catch (e) {
    capacityError.value = e?.response?.data?.message || e?.message || "تعذر جلب السعة";
  } finally {
    capacityLoading.value = false;
  }
}

async function fetchWallet() {
  walletLoading.value = true;
  try {
    const res = await teacher_api.getWallet();
    const d = res?.data?.data || res?.data || {};
    wallet.value = { balance: Number(d.balance) || 0 };
  } catch (e) {
    console.warn("wallet load failed:", e);
  } finally {
    walletLoading.value = false;
  }
}

async function fetchPlans() {
  plansLoading.value = true;
  plansError.value = "";
  try {
    const res = await teacher_api.getActivePackages();
    // Normalize wrapped responses
    const inner = res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
    const items = Array.isArray(inner) ? inner : (Array.isArray(inner?.data) ? inner.data : []);
    if (!Array.isArray(items)) throw new Error("الاستجابة غير متوقعة");

    plans.value = items
      .map(p => {
        const isFree = p.isFree || Number(p.price) === 0;
        return {
          id: p.id,
          name: p.name,
          description: p.description || (isFree ? "مجانية للمعلمين الجدد" : "ميزات متقدمة"),
          isFree,
          price: Number(p.price) || 0,
          maxStudents: Number(p.maxStudents) || 0,
          durationDays: Number(p.durationDays) || 30,
          current: !!p.current,
          features: buildFeatureList(p, isFree),
        };
      })
      .sort((a, b) => a.price - b.price);

    // Mark the middle paid plan as "popular" if none flagged from server
    const paidPlans = plans.value.filter(p => !p.isFree);
    if (paidPlans.length >= 2 && !plans.value.some(p => p.popular)) {
      const mid = paidPlans[Math.floor(paidPlans.length / 2) - (paidPlans.length === 2 ? 1 : 0)];
      if (mid) mid.popular = true;
    }
  } catch (e) {
    plansError.value = e?.response?.data?.message || "تعذّر تحميل الباقات";
    plans.value = [];
  } finally {
    plansLoading.value = false;
  }
}

function buildFeatureList(p, isFree) {
  return [
    `حتى ${p.maxStudents} طالب`,
    p.durationDays === 30 ? "اشتراك شهري متجدد" : `اشتراك ${p.durationDays} يوم`,
    isFree ? "بدون بطاقة بنكية" : "دفع آمن عبر بوابة Wayl",
    "حضور بـ QR Code + إشعارات Push",
    "فواتير ودفعات للطلاب",
    isFree ? "دعم فني عبر البريد" : "أولوية الدعم الفني",
  ];
}

// ---- Plan actions ---------------------------------------------------------
async function choosePlan(plan) {
  if (plan.current) return;
  planSubmitting.value = plan.id;
  try {
    if (plan.isFree) {
      // Direct activation flow
      const res = await teacher_api.activateSubscriptionPackage(plan.id);
      const ok = res?.data?.success || res?.success;
      const msg = res?.data?.message || `تم تفعيل ${plan.name} بنجاح`;
      snackbar.value = { show: true, message: msg, color: ok ? "success" : "error" };
      if (ok) await Promise.all([fetchPlans(), fetchCapacity()]);
      return;
    }
    // Paid → Wayl link
    const res = await teacher_api.createWaylSubscriptionLink(plan.id);
    const ok = res?.data?.success || res?.success;
    const data = res?.data?.data || res?.data || res;
    if (!ok || !data?.url) throw new Error(res?.data?.message || "تعذّر إنشاء رابط الدفع");

    localStorage.setItem(
      "pending_wayl_action",
      JSON.stringify({ type: "subscription", createdAt: Date.now(), packageId: plan.id }),
    );

    router.push({ path: "/teacher/payment/redirecting", query: { url: data.url } });
  } catch (e) {
    snackbar.value = {
      show: true,
      message: e?.response?.data?.message || e?.message || "تعذّر تنفيذ العملية",
      color: "error",
    };
  } finally {
    planSubmitting.value = null;
  }
}

// ---- Wallet topup ---------------------------------------------------------
async function submitTopup() {
  if (!topupAmount.value || topupAmount.value < 1000) {
    snackbar.value = { show: true, message: "الحد الأدنى لشحن المحفظة 1,000 د.ع", color: "error" };
    return;
  }
  topupSubmitting.value = true;
  try {
    const res = await teacher_api.createWaylTopupLink(Number(topupAmount.value));
    const ok = res?.data?.success || res?.success;
    const data = res?.data?.data || res?.data || res;
    if (!ok || !data?.url) throw new Error(res?.data?.message || "تعذّر إنشاء رابط الدفع");

    localStorage.setItem(
      "pending_wayl_action",
      JSON.stringify({ type: "wallet_topup", createdAt: Date.now(), amount: Number(topupAmount.value) }),
    );

    topupDialog.value = false;
    router.push({ path: "/teacher/payment/redirecting", query: { url: data.url } });
  } catch (e) {
    snackbar.value = {
      show: true,
      message: e?.response?.data?.message || e?.message || "تعذّر بدء عملية الشحن",
      color: "error",
    };
  } finally {
    topupSubmitting.value = false;
  }
}

const topupQuickAmounts = [25000, 50000, 100000, 250000];

// ---- FAQ ------------------------------------------------------------------
const faqs = [
  {
    q: "ما الفرق بين الباقات؟",
    a: "الفرق الأساسي هو الحد الأقصى لعدد الطلاب الذي يمكنك استقبالهم في الباقة. كل الباقات تشمل كل ميزات المنصة (حضور QR، فواتير، إشعارات، إلخ).",
  },
  {
    q: "كيف يمكنني الترقية بين الباقات؟",
    a: "اختر الباقة الجديدة من القائمة أعلاه. ستُحوّل لبوابة الدفع Wayl لإكمال العملية بأمان، وستُفعّل الباقة فور التأكد من الدفع.",
  },
  {
    q: "ماذا يحدث عند انتهاء الاشتراك؟",
    a: "ستتلقى تنبيهات قبل الانتهاء بأيام، يمكنك بعدها تجديد الاشتراك أو الترقية لباقة أعلى. حسابك لا يُحذف وبياناتك محفوظة بالكامل.",
  },
  {
    q: "هل يمكن استرجاع المبلغ المدفوع؟",
    a: "نعم خلال 7 أيام من تاريخ الدفع، شرط ألا يكون قد بدأ استخدام الباقة فعلياً. تواصل مع الدعم الفني للاستفسار.",
  },
];

// ---- Lifecycle ------------------------------------------------------------
onMounted(async () => {
  await Promise.all([fetchPlans(), fetchCapacity(), fetchWallet()]);
});
</script>

<template>
  <div class="billing-page">
    <!-- 1. HERO ============================================== -->
    <VCard class="hero-card mb-4" elevation="0" rounded="lg">
      <div class="hero-mesh" />
      <VCardItem class="position-relative">
        <VRow align="center" class="g-3">
          <VCol cols="12" md="8">
            <div class="d-flex align-center gap-3 flex-wrap">
              <VAvatar size="64" color="warning" class="hero-avatar">
                <VIcon size="32" color="white">ri-vip-crown-line</VIcon>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="hero-greet">الفوترة والاشتراك</div>
                <h1 class="hero-name">إدارة باقتك والمحفظة</h1>
                <div class="hero-sub">
                  اختر الباقة الأنسب لحجم عملك، تابع رصيد محفظتك، وحدّث اشتراكك بأمان.
                </div>
              </div>
            </div>
          </VCol>
          <VCol cols="12" md="4" class="text-md-end">
            <VBtn color="white" variant="text" prepend-icon="ri-arrow-right-line"
              to="/teacher/dashboard" class="back-link">
              عودة للوحة التحكم
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- 2. TOP STAT ROW ====================================== -->
    <VRow class="mb-2" dense>
      <!-- Active plan -->
      <VCol cols="12" md="4">
        <VCard class="panel h-100" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="primary" class="me-2">ri-vip-crown-line</VIcon>
            <span>الباقة النشطة</span>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <template v-if="plansLoading">
              <VSkeletonLoader type="paragraph" />
            </template>
            <template v-else-if="currentPlan">
              <h2 class="current-name">{{ currentPlan.name }}</h2>
              <div class="current-price">
                <span v-if="currentPlan.isFree" class="text-success">مجانية</span>
                <template v-else>{{ formatIQD(currentPlan.price) }}<span class="period"> / شهر</span></template>
              </div>
              <div class="current-meta">
                <VIcon size="16" class="me-1">ri-group-line</VIcon>
                حتى {{ currentPlan.maxStudents }} طالب
              </div>
            </template>
            <template v-else>
              <div class="empty-block py-4">
                <VIcon size="36" color="grey-lighten-1">ri-vip-line</VIcon>
                <div class="mt-2">لا توجد باقة فعّالة</div>
                <p class="text-caption">اختر باقة من القائمة أدناه.</p>
              </div>
            </template>
          </VCardItem>
        </VCard>
      </VCol>

      <!-- Capacity -->
      <VCol cols="12" md="4">
        <VCard class="panel h-100" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="info" class="me-2">ri-account-circle-line</VIcon>
            <span>سعة الاشتراك</span>
            <VSpacer />
            <VBtn icon="ri-refresh-line" size="x-small" variant="text"
              :loading="capacityLoading" @click="fetchCapacity" />
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <VAlert v-if="capacityError" type="error" variant="tonal" density="compact" class="mb-2">
              {{ capacityError }}
            </VAlert>
            <div class="cap-row">
              <div class="cap-circle-wrap">
                <VProgressCircular :model-value="capacityPct" :size="84" :width="9"
                  :color="capacity.canAdd ? 'success' : 'error'">
                  <div class="cap-circle-text">
                    <div class="cap-now">{{ capacity.currentStudents }}</div>
                    <div class="cap-of">من {{ capacity.maxStudents }}</div>
                  </div>
                </VProgressCircular>
              </div>
              <div class="cap-meta">
                <div class="cap-meta-row">
                  <span class="cap-meta-label">المتبقي</span>
                  <span class="cap-meta-value text-success">{{ capacity.remaining }}</span>
                </div>
                <div class="cap-meta-row">
                  <span class="cap-meta-label">الحالة</span>
                  <span class="cap-meta-value" :class="capacity.canAdd ? 'text-success' : 'text-error'">
                    {{ capacity.canAdd ? "متاحة" : "ممتلئة" }}
                  </span>
                </div>
              </div>
            </div>
          </VCardItem>
        </VCard>
      </VCol>

      <!-- Wallet -->
      <VCol cols="12" md="4">
        <VCard class="panel wallet-panel h-100" elevation="0" rounded="lg" border>
          <VCardTitle class="panel-head">
            <VIcon color="warning" class="me-2">ri-wallet-3-line</VIcon>
            <span>المحفظة</span>
            <VSpacer />
            <VBtn icon="ri-refresh-line" size="x-small" variant="text"
              :loading="walletLoading" @click="fetchWallet" />
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <div class="wallet-label">الرصيد الحالي</div>
            <div class="wallet-value">{{ formatIQDShort(wallet.balance) }}</div>
            <VBtn block color="warning" variant="flat" rounded="lg" prepend-icon="ri-add-circle-line"
              class="mt-3 topup-btn" @click="topupDialog = true">
              شحن المحفظة
            </VBtn>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- 3. PRICING SECTION =================================== -->
    <VCard class="panel mb-4" elevation="0" rounded="lg" border>
      <VCardTitle class="panel-head">
        <VIcon color="primary" class="me-2">ri-price-tag-3-line</VIcon>
        <span>اختر الباقة الأنسب</span>
        <VSpacer />
        <VChip v-if="!plansLoading" size="small" variant="tonal" color="primary">
          {{ plans.length }} باقة متاحة
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VAlert v-if="plansError" type="error" variant="tonal" class="mb-4">{{ plansError }}</VAlert>

        <!-- Skeleton -->
        <VRow v-if="plansLoading" dense>
          <VCol v-for="n in 3" :key="n" cols="12" md="4">
            <VSkeletonLoader type="card" />
          </VCol>
        </VRow>

        <!-- Empty -->
        <div v-else-if="!plans.length" class="empty-block py-8">
          <VIcon size="48" color="grey-lighten-1">ri-archive-line</VIcon>
          <h3 class="text-h6 mt-3">لا توجد باقات منشورة</h3>
          <p class="text-caption">تواصل مع الإدارة لإتاحة الباقات.</p>
        </div>

        <!-- Cards -->
        <VRow v-else dense justify="center">
          <VCol v-for="plan in plans" :key="plan.id" cols="12" md="4">
            <VCard class="plan-card h-100" :class="{ featured: plan.popular, current: plan.current }"
              elevation="0" rounded="lg">
              <!-- Badges -->
              <div v-if="plan.current" class="plan-badge plan-badge-current">
                <VIcon size="14" start>ri-check-line</VIcon>
                باقتك الحالية
              </div>
              <div v-else-if="plan.popular" class="plan-badge plan-badge-popular">
                <VIcon size="14" start>ri-star-fill</VIcon>
                الأكثر شعبية
              </div>

              <VCardItem>
                <div class="plan-icon-wrap" :class="{ 'is-featured': plan.popular || plan.current }">
                  <VIcon size="28" :color="plan.popular || plan.current ? 'white' : 'primary'">
                    {{ plan.isFree ? "ri-gift-2-line" : plan.popular ? "ri-vip-crown-line" : "ri-medal-line" }}
                  </VIcon>
                </div>
                <h3 class="plan-name">{{ plan.name }}</h3>
                <p class="plan-desc">{{ plan.description }}</p>
                <div class="plan-price-wrap">
                  <template v-if="plan.isFree">
                    <span class="plan-price-num">0</span>
                    <span class="plan-price-currency">د.ع</span>
                    <div class="plan-price-period">مجاناً للمعلمين الجدد</div>
                  </template>
                  <template v-else>
                    <span class="plan-price-num">{{ new Intl.NumberFormat("en-IQ").format(plan.price) }}</span>
                    <span class="plan-price-currency">د.ع</span>
                    <div class="plan-price-period">/ {{ plan.durationDays === 30 ? "شهر" : `${plan.durationDays} يوم` }}</div>
                  </template>
                </div>

                <VDivider class="my-4" />

                <ul class="plan-features">
                  <li v-for="(f, i) in plan.features" :key="i">
                    <VIcon size="18" :color="plan.popular || plan.current ? 'success' : 'success'" class="me-2">
                      ri-check-line
                    </VIcon>
                    {{ f }}
                  </li>
                </ul>

                <VBtn block size="large" rounded="lg" class="mt-4 plan-cta" :disabled="plan.current"
                  :color="plan.current ? 'success' : plan.popular ? 'primary' : 'primary'"
                  :variant="plan.current ? 'tonal' : plan.popular ? 'flat' : 'outlined'"
                  :loading="planSubmitting === plan.id" @click="choosePlan(plan)">
                  <VIcon start>
                    {{ plan.current ? "ri-check-double-line" : plan.isFree ? "ri-flashlight-line" : "ri-secure-payment-line" }}
                  </VIcon>
                  {{ plan.current ? "هذه باقتك الحالية" : plan.isFree ? "فعّل مجاناً" : "اختر هذه الباقة" }}
                </VBtn>
              </VCardItem>
            </VCard>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- 4. FAQ =============================================== -->
    <VCard class="panel mb-4" elevation="0" rounded="lg" border>
      <VCardTitle class="panel-head">
        <VIcon color="primary" class="me-2">ri-question-line</VIcon>
        <span>أسئلة شائعة عن الفوترة</span>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VExpansionPanels variant="accordion" elevation="0">
          <VExpansionPanel v-for="(item, i) in faqs" :key="i" class="faq-panel">
            <VExpansionPanelTitle>
              <div class="d-flex align-center">
                <VIcon color="primary" class="me-2">ri-question-answer-line</VIcon>
                <span class="font-weight-bold">{{ item.q }}</span>
              </div>
            </VExpansionPanelTitle>
            <VExpansionPanelText class="faq-text">{{ item.a }}</VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </VCardItem>
    </VCard>

    <!-- Topup dialog -->
    <VDialog v-model="topupDialog" max-width="500" persistent>
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon start color="warning" class="me-2">ri-wallet-3-line</VIcon>
          <span class="text-h6 font-weight-bold">شحن المحفظة</span>
          <VSpacer />
          <VBtn icon variant="text" :disabled="topupSubmitting" @click="topupDialog = false">
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">
            أدخل المبلغ الذي تريد شحنه. سيتم تحويلك لبوابة الدفع Wayl لإكمال العملية بأمان.
          </p>
          <VTextField v-model.number="topupAmount" type="number" min="1000" label="المبلغ (د.ع) *"
            prepend-inner-icon="ri-money-dollar-circle-line" variant="outlined" density="comfortable"
            color="primary" />
          <div class="topup-quick mt-3">
            <span class="text-caption text-medium-emphasis d-block mb-2">مبالغ سريعة:</span>
            <VBtn v-for="amt in topupQuickAmounts" :key="amt" size="small" variant="tonal" color="warning"
              class="me-2 mb-2" @click="topupAmount = amt">
              {{ formatIQD(amt) }}
            </VBtn>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" :disabled="topupSubmitting" @click="topupDialog = false">إلغاء</VBtn>
          <VBtn color="warning" rounded="lg" :loading="topupSubmitting"
            prepend-icon="ri-secure-payment-line" @click="submitTopup">
            متابعة للدفع
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="bottom" timeout="3000" rounded="pill">
      <div class="d-flex align-center gap-2">
        <VIcon>{{ snackbar.color === "success" ? "ri-check-line" : "ri-error-warning-line" }}</VIcon>
        {{ snackbar.message }}
      </div>
    </VSnackbar>
  </div>
</template>

<style scoped>
/* =====================================================
   Teacher Billing v2
   Brand: navy #0B2545 · orange #FF8A00 · sky #3FA9F5
   ===================================================== */
.billing-page { padding-block: 4px; }

/* ---- HERO ---- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #050d1f 0%, #0b2545 55%, #122e54 100%) !important;
  color: white;
}
.hero-mesh {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(40% 80% at 100% 0%, rgba(255, 138, 0, .30), transparent 60%),
    radial-gradient(35% 70% at 0% 100%, rgba(63, 169, 245, .20), transparent 60%);
}
.hero-avatar { box-shadow: 0 10px 24px rgba(255, 138, 0, .35); }
.hero-greet { font-size: .82rem; color: rgba(255, 255, 255, .78); font-weight: 600; }
.hero-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.4rem; font-weight: 900;
  color: white !important; margin: 2px 0 4px;
  letter-spacing: -.01em;
}
.hero-sub { color: rgba(255, 255, 255, .82); font-size: .9rem; line-height: 1.65; }
.back-link {
  color: rgba(255, 255, 255, .85) !important;
  font-weight: 700; text-transform: none; letter-spacing: 0;
}
.back-link:hover { color: white !important; background: rgba(255, 255, 255, .08); }

/* ---- Panel ---- */
.panel { background: white; }
.panel-head {
  display: flex; align-items: center;
  padding: 14px 16px !important;
  font-size: 1rem; font-weight: 700; color: #0b2545;
}
.empty-block { text-align: center; color: rgba(11, 37, 69, .65); padding-block: 16px; }

/* ---- Active plan card ---- */
.current-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.3rem; font-weight: 900; color: #0b2545;
  margin: 0; letter-spacing: -.01em;
}
.current-price {
  font-family: "Cairo", sans-serif;
  font-size: 1.6rem; font-weight: 900; color: #FF8A00;
  margin-top: 6px;
}
.current-price .period { font-size: .82rem; font-weight: 500; color: rgba(11, 37, 69, .55); }
.current-meta {
  display: inline-flex; align-items: center;
  color: rgba(11, 37, 69, .65); font-size: .85rem; font-weight: 600;
  margin-top: 6px;
}

/* ---- Capacity widget ---- */
.cap-row { display: flex; align-items: center; gap: 16px; }
.cap-circle-wrap { flex-shrink: 0; }
.cap-circle-text { text-align: center; }
.cap-now {
  font-family: "Cairo", sans-serif;
  font-size: 1.2rem; font-weight: 900; color: #0b2545; line-height: 1;
}
.cap-of { font-size: .68rem; color: rgba(11, 37, 69, .6); margin-top: 2px; }
.cap-meta { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.cap-meta-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; border-radius: 8px; background: rgba(11, 37, 69, .04);
}
.cap-meta-label { font-size: .82rem; color: rgba(11, 37, 69, .65); font-weight: 600; }
.cap-meta-value { font-size: .9rem; font-weight: 800; }

/* ---- Wallet ---- */
.wallet-panel { background: linear-gradient(160deg, white 0%, rgba(255, 138, 0, .04) 100%) !important; }
.wallet-label { font-size: .82rem; color: rgba(11, 37, 69, .65); font-weight: 600; }
.wallet-value {
  font-family: "Cairo", sans-serif;
  font-size: 1.7rem; font-weight: 900; color: #0b2545;
  margin-top: 4px; line-height: 1.1; letter-spacing: -.02em;
}
.topup-btn { font-weight: 800; text-transform: none; letter-spacing: 0; }

/* ---- Pricing cards ---- */
.plan-card {
  position: relative;
  padding: 4px;
  background: white;
  border: 1px solid rgba(11, 37, 69, .08);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  height: 100%;
}
.plan-card:hover {
  transform: translateY(-4px);
  border-color: rgba(11, 37, 69, .25);
  box-shadow: 0 16px 32px rgba(11, 37, 69, .08) !important;
}
.plan-card.featured {
  background: linear-gradient(160deg, #0b2545 0%, #103261 100%);
  border-color: #0b2545;
  transform: scale(1.02);
}
.plan-card.featured:hover { transform: scale(1.02) translateY(-4px); }
.plan-card.current {
  border: 2px solid #10b981 !important;
  background: linear-gradient(160deg, white 0%, rgba(16, 185, 129, .04) 100%);
}
.plan-badge {
  position: absolute;
  inset-block-start: -12px;
  inset-inline-start: 50%;
  transform: translateX(50%);
  padding: 4px 14px;
  border-radius: 999px;
  font-size: .76rem; font-weight: 800;
  display: inline-flex; align-items: center;
  z-index: 2;
}
.plan-badge-popular {
  background: linear-gradient(135deg, #FF8A00 0%, #FFB766 100%);
  color: white; box-shadow: 0 6px 16px rgba(255, 138, 0, .35);
}
.plan-badge-current {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  color: white; box-shadow: 0 6px 16px rgba(16, 185, 129, .35);
}
.plan-icon-wrap {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(11, 37, 69, .08);
  margin: 0 auto 14px;
}
.plan-icon-wrap.is-featured { background: rgba(255, 255, 255, .15); }
.plan-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.25rem; font-weight: 900;
  color: #0b2545;
  text-align: center; margin: 0 0 6px;
}
.plan-card.featured .plan-name { color: white; }
.plan-desc {
  text-align: center;
  font-size: .85rem; color: rgba(11, 37, 69, .65);
  margin-bottom: 12px; min-height: 2.5em;
}
.plan-card.featured .plan-desc { color: rgba(255, 255, 255, .8); }

.plan-price-wrap { text-align: center; padding-block: 6px; }
.plan-price-num {
  font-family: "Cairo", sans-serif;
  font-size: 2.2rem; font-weight: 900; color: #0b2545;
  letter-spacing: -.02em;
}
.plan-card.featured .plan-price-num { color: white; }
.plan-price-currency {
  font-size: .92rem; font-weight: 700; color: #0b2545; margin-inline-start: 4px;
}
.plan-card.featured .plan-price-currency { color: rgba(255, 255, 255, .85); }
.plan-price-period { font-size: .82rem; color: rgba(11, 37, 69, .6); margin-top: 2px; }
.plan-card.featured .plan-price-period { color: rgba(255, 255, 255, .68); }

.plan-features {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.plan-features li {
  display: flex; align-items: center;
  font-size: .9rem; color: rgba(11, 37, 69, .8);
}
.plan-card.featured .plan-features li { color: rgba(255, 255, 255, .9); }
.plan-card.featured .plan-features :deep(.v-icon) { color: #6EF2B4 !important; }

.plan-cta {
  font-weight: 800 !important; text-transform: none; letter-spacing: 0;
}

/* ---- FAQ ---- */
.faq-panel :deep(.v-expansion-panel-title) {
  font-family: "Cairo", sans-serif;
  background: rgba(11, 37, 69, .03);
}
.faq-text {
  color: rgba(11, 37, 69, .78);
  line-height: 1.85; font-size: .92rem;
  padding-block-start: 8px;
}

/* ---- Topup dialog ---- */
.topup-quick {
  background: rgba(255, 138, 0, .04);
  padding: 12px;
  border-radius: 10px;
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .plan-card.featured { transform: none; }
  .plan-card.featured:hover { transform: translateY(-4px); }
}
</style>
