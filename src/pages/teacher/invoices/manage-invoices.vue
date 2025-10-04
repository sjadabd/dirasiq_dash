<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Filters -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-filter-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h6 font-weight-bold">تصفية</h3>
        <VSpacer />
        <RouterLink :to="{ name: 'teacher-invoices-create-invoice' }">
          <VBtn color="primary" prepend-icon="ri-add-line">إنشاء فاتورة</VBtn>
        </RouterLink>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3">
          <VCol cols="12" md="4">
            <VSelect v-model="filters.studyYear" :items="studyYears" item-title="label" item-value="value"
              label="السنة الدراسية" variant="outlined" @update:model-value="fetchInvoices" />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="filters.status" :items="statusItems" item-title="text" item-value="value"
              label="حالة الفاتورة" variant="outlined" @update:model-value="fetchInvoices" />
          </VCol>
          <VCol cols="12" md="4" class="d-flex align-center">
            <VSwitch v-model="filters.deleted" inset color="error" :true-value="true" :false-value="false"
              label="عرض المحذوف فقط" @update:model-value="fetchInvoices" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Invoices Table -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <h3 class="text-h6 font-weight-bold">فواتير الطلاب</h3>
        <VSpacer />
        <VChip color="primary" variant="elevated">{{ numberWithComma(totalItems) }} سجل</VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable :headers="headers" :items="items" :actions="tableActions" :loading="loadingTable"
          :totalItems="totalItems" :tableOptions="tableOptions" @updateTableOptions="onUpdateTableOptions"
          @editItem="openAddPayment" @updateResponseItem="openAddDiscount" @deleteItem="openDeleteDialog"
          @enableItem="openRestoreDialog" @showItem="goToProfile" />
      </VCardItem>
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
              <VTextField v-model="payDialog.form.installmentId" label="معرّف القسط (اختياري)" variant="outlined" />
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

    <!-- Delete Confirm Dialog -->
    <v-dialog v-model="deleteDialog.open" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center">
          <VIcon icon="ri-delete-bin-line" class="me-2" /> تأكيد الحذف
        </v-card-title>
        <v-card-text>
          سيتم حذف الفاتورة حذفًا منطقيًا (Soft Delete). هل تريد المتابعة؟
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog.open = false">إلغاء</v-btn>
          <v-btn color="error" :loading="deleteDialog.loading" @click="handleDelete">حذف</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Discount Dialog -->
    <v-dialog v-model="discDialog.open" max-width="520">
      <v-card title="إضافة خصم">
        <v-card-text>
          <VRow>
            <VCol cols="12">
              <VTextField v-model.number="discDialog.form.amount" type="number" label="المبلغ" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="discDialog.form.notes" label="ملاحظات" variant="outlined" />
            </VCol>
          </VRow>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="discDialog.open = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="saving" @click="handleAddDiscount">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Alerts -->
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
        { title: 'فواتير الطلاب', disabled: true },
      ],
      progress: 0,
      loading: false,

      // filters
      studyYears: this.buildStudyYears(),
      filters: {
        studyYear: JSON.parse(localStorage.getItem('studyYear')) || '',
        status: '',
        deleted: false,
      },
      statusItems: [
        { text: 'الكل', value: '' },
        { text: 'مدفوعة', value: 'paid' },
        { text: 'غير مدفوعة', value: 'unpaid' },
        { text: 'جزئية', value: 'partial' },
        { text: 'متأخرة', value: 'overdue' },
      ],

      // table
      headers: [
        { title: '#', type: 'strong', sortable: false, key: 'num' },
        { title: 'طريقة الدفع', type: 'link', sortable: true, key: 'payment_mode' },
        { title: 'المبلغ المستحق', type: 'number', sortable: true, key: 'amount_due' },
        { title: 'إجمالي الخصومات', type: 'number', sortable: true, key: 'discount_total' },
        { title: 'المدفوع', type: 'number', sortable: true, key: 'amount_paid' },
        { title: 'المتبقي', type: 'number', sortable: true, key: 'remaining_amount' },
        { title: 'الحالة', type: 'status', sortable: true, key: 'invoice_status' },
        { title: 'العمليات', type: 'strong', sortable: false, key: 'actions' },
      ],
      items: [],
      tableActions: ['تعديل', 'تحديث رد', 'حذف', 'اعادة تفعيل'],
      loadingTable: false,
      totalItems: 0,
      tableOptions: { page: 1, limit: 10, search: null },

      // dialogs
      payDialog: { open: false, invoiceId: null, form: { amount: null, paymentMethod: 'cash', installmentId: '', paidAt: '', notes: '' } },
      discDialog: { open: false, invoiceId: null, form: { amount: null, notes: '' } },
      paymentMethods: [
        { text: 'نقد', value: 'cash' },
        { text: 'تحويل بنكي', value: 'bank_transfer' },
        { text: 'بطاقة', value: 'card' },
      ],

      saving: false,
      deleteDialog: { open: false, loading: false, id: null },
      restoreDialog: { open: false, loading: false, id: null },
      alert: { open: false, type: 'success', message: '' },
    }
  },
  mounted() {
    this.fetchInvoices()
  },
  methods: {
    numberWithComma,
    buildStudyYears() {
      const current = new Date().getFullYear()
      const list = []
      for (let y = current - 1; y <= current + 1; y++) list.push({ label: `${y}-${y + 1}`, value: `${y}-${y + 1}` })
      return list
    },
    goToProfile(item) {
      const id = item?.id
      if (!id) return
      // pass current row data as state for instant display (Vue Router v4 supports state)
      this.$router.push({ path: `/teacher/invoices/${id}`, state: item })
    },
    async fetchInvoices() {
      this.loadingTable = true
      try {
        const params = {
          studyYear: this.filters.studyYear,
          status: this.filters.status,
          page: this.tableOptions.page,
          limit: this.tableOptions.limit,
        }
        if (this.filters.deleted === true) params.deleted = true
        const { data } = await TeacherApi.listInvoices(params)
        const list = data?.data || []
        this.totalItems = list.length
        this.items = list.map((it, idx) => ({
          ...it,
          num: (this.tableOptions.page - 1) * this.tableOptions.limit + idx + 1,
          detailsText: 'تفاصيل',
          detailsLink: `/teacher/invoices/${it.id}`,
          // Ensure SmartTable knows deletion state
          is_deleted: typeof it.is_deleted !== 'undefined' ? it.is_deleted : Boolean(it.deleted_at),
        }))
        // keep actions list inclusive; SmartTable will auto-hide/show per row based on is_deleted
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب الفواتير')
      } finally {
        this.loadingTable = false
      }
    },
    onUpdateTableOptions(newOptions) {
      this.tableOptions = { ...this.tableOptions, ...newOptions }
      this.fetchInvoices()
    },
    openAddPayment(item) {
      this.payDialog.invoiceId = item.id
      this.payDialog.form = { amount: null, paymentMethod: 'cash', installmentId: '', paidAt: '', notes: '' }
      this.payDialog.open = true
    },
    async handleAddPayment() {
      if (!this.payDialog.invoiceId || !this.payDialog.form.amount) {
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
          studyYear: this.filters.studyYear || undefined,
        }
        await TeacherApi.addInvoicePayment(this.payDialog.invoiceId, payload)
        this.showAlert('success', 'تمت إضافة الدفعة')
        this.payDialog.open = false
        this.fetchInvoices()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر إضافة الدفعة')
      } finally {
        this.saving = false
      }
    },
    openAddDiscount(item) {
      this.discDialog.invoiceId = item.id
      this.discDialog.form = { amount: null, notes: '' }
      this.discDialog.open = true
    },
    openDeleteDialog(item) {
      this.deleteDialog.id = item?.id || null
      this.deleteDialog.open = !!this.deleteDialog.id
    },
    openRestoreDialog(item) {
      this.restoreDialog.id = item?.id || null
      this.restoreDialog.open = !!this.restoreDialog.id
    },
    async handleDelete() {
      if (!this.deleteDialog.id) return
      this.deleteDialog.loading = true
      try {
        const res = await TeacherApi.softDeleteInvoice(this.deleteDialog.id)
        this.showAlert('success', res?.data?.message || 'تم الحذف')
        this.deleteDialog.open = false
        this.fetchInvoices()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر الحذف')
      } finally {
        this.deleteDialog.loading = false
      }
    },
    async handleRestore() {
      if (!this.restoreDialog.id) return
      this.restoreDialog.loading = true
      try {
        const res = await TeacherApi.restoreInvoice(this.restoreDialog.id)
        this.showAlert('success', res?.data?.message || 'تم الاسترجاع')
        this.restoreDialog.open = false
        this.fetchInvoices()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر الاسترجاع')
      } finally {
        this.restoreDialog.loading = false
      }
    },
    async handleAddDiscount() {
      if (!this.discDialog.invoiceId || !this.discDialog.form.amount) {
        this.showAlert('error', 'الرجاء إدخال مبلغ صحيح')
        return
      }
      this.saving = true
      try {
        const payload = {
          amount: Number(this.discDialog.form.amount),
          notes: this.discDialog.form.notes || undefined,
          studyYear: this.filters.studyYear || undefined,
        }
        await TeacherApi.addInvoiceDiscount(this.discDialog.invoiceId, payload)
        this.showAlert('success', 'تمت إضافة الخصم')
        this.discDialog.open = false
        this.fetchInvoices()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر إضافة الخصم')
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
