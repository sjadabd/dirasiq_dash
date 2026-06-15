<script setup>
import adminApi from "@/api/admin/admin_api"
import { useAuth } from "@/composables/useAuth"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

definePage({
  meta: {
    layout: "default",
    requiresAuth: true,
  },
})

const router = useRouter()
const { hasPermission } = useAuth()

const loading = ref(false)
const saving = ref(false)
const error = ref("")
const videoCoursePurchasesEnabled = ref(false)
const teacherWalletTopupsEnabled = ref(false)
const snackbar = ref({
  show: false,
  message: "",
  color: "success",
})

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

async function loadSettings() {
  loading.value = true
  error.value = ""
  try {
    const response = await adminApi.getPaymentFeatures()
    const data = unwrap(response)
    videoCoursePurchasesEnabled.value = data.videoCoursePurchasesEnabled === true
    teacherWalletTopupsEnabled.value = data.teacherWalletTopupsEnabled === true
  } catch (e) {
    error.value =
      e?.response?.data?.message ||
      e?.message ||
      "تعذّر تحميل إعدادات ميزات الدفع"
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    const response = await adminApi.setPaymentFeatures({
      videoCoursePurchasesEnabled: videoCoursePurchasesEnabled.value,
      teacherWalletTopupsEnabled: teacherWalletTopupsEnabled.value,
    })
    const data = unwrap(response)
    videoCoursePurchasesEnabled.value = data.videoCoursePurchasesEnabled === true
    teacherWalletTopupsEnabled.value = data.teacherWalletTopupsEnabled === true
    snackbar.value = {
      show: true,
      message: "تم حفظ إعدادات ميزات الدفع",
      color: "success",
    }
  } catch (e) {
    snackbar.value = {
      show: true,
      message:
        e?.response?.data?.message ||
        e?.message ||
        "تعذّر حفظ إعدادات ميزات الدفع",
      color: "error",
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!hasPermission("super_admin")) {
    router.push("/login")
    return
  }
  await loadSettings()
})
</script>

<template>
  <div class="pa-6 d-flex flex-column gap-4">
    <AppBreadcrumbs
      :items="[
        { title: 'الرئيسية', disabled: false, to: '/admin/dashboard' },
        { title: 'الإعدادات', disabled: false, to: '/admin/settings' },
        { title: 'ميزات الشراء والشحن', disabled: true },
      ]"
    />

    <VCard elevation="2">
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <VIcon color="primary">
            mdi-credit-card-settings-outline
          </VIcon>
          <span>التحكم بميزات الشراء والشحن</span>
        </div>
        <VBtn
          variant="text"
          size="small"
          :loading="loading"
          @click="loadSettings"
        >
          تحديث
        </VBtn>
      </VCardTitle>

      <VCardText>
        <VAlert
          type="info"
          variant="tonal"
          class="mb-5"
        >
          عند تعطيل أي ميزة، تختفي أزرار الدفع الخاصة بها في التطبيق ويظهر
          بدلها النص: «سوف تتوفر هذه الميزة قريبًا». كما يمنع الخادم إنشاء
          روابط الدفع مباشرة.
        </VAlert>

        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </VAlert>

        <VList lines="three">
          <VListItem>
            <template #prepend>
              <VAvatar color="primary" variant="tonal">
                <VIcon icon="mdi-play-box-multiple-outline" />
              </VAvatar>
            </template>
            <VListItemTitle>شراء دورات الفيديو</VListItemTitle>
            <VListItemSubtitle>
              يسمح للطلاب بإنشاء رابط دفع Wayl لشراء الدورات المسجلة.
            </VListItemSubtitle>
            <template #append>
              <VSwitch
                v-model="videoCoursePurchasesEnabled"
                color="success"
                hide-details
                :disabled="loading || saving"
              />
            </template>
          </VListItem>

          <VDivider class="my-2" />

          <VListItem>
            <template #prepend>
              <VAvatar color="primary" variant="tonal">
                <VIcon icon="mdi-wallet-plus-outline" />
              </VAvatar>
            </template>
            <VListItemTitle>شحن محفظة الأستاذ</VListItemTitle>
            <VListItemSubtitle>
              يسمح للأساتذة بإنشاء رابط Wayl لشحن رصيد المحفظة.
            </VListItemSubtitle>
            <template #append>
              <VSwitch
                v-model="teacherWalletTopupsEnabled"
                color="success"
                hide-details
                :disabled="loading || saving"
              />
            </template>
          </VListItem>
        </VList>

        <div class="d-flex justify-end mt-5">
          <VBtn
            color="primary"
            prepend-icon="mdi-content-save-outline"
            :loading="saving"
            :disabled="loading"
            @click="saveSettings"
          >
            حفظ الإعدادات
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top"
      :timeout="4000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>
