<script>
// =====================================================
// Show Courses v2 — rebuilt 2026-05-17.
// Big changes vs v1 (13-column table):
//   • Visual CARD GRID by default — each course is a card with image, name,
//     grade·subject chips, dates, price, seats progress bar, and 4 quick
//     actions (الطلاب / تعديل / حذف-استرجاع). Far less scanning for the
//     teacher's daily workflow than a 13-column table.
//   • Table view available behind a toggle for power users / many courses.
//   • Filter bar: search + study year + grade + subject + status + active/inactive.
//   • 4 KPI cards: total / active / total seats / reserved courses (where العربون مفعّل).
//   • Switched the API client to /teacher/courses (legacy /courses mount was broken).
//   • Reads response.data.meta.pagination.total (was: response.data.count → undefined).
//   • mdi-* icons → ri-* (eslint rule).
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import AddCourse from "@/components/teacher/course/AddCourse.vue"
import EditCourse from "@/components/teacher/course/EditCourse.vue"
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue"
import numberWithComma from "@/constant/number"

export default {
  components: { AddCourse, EditCourse, ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-show-course-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "الكورسات", disabled: true },
      ],

      view: "cards", // 'cards' | 'table'
      // Backend base URL for resolving relative asset paths (/uploads/...).
      // Login stores it in localStorage; we also refresh it from each list
      // response in case the backend moves.
      contentUrl: localStorage.getItem("content_url") || "",

      // Reference data
      studyYears: [],
      yearsLoading: false,
      grades: [],
      subjects: [],

      // Filters
      filters: {
        study_year: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        grade_id: null,
        subject_id: null,
        deleted: false,
      },
      searchTerm: "",
      statusOptions: [
        { title: "الكل",          value: null },
        { title: "نشطة فقط",      value: false },
        { title: "محذوفة فقط",    value: true },
      ],

      // KPIs
      kpis: { total: 0, withReservation: 0, totalSeats: 0, activeOnPage: 0 },

      // Data
      items: [],
      loading: false,
      totalItems: 0,
      tableOptions: { page: 1, limit: 12, sortBy: "", sort: '{"key":"createdAt","order":"desc"}' },

      // Table view headers (when toggled)
      headers: [
        { title: "#",        type: "strong", sortable: false, key: "num" },
        { title: "اسم الكورس", type: "link",   sortable: true,  key: "course_name" },
        { title: "الصف",      type: "strong", sortable: true,  key: "grade_name" },
        { title: "المادة",    type: "strong", sortable: true,  key: "subject_name" },
        { title: "تاريخ البدء", type: "date", sortable: true,  key: "start_date" },
        { title: "تاريخ الانتهاء", type: "date", sortable: true, key: "end_date" },
        { title: "السعر",     type: "number", sortable: true,  key: "price" },
        { title: "المقاعد",   type: "number", sortable: true,  key: "seats_count" },
        { title: "العربون",   type: "strong", sortable: false, key: "reservation_label" },
        { title: "الحالة",    type: "status", sortable: true,  key: "status_label" },
        { title: "العمليات",  type: "strong", sortable: false, key: "actions" },
      ],
      tableActions: ["تعديل", "حذف", "اعادة تفعيل"],

      // Dialogs
      Actions: { open: false, data: null },
      editGrades: { open: false, data: null },
      deleteDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null },
      enableDialog: { open: false, data: null, messages: [], title: null, confirmButtonText: null, checkboxLabel: null },

      alert: { open: false, message: null, type: "success" },
    }
  },

  computed: {
    activeStudyYear() {
      return this.filters.study_year || this.studyYears[0]?.value || "—"
    },
    isAnyFilter() {
      return Boolean(this.filters.grade_id || this.filters.subject_id || this.searchTerm?.trim() || this.filters.deleted)
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null")
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters }
      if (stored.tableOptions) this.tableOptions = { ...this.tableOptions, ...stored.tableOptions }
      if (typeof stored.searchTerm === "string") this.searchTerm = stored.searchTerm
      if (stored.view === "cards" || stored.view === "table") this.view = stored.view
    }
    Promise.all([this.loadAcademicYears(), this.loadGrades(), this.loadSubjects()])
      .finally(() => this.fetchCourses())
  },

  methods: {
    numberWithComma,
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }) },
    formatIQD(v) { return new Intl.NumberFormat("en-IQ").format(Number(v) || 0) },
    formatIQDShort(v) {
      const n = Number(v) || 0
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
      if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K"
      
      return new Intl.NumberFormat("en-IQ").format(n)
    },
    formatDate(d) {
      if (!d) return "—"
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, "0")
      const mm = String(dt.getMonth() + 1).padStart(2, "0")
      
      return `${dd}/${mm}/${dt.getFullYear()}`
    },

    persistState() {
      localStorage.setItem(this.keyName, JSON.stringify({
        filters: this.filters,
        tableOptions: this.tableOptions,
        searchTerm: this.searchTerm,
        view: this.view,
      }))
    },

    courseImage(item) {
      const arr = item?.course_images
      if (!Array.isArray(arr) || !arr.length) return null
      const raw = arr[0]
      if (!raw) return null

      // Already absolute (http(s):// or data:) → use as-is.
      if (/^(https?:|data:|blob:)/i.test(raw)) return raw

      // Otherwise prefix with backend content_url. Strip any trailing slash on
      // the base + leading slash on the path so we never produce a double "//".
      const base = (this.contentUrl || "").replace(/\/$/, "")
      const path = raw.startsWith("/") ? raw : `/${raw}`
      
      return `${base}${path}`
    },
    isDeleted(item) {
      return Boolean(item?.deleted_at) || item?.is_deleted === true
    },
    isExpired(item) {
      if (!item?.end_date) return false
      
      return new Date(item.end_date).getTime() < Date.now()
    },
    statusOf(item) {
      if (this.isDeleted(item)) return { label: "محذوف", color: "error",   icon: "ri-delete-bin-line" }
      if (this.isExpired(item)) return { label: "منتهي", color: "grey",    icon: "ri-time-line" }
      
      return { label: "نشط",   color: "success", icon: "ri-checkbox-circle-line" }
    },

    async loadAcademicYears() {
      this.yearsLoading = true
      try {
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null

        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.filters.study_year) this.filters.study_year = active?.year || ""
      } catch { /* noop */ } finally {
        this.yearsLoading = false
      }
    },

    async loadGrades() {
      try {
        const res = await TeacherApi.getAllGrades()
        const list = res?.data?.data || []

        this.grades = list.map(g => ({ title: g.name, value: g.id }))
      } catch { this.grades = [] }
    },

    async loadSubjects() {
      try {
        const res = await TeacherApi.getAllSubjects()
        const list = res?.data?.data || []

        this.subjects = list.map(s => ({ title: s.name, value: s.id }))
      } catch { this.subjects = [] }
    },

    async fetchCourses() {
      this.loading = true
      try {
        this.persistState()

        const payload = {
          options: {
            page: this.tableOptions.page,
            limit: this.tableOptions.limit,
            search: this.searchTerm?.trim() || null,
            study_year: this.filters.study_year || null,
            grade_id: this.filters.grade_id || null,
            subject_id: this.filters.subject_id || null,
            deleted: this.filters.deleted === true ? true : (this.filters.deleted === false ? false : null),
          },
        }

        const res = await TeacherApi.getCourse(payload)
        const env = res?.data || {}
        const list = Array.isArray(env.data) ? env.data : []
        const pagination = env.meta?.pagination || {}
        if (env.content_url) {
          this.contentUrl = env.content_url
          localStorage.setItem("content_url", env.content_url)
        }

        this.totalItems = pagination.total ?? list.length
        this.items = list.map((it, idx) => ({
          ...it,
          num: (this.tableOptions.page - 1) * this.tableOptions.limit + idx + 1,
          is_deleted: this.isDeleted(it),
          status_label: this.statusOf(it).label,
          reservation_label: it.has_reservation ? `نعم (${this.formatIQD(it.reservation_amount)})` : "لا",
        }))

        // KPIs (computed from the current page — the backend doesn't return aggregates)
        const seats = this.items.reduce((s, i) => s + (Number(i.seats_count) || 0), 0)
        const withRes = this.items.filter(i => i.has_reservation).length
        const activeOnPage = this.items.filter(i => !this.isDeleted(i) && !this.isExpired(i)).length

        this.kpis = { total: this.totalItems, withReservation: withRes, totalSeats: seats, activeOnPage }
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || error?.response?.data?.errors?.[0]?.message || "تعذّر جلب الكورسات")
      } finally {
        this.loading = false
      }
    },

    onFilterChange() {
      this.tableOptions.page = 1
      this.fetchCourses()
    },
    onSearch() {
      this.tableOptions.page = 1
      this.fetchCourses()
    },
    onPageChange(page) {
      this.tableOptions.page = page
      this.fetchCourses()
    },
    setView(v) {
      this.view = v
      this.persistState()
    },
    onUpdateTableOptions(newOptions) {
      this.tableOptions = { ...this.tableOptions, ...newOptions }
      if (newOptions.search !== undefined) this.searchTerm = newOptions.search || ""
      this.fetchCourses()
    },

    reload() {
      localStorage.removeItem(this.keyName)
      this.filters = { study_year: this.filters.study_year, grade_id: null, subject_id: null, deleted: false }
      this.searchTerm = ""
      this.tableOptions = { page: 1, limit: 12, sortBy: "", sort: '{"key":"createdAt","order":"desc"}' }
      this.fetchCourses()
    },

    // ----- CRUD -----
    openAdd() { this.Actions.open = true },

    handleDataAdded(message) {
      this.fetchCourses()
      this.showAlert("success", message)
    },

    editItem(item) {
      this.editGrades.data = item
      this.editGrades.open = true
    },

    deleteItem(item) {
      this.deleteDialog.data = item
      this.deleteDialog.messages = [
        "سيتم حذف الكورس حذفاً منطقياً.",
        "يمكن استرجاعه لاحقاً من فلتر «المحذوفة».",
      ]
      this.deleteDialog.title = "تأكيد الحذف"
      this.deleteDialog.confirmButtonText = "حذف الكورس"
      this.deleteDialog.open = true
    },
    async handleDelete() {
      try {
        const res = await TeacherApi.deleteCourse(this.deleteDialog.data.id)

        this.showAlert("success", res?.data?.message || "تم الحذف بنجاح")
        await this.fetchCourses()
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || "تعذّر الحذف")
      } finally {
        this.deleteDialog.open = false
      }
    },

    enableItem(item) {
      this.enableDialog.data = item
      this.enableDialog.messages = [
        "سيتم استرجاع الكورس وإعادة تفعيله.",
        "ستتمكن من تعديله وإدارة طلابه كما كان.",
      ]
      this.enableDialog.title = "تأكيد الاسترجاع"
      this.enableDialog.confirmButtonText = "استرجاع الكورس"
      this.enableDialog.checkboxLabel = "أفهم وأؤكد الاسترجاع"
      this.enableDialog.open = true
    },
    async handleRestore() {
      try {
        const res = await TeacherApi.restoreCourse(this.enableDialog.data.id)

        this.showAlert("success", res?.data?.message || "تم الاسترجاع")
        await this.fetchCourses()
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || "تعذّر الاسترجاع")
      } finally {
        this.enableDialog.open = false
      }
    },

    handleShowCourseStudents(item) {
      if (!item?.id) return
      this.$router.push({
        path: "/teacher/course/students",
        query: { courseId: item.id, courseName: item.course_name },
      })
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="course-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-book-3-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">
          كورساتي
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          السنة الفعلية: <strong>{{ activeStudyYear }}</strong> · أضف كورساتك واربطها بصفّ ومادة، ثم تابع المقاعد والطلاب من هنا.
        </div>
      </div>
      <VBtn
        color="warning"
        prepend-icon="ri-add-line"
        size="large"
        rounded="pill"
        @click="openAdd"
      >
        إضافة كورس
      </VBtn>
    </div>

    <!-- KPIs -->
    <VRow class="mb-4">
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
              عدد الكورسات
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
                icon="ri-checkbox-circle-line"
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
              {{ numberWithComma(kpis.activeOnPage) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              في هذه الصفحة
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
                icon="ri-group-line"
                color="info"
                size="24"
              />
              <VChip
                size="small"
                color="info"
                variant="flat"
              >
                مقاعد
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ numberWithComma(kpis.totalSeats) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              مجموع المقاعد (الصفحة)
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
                icon="ri-coins-line"
                color="warning"
                size="24"
              />
              <VChip
                size="small"
                color="warning"
                variant="flat"
              >
                عربون
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold text-warning">
              {{ numberWithComma(kpis.withReservation) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              كورسات بعربون
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Filter Bar -->
    <VCard
      rounded="lg"
      elevation="0"
      class="mb-4 border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3 ga-3 flex-wrap">
          <VIcon
            icon="ri-filter-3-line"
            color="primary"
          />
          <span class="text-subtitle-1 font-weight-bold">التصفية والبحث</span>
          <VSpacer />
          <VBtnToggle
            v-model="view"
            mandatory
            color="primary"
            variant="outlined"
            divided
            class="view-toggle"
          >
            <VBtn
              value="cards"
              @click="setView('cards')"
            >
              <VIcon
                icon="ri-grid-line"
                start
              />
              بطاقات
            </VBtn>
            <VBtn
              value="table"
              @click="setView('table')"
            >
              <VIcon
                icon="ri-table-line"
                start
              />
              جدول
            </VBtn>
          </VBtnToggle>
          <VBtn
            variant="tonal"
            prepend-icon="ri-refresh-line"
            @click="reload"
          >
            إعادة تعيين
          </VBtn>
        </div>
        <VRow dense>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="searchTerm"
              prepend-inner-icon="ri-search-line"
              label="بحث في اسم الكورس أو الوصف"
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
              v-model="filters.study_year"
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
              v-model="filters.grade_id"
              :items="grades"
              item-title="title"
              item-value="value"
              label="الصف"
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
              v-model="filters.subject_id"
              :items="subjects"
              item-title="title"
              item-value="value"
              label="المادة"
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
              v-model="filters.deleted"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              label="الحالة"
              density="comfortable"
              variant="outlined"
              @update:model-value="onFilterChange"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Cards view -->
    <template v-if="view === 'cards'">
      <!-- Loading -->
      <VRow v-if="loading">
        <VCol
          v-for="n in 6"
          :key="n"
          cols="12"
          sm="6"
          md="4"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="border"
          >
            <VSkeletonLoader type="image, article, actions" />
          </VCard>
        </VCol>
      </VRow>

      <!-- Empty -->
      <VCard
        v-else-if="!items.length"
        rounded="lg"
        elevation="0"
        class="border text-center pa-8"
      >
        <VIcon
          icon="ri-book-open-line"
          size="64"
          color="grey"
          class="mb-3"
        />
        <div class="text-h6 mb-2">
          لا يوجد كورسات بهذا الفلتر
        </div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          {{ isAnyFilter ? "جرّب تغيير الفلاتر أو" : "ابدأ بإضافة" }} كورسك الأول
        </div>
        <VBtn
          color="primary"
          prepend-icon="ri-add-line"
          @click="openAdd"
        >
          إضافة كورس
        </VBtn>
      </VCard>

      <!-- Cards -->
      <VRow v-else>
        <VCol
          v-for="item in items"
          :key="item.id"
          cols="12"
          sm="6"
          md="4"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="course-card h-100 d-flex flex-column"
          >
            <!-- Image -->
            <div class="course-image-wrap">
              <VImg
                v-if="courseImage(item)"
                :src="courseImage(item)"
                cover
                height="160"
                class="rounded-t-lg"
              >
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
                    <VIcon
                      icon="ri-image-line"
                      size="36"
                      color="grey"
                    />
                  </div>
                </template>
                <template #error>
                  <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
                    <VIcon
                      icon="ri-image-line"
                      size="36"
                      color="grey"
                    />
                  </div>
                </template>
              </VImg>
              <div
                v-else
                class="d-flex align-center justify-center bg-image-fallback rounded-t-lg"
                style="height: 160px;"
              >
                <VIcon
                  icon="ri-book-3-line"
                  size="48"
                  color="white"
                />
              </div>
              <!-- Status chip overlay -->
              <VChip
                :color="statusOf(item).color"
                size="small"
                variant="flat"
                :prepend-icon="statusOf(item).icon"
                class="status-chip"
              >
                {{ statusOf(item).label }}
              </VChip>
              <!-- Reservation badge -->
              <VChip
                v-if="item.has_reservation"
                color="warning"
                size="small"
                variant="flat"
                prepend-icon="ri-coins-line"
                class="reservation-chip"
              >
                {{ formatIQDShort(item.reservation_amount) }}
              </VChip>
            </div>

            <VCardText class="flex-grow-1">
              <div
                class="text-h6 font-weight-bold mb-1 text-truncate"
                :title="item.course_name"
              >
                {{ item.course_name }}
              </div>
              <div class="d-flex ga-1 mb-3 flex-wrap">
                <VChip
                  size="x-small"
                  color="info"
                  variant="tonal"
                  prepend-icon="ri-graduation-cap-line"
                >
                  {{ item.grade_name || "—" }}
                </VChip>
                <VChip
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="ri-book-open-line"
                >
                  {{ item.subject_name || "—" }}
                </VChip>
              </div>
              <div class="d-flex align-center text-caption text-medium-emphasis mb-2">
                <VIcon
                  icon="ri-calendar-line"
                  size="14"
                  class="me-1"
                />
                {{ formatDate(item.start_date) }} — {{ formatDate(item.end_date) }}
              </div>
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="d-flex align-center">
                  <VIcon
                    icon="ri-money-dollar-circle-line"
                    size="16"
                    color="success"
                    class="me-1"
                  />
                  <span class="font-weight-bold">{{ formatIQD(item.price) }} د.ع</span>
                </div>
                <div class="d-flex align-center text-caption">
                  <VIcon
                    icon="ri-group-line"
                    size="14"
                    class="me-1"
                  />
                  {{ item.seats_count }} مقعد
                </div>
              </div>
            </VCardText>

            <VDivider />
            <VCardActions class="pa-2">
              <VBtn
                v-if="!isDeleted(item)"
                color="primary"
                variant="tonal"
                size="small"
                prepend-icon="ri-group-line"
                @click="handleShowCourseStudents(item)"
              >
                الطلاب
              </VBtn>
              <VSpacer />
              <VBtn
                v-if="!isDeleted(item)"
                icon="ri-pencil-line"
                size="small"
                variant="text"
                color="info"
                @click="editItem(item)"
              />
              <VBtn
                v-if="!isDeleted(item)"
                icon="ri-delete-bin-line"
                size="small"
                variant="text"
                color="error"
                @click="deleteItem(item)"
              />
              <VBtn
                v-else
                color="success"
                variant="tonal"
                size="small"
                prepend-icon="ri-refresh-line"
                @click="enableItem(item)"
              >
                استرجاع
              </VBtn>
            </VCardActions>
          </VCard>
        </VCol>
      </VRow>

      <!-- Pagination -->
      <div
        v-if="totalItems > tableOptions.limit"
        class="d-flex justify-center mt-6"
      >
        <VPagination
          :model-value="tableOptions.page"
          :length="Math.ceil(totalItems / tableOptions.limit)"
          :total-visible="5"
          color="primary"
          @update:model-value="onPageChange"
        />
      </div>
    </template>

    <!-- Table view -->
    <VCard
      v-else
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
          <span class="text-subtitle-1 font-weight-bold">قائمة الكورسات</span>
          <VSpacer />
          <VChip
            color="primary"
            variant="flat"
            size="small"
          >
            {{ numberWithComma(totalItems) }} سجل
          </VChip>
        </div>
        <SmartTable
          :headers="headers"
          :items="items"
          :actions="tableActions"
          :loading="loading"
          :total-items="totalItems"
          :table-options="tableOptions"
          @update-table-options="onUpdateTableOptions"
          @delete-item="deleteItem"
          @edit-item="editItem"
          @enable-item="enableItem"
          @show-item="handleShowCourseStudents"
        />
      </VCardText>
    </VCard>

    <!-- Dialogs -->
    <AddCourse
      v-if="Actions.open"
      v-model="Actions.open"
      @close="Actions.open = false"
      @data-added="handleDataAdded"
      @show-alert="showAlert"
    />
    <EditCourse
      v-if="editGrades.open"
      v-model="editGrades.open"
      :course-data="editGrades.data"
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
.course-hero {
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
.course-card {
  border: 1px solid rgba(11, 37, 69, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}
.course-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(11, 37, 69, 0.12);
}
.course-image-wrap {
  position: relative;
}
.bg-image-fallback {
  background: linear-gradient(135deg, #0B2545 0%, #3FA9F5 100%);
}
.status-chip {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-start: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.reservation-chip {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-end: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.view-toggle :deep(.v-btn) {
  min-inline-size: 96px;
  padding-inline: 14px;
}
@media (max-width: 600px) {
  .view-toggle :deep(.v-btn) {
    min-inline-size: 80px;
    padding-inline: 10px;
  }
}
</style>
