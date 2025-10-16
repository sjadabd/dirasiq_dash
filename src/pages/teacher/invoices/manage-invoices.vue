<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Invoices Summary Report -->
    <br />
    <ReportInvoices :report="report" />
    <!-- Operations Card -->
    <VCard class="my-4 operations-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-cog-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">العمليات</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="align-center justify-start pa-2">
          <RouterLink :to="{ name: 'teacher-invoices-create-invoice' }">
            <VBtn color="primary" prepend-icon="ri-add-line">إنشاء فاتورة</VBtn>
          </RouterLink>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Operations Card -->

    <!-- Filters -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-filter-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h6 font-weight-bold">تصفية</h3>
        <VSpacer />
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3">
          <VCol cols="12" md="4">
            <VSelect v-model="filters.studyYear" :items="studyYears" item-title="label" item-value="value"
              label="السنة الدراسية" variant="outlined" :loading="yearsLoading" @update:model-value="fetchInvoices" />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="filters.status" :items="statusItems" item-title="text" item-value="value"
              label="حالة الفاتورة" variant="outlined" @update:model-value="fetchInvoices" />
          </VCol>
          <VCol cols="12" md="4" class="d-flex align-center">
            <VSelect v-model="filters.deleted" :items="deletedItems" item-title="text" item-value="value"
              label="حالة حذف الفاتورة" variant="outlined" @update:model-value="fetchInvoices" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Invoices Table -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small"
              class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">فواتير الطلاب</h3>
          </VCol>
          <VCol cols="auto" class="d-flex gap-2">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ numberWithComma(totalItems) }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable :headers="headers" :items="items" :actions="tableActions" :loading="loadingTable"
          :totalItems="totalItems" :tableOptions="tableOptions" @updateTableOptions="onUpdateTableOptions"
          @editItem="openEditInvoice" @updateResponseItem="openAddDiscount" @deleteItem="openDeleteDialog"
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
    <ConfirmDangerDialog v-if="restoreDialog.open" v-model="restoreDialog.open" :messages="restoreDialog.messages"
      :title="restoreDialog.title" :confirmButtonText="restoreDialog.confirmButtonText"
      :checkboxLabel="restoreDialog.checkboxLabel" @confirm="handleRestore" />

    <!-- Delete Confirm Dialog -->
    <ConfirmDangerDialog v-if="deleteDialog.open" v-model="deleteDialog.open" :messages="deleteDialog.messages"
      :title="deleteDialog.title" :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete" />

    <!-- Edit Invoice Dialog -->
    <v-dialog v-model="editDialog.open" max-width="520">
      <v-card title="تعديل الفاتورة">
        <v-card-text>
          <VRow>
            <VCol cols="12">
              <VTextField v-model="editDialog.form.dueDate" type="date" label="تاريخ الاستحقاق" variant="outlined"
                hint="اتركه فارغًا لإبقاءه كما هو، أو احذف القيمة (null) من زر أدناه" persistent-hint />
              <VBtn variant="text" size="small" @click="editDialog.form.dueDate = null">إزالة التاريخ (null)</VBtn>
            </VCol>

            <VCol cols="12">
              <VTextField v-model="editDialog.form.notes" label="ملاحظات" variant="outlined"
                hint="اتركه فارغًا لإبقاءه كما هو، أو اضغط إزالة لمسح القيمة (null)" persistent-hint />
              <VBtn variant="text" size="small" @click="editDialog.form.notes = null">إزالة الملاحظات (null)</VBtn>
            </VCol>

            <VCol cols="12">
              <VSelect v-model="editDialog.form.invoiceType" :items="[
                { text: 'عربون حجز', value: 'reservation' },
                { text: 'كورس', value: 'course' },
                { text: 'قسط', value: 'installment' },
                { text: 'غرامة', value: 'penalty' },
              ]" item-title="text" item-value="value" label="نوع الفاتورة" variant="outlined" clearable />
            </VCol>

            <VCol cols="12">
              <VSelect v-model="editDialog.form.paymentMode" :items="[
                { text: 'كاش', value: 'cash' },
                { text: 'أقساط', value: 'installments' },
              ]" item-title="text" item-value="value" label="طريقة الدفع" variant="outlined" clearable />
            </VCol>

            <VCol cols="12">
              <VTextField v-model.number="editDialog.form.amountDue" type="number" label="المبلغ المستحق"
                variant="outlined" hint="يجب ألا يقل عن مجموع (المدفوع + الخصومات) الحالية" persistent-hint />
            </VCol>
          </VRow>

          <!-- Installments Builder -->
          <VCard variant="tonal" class="mt-4">
            <VCardTitle class="d-flex align-center">
              <VIcon icon="ri-calendar-schedule-line" class="me-2" /> خطة الأقساط (اختياري)
              <VSpacer />
              <VBtn size="small" variant="tonal" prepend-icon="ri-add-line" @click="addEditInstallment">إضافة قسط</VBtn>
            </VCardTitle>
            <VDivider />
            <VCardText>
              <VAlert v-if="!editDialog.form.installments.length" type="info" variant="tonal">لا يوجد أقساط</VAlert>
              <VRow v-for="(ins, idx) in editDialog.form.installments" :key="idx" class="mb-1">
                <VCol cols="12" md="2">
                  <VTextField v-model.number="ins.installmentNumber" type="number" label="# القسط" variant="outlined" />
                </VCol>
                <VCol cols="12" md="3">
                  <VTextField v-model.number="ins.plannedAmount" type="number" label="المبلغ المخطط"
                    variant="outlined" />
                </VCol>
                <VCol cols="12" md="3">
                  <VTextField v-model="ins.dueDate" type="date" label="تاريخ الاستحقاق" variant="outlined" />
                </VCol>
                <VCol cols="12" md="3">
                  <VTextField v-model.number="ins.initialPaidAmount" type="number" label="مدفوع ابتدائي"
                    variant="outlined" />
                </VCol>
                <VCol cols="12" md="1" class="d-flex align-center">
                  <VBtn color="error" size="small" icon="ri-delete-bin-line" variant="text"
                    @click="removeEditInstallment(idx)" />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Payments Builder -->
          <VCard variant="tonal" class="mt-4">
            <VCardTitle class="d-flex align-center">
              <VIcon icon="ri-money-dollar-circle-line" class="me-2" /> دفعات إضافية (اختياري)
              <VSpacer />
              <VBtn size="small" variant="tonal" prepend-icon="ri-add-line" @click="addEditPayment">إضافة دفعة</VBtn>
            </VCardTitle>
            <VDivider />
            <VCardText>
              <VAlert v-if="!editDialog.form.payments.length" type="info" variant="tonal">لا يوجد دفعات</VAlert>
              <VRow v-for="(p, idx) in editDialog.form.payments" :key="idx" class="mb-1">
                <VCol cols="12" md="3">
                  <VTextField v-model.number="p.amount" type="number" label="المبلغ" variant="outlined" />
                </VCol>
                <VCol cols="12" md="3">
                  <VSelect v-model="p.paymentMethod" :items="paymentMethods" item-title="text" item-value="value"
                    label="طريقة الدفع" variant="outlined" />
                </VCol>
                <VCol cols="12" md="3">
                  <VTextField v-model="p.paidAt" type="datetime-local" label="تاريخ الدفع" variant="outlined" />
                </VCol>
                <VCol cols="12" md="2">
                  <VTextField v-model.number="p.installmentNumber" type="number" label="# القسط (اختياري)"
                    variant="outlined" />
                </VCol>
                <VCol cols="12" md="1" class="d-flex align-center">
                  <VBtn color="error" size="small" icon="ri-delete-bin-line" variant="text"
                    @click="removeEditPayment(idx)" />
                </VCol>
                <VCol cols="12">
                  <VTextField v-model="p.notes" label="ملاحظات" variant="outlined" />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Additional Discounts Builder -->
          <VCard variant="tonal" class="mt-4">
            <VCardTitle class="d-flex align-center">
              <VIcon icon="ri-price-tag-3-line" class="me-2" /> خصومات إضافية (اختياري)
              <VSpacer />
              <VBtn size="small" variant="tonal" prepend-icon="ri-add-line" @click="addEditAdditionalDiscount">إضافة خصم
              </VBtn>
            </VCardTitle>
            <VDivider />
            <VCardText>
              <VAlert v-if="!editDialog.form.additionalDiscounts.length" type="info" variant="tonal">لا يوجد خصومات
              </VAlert>
              <VRow v-for="(d, idx) in editDialog.form.additionalDiscounts" :key="idx" class="mb-1">
                <VCol cols="12" md="4">
                  <VTextField v-model.number="d.amount" type="number" label="المبلغ" variant="outlined" />
                </VCol>
                <VCol cols="12" md="7">
                  <VTextField v-model="d.notes" label="ملاحظات" variant="outlined" />
                </VCol>
                <VCol cols="12" md="1" class="d-flex align-center">
                  <VBtn color="error" size="small" icon="ri-delete-bin-line" variant="text"
                    @click="removeEditAdditionalDiscount(idx)" />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </v-card-text>

        <v-card-actions>
          <v-btn variant="text" @click="editDialog.open = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="saving" @click="handleUpdateInvoice">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Alerts -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';
