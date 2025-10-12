<template>
  <div>
    <VCard elevation="2" rounded="lg" class="mb-4">
      <VCardTitle class="d-flex align-center">
        <VIcon icon="ri-bar-chart-2-line" class="me-2" />
        ملخص السنة الدراسية {{ studyYear }}
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">إجمالي المبالغ</div>
                <div class="text-h6">{{ number(data.totalAmount) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">إجمالي المدفوع</div>
                <div class="text-h6">{{ number(data.totalPaid) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">إجمالي الخصومات</div>
                <div class="text-h6">{{ number(data.totalDiscount) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">المتبقي</div>
                <div class="text-h6">{{ number(data.totalRemaining) }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <VDivider class="my-4" />

        <VRow>
          <VCol cols="12" md="3">
            <VAlert type="success" variant="tonal">
              <div class="text-caption">عدد المدفوعة</div>
              <div class="text-h6">{{ number(data.paidCount) }}</div>
            </VAlert>
          </VCol>
          <VCol cols="12" md="3">
            <VAlert type="warning" variant="tonal">
              <div class="text-caption">عدد المتبقية</div>
              <div class="text-h6">{{ number(data.remainingCount) }}</div>
            </VAlert>
          </VCol>
          <VCol cols="12" md="3">
            <VAlert type="info" variant="tonal">
              <div class="text-caption">عدد بخصم</div>
              <div class="text-h6">{{ number(data.discountCount) }}</div>
            </VAlert>
          </VCol>
          <VCol cols="12" md="3">
            <VAlert type="primary" variant="tonal">
              <div class="text-caption">إجمالي الفواتير</div>
              <div class="text-h6">{{ number(data.totalCount) }}</div>
            </VAlert>
          </VCol>
        </VRow>

        <VRow class="mt-4">
          <VCol cols="12">
            <div class="d-flex align-center mb-2">
              <span class="me-2">نسبة المدفوع</span>
              <strong>{{ paidPercent.toFixed(1) }}%</strong>
            </div>
            <VProgressLinear :model-value="paidPercent" color="success" height="10" rounded />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({})
  },
  studyYear: {
    type: String,
    default: ''
  }
})

const number = (v) => Number(v || 0).toLocaleString()

const paidPercent = computed(() => {
  const amt = Number(props.data.totalAmount || 0)
  const paid = Number(props.data.totalPaid || 0)
  if (amt <= 0) return 0
  return Math.min(100, Math.max(0, (paid / amt) * 100))
})
</script>

<style scoped>
</style>
