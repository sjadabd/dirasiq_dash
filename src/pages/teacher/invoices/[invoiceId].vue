<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Summary -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-bill-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h6 font-weight-bold">تفاصيل الفاتورة</h3>
        <VSpacer />
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">المبلغ المستحق</div>
                <div class="text-h6">{{ numberWithComma(inv.amount_due) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">إجمالي الخصم</div>
                <div class="text-h6">{{ numberWithComma(inv.discount_total) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">المدفوع</div>
                <div class="text-h6">{{ numberWithComma(inv.amount_paid) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">المتبقي</div>
                <div class="text-h6">{{ numberWithComma(inv.remaining_amount) }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Entries -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-list-unordered" class="me-2" /> قيود الفاتورة
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VAlert v-if="entriesLoading" type="info" variant="tonal">جاري التحميل...</VAlert>
        <VAlert v-else-if="!entries.length" type="info" variant="tonal">لا توجد قيود مسجّلة</VAlert>
        <VTable v-else density="comfortable">
          <thead>
            <tr>
              <th>النوع</th>
              <th>المبلغ</th>
              <th>الطريقة</th>
              <th>رقم القسط</th>
              <th>التاريخ</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(e, idx) in entries" :key="idx">
              <td>{{ toArabicType(e.entry_type) }}</td>
              <td>{{ numberWithComma(e.amount) }}</td>
              <td>{{ e.payment_method || '-' }}</td>
              <td>{{ e.installment_number || '-' }}</td>
              <td>{{ formatDateTime(e.paid_at) }}</td>
              <td>{{ e.notes || '' }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <!-- Installments (optional) -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-calendar-schedule-line" class="me-2" /> الأقساط
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VAlert v-if="installmentsLoading" type="info" variant="tonal">جاري التحميل...</VAlert>
        <VAlert v-else-if="!installments.length" type="info" variant="tonal">لا يوجد أقساط</VAlert>
        <VTable v-else density="comfortable">
          <thead>
            <tr>
              <th>#</th>
              <th>المخطط</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>تاريخ الاستحقاق</th>
              <th>الحالة</th>
              <th>العمليات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ins, idx) in installments" :key="idx">
              <td>{{ ins.installment_number }}</td>
              <td>{{ numberWithComma(ins.planned_amount) }}</td>
              <td>{{ numberWithComma(ins.paid_amount) }}</td>
              <td>{{ numberWithComma(ins.remaining_amount) }}</td>
              <td>{{ formatDate(ins.due_date) }}</td>
              <td>
                <VChip :color="installmentStatusColor(ins.installment_status)" size="small" variant="flat">
                  {{ toArabicInstallmentStatus(ins.installment_status) }}
                </VChip>
              </td>
              <td>
                <VBtn
                  v-if="ins.installment_status !== 'paid' && Number(ins.remaining_amount) > 0"
                  size="small"
                  color="primary"
                  variant="tonal"
                  :loading="saving"
                  @click="payInstallment(ins)"
                >
                  تسديد
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <!-- Add Payment Dialog -->
    <v-dialog v-model="payDialog.open" max-width="520">
      <v-card title="إضافة دفعة">
        <v-card-text>
          <VRow>
            <VCol cols="12">
              <VTextField v-model.number="payDialog.form.amount" type="number" label="المبلغ" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VSelect v-model="payDialog.form.paymentMethod" :items="paymentMethods" item-title="text"
                item-value="value" label="طريقة الدفع" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="payDialog.form.paidAt" type="datetime-local" label="تاريخ الدفع"
                variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="payDialog.form.notes" label="ملاحظات" variant="outlined" />
            </VCol>
          </VRow>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="payDialog.open = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="saving" @click="handleAddPayment">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm Dialog -->
    <v-dialog v-model="deleteDialog.open" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center">
          <VIcon icon="ri-delete-bin-line" class="me-2" /> تأكيد الحذف
        </v-card-title>
        <v-card-text>
          سيتم حذف الفاتورة حذفًا منطقيًا (Soft Delete) مع أقساطها وقيودها. هل تريد المتابعة؟
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog.open = false">إلغاء</v-btn>
          <v-btn color="error" :loading="deleteDialog.loading" @click="handleSoftDelete">حذف</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Restore Confirm Dialog -->
    <v-dialog v-model="restoreDialog.open" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center">
          <VIcon icon="ri-refresh-line" class="me-2" /> تأكيد الاسترجاع
        </v-card-title>
        <v-card-text>
          سيتم استرجاع الفاتورة مع أقساطها وقيودها. هل تريد المتابعة؟
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="restoreDialog.open = false">إلغاء</v-btn>
          <v-btn color="success" :loading="restoreDialog.loading" @click="handleRestore">استرجاع</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api'
import numberWithComma from '@/constant/number'

export default {
  data() {
    return {
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'فواتير الطلاب', disabled: false, to: { name: 'teacher-invoices-manage-invoices' } },
        { title: 'التفاصيل', disabled: true },
      ],
      loading: false,
      progress: 0,
      saving: false,

      invoiceId: this.$route.params.invoiceId,
      inv: { id: '', amount_due: 0, discount_total: 0, amount_paid: 0, remaining_amount: 0, invoice_status: '', study_year: '', payment_mode: '' },

      entries: [],
      entriesLoading: false,

      installments: [],
      installmentsLoading: false,
      installmentIndex: {}, // { [installment_id]: installment_number }

      paymentMethods: [
        { text: 'نقد', value: 'cash' },
        { text: 'تحويل بنكي', value: 'bank_transfer' },
        { text: 'بطاقة', value: 'card' },
      ],

      payDialog: { open: false, form: { amount: null, paymentMethod: 'cash', installmentId: '', paidAt: '', notes: '' } },

      deleteDialog: { open: false, loading: false },
      restoreDialog: { open: false, loading: false },

      alert: { open: false, type: 'success', message: '' },
    }
  },
  created() {
    // Try to prefill from route state
    const stateInv = this.$route?.state || this.$router?.options?.history?.state?.data
    if (stateInv && typeof stateInv === 'object') {
      const picked = (({ id, amount_due, discount_total, amount_paid, remaining_amount, invoice_status, study_year, payment_mode }) => ({ id, amount_due, discount_total, amount_paid, remaining_amount, invoice_status, study_year, payment_mode }))(stateInv)
      this.inv = Object.assign(this.inv, picked)
    } else if (this.$route?.query) {
      const q = this.$route.query
      this.inv = Object.assign(this.inv, {
        id: q.id || this.invoiceId,
        amount_due: Number(q.amount_due) || 0,
        discount_total: Number(q.discount_total) || 0,
        amount_paid: Number(q.amount_paid) || 0,
        remaining_amount: Number(q.remaining_amount) || 0,
        invoice_status: q.invoice_status || '',
        study_year: q.study_year || '',
        payment_mode: q.payment_mode || '',
      })
    } else {
      this.inv.id = this.invoiceId
    }
  },
  mounted() {
    this.loadEntries()
    this.loadInstallments()
    this.loadReport()
  },
  methods: {
    numberWithComma,
    statusColor(s) {
      return s === 'paid' ? 'success' : s === 'partial' ? 'warning' : s === 'overdue' ? 'error' : 'secondary'
    },
    installmentStatusColor(s) {
      // statuses expected from API: paid, pending; optionally overdue, partial, cancelled
      if (s === 'paid') return 'success'
      if (s === 'pending') return 'warning'
      if (s === 'overdue') return 'error'
      if (s === 'partial') return 'warning'
      if (s === 'cancelled' || s === 'canceled') return 'secondary'
      return 'secondary'
    },
    toArabicInstallmentStatus(s) {
      if (s === 'paid') return 'مدفوع'
      if (s === 'pending') return 'قيد السداد'
      if (s === 'overdue') return 'متأخر'
      if (s === 'partial') return 'جزئي'
      if (s === 'cancelled' || s === 'canceled') return 'ملغي'
      return String(s || '')
    },
    async loadReport() {
      try {
        const res = await TeacherApi.getInvoiceEntriesReport(this.invoiceId)
        const rep = res?.data?.data
        if (rep) {
          // Coerce to numbers for uniform formatting in UI
          this.inv.amount_due = rep.amount_due != null ? Number(rep.amount_due) : this.inv.amount_due
          this.inv.discount_total = rep.discount_total != null ? Number(rep.discount_total) : this.inv.discount_total
          this.inv.amount_paid = rep.amount_paid != null ? Number(rep.amount_paid) : this.inv.amount_paid
          this.inv.remaining_amount = rep.remaining_amount != null ? Number(rep.remaining_amount) : this.inv.remaining_amount
        }
      } catch (e) {
        // report is optional; ignore 404 gracefully
        if (e?.response?.status !== 404) this.showAlert('error', e?.response?.data?.message || 'تعذر جلب تقرير الفاتورة')
      }
    },
    async handleSoftDelete() {
      this.deleteDialog.loading = true
      try {
        const res = await TeacherApi.softDeleteInvoice(this.invoiceId)
        this.showAlert('success', res?.data?.message || 'تم الحذف')
        this.deleteDialog.open = false
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر الحذف')
      } finally {
        this.deleteDialog.loading = false
      }
    },
    async handleRestore() {
      this.restoreDialog.loading = true
      try {
        const res = await TeacherApi.restoreInvoice(this.invoiceId)
        this.showAlert('success', res?.data?.message || 'تم الاسترجاع')
        this.restoreDialog.open = false
        await this.loadEntries()
        await this.loadInstallments()
        await this.loadReport()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر الاسترجاع')
      } finally {
        this.restoreDialog.loading = false
      }
    },
    toArabicType(t) {
      return t === 'payment' ? 'دفعة' : t === 'discount' ? 'خصم' : t === 'refund' ? 'مرتجع' : t === 'adjustment' ? 'تسوية' : String(t || '')
    },
    formatDate(d) {
      if (!d) return ''
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, '0')
      const mm = String(dt.getMonth() + 1).padStart(2, '0')
      const yyyy = dt.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    },
    formatDateTime(d) {
      if (!d) return ''
      const dt = new Date(d)
      return dt.toLocaleString()
    },
    async loadEntries() {
      this.entriesLoading = true
      try {
        const res = await TeacherApi.getInvoiceEntries(this.invoiceId)
        const raw = res?.data?.data || []
        // Coerce amounts to numbers and attach installment_number if known
        this.entries = raw.map(e => ({
          ...e,
          amount: e?.amount != null ? Number(e.amount) : e.amount,
          installment_number: e.installment_number || this.installmentIndex[e.installment_id] || null,
        }))
      } catch (e) {
        // optional endpoint: ignore 404
        if (e?.response?.status !== 404) this.showAlert('error', e?.response?.data?.message || 'تعذر جلب قيود الفاتورة')
      } finally {
        this.entriesLoading = false
      }
    },
    async loadInstallments() {
      this.installmentsLoading = true
      try {
        const res = await TeacherApi.getInvoiceInstallments(this.invoiceId)
        const list = res?.data?.data || []
        this.installments = list.map(i => ({
          ...i,
          planned_amount: i?.planned_amount != null ? Number(i.planned_amount) : i.planned_amount,
          paid_amount: i?.paid_amount != null ? Number(i.paid_amount) : i.paid_amount,
          remaining_amount: i?.remaining_amount != null ? Number(i.remaining_amount) : i.remaining_amount,
        }))
        // Build index map for quick lookup
        const idx = {}
        for (const ins of this.installments) idx[ins.id] = ins.installment_number
        this.installmentIndex = idx
        // Backfill entries with installment_number if they were loaded first
        if (this.entries?.length) {
          this.entries = this.entries.map(e => ({
            ...e,
            installment_number: e.installment_number || this.installmentIndex[e.installment_id] || null,
          }))
        }
      } catch (e) {
        if (e?.response?.status !== 404) this.showAlert('error', e?.response?.data?.message || 'تعذر جلب الأقساط')
      } finally {
        this.installmentsLoading = false
      }
    },
    openPayDialog() {
      this.payDialog.open = true
    },
    payInstallment(ins) {
      if (!ins) return
      // Prefill dialog with this installment's id and remaining amount
      const remaining = ins?.remaining_amount != null ? Number(ins.remaining_amount) : null
      this.payDialog.form = {
        amount: remaining && isFinite(remaining) ? remaining : this.payDialog.form.amount,
        paymentMethod: this.payDialog.form.paymentMethod || 'cash',
        installmentId: ins.id || '',
        // datetime-local expects 'YYYY-MM-DDTHH:MM'
        paidAt: this.payDialog.form.paidAt || new Date().toISOString().slice(0, 16),
        notes: this.payDialog.form.notes || ''
      }
      this.payDialog.open = true
    },
    openDeleteDialog() {
      this.deleteDialog.open = true
    },
    openRestoreDialog() {
      this.restoreDialog.open = true
    },
    async handleAddPayment() {
      if (!this.payDialog.form.amount) {
        this.showAlert('error', 'الرجاء إدخال مبلغ صحيح')
        return
      }
      this.saving = true
      try {
        const payload = {
          amount: Number(this.payDialog.form.amount),
          paymentMethod: this.payDialog.form.paymentMethod,
          installmentId: this.payDialog.form.installmentId || undefined,
          paidAt: this.payDialog.form.paidAt || undefined,
          notes: this.payDialog.form.notes || undefined,
        }
        const res = await TeacherApi.addInvoicePayment(this.invoiceId, payload)
        this.showAlert('success', res?.data?.message || 'تمت إضافة الدفعة')
        this.payDialog.open = false
        this.payDialog.form = { amount: null, paymentMethod: 'cash', installmentId: '', paidAt: '', notes: '' }
        await this.loadEntries()
        await this.loadInstallments()
        await this.loadReport()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر إضافة الدفعة')
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
