<script>
// =====================================================
// Manage Invoices v2 — rebuilt 2026-05-17.
// Aligned with the simplified backend (9 focused endpoints) + brand UI.
// Big changes vs v1 (768 sloc):
//   • Removed the monolithic Edit dialog (installments + payments + discounts builders).
//     For meta edits → small "Edit Meta" dialog (dates + notes only).
//     For discount  → small "Set Discount" dialog (one number).
//     For deeper changes (mode/amount/installments) → soft-delete + recreate.
//   • Add Payment dialog now supports partial (just an amount + method).
//   • Status filter uses correct backend enum (pending/partial/paid/overdue/cancelled).
//   • Free-text search wired (passed to backend as `?search=`).
//   • Brand-aligned hero + 4 KPI cards (matches dashboard / billing / reservations pages).
//   • Single-invoice page (/teacher/invoices/:id) handles installment-level actions.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue"
import numberWithComma from "@/constant/number"

export default {
  components: { ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-manage-invoices-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "فواتير الطلاب", disabled: true },
      ],

      // Loading
      yearsLoading: false,
      loadingTable: false,
      saving: false,

      // Filters
      studyYears: [],
      filters: {
        studyYear: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        status: null,
        paymentMode: null,
        deleted: false,
      },
      searchTerm: "",
      statusOptions: [
        { title: "كل الحالات", value: null },
        { title: "مدفوعة", value: "paid", color: "success", icon: "ri-checkbox-circle-line" },
        { title: "جزئية", value: "partial", color: "info", icon: "ri-progress-3-line" },
        { title: "معلّقة", value: "pending", color: "warning", icon: "ri-time-line" },
        { title: "متأخرة", value: "overdue", color: "error", icon: "ri-alarm-warning-line" },
        { title: "ملغاة", value: "cancelled", color: "grey", icon: "ri-close-circle-line" },
      ],
      paymentModeOptions: [
        { title: "كل الأنواع", value: null },
        { title: "كاش (دفعة واحدة)", value: "cash" },
        { title: "أقساط", value: "installments" },
      ],

      // KPIs (mirrors backend summary keys)
      kpis: {
        totalAmount: 0, totalPaid: 0, totalDiscount: 0, totalRemaining: 0,
        totalCount: 0, paidCount: 0, partialCount: 0, pendingCount: 0,
        overdueCount: 0, discountCount: 0,
      },

      // Table
      headers: [
        { title: "#", type: "strong", sortable: false, key: "num" },
        { title: "اسم الطالب", type: "link", sortable: true, key: "student_name" },
        { title: "الكورس", type: "strong", sortable: true, key: "course_name" },
        { title: "الصف", type: "strong", sortable: true, key: "grade_name" },
        { title: "النوع", type: "strong", sortable: true, key: "payment_mode_label" },
        { title: "المستحق", type: "number", sortable: true, key: "amount_due" },
        { title: "الخصم", type: "number", sortable: true, key: "discount_total" },
        { title: "المدفوع", type: "number", sortable: true, key: "amount_paid" },
        { title: "المتبقي", type: "number", sortable: true, key: "remaining_amount" },
        { title: "الحالة", type: "status", sortable: true, key: "invoice_status" },
        { title: "العمليات", type: "strong", sortable: false, key: "actions" },
      ],
      items: [],
      tableActions: ["تعديل", "حذف", "اعادة تفعيل"],
      totalItems: 0,
      tableOptions: { page: 1, limit: 10, search: null },

      // Dialogs
      payDialog: {
        open: false,
        invoiceId: null,
        remaining: 0,
        studentName: "",
        form: { amount: null, paymentMethod: "cash", paidAt: "", notes: "" },
      },
      paymentMethods: [
        { text: "نقد", value: "cash" },
        { text: "تحويل بنكي", value: "bank_transfer" },
        { text: "بطاقة", value: "credit_card" },
        { text: "دفع جوال", value: "mobile_payment" },
      ],

      discountDialog: {
        open: false,
        invoiceId: null,
        amountDue: 0,
        amountPaid: 0,
        currentDiscount: 0,
        form: { discountAmount: 0 },
      },

      metaDialog: {
        open: false,
        invoiceId: null,
        form: { invoiceDate: "", dueDate: "", notes: "" },
      },

      deleteDialog: { open: false, id: null, messages: [], title: null, confirmButtonText: null },
      restoreDialog: { open: false, id: null, messages: [], title: null, confirmButtonText: null, checkboxLabel: null },

      alert: { open: false, type: "success", message: "" },
    }
  },

  computed: {
    activeStudyYear() {
      return this.filters.studyYear || this.studyYears[0]?.value || "—"
    },
    paidPct() {
      if (!this.kpis.totalAmount) return 0
      
      return Math.round((this.kpis.totalPaid / this.kpis.totalAmount) * 100)
    },
    unpaidCount() {
      // pending + partial + overdue (everything not fully paid/cancelled)
      return (this.kpis.pendingCount || 0) + (this.kpis.partialCount || 0) + (this.kpis.overdueCount || 0)
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null")
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters }
      if (stored.tableOptions) this.tableOptions = { ...this.tableOptions, ...stored.tableOptions }
      if (typeof stored.searchTerm === "string") this.searchTerm = stored.searchTerm
    }
    this.loadAcademicYears()
  },

  methods: {
    numberWithComma,

    formatIQDShort(n) {
      const num = Number(n) || 0
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M"
      if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K"
      
      return new Intl.NumberFormat("en-IQ").format(num)
    },
    formatIQD(n) {
      return new Intl.NumberFormat("en-IQ").format(Number(n) || 0) + " د.ع"
    },

    persistState() {
      localStorage.setItem(this.keyName, JSON.stringify({
        filters: this.filters,
        tableOptions: this.tableOptions,
        searchTerm: this.searchTerm,
      }))
    },

    async loadAcademicYears() {
      this.yearsLoading = true
      try {
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null

        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.filters.studyYear) {
          this.filters.studyYear = active?.year || ""
        }
        await this.refreshAll()
      } catch {
        await this.refreshAll()
      } finally {
        this.yearsLoading = false
      }
    },

    reload() {
      localStorage.removeItem(this.keyName)
      this.filters = { studyYear: this.filters.studyYear, status: null, paymentMode: null, deleted: false }
      this.searchTerm = ""
      this.tableOptions = { page: 1, limit: 10, search: null }
      this.refreshAll()
    },

    async refreshAll() {
      await Promise.all([this.fetchInvoices(), this.fetchSummary()])
    },

    onUpdateTableOptions(newOptions) {
      this.tableOptions = { ...this.tableOptions, ...newOptions }
      this.fetchInvoices()
    },

    onFilterChange() {
      this.tableOptions.page = 1
      this.refreshAll()
    },

    onSearch() {
      this.tableOptions.page = 1
      this.refreshAll()
    },

    buildListParams() {
      const params = {
        studyYear: this.filters.studyYear,
        page: this.tableOptions.page,
        limit: this.tableOptions.limit,
      }

      if (this.filters.status) params.status = this.filters.status
      if (this.filters.paymentMode) params.paymentMode = this.filters.paymentMode
      if (this.filters.deleted === true) params.deleted = "true"
      if (this.searchTerm?.trim()) params.search = this.searchTerm.trim()
      
      return params
    },

    async fetchInvoices() {
      this.loadingTable = true
      try {
        this.persistState()

        const { data } = await TeacherApi.listInvoices(this.buildListParams())
        const list = Array.isArray(data?.data) ? data.data : []
        const pagination = data?.meta?.pagination || {}

        this.totalItems = pagination.total ?? list.length
        this.items = list.map((it, idx) => ({
          ...it,
          num: (this.tableOptions.page - 1) * this.tableOptions.limit + idx + 1,
          payment_mode_label: it.payment_mode === "installments" ? "أقساط" : "كاش",
          is_deleted: typeof it.is_deleted !== "undefined" ? it.is_deleted : Boolean(it.deleted_at),
        }))
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر جلب الفواتير")
      } finally {
        this.loadingTable = false
      }
    },

    async fetchSummary() {
      try {
        const params = { studyYear: this.filters.studyYear }
        if (this.filters.status) params.status = this.filters.status
        if (this.filters.deleted === true) params.deleted = "true"
        const { data } = await TeacherApi.getInvoicesSummary(params)
        const s = data?.data || {}

        this.kpis = {
          totalAmount: Number(s.totalAmount) || 0,
          totalPaid: Number(s.totalPaid) || 0,
          totalDiscount: Number(s.totalDiscount) || 0,
          totalRemaining: Number(s.totalRemaining) || 0,
          totalCount: Number(s.totalCount) || 0,
          paidCount: Number(s.paidCount) || 0,
          partialCount: Number(s.partialCount) || 0,
          pendingCount: Number(s.pendingCount) || 0,
          overdueCount: Number(s.overdueCount) || 0,
          discountCount: Number(s.discountCount) || 0,
        }
      } catch (e) {
        console.warn("Failed to fetch invoices summary:", e)
      }
    },

    // ----- Navigation -----
    goToProfile(item) {
      const id = item?.id
      if (!id) return
      this.$router.push({ path: `/teacher/invoices/${id}`, state: item })
    },
    goToCreate() {
      this.$router.push({ name: "teacher-invoices-create-invoice" })
    },

    // ----- Add payment (simple, partial-friendly) -----
    openAddPayment(item) {
      this.payDialog.invoiceId = item.id
      this.payDialog.remaining = Number(item.remaining_amount) || 0
      this.payDialog.studentName = item.student_name || ""
      this.payDialog.form = {
        amount: this.payDialog.remaining,
        paymentMethod: "cash",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      }
      this.payDialog.open = true
    },
    async submitPayment() {
      const f = this.payDialog.form
      if (!f.amount || Number(f.amount) <= 0) {
        this.showAlert("error", "أدخل مبلغاً صحيحاً أكبر من صفر")
        
        return
      }
      if (Number(f.amount) > this.payDialog.remaining + 0.005) {
        this.showAlert("error", `المبلغ يتجاوز المتبقّي على الفاتورة (${this.formatIQD(this.payDialog.remaining)})`)
        
        return
      }
      this.saving = true
      try {
        const payload = {
          amount: Number(f.amount),
          paymentMethod: f.paymentMethod,
        }

        if (f.paidAt) payload.paidAt = new Date(f.paidAt).toISOString()
        if (f.notes?.trim()) payload.notes = f.notes.trim()
        await TeacherApi.addInvoicePayment(this.payDialog.invoiceId, payload)
        this.showAlert("success", "تمت إضافة الدفعة")
        this.payDialog.open = false
        await this.refreshAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر إضافة الدفعة")
      } finally {
        this.saving = false
      }
    },

    // ----- Set discount (simple) -----
    openSetDiscount(item) {
      this.discountDialog.invoiceId = item.id
      this.discountDialog.amountDue = Number(item.amount_due) || 0
      this.discountDialog.amountPaid = Number(item.amount_paid) || 0
      this.discountDialog.currentDiscount = Number(item.discount_total) || 0
      this.discountDialog.form = { discountAmount: this.discountDialog.currentDiscount }
      this.discountDialog.open = true
    },
    async submitDiscount() {
      const v = Number(this.discountDialog.form.discountAmount)
      if (!Number.isFinite(v) || v < 0) {
        this.showAlert("error", "أدخل قيمة خصم صحيحة (>= 0)")
        
        return
      }
      const max = this.discountDialog.amountDue - this.discountDialog.amountPaid
      if (v > max) {
        this.showAlert("error", `الخصم لا يمكن أن يتجاوز المتبقّي بعد المدفوع (${this.formatIQD(max)})`)
        
        return
      }
      this.saving = true
      try {
        await TeacherApi.setInvoiceDiscount(this.discountDialog.invoiceId, v)
        this.showAlert("success", "تم ضبط الخصم")
        this.discountDialog.open = false
        await this.refreshAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر ضبط الخصم")
      } finally {
        this.saving = false
      }
    },

    // ----- Update meta (dates + notes) -----
    openEditMeta(item) {
      this.metaDialog.invoiceId = item.id
      this.metaDialog.form = {
        invoiceDate: item.invoice_date ? String(item.invoice_date).slice(0, 10) : "",
        dueDate: item.due_date ? String(item.due_date).slice(0, 10) : "",
        notes: item.notes || "",
      }
      this.metaDialog.open = true
    },
    async submitMeta() {
      const f = this.metaDialog.form
      const payload = {}
      if (f.invoiceDate) payload.invoiceDate = f.invoiceDate
      else if (f.invoiceDate === null) payload.invoiceDate = null
      if (f.dueDate) payload.dueDate = f.dueDate
      else if (f.dueDate === null) payload.dueDate = null
      payload.notes = f.notes?.trim() || null
      this.saving = true
      try {
        await TeacherApi.updateInvoiceMeta(this.metaDialog.invoiceId, payload)
        this.showAlert("success", "تم تحديث بيانات الفاتورة")
        this.metaDialog.open = false
        await this.refreshAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر تحديث الفاتورة")
      } finally {
        this.saving = false
      }
    },

    // ----- Edit (SmartTable emits @editItem) → opens the meta dialog -----
    openEditItem(item) { this.openEditMeta(item) },

    // ----- Soft delete -----
    openDeleteDialog(item) {
      this.deleteDialog.id = item?.id || null
      this.deleteDialog.messages = [
        "سيتم حذف الفاتورة (Soft Delete).",
        "يمكن استرجاعها لاحقاً بنفس البيانات والأقساط.",
      ]
      this.deleteDialog.title = "تأكيد الحذف"
      this.deleteDialog.confirmButtonText = "حذف الفاتورة"
      this.deleteDialog.open = !!this.deleteDialog.id
    },
    async handleDelete() {
      if (!this.deleteDialog.id) return
      try {
        const res = await TeacherApi.softDeleteInvoice(this.deleteDialog.id)

        this.showAlert("success", res?.data?.message || "تم الحذف")
        this.deleteDialog.open = false
        await this.refreshAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف")
      }
    },

    // ----- Restore -----
    openRestoreDialog(item) {
      this.restoreDialog.id = item?.id || null
      this.restoreDialog.messages = [
        "سيتم استرجاع الفاتورة مع جميع أقساطها.",
        "ستتمكن من إدارتها كما كانت قبل الحذف.",
      ]
      this.restoreDialog.title = "تأكيد الاسترجاع"
      this.restoreDialog.confirmButtonText = "استرجاع الفاتورة"
      this.restoreDialog.checkboxLabel = "أفهم وأؤكد الاسترجاع"
      this.restoreDialog.open = !!this.restoreDialog.id
    },
    async handleRestore() {
      if (!this.restoreDialog.id) return
      try {
        const res = await TeacherApi.restoreInvoice(this.restoreDialog.id)

        this.showAlert("success", res?.data?.message || "تم الاسترجاع")
        this.restoreDialog.open = false
        await this.refreshAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الاسترجاع")
      }
    },

    // ----- SmartTable extra emit (the v1 wired updateResponseItem → discount) -----
    onUpdateResponse(item) { this.openSetDiscount(item) },

    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
    },
  },
}
</script>

