<script setup>
// =====================================================
// Mulhim IQ — Login page v2 (brand-aligned redesign)
// Single-file rewrite 2026-05-16.
// Preserves every business-logic function from the previous version:
//   - handleEmailLogin, handleRegisterTeacher, handleGoogleLogin
//   - handleRequestPasswordReset, handleResetPassword
//   - Google Sign-In SDK init (google-signin-button + google-signup-button)
//   - OneSignal player-id linking
//   - useAuth() composable + role-based redirect (super_admin → /admin/dashboard)
//   - Student dialog ("use mobile app") + forgot-password + reset-password dialogs
// Only the template + styles are new.
// =====================================================

import Auth from "@/api/auth/auth_api.js";
import logo from "@/assets/images/logo.png";
import { useAuth } from "@/composables/useAuth.js";
import axiosInstance from "@/utils/axios";
import { useRoute, useRouter } from "vue-router";

// ---- OneSignal helper -----------------------------------------------------
const getOneSignalPlayerId = async () => {
  return new Promise(async (resolve) => {
    try {
      if (!window.OneSignal) {
        console.warn("OneSignal SDK not loaded");
        resolve(null);
        return;
      }
      if (!window.OneSignalInitialized) {
        await window.OneSignal.init({
          appId: "b136e33d-56f0-4fc4-ad08-8c8a534ca447",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
        window.OneSignalInitialized = true;
      }
      await window.OneSignal.Notifications.requestPermission();
      const subscription = await window.OneSignal.User.PushSubscription;
      if (!subscription) { resolve(null); return; }
      if (!subscription.id) await new Promise((r) => setTimeout(r, 1500));
      resolve(subscription.id || (await window.OneSignal.getUserId()) || null);
    } catch (err) {
      console.warn("OneSignal getPlayerId error:", err);
      resolve(null);
    }
  });
};

// ---- Reactive state -------------------------------------------------------
definePage({ meta: { layout: "blank", public: true } });

const router = useRouter();
const route = useRoute();
const { login } = useAuth();

const activeAuthTab = ref("login"); // 'login' | 'register'
const form = ref({ email: "", password: "" });
const isPasswordVisible = ref(false);
const isLoading = ref(false);
const error = ref("");
const isUserAuthenticated = ref(false);
const showStudentAppDialog = ref(false);
const referralCode = ref("");

// Registration form state
const registerForm = ref({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  address: "",
  bio: "",
  experienceYears: 0,
  gradeIds: [],
  studyYear: "",
});
const gradesOptions = ref([]);
const isRegisterLoading = ref(false);

// Forgot / reset password state
const forgotDialog = ref(false);
const resetDialog = ref(false);
const forgotEmail = ref("");
const resetForm = ref({ email: "", newPassword: "", confirmPassword: "", code: "", resetToken: "" });

// Live brand-visual stats (anonymous APIs reused from the landing page)
const apiHealthy = ref(null);
const liveStats = ref({ governoratesCount: 0, packagesCount: 0 });

// ---- Auth flows -----------------------------------------------------------
const redirectBasedOnUserType = (userData, requiresProfileCompletion) => {
  const userType = userData.userType;
  switch (userType) {
    case "teacher":
      router.push(requiresProfileCompletion ? "/teacher/profile-setup" : "/teacher/dashboard");
      break;
    case "student":
      router.push(requiresProfileCompletion ? "/student/profile-setup" : "/student/dashboard");
      break;
    case "admin":
    case "super_admin":
      router.push("/admin/dashboard");
      break;
    default:
      router.push("/");
  }
};

const checkUserAuth = () => {
  const userData = localStorage.getItem("user");
  const token = localStorage.getItem("accessToken");
  if (userData && token) {
    isUserAuthenticated.value = true;
    const user = JSON.parse(userData);
    redirectBasedOnUserType(user, false);
    return true;
  }
  isUserAuthenticated.value = false;
  return false;
};

const handleEmailLogin = async () => {
  if (!form.value.email || !form.value.password) {
    error.value = "يرجى ملء جميع الحقول المطلوبة";
    return;
  }
  isLoading.value = true;
  error.value = "";
  try {
    const playerId = await getOneSignalPlayerId();
    const response = await Auth.login({
      email: form.value.email,
      password: form.value.password,
      oneSignalPlayerId: playerId,
    });
    if (response.data.success) {
      const { user: userData, token: accessToken, requiresProfileCompletion, isProfileComplete } = response.data.data;
      if (userData?.userType === "student") {
        showStudentAppDialog.value = true;
        return;
      }
      localStorage.setItem("isProfileComplete", isProfileComplete);
      localStorage.setItem("content_url", response.data.content_url);
      login(userData, accessToken);
      try {
        if (window.OneSignalInitialized && userData?.id) {
          await window.OneSignal.login(userData.id);
        }
      } catch (e) { console.warn("OneSignal link failed:", e); }
      redirectBasedOnUserType(userData, requiresProfileCompletion);
    } else {
      error.value = response?.data?.message || response?.data?.errors?.[0] || "خطأ في تسجيل الدخول";
    }
  } catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || err?.response?.data?.errors?.[0] || err?.message;
    if (typeof msg === "string" && msg.includes("غير مفعل")) {
      await router.push({ path: "/verify-email", query: { email: form.value.email } });
      return;
    }
    error.value = msg || "خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.";
  } finally {
    isLoading.value = false;
  }
};

const handleRegisterTeacher = async () => {
  try {
    error.value = "";
    isRegisterLoading.value = true;
    const f = registerForm.value;
    if (!f.name || !f.email || !f.password || !f.confirmPassword || !f.phone || !f.address || !f.bio
        || f.experienceYears === null || f.experienceYears === undefined
        || !Array.isArray(f.gradeIds) || !f.gradeIds.length || !f.studyYear) {
      error.value = "يرجى تعبئة جميع الحقول المطلوبة";
      return;
    }
    if (!/^[A-Za-z0-9]{6,}$/.test(f.password)) {
      error.value = "كلمة المرور يجب أن تكون 6 رموز على الأقل من أحرف أو أرقام";
      return;
    }
    if (f.password !== f.confirmPassword) {
      error.value = "تأكيد كلمة المرور غير مطابق";
      return;
    }
    const payload = {
      name: f.name, email: f.email, password: f.password, phone: f.phone,
      address: f.address, bio: f.bio,
      experienceYears: Number(f.experienceYears) || 0,
      gradeIds: f.gradeIds, studyYear: f.studyYear,
    };
    if (referralCode.value) payload.referralCode = referralCode.value;
    const res = await Auth.registerTeacher(payload);
    const ok = res?.data?.success || res?.success;
    const msg = res?.data?.message || res?.data?.errors?.[0] || res?.message || "تم إنشاء الحساب بنجاح";
    if (ok) {
      registerForm.value.password = "";
      await router.push({ path: "/verify-email", query: { email: f.email } });
    } else {
      error.value = msg || "تعذر إنشاء الحساب";
    }
  } catch (e) {
    const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0] || e?.message;
    error.value = msg || "حدث خطأ أثناء إنشاء الحساب";
  } finally {
    isRegisterLoading.value = false;
  }
};

