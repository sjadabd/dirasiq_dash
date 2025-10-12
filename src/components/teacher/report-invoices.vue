<template>
  <v-expansion-panels>
    <v-expansion-panel>
      <v-expansion-panel-title>
        تقرير فواتير الطلاب ({{ report?.studyYear || '2025-2026' }})
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <!-- Amount Summary Cards -->
        <VRow class="mb-6">
          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="primary">
              <VIcon size="32" class="mb-2" color="white">mdi-cash-multiple</VIcon>
              <div class="text-body-2 text-white mb-1">إجمالي المبالغ</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(report?.totals?.totalAmount || 0) }} د.ع</div>
            </VCard>
          </VCol>
          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="info">
              <VIcon size="32" class="mb-2" color="white">mdi-ticket-percent</VIcon>
              <div class="text-body-2 text-white mb-1">إجمالي الخصم</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(report?.totals?.discountAmount || 0) }} د.ع</div>
            </VCard>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="secondary">
              <VIcon size="32" class="mb-2" color="white">mdi-calculator</VIcon>
              <div class="text-body-2 text-white mb-1">الإجمالي بعد الخصم</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(afterDiscount) }} د.ع</div>
            </VCard>
          </VCol>
          <VCol cols="12" sm="6" md="2">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="success">
              <VIcon size="32" class="mb-2" color="white">mdi-cash-check</VIcon>
              <div class="text-body-2 text-white mb-1">إجمالي المدفوع</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(report?.totals?.totalPaidAmount || 0) }} د.ع</div>
            </VCard>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="error">
              <VIcon size="32" class="mb-2" color="white">mdi-cash-remove</VIcon>
              <div class="text-body-2 text-white mb-1">المتبقي</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(report?.totals?.remainingAmount || 0) }} د.ع</div>
            </VCard>
          </VCol>
        </VRow>

        <!-- Amounts Donut Chart -->
        <VRow>
          <VCol cols="12">
            <VCard class="pa-4" elevation="2">
              <h4 class="text-h6 font-weight-bold mb-4 text-center">تفصيل المبالغ</h4>
              <apexchart type="donut" :options="amountsChartOptions" :series="amountsSeries" height="350" />
            </VCard>
          </VCol>
        </VRow>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const apexchart = VueApexCharts

const props = defineProps({
  report: {
    type: Object,
    default: () => ({
      studyYear: '2025-2026',
      counts: {
        totalPaid: 0,
        totalPending: 0,
        totalDiscounted: 0,
      },
      totals: {
        totalAmount: 0,
        totalPaidAmount: 0,
        discountAmount: 0,
        remainingAmount: 0,
      }
    })
  }
})

const numberWithComma = (num) => {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'
}

// After-discount amount
const afterDiscount = computed(() => {
  const total = props.report?.totals?.totalAmount || 0
  const discount = props.report?.totals?.discountAmount || 0
  return Math.max(0, Number(total) - Number(discount))
})

// Amounts Donut (total, discount, paid, remaining)
const amountsSeries = computed(() => [
  props.report?.totals?.totalAmount || 0,
  props.report?.totals?.discountAmount || 0,
  props.report?.totals?.totalPaidAmount || 0,
  props.report?.totals?.remainingAmount || 0,
])

const amountsChartOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'Cairo, sans-serif' },
  labels: ['الإجمالي', 'الخصم', 'المدفوع', 'المتبقي'],
  colors: ['#0B2545', '#3FA9F5', '#6EF2B4', '#FF8A00'],
  legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '14px', fontFamily: 'Cairo, sans-serif' },
  dataLabels: { enabled: true, style: { fontSize: '14px', fontFamily: 'Cairo, sans-serif' } },
  tooltip: { y: { formatter: (val) => numberWithComma(val) + ' د.ع' } },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'الإجمالي',
            fontSize: '16px',
            fontFamily: 'Cairo, sans-serif',
            formatter: function (w) { return w.globals.seriesTotals.reduce((a, b) => a + b, 0) }
          }
        }
      }
    }
  },
  responsive: [{ breakpoint: 480, options: { chart: { width: 280 }, legend: { position: 'bottom' } } }]
}))
</script>

<!-- <style scoped>
.report-charts-card {
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
}

.stat-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 15%) !important;
  transform: translateY(-4px);
}

:deep(.apexcharts-legend-text) {
  font-family: Cairo, sans-serif !important;
}

:deep(.apexcharts-datalabel-label),
:deep(.apexcharts-datalabel-value) {
  font-family: Cairo, sans-serif !important;
}
</style> -->
