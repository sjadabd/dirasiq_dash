<script setup>
// Legacy /teacher/billing/pricing route — the subscription-package
// catalog (AppPricing) was retired in Phase 7. The replacement flow is the
// wallet top-up page, so this route now redirects there instead of 404-ing
// or rendering a broken component. Old bookmarks + the dashboard "ترقية
// الباقة" CTA keep working.

import { onMounted } from "vue"
import { useRouter } from "vue-router"

definePage({
  meta: {
    layout: "default",
    requiresAuth: true,
  },
})

const router = useRouter()

onMounted(() => {
  router.replace("/teacher/wallet")
})
</script>

<template>
  <div
    class="pa-6 d-flex flex-column align-center justify-center"
    style="min-block-size: 60vh;"
  >
    <VProgressCircular
      indeterminate
      color="primary"
      size="48"
    />
    <div class="text-body-1 mt-3">
      جارٍ التحويل إلى المحفظة...
    </div>
  </div>
</template>
