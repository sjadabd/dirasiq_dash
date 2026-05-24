<script>
// =====================================================
// Show Subjects v2 — rebuilt 2026-05-17.
// Aligned with backend GET /teacher/subjects (paginated envelope).
// Big changes vs v1:
//   • Brand UI (navy hero + 3 KPI cards) — matches invoices / expenses / reports pages.
//   • Reads response.data.meta.pagination.total (was: response.data.count → undefined).
//   • Switched the API client to /teacher/subjects (legacy /subjects mount was broken — no auth).
//   • Free-text search wired (was hard-coded to "null").
//   • mdi-* icons → ri-* (eslint rule).
//   • Filters persisted as JSON, scroll restoration kept.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue"

export default {
  components: { ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-show-subjects-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "المواد الدراسية", disabled: true },
      ],

      // KPIs (computed from list response)
      kpis: { total: 0, active: 0, deleted: 0 },

      // Table
      table: {
        totalItems: 0,
        Data: [],
        actions: ["تعديل", "حذف", "اعادة تفعيل"],
        loading: false,
        headers: [
          { title: "#",        type: "strong", sortable: false, key: "num" },
          { title: "اسم المادة", type: "link",   sortable: true,  key: "name" },
          { title: "التفاصيل",   type: "text",   sortable: false, key: "description" },
          { title: "الحالة",     type: "status", sortable: true,  key: "status_label" },
          { title: "العمليات",   type: "strong", sortable: false, key: "actions" },
        ],
        tableSettings: {
          options: {
            page: 1,
            limit: 10,
            scroll: 0,
            sortBy: "",
            search: null,
            is_deleted: null,
            sort: JSON.stringify({ key: "createdAt", order: "desc" }),
          },
        },
      },

      // Filters
      searchTerm: "",
      statusOptions: [
        { title: "الكل",        value: null,  color: "primary" },
        { title: "نشطة فقط",    value: false, color: "success" },
        { title: "محذوفة فقط",  value: true,  color: "error" },
      ],

      // Dialogs
      Actions: { open: false, data: null },
      editGrades: { open: false, data: null },
      deleteDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null },
      enableDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null, checkboxLabel: null },

      alert: { open: false, message: null, type: "success" },

      tempScrollTop: 0,
    }
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null")
    if (stored?.tableSettings) this.table.tableSettings = stored.tableSettings
    if (typeof stored?.searchTerm === "string") this.searchTerm = stored.searchTerm
    this.tempScrollTop = stored?.scrollTop || 0
  },

  mounted() {
    window.addEventListener("scroll", this.handleScroll)
    this.getDataAxios()
    this.unwatch = this.$watch(
      () => this.table.Data,
      val => {
        if (val?.length > 0 && this.tempScrollTop) {
          setTimeout(() => {
            window.scrollTo({ top: this.tempScrollTop, behavior: "smooth" })
            this.tempScrollTop = 0
          }, 300)
        }
      },
      { deep: true },
    )
  },

  beforeUnmount() {
    this.unwatch?.()
    window.removeEventListener("scroll", this.handleScroll)
  },

  methods: {
    numberWithComma(v) {
      if (v == null || v === "") return "0"
      
      return Number(v).toLocaleString()
    },
    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true })
    },

    persistState() {
      const stored = JSON.parse(localStorage.getItem(this.keyName) || "{}")

      localStorage.setItem(this.keyName, JSON.stringify({
        ...stored,
        tableSettings: this.table.tableSettings,
        searchTerm: this.searchTerm,
      }))
    },

    handleScroll() {
      const scrollTop = window.scrollY || window.pageYOffset
      const stored = JSON.parse(localStorage.getItem(this.keyName) || "{}")

      stored.scrollTop = scrollTop
      localStorage.setItem(this.keyName, JSON.stringify(stored))
    },

    handleDataAdded(message) {
      this.getDataAxios()
      this.showAlert("success", message)
    },

    reload() {
      localStorage.removeItem(this.keyName)
      this.table.tableSettings.options = {
        page: 1, limit: 10, scroll: 0, sortBy: "",
        search: null, is_deleted: null,
        sort: JSON.stringify({ key: "createdAt", order: "desc" }),
      }
      this.searchTerm = ""
      this.getDataAxios()
    },

    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
        search: !newOptions.search ? null : newOptions.search,
      }
      this.getDataAxios()
    },

    onFilterChange() {
      this.table.tableSettings.options.page = 1
      this.getDataAxios()
    },

    onSearch() {
      this.table.tableSettings.options.page = 1
      this.table.tableSettings.options.search = this.searchTerm?.trim() || null
      this.getDataAxios()
    },

    async getDataAxios() {
      this.table.loading = true
      try {
        this.persistState()

        const res = await TeacherApi.getSubjects(this.table.tableSettings)
        const env = res?.data || {}
        const list = Array.isArray(env.data) ? env.data : []
        const pagination = env.meta?.pagination || {}

        const opts = this.table.tableSettings.options

        this.table.Data = list.map((it, idx) => ({
          ...it,
          num: (opts.page - 1) * opts.limit + idx + 1,
          is_deleted: Boolean(it.deleted_at) || it.is_deleted === true,
          status_label: it.deleted_at || it.is_deleted ? "محذوفة" : "نشطة",
        }))
        this.table.totalItems = pagination.total ?? list.length

        // KPIs derived from the current filter — when looking at "all", we can't
        // know exact active/deleted counts without two roundtrips. Keep it honest:
        // show total for the current scope, and infer active/deleted from the visible scope.
        const isDel = opts.is_deleted
        if (isDel === true) {
          this.kpis = { total: this.table.totalItems, active: 0, deleted: this.table.totalItems }
        } else if (isDel === false) {
          this.kpis = { total: this.table.totalItems, active: this.table.totalItems, deleted: 0 }
        } else {
          // All: count from current page only as a hint (full breakdown needs a separate query).
          const activeOnPage = this.table.Data.filter(r => !r.is_deleted).length
          const deletedOnPage = this.table.Data.length - activeOnPage

          this.kpis = { total: this.table.totalItems, active: activeOnPage, deleted: deletedOnPage }
        }
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || error?.response?.data?.errors?.[0]?.message || "تعذّر جلب المواد")
      } finally {
        this.table.loading = false
      }
    },

    // ----- CRUD -----
    openAdd() { this.Actions.open = true },

    editItem(item) {
      this.editGrades.data = item
      this.editGrades.open = true
    },

    deleteItem(item) {
      this.deleteDialog.data = item
      this.deleteDialog.messages = [
        "سيتم حذف المادة الدراسية حذفاً منطقياً.",
        "يمكن استرجاعها لاحقاً من خلال فلتر «المحذوفة».",
      ]
      this.deleteDialog.title = "تأكيد الحذف"
      this.deleteDialog.confirmButtonText = "حذف المادة"
      this.deleteDialog.open = true
    },
    async handleDelete() {
      try {
        const res = await TeacherApi.deleteSubjects(this.deleteDialog.data.id)

        this.showAlert("success", res?.data?.message || "تم الحذف بنجاح")
        await this.getDataAxios()
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || "تعذّر الحذف")
      } finally {
        this.deleteDialog.open = false
      }
    },

    enableItem(item) {
      this.enableDialog.data = item
      this.enableDialog.messages = [
        "سيتم استرجاع المادة المحذوفة وإعادة تفعيلها.",
        "ستتمكن من تعديلها واستخدامها كالمعتاد.",
      ]
      this.enableDialog.title = "تأكيد الاسترجاع"
      this.enableDialog.confirmButtonText = "استرجاع المادة"
      this.enableDialog.checkboxLabel = "أفهم وأؤكد الاسترجاع"
      this.enableDialog.open = true
    },
    async handleRestore() {
      try {
        const res = await TeacherApi.restoreSubjects(this.enableDialog.data.id)

        this.showAlert("success", res?.data?.message || "تم الاسترجاع بنجاح")
        await this.getDataAxios()
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || "تعذّر الاسترجاع")
      } finally {
        this.enableDialog.open = false
      }
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="subjects-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-book-open-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">
          المواد الدراسية
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          المواد التي تدرّسها — أضف موادك ثم اربطها بكورساتك من صفحة الكورسات.
        </div>
      </div>
      <VBtn
        color="warning"
        prepend-icon="ri-add-line"
        size="large"
        rounded="pill"
        @click="openAdd"
      >
        إضافة مادة
      </VBtn>
    </div>

    <!-- KPIs -->
    <VRow class="mb-4">
      <VCol
        cols="12"
        md="4"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-stack-line"
                color="primary"
                size="24"
              />
              <VChip
                size="small"
                color="primary"
                variant="flat"
              >
                إجمالي
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ numberWithComma(kpis.total) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              عدد المواد
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="4"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-check-double-line"
                color="success"
                size="24"
              />
              <VChip
                size="small"
                color="success"
                variant="flat"
              >
                نشطة
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold text-success">
              {{ numberWithComma(kpis.active) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ table.tableSettings.options.is_deleted == null ? "في الصفحة الحالية" : "إجمالي" }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="4"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card"
        >
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon
                icon="ri-delete-bin-line"
                color="error"
                size="24"
              />
              <VChip
                size="small"
                color="error"
                variant="flat"
              >
                محذوفة
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold text-error">
              {{ numberWithComma(kpis.deleted) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ table.tableSettings.options.is_deleted == null ? "في الصفحة الحالية" : "إجمالي" }}
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
            md="6"
          >
            <VTextField
              v-model="searchTerm"
              prepend-inner-icon="ri-search-line"
              label="بحث في اسم المادة أو الوصف"
              density="comfortable"
              variant="outlined"
              clearable
              @keyup.enter="onSearch"
              @click:clear="onSearch"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="table.tableSettings.options.is_deleted"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              label="حالة المادة"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-toggle-line"
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
            class="d-flex align-center"
          >
            <VBtn
              color="primary"
              variant="tonal"
              block
              prepend-icon="ri-search-2-line"
              @click="onSearch"
            >
              بحث
            </VBtn>
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
          <span class="text-subtitle-1 font-weight-bold">قائمة المواد</span>
          <VSpacer />
          <VChip
            color="primary"
            variant="flat"
            size="small"
          >
            {{ numberWithComma(table.totalItems) }} سجل
          </VChip>
        </div>
        <SmartTable
          :headers="table.headers"
          :items="table.Data"
          :actions="table.actions"
          :loading="table.loading"
          :total-items="table.totalItems"
          :table-options="table.tableSettings.options"
          @update-table-options="updateTableOptions"
          @delete-item="deleteItem"
          @edit-item="editItem"
          @enable-item="enableItem"
        />
      </VCardText>
    </VCard>

    <!-- Dialogs -->
    <AddSubjects
      v-if="Actions.open"
      v-model="Actions.open"
      @close="Actions.open = false"
      @data-added="handleDataAdded"
      @show-alert="showAlert"
    />
    <EditSubjects
      v-if="editGrades.open"
      v-model="editGrades.open"
      :data="editGrades.data"
      @close="editGrades.open = false"
      @data-added="handleDataAdded"
      @show-alert="showAlert"
    />

    <ConfirmDangerDialog
      v-if="deleteDialog.open"
      v-model="deleteDialog.open"
      :messages="deleteDialog.messages"
      :title="deleteDialog.title"
      :confirm-button-text="deleteDialog.confirmButtonText"
      @confirm="handleDelete"
    />
    <ConfirmDangerDialog
      v-if="enableDialog.open"
      v-model="enableDialog.open"
      :messages="enableDialog.messages"
      :title="enableDialog.title"
      :confirm-button-text="enableDialog.confirmButtonText"
      :checkbox-label="enableDialog.checkboxLabel"
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
.subjects-hero {
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
