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

// التحقق من حالة اكتمال البيانات
const isProfileComplete = ref(
  JSON.parse(localStorage.getItem("isProfileComplete"))
);
</script>

<template>
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <VApp
      :style="`--v-global-theme-primary: ${hexToRgb(
        global.current.value.colors.primary
      )}`"
    >
      <!-- 🚨 تنبيه دائم يظهر إذا البيانات غير مكتملة -->
      <v-alert
        v-if="isProfileComplete === false"
        type="warning"
        style="
          position: fixed;
          z-index: 98999999;
          block-size: 11%;
          inline-size: 78%;
          inset-block-start: 1%;
          inset-inline-end: 1%;
        "
        prominent
        border="start"
        elevation="2"
        class="mb-4"
      >
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
