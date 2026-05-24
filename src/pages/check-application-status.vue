<script setup>
// Public "where is my application?" screen — Phase 8.12.
//
// Three-stage flow:
//   1. enter email   → POST /status/request  (always succeeds — server
//                      enforces anti-enumeration; OTP only emailed when
//                      a row matches)
//   2. enter OTP     → POST /status/verify   (returns status + reason)
//   3. show status   → status + reason/admin notes if applicable, with
//                      a "submit a new application" CTA for the
//                      rejected / needs_more_info branches.

import { useRouter } from 'vue-router'
import TeacherAppApi from '@/api/teacher-application/teacher_application_api.js'

definePage({ meta: { layout: 'blank', public: true } })

const router = useRouter()

const STAGE = { EMAIL: 'email', CODE: 'code', RESULT: 'result' }
const stage = ref(STAGE.EMAIL)

const email = ref('')
const code = ref('')
const busy = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

const result = ref(null) // { applicationId, status, rejectionReason, adminNotes, createdAt, ... }

function onlyDigits (v) {
  return String(v || '').replace(/\D/g, '').slice(0, 6)
}

function emailValid (v) {
  const s = String(v || '').trim()
  
  return s.length > 5 && s.includes('@') && s.includes('.')
}

async function requestOtp () {
  errorMsg.value = ''
  infoMsg.value = ''
  if (!emailValid(email.value)) {
    errorMsg.value = 'صيغة البريد الإلكتروني غير صحيحة'
    
    return
  }
  busy.value = true
  try {
    await TeacherAppApi.requestStatusOtp(email.value.trim())
    stage.value = STAGE.CODE
    infoMsg.value =
      'إن كان البريد الإلكتروني مرتبطاً بطلب انضمام، فقد أرسلنا إليه رمز تحقق مكوّن من 6 أرقام.'
  } catch (err) {
    errorMsg.value =
      err?.response?.data?.message
      || err?.message
      || 'حدث خطأ غير متوقع'
  } finally {
    busy.value = false
  }
}

async function verifyOtp () {
  errorMsg.value = ''
  infoMsg.value = ''

  const c = onlyDigits(code.value)
  if (c.length !== 6) {
    errorMsg.value = 'الرمز يجب أن يكون 6 أرقام'
    
    return
  }
  busy.value = true
  try {
    const res = await TeacherAppApi.verifyStatusOtp(email.value.trim(), c)

    result.value = res?.data?.data || null
    stage.value = STAGE.RESULT
  } catch (err) {
    errorMsg.value =
      err?.response?.data?.message
      || err?.message
      || 'فشل التحقق من الرمز'
  } finally {
    busy.value = false
  }
}

function resetFlow () {
  stage.value = STAGE.EMAIL
  code.value = ''
  errorMsg.value = ''
  infoMsg.value = ''
  result.value = null
}

const statusConfig = computed(() => {
  if (!result.value) return null
  const s = result.value.status
  switch (s) {
  case 'approved':
    return {
      icon: 'ri-checkbox-circle-line',
      color: 'success',
      title: 'تمّت الموافقة',
      sub: 'تمت الموافقة على طلبك. يمكنك تسجيل الدخول الآن باستخدام بياناتك.',
      showLogin: true,
      showResubmit: false,
    }
  case 'rejected':
    return {
      icon: 'ri-close-circle-line',
      color: 'error',
      title: 'تم رفض الطلب',
      sub: 'نأسف لإبلاغك بأنه لم تتم الموافقة على طلبك في هذه المرة.',
      showLogin: false,
      showResubmit: true,
    }
  case 'needs_more_info':
    return {
      icon: 'ri-question-line',
      color: 'warning',
      title: 'مطلوب معلومات إضافية',
      sub: 'يحتاج فريق المراجعة إلى معلومات إضافية لإكمال دراسة طلبك.',
      showLogin: false,
      showResubmit: true,
    }
  case 'pending':
  default:
    return {
      icon: 'ri-time-line',
      color: 'primary',
      title: 'الطلب قيد المراجعة',
      sub: 'تم استلام طلبك وهو قيد المراجعة من قبل فريق الإدارة. سنتواصل معك قريباً.',
      showLogin: false,
      showResubmit: false,
    }
  }
})
</script>

