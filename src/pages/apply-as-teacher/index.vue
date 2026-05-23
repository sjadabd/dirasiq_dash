<script setup>
// Apply-as-Teacher landing — first touchpoint for a prospective teacher
// on the dashboard. Mirrors Flutter's JoinAsTeacherScreen: a short sell,
// a primary CTA into the multi-step form, and a secondary "I already
// applied — check my status" path.

import { useRouter } from 'vue-router'

definePage({ meta: { layout: 'blank', public: true } })

const router = useRouter()

const BULLETS = [
  {
    icon: 'ri-file-list-3-line',
    title: 'تقديم سريع وبسيط',
    subtitle: 'املأ النموذج على 4 خطوات قصيرة. لن تستغرق أكثر من 5 دقائق.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'مراجعة من الإدارة',
    subtitle: 'يتم مراجعة طلبك خلال 24–72 ساعة عمل من قبل فريق الإدارة.',
  },
  {
    icon: 'ri-mail-check-line',
    title: 'إشعار فوري بالنتيجة',
    subtitle: 'ستصلك رسالة بالبريد الإلكتروني فور البتّ في طلبك.',
  },
  {
    icon: 'ri-video-line',
    title: 'بثّ ومحتوى مرئي',
    subtitle: 'بعد القبول تستطيع رفع دوراتك المرئية مباشرةً عبر Bunny Stream.',
  },
]
</script>

<template>
  <div class="apply-landing">
    <router-link to="/" class="back-home" aria-label="الرجوع للصفحة الرئيسية">
      <VIcon icon="ri-arrow-right-line" size="20" />
    </router-link>

    <div class="apply-container">
      <div class="apply-card">
        <div class="brand">
          <VAvatar color="primary" size="64" class="brand-avatar">
            <VIcon icon="ri-graduation-cap-line" size="36" color="white" />
          </VAvatar>
          <h1 class="brand-heading">انضم إلى مُلهِم IQ كأستاذ</h1>
          <p class="brand-sub">
            قدّم طلب الانضمام، أرفق مستنداتك، وسيتواصل معك فريق الإدارة فور
            المراجعة.
          </p>
        </div>

        <div class="bullets">
          <div v-for="b in BULLETS" :key="b.title" class="bullet">
            <div class="bullet-icon">
              <VIcon :icon="b.icon" size="22" color="primary" />
            </div>
            <div class="bullet-body">
              <div class="bullet-title">{{ b.title }}</div>
              <div class="bullet-sub">{{ b.subtitle }}</div>
            </div>
          </div>
        </div>

        <div class="cta-row">
          <VBtn
            block
            size="x-large"
            color="primary"
            rounded="lg"
            @click="router.push('/apply-as-teacher/form')"
          >
            <VIcon start size="20" icon="ri-edit-line" />
            ابدأ تقديم الطلب
          </VBtn>
          <VBtn
            block
            variant="outlined"
            size="large"
            rounded="lg"
            class="mt-3"
            @click="router.push('/check-application-status')"
          >
            <VIcon start size="18" icon="ri-search-line" />
            سبق وقدّمت — تحقّق من حالة طلبي
          </VBtn>
        </div>

        <p class="legal">
          إنشاء حسابات المعلمين يتمّ حصراً من قبل الإدارة بعد قبول الطلب.
          بإرسالك للطلب فأنت توافق على شروط استخدام المنصة.
        </p>

        <div class="login-link">
          لديك حساب أستاذ مفعّل بالفعل؟
          <router-link to="/login">تسجيل الدخول</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apply-landing {
  min-height: 100dvh;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(11,37,69,0.06), transparent 60%),
    linear-gradient(180deg, #fafbff 0%, #f4f6fb 100%);
  padding: 32px 16px;
  position: relative;
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
}
.apply-container {
  max-width: 720px;
  margin: 0 auto;
}
.apply-card {
  background: #fff;
  border-radius: 20px;
  padding: 36px 28px;
  box-shadow: 0 10px 40px rgba(11,37,69,.08);
  border: 1px solid rgba(11,37,69,.05);
}
.brand { text-align: center; margin-bottom: 28px; }
.brand-avatar { margin-inline: auto; margin-block-end: 16px; }
.brand-heading {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #0B2545;
}
.brand-sub {
  margin: 8px 0 0;
  color: #4b5563;
  font-size: 15px;
  max-width: 540px;
  margin-inline: auto;
  line-height: 1.7;
}
.bullets { display: grid; gap: 14px; margin-bottom: 24px; }
.bullet {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 14px;
  border: 1px solid rgba(11,37,69,.08);
  border-radius: 12px;
  background: #fafbff;
}
.bullet-icon {
  flex: 0 0 auto;
  width: 38px; height: 38px;
  border-radius: 999px;
  background: rgba(11,37,69,.08);
  display: inline-flex; align-items: center; justify-content: center;
}
.bullet-title { font-weight: 700; color: #0B2545; }
.bullet-sub { font-size: 13px; color: #4b5563; margin-top: 2px; }
.cta-row { margin-top: 8px; }
.legal {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
.login-link {
  margin-top: 14px;
  text-align: center;
  font-size: 14px;
  color: #4b5563;
}
.login-link a {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.login-link a:hover { text-decoration: underline; }
</style>
