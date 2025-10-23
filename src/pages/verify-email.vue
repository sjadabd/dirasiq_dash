<script setup>
import Auth from '@/api/auth/auth_api.js'
import { useRouter, useRoute } from 'vue-router'

definePage({ meta: { layout: 'blank', public: true } })

const router = useRouter()
const route = useRoute()

const form = ref({
  email: route.query?.email || '',
  code: '',
  verificationToken: '',
})
const loading = ref(false)
const message = ref('')
const error = ref('')

const handleVerify = async () => {
  try {
    error.value = ''
    message.value = ''
    loading.value = true
    const payload = { email: form.value.email }
    if (form.value.code) payload.code = String(form.value.code)
    if (form.value.verificationToken) payload.verificationToken = String(form.value.verificationToken)
    if (!payload.code && !payload.verificationToken) {
      error.value = 'يرجى إدخال رمز التحقق'
      return
    }
    const res = await Auth.verifyEmail(payload)
    const ok = res?.data?.success || res?.success
    const msg = res?.data?.message || res?.message || 'تم تفعيل الحساب بنجاح'
    if (ok) {
      message.value = msg
      // بعد ثوانٍ نعيد المستخدم لتسجيل الدخول
      setTimeout(() => router.push({ path: '/login', query: { email: form.value.email } }), 1200)
    } else {
      error.value = msg || 'تعذر تفعيل الحساب'
    }
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message
    error.value = msg || 'تعذر تفعيل الحساب'
  } finally {
    loading.value = false
  }
}

const handleResend = async () => {
  try {
    error.value = ''
    message.value = ''
    if (!form.value.email) {
      error.value = 'يرجى إدخال البريد الإلكتروني'
      return
    }
    loading.value = true
    const res = await Auth.resendVerification({ email: form.value.email })
    const ok = res?.data?.success || res?.success
    const msg = res?.data?.message || res?.message || 'تم إرسال رمز التحقق إلى بريدك'
    if (ok) message.value = msg
    else error.value = msg || 'تعذر إرسال رمز التحقق'
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message
    error.value = msg || 'تعذر إرسال رمز التحقق'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="d-flex align-center justify-center min-vh-100">
    <VCard max-width="520" class="pa-6 w-100">
      <VCardTitle class="text-center">تفعيل الحساب</VCardTitle>
      <VCardText>
        <VAlert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">{{ error }}</VAlert>
        <VAlert v-if="message" type="success" variant="tonal" class="mb-4" closable @click:close="message = ''">{{ message }}</VAlert>

        <VForm @submit.prevent="handleVerify">
          <VRow>
            <VCol cols="12">
              <VTextField v-model="form.email" type="email" label="البريد الإلكتروني" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.code" label="رمز التحقق (6 أرقام)" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.verificationToken" label="رمز بديل (إن وجد)" />
            </VCol>
            <VCol cols="12" class="d-flex gap-2">
              <VBtn type="submit" :loading="loading" color="primary">تفعيل</VBtn>
              <VBtn variant="text" :loading="loading" @click="handleResend">إعادة إرسال الرمز</VBtn>
              <VSpacer />
              <VBtn variant="tonal" to="/login">عودة لتسجيل الدخول</VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </div>
</template>
