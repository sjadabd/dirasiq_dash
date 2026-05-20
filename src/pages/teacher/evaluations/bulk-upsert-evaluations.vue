<script>
// =====================================================
// Bulk Upsert Evaluations v2 — rebuilt 2026-05-17.
// Backend storage: DB uses VARCHAR enum ('excellent'|'very_good'|'good'|
// 'fair'|'weak') with CHECK constraint (see migration 023). We send those
// exact strings. For visual ranking (colours, averages, sort) we map each
// label to a 0..10 score on the client.
//
// UX upgrade for speed:
//   • RATING button group (5 buttons per axis) — single click picks the
//     level, no dropdowns.
//   • Per-COLUMN quick-fill: one click sets that axis for all students.
//   • Per-ROW preset buttons: ممتاز / جيد / متوسط / مسح fill all 6 axes.
//   • Top-level: "تقييم الجميع ممتاز / جيد / متوسط".
//   • Sticky save bar with unsaved-changes indicator.
//   • Search for long lists.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api";

const AXES = [
  { key: "scientific_level",      label: "علمي",       icon: "ri-book-2-line" },
  { key: "behavioral_level",      label: "سلوكي",      icon: "ri-emotion-happy-line" },
  { key: "attendance_level",      label: "حضور",       icon: "ri-calendar-check-line" },
  { key: "homework_preparation",  label: "واجب",       icon: "ri-pencil-line" },
  { key: "participation_level",   label: "مشاركة",     icon: "ri-chat-1-line" },
  { key: "instruction_following", label: "تعليمات",    icon: "ri-checkbox-line" },
];

// 5 enum values from the DB CHECK constraint (migration 023).
const RATINGS = [
  { value: "excellent", label: "ممتاز",    short: "ممتاز",  score: 10, color: "success" },
  { value: "very_good", label: "جيد جداً", short: "ج.جداً", score: 8,  color: "info" },
  { value: "good",      label: "جيد",      short: "جيد",    score: 6,  color: "primary" },
  { value: "fair",      label: "مقبول",    short: "مقبول",  score: 4,  color: "warning" },
  { value: "weak",      label: "ضعيف",     short: "ضعيف",   score: 2,  color: "error" },
];

const ROW_PRESETS = [
  { label: "ممتاز", value: "excellent", color: "success" },
  { label: "جيد",   value: "good",      color: "primary" },
  { label: "متوسط", value: "fair",      color: "warning" },
  { label: "مسح",   value: null,        color: "grey" },
];