<template>
  <div class="status-wrap">
    <div class="status-card">
      <RouterLink
        to="/login"
        class="back-home"
        aria-label="رجوع"
      >
        <VIcon
          icon="ri-arrow-right-line"
          size="20"
        />
      </RouterLink>

      <!-- ============ Stage 1: email ============ -->
      <template v-if="stage === STAGE.EMAIL">
        <div class="hero-icon">
          <VIcon
            icon="ri-search-line"
            size="44"
            color="primary"
          />
        </div>
        <h1 class="heading">
          تحقّق من حالة طلبك
        </h1>
        <p class="sub">
          أدخل البريد الإلكتروني الذي استخدمته عند التقديم وسنرسل إليك رمزاً
          للاطّلاع على الحالة.
        </p>
        <VTextField
          v-model="email"
          label="البريد الإلكتروني"
          type="email"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="ri-mail-line"
          class="mt-4"
          @keydown.enter="requestOtp"
        />
        <VBtn
          block
          size="large"
          color="primary"
          rounded="lg"
          class="mt-2"
          :loading="busy"
          @click="requestOtp"
        >
          <VIcon
            start
            icon="ri-send-plane-line"
          />
          إرسال الرمز
        </VBtn>
      </template>

      <!-- ============ Stage 2: code ============ -->
      <template v-else-if="stage === STAGE.CODE">
        <div class="hero-icon">
          <VIcon
            icon="ri-mail-check-line"
            size="44"
            color="primary"
          />
        </div>
        <h1 class="heading">
          أدخل الرمز
        </h1>
        <VAlert
          v-if="infoMsg"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ infoMsg }}
        </VAlert>
        <VTextField
          :model-value="code"
          label="رمز التحقق"
          placeholder="------"
          variant="outlined"
          density="comfortable"
          inputmode="numeric"
          maxlength="6"
          class="otp-input mt-3"
          @update:model-value="(v) => code = onlyDigits(v)"
          @keydown.enter="verifyOtp"
        />
        <VBtn
          block
          size="large"
          color="primary"
          rounded="lg"
          class="mt-2"
          :loading="busy"
          :disabled="onlyDigits(code).length !== 6"
          @click="verifyOtp"
        >
          <VIcon
            start
            icon="ri-shield-check-line"
          />
          تأكيد
        </VBtn>
        <VBtn
          block
          variant="text"
          class="mt-1"
          :disabled="busy"
          @click="resetFlow"
        >
          استخدام بريد إلكتروني آخر
        </VBtn>
      </template>

      <!-- ============ Stage 3: result ============ -->
      <template v-else-if="stage === STAGE.RESULT && statusConfig">
        <div
          class="hero-icon"
          :style="{ background: `rgba(var(--v-theme-${statusConfig.color}), 0.12)` }"
        >
          <VIcon
            :icon="statusConfig.icon"
            size="44"
            :color="statusConfig.color"
          />
        </div>
        <h1 class="heading">
          {{ statusConfig.title }}
        </h1>
        <p class="sub">
          {{ statusConfig.sub }}
        </p>

        <div
          v-if="result.status === 'rejected' && result.rejectionReason"
          class="quote-box"
          :style="{ borderColor: `rgba(var(--v-theme-${statusConfig.color}), 0.4)`,
                    background: `rgba(var(--v-theme-${statusConfig.color}), 0.05)` }"
        >
          <div
            class="quote-title"
            :style="{ color: `rgb(var(--v-theme-${statusConfig.color}))` }"
          >
            سبب الرفض
          </div>
          <div class="quote-body">
            {{ result.rejectionReason }}
          </div>
        </div>

        <div
          v-if="result.status === 'needs_more_info' && result.adminNotes"
          class="quote-box"
          :style="{ borderColor: `rgba(var(--v-theme-${statusConfig.color}), 0.4)`,
                    background: `rgba(var(--v-theme-${statusConfig.color}), 0.05)` }"
        >
          <div
            class="quote-title"
            :style="{ color: `rgb(var(--v-theme-${statusConfig.color}))` }"
          >
            ملاحظات الإدارة
          </div>
          <div class="quote-body">
            {{ result.adminNotes }}
          </div>
        </div>

        <VBtn
          v-if="statusConfig.showLogin"
          block
          size="large"
          color="success"
          rounded="lg"
          class="mt-3"
          @click="router.push('/login')"
        >
          <VIcon
            start
            icon="ri-login-box-line"
          />
          تسجيل الدخول
        </VBtn>
        <VBtn
          v-if="statusConfig.showResubmit"
          block
          size="large"
          color="primary"
          rounded="lg"
          class="mt-3"
          @click="router.push('/apply-as-teacher/form')"
        >
          <VIcon
            start
            icon="ri-refresh-line"
          />
          تقديم طلب جديد
        </VBtn>
        <VBtn
          block
          variant="outlined"
          class="mt-2"
          @click="resetFlow"
        >
          استعلام عن طلب آخر
        </VBtn>
      </template>

      <VAlert
        v-if="errorMsg"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        {{ errorMsg }}
      </VAlert>
    </div>
  </div>
</template>

<style scoped>
.status-wrap {
  min-height: 100dvh;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(11,37,69,0.06), transparent 60%),
    linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 32px 16px;
}
.status-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 28px 28px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
  border: 1px solid rgba(11,37,69,.05);
}
.back-home {
  position: absolute;
  inset-inline-start: 12px;
  inset-block-start: 12px;
  display: inline-flex;
  width: 36px; height: 36px;
  align-items: center; justify-content: center;
  border-radius: 999px;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  background: rgba(11,37,69,.04);
}
.hero-icon {
  width: 88px; height: 88px;
  border-radius: 999px;
  background: rgba(11,37,69,.08);
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.heading { margin: 0; font-size: 22px; font-weight: 800; color: #0B2545; }
.sub { margin: 8px 0 0; color: #4b5563; line-height: 1.7; font-size: 14px; }
.otp-input :deep(input) {
  text-align: center;
  letter-spacing: 6px;
  font-size: 24px;
  font-weight: 700;
}
.quote-box {
  text-align: start;
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 10px;
  margin-top: 18px;
}
.quote-title { font-size: 13px; font-weight: 700; }
.quote-body { font-size: 14px; color: #1f2937; margin-top: 4px; line-height: 1.6; }
</style>