const handleGoogleLogin = async (response) => {
  try {
    const token = response.credential;
    if (!token) return;
    const playerId = await getOneSignalPlayerId();
    const res = await Auth.loginInGoogele({
      idToken: token,
      oneSignalPlayerId: playerId,
      referralCode: referralCode.value || undefined,
    });
    if (res.data.success) {
      const { user: userData, token: accessToken, requiresProfileCompletion, isProfileComplete } = res.data.data;
      if (userData?.userType === "student") { showStudentAppDialog.value = true; return; }
      localStorage.setItem("isProfileComplete", isProfileComplete);
      localStorage.setItem("content_url", res.data.content_url);
      login(userData, accessToken);
      try {
        if (window.OneSignalInitialized && userData?.id) await window.OneSignal.login(userData.id);
      } catch (e) { console.warn("OneSignal link failed:", e); }
      redirectBasedOnUserType(userData, requiresProfileCompletion);
    } else {
      error.value = res?.data?.message || res?.data?.errors?.[0] || "خطأ في تسجيل الدخول بـ Google";
    }
  } catch (err) {
    error.value = err?.response?.data?.message || err?.response?.data?.errors?.[0] || "خطأ في تسجيل الدخول بـ Google";
  }
};

const handleRequestPasswordReset = async () => {
  try {
    error.value = "";
    if (!forgotEmail.value) { error.value = "يرجى إدخال البريد الإلكتروني"; return; }
    isLoading.value = true;
    const res = await Auth.requestPasswordReset({ email: forgotEmail.value });
    const ok = res?.data?.success || res?.success;
    if (ok) {
      forgotDialog.value = false;
      resetForm.value.email = forgotEmail.value;
      resetDialog.value = true;
    } else {
      error.value = res?.data?.message || "تعذر إرسال رمز إعادة التعيين";
    }
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || "تعذر إرسال رمز إعادة التعيين";
  } finally { isLoading.value = false; }
};

