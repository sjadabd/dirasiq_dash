<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center justify-space-between">
        <div class="text-h6">تفاصيل فاتورة العربون</div>
        <RouterLink :to="{ name: 'teacher-payments-reservations-show-reservation-payments' }">
          <VBtn color="primary" prepend-icon="ri-arrow-right-line" variant="tonal">رجوع</VBtn>
        </RouterLink>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <div class="text-subtitle-2 text-medium-emphasis">اسم الطالب</div>
            <div class="text-h6">{{ payment.studentName || '-' }}</div>
          </VCol>
          <VCol cols="12" md="6">
            <div class="text-subtitle-2 text-medium-emphasis">اسم الكورس</div>
            <div class="text-h6">{{ payment.courseName || '-' }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-subtitle-2 text-medium-emphasis">المبلغ</div>
            <div class="text-h6">{{ numberWithComma(payment.amount) }} د.ع</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-subtitle-2 text-medium-emphasis">الحالة</div>
            <VChip :color="payment.status === 'paid' ? 'success' : 'warning'" class="mt-1" size="small">
              {{ payment.status === 'paid' ? 'مدفوع' : 'قيد الانتظار' }}
            </VChip>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-subtitle-2 text-medium-emphasis">تاريخ الدفع</div>
            <div class="text-h6">{{ formatDate(payment.paidAt) }}</div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="text-subtitle-2 text-medium-emphasis">السنة الدراسية</div>
            <div class="text-h6">{{ payment.studyYear }}</div>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api'
import numberWithComma from '@/constant/number'

export default {
  data() {
    return {
      keyName: 'reservation-payment-details',
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'فواتير العربون', disabled: false, to: { name: 'teacher-payments-reservations-show-reservation-payments' } },
        { title: 'تفاصيل', disabled: true },
      ],
      loading: false,
      progress: 0,
      payment: {
        studentName: '',
        courseName: '',
        amount: 0,
        status: 'pending',
        paidAt: null,
        studyYear: '',
      },
    }
  },
  mounted() {
    this.getDataAxios()
  },
  methods: {
    numberWithComma,
    formatDate(val) {
      if (!val) return '-'
      try { return new Date(val).toLocaleString() } catch { return '-' }
    },
    async getDataAxios() {
      const bookingId = this.$route.params.bookingId
      if (!bookingId) return
      this.progress = 0
      this.loading = true
      const fakeProgress = setInterval(() => { if (this.progress < 90) this.progress += 10 }, 100)
      try {
        const { data } = await TeacherApi.getReservationPaymentByBooking(bookingId)
        const payload = data?.data || {}
        this.payment = payload
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
