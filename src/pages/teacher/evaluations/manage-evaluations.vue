<script>
// =====================================================
// Manage Evaluations v2 — rebuilt 2026-05-17.
// Bugs fixed:
//   • Levels are NUMBERS 0–10 (per backend `evaluationLevelSchema`), NOT enum
//     strings — the v1 `levelLabel("excellent"|"very_good"|…)` always returned
//     "—".
//   • Pagination read corrected to `data.meta.pagination.total` (was
//     `data.pagination.total` → undefined, total stuck at 0).
//   • `studyYear` was being sent but silently dropped (schema doesn't accept it).
//     Replaced with `from/to` date range (which IS accepted).
// UX upgrade:
//   • Brand hero + KPIs (total / unique students / latest date / avg score).
//   • Card grid view: avatar + student + course + colored score chips per axis.
//   • Table view kept behind toggle for power users.
//   • Filter bar with date range + student filter + client-side search.
//   • mdi-* icons replaced.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"

const AXES = [
  { key: "scientific_level",      label: "علمي",            icon: "ri-book-2-line" },
  { key: "behavioral_level",      label: "سلوكي",           icon: "ri-emotion-happy-line" },
  { key: "attendance_level",      label: "الحضور",          icon: "ri-calendar-check-line" },
  { key: "homework_preparation",  label: "الواجب",          icon: "ri-pencil-line" },
  { key: "participation_level",   label: "المشاركة",        icon: "ri-chat-1-line" },
  { key: "instruction_following", label: "اتباع التعليمات", icon: "ri-checkbox-line" },
]

// DB stores enum strings (migration 023). We map each to a 0-10 score for
// colour-coding and computing averages on the client.
const RATING_MAP = {
  excellent: { label: "ممتاز",    short: "ممتاز",  score: 10 },
  very_good: { label: "جيد جداً", short: "ج.جداً", score: 8 },
  good: { label: "جيد",      short: "جيد",    score: 6 },
  fair: { label: "مقبول",    short: "مقبول",  score: 4 },
  weak: { label: "ضعيف",     short: "ضعيف",   score: 2 },
}