const handleResetPassword = async () => {
  try {
    error.value = "";
    const f = resetForm.value;
    if (!f.email || !f.newPassword || !f.confirmPassword || (!f.code && !f.resetToken)) {
      error.value = "يرجى تعبئة جميع الحقول المطلوبة"; return;
    }
    if (!/^[A-Za-z0-9]{6,}$/.test(f.newPassword)) {
      error.value = "كلمة المرور يجب أن تكون 6 رموز على الأقل"; return;
    }
    if (f.newPassword !== f.confirmPassword) {
      error.value = "تأكيد كلمة المرور غير مطابق"; return;
    }
    isLoading.value = true;
    const payload = { email: f.email, newPassword: f.newPassword };
    if (f.code) payload.code = String(f.code);
    if (f.resetToken) payload.resetToken = String(f.resetToken);
    const res = await Auth.resetPassword(payload);
    const ok = res?.data?.success || res?.success;
    if (ok) {
      resetDialog.value = false;
      await router.push({ path: "/login", query: { email: f.email } });
    } else {
      error.value = res?.data?.message || "تعذر إعادة تعيين كلمة المرور";
    }
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || "تعذر إعادة تعيين كلمة المرور";
  } finally { isLoading.value = false; }
};

// ---- Brand-visual: live platform stats (decorative / trust signal) --------
const fetchVisualStats = async () => {
  const baseURL = axiosInstance?.defaults?.baseURL || import.meta.env.VITE_API_BASE_URL || "";
  const apiOrigin = baseURL.replace(/\/api\/?$/, "");
  try {
    const teacherApi = (await import("@/api/teacher/teacher_api")).default;
    const [h, g, p] = await Promise.all([
      fetch(`${apiOrigin}/health`).then(r => r.json()).then(j => ({ healthy: !!j?.success })).catch(() => ({ healthy: false })),
      teacherApi.getGovernorates().then(res => {
        const data = (res?.data?.data || res?.data || {});
        return { gov: Number(data.count) || (Array.isArray(data.governorates) ? data.governorates.length : 0) };
      }).catch(() => ({ gov: 0 })),
      teacherApi.getActivePackages().then(res => {
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        return { pkg: items.length };
      }).catch(() => ({ pkg: 0 })),
    ]);
    apiHealthy.value = h.healthy;
    liveStats.value = { governoratesCount: g.gov, packagesCount: p.pkg };
  } catch (e) { console.warn("Failed to load visual stats:", e); }
};

// ---- Lifecycle ------------------------------------------------------------
const loadGrades = async () => {
  try {
    const teacherApi = (await import("@/api/teacher/teacher_api")).default;
    const res = await teacherApi.getAllGradess();
    const payload = res?.data?.data ? res.data : res;
    const items = Array.isArray(payload?.data) ? payload.data : [];
    gradesOptions.value = items.map((g) => ({ title: g.name || g.gradeName || g.title, value: g.id }));
  } catch (e) { console.warn("Failed to load grades:", e); }
};

onMounted(async () => {
  if (checkUserAuth()) return;
  await nextTick();

  // Prefill from query params
  try {
    if (route?.query?.email) form.value.email = String(route.query.email);
    if (route?.query?.ref)   referralCode.value = String(route.query.ref);
  } catch { /* ignore */ }

  // Default study year (Aug-onward → current/next, otherwise prev/current)
  try {
    const now = new Date();
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    registerForm.value.studyYear = `${y}-${y + 1}`;
  } catch { /* ignore */ }

  loadGrades();
  fetchVisualStats();

  // Google Sign-In init
  const google = window.google;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!google?.accounts?.id || !clientId) {
    console.warn("Google Sign-In not initialized: SDK or VITE_GOOGLE_CLIENT_ID missing.");
    return;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleLogin,
    ux_mode: "popup",
    auto_select: false,
    use_fedcm_for_prompt: false,
  });

  const renderGoogleBtn = (id, text) => {
    const el = document.getElementById(id);
    if (!el) return;
    google.accounts.id.renderButton(el, {
      theme: "outline", size: "large", text, shape: "rectangular",
      logo_alignment: "center", width: 320,
    });
  };
  renderGoogleBtn("google-signin-button", "signin_with");
  renderGoogleBtn("google-signup-button", "signup_with");
});

// Re-render Google buttons when the tab switches (the target div mounts/unmounts)
watch(activeAuthTab, async () => {
  await nextTick();
  const google = window.google;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!google?.accounts?.id || !clientId) return;
  const target = activeAuthTab.value === "login" ? "google-signin-button" : "google-signup-button";
  const text   = activeAuthTab.value === "login" ? "signin_with" : "signup_with";
  const el = document.getElementById(target);
  if (el) {
    el.innerHTML = "";
    google.accounts.id.renderButton(el, {
      theme: "outline", size: "large", text, shape: "rectangular",
      logo_alignment: "center", width: 320,
    });
  }
});
</script>

