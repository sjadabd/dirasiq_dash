<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-file-add-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h6 font-weight-bold">إنشاء فاتورة</h3>
        <VSpacer />
        <RouterLink :to="{ name: 'teacher-invoices-manage-invoices' }">
          <VBtn variant="text" prepend-icon="ri-arrow-right-line">رجوع</VBtn>
        </RouterLink>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <VSelect v-model="form.courseId" :items="courseItems" item-title="text" item-value="value"
              label="اختر الكورس" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading" clearable
              @update:model-value="onCourseChange" />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="form.studentId" :items="studentItems" item-title="name" item-value="id"
              label="اختر الطالب" variant="outlined" :loading="studentsLoading"
              :disabled="studentsLoading || !form.courseId" clearable />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="form.studyYear" :items="studyYears" item-title="label" item-value="value"
              label="السنة الدراسية" variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="form.paymentMode" :items="paymentModes" item-title="text" item-value="value"
              label="طريقة الدفع" variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="form.invoiceType" :items="invoiceTypes" item-title="text" item-value="value"
              label="نوع الفاتورة" variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField v-model.number="form.amountDue" type="number" label="المبلغ المستحق" variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField v-model="form.dueDate" type="date" label="تاريخ الاستحقاق" variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField v-model.number="form.discountAmount" type="number" label="خصم عام" variant="outlined" />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="form.notes" label="ملاحظات" variant="outlined" />
          </VCol>
        </VRow>

        <!-- Installments Builder -->
        <VCard variant="tonal" class="mt-4">
          <VCardTitle class="d-flex align-center">
            <VIcon icon="ri-calendar-schedule-line" class="me-2" /> خطة الأقساط (اختياري)
            <VSpacer />
            <VBtn size="small" variant="tonal" prepend-icon="ri-add-line" @click="addInstallment">إضافة قسط</VBtn>
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VAlert v-if="!form.installments.length" type="info" variant="tonal">لا يوجد أقساط</VAlert>
            <VRow v-for="(ins, idx) in form.installments" :key="idx" class="mb-1">
              <VCol cols="12" md="2">
                <VTextField v-model.number="ins.installmentNumber" type="number" label="# القسط" variant="outlined" />
              </VCol>
              <VCol cols="12" md="3">
                <VTextField v-model.number="ins.plannedAmount" type="number" label="المبلغ المخطط" variant="outlined" />
              </VCol>
              <VCol cols="12" md="2">
                <VTextField v-model="ins.dueDate" type="date" label="تاريخ الاستحقاق" variant="outlined" />
              </VCol>
              <VCol cols="12" md="2">
                <VSelect
                  v-model="ins.paid"
                  :items="[
                    { text: 'غير مدفوع', value: false },
                    { text: 'مدفوع', value: true }
                  ]"
                  item-title="text"
                  item-value="value"
                  label="مدفوع؟"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="2">
                <VTextField v-model="ins.paidDate" :disabled="!ins.paid" type="date" label="تاريخ التسديد" variant="outlined" />
              </VCol>
              <VCol cols="12" md="1" class="d-flex align-center">
                <VBtn color="error" size="small" icon="ri-delete-bin-line" variant="text"
                  @click="removeInstallment(idx)" />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <div class="mt-4 d-flex justify-end">
          <VBtn color="primary" :loading="saving" prepend-icon="ri-save-3-line" @click="submit">حفظ الفاتورة</VBtn>
        </div>
      </VCardText>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  data() {
    return {
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'فواتير الطلاب', disabled: false, to: { name: 'teacher-invoices-manage-invoices' } },
        { title: 'إنشاء فاتورة', disabled: true },
      ],
      loading: false,
      saving: false,
      progress: 0,
      alert: { open: false, type: 'success', message: '' },

      studyYears: this.buildStudyYears(),
      paymentModes: [
        { text: 'نقد', value: 'cash' },
        { text: 'أقساط', value: 'installments' },
      ],
      invoiceTypes: [
        { text: 'دورة', value: 'course' },
        { text: 'أخرى', value: 'other' },
      ],
      paymentMethods: [
        { text: 'نقد', value: 'cash' },
        { text: 'تحويل بنكي', value: 'bank_transfer' },
        { text: 'بطاقة', value: 'card' },
      ],

      // dynamic selects
      courseItems: [],
      coursesLoading: false,
      studentItems: [],
      studentsLoading: false,

      form: {
        studentId: '',
        courseId: '',
        studyYear: JSON.parse(localStorage.getItem('studyYear')) || '',
        paymentMode: 'installments',
        invoiceType: 'course',
        amountDue: null,
        dueDate: '',
        notes: '',
        discountAmount: 0,
        installments: [],
        payments: [],
        additionalDiscounts: [],
      },
    }
  },
  mounted() {
    this.loadCourses()
  },
  methods: {
    buildStudyYears() {
      const current = new Date().getFullYear()
      const list = []
      for (let y = current - 1; y <= current + 1; y++) list.push({ label: `${y}-${y + 1}`, value: `${y}-${y + 1}` })
      return list
    },
    addInstallment() {
      this.form.installments.push({
        installmentNumber: this.form.installments.length + 1,
        plannedAmount: null,
        dueDate: '',
        paid: false,
        paidDate: ''
      })
    },
    removeInstallment(idx) {
      this.form.installments.splice(idx, 1)
    },
    addPayment() {
      this.form.payments.push({ amount: null, paymentMethod: 'cash', installmentNumber: undefined, paidAt: '', notes: '' })
    },
    removePayment(idx) {
      this.form.payments.splice(idx, 1)
    },
    addAdditionalDiscount() {
      this.form.additionalDiscounts.push({ amount: null, notes: '' })
    },
    removeAdditionalDiscount(idx) {
      this.form.additionalDiscounts.splice(idx, 1)
    },
    async loadCourses() {
      try {
        this.coursesLoading = true
        const res = await TeacherApi.getCourseNames()
        const list = res?.data?.data || []
        this.courseItems = list.map(x => ({ text: x.name || x.course_name || '-', value: x.id }))
      } catch (e) {
        this.showAlert('error', 'تعذر جلب أسماء الدورات')
      } finally {
        this.coursesLoading = false
      }
    },
    async onCourseChange() {
      // reset student when course changes
      this.form.studentId = ''
      this.studentItems = []
      if (!this.form.courseId) return
      try {
        this.studentsLoading = true
        const res = await TeacherApi.getStudentsByCourse(this.form.courseId)
        const list = res?.data?.data || []
        this.studentItems = list.map(s => ({ id: s.id || s.student_id, name: s.name || s.student_name }))
      } catch (e) {
        this.showAlert('error', 'تعذر جلب طلاب الكورس')
      } finally {
        this.studentsLoading = false
      }
    },
    async submit() {
      // Basic required fields
      if (!this.form.studentId || !this.form.courseId || !this.form.studyYear || this.form.amountDue == null) {
        this.showAlert('error', 'الرجاء إدخال الحقول الأساسية (طالب، كورس، سنة، مبلغ)')
        return
      }

      // Build payload according to API guide
      const payload = {
        studentId: this.form.studentId,
        courseId: this.form.courseId,
        studyYear: this.form.studyYear,
        paymentMode: this.form.paymentMode,
        amountDue: Number(this.form.amountDue),
      }
      if (this.form.invoiceType) payload.invoiceType = this.form.invoiceType
      if (this.form.discountAmount != null && this.form.discountAmount !== '') payload.discountAmount = Number(this.form.discountAmount)
      if (this.form.dueDate === null) payload.dueDate = null
      else if (this.form.dueDate && this.form.dueDate.trim() !== '') payload.dueDate = this.form.dueDate
      if (this.form.notes === null) payload.notes = null
      else if (typeof this.form.notes === 'string' && this.form.notes.trim() !== '') payload.notes = this.form.notes.trim()

      // installments only for installments mode, require at least one
      if (this.form.paymentMode === 'installments') {
        if (!Array.isArray(this.form.installments) || this.form.installments.length === 0) {
          return this.showAlert('error', 'خطة الأقساط مطلوبة عند اختيار طريقة الدفع بالأقساط')
        }
        const normalized = []
        for (const inst of this.form.installments) {
          if (
            inst && Number.isFinite(Number(inst.installmentNumber)) &&
            Number.isFinite(Number(inst.plannedAmount)) && inst.dueDate
          ) {
            const entry = {
              installmentNumber: Number(inst.installmentNumber),
              plannedAmount: Number(inst.plannedAmount),
              dueDate: inst.dueDate,
              ...(inst.notes ? { notes: String(inst.notes) } : {}),
            }
            if (inst.paid === true) {
              entry.paid = true
              if (inst.paidDate) {
                entry.paidDate = inst.paidDate
              }
            }
            normalized.push(entry)
          }
        }
        if (normalized.length === 0) return this.showAlert('error', 'خطة الأقساط غير صالحة')
        payload.installments = normalized
      }

      this.saving = true
      try {
        const { data } = await TeacherApi.createInvoice(payload)
        this.showAlert('success', data?.message || 'تم إنشاء الفاتورة')
        this.$router.push({ name: 'teacher-invoices-manage-invoices' })
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر إنشاء الفاتورة')
      } finally {
        this.saving = false
      }
    },
    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
    },
  },
}
</script>
