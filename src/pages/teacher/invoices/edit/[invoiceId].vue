<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-file-edit-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h6 font-weight-bold">تعديل الفاتورة</h3>
        <VSpacer />
        <RouterLink :to="{ name: 'teacher-invoices-manage-invoices' }">
          <VBtn variant="text" prepend-icon="ri-arrow-right-line">رجوع</VBtn>
        </RouterLink>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <VTextField v-model="form.studentId" label="معرّف الطالب" variant="outlined" />
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
            <VTextField v-model="form.invoiceDate" type="date" label="تاريخ الفاتورة" variant="outlined" />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField v-model.number="form.discountAmount" type="number" label="خصم عام" variant="outlined" />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="form.notes" label="ملاحظات" variant="outlined" />
          </VCol>
        </VRow>

        <!-- Current Summary -->
        <VRow class="mt-2">
          <VCol cols="12" md="6">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">المدفوع الحالي</div>
                <div class="text-subtitle-1">{{ Number(current.amountPaid).toLocaleString() }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">الخصومات الحالية</div>
                <div class="text-subtitle-1">{{ Number(current.totalDiscount).toLocaleString() }}</div>
              </VCardText>
            </VCard>
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
              <VCol cols="12" md="2">
                <VTextField v-model.number="ins.plannedAmount" type="number" label="المبلغ المخطط" variant="outlined" />
              </VCol>
              <VCol cols="12" md="2">
                <VTextField v-model="ins.dueDate" type="date" label="تاريخ الاستحقاق" variant="outlined" />
              </VCol>
              <VCol cols="12" md="2">
                <VSelect v-model="ins.paid" :items="[
                  { text: 'غير مدفوع', value: false },
                  { text: 'مدفوع', value: true }
                ]" item-title="text" item-value="value" label="مدفوع؟" variant="outlined" />
              </VCol>
              <VCol cols="12" md="2">
                <VTextField v-model="ins.paidDate" :disabled="!ins.paid" type="date" label="تاريخ التسديد"
                  variant="outlined" />
              </VCol>
              <VCol cols="12" md="1" class="d-flex align-center">
                <VBtn color="error" size="small" icon="ri-delete-bin-line" variant="text"
                  @click="removeInstallment(idx)" />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>


        <div class="mt-4 d-flex justify-end">
          <VBtn color="primary" :loading="saving" prepend-icon="ri-save-3-line" @click="submit">حفظ التعديلات</VBtn>
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
        { title: 'تعديل فاتورة', disabled: true },
      ],
      loading: false,
      saving: false,
      progress: 0,
      alert: { open: false, type: 'success', message: '' },

      invoiceId: this.$route.params.invoiceId,

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

      form: {
        studyYear: JSON.parse(localStorage.getItem('studyYear')) || '',
        paymentMode: 'installments',
        invoiceType: 'course',
        amountDue: null,
        dueDate: '',
        discountAmount: 0,
        notes: '',
        installments: [],
        payments: [],
        additionalDiscounts: [],
      },

      current: { amountPaid: 0, totalDiscount: 0, remaining: 0 },
    }
  },
  created() {
    // Prefill from router state if available
    const stateInv = this.$route?.state || this.$router?.options?.history?.state?.data
    if (stateInv && typeof stateInv === 'object') {
      this.form.studyYear = stateInv.study_year || this.form.studyYear
      this.form.paymentMode = stateInv.payment_mode || this.form.paymentMode
      this.form.invoiceType = stateInv.invoice_type || this.form.invoiceType
      this.form.amountDue = stateInv.amount_due != null ? Number(stateInv.amount_due) : this.form.amountDue
      this.form.dueDate = stateInv.due_date ? String(stateInv.due_date).slice(0, 10) : this.form.dueDate
      this.form.notes = stateInv.notes || this.form.notes
    }
  },
  mounted() {
    this.loadDetails()
  },
  methods: {
    buildStudyYears() {
      const current = new Date().getFullYear()
      const list = []
      for (let y = current - 1; y <= current + 1; y++) list.push({ label: `${y}-${y + 1}`, value: `${y}-${y + 1}` })
      return list
    },
    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
    },
    async loadDetails() {
      try {
        this.loading = true
        const res = await TeacherApi.getInvoiceInstallments(this.invoiceId)
        const data = res?.data?.data || {}
        const inv = data.invoice || {}
        const installments = Array.isArray(data.installments) ? data.installments : []
        const entries = Array.isArray(data.entries) ? data.entries : []

        // Prefill invoice fields
        if (inv) {
          this.form.studentId = inv.student_id || this.form.studentId
          this.form.studyYear = inv.study_year || this.form.studyYear
          this.form.paymentMode = inv.payment_mode || this.form.paymentMode
          this.form.invoiceType = inv.invoice_type || this.form.invoiceType
          this.form.amountDue = inv.amount_due != null ? Number(inv.amount_due) : this.form.amountDue
          this.form.dueDate = inv.due_date ? String(inv.due_date).slice(0, 10) : this.form.dueDate
          this.form.invoiceDate = inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : this.form.invoiceDate
          this.form.notes = inv.notes || this.form.notes

          const paid = inv.amount_paid != null ? Number(inv.amount_paid) : 0
          const disc = inv.discount_total != null ? Number(inv.discount_total) : 0
          const remaining = inv.remaining_amount != null ? Number(inv.remaining_amount) : 0
          this.current = { amountPaid: paid, totalDiscount: disc, remaining }
          // Reflect current discount in the field
          this.form.discountAmount = disc
        }

        // Map installments
        this.form.installments = installments
          .filter(i => typeof i.installment_number !== 'undefined')
          .map(i => ({
            installmentNumber: i.installment_number,
            plannedAmount: i.planned_amount != null ? Number(i.planned_amount) : null,
            dueDate: i.due_date ? String(i.due_date).slice(0, 10) : '',
            paid: i.is_paid === true,
            paidDate: i.paid_date ? String(i.paid_date).slice(0, 10) : '',
            paidAmount: i.paid_amount != null ? Number(i.paid_amount) : null,
            notes: i.notes || '',
            _id: i.id,
          }))

        // Build index map to resolve installment_id -> installment_number
        const idx = {}
        for (const ins of installments) idx[ins.id] = ins.installment_number

        // Map entries -> payments and derive discount totals
        const payments = []
        const discounts = [] // keep empty for form to avoid resending existing discounts
        let discountsTotal = 0
        if (entries && entries.length) {
          for (const e of entries) {
            const amount = e?.amount != null ? Number(e.amount) : null
            if (!amount) continue
            if (e.entry_type === 'payment') {
              payments.push({
                amount,
                paymentMethod: e.payment_method || 'cash',
                installmentNumber: e.installment_id ? idx[e.installment_id] : undefined,
                paidAt: e.paid_at ? String(e.paid_at).slice(0, 16) : '', // datetime-local value
                notes: e.notes || '',
              })
            } else if (e.entry_type === 'discount') {
              discountsTotal += amount
            }
          }
        } else if (installments && installments.length) {
          // Some backends embed discount/payment-like entries inside installments array
          for (const it of installments) {
            const amount = it?.amount != null ? Number(it.amount) : null
            if (it.entry_type === 'discount' && amount) {
              discountsTotal += amount
            }
            // Do not prefill existing payments into form.payments to avoid duplicating on submit
          }
        }
        this.form.payments = payments
        // Do not prefill existing discounts in the form list; use discountAmount to show total
        this.form.additionalDiscounts = []
        // Only fallback to computed discounts if API did not provide invoice.discount_total
        if (!inv || inv.discount_total == null) this.form.discountAmount = discountsTotal

        // If invoice.amount_paid not provided, compute from installments
        if ((!inv || inv.amount_paid == null) && installments?.length) {
          const paidSum = installments.reduce((s, it) => s + (Number(it.paid_amount) || 0), 0)
          this.current.amountPaid = paidSum
        }
        // If total amount not set, derive from an amount_due entry if present
        if ((this.form.amountDue == null || this.form.amountDue === 0) && installments?.length) {
          const amtEntry = installments.find(it => it.entry_type === 'amount_due' && it.amount != null)
          if (amtEntry) this.form.amountDue = Number(amtEntry.amount)
        }
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب تفاصيل الفاتورة')
      } finally {
        this.loading = false
      }
    },
    addInstallment() {
      this.form.installments.push({ installmentNumber: this.form.installments.length + 1, plannedAmount: null, dueDate: '', initialPaidAmount: 0 })
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
    async submit() {
      // Build full update payload per new requirement
      const payload = {}

      if (this.form.studentId) payload.studentId = this.form.studentId
      if (this.form.paymentMode) payload.paymentMode = this.form.paymentMode
      if (this.form.invoiceType) payload.invoiceType = this.form.invoiceType
      if (this.form.amountDue != null && this.form.amountDue !== '') payload.amountDue = Number(this.form.amountDue)
      if (this.form.discountAmount != null && this.form.discountAmount !== '') payload.discountAmount = Number(this.form.discountAmount)

      if (this.form.invoiceDate === null) payload.invoiceDate = null
      else if (this.form.invoiceDate && this.form.invoiceDate.trim() !== '') payload.invoiceDate = this.form.invoiceDate

      if (this.form.dueDate === null) payload.dueDate = null
      else if (this.form.dueDate && this.form.dueDate.trim() !== '') payload.dueDate = this.form.dueDate

      if (this.form.notes === null) payload.notes = null
      else if (typeof this.form.notes === 'string' && this.form.notes.trim() !== '') payload.notes = this.form.notes.trim()

      if (Array.isArray(this.form.installments) && this.form.installments.length > 0) {
        const normalized = []
        for (const inst of this.form.installments) {
          if (inst && Number.isFinite(Number(inst.installmentNumber)) && Number.isFinite(Number(inst.plannedAmount)) && inst.dueDate) {
            const entry = {
              ...(inst._id ? { id: String(inst._id) } : {}),
              installmentNumber: Number(inst.installmentNumber),
              plannedAmount: Number(inst.plannedAmount),
              dueDate: inst.dueDate,
              ...(inst.notes ? { notes: String(inst.notes) } : {}),
              ...(inst.paidAmount != null && inst.paidAmount !== '' ? { paidAmount: Number(inst.paidAmount) } : {}),
            }
            if (inst.paid === true) {
              entry.is_paid = true
              if (inst.paidDate) entry.paidDate = inst.paidDate
            } else {
              entry.is_paid = false
            }
            normalized.push(entry)
          }
        }
        if (normalized.length > 0) payload.installments = normalized
      }

      if (Object.keys(payload).length === 0) return this.showAlert('error', 'لم يتم تحديد أي تعديل لإرساله')

      this.saving = true
      try {
        await TeacherApi.updateInvoice(this.invoiceId, payload)
        this.showAlert('success', 'تم تعديل الفاتورة بنجاح')
        this.$router.push({ name: 'teacher-invoices-manage-invoices' })
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر تعديل الفاتورة')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>
