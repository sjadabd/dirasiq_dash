<template>
  <div>
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

    <!-- Totals (from full endpoint) -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-pie-chart-2-line" class="me-2" /> إحصائيات الفاتورة
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="2">
            <VAlert variant="tonal" type="info">عدد الأقساط: {{ totals.count }}</VAlert>
          </VCol>
          <VCol cols="12" md="2">
            <VAlert variant="tonal" type="success">مدفوعة: {{ totals.paidCount }}</VAlert>
          </VCol>
          <VCol cols="12" md="2">
            <VAlert variant="tonal" type="warning">قيد السداد: {{ totals.pendingCount }}</VAlert>
          </VCol>
          <VCol cols="12" md="2">
            <VAlert variant="tonal" type="warning">جزئية: {{ totals.partialCount }}</VAlert>
          </VCol>
          <VCol cols="12" md="2">
            <VAlert variant="tonal" type="error">متأخرة: {{ totals.overdueCount }}</VAlert>
          </VCol>
        </VRow>
        <VRow class="mt-2">
          <VCol cols="12" md="4">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">مجموع المخطط</div>
                <div class="text-h6">{{ numberWithComma(totals.plannedTotal) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">مجموع المدفوع</div>
                <div class="text-h6">{{ numberWithComma(totals.paidTotal) }}</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="tonal">
              <VCardText>
                <div class="text-caption">مجموع المتبقي</div>
                <div class="text-h6">{{ numberWithComma(totals.remainingTotal) }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
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
              <td :data-label="'#'">{{ ins.installment_number }}</td>
              <td :data-label="'المخطط'">{{ numberWithComma(ins.planned_amount) }}</td>
              <td :data-label="'المدفوع'">{{ numberWithComma(ins.paid_amount) }}</td>
              <td :data-label="'المتبقي'">{{ numberWithComma(ins.remaining_amount) }}</td>
              <td :data-label="'تاريخ الاستحقاق'">{{ formatDate(ins.due_date) }}</td>
              <td :data-label="'الحالة'">
                <VChip :color="installmentStatusColor(ins.installment_status)" size="small" variant="flat">
                  {{ toArabicInstallmentStatus(ins.installment_status) }}
                </VChip>
              </td>
              <td :data-label="'العمليات'">
                <VBtn v-if="ins.installment_status !== 'paid' && Number(ins.remaining_amount) > 0" size="small"
                  color="primary" variant="tonal" :loading="saving" @click="payInstallment(ins)">
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
      <v-card title="تسديد الدفعة">
        <v-card-text>
          <VRow>
            <VCol cols="12">
              <VTextField v-model.number="payDialog.form.amount" type="number" label="المبلغ" variant="outlined"
                :disabled="true" />
            </VCol>
            <VCol cols="12">
              <VSelect v-model="payDialog.form.paymentMethod" :items="paymentMethods" item-title="text"
                item-value="value" label="طريقة الدفع" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="payDialog.form.paidAt" type="date" label="تاريخ الدفع" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="payDialog.form.notes" label="ملاحظات" variant="outlined" />
            </VCol>
          </VRow>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="payDialog.open = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="saving" @click="handleAddPayment">تسديد</v-btn>
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
import TeacherApi from '@/api/teacher/teacher_api';
import numberWithComma from '@/constant/number';

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
      totals: { count: 0, paidCount: 0, partialCount: 0, pendingCount: 0, overdueCount: 0, plannedTotal: 0, paidTotal: 0, remainingTotal: 0 },

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
    this.loadFull()
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
    async loadFull() {
      try {
        this.loading = true
        const res = await TeacherApi.getInvoiceFull(this.invoiceId)
        const data = res?.data?.data || {}
        const inv = data.invoice || {}
        const installments = Array.isArray(data.installments) ? data.installments : []
        const totals = data.totals || {}

        // Map invoice summary
        this.inv.amount_due = inv.amount_due != null ? Number(inv.amount_due) : 0
        this.inv.discount_total = inv.discount_total != null ? Number(inv.discount_total) : 0
        this.inv.amount_paid = inv.amount_paid != null ? Number(inv.amount_paid) : 0
        this.inv.remaining_amount = inv.remaining_amount != null ? Number(inv.remaining_amount) : 0
        this.inv.study_year = inv.study_year || this.inv.study_year
        this.inv.payment_mode = inv.payment_mode || this.inv.payment_mode
        this.inv.invoice_type = inv.invoice_type || this.inv.invoice_type

        // Map installments
        this.installments = installments.map(i => ({
          ...i,
          planned_amount: i?.planned_amount != null ? Number(i.planned_amount) : i.planned_amount,
          paid_amount: i?.paid_amount != null ? Number(i.paid_amount) : i.paid_amount,
          remaining_amount: i?.remaining_amount != null ? Number(i.remaining_amount) : i.remaining_amount,
        }))

        // Map totals
        this.totals = {
          count: totals.count ?? 0,
          paidCount: totals.paidCount ?? 0,
          partialCount: totals.partialCount ?? 0,
          pendingCount: totals.pendingCount ?? 0,
          overdueCount: totals.overdueCount ?? 0,
          plannedTotal: totals.plannedTotal ?? 0,
          paidTotal: totals.paidTotal ?? 0,
          remainingTotal: totals.remainingTotal ?? 0,
        }
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب تفاصيل الفاتورة')
      } finally {
        this.loading = false
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
        await this.loadFull()
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
        // date input expects 'YYYY-MM-DD'
        paidAt: this.payDialog.form.paidAt || new Date().toISOString().slice(0, 10),
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
        await this.loadFull()
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

<style scoped>
/* ⚡ تصميم الجدول ليصبح Responsive في الشاشات الصغيرة */
@media (max-width: 768px) {

  .v-table table,
  .v-table thead,
  .v-table tbody,
  .v-table th,
  .v-table td,
  .v-table tr {
    display: block;
    inline-size: 100%;
  }

  /* إخفاء رؤوس الجدول */
  .v-table thead {
    display: none;
  }

  /* تحويل الصف إلى بطاقة */
  .v-table tr {
    border-radius: 10px;
    background-color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 8%);
    margin-block-end: 12px;
    padding-block: 8px;
    padding-inline: 10px;
  }

  /* تنسيق الخلايا داخل البطاقة */
  .v-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: none !important;
    border-block-end: 1px solid rgba(0, 0, 0, 5%) !important;
    padding-block: 10px;
    padding-inline: 8px;
  }

  /* عرض اسم العمود من data-label */
  .v-table td::before {
    flex: 1;
    color: var(--v-theme-primary);
    content: attr(data-label);
    font-weight: 600;
    text-align: start;
  }

  /* إزالة الخط السفلي عن آخر عنصر */
  .v-table td:last-child {
    border-block-end: none !important;
  }

  /* تصغير الخط قليلاً */
  .v-table td {
    font-size: 13px;
  }

  /* الأزرار داخل الموبايل */
  .v-table td .v-btn {
    block-size: 28px;
    font-size: 12px;
    padding-inline: 10px;
  }
}
</style>
