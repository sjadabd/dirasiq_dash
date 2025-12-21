<script setup>
import { useAuth } from "@/composables/useAuth";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

definePage({
  meta: {
    layout: "default",
    requiresAuth: true,
  },
});

const router = useRouter();
const { hasPermission } = useAuth();

onMounted(() => {
  if (!hasPermission("super_admin")) {
    router.push("/login");
  }
});
</script>

<template>
  <div class="pa-6 d-flex flex-column gap-4">
    <VCard elevation="2">
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon color="primary">mdi-cog</VIcon>
        <span>إعدادات السوبر أدمن</span>
      </VCardTitle>
      <VCardText>
        <div class="d-flex flex-column gap-3">
          <RouterLink to="/admin/subscription-packages/show-subscription-packages">
            <VBtn block color="primary" variant="tonal">إدارة الباقات</VBtn>
          </RouterLink>

          <RouterLink to="/admin/settings/booking-confirm-fee">
            <VBtn block color="primary" variant="tonal">رسوم تأكيد طلب الطالب</VBtn>
          </RouterLink>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>
