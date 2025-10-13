<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <br />
    <ReportCharts v-if="reportChartsData" :data="reportChartsData"
      :studyYear="fetchedStudyYear || (report && report.studyYear)" />

    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="4">
            <VSelect v-model="table.tableSettings.options.study_year" :items="studyYears" item-title="label"
              item-value="value" label="السنة الدراسية" variant="outlined" :loading="yearsLoading"
              @update:model-value="getDataAxios" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <VCard class="my-4 data-table-card" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small"
              class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">فواتير عربون الحجوزات</h3>
          </VCol>
          <VCol cols="auto" class="d-flex gap-2">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ numberWithComma(table.totalItems) }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable :headers="table.headers" :items="table.Data" :actions="table.actions" :loading="table.loading"
          :totalItems="table.totalItems" :tableOptions="table.tableSettings.options"
          @updateTableOptions="updateTableOptions" @showItem="goToDetails" class="reservation-payments-table" />
      </VCardItem>
    </VCard>
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';
import ReportCharts from '@/components/teacher/report-reservation.vue';
import numberWithComma from '@/constant/number';

export default {
  components: {
    ReportCharts
  },
  data() {
    return {
      keyName: 'show-reservation-payments',
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'فواتير العربون', disabled: true },
      ],
      loading: false,
      progress: 0,
      studyYears: [],
      yearsLoading: false,

      table: {
        totalItems: 0,
        Data: [],
        actions: [],
        loading: false,
        headers: [
          { title: '#', type: 'strong', sortable: false, key: 'num' },
          { title: 'اسم الطالب', type: 'strong', sortable: true, key: 'studentName' },
          { title: 'اسم الكورس', type: 'strong', sortable: true, key: 'courseName' },
          { title: 'المبلغ', type: 'number', sortable: true, key: 'amount' },
          { title: 'الحالة', type: 'status', sortable: true, key: 'status' },
          { title: 'تاريخ الدفع', type: 'date', sortable: true, key: 'paidAt' },
          { title: 'تفاصيل', type: 'link', sortable: false, key: 'reportText' },
        ],
        tableSettings: {
          options: {
            page: 1,
            limit: 10,
            sortBy: '',
            search: null,
            study_year: JSON.parse(localStorage.getItem('studyYear')),
            sort: JSON.stringify({ key: 'paidAt', order: 'desc' }),
          },
        },
      },

      // summary report from API
      report: null,
      // mapped props for ReportCharts
      fetchedStudyYear: null,
      reportChartsData: null,

      alert: { open: false, message: null, type: 'success' },
    }
  },
  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName))
    if (stored) this.table.tableSettings = stored
    this.loadAcademicYears()
  },
  methods: {
    numberWithComma,
    async loadAcademicYears() {
      try {
        this.yearsLoading = true
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null
        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        // default to active if not set
        if (!this.table?.tableSettings?.options?.study_year) {
          this.table.tableSettings.options.study_year = active?.year || null
        }
        // initial load
        this.getDataAxios()
      } catch (e) {
        // fallback: if API fails, keep existing value and try to load data
        this.getDataAxios()
      } finally {
        this.yearsLoading = false
      }
    },
    reload() {
      localStorage.removeItem(this.keyName)
      this.table.tableSettings.options = {
        page: 1,
        limit: 10,
        sortBy: '',
        search: null,
        study_year: JSON.parse(localStorage.getItem('studyYear')),
        sort: JSON.stringify({ key: 'paidAt', order: 'desc' }),
      }
      this.getDataAxios()
    },
    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
        search: !newOptions.search ? null : newOptions.search,
      }
      this.getDataAxios()
    },
    async getDataAxios() {
      this.progress = 0
      this.loading = true
      const fakeProgress = setInterval(() => { if (this.progress < 90) this.progress += 10 }, 100)
      try {
        localStorage.setItem(this.keyName, JSON.stringify(this.table.tableSettings))
        const response = await TeacherApi.getReservationPayments(this.table.tableSettings)
        const payload = response?.data?.data || {}
        const items = payload.items || []
        this.report = payload.report || null
        // map report to ReportCharts format
        const counts = this.report?.counts || {}
        const totals = this.report?.totals || {}
        this.fetchedStudyYear = payload.studyYear || this.report?.studyYear || this.table.tableSettings.options.study_year
        this.reportChartsData = {
          totalAmount: Number(totals.totalAmount || 0),
          totalPaid: Number(totals.totalPaidAmount || 0),
          totalDiscount: Number(totals.discountAmount || 0),
          totalRemaining: Number(totals.remainingAmount || 0),
          totalCount: Number((counts.totalPaid || 0) + (counts.totalPending || 0)),
          paidCount: Number(counts.totalPaid || 0),
          remainingCount: Number(counts.totalPending || 0),
          discountCount: 0,
        }
        this.table.Data = items.map((it, idx) => ({
          num: (this.table.tableSettings.options.page - 1) * this.table.tableSettings.options.limit + idx + 1,
          studentName: it.studentName,
          courseName: it.courseName,
          amount: it.amount,
          status: it.status,
          paidAt: it.paidAt,
          reportText: 'عرض',
          reportLink: it.reportLink,
        }))
        this.table.totalItems = payload?.pagination?.total || items.length
      } catch (error) {
        this.showAlert('error', error?.response?.data?.message || 'حدث خطأ أثناء جلب البيانات')
      } finally {
        clearInterval(fakeProgress)
        this.progress = 100
        setTimeout(() => { this.loading = false; this.progress = 0 }, 300)
      }
    },
    goToDetails(item) {
      const to = item?.reportLink || (item?.report && item.report.to) || null
      if (!to) return
      this.$router.push(to)
    },
    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true })
    },
  },
}
</script>
