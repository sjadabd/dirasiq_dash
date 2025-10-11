<template>
  <v-expansion-panels>
    <v-expansion-panel>
      <v-expansion-panel-title>
        تقرير فواتير الطلاب ({{ report?.studyYear || '2025-2026' }})
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <!-- Summary Stats Cards -->
        <VRow class="mb-6">
          <VCol cols="12" sm="6" md="3">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="primary">
              <VIcon size="32" class="mb-2" color="white">mdi-check-circle</VIcon>
              <div class="text-body-2 text-white mb-1">عدد المدفوعة</div>
              <div class="text-h5 font-weight-bold text-white">{{ numberWithComma(report?.counts?.totalPaid || 0) }}
              </div>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="3">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="warning">
              <VIcon size="32" class="mb-2" color="white">mdi-clock-outline</VIcon>
              <div class="text-body-2 text-white mb-1">عدد المتبقية</div>
              <div class="text-h5 font-weight-bold text-white">{{ numberWithComma(report?.counts?.totalPending || 0)
                }}</div>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="3">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="success">
              <VIcon size="32" class="mb-2" color="white">mdi-cash-check</VIcon>
              <div class="text-body-2 text-white mb-1">إجمالي المدفوع</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(report?.totals?.totalPaidAmount ||
                0) }} د.ع</div>
            </VCard>
          </VCol>

          <VCol cols="12" sm="6" md="3">
            <VCard class="pa-4 text-center stat-card" elevation="2" color="error">
              <VIcon size="32" class="mb-2" color="white">mdi-cash-remove</VIcon>
              <div class="text-body-2 text-white mb-1">المتبقي</div>
              <div class="text-h6 font-weight-bold text-white">{{ numberWithComma(report?.totals?.remainingAmount ||
                0) }} د.ع</div>
            </VCard>
          </VCol>
        </VRow>

        <!-- Charts Section -->
        <VRow>
          <!-- Invoice Status Donut Chart (by count) -->
          <VCol cols="12" md="6">
            <VCard class="pa-4" elevation="2">
              <h4 class="text-h6 font-weight-bold mb-4 text-center">حالة الفواتير (عدد)</h4>
              <apexchart type="donut" :options="statusChartOptions" :series="statusSeries" height="300" />
            </VCard>
          </VCol>

          <!-- Payment Progress Radial Bar -->
          <VCol cols="12" md="6">
            <VCard class="pa-4" elevation="2">
              <h4 class="text-h6 font-weight-bold mb-4 text-center">نسبة الدفع</h4>
              <apexchart type="radialBar" :options="progressChartOptions" :series="progressSeries" height="300" />
            </VCard>
          </VCol>

          <!-- Financial Overview Bar Chart -->
          <VCol cols="12">
            <VCard class="pa-4" elevation="2">
              <h4 class="text-h6 font-weight-bold mb-4 text-center">نظرة عامة على المالية</h4>
              <apexchart type="bar" :options="financialChartOptions" :series="financialSeries" height="350" />
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

// Invoice Status Donut (counts)
const statusSeries = computed(() => [
  props.report?.counts?.totalPaid || 0,
  props.report?.counts?.totalPending || 0,
  props.report?.counts?.totalDiscounted || 0,
])

const statusChartOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'Cairo, sans-serif' },
  labels: ['مدفوعة', 'متبقية', 'بخصم'],
  colors: ['#6EF2B4', '#FF8A00', '#3FA9F5'],
  legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '14px', fontFamily: 'Cairo, sans-serif' },
  dataLabels: { enabled: true, style: { fontSize: '14px', fontFamily: 'Cairo, sans-serif' } },
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

// Progress Radial Bar (amounts)
const progressSeries = computed(() => {
  const total = props.report?.totals?.totalAmount || 0
  const paid = props.report?.totals?.totalPaidAmount || 0
  return total > 0 ? [Math.round((paid / total) * 100)] : [0]
})

const progressChartOptions = computed(() => ({
  chart: { type: 'radialBar', fontFamily: 'Cairo, sans-serif' },
  plotOptions: {
    radialBar: {
      hollow: { size: '60%' },
      dataLabels: {
        name: { fontSize: '16px', fontFamily: 'Cairo, sans-serif' },
        value: { fontSize: '24px', fontFamily: 'Cairo, sans-serif', formatter: (val) => val + '%' },
        total: { show: true, label: 'نسبة الدفع', fontSize: '14px', fontFamily: 'Cairo, sans-serif', formatter: (w) => w.globals.seriesTotals[0] + '%' }
      },
      track: { background: '#f0f0f0' }
    }
  },
  colors: ['#3FA9F5'],
  labels: ['مكتمل']
}))

// Financial Overview Bar
const financialSeries = computed(() => [{
  name: 'المبلغ',
  data: [
    props.report?.totals?.totalAmount || 0,
    props.report?.totals?.totalPaidAmount || 0,
    props.report?.totals?.discountAmount || 0,
    props.report?.totals?.remainingAmount || 0,
  ]
}])

const financialChartOptions = computed(() => ({
  chart: { type: 'bar', fontFamily: 'Cairo, sans-serif', toolbar: { show: true } },
  plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 8, dataLabels: { position: 'top' } } },
  dataLabels: {
    enabled: true,
    formatter: (val) => numberWithComma(val) + ' د.ع',
    offsetY: -20,
    style: { fontSize: '12px', fontFamily: 'Cairo, sans-serif', colors: ['#304758'] }
  },
  xaxis: { categories: ['إجمالي المبالغ', 'إجمالي المدفوع', 'الخصومات', 'المتبقي'], labels: { style: { fontSize: '12px', fontFamily: 'Cairo, sans-serif' } } },
  yaxis: { labels: { formatter: (val) => numberWithComma(val), style: { fontSize: '12px', fontFamily: 'Cairo, sans-serif' } } },
  colors: ['#0B2545', '#3FA9F5', '#6EF2B4', '#FF8A00'],
  tooltip: { y: { formatter: (val) => numberWithComma(val) + ' د.ع' }, style: { fontSize: '12px', fontFamily: 'Cairo, sans-serif' } },
  responsive: [{ breakpoint: 768, options: { plotOptions: { bar: { columnWidth: '70%' } }, dataLabels: { style: { fontSize: '10px' } } } }]
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