import ConfirmDangerDialog from '@/components/ConfirmDangerDialog.vue';
import ReportInvoices from '@/components/teacher/report-invoices.vue';
import numberWithComma from '@/constant/number';

export default {
  components: {
    ReportInvoices,
    ConfirmDangerDialog,
  },
  data() {
    return {
      keyName: 'teacher-manage-invoices',
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'فواتير الطلاب', disabled: true },
      ],
      progress: 0,
      loading: false,

      // filters
      studyYears: [],
      yearsLoading: false,
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

      deletedItems: [
        { text: 'محذوف', value: true },
        { text: 'غير محذوف', value: false },
      ],
      report: {},

      // داخل data()
      editDialog: {
        open: false,
        invoiceId: null,
        current: { amountPaid: 0, totalDiscount: 0, remaining: 0 },
        form: {
          dueDate: '',            // string | null
          notes: '',              // string | null
          invoiceType: '',        // 'reservation'|'course'|'installment'|'penalty'
          paymentMode: '',        // 'cash'|'installments'
          amountDue: null,        // number

          // الحقول الجديدة:
          installments: [],       // Array<{ installmentNumber, plannedAmount, dueDate, notes?, initialPaidAmount? }>
          payments: [],           // Array<{ amount, paymentMethod, installmentNumber?, paidAt?, notes? }>
          additionalDiscounts: [],// Array<{ amount, notes? }>
        }
      },

      // table
      headers: [
        { title: '#', type: 'strong', sortable: false, key: 'num' },
        { title: 'اسم الطالب', type: 'link', sortable: true, key: 'student_name' },
        { title: 'طريقة الدفع', type: 'strong', sortable: true, key: 'payment_mode' },
        { title: 'الصف والجلسة', type: 'session_title', sortable: true, key: 'grade_name' },
        { title: 'المبلغ المستحق', type: 'number', sortable: true, key: 'amount_due' },
        { title: 'إجمالي الخصومات', type: 'number', sortable: true, key: 'discount_total' },
        { title: 'المدفوع', type: 'number', sortable: true, key: 'amount_paid' },
        { title: 'المتبقي', type: 'number', sortable: true, key: 'remaining_amount' },
        { title: 'الحالة', type: 'status', sortable: true, key: 'invoice_status' },
        { title: 'العمليات', type: 'strong', sortable: false, key: 'actions' },
      ],
      items: [],
      tableActions: ['تعديل', 'حذف', 'اعادة تفعيل'],
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
      deleteDialog: { open: false, loading: false, id: null, messages: [], title: null, confirmButtonText: null },
      restoreDialog: { open: false, loading: false, id: null, messages: [], title: null, confirmButtonText: null, checkboxLabel: null },
      alert: { open: false, type: 'success', message: '' },
    }
  },
  created() {
    // restore cached state if present
    const stored = JSON.parse(localStorage.getItem(this.keyName))
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters }
      if (stored.tableOptions) this.tableOptions = { ...this.tableOptions, ...stored.tableOptions }
    }
    this.loadAcademicYears()
  },
  methods: {
    // Reset filters/options, clear cache, and reload
    reload() {
      localStorage.removeItem(this.keyName)
      this.filters = { studyYear: '', status: '', deleted: false }
      this.tableOptions = { page: 1, limit: 10, search: null }
      this.loadAcademicYears()
    },

    numberWithComma,
    async loadAcademicYears() {
      try {
        this.yearsLoading = true
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null
        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.filters.studyYear) {
          this.filters.studyYear = active?.year || ''
        }
        await this.fetchInvoices()
      } catch (e) {
        // fallback: if API fails, still try fetch with existing filter
        await this.fetchInvoices()
      } finally {
        this.yearsLoading = false
      }
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
        // cache current state
        localStorage.setItem(this.keyName, JSON.stringify({ filters: this.filters, tableOptions: this.tableOptions }))
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
        this.fetchInvoicesReport()
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب الفواتير')
      } finally {
        this.loadingTable = false
      }
    },
    async fetchInvoicesReport() {
      this.loadingTable = true
      try {
        const params = {
          studyYear: this.filters.studyYear,
          status: this.filters.status,
          page: this.tableOptions.page,
          limit: this.tableOptions.limit,
        }
        if (this.filters.deleted === true) params.deleted = true
        const { data } = await TeacherApi.getInvoicesSummary(params)
        const summary = data?.data || null
        if (summary) {
          this.report = {
            studyYear: this.filters.studyYear || undefined,
            counts: {
              totalPaid: Number(summary.paidCount || 0),
              totalPending: Number(summary.remainingCount || 0),
              totalDiscounted: Number(summary.discountCount || 0),
            },
            totals: {
              totalAmount: Number(summary.totalAmount || 0),
              totalPaidAmount: Number(summary.totalPaid || 0),
              discountAmount: Number(summary.totalDiscount || 0),
              remainingAmount: Number(summary.totalRemaining || 0),
            }
          }
        } else {
          this.report = null
        }
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
      this.deleteDialog.messages = [
        'سيتم حذف الفاتورة حذفًا منطقيًا (Soft Delete).',
        'يمكن استرجاعها لاحقًا من خلال عملية الاسترجاع.'
      ]
      this.deleteDialog.title = 'تأكيد الحذف'
      this.deleteDialog.confirmButtonText = 'حذف الفاتورة'
      this.deleteDialog.open = !!this.deleteDialog.id
    },
    openRestoreDialog(item) {
      this.restoreDialog.id = item?.id || null
      this.restoreDialog.messages = [
        'سيتم استرجاع الفاتورة مع أقساطها وقيودها.',
        'ستتمكن من تعديلها واستخدامها كما كانت.'
      ]
      this.restoreDialog.title = 'تأكيد الاسترجاع'
      this.restoreDialog.confirmButtonText = 'استرجاع الفاتورة'
      this.restoreDialog.checkboxLabel = 'أفهم التحذير وأؤكد الاسترجاع'
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

    openEditInvoice(item) {
      if (!item?.id) return
      // Navigate to dedicated edit page and pass current row as state for instant prefill
      this.$router.push({ path: `/teacher/invoices/edit/${item.id}`, state: item })
    },
    // Edit dialog helpers to mirror create flow builders
    addEditInstallment() {
      this.editDialog.form.installments.push({
        installmentNumber: this.editDialog.form.installments.length + 1,
        plannedAmount: null,
        dueDate: '',
        initialPaidAmount: 0,
      })
    },
    removeEditInstallment(idx) {
      this.editDialog.form.installments.splice(idx, 1)
    },
    addEditPayment() {
      this.editDialog.form.payments.push({
        amount: null,
        paymentMethod: 'cash',
        installmentNumber: undefined,
        paidAt: '',
        notes: '',
      })
    },
    removeEditPayment(idx) {
      this.editDialog.form.payments.splice(idx, 1)
    },
    addEditAdditionalDiscount() {
      this.editDialog.form.additionalDiscounts.push({ amount: null, notes: '' })
    },
    removeEditAdditionalDiscount(idx) {
      this.editDialog.form.additionalDiscounts.splice(idx, 1)
    },
    async handleUpdateInvoice() {
      if (!this.editDialog.invoiceId) return
      const id = this.editDialog.invoiceId
      const form = this.editDialog.form
      const current = this.editDialog.current

      const payload = {}

      // top-level dueDate: string | null | skip
      if (form.dueDate === null) payload.dueDate = null
      else if (form.dueDate && form.dueDate.trim() !== '') {
        // حوّل YYYY-MM-DD إلى ISO ثابت
        const iso = new Date(form.dueDate + 'T00:00:00Z').toISOString()
        payload.dueDate = iso
      }

      // notes: string | null | skip
      if (form.notes === null) payload.notes = null
      else if (typeof form.notes === 'string' && form.notes.trim() !== '') payload.notes = form.notes.trim()

      if (form.invoiceType) payload.invoiceType = form.invoiceType
      if (form.paymentMode) payload.paymentMode = form.paymentMode

      // amountDue: تحقق القيود قبل الإرسال (إن تم إدخاله)
      if (form.amountDue != null && form.amountDue !== '') {
        const amountDueNum = Number(form.amountDue)
        const minAllowed = Number(current.amountPaid) + Number(current.totalDiscount)
        if (isNaN(amountDueNum)) {
          this.showAlert('error', 'المبلغ المستحق غير صالح')
          return
        }
        if (amountDueNum < minAllowed) {
          this.showAlert(
            'error',
            `المبلغ المستحق يجب ألا يقل عن مجموع المدفوع (${current.amountPaid}) + الخصومات (${current.totalDiscount})`
          )
          return
        }
        payload.amountDue = amountDueNum
      }

      // installments: Array
      if (Array.isArray(form.installments) && form.installments.length > 0) {
        const normalized = []
        for (const inst of form.installments) {
          if (
            inst &&
            Number.isFinite(Number(inst.installmentNumber)) &&
            Number.isFinite(Number(inst.plannedAmount)) &&
            inst.dueDate
          ) {
            const dueISO = new Date(inst.dueDate).toISOString()
            normalized.push({
              installmentNumber: Number(inst.installmentNumber),
              plannedAmount: Number(inst.plannedAmount),
              dueDate: dueISO,
              ...(inst.notes ? { notes: String(inst.notes) } : {}),
              ...(inst.initialPaidAmount != null && inst.initialPaidAmount !== ''
                ? { initialPaidAmount: Number(inst.initialPaidAmount) }
                : {}),
            })
          }
        }
        if (normalized.length > 0) payload.installments = normalized
      }

      // payments: Array
      let totalNewPayments = 0
      if (Array.isArray(form.payments) && form.payments.length > 0) {
        const normalized = []
        for (const p of form.payments) {
          if (p && Number.isFinite(Number(p.amount)) && p.paymentMethod) {
            const entry = {
              amount: Number(p.amount),
              paymentMethod: String(p.paymentMethod), // أمثلة: 'cash' | 'bank' | 'wallet' ...
            }
            if (p.installmentNumber != null && p.installmentNumber !== '') {
              entry.installmentNumber = Number(p.installmentNumber)
            }
            if (p.paidAt) {
              // إن كانت قيمة تاريخ/وقت، حولها ISO؛ إن كانت YYYY-MM-DD فحوّلها لبداية اليوم Z
              const paidISO = p.paidAt.includes('T')
                ? new Date(p.paidAt).toISOString()
                : new Date(p.paidAt + 'T00:00:00Z').toISOString()
              entry.paidAt = paidISO
            }
            if (p.notes) entry.notes = String(p.notes)
            totalNewPayments += entry.amount
            normalized.push(entry)
          }
        }
        if (normalized.length > 0) payload.payments = normalized
      }

      // additionalDiscounts: Array
      let totalNewDiscounts = 0
      if (Array.isArray(form.additionalDiscounts) && form.additionalDiscounts.length > 0) {
        const normalized = []
        for (const d of form.additionalDiscounts) {
          if (d && Number.isFinite(Number(d.amount))) {
            const entry = { amount: Number(d.amount) }
            if (d.notes) entry.notes = String(d.notes)
            totalNewDiscounts += entry.amount
            normalized.push(entry)
          }
        }
        if (normalized.length > 0) payload.additionalDiscounts = normalized
      }

      // include studyYear context like create flow (if selected)
      if (this.filters?.studyYear) payload.studyYear = this.filters.studyYear

      // التحقق: لا تتجاوز مجموع (دفعات + خصومات إضافية) المتبقي الحالي
      const totalDelta = Number(totalNewPayments) + Number(totalNewDiscounts)
      if (totalDelta > Number(current.remaining)) {
        this.showAlert(
          'error',
          `إجمالي الدفعات والخصومات الإضافية (${totalDelta}) يتجاوز المتبقي الحالي (${current.remaining})`
        )
        return
      }

      if (Object.keys(payload).length === 0) {
        this.showAlert('error', 'لم يتم تحديد أي تعديل لإرساله')
        return
      }

      this.saving = true
      try {
        await TeacherApi.updateInvoice(id, payload)
        this.showAlert('success', 'تم تعديل الفاتورة بنجاح')
        this.editDialog.open = false
        await this.fetchInvoices() // يعيد تحميل القائمة ثم يجلب الملخّص
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر تعديل الفاتورة')
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
