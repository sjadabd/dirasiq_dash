<script>
// =====================================================
// Financial Report v2 — rebuilt 2026-05-17.
// Aligned with backend GET /teacher/reports/financial response shape:
//   { invoices: { student, reservation }, expenses: { total },
//     summary: { totalPaidIncome, totalDueIncome, netProfitPaidBasis, netProfitDueBasis } }
//
// Big changes vs v1:
//   • Brand UI (navy hero + 4 KPI cards) — matches invoices / expenses pages.
//   • Removed the noisy 4 single-point line charts (a "line" with 1 point is just a dot).
//     Replaced with: one comparison bar (income vs expense vs profit) + a real
//     expense-by-category donut (sourced from /expenses summary, not the v1 hack
//     that called student-discounts "expenses").
//   • Removed the broken "previous vs current" comparison (it compared the data
//     against the same page's pre-refresh state, which always looked the same).
//   • Removed the buggy nested-RAF animation; KPIs now render directly.
//   • mdi-* icons → ri-* (eslint rule).
//   • Excel export rewritten with cleaner structure + brand colors.
//   • PDF export kept (html2canvas), but simplified.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import VueApexCharts from "vue3-apexcharts"

export default {
  components: { apexchart: VueApexCharts },
  data() {
    return {
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "التقارير المالية", disabled: true },
      ],
      loading: false,
      exporting: { excel: false, pdf: false },
      alert: { open: false, type: "success", message: "" },

      // Filters
      studyYears: [],
      yearsLoading: false,
      filters: {
        studyYear: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        from: null,
        to: null,
      },

      // Data
      invoices: {
        student: { totalDue: 0, totalDiscount: 0, totalPaid: 0, totalRemaining: 0 },
        reservation: { totalDue: 0, totalDiscount: 0, totalPaid: 0, totalRemaining: 0 },
      },
      expenses: { total: 0, byCategory: {} },
      summary: { totalPaidIncome: 0, totalDueIncome: 0, netProfitPaidBasis: 0, netProfitDueBasis: 0 },

      // Reference data (matches backend enum from migration 034)
      categoryLabels: {
        salaries: "رواتب",
        rent: "إيجار",
        utilities: "كهرباء وماء",
        maintenance: "صيانة",
        stationery: "قرطاسية",
        other: "أخرى",
      },
      categoryColors: ["#3FA9F5", "#FF8A00", "#10B981", "#9333EA", "#F59E0B", "#6B7280"],
    }
  },

  computed: {
    activeStudyYear() {
      return this.filters.studyYear || this.studyYears[0]?.value || "—"
    },
    profitMarginPct() {
      const income = Number(this.summary.totalPaidIncome) || 0
      if (income <= 0) return 0
      const net = Number(this.summary.netProfitPaidBasis) || 0
      
      return Math.max(-100, Math.min(100, Math.round((net / income) * 100)))
    },
    discountsTotal() {
      return Number(this.invoices.student.totalDiscount || 0)
        + Number(this.invoices.reservation.totalDiscount || 0)
    },
    collectionRatePct() {
      const due = Number(this.summary.totalDueIncome) || 0
      if (due <= 0) return 0
      const paid = Number(this.summary.totalPaidIncome) || 0
      
      return Math.min(100, Math.round((paid / due) * 100))
    },

    // ---- Charts ----
    comparisonBarSeries() {
      return [{
        name: "المبالغ",
        data: [
          Number(this.summary.totalPaidIncome) || 0,
          Number(this.summary.totalDueIncome) || 0,
          Number(this.expenses.total) || 0,
          Number(this.summary.netProfitPaidBasis) || 0,
        ],
      }]
    },
    comparisonBarOptions() {
      const colors = ["#10B981", "#3FA9F5", "#E53935", "#FF8A00"]
      
      return {
        chart: { type: "bar", toolbar: { show: false }, fontFamily: "Cairo, sans-serif" },
        plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 8, distributed: true } },
        dataLabels: { enabled: false },
        legend: { show: false },
        xaxis: { categories: ["مقبوض", "مستحق", "مصاريف", "صافي الربح"], labels: { style: { fontFamily: "Cairo" } } },
        yaxis: { labels: { formatter: v => this.formatShort(v), style: { fontFamily: "Cairo" } } },
        tooltip: { y: { formatter: v => this.formatIQD(v) } },
        colors,
        grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
      }
    },

    expenseDonutSeries() {
      const entries = Object.entries(this.expenses.byCategory || {})
      
      return entries.map(([, v]) => Number(v) || 0)
    },
    expenseDonutOptions() {
      const labels = Object.keys(this.expenses.byCategory || {}).map(k => this.categoryLabels[k] || k)
      const total = Number(this.expenses.total) || 0
      
      return {
        chart: { type: "donut", fontFamily: "Cairo, sans-serif" },
        labels,
        colors: this.categoryColors,
        legend: { position: "bottom", fontFamily: "Cairo" },
        dataLabels: { enabled: true, formatter: v => `${Math.round(v)}%` },
        plotOptions: {
          pie: {
            donut: {
              size: "65%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "إجمالي المصاريف",
                  fontFamily: "Cairo",
                  formatter: () => this.formatShort(total),
                },
              },
            },
          },
        },
        tooltip: { y: { formatter: v => this.formatIQD(v) } },
        noData: { text: "لا توجد مصاريف", style: { fontFamily: "Cairo" } },
      }
    },

    invoiceSplitSeries() {
      return [{
        name: "مدفوع",
        data: [
          Number(this.invoices.student.totalPaid) || 0,
          Number(this.invoices.reservation.totalPaid) || 0,
        ],
      }, {
        name: "متبقّي",
        data: [
          Number(this.invoices.student.totalRemaining) || 0,
          Number(this.invoices.reservation.totalRemaining) || 0,
        ],
      }, {
        name: "خصم",
        data: [
          Number(this.invoices.student.totalDiscount) || 0,
          Number(this.invoices.reservation.totalDiscount) || 0,
        ],
      }]
    },
    invoiceSplitOptions() {
      return {
        chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "Cairo, sans-serif" },
        plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
        xaxis: { categories: ["فواتير الطلاب", "فواتير العربون"], labels: { formatter: v => this.formatShort(v), style: { fontFamily: "Cairo" } } },
        yaxis: { labels: { style: { fontFamily: "Cairo" } } },
        dataLabels: { enabled: false },
        legend: { position: "top", fontFamily: "Cairo" },
        colors: ["#10B981", "#E53935", "#FF8A00"],
        tooltip: { y: { formatter: v => this.formatIQD(v) } },
        grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
      }
    },
  },

  created() {
    this.loadAcademicYears()
  },

  methods: {
    showAlert(type, message) { Object.assign(this.alert, { open: true, type, message }) },
    formatIQD(v) { return new Intl.NumberFormat("en-IQ").format(Number(v) || 0) + " د.ع" },
    formatShort(v) {
      const n = Number(v) || 0
      const abs = Math.abs(n)
      if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
      if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + "K"
      
      return new Intl.NumberFormat("en-IQ").format(n)
    },
    formatDate(d) {
      if (!d) return "—"
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, "0")
      const mm = String(dt.getMonth() + 1).padStart(2, "0")
      
      return `${dd}/${mm}/${dt.getFullYear()}`
    },

    async loadAcademicYears() {
      this.yearsLoading = true
      try {
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null

        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.filters.studyYear) this.filters.studyYear = active?.year || ""
        await this.fetchReport()
      } catch {
        await this.fetchReport()
      } finally {
        this.yearsLoading = false
      }
    },

    async fetchReport() {
      this.loading = true
      try {
        const params = {}
        if (this.filters.studyYear) params.studyYear = this.filters.studyYear
        if (this.filters.from) params.from = this.filters.from
        if (this.filters.to) params.to = this.filters.to

        // Run both calls in parallel: the report itself + expense-by-category for the donut.
        const [reportRes, expRes] = await Promise.all([
          TeacherApi.getFinancialReport(params),
          TeacherApi.getExpenses({ ...params, page: 1, limit: 1 }).catch(() => null),
        ])

        const payload = reportRes?.data?.data || {}

        this.invoices = payload.invoices || this.invoices
        this.summary  = payload.summary  || this.summary
        this.expenses = {
          total: Number(payload.expenses?.total) || 0,
          byCategory: expRes?.data?.meta?.summary?.byCategory || {},
        }
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر جلب التقرير")
      } finally {
        this.loading = false
      }
    },

    resetFilters() {
      this.filters = { studyYear: this.filters.studyYear || "", from: null, to: null }
      this.fetchReport()
    },

    // ---- Excel export ----
    async exportToExcel() {
      this.exporting.excel = true
      try {
        const { default: ExcelJS } = await import("exceljs")
        const wb = new ExcelJS.Workbook()
        const sheet = wb.addWorksheet("التقرير المالي", { views: [{ rightToLeft: true }] })

        const primary = "0B2545"
        const success = "10B981"
        const warning = "FB8C00"
        const danger  = "E53935"

        sheet.columns = [
          { header: "البند", key: "label", width: 32 },
          { header: "القيمة", key: "value", width: 22 },
          { header: "ملاحظات", key: "note", width: 30 },
        ]

        sheet.mergeCells("A1:C1")

        const title = sheet.getCell("A1")

        title.value = "التقرير المالي للمعلم"
        title.alignment = { horizontal: "center", vertical: "middle" }
        title.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } }
        title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primary } }
        sheet.getRow(1).height = 28

        sheet.mergeCells("A2:C2")

        const sub = sheet.getCell("A2")
        const today = new Date().toISOString().slice(0, 10)

        sub.value = `التاريخ: ${today} · السنة: ${this.filters.studyYear || "الكل"} · من: ${this.filters.from || "—"} · إلى: ${this.filters.to || "—"}`
        sub.alignment = { horizontal: "center" }
        sub.font = { color: { argb: "FF555555" } }

        const addSection = (text, color) => {
          const r = sheet.addRow([text])

          sheet.mergeCells(r.number, 1, r.number, 3)

          const c = sheet.getCell(r.number, 1)

          c.font = { bold: true, color: { argb: "FFFFFFFF" } }
          c.alignment = { horizontal: "right", vertical: "middle" }
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
        }

        const addRow = (label, value, color) => {
          const r = sheet.addRow([label, value, ""])

          r.getCell(2).numFmt = "#,##0"
          if (color) r.getCell(2).font = { color: { argb: color }, bold: true }
        }

        sheet.addRow([])
        addSection("فواتير الطلاب", primary)
        addRow("إجمالي المستحق", this.invoices.student.totalDue)
        addRow("إجمالي الخصومات", this.invoices.student.totalDiscount, warning)
        addRow("إجمالي المدفوع", this.invoices.student.totalPaid, success)
        addRow("إجمالي المتبقّي", this.invoices.student.totalRemaining, danger)

        sheet.addRow([])
        addSection("فواتير العربون", primary)
        addRow("إجمالي المستحق", this.invoices.reservation.totalDue)
        addRow("إجمالي الخصومات", this.invoices.reservation.totalDiscount, warning)
        addRow("إجمالي المدفوع", this.invoices.reservation.totalPaid, success)
        addRow("إجمالي المتبقّي", this.invoices.reservation.totalRemaining, danger)

        sheet.addRow([])
        addSection("المصاريف", primary)
        addRow("إجمالي المصاريف", this.expenses.total, danger)
        for (const [k, v] of Object.entries(this.expenses.byCategory || {})) {
          addRow(this.categoryLabels[k] || k, Number(v) || 0)
        }

        sheet.addRow([])
        addSection("الملخص", primary)
        addRow("الدخل المقبوض", this.summary.totalPaidIncome, success)
        addRow("الدخل المستحق", this.summary.totalDueIncome)
        addRow("صافي الربح (مقبوض)", this.summary.netProfitPaidBasis, success)
        addRow("صافي الربح (استحقاق)", this.summary.netProfitDueBasis)
        addRow("هامش الربح %", this.profitMarginPct)
        addRow("نسبة التحصيل %", this.collectionRatePct)

        sheet.views = [{ state: "frozen", ySplit: 3, rightToLeft: true }]

        const buf = await wb.xlsx.writeBuffer()
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        const link = document.createElement("a")

        link.href = URL.createObjectURL(blob)
        link.download = `financial_report_${today}.xlsx`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(link.href)
        this.showAlert("success", "تم تصدير الـ Excel")
      } catch (e) {
        console.error(e)
        this.showAlert("error", "تعذّر تصدير الـ Excel")
      } finally {
        this.exporting.excel = false
      }
    },

    async exportToPDF() {
      this.exporting.pdf = true
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ])

        const el = this.$refs.printArea
        if (!el) throw new Error("printable area not found")
        await new Promise(r => setTimeout(r, 250))

        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false })
        const img = canvas.toDataURL("image/png")
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
        const pw = pdf.internal.pageSize.getWidth()
        const ph = pdf.internal.pageSize.getHeight()
        const iw = pw - 20
        const ih = (canvas.height * iw) / canvas.width
        if (ih <= ph - 20) {
          pdf.addImage(img, "PNG", 10, 10, iw, ih)
        } else {
          let sX = 0
          const pxPage = (canvas.width * (ph - 20)) / iw
          while (sX < canvas.height) {
            const pc = document.createElement("canvas")

            pc.width = canvas.width
            pc.height = Math.min(pxPage, canvas.height - sX)
            pc.getContext("2d").drawImage(canvas, 0, sX, canvas.width, pc.height, 0, 0, pc.width, pc.height)
            if (sX > 0) pdf.addPage()
            pdf.addImage(pc.toDataURL("image/png"), "PNG", 10, 10, iw, (pc.height * iw) / canvas.width)
            sX += pc.height
          }
        }
        pdf.save(`financial_report_${new Date().toISOString().slice(0, 10)}.pdf`)
        this.showAlert("success", "تم تصدير الـ PDF")
      } catch (e) {
        console.error(e)
        this.showAlert("error", "تعذّر تصدير الـ PDF")
      } finally {
        this.exporting.pdf = false
      }
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="report-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-bar-chart-2-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">
          التقرير المالي
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          ملخص الدخل والمصاريف وصافي الربح للسنة <strong>{{ activeStudyYear }}</strong>
        </div>
      </div>
      <div class="d-flex ga-2">
        <VBtn
          variant="flat"
          color="white"
          class="text-primary"
          prepend-icon="ri-refresh-line"
          :loading="loading"
          @click="fetchReport"
        >
          تحديث
        </VBtn>
        <VBtn
          color="success"
          prepend-icon="ri-file-excel-2-line"
          :loading="exporting.excel"
          @click="exportToExcel"
        >
          Excel
        </VBtn>
        <VBtn
          color="error"
          prepend-icon="ri-file-pdf-2-line"
          :loading="exporting.pdf"
          @click="exportToPDF"
        >
          PDF
        </VBtn>
      </div>
    </div>

    <!-- Filters -->
    <VCard
      rounded="lg"
      elevation="0"
      class="mb-4 border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2">
          <VIcon
            icon="ri-filter-3-line"
            color="primary"
          />
          <span class="text-subtitle-1 font-weight-bold">تصفية</span>
          <VSpacer />
          <VBtn
            variant="text"
            size="small"
            prepend-icon="ri-refresh-line"
            @click="resetFilters"
          >
            إعادة تعيين
          </VBtn>
        </div>
        <VRow dense>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="filters.studyYear"
              :items="studyYears"
              item-title="label"
              item-value="value"
              label="السنة الدراسية"
              variant="outlined"
              density="comfortable"
              :loading="yearsLoading"
              prepend-inner-icon="ri-calendar-2-line"
              @update:model-value="fetchReport"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="filters.from"
              type="date"
              label="من تاريخ"
              variant="outlined"
              density="comfortable"
              clearable
              prepend-inner-icon="ri-calendar-line"
              @update:model-value="fetchReport"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="filters.to"
              type="date"
              label="إلى تاريخ"
              variant="outlined"
              density="comfortable"
              clearable
              prepend-inner-icon="ri-calendar-line"
              @update:model-value="fetchReport"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Printable area -->
    <div ref="printArea">
      <!-- KPI cards -->
      <VRow class="mb-4">
        <VCol
          cols="6"
          md="3"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="kpi-card"
          >
            <VCardText>
              <div class="d-flex align-center justify-space-between mb-2">
                <VIcon
                  icon="ri-money-dollar-circle-line"
                  color="success"
                  size="24"
                />
                <VChip
                  size="small"
                  color="success"
                  variant="flat"
                >
                  مقبوض
                </VChip>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatShort(summary.totalPaidIncome) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                الدخل المقبوض
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="6"
          md="3"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="kpi-card"
          >
            <VCardText>
              <div class="d-flex align-center justify-space-between mb-2">
                <VIcon
                  icon="ri-calendar-check-line"
                  color="info"
                  size="24"
                />
                <VChip
                  size="small"
                  color="info"
                  variant="flat"
                >
                  {{ collectionRatePct }}% تحصيل
                </VChip>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatShort(summary.totalDueIncome) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                إجمالي المستحقات
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="6"
          md="3"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="kpi-card"
          >
            <VCardText>
              <div class="d-flex align-center justify-space-between mb-2">
                <VIcon
                  icon="ri-shopping-cart-line"
                  color="error"
                  size="24"
                />
                <VChip
                  size="small"
                  color="error"
                  variant="flat"
                >
                  مصاريف
                </VChip>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatShort(expenses.total) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                إجمالي المصاريف
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="6"
          md="3"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="kpi-card kpi-profit"
          >
            <VCardText>
              <div class="d-flex align-center justify-space-between mb-2">
                <VIcon
                  icon="ri-line-chart-line"
                  color="warning"
                  size="24"
                />
                <VChip
                  size="small"
                  :color="profitMarginPct >= 0 ? 'warning' : 'error'"
                  variant="flat"
                >
                  {{ profitMarginPct }}% هامش
                </VChip>
              </div>
              <div
                class="text-h5 font-weight-bold"
                :class="summary.netProfitPaidBasis >= 0 ? 'text-warning' : 'text-error'"
              >
                {{ formatShort(summary.netProfitPaidBasis) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                صافي الربح (مقبوض)
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Comparison + Expense breakdown -->
      <VRow class="mb-4">
        <VCol
          cols="12"
          md="8"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="border"
          >
            <VCardText>
              <div class="d-flex align-center mb-3">
                <VIcon
                  icon="ri-bar-chart-box-line"
                  color="primary"
                  class="me-2"
                />
                <span class="text-subtitle-1 font-weight-bold">مقارنة الدخل والمصاريف</span>
              </div>
              <Apexchart
                type="bar"
                height="320"
                :options="comparisonBarOptions"
                :series="comparisonBarSeries"
              />
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="12"
          md="4"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="border h-100"
          >
            <VCardText>
              <div class="d-flex align-center mb-3">
                <VIcon
                  icon="ri-pie-chart-line"
                  color="primary"
                  class="me-2"
                />
                <span class="text-subtitle-1 font-weight-bold">المصاريف حسب التصنيف</span>
              </div>
              <Apexchart
                type="donut"
                height="320"
                :options="expenseDonutOptions"
                :series="expenseDonutSeries"
              />
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Invoice split -->
      <VCard
        rounded="lg"
        elevation="0"
        class="border mb-4"
      >
        <VCardText>
          <div class="d-flex align-center mb-3">
            <VIcon
              icon="ri-bill-line"
              color="primary"
              class="me-2"
            />
            <span class="text-subtitle-1 font-weight-bold">تفصيل الفواتير: مدفوع / متبقّي / خصم</span>
          </div>
          <Apexchart
            type="bar"
            height="260"
            :options="invoiceSplitOptions"
            :series="invoiceSplitSeries"
          />
        </VCardText>
      </VCard>

      <!-- Side-by-side breakdown tables -->
      <VRow class="mb-4">
        <VCol
          cols="12"
          md="6"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="border h-100"
          >
            <VCardText>
              <div class="d-flex align-center mb-3">
                <VIcon
                  icon="ri-group-line"
                  color="info"
                  class="me-2"
                />
                <span class="text-subtitle-1 font-weight-bold">فواتير الطلاب</span>
              </div>
              <div class="d-flex justify-space-between py-2 row-line">
                <span>المستحق</span><strong>{{ formatIQD(invoices.student.totalDue) }}</strong>
              </div>
              <div class="d-flex justify-space-between py-2 row-line">
                <span>الخصومات</span><strong class="text-warning">{{ formatIQD(invoices.student.totalDiscount) }}</strong>
              </div>
              <div class="d-flex justify-space-between py-2 row-line">
                <span>المدفوع</span><strong class="text-success">{{ formatIQD(invoices.student.totalPaid) }}</strong>
              </div>
              <div class="d-flex justify-space-between py-2">
                <span>المتبقّي</span><strong class="text-error">{{ formatIQD(invoices.student.totalRemaining) }}</strong>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="12"
          md="6"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="border h-100"
          >
            <VCardText>
              <div class="d-flex align-center mb-3">
                <VIcon
                  icon="ri-shopping-bag-line"
                  color="warning"
                  class="me-2"
                />
                <span class="text-subtitle-1 font-weight-bold">فواتير العربون</span>
              </div>
              <div class="d-flex justify-space-between py-2 row-line">
                <span>المستحق</span><strong>{{ formatIQD(invoices.reservation.totalDue) }}</strong>
              </div>
              <div class="d-flex justify-space-between py-2 row-line">
                <span>الخصومات</span><strong class="text-warning">{{ formatIQD(invoices.reservation.totalDiscount) }}</strong>
              </div>
              <div class="d-flex justify-space-between py-2 row-line">
                <span>المدفوع</span><strong class="text-success">{{ formatIQD(invoices.reservation.totalPaid) }}</strong>
              </div>
              <div class="d-flex justify-space-between py-2">
                <span>المتبقّي</span><strong class="text-error">{{ formatIQD(invoices.reservation.totalRemaining) }}</strong>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Profit summary -->
      <VCard
        rounded="lg"
        elevation="0"
        class="border mb-4"
      >
        <VCardText>
          <div class="d-flex align-center mb-3">
            <VIcon
              icon="ri-funds-line"
              color="primary"
              class="me-2"
            />
            <span class="text-subtitle-1 font-weight-bold">الملخص النهائي</span>
          </div>
          <VRow>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <div class="text-caption text-medium-emphasis">
                الدخل المقبوض
              </div>
              <div class="text-h6 font-weight-bold text-success">
                {{ formatIQD(summary.totalPaidIncome) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <div class="text-caption text-medium-emphasis">
                الدخل المستحق
              </div>
              <div class="text-h6 font-weight-bold text-info">
                {{ formatIQD(summary.totalDueIncome) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <div class="text-caption text-medium-emphasis">
                صافي الربح (مقبوض)
              </div>
              <div
                class="text-h6 font-weight-bold"
                :class="summary.netProfitPaidBasis >= 0 ? 'text-warning' : 'text-error'"
              >
                {{ formatIQD(summary.netProfitPaidBasis) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <div class="text-caption text-medium-emphasis">
                صافي الربح (استحقاق)
              </div>
              <div
                class="text-h6 font-weight-bold"
                :class="summary.netProfitDueBasis >= 0 ? 'text-primary' : 'text-error'"
              >
                {{ formatIQD(summary.netProfitDueBasis) }}
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </div>

    <BaseAlert
      v-if="alert.open"
      v-model="alert.open"
      :type="alert.type"
      :message="alert.message"
      :closable="true"
      close-text="موافق"
      @close="alert.open = false"
    />
  </div>
</template>

<style scoped>
.report-hero {
  background: linear-gradient(135deg, #0B2545 0%, #163e72 100%);
  position: relative;
  overflow: hidden;
}
.hero-icon-wrap {
  inline-size: 56px;
  block-size: 56px;
  background: rgba(255, 138, 0, 0.95);
}
.border {
  border: 1px solid rgba(11, 37, 69, 0.08) !important;
}
.kpi-card {
  border: 1px solid rgba(11, 37, 69, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(11, 37, 69, 0.08);
}
.kpi-profit {
  background: linear-gradient(135deg, rgba(255, 138, 0, 0.06), rgba(255, 138, 0, 0));
}
.row-line {
  border-bottom: 1px dashed rgba(11, 37, 69, 0.08);
}
@media print {
  .v-btn { display: none; }
}
</style>
