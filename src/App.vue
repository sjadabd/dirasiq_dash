<script setup>
import ScrollToTop from "@core/components/ScrollToTop.vue";
import initCore from "@core/initCore";
import { initConfigStore, useConfigStore } from "@core/stores/config";
import { hexToRgb } from "@core/utils/colorConverter";
import { ref } from "vue";
import { useTheme } from "vuetify";

const { global } = useTheme();

// ℹ️ Sync current theme with initial loader theme
initCore();
initConfigStore();

const configStore = useConfigStore();

// ✅ التحقق من حالة اكتمال البيانات بشكل آمن
const isProfileComplete = ref(false)
const userType = ref(null)

try {
  const storedUser = localStorage.getItem("user")
  const storedProfileComplete = localStorage.getItem("isProfileComplete")

  if (storedProfileComplete !== null)
    isProfileComplete.value = JSON.parse(storedProfileComplete)

  if (storedUser) {
    const parsedUser = JSON.parse(storedUser)
    userType.value = parsedUser?.userType || null
  }
} catch (err) {
  console.warn("⚠️ Error reading user data:", err)
  isProfileComplete.value = false
  userType.value = null
}

</script>

<template>
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <VApp :style="`--v-global-theme-primary: ${hexToRgb(
      global.current.value.colors.primary
    )}`">
      <!-- 🚨 تنبيه دائم يظهر إذا البيانات غير مكتملة -->
      <v-alert v-if="isProfileComplete === false && userType !== 'super_admin' && userType !== null" type="warning"
        style="
          position: fixed;
          z-index: 98999999;
          block-size: 11%;
          inline-size: 78%;
          inset-block-start: 1%;
          inset-inline-end: 1%;
" prominent border="start" elevation="2" class="mb-4">
        <template #prepend>
          <v-icon color="warning" size="28">mdi-account-alert</v-icon>
        </template>

        <div>
          <strong>يرجى إكمال بياناتك الشخصية</strong>
          <p class="text-body-2 mb-0">
            لن تتمكن من الحصول على طلاب عبر المنصة إلا بعد إكمال ملفك الشخصي.
          </p>
        </div>

        <template #append>
          <v-btn color="primary" variant="tonal" to="/teacher/profile-setup">
            إكمال البيانات الآن
          </v-btn>
        </template>
      </v-alert>

      <RouterView />
      <ScrollToTop />
    </VApp>
  </VLocaleProvider>
</template>