<template>
  <!-- Already-authenticated splash -->
  <div v-if="isUserAuthenticated" class="auth-splash">
    <VCard class="auth-splash-card pa-8 text-center" elevation="0">
      <VIcon size="56" color="success" class="mb-4">ri-checkbox-circle-fill</VIcon>
      <h3 class="text-h6 font-weight-bold mb-2">أنت مسجّل دخول بالفعل</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">جاري توجيهك إلى لوحة التحكم…</p>
      <VProgressCircular indeterminate color="primary" />
    </VCard>
  </div>

  <div v-else class="auth-shell" dir="rtl">
    <!-- Decorative background orbs (visible at edges of the form panel) -->
    <div class="auth-bg-orb auth-bg-orb-1" />
    <div class="auth-bg-orb auth-bg-orb-2" />

    <!-- Top bar: back-to-home -->
    <header class="auth-topbar">
      <router-link to="/" class="back-home" aria-label="العودة للصفحة الرئيسية">
        <VIcon size="20">ri-arrow-right-line</VIcon>
        <span>الرئيسية</span>
      </router-link>
    </header>

    <div class="auth-grid">
      <!-- ============================ FORM PANEL (RTL start = right) -->
      <section class="auth-form-panel">
        <div class="auth-form-inner">
          <!-- Brand mark -->
          <router-link to="/" class="form-brand">
            <img :src="logo" alt="Mulhim IQ" class="form-brand-logo" />
            <div class="lh-1">
              <div class="brand-name">
                <span class="text-primary">Mulhim</span><span class="brand-iq">IQ</span>
              </div>
              <div class="brand-sub">منصة التعليم الذكي</div>
            </div>
          </router-link>

          <!-- Greeting -->
          <div class="auth-greeting">
            <h1 class="auth-heading">
              <span v-if="activeAuthTab === 'login'">👋🏻 مرحباً بعودتك</span>
              <span v-else>🚀 ابدأ رحلتك معنا</span>
            </h1>
            <p class="auth-subheading">
              <span v-if="activeAuthTab === 'login'">سجّل دخولك للمتابعة إلى لوحة التحكم.</span>
              <span v-else>قدّم طلب الانضمام كأستاذ خلال دقائق.</span>
            </p>
          </div>

          <!-- Tab pill switcher -->
          <div class="auth-tabs">
            <button
              type="button"
              class="auth-tab"
              :class="{ active: activeAuthTab === 'login' }"
              @click="activeAuthTab = 'login'"
            >
              <VIcon size="18" class="me-1">ri-login-box-line</VIcon>
              تسجيل الدخول
            </button>
            <button
              type="button"
              class="auth-tab"
              :class="{ active: activeAuthTab === 'register' }"
              @click="activeAuthTab = 'register'"
            >
              <VIcon size="18" class="me-1">ri-user-add-line</VIcon>
              تقديم طلب
            </button>
          </div>

          <!-- Error alert -->
          <VAlert v-if="error" type="error" variant="tonal" closable class="mb-4 auth-alert" @click:close="error = ''">
            {{ error }}
          </VAlert>

          <!-- LOGIN form -->
          <VForm v-if="activeAuthTab === 'login'" @submit.prevent="handleEmailLogin" class="auth-form">
            <VTextField
              v-model="form.email"
              autofocus
              type="email"
              label="البريد الإلكتروني"
              placeholder="you@example.com"
              prepend-inner-icon="ri-mail-line"
              variant="outlined"
              density="comfortable"
              color="primary"
              class="mb-3"
            />
            <VTextField
              v-model="form.password"
              :type="isPasswordVisible ? 'text' : 'password'"
              label="كلمة المرور"
              placeholder="••••••••"
              prepend-inner-icon="ri-lock-2-line"
              :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
              @click:append-inner="isPasswordVisible = !isPasswordVisible"
              variant="outlined"
              density="comfortable"
              color="primary"
              class="mb-2"
            />

            <div class="d-flex justify-space-between align-center mb-4">
              <button type="button" class="auth-link" @click="forgotDialog = true">
                نسيت كلمة المرور؟
              </button>
              <router-link :to="{ path: '/verify-email', query: { email: form.email } }" class="auth-link">
                تفعيل الحساب
              </router-link>
            </div>

            <VBtn
              type="submit"
              block
              size="large"
              color="primary"
              rounded="lg"
              :loading="isLoading"
              class="auth-primary-cta"
            >
              <VIcon start size="20">ri-login-box-line</VIcon>
              تسجيل الدخول
            </VBtn>

            <!-- divider -->
            <div class="auth-divider">
              <span>أو</span>
            </div>

            <!-- Google sign-in button host -->
            <div class="google-btn-wrap">
              <div id="google-signin-button" class="google-signin-wrapper" />
            </div>
          </VForm>

          <!-- REGISTER form -->
          <VForm v-else @submit.prevent="handleRegisterTeacher" class="auth-form">
            <VRow dense>
              <VCol cols="12" md="6">
                <VTextField v-model="registerForm.name" label="الاسم الكامل" prepend-inner-icon="ri-user-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="registerForm.email" type="email" label="البريد الإلكتروني" prepend-inner-icon="ri-mail-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="registerForm.password" label="كلمة المرور" :type="isPasswordVisible ? 'text' : 'password'" prepend-inner-icon="ri-lock-2-line" :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'" @click:append-inner="isPasswordVisible = !isPasswordVisible" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="registerForm.confirmPassword" label="تأكيد كلمة المرور" :type="isPasswordVisible ? 'text' : 'password'" prepend-inner-icon="ri-lock-2-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="registerForm.phone" label="رقم الهاتف" prepend-inner-icon="ri-phone-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model.number="registerForm.experienceYears" type="number" min="0" label="سنوات الخبرة" prepend-inner-icon="ri-medal-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12">
                <VTextField v-model="registerForm.address" label="العنوان" prepend-inner-icon="ri-map-pin-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="registerForm.bio" label="نبذة عنك" rows="3" prepend-inner-icon="ri-file-text-line" variant="outlined" density="comfortable" color="primary" />
              </VCol>
              <VCol cols="12">
                <VSelect v-model="registerForm.gradeIds" :items="gradesOptions" item-title="title" item-value="value" label="المراحل الدراسية" prepend-inner-icon="ri-graduation-cap-line" variant="outlined" density="comfortable" color="primary" multiple chips />
              </VCol>
            </VRow>

            <VBtn
              type="submit"
              block
              size="large"
              color="primary"
              rounded="lg"
              :loading="isRegisterLoading"
              class="auth-primary-cta mt-3"
            >
              <VIcon start size="20">ri-user-add-line</VIcon>
              تقديم طلب الانضمام
            </VBtn>

            <div class="auth-divider"><span>أو</span></div>
            <div class="google-btn-wrap">
              <div id="google-signup-button" class="google-signin-wrapper" />
            </div>
          </VForm>

          <!-- Switcher footer -->
          <div class="auth-switch">
            <template v-if="activeAuthTab === 'login'">
              ليس لديك حساب؟
              <button type="button" class="auth-link strong" @click="activeAuthTab = 'register'">
                قدّم طلب الانضمام
              </button>
            </template>
            <template v-else>
              لديك حساب بالفعل؟
              <button type="button" class="auth-link strong" @click="activeAuthTab = 'login'">
                سجّل دخولك
              </button>
            </template>
          </div>
        </div>
      </section>

      <!-- ============================ BRAND VISUAL PANEL (RTL end = left) -->
      <aside class="auth-brand-panel d-none d-md-flex">
        <!-- Layered gradient background -->
        <div class="brand-mesh" />
        <div class="brand-orb brand-orb-1" />
        <div class="brand-orb brand-orb-2" />
        <div class="brand-orb brand-orb-3" />
        <div class="brand-grain" />

        <div class="brand-content">
          <!-- Big logo with glow -->
          <div class="brand-logo-wrap">
            <img :src="logo" alt="Mulhim IQ" class="brand-logo-big" />
          </div>

          <h2 class="brand-headline">
            تعليم ذكي <span class="brand-headline-accent">يلهم النجاح</span>.
          </h2>
          <p class="brand-tagline">
            انضم لمنصة عربية متكاملة تجمع المعلمين والطلاب في نظام واحد
            للجدولة، الحضور، الواجبات، والفواتير.
          </p>

          <!-- Value bullets -->
          <ul class="brand-bullets">
            <li>
              <span class="bullet-ico"><VIcon size="18" color="white">ri-shield-check-line</VIcon></span>
              <div>
                <div class="bullet-title">أمان عالٍ</div>
                <div class="bullet-sub">JWT + تشفير شامل + سياسة CSP</div>
              </div>
            </li>
            <li>
              <span class="bullet-ico"><VIcon size="18" color="white">ri-qr-code-line</VIcon></span>
              <div>
                <div class="bullet-title">حضور QR لحظي</div>
                <div class="bullet-sub">الطالب يمسح، السجل يُحفظ تلقائياً</div>
              </div>
            </li>
            <li>
              <span class="bullet-ico"><VIcon size="18" color="white">ri-bar-chart-2-line</VIcon></span>
              <div>
                <div class="bullet-title">تحليلات ذكية</div>
                <div class="bullet-sub">رؤى مالية وأكاديمية في مكان واحد</div>
              </div>
            </li>
            <li>
              <span class="bullet-ico"><VIcon size="18" color="white">ri-notification-3-line</VIcon></span>
              <div>
                <div class="bullet-title">إشعارات Push</div>
                <div class="bullet-sub">iOS + Android + ويب عبر OneSignal</div>
              </div>
            </li>
          </ul>

          <!-- Live stats footer -->
          <div class="brand-stats">
            <div class="brand-stat">
              <span class="live-dot" :class="{ ok: apiHealthy, down: apiHealthy === false }" />
              <div>
                <div class="brand-stat-label">حالة المنصة</div>
                <div class="brand-stat-value">
                  {{ apiHealthy ? 'نشطة' : (apiHealthy === false ? 'متوقفة' : 'فحص…') }}
                </div>
              </div>
            </div>
            <div class="brand-stat">
              <VIcon size="18" color="white" class="brand-stat-icon">ri-map-pin-line</VIcon>
              <div>
                <div class="brand-stat-label">محافظات</div>
                <div class="brand-stat-value">{{ liveStats.governoratesCount }}</div>
              </div>
            </div>
            <div class="brand-stat">
              <VIcon size="18" color="white" class="brand-stat-icon">ri-archive-line</VIcon>
              <div>
                <div class="brand-stat-label">باقات</div>
                <div class="brand-stat-value">{{ liveStats.packagesCount }}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Student-must-use-mobile dialog -->
    <VDialog v-model="showStudentAppDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex align-center">
          <VIcon start color="primary" class="me-2">ri-smartphone-line</VIcon>
          تسجيل الدخول للطلاب
        </VCardTitle>
        <VCardText>
          <p class="mb-4">حساب الطالب يُستخدم من تطبيق ملهم على الجوال فقط. حمّل التطبيق للمتابعة:</p>
          <div class="d-flex flex-column gap-2">
            <VBtn color="primary" variant="elevated" prepend-icon="ri-app-store-line" href="https://apps.apple.com/us/app/mulhimiq/id6754453929" target="_blank">
              تحميل من App Store
            </VBtn>
            <VBtn color="success" variant="elevated" prepend-icon="ri-google-play-line" href="https://play.google.com/store/apps/details?id=com.mulhimiq.app" target="_blank">
              تحميل من Google Play
            </VBtn>
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="showStudentAppDialog = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Forgot password dialog -->
    <VDialog v-model="forgotDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex align-center">
          <VIcon start color="primary" class="me-2">ri-key-2-line</VIcon>
          استعادة كلمة المرور
        </VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-4">
            أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة تعيين.
          </p>
          <VTextField v-model="forgotEmail" type="email" label="البريد الإلكتروني" prepend-inner-icon="ri-mail-line" variant="outlined" density="comfortable" color="primary" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="forgotDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="isLoading" @click="handleRequestPasswordReset">إرسال الرمز</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Reset password dialog -->
    <VDialog v-model="resetDialog" max-width="560">
      <VCard class="pa-2">
        <VCardTitle class="d-flex align-center">
          <VIcon start color="primary" class="me-2">ri-lock-password-line</VIcon>
          إعادة تعيين كلمة المرور
        </VCardTitle>
        <VCardText>
          <VRow dense>
            <VCol cols="12">
              <VTextField v-model="resetForm.email" type="email" label="البريد الإلكتروني" prepend-inner-icon="ri-mail-line" variant="outlined" density="comfortable" color="primary" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="resetForm.newPassword" label="كلمة المرور الجديدة" :type="isPasswordVisible ? 'text' : 'password'" prepend-inner-icon="ri-lock-2-line" :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'" @click:append-inner="isPasswordVisible = !isPasswordVisible" variant="outlined" density="comfortable" color="primary" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="resetForm.confirmPassword" label="تأكيد كلمة المرور" :type="isPasswordVisible ? 'text' : 'password'" prepend-inner-icon="ri-lock-2-line" variant="outlined" density="comfortable" color="primary" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="resetForm.code" label="رمز التحقق (6 أرقام)" prepend-inner-icon="ri-shield-keyhole-line" variant="outlined" density="comfortable" color="primary" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="resetDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="isLoading" @click="handleResetPassword">تعيين كلمة المرور</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped lang="scss">
