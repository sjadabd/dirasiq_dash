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
          <VBtn color="primary" class="ma-2" prepend-icon="ri-add-line" rounded="pill" elevation="2" size="default" @click="openAdd">
            إضافة مصروف
          </VBtn>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px">
          <VCol cols="12" md="3">
            <VSelect v-model="filters.studyYear" @update:model-value="applyFilters" :items="studyYears" item-title="label" item-value="value" label="السنة الدراسية" variant="outlined" :loading="yearsLoading" />
          </VCol>
          <VCol cols="12" md="3">
            <AppDateTimePicker v-model="filters.from" clearable @update:model-value="applyFilters" label="من تاريخ" variant="outlined" />
          </VCol>
          <VCol cols="12" md="3">
            <AppDateTimePicker v-model="filters.to" clearable @update:model-value="applyFilters" label="إلى تاريخ" variant="outlined" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Data Table Card -->
    <VCard class="my-4 data-table-card" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small" class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">المصاريف</h3>
          </VCol>
          <VCol cols="auto">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ Number(total).toLocaleString() }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="mb-2">
          <VCol cols="12" md="4">
            <VAlert type="info" variant="tonal">
              <div class="d-flex align-center ga-4">
                <span>إجمالي المصاريف في الفترة:</span>
                <strong>{{ Number(summary.totalAmount || 0).toLocaleString() }}</strong>
              </div>
            </VAlert>
          </VCol>
        </VRow>

        <VDataTable :items="items" :headers="headers" :items-per-page="tableOptions.limit" :page.sync="tableOptions.page" :loading="tableLoading" class="elevation-1" @update:page="onPageChange" @update:items-per-page="onLimitChange">
          <template #item.expense_date="{ item }">
            {{ formatDate(item.expense_date) }}
          </template>
          <template #item.amount="{ item }">
            {{ Number(item.amount).toLocaleString() }}
          </template>
          <template #item.actions="{ item }">
            <VBtn icon variant="text" size="small" @click="openEdit(item)">
              <VIcon icon="ri-edit-line" />
            </VBtn>
            <VBtn icon color="error" variant="text" size="small" @click="confirmDelete(item)">
              <VIcon icon="ri-delete-bin-line" />
            </VBtn>
          </template>
        </VDataTable>

        <div class="d-flex justify-end mt-2">
          <VPagination v-model="tableOptions.page" :length="totalPages" @update:model-value="fetchExpenses" />
        </div>
      </VCardItem>
    </VCard>

    <!-- Add/Edit Dialog -->
    <VDialog v-model="dialog.open" max-width="600px" persistent>
      <VCard>
        <VCardTitle class="py-4 px-6 d-flex align-center">
          <VIcon icon="ri-pencil-line" class="me-2" />
          <span>{{ dialog.mode === 'add' ? 'إضافة مصروف' : 'تعديل مصروف' }}</span>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField :model-value="formatMoney(form.amount)" @update:model-value="v => onFormatMoney('amount', v)" label="المبلغ" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <AppDateTimePicker v-model="form.expense_date" label="تاريخ المصروف" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="form.note" label="ملاحظة" variant="outlined" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="px-6 pb-4">
          <VSpacer />
          <VBtn variant="outlined" @click="closeDialog">إلغاء</VBtn>
          <VBtn color="primary" :loading="saving" @click="submitDialog">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ConfirmDangerDialog -->
    <ConfirmDangerDialog v-if="deleteDialog.open" v-model="deleteDialog.open" :messages="deleteDialog.messages" :title="deleteDialog.title" :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete" />

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true" close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api'
import ConfirmDangerDialog from '@/components/ConfirmDangerDialog.vue'