<template>
  <div class="invoices-page">
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- 1. HERO ============================================== -->
    <VCard
      class="hero-card mb-4"
      elevation="0"
      rounded="lg"
    >
      <div class="hero-mesh" />
      <VCardItem class="position-relative">
        <VRow
          align="center"
          class="g-3"
        >
          <VCol
            cols="12"
            md="8"
          >
            <div class="d-flex align-center gap-3 flex-wrap">
              <VAvatar
                size="64"
                color="warning"
                class="hero-avatar"
              >
                <VIcon
                  size="32"
                  color="white"
                >
                  ri-bill-line
                </VIcon>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="hero-greet">
                  فواتير الطلاب
                </div>
                <h1 class="hero-name">
                  إدارة الفواتير والأقساط
                </h1>
                <div class="hero-sub">
                  أنشئ فواتير لطلابك بدفعة واحدة أو على أقساط، سجّل المدفوعات (كاملة أو جزئية)،
                  وتابع الديون في مكان واحد.
                </div>
              </div>
            </div>
          </VCol>
          <VCol
            cols="12"
            md="4"
            class="text-md-end"
          >
            <VChip
              color="white"
              variant="text"
              prepend-icon="ri-calendar-2-line"
              class="me-2 hero-chip"
            >
              السنة: {{ activeStudyYear }}
            </VChip>
            <VBtn
              color="warning"
              variant="flat"
              rounded="lg"
              prepend-icon="ri-add-circle-line"
              class="hero-cta"
              @click="goToCreate"
            >
              إنشاء فاتورة
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Alerts -->
    <VAlert
      v-if="alert.open"
      :type="alert.type"
      variant="tonal"
      closable
      class="mb-3"
      @click:close="alert.open = false"
    >
      {{ alert.message }}
    </VAlert>

    <!-- 2. KPI ROW =========================================== -->
    <VRow
      class="mb-2"
      dense
    >
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard
          class="kpi-card h-100"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-primary">
                <VIcon
                  size="20"
                  color="white"
                >
                  ri-bill-line
                </VIcon>
              </div>
              <VChip
                size="x-small"
                color="primary"
                variant="tonal"
              >
                {{ kpis.totalCount }} فاتورة
              </VChip>
            </div>
            <div class="kpi-value">
              {{ formatIQDShort(kpis.totalAmount) }} <span class="kpi-currency">د.ع</span>
            </div>
            <div class="kpi-label">
              إجمالي المستحقات
            </div>
            <div class="kpi-sub">
              قبل الخصومات
            </div>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard
          class="kpi-card h-100"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-success">
                <VIcon
                  size="20"
                  color="white"
                >
                  ri-checkbox-circle-line
                </VIcon>
              </div>
              <VChip
                size="x-small"
                color="success"
                variant="tonal"
              >
                {{ kpis.paidCount }} مدفوعة
              </VChip>
            </div>
            <div class="kpi-value text-success">
              {{ formatIQDShort(kpis.totalPaid) }} <span class="kpi-currency">د.ع</span>
            </div>
            <div class="kpi-label">
              المسدّد
            </div>
            <div class="kpi-sub">
              {{ paidPct }}% من الإجمالي
            </div>
            <VProgressLinear
              :model-value="paidPct"
              color="success"
              rounded
              height="4"
              class="mt-2"
            />
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard
          class="kpi-card h-100"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-warning">
                <VIcon
                  size="20"
                  color="white"
                >
                  ri-time-line
                </VIcon>
              </div>
              <VChip
                size="x-small"
                color="warning"
                variant="tonal"
              >
                {{ unpaidCount }} غير مكتملة
              </VChip>
            </div>
            <div class="kpi-value text-warning">
              {{ formatIQDShort(kpis.totalRemaining) }} <span class="kpi-currency">د.ع</span>
            </div>
            <div class="kpi-label">
              المتبقّي
            </div>
            <div class="kpi-sub">
              <span v-if="kpis.partialCount">{{ kpis.partialCount }} جزئية · </span>
              <span v-if="kpis.pendingCount">{{ kpis.pendingCount }} معلّقة · </span>
              <span
                v-if="kpis.overdueCount"
                class="text-error"
              >{{ kpis.overdueCount }} متأخرة</span>
              <span v-if="!unpaidCount">لا توجد ديون</span>
            </div>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard
          class="kpi-card h-100"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-info">
                <VIcon
                  size="20"
                  color="white"
                >
                  ri-discount-percent-line
                </VIcon>
              </div>
              <VChip
                v-if="kpis.discountCount"
                size="x-small"
                color="info"
                variant="tonal"
              >
                {{ kpis.discountCount }} مخصومة
              </VChip>
            </div>
            <div class="kpi-value text-info">
              {{ formatIQDShort(kpis.totalDiscount) }} <span class="kpi-currency">د.ع</span>
            </div>
            <div class="kpi-label">
              الخصومات
            </div>
            <div class="kpi-sub">
              {{ kpis.discountCount ? "خصومات مطبّقة" : "لا توجد خصومات" }}
            </div>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- 3. FILTERS =========================================== -->
    <VCard
      class="panel mb-4"
      elevation="0"
      rounded="lg"
      border
    >
      <VCardItem>
        <VRow
          dense
          align="center"
        >
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="searchTerm"
              prepend-inner-icon="ri-search-line"
              placeholder="ابحث باسم الطالب أو الكورس…"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @keyup.enter="onSearch"
              @click:clear="onSearch"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.studyYear"
              :items="studyYears"
              item-title="label"
              item-value="value"
              label="السنة الدراسية"
              prepend-inner-icon="ri-calendar-2-line"
              variant="outlined"
              density="comfortable"
              :loading="yearsLoading"
              hide-details
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VSelect
              v-model="filters.status"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              label="الحالة"
              prepend-inner-icon="ri-checkbox-multiple-line"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VSelect
              v-model="filters.paymentMode"
              :items="paymentModeOptions"
              item-title="title"
              item-value="value"
              label="نوع الدفع"
              prepend-inner-icon="ri-bank-card-line"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
            class="d-flex justify-end"
          >
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="ri-refresh-line"
              rounded="lg"
              class="filter-cta"
              @click="reload"
            >
              تحديث
            </VBtn>
          </VCol>
        </VRow>
        <VRow
          dense
          class="mt-1"
        >
          <VCol cols="12">
            <VSwitch
              v-model="filters.deleted"
              color="error"
              inset
              density="compact"
              hide-details
              label="عرض الفواتير المحذوفة فقط"
              @update:model-value="onFilterChange"
            />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- 4. TABLE ============================================= -->
    <VCard
      class="panel mb-4"
      elevation="0"
      rounded="lg"
      border
    >
      <VCardTitle class="panel-head">
        <VIcon
          color="primary"
          class="me-2"
        >
          ri-table-line
        </VIcon>
        <span>سجل الفواتير</span>
        <VSpacer />
        <VChip
          size="small"
          color="primary"
          variant="elevated"
          class="font-weight-bold"
        >
          {{ numberWithComma(totalItems) }} سجل
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable
          :headers="headers"
          :items="items"
          :actions="tableActions"
          :loading="loadingTable"
          :total-items="totalItems"
          :table-options="tableOptions"
          class="invoices-table"
          @update-table-options="onUpdateTableOptions"
          @edit-item="openEditItem"
          @update-response-item="onUpdateResponse"
          @delete-item="openDeleteDialog"
          @enable-item="openRestoreDialog"
          @show-item="goToProfile"
        />
      </VCardItem>
    </VCard>

    <!-- 5. HELP STRIP ======================================== -->
    <VCard
      class="help-card panel mb-4"
      elevation="0"
      rounded="lg"
    >
      <VCardItem>
        <div class="d-flex align-center gap-3 flex-wrap">
          <VAvatar
            size="40"
            color="warning"
            variant="tonal"
          >
            <VIcon color="warning">
              ri-information-line
            </VIcon>
          </VAvatar>
          <div class="flex-grow-1">
            <div class="help-title">
              كيف تستخدم نظام الفواتير الجديد؟
            </div>
            <div class="help-text">
              <strong>إنشاء فاتورة</strong> → اختر الطالب والكورس والمبلغ، ثم اختر إما <em>كاش</em> (دفعة واحدة)
              أو <em>أقساط</em> (يقسّم النظام المبلغ تلقائياً على عدد الأقساط بفواصل زمنية متساوية). <br>
              <strong>إضافة دفعة</strong> من زر العرض/الأكشن، تدعم دفعات جزئية. <br>
              <strong>تعديل التواريخ/الملاحظات</strong> من زر "تعديل". لتغيير المبلغ أو نوع الدفع، احذف الفاتورة وأعد إنشاءها.
            </div>
          </div>
          <VBtn
            color="primary"
            variant="tonal"
            prepend-icon="ri-add-circle-line"
            rounded="lg"
            @click="goToCreate"
          >
            فاتورة جديدة
          </VBtn>
        </div>
      </VCardItem>
    </VCard>

    <!-- ===== DIALOG: Add Payment (partial-friendly) =========== -->
    <VDialog
      v-model="payDialog.open"
      max-width="540"
      persistent
    >
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon
            start
            color="success"
            class="me-2"
          >
            ri-money-dollar-circle-line
          </VIcon>
          <span class="text-h6 font-weight-bold">إضافة دفعة</span>
          <VSpacer />
          <VBtn
            icon
            variant="text"
            :disabled="saving"
            @click="payDialog.open = false"
          >
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert
            v-if="payDialog.studentName"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <strong>الطالب:</strong> {{ payDialog.studentName }} ·
            <strong>المتبقّي:</strong> {{ formatIQD(payDialog.remaining) }}
          </VAlert>
          <VRow dense>
            <VCol cols="12">
              <VTextField
                v-model.number="payDialog.form.amount"
                type="number"
                min="0"
                :max="payDialog.remaining"
                label="المبلغ (د.ع) *"
                prepend-inner-icon="ri-coin-line"
                variant="outlined"
                density="comfortable"
                :hint="`الحد الأقصى: ${formatIQD(payDialog.remaining)}`"
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="payDialog.form.paymentMethod"
                :items="paymentMethods"
                item-title="text"
                item-value="value"
                label="طريقة الدفع *"
                prepend-inner-icon="ri-bank-card-line"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="payDialog.form.paidAt"
                type="datetime-local"
                label="تاريخ الدفع"
                prepend-inner-icon="ri-calendar-event-line"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="payDialog.form.notes"
                label="ملاحظات (اختياري)"
                prepend-inner-icon="ri-edit-line"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
          </VRow>
          <VAlert
            v-if="payDialog.form.amount && payDialog.form.amount < payDialog.remaining"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <VIcon
              size="16"
              class="me-1"
            >
              ri-information-line
            </VIcon>
            هذه دفعة جزئية. ستكون الفاتورة بحالة "جزئية" بعد الحفظ.
          </VAlert>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="saving"
            @click="payDialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="success"
            rounded="lg"
            :loading="saving"
            prepend-icon="ri-check-line"
            @click="submitPayment"
          >
            حفظ الدفعة
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== DIALOG: Set Discount =========================== -->
    <VDialog
      v-model="discountDialog.open"
      max-width="500"
      persistent
    >
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon
            start
            color="info"
            class="me-2"
          >
            ri-discount-percent-line
          </VIcon>
          <span class="text-h6 font-weight-bold">ضبط الخصم</span>
          <VSpacer />
          <VBtn
            icon
            variant="text"
            :disabled="saving"
            @click="discountDialog.open = false"
          >
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <div><strong>المستحق الأصلي:</strong> {{ formatIQD(discountDialog.amountDue) }}</div>
            <div><strong>المسدّد حتى الآن:</strong> {{ formatIQD(discountDialog.amountPaid) }}</div>
            <div><strong>الخصم الحالي:</strong> {{ formatIQD(discountDialog.currentDiscount) }}</div>
          </VAlert>
          <VTextField
            v-model.number="discountDialog.form.discountAmount"
            type="number"
            min="0"
            :max="discountDialog.amountDue - discountDialog.amountPaid"
            label="قيمة الخصم الجديدة (د.ع) *"
            prepend-inner-icon="ri-coin-line"
            variant="outlined"
            density="comfortable"
            hint="اكتب 0 لإزالة الخصم."
            persistent-hint
          />
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="saving"
            @click="discountDialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="info"
            rounded="lg"
            :loading="saving"
            prepend-icon="ri-check-line"
            @click="submitDiscount"
          >
            حفظ الخصم
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== DIALOG: Edit Meta (dates + notes) =============== -->
    <VDialog
      v-model="metaDialog.open"
      max-width="540"
      persistent
    >
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon
            start
            color="primary"
            class="me-2"
          >
            ri-edit-line
          </VIcon>
          <span class="text-h6 font-weight-bold">تعديل بيانات الفاتورة</span>
          <VSpacer />
          <VBtn
            icon
            variant="text"
            :disabled="saving"
            @click="metaDialog.open = false"
          >
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <VIcon
              size="16"
              class="me-1"
            >
              ri-information-line
            </VIcon>
            يمكنك تعديل التواريخ والملاحظات فقط. لتغيير المبلغ أو نوع الدفع، احذف الفاتورة وأعد إنشاءها.
          </VAlert>
          <VRow dense>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="metaDialog.form.invoiceDate"
                type="date"
                label="تاريخ الفاتورة"
                prepend-inner-icon="ri-calendar-line"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="metaDialog.form.dueDate"
                type="date"
                label="تاريخ الاستحقاق"
                prepend-inner-icon="ri-calendar-todo-line"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="metaDialog.form.notes"
                label="ملاحظات"
                prepend-inner-icon="ri-file-text-line"
                variant="outlined"
                density="comfortable"
                rows="3"
                auto-grow
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="saving"
            @click="metaDialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="primary"
            rounded="lg"
            :loading="saving"
            prepend-icon="ri-check-line"
            @click="submitMeta"
          >
            حفظ التعديلات
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Confirm dialogs -->
    <ConfirmDangerDialog
      v-if="deleteDialog.open"
      v-model="deleteDialog.open"
      :messages="deleteDialog.messages"
      :title="deleteDialog.title"
      :confirm-button-text="deleteDialog.confirmButtonText"
      @confirm="handleDelete"
    />
    <ConfirmDangerDialog
      v-if="restoreDialog.open"
      v-model="restoreDialog.open"
      :messages="restoreDialog.messages"
      :title="restoreDialog.title"
      :confirm-button-text="restoreDialog.confirmButtonText"
      :checkbox-label="restoreDialog.checkboxLabel"
      :show-checkbox="true"
      @confirm="handleRestore"
    />
  </div>