/* =====================================================
   Mulhim IQ — Login v2 styles
   Mirrors the landing palette:
     navy   #0B2545
     orange #FF8A00  (accent)
     sky    #3FA9F5
   ===================================================== */

.auth-splash {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #fbfcfe;
}
.auth-splash-card {
  border-radius: 18px;
  border: 1px solid rgba(11, 37, 69, 0.08);
}

/* ---- Shell + background decoration ---- */
.auth-shell {
  position: relative;
  min-height: 100vh;
  background: #fbfcfe;
  overflow: hidden;
  isolation: isolate;
}
.auth-bg-orb {
  position: absolute; border-radius: 50%; filter: blur(80px);
  z-index: 0; pointer-events: none; opacity: .18;
}
.auth-bg-orb-1 {
  width: 320px; height: 320px; background: #3FA9F5;
  inset-block-start: -120px; inset-inline-start: -100px;
}
.auth-bg-orb-2 {
  width: 280px; height: 280px; background: #FF8A00;
  inset-block-end: -100px; inset-inline-end: 40%;
  opacity: .12;
}

/* ---- Top bar ---- */
.auth-topbar {
  position: relative; z-index: 5;
  display: flex; align-items: center;
  padding: 16px 32px;
}
.back-home {
  display: inline-flex; align-items: center; gap: 6px;
  color: rgba(11, 37, 69, .72); text-decoration: none;
  font-weight: 600; font-size: .92rem;
  padding: 6px 12px; border-radius: 10px;
  transition: background .2s ease, color .2s ease;
}
.back-home:hover { background: rgba(11, 37, 69, .05); color: #0b2545; }

/* ---- Grid layout ---- */
.auth-grid {
  position: relative; z-index: 2;
  display: grid;
  /* In RTL the form sits on the right (visual start), brand panel on the left. */
  grid-template-columns: 1fr 1.05fr;
  min-height: calc(100vh - 56px);
  gap: 0;
}
@media (max-width: 960px) {
  .auth-grid { grid-template-columns: 1fr; min-height: auto; }
}

/* ---- Form panel ---- */
.auth-form-panel {
  display: flex; align-items: center; justify-content: center;
  padding: 32px 24px;
}
.auth-form-inner {
  width: 100%; max-width: 480px;
}
.form-brand {
  display: inline-flex; align-items: center; gap: 12px;
  text-decoration: none;
  margin-block-end: 28px;
}
.form-brand-logo {
  width: 48px; height: 48px;
  filter: drop-shadow(0 4px 12px rgba(255, 138, 0, 0.25));
  transition: transform .35s cubic-bezier(.34, 1.56, .64, 1);
}
.form-brand:hover .form-brand-logo { transform: rotate(-8deg) scale(1.05); }
.brand-name {
  font-family: 'Cairo', sans-serif;
  font-size: 1.4rem; font-weight: 800;
  letter-spacing: -.02em;
}
.brand-iq {
  color: #FF8A00 !important;
}
.brand-sub {
  font-size: .74rem;
  color: rgba(11, 37, 69, .58);
  font-weight: 600;
  margin-block-start: 2px;
}
.auth-greeting { margin-block-end: 24px; }
.auth-heading {
  font-family: 'Cairo', sans-serif;
  font-size: clamp(1.6rem, 2.5vw, 2rem);
  font-weight: 900;
  color: #0b2545;
  letter-spacing: -.01em;
  margin-block-end: 8px;
  line-height: 1.3;
}
.auth-subheading {
  color: rgba(11, 37, 69, .65);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

/* Tab pill */
.auth-tabs {
  display: grid; grid-template-columns: 1fr 1fr;
  background: rgba(11, 37, 69, .05);
  border-radius: 14px;
  padding: 4px;
  gap: 4px;
  margin-block-end: 24px;
}
.auth-tab {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 4px;
  height: 44px;
  border-radius: 10px;
  background: transparent;
  color: rgba(11, 37, 69, .65);
  font-family: 'Cairo', sans-serif;
  font-weight: 700;
  font-size: .95rem;
  border: 0;
  cursor: pointer;
  transition: background .2s ease, color .2s ease, box-shadow .2s ease;
}
.auth-tab:hover { color: #0b2545; }
.auth-tab.active {
  background: white;
  color: #0b2545;
  box-shadow: 0 4px 14px rgba(11, 37, 69, .08);
}

/* Form fields */
.auth-form :deep(.v-field) { border-radius: 12px; }
.auth-form :deep(.v-field--variant-outlined .v-field__outline__start) {
  border-start-start-radius: 12px;
  border-end-start-radius: 12px;
}
.auth-form :deep(.v-field--variant-outlined .v-field__outline__end) {
  border-start-end-radius: 12px;
  border-end-end-radius: 12px;
}

.auth-link {
  background: transparent; border: 0; padding: 0; cursor: pointer;
  color: #3FA9F5; font-weight: 600; font-size: .85rem;
  text-decoration: none;
  transition: color .2s ease;
}
.auth-link:hover { color: #0b2545; text-decoration: underline; }
.auth-link.strong { color: #FF8A00; font-weight: 800; }

.auth-primary-cta {
  height: 50px !important;
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0;
  font-size: 1rem;
  box-shadow: 0 12px 28px rgba(11, 37, 69, 0.18);
}

.auth-divider {
  display: flex; align-items: center;
  margin-block: 22px 18px;
  color: rgba(11, 37, 69, .45);
  font-size: .82rem;
  font-weight: 600;
}
.auth-divider::before,
.auth-divider::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(11, 37, 69, .12);
}
.auth-divider span { padding-inline: 14px; }

.google-btn-wrap {
  display: flex; justify-content: center;
}
.google-signin-wrapper {
  /* Google renders an iframe here; keep it centered */
  min-height: 44px;
}

.auth-switch {
  text-align: center;
  margin-block-start: 26px;
  color: rgba(11, 37, 69, .65);
  font-size: .92rem;
}

/* Alert */
.auth-alert :deep(.v-alert__content) { font-weight: 600; }

/* ---- Brand visual panel ---- */
.auth-brand-panel {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(160deg, #050d1f 0%, #08162d 50%, #0a1d3c 100%);
  overflow: hidden;
  isolation: isolate;
}
.brand-mesh {
  position: absolute; inset: 0; z-index: 0;
  background:
    radial-gradient(40% 35% at 80% 20%, rgba(63, 169, 245, 0.30), transparent 60%),
    radial-gradient(40% 36% at 20% 80%, rgba(110, 242, 180, 0.18), transparent 65%);
  filter: saturate(115%);
}
.brand-orb {
  position: absolute; border-radius: 50%; filter: blur(80px);
  z-index: 0; opacity: .28; pointer-events: none;
  animation: orb-float 12s ease-in-out infinite;
}
.brand-orb-1 {
  width: 380px; height: 380px; background: #3FA9F5;
  inset-block-start: -140px; inset-inline-end: -120px;
}
.brand-orb-2 {
  width: 320px; height: 320px; background: #6EF2B4;
  inset-block-end: -120px; inset-inline-start: -80px;
  opacity: .18; animation-delay: -4s;
}
.brand-orb-3 {
  width: 220px; height: 220px; background: #FF8A00;
  inset-block-end: 22%; inset-inline-end: 22%;
  opacity: .15; animation-delay: -8s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(20px, -20px) scale(1.04); }
}
.brand-grain {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: .04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.brand-content {
  position: relative; z-index: 2;
  color: white;
  padding: 56px 48px;
  max-width: 540px;
  width: 100%;
}
.brand-logo-wrap {
  width: 88px; height: 88px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  margin-block-end: 28px;
  filter: drop-shadow(0 14px 30px rgba(255, 138, 0, 0.35));
}
.brand-logo-big { width: 56px; height: 56px; }
.brand-headline {
  font-family: 'Cairo', sans-serif;
  font-size: clamp(1.7rem, 2.4vw, 2.2rem);
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: -.015em;
  margin-block-end: 14px;
  color: #FFFFFF !important;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.3);
}
.brand-headline-accent {
  display: inline-block;
  background: linear-gradient(120deg, #ffb260 0%, #ff8a00 50%, #ffa233 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding-block: 2px 6px;
  filter: drop-shadow(0 2px 14px rgba(255, 138, 0, 0.35));
}
.brand-tagline {
  color: rgba(255, 255, 255, .82);
  line-height: 1.95;
  font-size: 1rem;
  max-inline-size: 48ch;
  margin-block-end: 28px;
}

.brand-bullets {
  list-style: none; padding: 0; margin: 0 0 32px;
  display: flex; flex-direction: column; gap: 14px;
}
.brand-bullets li {
  display: flex; align-items: flex-start; gap: 12px;
}
.bullet-ico {
  flex-shrink: 0;
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 138, 0, 0.16);
  border: 1px solid rgba(255, 138, 0, 0.28);
  display: inline-flex; align-items: center; justify-content: center;
}
.bullet-title {
  color: white; font-weight: 700; font-size: .98rem; margin-block-end: 2px;
}
.bullet-sub {
  color: rgba(255, 255, 255, .68); font-size: .82rem; line-height: 1.5;
}

.brand-stats {
  display: flex; flex-wrap: wrap; gap: 18px;
  padding-block-start: 24px;
  border-block-start: 1px solid rgba(255, 255, 255, 0.12);
}
.brand-stat {
  display: inline-flex; align-items: center; gap: 10px;
}
.brand-stat-icon { opacity: .8; }
.brand-stat-label {
  color: rgba(255, 255, 255, .62);
  font-size: .72rem; font-weight: 600;
}
.brand-stat-value {
  color: white;
  font-size: 1rem; font-weight: 800;
  margin-block-start: 2px;
}

.live-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #6ef2b4; box-shadow: 0 0 0 0 rgba(110, 242, 180, 0.6);
  animation: pulse 1.8s infinite;
}
.live-dot.ok { background: #6ef2b4; }
.live-dot.down { background: #E53935; animation: none; box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.5); }
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(110, 242, 180, 0.6); }
  70%  { box-shadow: 0 0 0 8px rgba(110, 242, 180, 0); }
  100% { box-shadow: 0 0 0 0 rgba(110, 242, 180, 0); }
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .auth-topbar { padding: 12px 16px; }
  .auth-form-panel { padding: 16px 16px 40px; }
  .auth-form-inner { max-width: 100%; }
  .form-brand { margin-block-end: 20px; }
  .auth-tabs { margin-block-end: 18px; }
  .auth-primary-cta { height: 48px !important; }
}
</style>
