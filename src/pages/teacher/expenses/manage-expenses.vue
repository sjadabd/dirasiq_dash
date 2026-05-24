<script>
// =====================================================
// Manage Expenses v2 — rebuilt 2026-05-17.
// Aligned with backend (migration 034 added category + payment_method + restore endpoint).
// Big changes vs v1:
//   • Reads the canonical Phase 1 envelope: data.meta.pagination + data.meta.summary.
//   • Filters now wire real backend filters: category, paymentMethod, search, deleted.
//   • Restore button calls the new /:id/restore endpoint (was a 404).
//   • Brand-aligned hero + 4 KPI cards (matches invoices / billing / reservations pages).
//   • mdi-* icons replaced with ri-* (eslint rule).
//   • View dialog shows the fields the backend actually persists.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue"

export default {
  components: { ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-manage-expenses-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "المصاريف", disabled: true },
      ],

      // Loading
      yearsLoading: false,
      loadingTable: false,
      saving: false,

      // Filters
      studyYears: [],
      filters: {
        studyYear: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        from: null,
        to: null,
        category: null,
        paymentMethod: null,
        deleted: false,
      },
      searchTerm: "",

      // Reference data
      categoryItems: [
        { title: "كل التصنيفات", value: null, icon: "ri-list-check", color: "primary" },
        { title: "رواتب",       value: "salaries",   icon: "ri-money-dollar-circle-line", color: "info" },
        { title: "إيجار",       value: "rent",       icon: "ri-home-3-line",              color: "warning" },
        { title: "كهرباء وماء", value: "utilities",  icon: "ri-flashlight-line",          color: "info" },
        { title: "صيانة",       value: "maintenance", icon: "ri-tools-line",               color: "secondary" },
        { title: "قرطاسية",     value: "stationery", icon: "ri-pencil-ruler-2-line",      color: "success" },
        { title: "أخرى",        value: "other",      icon: "ri-more-line",                color: "grey" },
      ],
      paymentMethods: [
        { title: "كل طرق الدفع", value: null },
        { title: "نقد",          value: "cash" },
        { title: "تحويل بنكي",   value: "bank_transfer" },
        { title: "بطاقة",        value: "card" },
      ],

      // KPIs
      kpis: {
        totalAmount: 0,
        count: 0,
        averageAmount: 0,
        topCategory: { value: null, amount: 0 },
        byCategory: {},
      },

      // Table
      headers: [
        { title: "#",        type: "strong", sortable: false, key: "num" },
        { title: "التاريخ",  type: "date",   sortable: true,  key: "expense_date" },
        { title: "التصنيف",  type: "strong", sortable: true,  key: "category_label" },
        { title: "طريقة الدفع", type: "strong", sortable: true, key: "payment_method_label" },
        { title: "المبلغ",   type: "number", sortable: true,  key: "amount" },
        { title: "ملاحظة",   type: "text",   sortable: false, key: "note" },
        { title: "العمليات", type: "strong", sortable: false, key: "actions" },
      ],
      items: [],
      tableActions: ["تعديل", "حذف", "اعادة تفعيل"],
      total: 0,
      tableOptions: { page: 1, limit: 10, search: null },

      // Dialog
      dialog: { open: false, mode: "add", currentId: null },
      form: {
        amount: null,
        expense_date: new Date().toISOString().slice(0, 10),
        note: "",
        category: "other",
        paymentMethod: "cash",
        created_at: null,
        updated_at: null,
      },
      errors: { amount: "", expense_date: "" },

      viewDialog: { open: false, data: {} },

      deleteDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null },
      restoreDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null, checkboxLabel: null },

      alert: { open: false, type: "success", message: "" },
    }
  },

  computed: {
    activeStudyYear() {
      return this.filters.studyYear || this.studyYears[0]?.value || "—"
    },
    topCategoryLabel() {
      const v = this.kpis.topCategory.value
      if (!v) return "—"
      
      return this.categoryItems.find(c => c.value === v)?.title || v
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
    numberWithComma(val) {
      if (val == null || val === "") return "0"
      
      return Number(val).toLocaleString()
    },
    formatIQDShort(n) {
      const num = Number(n) || 0
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M"
      if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K"
      
      return new Intl.NumberFormat("en-IQ").format(num)
    },
    formatIQD(n) {
      return new Intl.NumberFormat("en-IQ").format(Number(n) || 0) + " د.ع"
    },
    formatDate(val) {
      if (!val) return ""
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return String(val).slice(0, 10)
      const dd = String(d.getDate()).padStart(2, "0")
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      
      return `${dd}/${mm}/${d.getFullYear()}`
    },
    formatDateTime(val) {
      if (!val) return "غير متوفر"
      const d = new Date(val)
      
      return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleString("ar-EG")
    },
    formatMoney(val) {
      if (val == null || val === "") return ""
      const n = Number(val)
      
      return Number.isFinite(n) ? n.toLocaleString() : String(val)
    },
    parseMoney(val) {
      if (val == null || val === "") return null
      const cleaned = String(val).replace(/[^0-9.-]/g, "")
      const n = Number(cleaned)
      
      return Number.isFinite(n) ? n : null
    },
    onFormatMoney(field, val) {
      this.form[field] = this.parseMoney(val)
    },
    categoryLabel(value) {
      return this.categoryItems.find(c => c.value === value)?.title || value || "غير محدد"
    },
    categoryColor(value) {
      return this.categoryItems.find(c => c.value === value)?.color || "grey"
    },
    paymentMethodLabel(value) {
      return this.paymentMethods.find(p => p.value === value)?.title || value || "غير محدد"
    },

    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
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
        if (!this.filters.studyYear) this.filters.studyYear = active?.year || ""
        await this.fetchExpenses()
      } catch {
        await this.fetchExpenses()
      } finally {
        this.yearsLoading = false
      }
    },

    reload() {
      localStorage.removeItem(this.keyName)
      this.filters = { studyYear: this.filters.studyYear, from: null, to: null, category: null, paymentMethod: null, deleted: false }
      this.searchTerm = ""
      this.tableOptions = { page: 1, limit: 10, search: null }
      this.fetchExpenses()
    },

    onUpdateTableOptions(newOptions) {
      this.tableOptions = { ...this.tableOptions, ...newOptions }
      this.fetchExpenses()
    },

    onFilterChange() {
      this.tableOptions.page = 1
      this.fetchExpenses()
    },

    onSearch() {
      this.tableOptions.page = 1
      this.fetchExpenses()
    },

    buildParams() {
      const params = {
        page: this.tableOptions.page,
        limit: this.tableOptions.limit,
      }

      if (this.filters.studyYear)     params.studyYear     = this.filters.studyYear
      if (this.filters.from)          params.from          = this.filters.from
      if (this.filters.to)            params.to            = this.filters.to
      if (this.filters.category)      params.category      = this.filters.category
      if (this.filters.paymentMethod) params.paymentMethod = this.filters.paymentMethod
      if (this.filters.deleted === true) params.deleted    = "true"
      if (this.searchTerm?.trim())    params.search        = this.searchTerm.trim()
      
      return params
    },

    async fetchExpenses() {
      this.loadingTable = true
      try {
        this.persistState()

        const res = await TeacherApi.getExpenses(this.buildParams())
        const env = res?.data || {}
        const list = Array.isArray(env.data) ? env.data : []
        const pagination = env.meta?.pagination || {}
        const summary = env.meta?.summary || {}

        this.total = pagination.total ?? list.length
        this.items = list.map((it, idx) => ({
          ...it,
          num: (this.tableOptions.page - 1) * this.tableOptions.limit + idx + 1,
          amount: Number(it.amount) || 0,
          is_deleted: typeof it.is_deleted !== "undefined" ? it.is_deleted : Boolean(it.deleted_at),
          category_label: this.categoryLabel(it.category),
          payment_method_label: this.paymentMethodLabel(it.payment_method),
        }))

        // KPIs
        const totalAmount = Number(summary.totalAmount) || 0
        const count = Number(summary.count) || this.total
        const byCategory = summary.byCategory || {}
        let topVal = null
        let topAmt = 0
        for (const [cat, amt] of Object.entries(byCategory)) {
          const n = Number(amt)
          if (n > topAmt) { topAmt = n; topVal = cat }
        }
        this.kpis = {
          totalAmount,
          count,
          averageAmount: count > 0 ? Math.round(totalAmount / count) : 0,
          topCategory: { value: topVal, amount: topAmt },
          byCategory,
        }
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر جلب المصاريف")
      } finally {
        this.loadingTable = false
      }
    },

    // ----- CRUD -----
    openAdd() {
      this.dialog = { open: true, mode: "add", currentId: null }
      this.form = {
        amount: null,
        expense_date: new Date().toISOString().slice(0, 10),
        note: "",
        category: "other",
        paymentMethod: "cash",
        created_at: null,
        updated_at: null,
      }
      this.errors = { amount: "", expense_date: "" }
    },
    openEdit(item) {
      this.dialog = { open: true, mode: "edit", currentId: item.id }
      this.form = {
        amount: item.amount != null ? Number(item.amount) : null,
        expense_date: item.expense_date ? String(item.expense_date).slice(0, 10) : null,
        note: item.note || "",
        category: item.category || "other",
        paymentMethod: item.payment_method || "cash",
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
      }
      this.errors = { amount: "", expense_date: "" }
    },
    closeDialog() { this.dialog.open = false },

    validateForm() {
      this.errors = { amount: "", expense_date: "" }
      let ok = true
      const amt = this.form.amount != null ? Number(this.form.amount) : null
      if (!(amt > 0)) { this.errors.amount = "يرجى إدخال مبلغ صحيح"; ok = false }
      if (!this.form.expense_date) { this.errors.expense_date = "يرجى إدخال تاريخ المصروف"; ok = false }
      
      return ok
    },

    async submitDialog() {
      if (!this.validateForm()) { this.showAlert("error", "يرجى تصحيح الأخطاء في النموذج") 

        return }
      this.saving = true
      try {
        const amt = Number(this.form.amount)
        if (this.dialog.mode === "add") {
          const payload = {
            amount: amt,
            expense_date: this.form.expense_date,
            category: this.form.category,
            paymentMethod: this.form.paymentMethod,
          }

          if (this.form.note?.trim()) payload.note = this.form.note.trim()
          await TeacherApi.addExpense(payload)
          this.showAlert("success", "تمت إضافة المصروف بنجاح")
        } else {
          const payload = { amount: amt }
          if (this.form.note != null) payload.note = this.form.note.trim() || null
          if (this.form.expense_date) payload.expense_date = this.form.expense_date
          if (this.form.category) payload.category = this.form.category
          if (this.form.paymentMethod) payload.paymentMethod = this.form.paymentMethod
          await TeacherApi.updateExpense(this.dialog.currentId, payload)
          this.showAlert("success", "تم تعديل المصروف بنجاح")
        }
        this.dialog.open = false
        await this.fetchExpenses()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر حفظ المصروف")
      } finally {
        this.saving = false
      }
    },

    viewExpenseDetails(item) {
      this.viewDialog.data = { ...item }
      this.viewDialog.open = true
    },

    confirmDelete(item) {
      this.deleteDialog.data = item
      this.deleteDialog.messages = [
        "سيتم حذف المصروف حذفاً منطقياً.",
        "يمكن استرجاعه لاحقاً من خلال فلتر «المحذوفة».",
      ]
      this.deleteDialog.title = "تأكيد الحذف"
      this.deleteDialog.confirmButtonText = "حذف المصروف"
      this.deleteDialog.open = true
    },
    async handleDelete() {
      try {
        await TeacherApi.deleteExpense(this.deleteDialog.data.id)
        this.showAlert("success", "تم حذف المصروف بنجاح")
        await this.fetchExpenses()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف")
      } finally {
        this.deleteDialog.open = false
      }
    },

    confirmRestore(item) {
      this.restoreDialog.data = item
      this.restoreDialog.messages = [
        "سيتم استرجاع المصروف وإعادة تفعيله.",
        "ستتمكن من تعديله واستخدامه كالمعتاد.",
      ]
      this.restoreDialog.title = "تأكيد الاسترجاع"
      this.restoreDialog.confirmButtonText = "استرجاع المصروف"
      this.restoreDialog.checkboxLabel = "أفهم وأؤكد الاسترجاع"
      this.restoreDialog.open = true
    },
    async handleRestore() {
      try {
        await TeacherApi.restoreExpense(this.restoreDialog.data.id)
        this.showAlert("success", "تم استرجاع المصروف بنجاح")
        await this.fetchExpenses()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الاسترجاع")
      } finally {
        this.restoreDialog.open = false
      }
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="expense-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-wallet-3-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">
          إدارة المصاريف
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          سجّل مصاريفك التشغيلية وتابع التصنيفات. السنة الفعلية: <strong>{{ activeStudyYear }}</strong>
        </div>
      </div>
      <VBtn
        color="warning"
        prepend-icon="ri-add-line"
        size="large"
        rounded="pill"
        @click="openAdd"
      >
        إضافة مصروف
      </VBtn>
    </div>

    <!-- KPI cards -->
    <VRow class="mb-4">
      <VCol
        cols="6"
        md="3"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card kpi-primary"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-money-dollar-circle-line"
                color="error"
                size="24"
              />
              <VChip
                size="small"
                color="error"
                variant="flat"
              >
                إجمالي
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ formatIQDShort(kpis.totalAmount) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              إجمالي المصاريف
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="3"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-list-check-2"
                color="info"
                size="24"
              />
              <VChip
                size="small"
                color="info"
                variant="flat"
              >
                عدد
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ numberWithComma(kpis.count) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              عدد السجلات
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="3"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-calculator-line"
                color="warning"
                size="24"
              />
              <VChip
                size="small"
                color="warning"
                variant="flat"
              >
                متوسط
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ formatIQDShort(kpis.averageAmount) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              متوسط المصروف
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="3"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-bar-chart-2-line"
                color="success"
                size="24"
              />
              <VChip
                size="small"
                :color="categoryColor(kpis.topCategory.value)"
                variant="flat"
              >
                {{ topCategoryLabel }}
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ formatIQDShort(kpis.topCategory.amount) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              أعلى تصنيف
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Filters -->
    <VCard
      rounded="lg"
      elevation="0"
      class="mb-4 border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2">
          <VIcon
            icon="ri-filter-3-line"
            color="primary"
          />
          <span class="text-subtitle-1 font-weight-bold">التصفية والبحث</span>
          <VSpacer />
          <VBtn
            variant="text"
            size="small"
            prepend-icon="ri-refresh-line"
            @click="reload"
          >
            إعادة تعيين
          </VBtn>
        </div>
        <VRow dense>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="searchTerm"
              prepend-inner-icon="ri-search-line"
              label="بحث في الملاحظات"
              density="comfortable"
              variant="outlined"
              clearable
              @keyup.enter="onSearch"
              @click:clear="onSearch"
            />
          </VCol>
          <VCol
            cols="6"
            md="2"
          >
            <VSelect
              v-model="filters.studyYear"
              :items="studyYears"
              item-title="label"
              item-value="value"
              label="السنة الدراسية"
              density="comfortable"
              variant="outlined"
              :loading="yearsLoading"
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="6"
            md="2"
          >
            <VSelect
              v-model="filters.category"
              :items="categoryItems"
              item-title="title"
              item-value="value"
              label="التصنيف"
              density="comfortable"
              variant="outlined"
              clearable
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="6"
            md="2"
          >
            <VSelect
              v-model="filters.paymentMethod"
              :items="paymentMethods"
              item-title="title"
              item-value="value"
              label="طريقة الدفع"
              density="comfortable"
              variant="outlined"
              clearable
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="6"
            md="3"
            class="d-flex align-center justify-end ga-2"
          >
            <VSwitch
              v-model="filters.deleted"
              color="error"
              density="compact"
              hide-details
              label="عرض المحذوفة"
              @update:model-value="onFilterChange"
            />
            <VBtn
              color="primary"
              variant="tonal"
              icon="ri-search-2-line"
              size="small"
              @click="onSearch"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.from"
              type="date"
              label="من تاريخ"
              density="comfortable"
              variant="outlined"
              clearable
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.to"
              type="date"
              label="إلى تاريخ"
              density="comfortable"
              variant="outlined"
              clearable
              @update:model-value="onFilterChange"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Table -->
    <VCard
      rounded="lg"
      elevation="0"
      class="border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3">
          <VIcon
            icon="ri-table-line"
            color="primary"
            class="me-2"
          />
          <span class="text-subtitle-1 font-weight-bold">المصاريف</span>
          <VSpacer />
          <VChip
            color="primary"
            variant="flat"
            size="small"
          >
            {{ numberWithComma(total) }} سجل
          </VChip>
        </div>
        <SmartTable
          :headers="headers"
          :items="items"
          :actions="tableActions"
          :loading="loadingTable"
          :total-items="total"
          :table-options="tableOptions"
          @update-table-options="onUpdateTableOptions"
          @edit-item="openEdit"
          @delete-item="confirmDelete"
          @enable-item="confirmRestore"
          @show-item="viewExpenseDetails"
        />
      </VCardText>
    </VCard>

    <!-- Add/Edit Dialog -->
    <VDialog
      v-model="dialog.open"
      max-width="640"
      persistent
    >
      <VCard>
        <VCardTitle class="d-flex align-center py-4 px-6">
          <VIcon
            :icon="dialog.mode === 'add' ? 'ri-add-circle-line' : 'ri-pencil-line'"
            class="me-2"
            color="primary"
          />
          <span>{{ dialog.mode === "add" ? "إضافة مصروف" : "تعديل مصروف" }}</span>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                :model-value="formatMoney(form.amount)"
                label="المبلغ *"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-money-dollar-circle-line"
                :error-messages="errors.amount"
                @update:model-value="v => onFormatMoney('amount', v)"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.expense_date"
                type="date"
                label="تاريخ المصروف *"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-calendar-line"
                :error-messages="errors.expense_date"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.category"
                :items="categoryItems.filter(c => c.value)"
                item-title="title"
                item-value="value"
                label="التصنيف"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-price-tag-3-line"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.paymentMethod"
                :items="paymentMethods.filter(p => p.value)"
                item-title="title"
                item-value="value"
                label="طريقة الدفع"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-bank-card-line"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.note"
                label="ملاحظة"
                variant="outlined"
                rows="2"
                prepend-inner-icon="ri-sticky-note-line"
              />
            </VCol>
          </VRow>

          <VCard
            v-if="dialog.mode === 'edit'"
            variant="tonal"
            class="mt-2"
          >
            <VCardText class="py-3">
              <VRow dense>
                <VCol
                  cols="12"
                  md="6"
                >
                  <div class="text-caption text-medium-emphasis">
                    تاريخ الإنشاء
                  </div>
                  <div class="text-body-2">
                    {{ formatDateTime(form.created_at) }}
                  </div>
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <div class="text-caption text-medium-emphasis">
                    آخر تحديث
                  </div>
                  <div class="text-body-2">
                    {{ formatDateTime(form.updated_at) }}
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCardText>
        <VDivider />
        <VCardActions class="px-6 py-3">
          <VSpacer />
          <VBtn
            variant="text"
            @click="closeDialog"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            prepend-icon="ri-save-3-line"
            @click="submitDialog"
          >
            حفظ
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- View Dialog -->
    <VDialog
      v-model="viewDialog.open"
      max-width="560"
    >
      <VCard>
        <VCardTitle class="d-flex align-center py-4 px-6">
          <VIcon
            icon="ri-eye-line"
            class="me-2"
            color="primary"
          />
          <span>تفاصيل المصروف</span>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-caption text-medium-emphasis">
                المبلغ
              </div>
              <div class="text-h6 font-weight-bold text-error">
                {{ formatIQD(viewDialog.data.amount) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-caption text-medium-emphasis">
                تاريخ المصروف
              </div>
              <div class="text-body-1">
                {{ formatDate(viewDialog.data.expense_date) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-caption text-medium-emphasis">
                التصنيف
              </div>
              <VChip
                size="small"
                :color="categoryColor(viewDialog.data.category)"
                variant="flat"
              >
                {{ categoryLabel(viewDialog.data.category) }}
              </VChip>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-caption text-medium-emphasis">
                طريقة الدفع
              </div>
              <div class="text-body-1">
                {{ paymentMethodLabel(viewDialog.data.payment_method) }}
              </div>
            </VCol>
            <VCol cols="12">
              <div class="text-caption text-medium-emphasis">
                ملاحظة
              </div>
              <div class="text-body-1">
                {{ viewDialog.data.note || "—" }}
              </div>
            </VCol>
            <VCol cols="12">
              <VDivider class="my-1" />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-caption text-medium-emphasis">
                تاريخ الإنشاء
              </div>
              <div class="text-body-2">
                {{ formatDateTime(viewDialog.data.created_at) }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-caption text-medium-emphasis">
                آخر تحديث
              </div>
              <div class="text-body-2">
                {{ formatDateTime(viewDialog.data.updated_at) }}
              </div>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="px-6 py-3">
          <VSpacer />
          <VBtn
            variant="text"
            @click="viewDialog.open = false"
          >
            إغلاق
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

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
      @confirm="handleRestore"
    />

    <BaseAlert
      v-if="alert.open"
      v-model="alert.open"
      :type="alert.type"
      :message="alert.message"
      :closable="true"
      close-text="موافق"
      @close="alert.open = false"
    />
  </div>
</template>

<style scoped>
.expense-hero {
  background: linear-gradient(135deg, #0B2545 0%, #163e72 100%);
  position: relative;
  overflow: hidden;
}
.hero-icon-wrap {
  inline-size: 56px;
  block-size: 56px;
  background: rgba(255, 138, 0, 0.95);
}
.border {
  border: 1px solid rgba(11, 37, 69, 0.08) !important;
}
.kpi-card {
  border: 1px solid rgba(11, 37, 69, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(11, 37, 69, 0.08);
}
</style>
