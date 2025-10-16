<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-filter-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="4">
            <VSelect v-model="studyYear" :items="studyYears" item-title="label" item-value="value"
              label="السنة الدراسية" variant="outlined" @update:model-value="getDataAxios" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <VRow class="my-4">
      <VCol cols="12" md="3">
        <VCard class="pa-4" elevation="3" rounded="lg">
          <div class="text-subtitle-2 text-medium-emphasis">إجمالي المبالغ</div>
          <div class="text-h5 mt-1">{{ numberWithComma(totals.totalAmount) }} د.ع</div>
        </VCard>
      </VCol>
      <VCol cols="12" md="3">
        <VCard class="pa-4" elevation="3" rounded="lg">
          <div class="text-subtitle-2 text-medium-emphasis">المدفوع</div>
          <div class="text-h5 mt-1">{{ numberWithComma(totals.totalPaidAmount) }} د.ع</div>
        </VCard>
      </VCol>
      <VCol cols="12" md="3">
        <VCard class="pa-4" elevation="3" rounded="lg">
          <div class="text-subtitle-2 text-medium-emphasis">الخصم</div>
          <div class="text-h5 mt-1">{{ numberWithComma(totals.discountAmount) }} د.ع</div>
        </VCard>
      </VCol>
      <VCol cols="12" md="3">
        <VCard class="pa-4" elevation="3" rounded="lg">
          <div class="text-subtitle-2 text-medium-emphasis">المتبقي</div>
          <div class="text-h5 mt-1">{{ numberWithComma(totals.remainingAmount) }} د.ع</div>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="my-2">
      <VCol cols="12" md="6">
        <VCard class="pa-4" elevation="2" rounded="lg">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-2 text-medium-emphasis">عدد المدفوعة</div>
              <div class="text-h6 mt-1">{{ counts.totalPaid }}</div>
            </div>
            <VIcon icon="ri-check-double-line" color="success" size="28" />
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard class="pa-4" elevation="2" rounded="lg">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-2 text-medium-emphasis">عدد قيد الانتظار</div>
              <div class="text-h6 mt-1">{{ counts.totalPending }}</div>
            </div>
            <VIcon icon="ri-time-line" color="warning" size="28" />
          </div>
        </VCard>
      </VCol>
    </VRow>

    <div class="mt-4 d-flex justify-end">
      <RouterLink :to="{ name: 'teacher-payments-reservations-show-reservation-payments' }">
        <VBtn color="primary" prepend-icon="ri-list-check-2" variant="elevated">رجوع إلى القائمة</VBtn>
      </RouterLink>
    </div>
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';
import numberWithComma from '@/constant/number';

export default {
  data() {
    return {
      keyName: 'reservation-payments-report',
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'تقرير فواتير العربون', disabled: true },
      ],
      loading: false,
      progress: 0,
      studyYears: this.buildStudyYears(),
      studyYear: JSON.parse(localStorage.getItem('studyYear')) || '',
      counts: { totalPaid: 0, totalPending: 0 },
      totals: { totalAmount: 0, totalPaidAmount: 0, discountAmount: 0, remainingAmount: 0 },
    }
  },
  mounted() {
    this.getDataAxios()
  },
  methods: {
    numberWithComma,
    buildStudyYears() {
      const current = new Date().getFullYear()
      const list = []
      for (let y = current - 1; y <= current + 1; y++) list.push({ label: `${y}-${y + 1}`, value: `${y}-${y + 1}` })
      return list
    },
    async getDataAxios() {
      if (!this.studyYear) return
      this.progress = 0
      this.loading = true
      const fakeProgress = setInterval(() => { if (this.progress < 90) this.progress += 10 }, 100)
      try {
        const { data } = await TeacherApi.getReservationPaymentsReport(this.studyYear)
        const payload = data?.data || {}
        this.counts = payload.counts || this.counts
        this.totals = payload.totals || this.totals
      } catch (error) {
        console.error(error)
      } finally {
        clearInterval(fakeProgress)
        this.progress = 100
        setTimeout(() => { this.loading = false; this.progress = 0 }, 300)
      }
    },
  },
}
</script>