</template>

<style scoped>
/* =====================================================
   Manage Invoices v2 — brand-aligned
   navy #0B2545 · orange #FF8A00 · sky #3FA9F5
   ===================================================== */
.invoices-page { padding-block: 4px; }

/* ---- HERO ---- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #050d1f 0%, #0b2545 55%, #122e54 100%) !important;
  color: white;
}
.hero-mesh {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(40% 80% at 100% 0%, rgba(255, 138, 0, .30), transparent 60%),
    radial-gradient(35% 70% at 0% 100%, rgba(63, 169, 245, .20), transparent 60%);
}
.hero-avatar { box-shadow: 0 10px 24px rgba(255, 138, 0, .35); }
.hero-greet { font-size: .82rem; color: rgba(255, 255, 255, .78); font-weight: 600; }
.hero-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.4rem; font-weight: 900;
  color: white !important; margin: 2px 0 4px;
  letter-spacing: -.01em;
}
.hero-sub { color: rgba(255, 255, 255, .82); font-size: .9rem; line-height: 1.65; max-inline-size: 70ch; }
.hero-chip { color: white !important; font-weight: 700; }
.hero-cta { font-weight: 800 !important; text-transform: none; letter-spacing: 0; }

/* ---- KPIs ---- */
.kpi-card {
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  height: 100%;
}
.kpi-card:hover {
  transform: translateY(-3px);
  border-color: rgba(11, 37, 69, .25) !important;
  box-shadow: 0 10px 24px rgba(11, 37, 69, .08) !important;
}
.kpi-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.kpi-icon-primary { background: linear-gradient(135deg, #0b2545 0%, #103261 100%); }
.kpi-icon-success { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
.kpi-icon-warning { background: linear-gradient(135deg, #FF8A00 0%, #FFB766 100%); }
.kpi-icon-info    { background: linear-gradient(135deg, #3FA9F5 0%, #2E8DDC 100%); }
.kpi-value {
  font-family: "Cairo", sans-serif;
  font-size: 1.4rem; font-weight: 900; color: #0b2545;
  line-height: 1.1; letter-spacing: -.02em; margin-top: 10px;
}
.kpi-currency { font-size: .82rem; font-weight: 700; color: rgba(11, 37, 69, .55); }
.kpi-label { font-size: .9rem; color: #0b2545; font-weight: 700; margin-top: 4px; }
.kpi-sub { font-size: .76rem; color: rgba(11, 37, 69, .58); margin-top: 2px; }

/* ---- Panel ---- */
.panel { background: white; }
.panel-head {
  display: flex; align-items: center;
  padding: 12px 16px !important;
  font-size: 1rem; font-weight: 700; color: #0b2545;
}
.filter-cta { font-weight: 700; text-transform: none; letter-spacing: 0; width: 100%; }
.invoices-table :deep(.v-data-table) { border-radius: 12px; }
.invoices-table :deep(.v-data-table__td) { font-family: "Cairo", sans-serif; }

/* ---- Help strip ---- */
.help-card {
  background: linear-gradient(135deg, rgba(255, 138, 0, .07) 0%, rgba(255, 138, 0, .02) 100%) !important;
  border: 1px solid rgba(255, 138, 0, .22) !important;
}
.help-title { font-weight: 800; color: #0b2545; font-size: 1rem; margin-bottom: 4px; }
.help-text { font-size: .9rem; color: rgba(11, 37, 69, .78); line-height: 1.85; }
.help-text em { color: #FF8A00; font-style: normal; font-weight: 700; }

@media (max-width: 600px) {
  .hero-name { font-size: 1.2rem; }
  .filter-cta { width: 100%; }
  .hero-cta { width: 100%; margin-top: 8px; }
}
</style>
