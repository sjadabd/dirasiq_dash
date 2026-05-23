<script setup>
// =====================================================
// Mulhim IQ — Login page (split-screen redesign).
// Rewrite 2026-05-23.
//
// Scope reset for this version:
//   - The legacy "register teacher" tab + handleRegisterTeacher + the
//     entire registerForm + gradesOptions + signup-Google-button are
//     REMOVED. Teacher registration now goes through the proper
//     /apply-as-teacher flow (multi-step + admin review).
//   - Login-side functions are preserved verbatim:
//       handleEmailLogin, handleGoogleLogin,
//       handleRequestPasswordReset, handleResetPassword,
//       getOneSignalPlayerId, OneSignal linking, useAuth().login.
//   - Layout switches from a centered tabbed card to a split-screen
//     marketing+form layout. RTL-aware: marketing panel is on the
//     visual right, login card on the left (Vuetify's RTL provider
//     handles the inset-inline-* CSS we use).
// =====================================================

import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Auth from '@/api/auth/auth_api.js'
import logo from '@/assets/images/logo.png'
import { useAuth } from '@/composables/useAuth.js'
import axiosInstance from '@/utils/axios'

// ---- OneSignal helper -----------------------------------------------------
const getOneSignalPlayerId = async () => {
  return new Promise(async (resolve) => {
    try {
      if (!window.OneSignal) { resolve(null); return }
      if (!window.OneSignalInitialized) {
        await window.OneSignal.init({
          appId: 'b136e33d-56f0-4fc4-ad08-8c8a534ca447',
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        })
        window.OneSignalInitialized = true
      }
      await window.OneSignal.Notifications.requestPermission()
      const subscription = await window.OneSignal.User.PushSubscription
      if (!subscription) { resolve(null); return }
      if (!subscription.id) await new Promise(r => setTimeout(r, 1500))
      resolve(subscription.id || (await window.OneSignal.getUserId()) || null)
    } catch (err) {
      console.warn('OneSignal getPlayerId error:', err)
      resolve(null)
    }
  })
}

// ---- Reactive state -------------------------------------------------------
definePage({ meta: { layout: 'blank', public: true } })

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const form = ref({ email: '', password: '' })
const isPasswordVisible = ref(false)
const isLoading = ref(false)
const error = ref('')
const isUserAuthenticated = ref(false)
const showStudentAppDialog = ref(false)
const referralCode = ref('')

// Forgot/reset password state (preserved from v2)
const forgotDialog = ref(false)
const resetDialog = ref(false)
const forgotEmail = ref('')
const resetForm = ref({ email: '', newPassword: '', confirmPassword: '', code: '', resetToken: '' })

// Decorative trust signals (live platform stats)
const apiHealthy = ref(null)
const liveStats = ref({ governoratesCount: 0, packagesCount: 0 })

// Hero value-prop bullets shown on the marketing panel
const HERO_BULLETS = [
  { icon: 'ri-graduation-cap-line', text: 'منصة تعليم متكاملة للمدرّسين والطلاب في العراق' },
  { icon: 'ri-video-line',           text: 'دورات مرئية على Bunny Stream + بثّ HLS سريع' },
  { icon: 'ri-shield-check-line',    text: 'إدارة طلبات الانضمام بعناية + مراجعة فردية' },
  { icon: 'ri-bar-chart-2-line',     text: 'لوحة تحكم مالية + جداول حصص + متابعة طلاب' },
]

// ---- Auth flows -----------------------------------------------------------
const redirectBasedOnUserType = (userData, requiresProfileCompletion) => {
  const userType = userData.userType
  switch (userType) {
    case 'teacher':
      router.push(requiresProfileCompletion ? '/teacher/profile-setup' : '/teacher/dashboard')
      break
    case 'student':
      router.push(requiresProfileCompletion ? '/student/profile-setup' : '/student/dashboard')
      break
    case 'admin':
    case 'super_admin':
      router.push('/admin/dashboard')
      break
    default:
      router.push('/')
  }
}

const checkUserAuth = () => {
  const userData = localStorage.getItem('user')
  const token = localStorage.getItem('accessToken')
  if (userData && token) {
    isUserAuthenticated.value = true
    const user = JSON.parse(userData)
    redirectBasedOnUserType(user, false)
    return true
  }
  isUserAuthenticated.value = false
  return false
}

