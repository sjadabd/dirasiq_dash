<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Operations Card -->
    <VCard class="my-4 operations-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-cog-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">العمليات</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="align-center justify-start pa-2">
          <VBtn color="primary" prepend-icon="ri-refresh-line" @click="fetchReport">تحديث</VBtn>
          <VBtn color="success" prepend-icon="ri-file-excel-line" class="ms-2" @click="exportToExcel">
            تصدير Excel
          </VBtn>
          <VBtn color="error" prepend-icon="ri-file-pdf-line" class="ms-2" @click="exportToPDF">
            تصدير PDF
          </VBtn>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Operations Card -->

    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="4">
            <VSelect v-model="filters.studyYear" :items="studyYears" item-title="label" item-value="value"
              label="السنة الدراسية" variant="outlined" @update:model-value="fetchReport" :loading="yearsLoading"
              density="comfortable" />
          </VCol>
          <VCol cols="12" md="4">
            <AppDateTimePicker v-model="filters.from" @update:model-value="fetchReport" clearable label="من تاريخ"
              variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <AppDateTimePicker v-model="filters.to" @update:model-value="fetchReport" clearable label="إلى تاريخ"
              variant="outlined" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Filter Card -->

    <VCard class="my-4" elevation="3" rounded="lg" ref="printArea">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-bar-chart-2-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h6 font-weight-bold">التقارير المالية</h3>
        <VSpacer />
      </VCardTitle>
      <VDivider />

      <VCardText>
        <VRow class="mb-4">
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="primary" class="summary-card">
              <VCardText>
                <div class="d-flex align-center justify-space-between mb-2">
                  <VIcon icon="ri-money-dollar-circle-line" size="32" />
                  <VChip color="success" size="small" v-if="previousData.totalPaidIncome">
                    {{ calculateChange(summary.totalPaidIncome, previousData.totalPaidIncome) }}
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis mb-1">الدخل المقبوض</div>
                <div class="text-h5 font-weight-bold">{{ animatedPaidIncome }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="info" class="summary-card">
              <VCardText>
                <div class="d-flex align-center justify-space-between mb-2">
                  <VIcon icon="ri-calendar-check-line" size="32" />
                  <VChip color="success" size="small" v-if="previousData.totalDueIncome">
                    {{ calculateChange(summary.totalDueIncome, previousData.totalDueIncome) }}
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis mb-1">المستحقات</div>
                <div class="text-h5 font-weight-bold">{{ animatedDueIncome }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="error" class="summary-card">
              <VCardText>
                <div class="d-flex align-center justify-space-between mb-2">
                  <VIcon icon="ri-shopping-cart-line" size="32" />
                  <VChip color="warning" size="small" v-if="previousData.expenses">
                    {{ calculateChange(expenses.total, previousData.expenses) }}
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis mb-1">المصروفات</div>
                <div class="text-h5 font-weight-bold">{{ animatedExpenses }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="success" class="summary-card">
              <VCardText>
                <div class="d-flex align-center justify-space-between mb-2">
                  <VIcon icon="ri-line-chart-line" size="32" />
                  <VChip color="success" size="small" v-if="previousData.netProfitPaidBasis">
                    {{ calculateChange(summary.netProfitPaidBasis, previousData.netProfitPaidBasis) }}
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis mb-1">صافي الربح (مقبوض)</div>
                <div class="text-h5 font-weight-bold">{{ animatedNetProfit }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <VRow class="mb-4">
          <VCol cols="12" md="8">
            <VCard elevation="2" rounded="lg">
              <VCardTitle class="text-subtitle-1 font-weight-bold">
                <VIcon icon="ri-bar-chart-box-line" class="me-2" />
                مقارنة الدخل والمصروفات
              </VCardTitle>
              <VCardText>
                <apexchart type="bar" height="350" :options="barChartOptions" :series="barChartSeries" />
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard elevation="2" rounded="lg">
              <VCardTitle class="text-subtitle-1 font-weight-bold">
                <VIcon icon="ri-pie-chart-line" class="me-2" />
                توزيع المصروفات
              </VCardTitle>
              <VCardText>
                <apexchart type="donut" height="350" :options="pieChartOptions" :series="pieChartSeries" />
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <VRow>
          <VCol cols="12" md="6">
            <VCard elevation="2" rounded="lg">
              <VCardTitle class="text-subtitle-1 font-weight-bold">
                <VIcon icon="ri-funds-line" class="me-2" />
                التحليل على أساس المقبوض
              </VCardTitle>
              <VCardText>
                <apexchart type="line" height="300" :options="lineChartPaidOptions" :series="lineChartPaidSeries" />
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard elevation="2" rounded="lg">
              <VCardTitle class="text-subtitle-1 font-weight-bold">
                <VIcon icon="ri-line-chart-fill" class="me-2" />
                التحليل على أساس الاستحقاق
              </VCardTitle>
              <VCardText>
                <apexchart type="line" height="300" :options="lineChartDueOptions" :series="lineChartDueSeries" />
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api'
import VueApexCharts from 'vue3-apexcharts'

export default {
  components: {
    apexchart: VueApexCharts,
  },
  data() {
    return {
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'التقارير المالية', disabled: true },
      ],
      loading: false,
      progress: 0,
      alert: { open: false, type: 'success', message: '' },

      studyYears: [],
      yearsLoading: false,
      filters: { studyYear: '', from: null, to: null },

      invoices: {
        student: { totalDue: 0, totalDiscount: 0, totalPaid: 0, totalRemaining: 0 },
        reservation: { totalDue: 0, totalDiscount: 0, totalPaid: 0, totalRemaining: 0 }
      },
      expenses: { total: 0 },
      summary: { totalPaidIncome: 0, totalDueIncome: 0, netProfitPaidBasis: 0, netProfitDueBasis: 0 },
      previousData: { totalPaidIncome: 0, totalDueIncome: 0, expenses: 0, netProfitPaidBasis: 0 },

      // Animated values
      animatedPaidIncome: '0',
      animatedDueIncome: '0',
      animatedExpenses: '0',
      animatedNetProfit: '0',
    }
  },
  computed: {
    discountsTotal() {
      return Number(this.invoices.student.totalDiscount || 0) + Number(this.invoices.reservation.totalDiscount || 0)
    },
    barChartSeries() {
      return [
        {
          name: 'الدخل المقبوض',
          data: [Number(this.summary.totalPaidIncome || 0)]
        },
        {
          name: 'المستحقات',
          data: [Number(this.summary.totalDueIncome || 0)]
        },
        {
          name: 'المصروفات',
          data: [Number(this.expenses.total || 0)]
        },
        {
          name: 'صافي الربح (مقبوض)',
          data: [Number(this.summary.netProfitPaidBasis || 0)]
        },
        {
          name: 'صافي الربح (استحقاق)',
          data: [Number(this.summary.netProfitDueBasis || 0)]
        }
      ]
    },
    barChartOptions() {
      return {
        chart: {
          type: 'bar',
          toolbar: { show: true },
          animations: { enabled: true, speed: 800 }
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            borderRadius: 8
          }
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: ['المقارنة المالية'] },
        yaxis: { title: { text: 'المبلغ' } },
        fill: { opacity: 1 },
        tooltip: {
          y: {
            formatter: (val) => this.n(val)
          }
        },
        colors: ['#1976D2', '#0288D1', '#D32F2F', '#388E3C', '#689F38']
      }
    },
    pieChartSeries() {
      const studentExpenses = Number(this.invoices.student.totalDiscount || 0)
      const reservationExpenses = Number(this.invoices.reservation.totalDiscount || 0)
      const otherExpenses = Number(this.expenses.total || 0) - studentExpenses - reservationExpenses
      return [studentExpenses, reservationExpenses, Math.max(0, otherExpenses)]
    },
    pieChartOptions() {
      return {
        chart: {
          type: 'donut',
          animations: { enabled: true, speed: 800 }
        },
        labels: ['خصومات الطلاب', 'خصومات الحجوزات', 'مصروفات أخرى'],
        colors: ['#FF6384', '#36A2EB', '#FFCE56'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true },
        tooltip: {
          y: {
            formatter: (val) => this.n(val)
          }
        }
      }
    },
    lineChartPaidSeries() {
      return [
        {
          name: 'الدخل المقبوض',
          data: [Number(this.summary.totalPaidIncome || 0)]
        },
        {
          name: 'المصروفات',
          data: [Number(this.expenses.total || 0)]
        },
        {
          name: 'صافي الربح',
          data: [Number(this.summary.netProfitPaidBasis || 0)]
        }
      ]
    },
    lineChartPaidOptions() {
      return {
        chart: {
          type: 'line',
          toolbar: { show: false },
          animations: { enabled: true, speed: 800 }
        },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: ['الفترة الحالية'] },
        colors: ['#1976D2', '#D32F2F', '#388E3C'],
        markers: { size: 6 },
        tooltip: {
          y: {
            formatter: (val) => this.n(val)
          }
        }
      }
    },
    lineChartDueSeries() {
      return [
        {
          name: 'المستحقات',
          data: [Number(this.summary.totalDueIncome || 0)]
        },
        {
          name: 'الخصومات',
          data: [this.discountsTotal]
        },
        {
          name: 'المصروفات',
          data: [Number(this.expenses.total || 0)]
        },
        {
          name: 'صافي الربح',
          data: [Number(this.summary.netProfitDueBasis || 0)]
        }
      ]
    },
    lineChartDueOptions() {
      return {
        chart: {
          type: 'line',
          toolbar: { show: false },
          animations: { enabled: true, speed: 800 }
        },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: ['الفترة الحالية'] },
        colors: ['#0288D1', '#FB8C00', '#D32F2F', '#689F38'],
        markers: { size: 6 },
        tooltip: {
          y: {
            formatter: (val) => this.n(val)
          }
        }
      }
    }
  },
  created() {
    this.loadAcademicYears()
  },
  mounted() {
    this.fetchReport()
  },
  methods: {
    n(val) { return Number(val || 0).toLocaleString('en-IQ') },
    showAlert(type, message) { Object.assign(this.alert, { open: true, type, message }) },

    calculateChange(current, previous) {
      if (!previous || previous === 0) return '+0%'
      const change = ((current - previous) / previous) * 100
      const sign = change >= 0 ? '+' : ''
      return `${sign}${change.toFixed(1)}%`
    },

    animateValue(start, end, duration, callback) {
      const startTime = performance.now()
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const value = start + (end - start) * progress
        callback(Math.floor(value))
      }
      requestAnimationFrame(function raf(ts) { animate(ts); if (performance.now() - startTime < duration) requestAnimationFrame(raf) })
    },
    async exportToExcel() {
      try {
        const { default: ExcelJS } = await import('exceljs')
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet('التقرير المالي')

        // Theme colors (approx to app)
        const primary = '0B2545'
        const success = '10B981'
        const warning = 'FB8C00'
        const danger = 'D32F2F'

        // Column setup
        sheet.columns = [
          { header: 'البند', key: 'label', width: 28 },
          { header: 'القيمة', key: 'value', width: 22 },
          { header: 'ملاحظات', key: 'note', width: 28 },
          { header: '', key: 'c3', width: 4 },
          { header: '', key: 'c4', width: 4 },
        ]

        // Title
        sheet.mergeCells('A1:E1')
        const title = sheet.getCell('A1')
        title.value = 'التقرير المالي للمعلم'
        title.alignment = { horizontal: 'center', vertical: 'middle' }
        title.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
        title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } }
        sheet.getRow(1).height = 28

        // Subtitle (date + filters)
        sheet.mergeCells('A2:E2')
        const subtitle = sheet.getCell('A2')
        const dt = new Date()
        const filtersText = `التاريخ: ${dt.toISOString().slice(0, 10)} | السنة الدراسية: ${this.filters.studyYear || 'الكل'} | من: ${this.filters.from || '-'} | إلى: ${this.filters.to || '-'}`
        subtitle.value = filtersText
        subtitle.alignment = { horizontal: 'center', vertical: 'middle' }
        subtitle.font = { size: 11, color: { argb: 'FF444444' } }
        sheet.getRow(2).height = 20

        // Helper for section header
        const addSectionHeader = (rowIdx, text, color) => {
          sheet.mergeCells(`A${rowIdx}:E${rowIdx}`)
          const cell = sheet.getCell(`A${rowIdx}`)
          cell.value = text
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        }
        const addRow = (label, value, note, color) => {
          const r = sheet.addRow({ label, value, note })
          r.getCell('value').numFmt = '#,##0'
          r.alignment = { vertical: 'middle' }
          if (color) r.getCell('value').font = { color: { argb: color } }
          r.eachCell((cell) => {
            cell.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } }
          })
        }

        let row = 4
        addSectionHeader(row++, 'فواتير الطلاب', primary)
        addRow('إجمالي المستحق قبل الخصم', this.invoices.student.totalDue || 0, '', undefined)
        addRow('إجمالي الخصومات', this.invoices.student.totalDiscount || 0, '', warning)
        addRow('إجمالي المدفوع', this.invoices.student.totalPaid || 0, '', success)
        addRow('إجمالي المتبقي', this.invoices.student.totalRemaining || 0, '', danger)
        row += 1
        addSectionHeader(row++, 'فواتير العربون', primary)
        addRow('إجمالي المستحق قبل الخصم', this.invoices.reservation.totalDue || 0, '', undefined)
        addRow('إجمالي الخصومات', this.invoices.reservation.totalDiscount || 0, '', warning)
        addRow('إجمالي المدفوع', this.invoices.reservation.totalPaid || 0, '', success)
        addRow('إجمالي المتبقي', this.invoices.reservation.totalRemaining || 0, '', danger)
        row += 1
        addSectionHeader(row++, 'المصروفات', primary)
        addRow('إجمالي المصروفات', this.expenses.total || 0, '', danger)
        row += 1
        addSectionHeader(row++, 'الملخص', primary)
        addRow('الدخل المقبوض', this.summary.totalPaidIncome || 0, '', success)
        addRow('الدخل المستحق', this.summary.totalDueIncome || 0, '', undefined)
        addRow('صافي الربح (مقبوض)', this.summary.netProfitPaidBasis || 0, '', success)
        addRow('صافي الربح (استحقاق)', this.summary.netProfitDueBasis || 0, '', success)

        // Freeze top rows
        sheet.views = [{ state: 'frozen', ySplit: 3 }]

        // Output
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const dateStr = new Date().toISOString().slice(0, 10)
        const fileName = `financial_report_${dateStr}.xlsx`
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (e) {
        this.showAlert('error', 'تعذر إنشاء ملف Excel، يرجى التأكد من توفر المكتبة ExcelJS')
        console.error(e)
      }
    },

    updateAnimatedValues() {
      this.animateValue(0, this.summary.totalPaidIncome, 1000, (val) => {
        this.animatedPaidIncome = this.n(val)
        this.animateValue(0, this.summary.totalDueIncome, 1000, (val) => {
          this.animatedDueIncome = this.n(val)
        })
        this.animateValue(0, this.expenses.total, 1000, (val) => {
          this.animatedExpenses = this.n(val)
        })
        this.animateValue(0, this.summary.netProfitPaidBasis, 1000, (val) => {
          this.animatedNetProfit = this.n(val)
        })
      })
    },



    async loadAcademicYears() {
      try {
        this.yearsLoading = true
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null
        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.filters.studyYear) this.filters.studyYear = active?.year || ''
      } catch (e) {
        console.error('Error loading academic years:', e)
      } finally {
        this.yearsLoading = false
      }
    },

    async fetchReport() {
      try {
        this.loading = true
        const params = {
          studyYear: this.filters.studyYear || undefined,
          from: this.filters.from || undefined,
          to: this.filters.to || undefined,
        }

        // Store previous data for comparison
        this.previousData = {
          totalPaidIncome: this.summary.totalPaidIncome,
          totalDueIncome: this.summary.totalDueIncome,
          expenses: this.expenses.total,
          netProfitPaidBasis: this.summary.netProfitPaidBasis
        }

        const { data } = await TeacherApi.getFinancialReport(params)
        const payload = data?.data || {}
        this.invoices = payload.invoices || this.invoices
        this.expenses = payload.expenses || this.expenses
        this.summary = payload.summary || this.summary

        this.updateAnimatedValues()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب التقرير')
      } finally {
        this.loading = false
      }
    },

    applyFilters() { this.fetchReport() },

    resetFilters() {
      this.filters = { studyYear: this.filters.studyYear || '', from: null, to: null }
      this.fetchReport()
    },

    async exportToPDF() {
      try {
        const { default: html2canvas } = await import('html2canvas')
        const { jsPDF } = await import('jspdf')

        await this.$nextTick()
        const refEl = this.$refs.printArea
        const el = refEl?.$el ? refEl.$el : refEl
        if (!el || !(el instanceof HTMLElement) || !document.body.contains(el)) {
          return this.showAlert('error', 'تعذر العثور على محتوى التقرير لطباعته')
        }

        // Ensure charts are fully rendered
        await new Promise(r => setTimeout(r, 300))

        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
        const imgData = canvas.toDataURL('image/png')

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        // Calculate image dimensions to fit A4 while preserving aspect ratio
        const imgWidth = pageWidth - 20 // margins 10mm each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        let positionY = 10
        if (imgHeight <= pageHeight - 20) {
          pdf.addImage(imgData, 'PNG', 10, positionY, imgWidth, imgHeight)
        } else {
          // Split across pages
          let remainingHeight = imgHeight
          let sX = 0
          const pxPageHeight = (canvas.width * (pageHeight - 20)) / (imgWidth)
          while (remainingHeight > 0) {
            const pageCanvas = document.createElement('canvas')
            pageCanvas.width = canvas.width
            pageCanvas.height = Math.min(pxPageHeight, canvas.height - sX)
            const ctx = pageCanvas.getContext('2d')
            ctx.drawImage(canvas, 0, sX, canvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height)
            const pageImg = pageCanvas.toDataURL('image/png')
            if (sX > 0) pdf.addPage()
            pdf.addImage(pageImg, 'PNG', 10, 10, imgWidth, (pageCanvas.height * imgWidth) / canvas.width)
            sX += pageCanvas.height
            remainingHeight -= (pageCanvas.height * imgWidth) / canvas.width
          }
        }

        const dateStr = new Date().toISOString().slice(0, 10)
        pdf.save(`financial_report_${dateStr}.pdf`)
      } catch (e) {
        console.error(e)
        this.showAlert('error', 'تعذر إنشاء ملف PDF. يرجى تثبيت html2canvas و jspdf')
      }
    }
  }
}
</script>

<style scoped>
.summary-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.summary-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 15%);
  transform: translateY(-4px);
}

@media print {
  .v-btn {
    display: none;
  }
}
</style>
