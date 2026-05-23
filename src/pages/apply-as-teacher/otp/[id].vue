<script setup>
// Email-OTP verification step (Phase 8). Reached only via the email path
// of the teacher-application form. The backend created the application
// row + emailed the 6-digit code; this screen verifies it.
//
// Route params: id (applicationId)
// Route query: email (for display only — backend re-derives from the row)

import { useRoute, useRouter } from 'vue-router'
import TeacherAppApi from '@/api/teacher-application/teacher_application_api.js'

definePage({ meta: { layout: 'blank', public: true } })

const route = useRoute()
const router = useRouter()

const applicationId = computed(() => String(route.params.id))
const email = computed(() => String(route.query.email || ''))

const code = ref('')
const verifying = ref(false)
const resending = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

// Auto-focus on mount
const codeInputRef = ref(null)
onMounted(() => {
  // Tiny tick so the v-text-field has a DOM node.
  setTimeout(() => {
    try { codeInputRef.value?.focus?.() } catch (_) { /* no-op */ }
  }, 50)
})

function onlyDigits (val) {
  return String(val || '').replace(/\D/g, '').slice(0, 6)
}

async function verify () {
  errorMsg.value = ''
  infoMsg.value = ''
  const c = onlyDigits(code.value)
  if (c.length !== 6) {
    errorMsg.value = 'الرمز يجب أن يكون 6 أرقام'
    return
  }
  verifying.value = true
  try {
    await TeacherAppApi.verifyEmailOtp(applicationId.value, c)
    router.replace({
      path: '/apply-as-teacher/success',
      query: email.value ? { email: email.value } : {},
    })
  } catch (err) {
    errorMsg.value =
      err?.response?.data?.errors?.[0]?.message
      || err?.response?.data?.message
      || err?.message
      || 'فشل التحقق من الرمز'
  } finally {
    verifying.value = false
  }
}

async function resend () {
  errorMsg.value = ''
  infoMsg.value = ''
  resending.value = true
  try {
    await TeacherAppApi.resendVerificationCode(applicationId.value)
    infoMsg.value = email.value
      ? `تم إرسال رمز جديد إلى ${email.value}`
      : 'تم إرسال رمز جديد إلى بريدك الإلكتروني'
  } catch (err) {
    errorMsg.value =
      err?.response?.data?.message
      || err?.message
      || 'تعذر إرسال رمز جديد'
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="otp-wrap">
    <div class="otp-card">
      <div class="otp-icon">
        <VIcon icon="ri-mail-check-line" size="44" color="primary" />
      </div>
      <h1 class="otp-heading">أدخل رمز التحقق</h1>
      <p class="otp-sub">
        أرسلنا رمزاً مكوّناً من 6 أرقام إلى:<br>
        <strong>{{ email || 'بريدك الإلكتروني' }}</strong>
      </p>

      <VTextField
        ref="codeInputRef"
        :model-value="code"
        :rules="[(v) => onlyDigits(v).length === 6 || 'الرمز يجب أن يكون 6 أرقام']"
        label="رمز التحقق"
        placeholder="------"
        variant="outlined"
        density="comfortable"
        inputmode="numeric"
        maxlength="6"
        class="otp-input mt-4"
        @update:model-value="(v) => code = onlyDigits(v)"
        @keydown.enter="verify"
      />

      <VBtn
        block
        size="large"
        color="primary"
        rounded="lg"
        class="mt-3"
        :loading="verifying"
        :disabled="onlyDigits(code).length !== 6"
        @click="verify"
      >
        <VIcon start icon="ri-shield-check-line" />
        تأكيد
      </VBtn>

      <VBtn
        block
        variant="text"
        class="mt-2"
        :loading="resending"
        @click="resend"
      >
        <VIcon start icon="ri-refresh-line" />
        إرسال رمز جديد
      </VBtn>

      <VAlert
        v-if="errorMsg"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        {{ errorMsg }}
      </VAlert>
      <VAlert
        v-if="infoMsg"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        {{ infoMsg }}
      </VAlert>

      <div class="legal">
        إذا لم يصلك الرمز خلال دقيقة، تحقّق من مجلد البريد المزعج أو اطلب
        إرسال رمز جديد.
      </div>
    </div>
  </div>
</template>

<style scoped>
.otp-wrap {
  min-height: 100dvh;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(11,37,69,0.06), transparent 60%),
    linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 32px 16px;
}
.otp-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 20px;
  padding: 36px 28px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
  border: 1px solid rgba(11,37,69,.05);
}
.otp-icon {
  width: 88px; height: 88px;
  border-radius: 999px;
  background: rgba(11,37,69,.08);
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.otp-heading { margin: 0; font-size: 22px; font-weight: 800; color: #0B2545; }
.otp-sub { margin: 8px 0 0; color: #4b5563; line-height: 1.7; font-size: 14px; }
.otp-input :deep(input) {
  text-align: center;
  letter-spacing: 6px;
  font-size: 24px;
  font-weight: 700;
}
.legal {
  margin-top: 16px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
</style>
