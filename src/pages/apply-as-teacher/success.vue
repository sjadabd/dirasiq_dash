<script setup>
// Application submitted — success state. Lands here after a successful
// google-path submit OR after a successful email-path OTP verification.

import { useRoute, useRouter } from 'vue-router'

definePage({ meta: { layout: 'blank', public: true } })

const router = useRouter()
const route = useRoute()
const email = computed(() => String(route.query.email || ''))
</script>

<template>
  <div class="success-wrap">
    <div class="success-card">
      <div class="success-icon">
        <VIcon
          icon="ri-checkbox-circle-line"
          size="60"
          color="success"
        />
      </div>
      <h1 class="success-heading">
        تم استلام طلبك بنجاح
      </h1>
      <p class="success-sub">
        شكراً لتقديمك طلب الانضمام إلى مُلهِم IQ. سيقوم فريق الإدارة بمراجعة
        طلبك خلال 24–72 ساعة عمل.
      </p>
      <p
        v-if="email"
        class="success-email"
      >
        رمز إشعار النتيجة سيصلك على <strong>{{ email }}</strong>
      </p>

      <div class="next-steps">
        <div class="step">
          <VIcon
            icon="ri-mail-line"
            color="primary"
          />
          <span>سيصلك بريد فور البتّ في طلبك</span>
        </div>
        <div class="step">
          <VIcon
            icon="ri-search-line"
            color="primary"
          />
          <span>تستطيع متابعة حالة طلبك في أي وقت</span>
        </div>
        <div class="step">
          <VIcon
            icon="ri-lock-password-line"
            color="primary"
          />
          <span>بعد القبول ستستخدم بريدك للدخول إلى لوحة التحكم</span>
        </div>
      </div>

      <div class="cta-row">
        <VBtn
          block
          size="large"
          color="primary"
          rounded="lg"
          @click="router.push('/check-application-status')"
        >
          <VIcon
            start
            icon="ri-search-line"
          />
          تحقق من حالة طلبي
        </VBtn>
        <VBtn
          block
          variant="text"
          class="mt-2"
          @click="router.push('/login')"
        >
          العودة لصفحة الدخول
        </VBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success-wrap {
  min-height: 100dvh;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(34,197,94,0.08), transparent 60%),
    linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 32px 16px;
}
.success-card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 28px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
  border: 1px solid rgba(11,37,69,.05);
}
.success-icon {
  width: 96px; height: 96px;
  border-radius: 999px;
  background: rgba(34,197,94,.12);
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.success-heading {
  margin: 0;
  font-size: 24px; font-weight: 800;
  color: #0B2545;
}
.success-sub {
  margin: 12px 0 0;
  color: #4b5563;
  line-height: 1.7;
}
.success-email {
  margin-top: 8px; color: #4b5563; font-size: 14px;
}
.next-steps {
  text-align: start;
  margin: 22px 0 26px;
  display: grid; gap: 10px;
}
.step {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(11,37,69,.08);
  border-radius: 10px;
  background: #fafbff;
  font-size: 14px;
  color: #1f2937;
}
.cta-row { margin-top: 8px; }
</style>
