<script>
// =====================================================
// Session attendance v2 — rebuilt 2026-05-17.
// Built for speed: one-click status per student + bulk marking + search +
// live stats. No more 2-click dropdowns per row.
//
// Big changes vs v1:
//   • Hero with the session context (title, course, day, time).
//   • Live stats strip: حاضر / غائب / إجازة / لم يُحدّد.
//   • Bulk actions: "تعليم الكل حاضر / غائب", "مسح الكل" — one click for
//     the common case (everyone present).
//   • Per-row segment control (3 buttons) instead of a dropdown — single
//     click changes status, and the row tints to match.
//   • Search box for long lists.
//   • Sticky save bar with unsaved-changes indicator.
//   • Empty state explains "add students first" with a CTA.
//   • Removed Vue 2 leftover (this.$set) and mdi-* icons.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import { formatTime12 } from "@/utils/time-format"

const STATUSES = [
  { value: "present", label: "حاضر", color: "success", icon: "ri-check-line",      bg: "rgba(16, 185, 129, 0.08)" },
  { value: "absent",  label: "غائب", color: "error",   icon: "ri-close-line",      bg: "rgba(229, 57, 53, 0.08)" },
  { value: "leave",   label: "إجازة", color: "warning", icon: "ri-time-line",       bg: "rgba(255, 138, 0, 0.08)" },
]

