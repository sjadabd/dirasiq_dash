<template>
  <VApp>
    <VMain>
      <VContainer fluid class="pa-6">
        <VRow>
          <VCol cols="12">
            <h1 class="text-h3 font-weight-bold mb-6 text-center">
              لوحة تحكم التقارير المالية
            </h1>
          </VCol>
        </VRow>

        <!-- Report Charts Component -->
        <!-- Updated to pass new data structure -->
        <VRow>
          <VCol cols="12">
            <ReportCharts :data="sampleReport.data" :studyYear="sampleReport.studyYear" />
          </VCol>
        </VRow>

        <!-- Data Controls -->
        <VRow class="mt-6">
          <VCol cols="12">
            <VCard elevation="3" rounded="lg">
              <VCardTitle class="text-h6 font-weight-bold">
                تحديث البيانات
              </VCardTitle>
              <VCardText>
                <VRow>
                  <!-- Updated form fields to match new data structure -->
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sampleReport.data.paidCount" label="عدد المدفوعة" type="number"
                      variant="outlined" density="comfortable" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sampleReport.data.remainingCount" label="عدد المتبقية" type="number"
                      variant="outlined" density="comfortable" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sampleReport.data.totalAmount" label="إجمالي المبالغ" type="number"
                      variant="outlined" density="comfortable" suffix="د.ع" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sampleReport.data.totalPaid" label="إجمالي المدفوع" type="number"
                      variant="outlined" density="comfortable" suffix="د.ع" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sampleReport.data.totalDiscount" label="إجمالي الخصومات" type="number"
                      variant="outlined" density="comfortable" suffix="د.ع" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sampleReport.data.totalRemaining" label="المتبقي" type="number"
                      variant="outlined" density="comfortable" suffix="د.ع" />
                  </VCol>
                </VRow>
                <VRow>
                  <VCol cols="12" class="text-center">
                    <VBtn color="primary" size="large" @click="loadSampleData">
                      تحميل بيانات تجريبية
                    </VBtn>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VContainer>
    </VMain>
  </VApp>
</template>

<script setup>
import { ref } from 'vue'
import ReportCharts from '../ReportCharts.vue'

const sampleReport = ref({
  success: true,
  message: 'Invoices summary fetched',
  studyYear: '2025-2026',
  data: {
    totalAmount: 250000,
    totalPaid: 110000,
    partialPaidTotal: 110000,
    totalDiscount: 10000,
    totalRemaining: 130000,
    totalCount: 1,
    paidCount: 1,
    discountCount: 1,
    remainingCount: 1
  }
})

const loadSampleData = () => {
  const totalAmount = Math.floor(Math.random() * 50000000) + 10000000
  const totalPaid = Math.floor(Math.random() * (totalAmount * 0.7)) + (totalAmount * 0.2)
  const totalDiscount = Math.floor(Math.random() * 5000000) + 500000
  const totalRemaining = totalAmount - totalPaid

  sampleReport.value = {
    success: true,
    message: 'Invoices summary fetched',
    studyYear: '2025-2026',
    data: {
      totalAmount,
      totalPaid,
      partialPaidTotal: totalPaid,
      totalDiscount,
      totalRemaining,
      totalCount: Math.floor(Math.random() * 100) + 50,
      paidCount: Math.floor(Math.random() * 80) + 20,
      discountCount: Math.floor(Math.random() * 30) + 5,
      remainingCount: Math.floor(Math.random() * 40) + 10
    }
  }
}
</script>

<style scoped>
.v-container {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-block-size: 100vh;
}
</style>
