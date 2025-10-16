<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-chart-box-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">ملخص المصاريف</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-2">
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="error">
              <VCardText class="text-center">
                <div class="text-h4 font-weight-bold">{{ numberWithComma(summary.totalAmount) }}</div>
                <div class="text-subtitle-1 mt-2">إجمالي المصاريف</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="info">
              <VCardText class="text-center">
                <div class="text-h4 font-weight-bold">{{ numberWithComma(summary.count) }}</div>
                <div class="text-subtitle-1 mt-2">عدد المصاريف</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="warning">
              <VCardText class="text-center">
                <div class="text-h4 font-weight-bold">{{ numberWithComma(summary.averageAmount) }}</div>
                <div class="text-subtitle-1 mt-2">متوسط المصروف</div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="3">
            <VCard variant="tonal" color="success">
              <VCardText class="text-center">
                <div class="text-h4 font-weight-bold">{{ summary.studyYear || 'الكل' }}</div>
                <div class="text-subtitle-1 mt-2">السنة الدراسية</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Operations Card -->
    <VCard class="my-4 operations-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-cog-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">العمليات</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="align-center justify-start pa-2">
          <VBtn color="primary" class="ma-2" prepend-icon="ri-add-line" rounded="pill" elevation="2" size="default"
            @click="openAdd">
            إضافة مصروف
          </VBtn>
          <!-- <VBtn color="secondary" class="ma-2" prepend-icon="ri-file-excel-line" rounded="pill" elevation="2"
            size="default" @click="exportToExcel" :loading="exporting">
            تصدير Excel
          </VBtn> -->
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-filter-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
        <VSpacer />
        <VBtn variant="text" size="small" prepend-icon="ri-refresh-line" @click="resetFilters">
          إعادة تعيين
        </VBtn>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="3">
            <VSelect v-model="filters.studyYear" @update:model-value="applyFilters" :items="studyYears"
              item-title="label" item-value="value" label="السنة الدراسية" variant="outlined" :loading="yearsLoading" />
          </VCol>
          <VCol cols="12" md="3">
            <AppDateTimePicker v-model="filters.from" clearable @update:model-value="applyFilters" label="من تاريخ"
              variant="outlined" />
          </VCol>
          <VCol cols="12" md="3">
            <AppDateTimePicker v-model="filters.to" clearable @update:model-value="applyFilters" label="إلى تاريخ"
              variant="outlined" />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect v-model="filters.deleted" :items="deletedItems" item-title="text" item-value="value"
              label="حالة الحذف" variant="outlined" @update:model-value="applyFilters" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Data Table Card -->
    <VCard class="my-4 data-table-card" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small"
              class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">المصاريف</h3>
          </VCol>
          <VCol cols="auto">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ numberWithComma(total) }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable :headers="headers" :items="items" :actions="tableActions" :loading="tableLoading"
          :totalItems="total" :tableOptions="tableOptions" @updateTableOptions="onUpdateTableOptions"
          @editItem="openEdit" @deleteItem="confirmDelete" @enableItem="confirmRestore"
          @showItem="viewExpenseDetails" />
      </VCardItem>
    </VCard>

    <!-- Add/Edit Dialog -->
    <VDialog v-model="dialog.open" max-width="700px" persistent>
      <VCard>
        <VCardTitle class="py-4 px-6 d-flex align-center">
          <VIcon :icon="dialog.mode === 'add' ? 'ri-add-circle-line' : 'ri-pencil-line'" class="me-2" />
          <span>{{ dialog.mode === "add" ? "إضافة مصروف" : "تعديل مصروف" }}</span>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField :model-value="formatMoney(form.amount)"
                @update:model-value="(v) => onFormatMoney('amount', v)" label="المبلغ *" variant="outlined"
                :error-messages="errors.amount" />
            </VCol>
            <VCol cols="12" md="6">
              <AppDateTimePicker v-model="form.expense_date" label="تاريخ المصروف *" variant="outlined"
                :error-messages="errors.expense_date" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.category" :items="categoryItems" item-title="text" item-value="value"
                label="التصنيف" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.paymentMethod" :items="paymentMethods" item-title="text" item-value="value"
                label="طريقة الدفع" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="form.note" label="ملاحظة" variant="outlined" rows="3" />
            </VCol>
          </VRow>

          <!-- Additional Details Card -->
          <VCard variant="tonal" class="mt-4" v-if="dialog.mode === 'edit'">
            <VCardTitle class="text-subtitle-1">
              <VIcon icon="ri-information-line" class="me-2" size="small" />
              معلومات إضافية
            </VCardTitle>
            <VDivider />
            <VCardText>
              <VRow dense>
                <VCol cols="12" md="6">
                  <div class="text-caption text-medium-emphasis">تاريخ الإنشاء</div>
                  <div class="text-body-2">{{ formatDateTime(form.created_at) }}</div>
                </VCol>
                <VCol cols="12" md="6">
                  <div class="text-caption text-medium-emphasis">آخر تحديث</div>
                  <div class="text-body-2">{{ formatDateTime(form.updated_at) }}</div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCardText>
        <VCardActions class="px-6 pb-4">
          <VSpacer />
          <VBtn variant="outlined" @click="closeDialog">إلغاء</VBtn>
          <VBtn color="primary" :loading="saving" @click="submitDialog">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- View Details Dialog -->
    <VDialog v-model="viewDialog.open" max-width="600px">
      <VCard>
        <VCardTitle class="py-4 px-6 d-flex align-center">
          <VIcon icon="ri-eye-line" class="me-2" />
          <span>تفاصيل المصروف</span>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">المبلغ</div>
              <div class="text-h6 font-weight-bold text-error">{{ formatMoney(viewDialog.data.amount) }}</div>
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">تاريخ المصروف</div>
              <div class="text-body-1">{{ formatDate(viewDialog.data.expense_date) }}</div>
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">التصنيف</div>
              <div class="text-body-1">{{ getCategoryLabel(viewDialog.data.category) }}</div>
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">طريقة الدفع</div>
              <div class="text-body-1">{{ getPaymentMethodLabel(viewDialog.data.paymentMethod) }}</div>
            </VCol>
            <VCol cols="12">
              <div class="text-caption text-medium-emphasis">ملاحظة</div>
              <div class="text-body-1">{{ viewDialog.data.note || 'لا توجد ملاحظات' }}</div>
            </VCol>
            <VCol cols="12">
              <VDivider class="my-2" />
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">تاريخ الإنشاء</div>
              <div class="text-body-2">{{ formatDateTime(viewDialog.data.created_at) }}</div>
            </VCol>
            <VCol cols="12" md="6">
              <div class="text-caption text-medium-emphasis">آخر تحديث</div>
              <div class="text-body-2">{{ formatDateTime(viewDialog.data.updated_at) }}</div>
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="px-6 pb-4">
          <VSpacer />
          <VBtn variant="outlined" @click="viewDialog.open = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirm Dialog -->
    <ConfirmDangerDialog v-if="deleteDialog.open" v-model="deleteDialog.open" :messages="deleteDialog.messages"
      :title="deleteDialog.title" :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete" />

    <!-- Restore Confirm Dialog -->
    <ConfirmDangerDialog v-if="restoreDialog.open" v-model="restoreDialog.open" :messages="restoreDialog.messages"
      :title="restoreDialog.title" :confirmButtonText="restoreDialog.confirmButtonText"
      :checkboxLabel="restoreDialog.checkboxLabel" @confirm="handleRestore" />

    <!-- Alert -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from "@/api/teacher/teacher_api";
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue";