const handleEmailLogin = async () => {
  if (!form.value.email || !form.value.password) {
    error.value = 'يرجى ملء جميع الحقول المطلوبة'
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    const playerId = await getOneSignalPlayerId()
    const response = await Auth.login({
      email: form.value.email,
      password: form.value.password,
      oneSignalPlayerId: playerId,
    })
    if (response.data.success) {
      const { user: userData, token: accessToken, requiresProfileCompletion, isProfileComplete } = response.data.data
      if (userData?.userType === 'student') {
        showStudentAppDialog.value = true
        return
      }
      localStorage.setItem('isProfileComplete', isProfileComplete)
      localStorage.setItem('content_url', response.data.content_url)
      login(userData, accessToken)
      try {
        if (window.OneSignalInitialized && userData?.id) {
          await window.OneSignal.login(userData.id)
        }
      } catch (e) { console.warn('OneSignal link failed:', e) }
      redirectBasedOnUserType(userData, requiresProfileCompletion)
    } else {
      error.value = response?.data?.message || response?.data?.errors?.[0] || 'خطأ في تسجيل الدخول'
    }
  } catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || err?.response?.data?.errors?.[0] || err?.message
    if (typeof msg === 'string' && msg.includes('غير مفعل')) {
      await router.push({ path: '/verify-email', query: { email: form.value.email } })
      return
    }
    error.value = msg || 'خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.'
  } finally {
    isLoading.value = false
  }
}

const handleGoogleLogin = async (response) => {
  try {
    const token = response.credential
    if (!token) return
    const playerId = await getOneSignalPlayerId()
    const res = await Auth.loginInGoogele({
      idToken: token,
      oneSignalPlayerId: playerId,
      referralCode: referralCode.value || undefined,
    })
    if (res.data.success) {
      const { user: userData, token: accessToken, requiresProfileCompletion, isProfileComplete } = res.data.data
      if (userData?.userType === 'student') { showStudentAppDialog.value = true; return }
      localStorage.setItem('isProfileComplete', isProfileComplete)
      localStorage.setItem('content_url', res.data.content_url)
      login(userData, accessToken)
      try {
        if (window.OneSignalInitialized && userData?.id) await window.OneSignal.login(userData.id)
      } catch (e) { console.warn('OneSignal link failed:', e) }
      redirectBasedOnUserType(userData, requiresProfileCompletion)
    } else {
      error.value = res?.data?.message || res?.data?.errors?.[0] || 'خطأ في تسجيل الدخول بـ Google'
    }
  } catch (err) {
    error.value = err?.response?.data?.message || err?.response?.data?.errors?.[0] || 'خطأ في تسجيل الدخول بـ Google'
  }
}

const handleRequestPasswordReset = async () => {
  try {
    error.value = ''
    if (!forgotEmail.value) { error.value = 'يرجى إدخال البريد الإلكتروني'; return }
    isLoading.value = true
    const res = await Auth.requestPasswordReset({ email: forgotEmail.value })
    const ok = res?.data?.success || res?.success
    if (ok) {
      forgotDialog.value = false
      resetForm.value.email = forgotEmail.value
      resetDialog.value = true
    } else {
      error.value = res?.data?.message || 'تعذر إرسال رمز إعادة التعيين'
    }
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'تعذر إرسال رمز إعادة التعيين'
  } finally { isLoading.value = false }
}

const handleResetPassword = async () => {
  try {
    error.value = ''
    const f = resetForm.value
    if (!f.email || !f.newPassword || !f.confirmPassword || (!f.code && !f.resetToken)) {
      error.value = 'يرجى تعبئة جميع الحقول المطلوبة'; return
    }
    if (!/^[A-Za-z0-9]{6,}$/.test(f.newPassword)) {
      error.value = 'كلمة المرور يجب أن تكون 6 رموز على الأقل'; return
    }
    if (f.newPassword !== f.confirmPassword) {
      error.value = 'تأكيد كلمة المرور غير مطابق'; return
    }
    isLoading.value = true
    const payload = { email: f.email, newPassword: f.newPassword }
    if (f.code) payload.code = String(f.code)
    if (f.resetToken) payload.resetToken = String(f.resetToken)
    const res = await Auth.resetPassword(payload)
    const ok = res?.data?.success || res?.success
    if (ok) {
      resetDialog.value = false
      await router.push({ path: '/login', query: { email: f.email } })
    } else {
      error.value = res?.data?.message || 'تعذر إعادة تعيين كلمة المرور'
    }
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'تعذر إعادة تعيين كلمة المرور'
  } finally { isLoading.value = false }
}