export default {
  name: "TeacherEvaluationsManage",
  data() {
    return {
      keyName: "teacher-manage-evaluations-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "تقييمات الطلاب", disabled: true },
      ],

      view: "cards", // 'cards' | 'table'

      // Reference
      studyYears: [],
      yearsLoading: false,

      // Filters
      filters: {
        studyYear: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        from: null,
        to: null,
      },
      searchTerm: "",

      // Data
      items: [],
      loading: false,
      totalItems: 0,
      tableOptions: { page: 1, limit: 12, search: null },

      // Table headers (when view='table')
      headers: [
        { title: "#",      type: "strong", key: "num",                       sortable: false },
        { title: "الطالب", type: "link",   key: "student_name",              sortable: true },
        { title: "الكورس", type: "strong", key: "course_name",               sortable: false },
        { title: "التاريخ", type: "date",  key: "eval_date",                 sortable: true },
        { title: "علمي",   type: "strong", key: "scientific_level_display",  sortable: false },
        { title: "سلوكي",  type: "strong", key: "behavioral_level_display",  sortable: false },
        { title: "حضور",   type: "strong", key: "attendance_level_display",  sortable: false },
        { title: "واجب",   type: "strong", key: "homework_preparation_display", sortable: false },
        { title: "مشاركة", type: "strong", key: "participation_level_display", sortable: false },
        { title: "تعليمات", type: "strong", key: "instruction_following_display", sortable: false },
        { title: "المعدل", type: "strong", key: "avgDisplay",                sortable: false },
        { title: "العمليات", type: "strong", key: "actions",                 sortable: false },
      ],
      tableActions: ["عرض", "تعديل"],

      AXES,
      alert: { open: false, type: "success", message: "" },
    }
  },

  computed: {
    activeStudyYear() {
      return this.filters.studyYear || this.studyYears[0]?.value || "—"
    },
    filteredItems() {
      const q = this.searchTerm?.trim().toLowerCase()
      if (!q) return this.items
      
      return this.items.filter(x =>
        String(x.student_name || "").toLowerCase().includes(q)
        || String(x.course_name || "").toLowerCase().includes(q),
      )
    },
    uniqueStudents() {
      const set = new Set(this.items.map(x => x.student_id || x.student?.id).filter(Boolean))
      
      return set.size
    },
    avgScore() {
      let sum = 0; let count = 0
      for (const it of this.items) {
        const v = this.itemAvg(it)
        if (Number.isFinite(v)) { sum += v; count++ }
      }
      
      return count ? Math.round((sum / count) * 10) / 10 : 0
    },
    latestDate() {
      const dates = this.items.map(x => x.eval_date).filter(Boolean).sort()
      
      return dates.length ? dates[dates.length - 1] : null
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null")
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters }
      if (typeof stored.searchTerm === "string") this.searchTerm = stored.searchTerm
      if (stored.view === "cards" || stored.view === "table") this.view = stored.view
    }
    this.loadAcademicYears()
  },

  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }) },
    formatDate(d) {
      if (!d) return "—"
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, "0")
      const mm = String(dt.getMonth() + 1).padStart(2, "0")
      
      return `${dd}/${mm}/${dt.getFullYear()}`
    },
    studentInitials(name) {
      if (!name) return "?"
      const parts = String(name).trim().split(/\s+/)
      
      return parts.length === 1 ? parts[0].charAt(0) : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0))
    },

    // 0..10 score → colour bucket (used for averages and per-axis chips).
    scoreColor(v) {
      const n = Number(v)
      if (!Number.isFinite(n)) return "grey"
      if (n >= 8) return "success"
      if (n >= 6) return "info"
      if (n >= 4) return "warning"
      
      return "error"
    },

    // Enum string ('excellent' | ...) → display + colour for the chips.
    ratingInfo(v) {
      const info = RATING_MAP[String(v || "").toLowerCase()]
      if (!info) return { label: "—", short: "—", score: null, color: "grey" }
      
      return { ...info, color: this.scoreColor(info.score) }
    },
    scoreDisplay(v) {
      // Number → "X/10"; string enum → Arabic label.
      if (typeof v === "number") return Number.isFinite(v) ? `${v}/10` : "—"
      
      return this.ratingInfo(v).short
    },

    // Average of an evaluation row, computed by mapping each enum axis to its 0-10 score.
    itemAvg(it) {
      const scores = AXES
        .map(a => this.ratingInfo(it[a.key]).score)
        .filter(x => Number.isFinite(x))

      if (!scores.length) return null
      
      return scores.reduce((s, x) => s + x, 0) / scores.length
    },

    persistState() {
      localStorage.setItem(this.keyName, JSON.stringify({
        filters: this.filters,
        searchTerm: this.searchTerm,
        view: this.view,
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
      } catch { /* noop */ }
      finally {
        this.yearsLoading = false
        this.fetchEvaluations()
      }
    },

    async fetchEvaluations() {
      this.loading = true
      try {
        this.persistState()


        // Schema only accepts: page, limit, studentId, from, to. studyYear is
        // silently dropped — we don't send it.
        const params = {
          page: this.tableOptions.page,
          limit: this.tableOptions.limit,
        }

        if (this.filters.from) params.from = this.filters.from
        if (this.filters.to)   params.to   = this.filters.to
        const res = await TeacherApi.listEvaluations(params)
        const env = res?.data || {}
        const list = Array.isArray(env.data) ? env.data : []
        const pagination = env.meta?.pagination || {}

        this.totalItems = pagination.total ?? list.length
        this.items = list.map((x, i) => {
          const enriched = {
            ...x,
            num: (this.tableOptions.page - 1) * this.tableOptions.limit + (i + 1),
            student_name: x.student?.name || x.student_name || "—",
            course_name: x.course?.name || x.course_name || "—",
          }

          for (const a of AXES) {
            enriched[`${a.key}_display`] = this.ratingInfo(x[a.key]).short
          }
          const avg = this.itemAvg(x)

          enriched.avg = avg

          // Average is a 0-10 numeric → keep "X/10" format for the table cell.
          enriched.avgDisplay = avg != null ? `${Math.round(avg * 10) / 10}/10` : "—"
          
          return enriched
        })
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر جلب التقييمات")
      } finally {
        this.loading = false
      }
    },

    onFilterChange() { this.tableOptions.page = 1; this.fetchEvaluations() },
    onPageChange(p) { this.tableOptions.page = p; this.fetchEvaluations() },
    onSearch() { /* client-side only — filteredItems handles it */ this.persistState() },
    setView(v) { this.view = v; this.persistState() },
    reload() {
      localStorage.removeItem(this.keyName)
      this.filters = { studyYear: this.filters.studyYear, from: null, to: null }
      this.searchTerm = ""
      this.tableOptions = { page: 1, limit: 12, search: null }
      this.fetchEvaluations()
    },
    updateOptions(opts) {
      this.tableOptions = { ...this.tableOptions, ...opts }
      this.fetchEvaluations()
    },

    openDetails(row) {
      this.$router.push({ name: "teacher-evaluations-evaluation-details", query: { id: row.id } })
    },
    goToBulk() {
      this.$router.push({ name: "teacher-evaluations-bulk-upsert-evaluations" })
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="eval-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-star-smile-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">
          تقييمات الطلاب
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          سجّل تقييم الطلاب على 6 محاور (0–10 لكل محور). السنة: <strong>{{ activeStudyYear }}</strong>
        </div>
      </div>
      <VBtn
        color="warning"
        prepend-icon="ri-add-line"
        size="large"
        rounded="pill"
        @click="goToBulk"
      >
        إضافة تقييمات
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
              {{ Number(totalItems).toLocaleString() }}
            </div>
            <div class="text-caption text-medium-emphasis">
              تقييم مسجّل
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
                طلاب
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold">
              {{ uniqueStudents }}
            </div>
            <div class="text-caption text-medium-emphasis">
              طالب مختلف
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
                icon="ri-line-chart-line"
                color="success"
                size="24"
              />
              <VChip
                size="small"
                :color="scoreColor(avgScore)"
                variant="flat"
              >
                {{ scoreDisplay(avgScore) }}
              </VChip>
            </div>
            <div
              class="text-h5 font-weight-bold"
              :class="`text-${scoreColor(avgScore)}`"
            >
              {{ avgScore }}
            </div>
            <div class="text-caption text-medium-emphasis">
              المعدّل العام
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
                icon="ri-calendar-line"
                color="warning"
                size="24"
              />
              <VChip
                size="small"
                color="warning"
                variant="flat"
              >
                آخر
              </VChip>
            </div>
            <div class="text-h6 font-weight-bold">
              {{ formatDate(latestDate) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              آخر تاريخ تقييم
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Filter bar -->
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
            md="5"
          >
            <VTextField
              v-model="searchTerm"
              prepend-inner-icon="ri-search-line"
              label="بحث عن طالب أو كورس (في الصفحة الحالية)"
              density="comfortable"
              variant="outlined"
              clearable
              @click:clear="onSearch"
              @input="onSearch"
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

    <!-- Loading skeleton -->
    <VRow v-if="loading && !items.length">
      <VCol
        v-for="n in 6"
        :key="n"
        cols="12"
        md="6"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="border"
        >
          <VSkeletonLoader type="article" />
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
        icon="ri-star-line"
        size="64"
        color="grey"
        class="mb-3"
      />
      <div class="text-h6 mb-2">
        لا توجد تقييمات بهذا الفلتر
      </div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        ابدأ بإضافة تقييمات اليوم لمتابعة تقدّم طلابك.
      </div>
      <VBtn
        color="primary"
        prepend-icon="ri-add-line"
        @click="goToBulk"
      >
        إضافة تقييمات
      </VBtn>
    </VCard>

    <!-- CARDS view -->
    <template v-else-if="view === 'cards'">
      <VAlert
        v-if="!filteredItems.length"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        لا يوجد طلاب يطابقون "{{ searchTerm }}".
      </VAlert>
      <VRow>
        <VCol
          v-for="it in filteredItems"
          :key="it.id"
          cols="12"
          md="6"
        >
          <VCard
            rounded="lg"
            elevation="0"
            class="eval-card h-100"
          >
            <VCardText>
              <!-- Header: student + course + date + avg -->
              <div class="d-flex align-center ga-3 mb-3">
                <VAvatar
                  :color="scoreColor(it.avg)"
                  size="44"
                >
                  <span class="text-subtitle-1 font-weight-bold">{{ studentInitials(it.student_name) }}</span>
                </VAvatar>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="text-subtitle-1 font-weight-bold text-truncate">
                    {{ it.student_name }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-truncate">
                    <VIcon
                      icon="ri-book-3-line"
                      size="12"
                      class="me-1"
                    />
                    {{ it.course_name }}
                    <span class="mx-1">·</span>
                    <VIcon
                      icon="ri-calendar-line"
                      size="12"
                      class="me-1"
                    />
                    {{ formatDate(it.eval_date) }}
                  </div>
                </div>
                <div class="text-end">
                  <VChip
                    :color="scoreColor(it.avg)"
                    variant="flat"
                    size="default"
                  >
                    <VIcon
                      icon="ri-trophy-line"
                      size="14"
                      start
                    />
                    {{ it.avgDisplay }}
                  </VChip>
                  <div class="text-caption text-medium-emphasis mt-1">
                    المعدّل
                  </div>
                </div>
              </div>

              <!-- Axis chips: per-axis Arabic rating label with score-derived color -->
              <div class="d-flex flex-wrap ga-2">
                <div
                  v-for="a in AXES"
                  :key="a.key"
                  class="axis-chip"
                >
                  <VIcon
                    :icon="a.icon"
                    size="14"
                    class="me-1"
                    :color="ratingInfo(it[a.key]).color"
                  />
                  <span class="text-caption font-weight-medium">{{ a.label }}</span>
                  <VChip
                    :color="ratingInfo(it[a.key]).color"
                    variant="flat"
                    size="x-small"
                    class="ms-2"
                  >
                    {{ ratingInfo(it[a.key]).short }}
                  </VChip>
                </div>
              </div>

              <!-- Notes / guidance preview -->
              <VAlert
                v-if="it.guidance"
                type="info"
                variant="tonal"
                density="compact"
                class="mt-3"
                prepend-icon="ri-lightbulb-line"
              >
                <span class="text-body-2">{{ it.guidance }}</span>
              </VAlert>
              <div
                v-if="it.notes"
                class="text-caption text-medium-emphasis mt-2"
              >
                <VIcon
                  icon="ri-sticky-note-line"
                  size="12"
                  class="me-1"
                />
                {{ it.notes }}
              </div>
            </VCardText>

            <VDivider />
            <VCardActions class="pa-2">
              <VSpacer />
              <VBtn
                variant="text"
                size="small"
                prepend-icon="ri-eye-line"
                @click="openDetails(it)"
              >
                عرض / تعديل
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

    <!-- TABLE view -->
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
          <span class="text-subtitle-1 font-weight-bold">قائمة التقييمات</span>
          <VSpacer />
          <VChip
            color="primary"
            variant="flat"
            size="small"
          >
            {{ Number(totalItems).toLocaleString() }} سجل
          </VChip>
        </div>
        <SmartTable
          :headers="headers"
          :items="items"
          :actions="tableActions"
          :loading="loading"
          :total-items="totalItems"
          :table-options="tableOptions"
          @update-table-options="updateOptions"
          @show-item="openDetails"
          @edit-item="openDetails"
        />
      </VCardText>
    </VCard>

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
.eval-hero {
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
.eval-card {
  border: 1px solid rgba(11, 37, 69, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.eval-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(11, 37, 69, 0.1);
}
.view-toggle :deep(.v-btn) {
  min-inline-size: 90px;
  padding-inline: 12px;
}
.axis-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(11, 37, 69, 0.04);
  border: 1px solid rgba(11, 37, 69, 0.06);
}
</style>
