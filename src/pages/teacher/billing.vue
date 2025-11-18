<script setup>
import AppPricing from '@/components/AppPricing.vue'
import teacher_api from '@/api/teacher/teacher_api'
import { onMounted, ref } from 'vue'

definePage({
  meta: {
    layout: 'default',
    requiresAuth: true,
  },
})

const capacity = ref({
  currentStudents: 0,
  maxStudents: 0,
  remaining: 0,
  canAdd: false,
})
const capacityLoading = ref(false)
const capacityError = ref('')

async function fetchCapacity() {
  capacityLoading.value = true
  capacityError.value = ''
  try {
    const res = await teacher_api.getRemainingStudents()
    const ok = res?.data?.success || res?.success
    const data = res?.data?.data || res?.data || res

    if (!ok || !data) {
      throw new Error(res?.data?.message || 'تعذر جلب تقرير السعة')
    }

    capacity.value = {
      currentStudents: Number(data.currentStudents) || 0,
      maxStudents: Number(data.maxStudents) || 0,
      remaining: Number(data.remaining) || 0,
      canAdd: Boolean(data.canAdd),
    }
  } catch (err) {
    console.warn('Failed to fetch remaining students:', err)
    capacityError.value =
      err?.response?.data?.message ||
      err?.message ||
      'تعذر جلب تقرير السعة، يرجى المحاولة لاحقًا'
  } finally {
    capacityLoading.value = false
  }
}

onMounted(() => {
  fetchCapacity()
})
</script>

<template>
  <div class="pa-6 d-flex flex-column gap-4">
    <VCard elevation="2">
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <VIcon color="primary">mdi-account-group</VIcon>
          <span>سعة اشتراك الطلاب</span>
        </div>
        <VBtn variant="text" size="small" :loading="capacityLoading" @click="fetchCapacity">
          تحديث
        </VBtn>
      </VCardTitle>
      <VCardText>
        <VAlert v-if="capacityError" type="error" variant="tonal" class="mb-4" density="comfortable">
          {{ capacityError }}
        </VAlert>

        <div class="d-flex flex-wrap gap-4">
          <div>
            <div class="text-caption text-medium-emphasis">الطلاب الحاليون</div>
            <div class="text-h5 font-weight-bold">
              {{ capacity.currentStudents }}
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">الحد الأقصى في الباقة</div>
            <div class="text-h5 font-weight-bold">
              {{ capacity.maxStudents }}
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">المتبقّي</div>
            <div class="text-h5 font-weight-bold">
              {{ capacity.remaining }}
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">إمكانية إضافة طلاب جدد</div>
            <div class="text-h6 font-weight-bold" :class="capacity.canAdd ? 'text-success' : 'text-error'">
              {{ capacity.canAdd ? 'يمكن إضافة طلاب جدد' : 'لا يمكن إضافة طلاب جدد' }}
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <AppPricing title="خطط اشتراك المعلّم" />
  </div>
</template>