// ---- Decorative live stats (trust signal) --------------------------------
const fetchVisualStats = async () => {
  const baseURL = axiosInstance?.defaults?.baseURL || import.meta.env.VITE_API_BASE_URL || ''
  const apiOrigin = baseURL.replace(/\/api\/?$/, '')
  try {
    const teacherApi = (await import('@/api/teacher/teacher_api')).default
    const [h, g, p] = await Promise.all([
      fetch(`${apiOrigin}/health`).then(r => r.json()).then(j => ({ healthy: !!j?.success })).catch(() => ({ healthy: false })),
      teacherApi.getGovernorates().then(res => {
        const data = (res?.data?.data || res?.data || {})
        return { gov: Number(data.count) || (Array.isArray(data.governorates) ? data.governorates.length : 0) }
      }).catch(() => ({ gov: 0 })),
      teacherApi.getActivePackages().then(res => {
        const items = Array.isArray(res?.data?.data) ? res.data.data : []
        return { pkg: items.length }
      }).catch(() => ({ pkg: 0 })),
    ])
    apiHealthy.value = h.healthy
    liveStats.value = { governoratesCount: g.gov, packagesCount: p.pkg }
  } catch (e) { console.warn('Failed to load visual stats:', e) }
}

// ---- Lifecycle ------------------------------------------------------------
onMounted(async () => {
  if (checkUserAuth()) return
  await nextTick()

  // Prefill from query params
  try {
    if (route?.query?.email) form.value.email = String(route.query.email)
    if (route?.query?.ref)   referralCode.value = String(route.query.ref)
  } catch { /* ignore */ }

  fetchVisualStats()

  // Google Sign-In init — single login button now (the legacy signup
  // button is gone alongside the register tab).
  const google = window.google
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!google?.accounts?.id || !clientId) {
    console.warn('Google Sign-In not initialized: SDK or VITE_GOOGLE_CLIENT_ID missing.')
    return
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleLogin,
    ux_mode: 'popup',
    auto_select: false,
    use_fedcm_for_prompt: false,
  })
  const el = document.getElementById('google-signin-button')
  if (el) {
    google.accounts.id.renderButton(el, {
      theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular',
      logo_alignment: 'center', width: 320,
    })
  }
})
</script>

