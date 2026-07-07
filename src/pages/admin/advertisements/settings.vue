<script setup>
import Admin from '@/api/admin/admin_api.js'

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  costPerClick: 100,
  minBudget: 5000,
  maxBudget: 500000,
  maxDurationDays: 30,
  autoEndDurationDays: 30,
  allowPublic: true,
  allowGovernorate: true,
  requireApproval: true,
  maxActivePerTeacher: 3,
  imageSizeLimitBytes: 5242880,
  maxTitleLength: 120,
  maxDescriptionLength: 2000,
  refundUnusedBudget: true,
})

const breadcrumbItems = [
  { title: 'الرئيسية', to: '/admin/dashboard', disabled: false },
  { title: 'إعدادات الإعلانات', disabled: true },
]

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await Admin.getAdvertisementSettings()
    const data = res?.data?.data || res?.data || {}
    form.value = {
      costPerClick: Number(data.costPerClick ?? data.cost_per_click ?? 100),
      minBudget: Number(data.minBudget ?? data.min_budget ?? 5000),
      maxBudget: Number(data.maxBudget ?? data.max_budget ?? 500000),
      maxDurationDays: Number(data.maxDurationDays ?? data.max_duration_days ?? 30),
      autoEndDurationDays: Number(data.autoEndDurationDays ?? data.auto_end_duration_days ?? 30),
      allowPublic: Boolean(data.allowPublic ?? data.allow_public ?? true),
      allowGovernorate: Boolean(data.allowGovernorate ?? data.allow_governorate ?? true),
      requireApproval: Boolean(data.requireApproval ?? data.require_approval ?? true),
      maxActivePerTeacher: Number(data.maxActivePerTeacher ?? data.max_active_per_teacher ?? 3),
      imageSizeLimitBytes: Number(data.imageSizeLimitBytes ?? data.image_size_limit_bytes ?? 5242880),
      maxTitleLength: Number(data.maxTitleLength ?? data.max_title_length ?? 120),
      maxDescriptionLength: Number(data.maxDescriptionLength ?? data.max_description_length ?? 2000),
      refundUnusedBudget: Boolean(data.refundUnusedBudget ?? data.refund_unused_budget ?? true),
    }
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر تحميل الإعدادات'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await Admin.updateAdvertisementSettings(form.value)
    successMessage.value = 'تم حفظ الإعدادات'
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'تعذر الحفظ'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.userType !== 'super_admin' && user?.user_type !== 'super_admin') {
      router.push('/login')
      return
    }
  } catch {
    router.push('/login')
    return
  }
  load()
})
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">إعدادات الإعلانات</VCardTitle>
      <VCardText>
        <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-3">{{ errorMessage }}</VAlert>
        <VAlert v-if="successMessage" type="success" variant="tonal" class="mb-3">{{ successMessage }}</VAlert>

        <VSkeletonLoader v-if="loading" type="article" />

        <VForm v-else @submit.prevent="save">
          <VRow>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.costPerClick" label="سعر النقرة (د.ع)" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.minBudget" label="الحد الأدنى للميزانية" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.maxBudget" label="الحد الأقصى للميزانية" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.maxDurationDays" label="أقصى مدة (يوم)" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.autoEndDurationDays" label="مدة الإنهاء التلقائي (يوم)" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.maxActivePerTeacher" label="أقصى إعلانات نشطة لكل معلم" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.maxTitleLength" label="أقصى طول للعنوان" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.maxDescriptionLength" label="أقصى طول للوصف" type="number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model.number="form.imageSizeLimitBytes" label="حد حجم الصورة (بايت)" type="number" />
            </VCol>
            <VCol cols="12" md="3">
              <VSwitch v-model="form.allowPublic" label="السماح بالإعلانات العامة" />
            </VCol>
            <VCol cols="12" md="3">
              <VSwitch v-model="form.allowGovernorate" label="السماح بإعلانات المحافظة" />
            </VCol>
            <VCol cols="12" md="3">
              <VSwitch v-model="form.requireApproval" label="يتطلب موافقة الأدمن" />
            </VCol>
            <VCol cols="12" md="3">
              <VSwitch v-model="form.refundUnusedBudget" label="استرداد الميزانية غير المستخدمة" />
            </VCol>
          </VRow>
          <div class="mt-4">
            <VBtn color="primary" type="submit" :loading="saving">حفظ الإعدادات</VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </div>
</template>