export default {
  name: "TeacherSessionAttendance",
  data() {
    const today = new Date().toISOString().slice(0, 10)
    
    return {
      sessionId: this.$route.params.id,
      sessionInfo: null,

      filters: { date: today },
      loading: false,
      saving: false,
      searchTerm: "",

      students: [],       // [{ student_id, student_name, grade_name, study_year }]
      attendanceMap: {},  // { [student_id]: 'present' | 'absent' | 'leave' | null }
      originalMap: {},    // snapshot for dirty detection

      STATUSES,
      breadcrumbs: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "الجدول الأسبوعي", disabled: false, to: "/teacher/sessions/manage-sessions" },
        { title: "تسجيل الحضور", disabled: true },
      ],
      alert: { open: false, message: null, type: "success" },
    }
  },

  computed: {
    weekdayNames() {
      return ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    },
    sessionWeekday() {
      const w = this.sessionInfo?.weekday
      
      return Number.isInteger(w) ? this.weekdayNames[w] : "—"
    },
    isToday() {
      return this.filters.date === new Date().toISOString().slice(0, 10)
    },
    filteredStudents() {
      const q = this.searchTerm?.trim().toLowerCase()
      if (!q) return this.students
      
      return this.students.filter(s =>
        String(s.student_name || "").toLowerCase().includes(q)
        || String(s.grade_name || "").toLowerCase().includes(q),
      )
    },
    stats() {
      const out = { present: 0, absent: 0, leave: 0, unset: 0 }
      for (const s of this.students) {
        const v = this.attendanceMap[s.student_id]
        if (v === "present") out.present++
        else if (v === "absent") out.absent++
        else if (v === "leave") out.leave++
        else out.unset++
      }
      
      return out
    },
    presentRate() {
      if (!this.students.length) return 0
      
      return Math.round((this.stats.present / this.students.length) * 100)
    },
    isDirty() {
      for (const sid of Object.keys(this.attendanceMap)) {
        if ((this.attendanceMap[sid] || null) !== (this.originalMap[sid] || null)) return true
      }
      
      return false
    },
  },

  created() {
    this.initLoad()
  },

  methods: {
    showAlert(type, message) { Object.assign(this.alert, { open: true, type, message }) },

    formatTime(t) {
      return formatTime12(t) || "—"
    },
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
    statusInfo(v) {
      return STATUSES.find(s => s.value === v) || null
    },

    async initLoad() {
      await Promise.all([this.loadSessionInfo(), this.loadStudentsBase()])
      await this.loadAttendance()
    },

    async loadSessionInfo() {
      try {
        // No dedicated single-session endpoint exposed in the client API;
        // pull from list and find by id. Cheap when total session count is small.
        const res = await TeacherApi.getSessions({ options: { page: 1, limit: 100 } })
        const list = res?.data?.data || []

        this.sessionInfo = list.find(s => s.id === this.sessionId) || null
      } catch {
        this.sessionInfo = null
      }
    },

    async loadStudentsBase() {
      this.loading = true
      try {
        const res = await TeacherApi.getSessionAttendees(this.sessionId)
        const arr = res?.data?.data || []

        this.students = arr.map(x => typeof x === "object" ? x : ({
          student_id: x, student_name: String(x), grade_name: "", study_year: "",
        }))

        // Initialize map keys for any newly loaded student.
        for (const s of this.students) {
          if (!(s.student_id in this.attendanceMap)) this.attendanceMap[s.student_id] = null
        }
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر جلب طلاب الجلسة")
      } finally {
        this.loading = false
      }
    },

    async loadAttendance() {
      this.loading = true
      try {
        const res = await TeacherApi.getSessionAttendanceByDate(this.sessionId, this.filters.date)
        const data = res?.data?.data || []
        const dateMap = {}
        for (const item of data) {
          const sid = item.student_id || item.studentId
          if (sid) dateMap[String(sid)] = item.status || null
        }

        // Merge into attendanceMap so every student has a key; snapshot for dirty.
        const merged = {}
        for (const s of this.students) {
          merged[s.student_id] = Object.prototype.hasOwnProperty.call(dateMap, String(s.student_id))
            ? dateMap[String(s.student_id)]
            : null
        }
        this.attendanceMap = merged
        this.originalMap = { ...merged }
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر جلب الحضور")
      } finally {
        this.loading = false
      }
    },

    setStatus(studentId, value) {
      // Toggle off if user clicks the same value again.
      const cur = this.attendanceMap[studentId]

      this.attendanceMap = {
        ...this.attendanceMap,
        [studentId]: cur === value ? null : value,
      }
    },

    bulkSet(value) {
      const next = { ...this.attendanceMap }
      for (const s of this.students) next[s.student_id] = value
      this.attendanceMap = next
    },
    clearAll() {
      const next = {}
      for (const s of this.students) next[s.student_id] = null
      this.attendanceMap = next
    },

    async saveAttendance() {
      if (!this.students.length) {
        this.showAlert("info", "لا يوجد طلاب لحفظ الحضور لهم")
        
        return
      }
      this.saving = true
      try {
        const items = this.students.map(s => ({
          studentId: s.student_id,
          status: this.attendanceMap[s.student_id] || null,
        }))

        const payload = { date: this.filters.date, items }
        const res = await TeacherApi.bulkSetSessionAttendance(this.sessionId, payload)

        this.showAlert("success", res?.data?.message || "تم حفظ الحضور")
        await this.loadAttendance()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر حفظ الحضور")
      } finally {
        this.saving = false
      }
    },

    onDateChange() {
      this.loadAttendance()
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />

    <!-- Hero -->
    <div class="att-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-calendar-check-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="d-flex align-center ga-2 flex-wrap">
          <span class="text-h6 text-md-h5 font-weight-bold text-white">
            {{ sessionInfo?.title || "تسجيل الحضور" }}
          </span>
          <VChip
            v-if="isToday"
            color="warning"
            size="small"
            variant="flat"
          >
            اليوم
          </VChip>
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90 mt-1">
          <span v-if="sessionInfo?.course_name">{{ sessionInfo.course_name }}</span>
          <span v-if="sessionInfo?.course_name"> · </span>
          <span>{{ sessionWeekday }}</span>
          <span v-if="sessionInfo?.start_time"> · {{ formatTime(sessionInfo.start_time) }} → {{ formatTime(sessionInfo.end_time) }}</span>
        </div>
      </div>
      <VBtn
        variant="flat"
        color="white"
        class="text-primary"
        prepend-icon="ri-arrow-go-back-line"
        @click="$router.back()"
      >
        رجوع
      </VBtn>
    </div>

    <!-- Date + stats -->
    <VRow class="mb-4">
      <VCol
        cols="12"
        md="4"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="border h-100"
        >
          <VCardText>
            <div class="text-caption text-medium-emphasis mb-2">
              <VIcon
                icon="ri-calendar-line"
                size="14"
                class="me-1"
              /> اختر التاريخ
            </div>
            <VTextField
              v-model="filters.date"
              type="date"
              density="comfortable"
              variant="outlined"
              hide-details
              :disabled="loading"
              @update:model-value="onDateChange"
            />
            <div class="text-caption text-medium-emphasis mt-2">
              {{ formatDate(filters.date) }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="2"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card kpi-present h-100"
        >
          <VCardText class="text-center">
            <VIcon
              icon="ri-check-double-line"
              color="success"
              size="28"
            />
            <div class="text-h5 font-weight-bold text-success mt-2">
              {{ stats.present }}
            </div>
            <div class="text-caption text-medium-emphasis">
              حاضر
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="2"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card kpi-absent h-100"
        >
          <VCardText class="text-center">
            <VIcon
              icon="ri-close-circle-line"
              color="error"
              size="28"
            />
            <div class="text-h5 font-weight-bold text-error mt-2">
              {{ stats.absent }}
            </div>
            <div class="text-caption text-medium-emphasis">
              غائب
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="2"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card kpi-leave h-100"
        >
          <VCardText class="text-center">
            <VIcon
              icon="ri-time-line"
              color="warning"
              size="28"
            />
            <div class="text-h5 font-weight-bold text-warning mt-2">
              {{ stats.leave }}
            </div>
            <div class="text-caption text-medium-emphasis">
              إجازة
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="6"
        md="2"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="kpi-card h-100"
        >
          <VCardText class="text-center">
            <VIcon
              icon="ri-question-line"
              color="grey"
              size="28"
            />
            <div class="text-h5 font-weight-bold mt-2">
              {{ stats.unset }}
            </div>
            <div class="text-caption text-medium-emphasis">
              لم يُحدّد
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Bulk action bar + search -->
    <VCard
      rounded="lg"
      elevation="0"
      class="border mb-4"
    >
      <VCardText>
        <div class="d-flex flex-wrap ga-2 align-center">
          <span class="text-subtitle-2 font-weight-bold me-2">
            <VIcon
              icon="ri-magic-line"
              color="primary"
              class="me-1"
            /> إجراءات سريعة:
          </span>
          <VBtn
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="ri-check-double-line"
            :disabled="!students.length"
            @click="bulkSet('present')"
          >
            الكل حاضر
          </VBtn>
          <VBtn
            color="error"
            variant="tonal"
            size="small"
            prepend-icon="ri-close-circle-line"
            :disabled="!students.length"
            @click="bulkSet('absent')"
          >
            الكل غائب
          </VBtn>
          <VBtn
            variant="text"
            size="small"
            prepend-icon="ri-eraser-line"
            :disabled="!students.length"
            @click="clearAll"
          >
            مسح الكل
          </VBtn>
          <VSpacer />
          <VTextField
            v-model="searchTerm"
            prepend-inner-icon="ri-search-line"
            label="بحث عن طالب"
            hide-details
            density="comfortable"
            variant="outlined"
            clearable
            style="max-width: 280px;"
          />
        </div>
        <div
          v-if="students.length"
          class="mt-3 d-flex align-center ga-2"
        >
          <span class="text-caption text-medium-emphasis">نسبة الحضور:</span>
          <VProgressLinear
            :model-value="presentRate"
            color="success"
            height="8"
            rounded
            class="flex-grow-1"
          />
          <span class="text-caption font-weight-bold">{{ presentRate }}%</span>
        </div>
      </VCardText>
    </VCard>

    <!-- Loading skeleton -->
    <VCard
      v-if="loading && !students.length"
      rounded="lg"
      elevation="0"
      class="border pa-4"
    >
      <VSkeletonLoader
        v-for="n in 5"
        :key="n"
        type="list-item-avatar-three-line"
      />
    </VCard>

    <!-- Empty state -->
    <VCard
      v-else-if="!students.length"
      rounded="lg"
      elevation="0"
      class="border text-center pa-8"
    >
      <VIcon
        icon="ri-user-search-line"
        size="64"
        color="grey"
        class="mb-3"
      />
      <div class="text-h6 mb-2">
        لا يوجد طلاب في هذه الجلسة
      </div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        أضف الطلاب إلى الجلسة من الجدول الأسبوعي قبل تسجيل الحضور.
      </div>
      <VBtn
        color="primary"
        prepend-icon="ri-arrow-go-back-line"
        @click="$router.push('/teacher/sessions/manage-sessions')"
      >
        العودة للجدول
      </VBtn>
    </VCard>

    <!-- Students list -->
    <VCard
      v-else
      rounded="lg"
      elevation="0"
      class="border mb-20"
    >
      <VCardText class="pa-2">
        <VAlert
          v-if="!filteredStudents.length"
          type="info"
          variant="tonal"
          density="compact"
          class="ma-2"
        >
          لا يوجد طلاب يطابقون "{{ searchTerm }}".
        </VAlert>
        <div
          v-else
          class="d-flex flex-column ga-2"
        >
          <div
            v-for="(st, idx) in filteredStudents"
            :key="st.student_id"
            class="student-row pa-3 rounded"
            :style="{ background: statusInfo(attendanceMap[st.student_id])?.bg || 'rgba(11, 37, 69, 0.02)' }"
          >
            <div class="d-flex align-center ga-3 flex-wrap">
              <VAvatar
                :color="statusInfo(attendanceMap[st.student_id])?.color || 'primary'"
                size="40"
              >
                <span class="text-subtitle-1 font-weight-bold">
                  {{ studentInitials(st.student_name) }}
                </span>
              </VAvatar>
              <div class="flex-grow-1 overflow-hidden">
                <div class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ st.student_name }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  <span v-if="st.grade_name">{{ st.grade_name }}</span>
                  <span v-if="st.grade_name && st.study_year"> · </span>
                  <span v-if="st.study_year">{{ st.study_year }}</span>
                  <span v-if="!st.grade_name && !st.study_year">طالب #{{ idx + 1 }}</span>
                </div>
              </div>
              <!-- Segment-style status buttons -->
              <div class="status-seg d-flex">
                <VBtn
                  v-for="s in STATUSES"
                  :key="s.value"
                  :variant="attendanceMap[st.student_id] === s.value ? 'flat' : 'text'"
                  :color="attendanceMap[st.student_id] === s.value ? s.color : 'default'"
                  size="small"
                  :prepend-icon="s.icon"
                  @click="setStatus(st.student_id, s.value)"
                >
                  <span class="d-none d-sm-inline">{{ s.label }}</span>
                </VBtn>
              </div>
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- Sticky save bar -->
    <div
      v-if="students.length"
      class="save-bar"
    >
      <VCard
        rounded="lg"
        elevation="8"
        class="d-flex align-center pa-3 ga-2"
      >
        <VIcon
          :icon="isDirty ? 'ri-error-warning-line' : 'ri-check-double-line'"
          :color="isDirty ? 'warning' : 'success'"
        />
        <span class="text-body-2">
          <strong
            v-if="isDirty"
            class="text-warning"
          >تعديلات غير محفوظة</strong>
          <strong
            v-else
            class="text-success"
          >كل التعديلات محفوظة</strong>
        </span>
        <VSpacer />
        <VBtn
          variant="text"
          :disabled="loading || saving"
          @click="loadAttendance"
        >
          <VIcon
            icon="ri-refresh-line"
            class="me-1"
          />
          استرجاع
        </VBtn>
        <VBtn
          color="primary"
          :loading="saving"
          :disabled="!isDirty"
          prepend-icon="ri-save-3-line"
          @click="saveAttendance"
        >
          حفظ الحضور
        </VBtn>
      </VCard>
    </div>

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
.att-hero {
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
  transition: transform 0.2s ease;
}
.kpi-card:hover { transform: translateY(-2px); }
.kpi-present { background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0)); }
.kpi-absent  { background: linear-gradient(135deg, rgba(229, 57, 53, 0.06), rgba(229, 57, 53, 0)); }
.kpi-leave   { background: linear-gradient(135deg, rgba(255, 138, 0, 0.06), rgba(255, 138, 0, 0)); }

.student-row {
  border: 1px solid rgba(11, 37, 69, 0.06);
  transition: background 0.2s ease, transform 0.15s ease;
}
.student-row:hover { transform: translateX(-2px); }

.status-seg {
  border: 1px solid rgba(11, 37, 69, 0.1);
  border-radius: 999px;
  padding: 2px;
  background: white;
}
.status-seg :deep(.v-btn) { border-radius: 999px; }

.save-bar {
  position: sticky;
  inset-block-end: 16px;
  z-index: 5;
  margin-block-start: 24px;
}
.mb-20 { margin-block-end: 80px; }
</style>