export default {
  data() {
    return {
      keyName: 'manage-expenses',
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'المصاريف', disabled: true },
      ],
      loading: false,
      progress: 0,
      alert: { open: false, type: 'success', message: '' },

      // filters and table
      studyYears: [],
      yearsLoading: false,
      filters: { studyYear: '', from: null, to: null },
      tableOptions: { page: 1, limit: 10 },
      headers: [
        { title: 'التاريخ', key: 'expense_date' },
        { title: 'المبلغ', key: 'amount' },
        { title: 'ملاحظة', key: 'note' },
        { title: 'إجراءات', key: 'actions', sortable: false },
      ],
      items: [],
      tableLoading: false,
      total: 0,
      summary: { totalAmount: 0 },

      // dialog
      dialog: { open: false, mode: 'add', currentId: null },
      form: { amount: null, expense_date: null, note: '' },
      saving: false,

      // delete dialog
      deleteDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null },
    }
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.tableOptions.limit))
    }
  },
  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName))
    if (stored?.filters) this.filters = { ...this.filters, ...stored.filters }
    if (stored?.tableOptions) this.tableOptions = { ...this.tableOptions, ...stored.tableOptions }
    this.loadAcademicYears()
  },
  mounted() {
    this.fetchExpenses()
  },
  methods: {
    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
    },
    formatDate(val) {
      if (!val) return ''
      const d = new Date(val)
      if (!isNaN(d)) return d.toISOString().slice(0, 10)
      return String(val).slice(0, 10)
    },
    formatMoney(val) {
      if (val === '' || val === null || typeof val === 'undefined') return ''
      const num = Number(val)
      if (!isFinite(num)) return String(val)
      return num.toLocaleString()
    },
    parseMoney(val) {
      if (val === '' || val === null || typeof val === 'undefined') return null
      const cleaned = String(val).replace(/[^0-9.-]/g, '')
      const num = Number(cleaned)
      return isFinite(num) ? num : null
    },
    onFormatMoney(field, val) {
      const num = this.parseMoney(val)
      this.form[field] = num
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
        // noop
      } finally {
        this.yearsLoading = false
      }
    },
    async fetchExpenses() {
      try {
        this.tableLoading = true
        // persist current state
        localStorage.setItem(this.keyName, JSON.stringify({ filters: this.filters, tableOptions: this.tableOptions }))
        const params = {
          page: this.tableOptions.page,
          limit: this.tableOptions.limit,
          studyYear: this.filters.studyYear || undefined,
          from: this.filters.from || undefined,
          to: this.filters.to || undefined,
        }
        const res = await TeacherApi.getExpenses(params)
        const data = res?.data || {}
        this.items = Array.isArray(data.data) ? data.data : []
        const pagination = data.pagination || {}
        this.total = pagination.total || this.items.length
        this.summary = data.summary || { totalAmount: 0 }
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب المصاريف')
      } finally {
        this.tableLoading = false
      }
    },
    reload() { this.tableOptions = { page: 1, limit: 10 }; this.fetchExpenses() },
    onPageChange(p) { this.tableOptions.page = p; this.fetchExpenses() },
    onLimitChange(l) { this.tableOptions.limit = l; this.tableOptions.page = 1; this.fetchExpenses() },
    applyFilters() { this.tableOptions.page = 1; this.fetchExpenses() },
    resetFilters() { this.filters = { studyYear: this.filters.studyYear || '', from: null, to: null }; this.applyFilters() },

    openAdd() {
      this.dialog = { open: true, mode: 'add', currentId: null }
      this.form = { amount: null, expense_date: null, note: '' }
    },
    openEdit(item) {
      this.dialog = { open: true, mode: 'edit', currentId: item.id }
      this.form = {
        amount: item.amount != null ? Number(item.amount) : null,
        expense_date: item.expense_date ? String(item.expense_date).slice(0, 10) : null,
        note: item.note || ''
      }
    },
    closeDialog() {
      this.dialog.open = false
    },
    async submitDialog() {
      // validate
      const amt = this.form.amount != null ? Number(this.form.amount) : null
      if (!(amt > 0) || !this.form.expense_date) return this.showAlert('error', 'يرجى إدخال مبلغ صحيح وتاريخ المصروف')

      this.saving = true
      try {
        if (this.dialog.mode === 'add') {
          const payload = { amount: amt, note: this.form.note || undefined, expense_date: this.form.expense_date }
          await TeacherApi.addExpense(payload)
          this.showAlert('success', 'تمت إضافة المصروف')
        } else {
          const payload = {}
          if (this.form.amount != null) payload.amount = amt
          if (typeof this.form.note === 'string') payload.note = this.form.note
          if (this.form.expense_date) payload.expense_date = this.form.expense_date
          await TeacherApi.updateExpense(this.dialog.currentId, payload)
          this.showAlert('success', 'تم تعديل المصروف')
        }
        this.dialog.open = false
        this.fetchExpenses()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر حفظ المصروف')
      } finally {
        this.saving = false
      }
    },
    confirmDelete(item) {
      this.deleteDialog.data = item
      this.deleteDialog.messages = [ 'سيتم حذف المصروف.', 'لا يمكن التراجع عن هذه العملية.' ]
      this.deleteDialog.title = 'تأكيد الحذف'
      this.deleteDialog.confirmButtonText = 'حذف'
      this.deleteDialog.open = true
    },
    async handleDelete() {
      try {
        await TeacherApi.deleteExpense(this.deleteDialog.data.id)
        this.showAlert('success', 'تم الحذف')
        this.fetchExpenses()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر الحذف')
      } finally {
        this.deleteDialog.open = false
      }
    }
  }
}
</script>