const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export default {
  name: "TeacherEvaluationsBulkUpsert",
  data() {
    return {
      breadcrumbs: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "تقييمات الطلاب", disabled: false, to: "/teacher/evaluations/manage-evaluations" },
        { title: "إضافة تقييمات يومية", disabled: true },
      ],

      form: { date: todayISO(), course_id: null },
      searchTerm: "",


      courseItems: [],
      coursesLoading: false,

      students: [],         // working copy
      originalSnapshot: [], // for dirty detection
      loading: false,
      saving: false,

      AXES,
      RATINGS,
      ROW_PRESETS,
      alert: { open: false, type: "success", message: "" },
    };
  },

  computed: {
    ready() { return Boolean(this.form.date && this.form.course_id); },
    filteredStudents() {
      const q = this.searchTerm?.trim().toLowerCase();
      if (!q) return this.students;
      return this.students.filter(s => String(s.student_name || "").toLowerCase().includes(q));
    },
    isDirty() {
      if (this.students.length !== this.originalSnapshot.length) return true;
      for (let i = 0; i < this.students.length; i++) {
        const a = this.students[i];
        const b = this.originalSnapshot[i];
        if (!b) return true;
        for (const ax of AXES) {
          if ((a[ax.key] || null) !== (b[ax.key] || null)) return true;
        }
        if ((a.guidance || "") !== (b.guidance || "")) return true;
        if ((a.notes || "") !== (b.notes || "")) return true;
      }
      return false;
    },
    completedCount() {
      return this.students.filter(s => AXES.every(a => Boolean(s[a.key]))).length;
    },
    pageAvg() {
      const scores = [];
      for (const s of this.students) {
        for (const a of AXES) {
          const r = this.ratingInfo(s[a.key]);
          if (r) scores.push(r.score);
        }
      }
      return scores.length ? Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 10) / 10 : 0;
    },
  },

  created() { this.loadCourses(); },

  watch: {
    "form.date"(v) { if (v && this.form.course_id) this.loadStudents(); },
    "form.course_id"(v) { if (v && this.form.date) this.loadStudents(); },
  },

  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },

    studentInitials(name) {
      if (!name) return "?";
      const parts = String(name).trim().split(/\s+/);
      return parts.length === 1 ? parts[0].charAt(0) : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0));
    },
    ratingInfo(v) {
      if (!v) return null;
      return RATINGS.find(r => r.value === v) || null;
    },
    scoreColor(s) {
      const n = Number(s);
      if (!Number.isFinite(n)) return "grey";
      if (n >= 8) return "success";
      if (n >= 6) return "info";
      if (n >= 4) return "warning";
      return "error";
    },
    rowAvgScore(s) {
      const scores = AXES
        .map(a => this.ratingInfo(s[a.key])?.score)
        .filter(x => Number.isFinite(x));
      if (!scores.length) return null;
      return Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 10) / 10;
    },

    async loadCourses() {
      this.coursesLoading = true;
      try {
        const res = await TeacherApi.getCourseNames();
        this.courseItems = (res?.data?.data || []).map(c => ({ text: c.name, value: c.id }));
      } catch { /* noop */ }
      finally { this.coursesLoading = false; }
    },

    async loadStudents() {
      if (!this.ready) { this.showAlert("info", "اختر التاريخ والكورس أولاً"); return; }
      this.loading = true;
      try {
        const params = { date: this.form.date, courseId: this.form.course_id, page: 1, limit: 200 };
        const res = await TeacherApi.getStudentsWithEval(params);
        const data = res?.data?.data || [];
        const normalized = data.map(r => ({
          student_id: r.student_id,
          student_name: r.student_name,
          scientific_level:      r.scientific_level || null,
          behavioral_level:      r.behavioral_level || null,
          attendance_level:      r.attendance_level || null,
          homework_preparation:  r.homework_preparation || null,
          participation_level:   r.participation_level || null,
          instruction_following: r.instruction_following || null,
          guidance: r.guidance || "",
          notes: r.notes || "",
        }));
        this.students = normalized;
        this.originalSnapshot = JSON.parse(JSON.stringify(normalized));
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر جلب الطلاب");
      } finally {
        this.loading = false;
      }
    },

    setAxis(student, axisKey, value) {
      const idx = this.students.findIndex(s => s.student_id === student.student_id);
      if (idx < 0) return;
      const cur = this.students[idx][axisKey];
      const next = cur === value ? null : value;
      this.students.splice(idx, 1, { ...this.students[idx], [axisKey]: next });
    },
    setRowAll(student, value) {
      const idx = this.students.findIndex(s => s.student_id === student.student_id);
      if (idx < 0) return;
      const next = { ...this.students[idx] };
      for (const a of AXES) next[a.key] = value;
      this.students.splice(idx, 1, next);
    },
    setColumnAll(axisKey, value) {
      this.students = this.students.map(s => ({ ...s, [axisKey]: value }));
    },
    setAllStudents(value) {
      this.students = this.students.map(s => {
        const next = { ...s };
        for (const a of AXES) next[a.key] = value;
        return next;
      });
    },

    resetChanges() {
      this.students = JSON.parse(JSON.stringify(this.originalSnapshot));
    },

    async saveAll() {
      if (!this.form.date) { this.showAlert("error", "التاريخ مطلوب"); return; }
      if (!this.students.length) { this.showAlert("error", "لا يوجد طلاب لحفظهم"); return; }

      // DB requires ALL 6 axes per row (NOT NULL constraint, migration 023).
      // Skip incomplete rows but warn the teacher.
      const complete = this.students.filter(s => AXES.every(a => Boolean(s[a.key])));
      const incomplete = this.students.length - complete.length;

      if (!complete.length) {
        this.showAlert("error", "أكمل تقييم طالب واحد على الأقل (6 محاور كاملة).");
        return;
      }

      const items = complete.map(s => {
        const out = { student_id: s.student_id };
        for (const a of AXES) out[a.key] = s[a.key];
        if (s.guidance?.trim()) out.guidance = s.guidance.trim();
        if (s.notes?.trim()) out.notes = s.notes.trim();
        return out;
      });

      this.saving = true;
      try {
        const isoDate = new Date(`${this.form.date}T00:00:00`).toISOString();
        const res = await TeacherApi.bulkUpsertEvaluations({ eval_date: isoDate, items });
        const msg = res?.data?.message || `تم حفظ ${complete.length} تقييم`;
        const fullMsg = incomplete > 0
          ? `${msg} · تم تجاهل ${incomplete} طالب لعدم اكتمال التقييم.`
          : msg;
        this.showAlert(incomplete > 0 ? "warning" : "success", fullMsg);
        this.originalSnapshot = JSON.parse(JSON.stringify(this.students));
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر الحفظ");
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />

    <!-- Hero -->
    <div class="bulk-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon icon="ri-award-line" size="28" color="white" />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">تقييم جماعي يومي</div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          قيّم طلاب الكورس على 6 محاور. استخدم الأزرار السريعة لتوفير الوقت.
        </div>
      </div>
      <VBtn variant="flat" color="white" class="text-primary" prepend-icon="ri-arrow-go-back-line" @click="$router.back()">
        رجوع
      </VBtn>
    </div>

    <!-- Setup card -->
    <VCard rounded="lg" elevation="0" class="border mb-4">
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2">
          <VIcon icon="ri-settings-3-line" color="primary" />
          <span class="text-subtitle-1 font-weight-bold">إعداد الجلسة</span>
        </div>
        <VRow dense>
          <VCol cols="12" md="4">
            <VTextField v-model="form.date" type="date" label="تاريخ التقييم *" variant="outlined" density="comfortable" prepend-inner-icon="ri-calendar-line" />
          </VCol>
          <VCol cols="12" md="5">
            <VSelect
              v-model="form.course_id"
              :items="courseItems" item-title="text" item-value="value"
              label="الكورس *" variant="outlined" density="comfortable"
              :loading="coursesLoading" prepend-inner-icon="ri-book-3-line"
            />
          </VCol>
          <VCol cols="12" md="3" class="d-flex align-center">
            <VBtn color="primary" variant="tonal" block :disabled="!ready" :loading="loading" prepend-icon="ri-refresh-line" @click="loadStudents">
              تحديث الطلاب
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- States -->
    <VCard v-if="!ready" rounded="lg" elevation="0" class="border text-center pa-8 mb-4">
      <VIcon icon="ri-arrow-up-line" size="48" color="primary" class="mb-3" />
      <div class="text-h6 mb-2">اختر التاريخ والكورس</div>
      <div class="text-body-2 text-medium-emphasis">سيُجلب الطلاب تلقائياً بعد اختيار الكورس.</div>
    </VCard>

    <template v-else-if="loading && !students.length">
      <VCard rounded="lg" elevation="0" class="border pa-4">
        <VSkeletonLoader v-for="n in 5" :key="n" type="list-item-avatar" />
      </VCard>
    </template>

    <VCard v-else-if="!students.length" rounded="lg" elevation="0" class="border text-center pa-8 mb-4">
      <VIcon icon="ri-user-search-line" size="48" color="grey" class="mb-3" />
      <div class="text-h6 mb-2">لا يوجد طلاب في هذا الكورس</div>
      <div class="text-body-2 text-medium-emphasis">تأكد من تأكيد حجوزات الطلاب أولاً.</div>
    </VCard>

    <template v-else>
      <!-- Stats + bulk actions -->
      <VCard rounded="lg" elevation="0" class="border mb-4">
        <VCardText>
          <div class="d-flex flex-wrap align-center ga-3 mb-3">
            <VChip color="primary" variant="flat" prepend-icon="ri-group-line">
              {{ students.length }} طالب
            </VChip>
            <VChip color="success" variant="tonal" prepend-icon="ri-check-double-line">
              {{ completedCount }} مكتمل
            </VChip>
            <VChip :color="scoreColor(pageAvg)" variant="tonal" prepend-icon="ri-line-chart-line">
              المعدّل: {{ pageAvg }}/10
            </VChip>
            <VSpacer />
            <VTextField
              v-model="searchTerm" prepend-inner-icon="ri-search-line"
              label="بحث عن طالب" hide-details density="comfortable" variant="outlined"
              clearable style="max-width: 240px;"
            />
          </div>

          <div class="d-flex flex-wrap align-center ga-2">
            <span class="text-subtitle-2 font-weight-bold me-2">
              <VIcon icon="ri-magic-line" color="primary" class="me-1" /> تقييم الكل:
            </span>
            <VBtn color="success" variant="tonal" size="small" @click="setAllStudents('excellent')">ممتاز</VBtn>
            <VBtn color="info" variant="tonal" size="small" @click="setAllStudents('very_good')">جيد جداً</VBtn>
            <VBtn color="primary" variant="tonal" size="small" @click="setAllStudents('good')">جيد</VBtn>
            <VBtn color="warning" variant="tonal" size="small" @click="setAllStudents('fair')">متوسط</VBtn>
            <VBtn variant="text" size="small" prepend-icon="ri-eraser-line" @click="setAllStudents(null)">مسح الكل</VBtn>
          </div>
        </VCardText>
      </VCard>

      <!-- Column quick-fill row (desktop only) -->
      <VCard rounded="lg" elevation="0" class="border mb-4 col-quickfill d-none d-lg-block">
        <VCardText class="pa-3">
          <div class="d-flex align-center ga-2">
            <span class="text-caption font-weight-bold text-medium-emphasis" style="min-width: 140px;">
              تعبئة عمود كامل ←
            </span>
            <div v-for="a in AXES" :key="a.key" class="col-quick-cell">
              <div class="text-caption text-center font-weight-bold mb-1">
                <VIcon :icon="a.icon" size="12" /> {{ a.label }}
              </div>
              <div class="d-flex justify-center ga-1 flex-wrap">
                <VBtn size="x-small" color="success" variant="tonal" min-width="44" @click="setColumnAll(a.key, 'excellent')">ممتاز</VBtn>
                <VBtn size="x-small" color="primary" variant="tonal" min-width="44" @click="setColumnAll(a.key, 'good')">جيد</VBtn>
                <VBtn size="x-small" color="warning" variant="tonal" min-width="44" @click="setColumnAll(a.key, 'fair')">متوسط</VBtn>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>

      <!-- Students rows -->
      <div class="d-flex flex-column ga-3 mb-20">
        <VCard
          v-for="(s, idx) in filteredStudents" :key="s.student_id"
          rounded="lg" elevation="0" class="border student-card"
        >
          <VCardText class="pa-3">
            <!-- Header: avatar + name + row presets + avg -->
            <div class="d-flex align-center ga-3 mb-3 flex-wrap">
              <div class="d-flex align-center ga-3 flex-grow-1">
                <VAvatar :color="scoreColor(rowAvgScore(s))" size="40">
                  <span class="text-subtitle-1 font-weight-bold">{{ studentInitials(s.student_name) }}</span>
                </VAvatar>
                <div class="overflow-hidden">
                  <div class="text-subtitle-1 font-weight-bold text-truncate">{{ s.student_name }}</div>
                  <div class="text-caption text-medium-emphasis">طالب #{{ idx + 1 }}</div>
                </div>
              </div>
              <div class="d-flex align-center ga-2 flex-wrap">
                <VChip v-if="rowAvgScore(s) != null" :color="scoreColor(rowAvgScore(s))" variant="flat" size="small" prepend-icon="ri-trophy-line">
                  {{ rowAvgScore(s) }}/10
                </VChip>
                <VBtn
                  v-for="p in ROW_PRESETS" :key="p.label"
                  :color="p.color" :variant="p.value === null ? 'text' : 'tonal'"
                  size="x-small" @click="setRowAll(s, p.value)"
                >
                  {{ p.label }}
                </VBtn>
              </div>
            </div>

            <!-- 6 axes — each axis is a row with label + 5 rating buttons -->
            <div class="d-flex flex-column ga-2">
              <div v-for="a in AXES" :key="a.key" class="axis-row">
                <div class="axis-label">
                  <VIcon :icon="a.icon" size="14" :color="ratingInfo(s[a.key])?.color || 'grey'" class="me-1" />
                  <span class="text-caption font-weight-bold">{{ a.label }}</span>
                </div>
                <div class="axis-buttons">
                  <VBtn
                    v-for="r in RATINGS" :key="r.value"
                    :color="s[a.key] === r.value ? r.color : 'default'"
                    :variant="s[a.key] === r.value ? 'flat' : 'tonal'"
                    size="x-small" min-width="60"
                    @click="setAxis(s, a.key, r.value)"
                  >
                    {{ r.short }}
                  </VBtn>
                </div>
              </div>
            </div>

            <!-- Notes / guidance -->
            <VRow dense class="mt-3">
              <VCol cols="12" md="6">
                <VTextField v-model="s.guidance" prepend-inner-icon="ri-lightbulb-line" label="توجيه (اختياري)" density="compact" variant="outlined" hide-details />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="s.notes" prepend-inner-icon="ri-sticky-note-line" label="ملاحظات (اختياري)" density="compact" variant="outlined" hide-details />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </div>

      <!-- Sticky save bar -->
      <div class="save-bar">
        <VCard rounded="lg" elevation="8" class="d-flex align-center pa-3 ga-2 flex-wrap">
          <VIcon :icon="isDirty ? 'ri-error-warning-line' : 'ri-check-double-line'" :color="isDirty ? 'warning' : 'success'" />
          <span class="text-body-2">
            <strong v-if="isDirty" class="text-warning">تعديلات غير محفوظة</strong>
            <strong v-else class="text-success">كل التعديلات محفوظة</strong>
          </span>
          <VChip size="small" color="primary" variant="tonal" class="ms-2">
            {{ completedCount }}/{{ students.length }} مكتمل
          </VChip>
          <VSpacer />
          <VBtn variant="text" :disabled="!isDirty || saving" @click="resetChanges">
            <VIcon icon="ri-refresh-line" class="me-1" />
            تراجع
          </VBtn>
          <VBtn color="primary" :loading="saving" :disabled="!isDirty || !completedCount" prepend-icon="ri-save-3-line" @click="saveAll">
            حفظ التقييمات
          </VBtn>
        </VCard>
      </div>
    </template>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true" close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<style scoped>
.bulk-hero {
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
.col-quickfill {
  background: rgba(11, 37, 69, 0.02);
}
.col-quick-cell {
  flex: 1;
  min-width: 0;
}
.student-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.student-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(11, 37, 69, 0.06);
}
.axis-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgba(11, 37, 69, 0.02);
}
@media (max-width: 600px) {
  .axis-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
.axis-label {
  display: flex;
  align-items: center;
}
.axis-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.save-bar {
  position: sticky;
  inset-block-end: 16px;
  z-index: 5;
}
.mb-20 { margin-block-end: 100px; }
</style>