<template>
  <!-- Already-authenticated splash -->
  <div v-if="isUserAuthenticated" class="auth-splash">
    <div class="splash-card">
      <VAvatar size="80" color="primary" class="mb-3">
        <img :src="logo" alt="Mulhim IQ" style="width: 56px;">
      </VAvatar>
      <h2>جاري تحويلك إلى لوحة التحكم...</h2>
      <VProgressCircular indeterminate color="primary" class="mt-3" />
    </div>
  </div>

  <!-- Main split-screen layout -->
  <div v-else class="login-shell">
    <router-link to="/" class="back-home" aria-label="العودة للصفحة الرئيسية">
      <VIcon icon="ri-arrow-right-line" size="20" />
    </router-link>

    <!-- ============ Marketing panel (visual right in RTL) ============ -->
    <aside class="marketing-panel">
      <div class="marketing-inner">
        <div class="marketing-brand">
          <img :src="logo" alt="Mulhim IQ" class="brand-logo">
          <div class="brand-name">مُلهِم IQ</div>
        </div>
        <h1 class="marketing-hero">
          منصة تعليم العراق<br>
          <span class="hero-accent">للأساتذة والطلاب</span>
        </h1>
        <p class="marketing-sub">
          إدارة دروسك، رفع دوراتك المرئية، وتنظيم حصصك وفواتيرك من مكان واحد.
        </p>

        <ul class="hero-bullets">
          <li v-for="b in HERO_BULLETS" :key="b.text">
            <span class="bullet-icon"><VIcon :icon="b.icon" size="18" /></span>
            <span>{{ b.text }}</span>
          </li>
        </ul>

        <div v-if="apiHealthy !== null" class="trust-row">
          <div class="trust-pill">
            <span class="dot" :class="{ ok: apiHealthy }" />
            {{ apiHealthy ? 'الخوادم تعمل' : 'تحقّق من الاتصال' }}
          </div>
          <div v-if="liveStats.governoratesCount > 0" class="trust-pill">
            <VIcon icon="ri-map-pin-line" size="14" />
            {{ liveStats.governoratesCount }} محافظة
          </div>
          <div v-if="liveStats.packagesCount > 0" class="trust-pill">
            <VIcon icon="ri-stack-line" size="14" />
            {{ liveStats.packagesCount }} باقة
          </div>
        </div>

        <div class="marketing-footer">
          © {{ new Date().getFullYear() }} مُلهِم IQ. جميع الحقوق محفوظة.
        </div>
      </div>
    </aside>

    <!-- ============ Login card ============ -->
    <main class="login-pane">
      <div class="login-card">
        <header class="login-header">
          <div class="mini-brand">
            <img :src="logo" alt="Mulhim IQ" class="mini-logo">
            <span>مُلهِم IQ</span>
          </div>
          <h1 class="login-heading">👋🏻 مرحباً بعودتك</h1>
          <p class="login-sub">سجّل دخولك للمتابعة إلى لوحة التحكم.</p>
        </header>

        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-3"
          @click:close="error = ''"
        >
          {{ error }}
        </VAlert>

        <VForm class="login-form" @submit.prevent="handleEmailLogin">
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
            variant="outlined"
            density="comfortable"
            color="primary"
            class="mb-2"
            @click:append-inner="isPasswordVisible = !isPasswordVisible"
          />

          <div class="d-flex justify-space-between align-center mb-4 small-links">
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
            <VIcon start size="20" icon="ri-login-box-line" />
            تسجيل الدخول
          </VBtn>

          <div class="auth-divider"><span>أو</span></div>

          <div class="google-btn-wrap">
            <div id="google-signin-button" class="google-signin-wrapper" />
          </div>
        </VForm>

        <!-- New CTAs: apply + status check -->
        <div class="apply-block">
          <div class="apply-title">هل أنت أستاذ جديد؟</div>
          <VBtn
            block
            variant="outlined"
            size="large"
            rounded="lg"
            class="mb-2"
            @click="router.push('/apply-as-teacher')"
          >
            <VIcon start icon="ri-edit-line" />
            تقديم طلب الانضمام كأستاذ
          </VBtn>
          <button
            type="button"
            class="text-link-row"
            @click="router.push('/check-application-status')"
          >
            <VIcon icon="ri-search-line" size="16" />
            سبق وقدّمت — تحقّق من حالة طلبي
          </button>
        </div>

        <p class="legal">
          الطلاب يستخدمون التطبيق الجوّال. هذه اللوحة مخصصة للأساتذة والإدارة فقط.
        </p>
      </div>
    </main>

    <!-- ============ Forgot password dialog ============ -->
    <VDialog v-model="forgotDialog" max-width="520">
      <VCard>
        <VCardTitle>استعادة كلمة المرور</VCardTitle>
        <VCardText>
          <p class="text-medium-emphasis mb-3" style="font-size: 14px">
            أدخل بريدك المسجّل وسنرسل إليك رمز إعادة التعيين.
          </p>
          <VTextField
            v-model="forgotEmail"
            type="email"
            label="البريد الإلكتروني"
            prepend-inner-icon="ri-mail-line"
            variant="outlined"
            density="comfortable"
            color="primary"
            @keydown.enter="handleRequestPasswordReset"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="forgotDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="isLoading" @click="handleRequestPasswordReset">
            إرسال
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ============ Reset password dialog ============ -->
    <VDialog v-model="resetDialog" max-width="560">
      <VCard>
        <VCardTitle>إعادة تعيين كلمة المرور</VCardTitle>
        <VCardText>
          <VTextField
            v-model="resetForm.email"
            type="email"
            label="البريد الإلكتروني"
            prepend-inner-icon="ri-mail-line"
            variant="outlined"
            density="comfortable"
            color="primary"
            class="mb-2"
          />
          <VTextField
            v-model="resetForm.code"
            label="رمز التحقق"
            prepend-inner-icon="ri-key-2-line"
            variant="outlined"
            density="comfortable"
            color="primary"
            class="mb-2"
          />
          <VTextField
            v-model="resetForm.newPassword"
            type="password"
            label="كلمة المرور الجديدة"
            prepend-inner-icon="ri-lock-2-line"
            variant="outlined"
            density="comfortable"
            color="primary"
            class="mb-2"
          />
          <VTextField
            v-model="resetForm.confirmPassword"
            type="password"
            label="تأكيد كلمة المرور"
            prepend-inner-icon="ri-lock-2-line"
            variant="outlined"
            density="comfortable"
            color="primary"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="resetDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="isLoading" @click="handleResetPassword">
            حفظ
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ============ Student-app suggestion dialog ============ -->
    <VDialog v-model="showStudentAppDialog" max-width="460" persistent>
      <VCard>
        <VCardText class="text-center py-8">
          <VAvatar size="80" color="info" class="mb-4">
            <VIcon icon="ri-smartphone-line" size="48" color="white" />
          </VAvatar>
          <h2 class="text-h5 mb-3">استخدم تطبيق الطالب</h2>
          <p class="text-medium-emphasis">
            حساب الطلاب مخصّص للتطبيق الجوّال. يرجى تحميله من المتجر للاستفادة من
            جميع المزايا (مسح QR للحضور، الواجبات، الفواتير...).
          </p>
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VBtn block variant="tonal" @click="showStudentAppDialog = false">حسناً</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
/* ============ Splash for already-logged-in users ============ */
.auth-splash {
  min-height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
}
.splash-card {
  background: #fff;
  border-radius: 20px;
  padding: 40px 28px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
}