export default {
  components: {
    ConfirmDangerDialog,
  },
  data() {
    return {
      keyName: "manage-expenses-enhanced",
      results: JSON.parse(localStorage.getItem("user")),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/index" },
        { title: "المصاريف", disabled: true },
      ],
      loading: false,
      progress: 0,
      alert: { open: false, type: "success", message: "" },
      tableActions: ["تعديل", "حذف", "اعادة تفعيل"],

      // filters and table
      studyYears: [],
      yearsLoading: false,
      filters: { studyYear: "", from: null, to: null, deleted: false },
      deletedItems: [
        { text: "غير محذوف", value: false },
        { text: "محذوف", value: true },
      ],
      tableOptions: { page: 1, limit: 10 },
      headers: [
        { title: "#", type: "strong", sortable: false, key: "num" },
        { title: "التاريخ", type: "date", sortable: true, key: "expense_date" },
        { title: "المبلغ", type: "number", sortable: true, key: "amount" },
        { title: "ملاحظة", type: "text", sortable: false, key: "note" },
        { title: "إجراءات", type: "strong", sortable: false, key: "actions" },
      ],
      items: [],
      tableLoading: false,
      total: 0,
      summary: { totalAmount: 0, count: 0, averageAmount: 0, studyYear: "" },

      // categories and payment methods
      categoryItems: [
        { text: "رواتب", value: "salaries" },
        { text: "إيجار", value: "rent" },
        { text: "كهرباء وماء", value: "utilities" },
        { text: "صيانة", value: "maintenance" },
        { text: "قرطاسية", value: "stationery" },
        { text: "أخرى", value: "other" },
      ],
      paymentMethods: [
        { text: "نقد", value: "cash" },
        { text: "تحويل بنكي", value: "bank_transfer" },
        { text: "بطاقة", value: "card" },
      ],

      // dialog
      dialog: { open: false, mode: "add", currentId: null },
      form: {
        amount: null,
        expense_date: null,
        note: "",
        category: "other",
        paymentMethod: "cash",
        created_at: null,
        updated_at: null,
      },
      errors: { amount: "", expense_date: "" },
      saving: false,

      // view dialog
      viewDialog: { open: false, data: {} },

      // delete dialog
      deleteDialog: {
        open: false,
        data: null,
        messages: [],
        title: null,
        confirmButtonText: null,
      },

      // restore dialog
      restoreDialog: {
        open: false,
        data: null,
        messages: [],
        title: null,
        confirmButtonText: null,
        checkboxLabel: null,
      },

      // export
      exporting: false,
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.tableOptions.limit));
    },
  },
  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName));
    if (stored?.filters) this.filters = { ...this.filters, ...stored.filters };
    if (stored?.tableOptions)
      this.tableOptions = { ...this.tableOptions, ...stored.tableOptions };
    this.loadAcademicYears();
  },
  methods: {
    numberWithComma(val) {
      if (val === "" || val === null || typeof val === "undefined") return "0";
      return Number(val).toLocaleString();
    },
    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message });
    },
    formatDate(val) {
      if (!val) return "";
      const d = new Date(val);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
      return String(val).slice(0, 10);
    },
    formatDateTime(val) {
      if (!val) return "غير متوفر";
      const d = new Date(val);
      if (isNaN(d)) return String(val);
      return d.toLocaleString("ar-EG");
    },
    formatMoney(val) {
      if (val === "" || val === null || typeof val === "undefined") return "";
      const num = Number(val);
      if (!isFinite(num)) return String(val);
      return num.toLocaleString();
    },
    parseMoney(val) {
      if (val === "" || val === null || typeof val === "undefined") return null;
      const cleaned = String(val).replace(/[^0-9.-]/g, "");
      const num = Number(cleaned);
      return isFinite(num) ? num : null;
    },
    onFormatMoney(field, val) {
      const num = this.parseMoney(val);
      this.form[field] = num;
    },
    getCategoryLabel(value) {
      const item = this.categoryItems.find((c) => c.value === value);
      return item ? item.text : value || "غير محدد";
    },
    getPaymentMethodLabel(value) {
      const item = this.paymentMethods.find((p) => p.value === value);
      return item ? item.text : value || "غير محدد";
    },
    async loadAcademicYears() {
      try {
        this.yearsLoading = true;
        const res = await TeacherApi.getAcademicYears();
        const data = res?.data?.data || {};
        const years = Array.isArray(data.years) ? data.years : [];
        const active = data.active || null;
        this.studyYears = years.map((y) => ({ label: y.year, value: y.year }));
        if (!this.filters.studyYear)
          this.filters.studyYear = active?.year || "";
        await this.fetchExpenses();
      } catch (e) {
        await this.fetchExpenses();
      } finally {
        this.yearsLoading = false;
      }
    },
    async fetchExpenses() {
      try {
        this.tableLoading = true;
        localStorage.setItem(
          this.keyName,
          JSON.stringify({
            filters: this.filters,
            tableOptions: this.tableOptions,
          })
        );
        const params = {
          page: this.tableOptions.page,
          limit: this.tableOptions.limit,
          studyYear: this.filters.studyYear || undefined,
          from: this.filters.from || undefined,
          to: this.filters.to || undefined,
        };
        if (this.filters.deleted === true) params.deleted = true;

        const res = await TeacherApi.getExpenses(params);
        const data = res?.data || {};
        const list = Array.isArray(data.data) ? data.data : [];
        this.total = data.pagination?.total || list.length;
        this.items = list.map((it, idx) => ({
          ...it,
          num: (this.tableOptions.page - 1) * this.tableOptions.limit + idx + 1,
          is_deleted: typeof it.is_deleted !== "undefined" ? it.is_deleted : Boolean(it.deleted_at),
        }));
        this.summary = {
          totalAmount: data.summary?.totalAmount || 0,
          count: this.total,
          averageAmount:
            this.total > 0
              ? Math.round((data.summary?.totalAmount || 0) / this.total)
              : 0,
          studyYear: this.filters.studyYear,
        };
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر جلب المصاريف"
        );
      } finally {
        this.tableLoading = false;
      }
    },
    reload() {
      localStorage.removeItem(this.keyName);
      this.filters = { studyYear: "", from: null, to: null, deleted: false };
      this.tableOptions = { page: 1, limit: 10 };
      this.loadAcademicYears();
    },
    onUpdateTableOptions(newOptions) {
      this.tableOptions = { ...this.tableOptions, ...newOptions };
      this.fetchExpenses();
    },
    applyFilters() {
      this.tableOptions.page = 1;
      this.fetchExpenses();
    },
    resetFilters() {
      this.filters = {
        studyYear: this.filters.studyYear || "",
        from: null,
        to: null,
        deleted: false,
      };
      this.applyFilters();
    },

    openAdd() {
      this.dialog = { open: true, mode: "add", currentId: null };
      this.form = {
        amount: null,
        expense_date: null,
        note: "",
        category: "other",
        paymentMethod: "cash",
        created_at: null,
        updated_at: null,
      };
      this.errors = { amount: "", expense_date: "" };
    },
    openEdit(item) {
      this.dialog = { open: true, mode: "edit", currentId: item.id };
      this.form = {
        amount: item.amount != null ? Number(item.amount) : null,
        expense_date: item.expense_date
          ? String(item.expense_date).slice(0, 10)
          : null,
        note: item.note || "",
        category: item.category || "other",
        paymentMethod: item.paymentMethod || "cash",
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
      };
      this.errors = { amount: "", expense_date: "" };
    },
    closeDialog() {
      this.dialog.open = false;
    },
    validateForm() {
      this.errors = { amount: "", expense_date: "" };
      let isValid = true;

      const amt = this.form.amount != null ? Number(this.form.amount) : null;
      if (!(amt > 0)) {
        this.errors.amount = "يرجى إدخال مبلغ صحيح";
        isValid = false;
      }

      if (!this.form.expense_date) {
        this.errors.expense_date = "يرجى إدخال تاريخ المصروف";
        isValid = false;
      }

      return isValid;
    },
    async submitDialog() {
      if (!this.validateForm()) {
        this.showAlert("error", "يرجى تصحيح الأخطاء في النموذج");
        return;
      }

      this.saving = true;
      try {
        const amt = Number(this.form.amount);
        if (this.dialog.mode === "add") {
          const payload = {
            amount: amt,
            note: this.form.note || undefined,
            expense_date: this.form.expense_date,
            category: this.form.category || undefined,
            paymentMethod: this.form.paymentMethod || undefined,
          };
          await TeacherApi.addExpense(payload);
          this.showAlert("success", "تمت إضافة المصروف بنجاح");
        } else {
          const payload = {};
          if (this.form.amount != null) payload.amount = amt;
          if (typeof this.form.note === "string") payload.note = this.form.note;
          if (this.form.expense_date)
            payload.expense_date = this.form.expense_date;
          if (this.form.category) payload.category = this.form.category;
          if (this.form.paymentMethod)
            payload.paymentMethod = this.form.paymentMethod;
          await TeacherApi.updateExpense(this.dialog.currentId, payload);
          this.showAlert("success", "تم تعديل المصروف بنجاح");
        }
        this.dialog.open = false;
        this.fetchExpenses();
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر حفظ المصروف"
        );
      } finally {
        this.saving = false;
      }
    },
    viewExpenseDetails(item) {
      this.viewDialog.data = { ...item };
      this.viewDialog.open = true;
    },
    confirmDelete(item) {
      this.deleteDialog.data = item;
      this.deleteDialog.messages = [
        "سيتم حذف المصروف حذفًا منطقيًا (Soft Delete).",
        "يمكن استرجاعه لاحقًا من خلال عملية الاسترجاع.",
      ];
      this.deleteDialog.title = "تأكيد الحذف";
      this.deleteDialog.confirmButtonText = "حذف المصروف";
      this.deleteDialog.open = true;
    },
    async handleDelete() {
      try {
        await TeacherApi.deleteExpense(this.deleteDialog.data.id);
        this.showAlert("success", "تم حذف المصروف بنجاح");
        this.fetchExpenses();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذر الحذف");
      } finally {
        this.deleteDialog.open = false;
      }
    },
    confirmRestore(item) {
      this.restoreDialog.data = item;
      this.restoreDialog.messages = [
        "سيتم استرجاع المصروف وإعادة تفعيله.",
        "ستتمكن من تعديله واستخدامه كما كان.",
      ];
      this.restoreDialog.title = "تأكيد الاسترجاع";
      this.restoreDialog.confirmButtonText = "استرجاع المصروف";
      this.restoreDialog.checkboxLabel = "أفهم التحذير وأؤكد الاسترجاع";
      this.restoreDialog.open = true;
    },
    async handleRestore() {
      try {
        await TeacherApi.restoreExpense(this.restoreDialog.data.id);
        this.showAlert("success", "تم استرجاع المصروف بنجاح");
        this.fetchExpenses();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذر الاسترجاع");
      } finally {
        this.restoreDialog.open = false;
      }
    },
    async exportToExcel() {
      this.exporting = true;
      try {
        const params = {
          studyYear: this.filters.studyYear || undefined,
          from: this.filters.from || undefined,
          to: this.filters.to || undefined,
        };
        if (this.filters.deleted === true) params.deleted = true;

        const res = await TeacherApi.exportExpenses(params);
        // Assuming the API returns a blob or download URL
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expenses_${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        this.showAlert("success", "تم تصدير البيانات بنجاح");
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر تصدير البيانات"
        );
      } finally {
        this.exporting = false;
      }
    },
  },
};
</script>

<style scoped>
.rotate-on-hover {
  transition: transform 0.3s ease;
}

.rotate-on-hover:hover {
  transform: rotate(180deg);
}
</style>