/* ============ Split-screen shell ============ */
.login-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr;
  background: #fafbff;
  position: relative;
}
@media (min-width: 992px) {
  .login-shell { grid-template-columns: 1.05fr 1fr; }
}

.back-home {
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
  z-index: 10;
}

/* ============ Marketing panel (right in RTL) ============ */
.marketing-panel {
  display: none;
  position: relative;
  color: #fff;
  background:
    radial-gradient(60% 80% at 100% 0%, rgba(63,169,245,.35), transparent 60%),
    radial-gradient(60% 80% at 0% 100%, rgba(110,242,180,.20), transparent 60%),
    linear-gradient(135deg, #0B2545 0%, #1a3a6f 100%);
  padding: 56px 48px;
}
@media (min-width: 992px) { .marketing-panel { display: block; } }

.marketing-inner {
  position: relative;
  max-width: 520px;
  margin-inline: auto;
  height: 100%;
  display: flex; flex-direction: column;
}
.marketing-brand {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 48px;
}
.brand-logo { width: 44px; height: 44px; border-radius: 10px; background: #fff; padding: 4px; }
.brand-name { font-size: 20px; font-weight: 800; }

.marketing-hero {
  margin: 0;
  font-size: 36px;
  font-weight: 900;
  line-height: 1.3;
}
.hero-accent { color: #6ef2b4; }

.marketing-sub {
  margin: 14px 0 28px;
  font-size: 16px;
  color: rgba(255,255,255,.85);
  line-height: 1.7;
}

.hero-bullets {
  list-style: none;
  padding: 0; margin: 0;
  display: grid; gap: 12px;
}
.hero-bullets li {
  display: flex; align-items: center; gap: 12px;
  font-size: 14px;
  color: rgba(255,255,255,.92);
}
.bullet-icon {
  flex: 0 0 auto;
  width: 32px; height: 32px;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
}

.trust-row {
  margin-top: auto;
  padding-top: 32px;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.trust-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: rgba(255,255,255,.10);
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px;
  font-size: 12px;
}
.trust-pill .dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: #fbbf24;
}
.trust-pill .dot.ok { background: #34d399; }

.marketing-footer {
  padding-top: 18px;
  font-size: 11px;
  color: rgba(255,255,255,.55);
}

/* ============ Login pane ============ */
.login-pane {
  padding: 32px 16px;
  display: flex; align-items: center; justify-content: center;
}
.login-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 20px;
  padding: 36px 28px;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
  border: 1px solid rgba(11,37,69,.05);
}
.login-header { margin-bottom: 16px; text-align: center; }
.mini-brand {
  display: none;
  align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 12px;
  color: #0B2545;
  font-weight: 700;
}
.mini-logo { width: 32px; height: 32px; border-radius: 8px; background: rgba(11,37,69,.06); padding: 3px; }
@media (max-width: 991px) { .mini-brand { display: inline-flex; } }

.login-heading {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0B2545;
}
.login-sub {
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 14px;
}

.login-form { margin-top: 6px; }
.small-links { font-size: 13px; }
.auth-link {
  background: transparent; border: 0; padding: 0;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.auth-link:hover { text-decoration: underline; }

.auth-primary-cta {
  height: 48px;
  font-size: 15px;
  font-weight: 700;
}

.auth-divider {
  position: relative;
  text-align: center;
  margin: 20px 0 14px;
  color: #6b7280;
  font-size: 13px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: rgba(11,37,69,.12);
}
.auth-divider::before { inset-inline-start: 0; }
.auth-divider::after  { inset-inline-end:  0; }
.auth-divider span {
  background: #fff;
  padding: 0 12px;
}

.google-btn-wrap {
  display: flex; justify-content: center;
}
.google-signin-wrapper { min-height: 44px; }

/* Apply CTAs */
.apply-block {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed rgba(11,37,69,.15);
}
.apply-title {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 8px;
  text-align: center;
  font-weight: 600;
}
.text-link-row {
  display: inline-flex; align-items: center; gap: 6px;
  width: 100%;
  justify-content: center;
  background: transparent; border: 0;
  font-size: 13px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
}
.text-link-row:hover { text-decoration: underline; }

.legal {
  margin-top: 18px;
  text-align: center;
  font-size: 11px;
  color: #6b7280;
  line-height: 1.6;
}
</style>
