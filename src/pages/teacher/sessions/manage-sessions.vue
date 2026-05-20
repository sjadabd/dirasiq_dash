<script>
// =====================================================
// Manage Sessions v2 — rebuilt 2026-05-17.
// Professional weekly schedule designed for fast daily use.
//
// What changed vs v1:
//   • PRIMARY: Color-coded weekly grid (7-day × time-slot rows).
//     - Today's column is highlighted.
//     - Each session card carries a stable color per course (hashed from
//       course_id) so the teacher can spot "all my Math sessions" instantly.
//     - Click anywhere on a card opens a slick action menu (تعديل / عرض الطلاب
//       / إضافة طلاب / إنهاء / حذف) — no more guessing what each table button does.
//     - Rows sorted by real 24h time (backend now ships start_time_24h alongside
//       the Arabic-12h display string).
//   • KPI strip: total sessions / today / weekly hours / total seats filled.
//   • Search now actually works (sessionListQuerySchema accepts `search`).
//   • Filter bar: course + weekday + search.
//   • Mobile view: day-by-day accordion (today first), unchanged but tighter.
//   • Table view kept behind a toggle for power users.
//   • Conflict warning surfaced inline when create/update fails with 409.
//   • mdi-* icons → ri-* (eslint rule).
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api";
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue";
import numberWithComma from "@/constant/number";

const COURSE_PALETTE = [
  { bg: "rgba(11, 37, 69, 0.10)",  border: "#0B2545", text: "#0B2545" },
  { bg: "rgba(255, 138, 0, 0.10)", border: "#FF8A00", text: "#A55B00" },
  { bg: "rgba(16, 185, 129, 0.10)", border: "#10B981", text: "#065F46" },
  { bg: "rgba(63, 169, 245, 0.12)", border: "#3FA9F5", text: "#0B5FA0" },
  { bg: "rgba(229, 57, 53, 0.10)",  border: "#E53935", text: "#9A1E1B" },
  { bg: "rgba(147, 51, 234, 0.10)", border: "#9333EA", text: "#5B17A5" },
  { bg: "rgba(245, 158, 11, 0.10)", border: "#F59E0B", text: "#7A4A0A" },
  { bg: "rgba(20, 184, 166, 0.10)", border: "#14B8A6", text: "#0A5E55" },
];

export default {
  components: { ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-manage-sessions-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "الجدول الأسبوعي", disabled: true },
      ],
      view: "grid", // 'grid' | 'table'

      // Reference data
      weekdays: [
        { text: "الأحد",    short: "أحد",  value: 0 },
        { text: "الاثنين",  short: "اثن",  value: 1 },
        { text: "الثلاثاء", short: "ثلا",  value: 2 },
        { text: "الأربعاء", short: "أرب",  value: 3 },
        { text: "الخميس",   short: "خمي",  value: 4 },
        { text: "الجمعة",   short: "جمع",  value: 5 },
        { text: "السبت",    short: "سبت",  value: 6 },
      ],
      courseItems: [],
      coursesLoading: false,

      // Filters
      filters: { weekday: null, course_id: null },
      searchTerm: "",

      // Data
      items: [],
      loading: false,
      totalItems: 0,

      // Table mode
      headers: [
        { title: "#",        type: "strong", sortable: false, key: "num" },
        { title: "العنوان",  type: "link",   sortable: true,  key: "title" },
        { title: "الكورس",   type: "strong", sortable: true,  key: "course_name" },
        { title: "الصف",     type: "strong", sortable: true,  key: "grade_name" },
        { title: "اليوم",    type: "strong", sortable: true,  key: "weekdayLabel" },
        { title: "البداية",  type: "strong", sortable: true,  key: "start_time" },
        { title: "النهاية",  type: "strong", sortable: true,  key: "end_time" },
        { title: "الطلاب",   type: "number", sortable: true,  key: "attendees_count" },
        { title: "العمليات", type: "strong", sortable: false, key: "actions" },
      ],
      tableActions: ["عرض الطلاب", "إضافة طلاب", "إنهاء الجلسة", "تعديل", "حذف"],
      tableOptions: { page: 1, limit: 50, search: null },

      // Dialogs
      sessionDialog: {
        open: false,
        mode: "create",
        conflictMessage: "",
        saving: false,
        form: {
          id: null,
          title: "",
          course_id: "",
          teacher_id: JSON.parse(localStorage.getItem("user") || "{}")?.id,
          weekdays: [],
          start_time: "",
          end_time: "",
          recurrence: true,
          flex_type: null,
          flex_minutes: null,
        },
      },
      attendeesDialog: {
        open: false,
        data: null,
        loading: false,
        candidates: [],
        selectedIds: [],
        currentIds: [],
        currentDetailed: [],
      },
      studentsViewDialog: { open: false, data: null, loading: false, students: [] },
      endDialog:    { open: false, data: null, messages: ["سيتم إنهاء الجلسة وإشعار الطلاب الحاضرين اليوم."], title: "تأكيد إنهاء الجلسة", confirmButtonText: "إنهاء الجلسة" },
      deleteDialog: { open: false, data: null, messages: ["سيتم حذف الجلسة.", "لا يمكن استرجاعها بعد الحذف."], title: "تأكيد الحذف", confirmButtonText: "حذف الجلسة" },

      alert: { open: false, message: null, type: "success" },
    };
  },

  computed: {
    today() { return new Date().getDay(); }, // 0..6 with Sunday = 0
    todayName() { return this.weekdays.find(w => w.value === this.today)?.text || ""; },

    // Sessions for the weekly grid, grouped by (start_24h, end_24h) so identical
    // time slots stack across days.
    weeklyCalendar() {
      const rowsMap = new Map();
      for (const item of this.items) {
        const start = item.start_time_24h || item.start_time || "";
        const end   = item.end_time_24h   || item.end_time   || "";
        const slotKey = `${start}-${end}`;
        const label = item.start_time && item.end_time
          ? `${item.start_time}\n${item.end_time}`
          : `${start} - ${end}`;
        const day = Number(item.weekday);
        if (!Number.isInteger(day) || day < 0 || day > 6) continue;
        if (!rowsMap.has(slotKey)) {
          rowsMap.set(slotKey, {
            slotKey, label, start, end,
            byDay: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
          });
        }
        rowsMap.get(slotKey).byDay[day].push({
          ...item,
          __key: `${item.id}-${day}-${slotKey}`,
        });
      }
      return Array.from(rowsMap.values())
        .sort((a, b) => String(a.start).localeCompare(String(b.start)));
    },

    // Per-day card stack for mobile (today first, then sequence).
    mobileDays() {
      const order = [];
      const t = this.today;
      for (let i = 0; i < 7; i++) order.push((t + i) % 7);
      return order.map(dv => {
        const day = this.weekdays.find(w => w.value === dv);
        const list = this.items
          .filter(it => Number(it.weekday) === dv)
          .sort((a, b) => String(a.start_time_24h || "").localeCompare(String(b.start_time_24h || "")));
        return { value: dv, text: day?.text || String(dv), sessions: list, isToday: dv === t };
      });
    },

    // KPI: weekly contact hours from start/end times (rough but useful).
    weeklyHours() {
      let mins = 0;
      for (const s of this.items) {
        const [sh, sm] = String(s.start_time_24h || "0:0").split(":").map(Number);
        const [eh, em] = String(s.end_time_24h   || "0:0").split(":").map(Number);
        const diff = ((eh * 60 + em) - (sh * 60 + sm));
        if (diff > 0) mins += diff;
      }
      return Math.round(mins / 60 * 10) / 10;
    },
    totalAttendees() {
      return this.items.reduce((sum, s) => sum + (Number(s.attendees_count) || 0), 0);
    },
    todayCount() {
      return this.items.filter(s => Number(s.weekday) === this.today).length;
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null");
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters };
      if (typeof stored.searchTerm === "string") this.searchTerm = stored.searchTerm;
      if (stored.view === "grid" || stored.view === "table") this.view = stored.view;
    }
    Promise.all([this.loadCourseNames(), this.fetchSessions()]);
  },

  methods: {
    numberWithComma,
    showAlert(type, message) { Object.assign(this.alert, { open: true, type, message }); },

    weekdayName(n) {
      return this.weekdays.find(w => w.value === Number(n))?.text || String(n);
    },
    formatWeekdays(value) {
      if (Array.isArray(value)) return value.map(v => this.weekdayName(v)).join("، ");
      return this.weekdayName(value);
    },

    // Deterministic color from course_id so the same course is always the same color.
    courseColor(courseId) {
      if (!courseId) return COURSE_PALETTE[0];
      let h = 0;
      for (let i = 0; i < courseId.length; i++) h = (h * 31 + courseId.charCodeAt(i)) >>> 0;
      return COURSE_PALETTE[h % COURSE_PALETTE.length];
    },

    persistState() {
      localStorage.setItem(this.keyName, JSON.stringify({
        filters: this.filters,
        searchTerm: this.searchTerm,
        view: this.view,
      }));
    },

    async loadCourseNames() {
      this.coursesLoading = true;
      try {
        const res = await TeacherApi.getCourseNames();
        const list = res?.data?.data || [];
        this.courseItems = list.map(x => ({ text: x.name || x.course_name, value: x.id }));
      } catch { this.showAlert("error", "تعذّر جلب الكورسات"); }
      finally { this.coursesLoading = false; }
    },

    async fetchSessions() {
      this.loading = true;
      try {
        this.persistState();
        const res = await TeacherApi.getSessions({
          options: {
            page: 1,
            limit: 100,
            weekday: typeof this.filters.weekday === "number" ? this.filters.weekday : undefined,
            courseId: this.filters.course_id || undefined,
            search: this.searchTerm?.trim() || undefined,
          },
        });
        const env = res?.data || {};
        const list = Array.isArray(env.data) ? env.data : [];
        const pagination = env.meta?.pagination || {};
        this.totalItems = pagination.total ?? list.length;
        this.items = list.map((it, idx) => ({
          ...it,
          num: idx + 1,
          weekdayLabel: this.weekdayName(it.weekday),
        }));
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر جلب الجلسات");
      } finally { this.loading = false; }
    },

    onFilterChange() { this.fetchSessions(); },
    onSearch()       { this.fetchSessions(); },
    setView(v)       { this.view = v; this.persistState(); },
    reload() {
      localStorage.removeItem(this.keyName);
      this.filters = { weekday: null, course_id: null };
      this.searchTerm = "";
      this.fetchSessions();
    },
    // SmartTable's <VDataTableServer> emits update:options on mount and on
    // every items/totalItems change. Sessions are loaded all-at-once
    // client-side (limit:100) so we paginate locally — refetching here would
    // create an infinite loop (items change → prop change → re-emit → refetch).
    // Only the SmartTable's internal search field still triggers a fetch.
    updateTableOptions(newOptions) {
      const searchChanged = newOptions.search !== undefined
        && (newOptions.search || "") !== (this.searchTerm || "");
      this.tableOptions = { ...this.tableOptions, ...newOptions };
      if (searchChanged) {
        this.searchTerm = newOptions.search || "";
        this.fetchSessions();
      }
    },

    // ---- Create / Edit ----
    openCreateDialog(prefill = {}) {
      this.sessionDialog.mode = "create";
      this.sessionDialog.conflictMessage = "";
      this.sessionDialog.form = {
        id: null,
        title: "",
        course_id: this.filters.course_id || "",
        teacher_id: this.results?.id,
        weekdays: prefill.weekday != null ? [prefill.weekday] : [],
        start_time: prefill.start_time || "",
        end_time: prefill.end_time || "",
        recurrence: true,
        flex_type: null,
        flex_minutes: null,
      };
      this.sessionDialog.open = true;
    },
    editItem(item) {
      this.sessionDialog.mode = "edit";
      this.sessionDialog.conflictMessage = "";
      this.sessionDialog.form = {
        id: item.id,
        title: item.title || "",
        course_id: item.course_id || item.course?.id || "",
        teacher_id: this.results?.id,
        weekdays: Array.isArray(item.weekdays)
          ? item.weekdays
          : (item.weekday !== undefined ? [Number(item.weekday)] : []),
        start_time: item.start_time_24h || item.start_time,
        end_time:   item.end_time_24h   || item.end_time,
        recurrence: item.recurrence ?? true,
        flex_type: item.flex_type ?? null,
        flex_minutes: item.flex_minutes ?? null,
      };
      this.sessionDialog.open = true;
    },
    async saveSession() {
      const f = this.sessionDialog.form;
      this.sessionDialog.conflictMessage = "";
      if (!f.course_id || !f.weekdays.length || !f.start_time || !f.end_time) {
        this.showAlert("error", "الحقول الأساسية مطلوبة");
        return;
      }
      if (f.start_time >= f.end_time) {
        this.showAlert("error", "وقت البداية يجب أن يكون قبل وقت النهاية");
        return;
      }
      this.sessionDialog.saving = true;
      try {
        const isCreate = this.sessionDialog.mode === "create";
        let res;
        if (isCreate) {
          res = await TeacherApi.createSession({
            course_id: f.course_id,
            teacher_id: f.teacher_id,
            weekdays: f.weekdays,
            start_time: f.start_time,
            end_time: f.end_time,
            title: f.title || undefined,
            recurrence: f.recurrence === true,
            state: "confirmed",
          });
        } else {
          res = await TeacherApi.updateSession(f.id, {
            course_id: f.course_id,
            teacher_id: f.teacher_id,
            weekday: f.weekdays[0],
            start_time: f.start_time,
            end_time: f.end_time,
            title: f.title || undefined,
            recurrence: f.recurrence === true,
            state: "confirmed",
          });
        }
        this.showAlert("success", res?.data?.message || (isCreate ? "تم إنشاء الجلسة" : "تم تحديث الجلسة"));
        this.sessionDialog.open = false;
        await this.fetchSessions();
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message || "تعذّر الحفظ";
        if (status === 409) this.sessionDialog.conflictMessage = msg;
        else this.showAlert("error", msg);
      } finally { this.sessionDialog.saving = false; }
    },

    // ---- Attendees ----
    openAddAttendeesDialog(item) {
      this.attendeesDialog.data = item;
      this.attendeesDialog.open = true;
      this.attendeesDialog.candidates = [];
      this.attendeesDialog.selectedIds = [];
      this.attendeesDialog.currentIds = [];
      this.attendeesDialog.currentDetailed = [];
      this.loadAddDialogData();
    },
    async loadAddDialogData() {
      try {
        this.attendeesDialog.loading = true;
        const currentRes = await TeacherApi.getSessionAttendees(this.attendeesDialog.data.id);
        const currentData = currentRes?.data?.data || [];
        const currentIds = currentData.map(x => typeof x === "object" ? x.student_id || x.id : x).filter(Boolean);
        const currentDetailed = currentData.map(x => typeof x === "object" ? x : { student_id: x, student_name: String(x) });
        this.attendeesDialog.currentIds = currentIds;
        this.attendeesDialog.currentDetailed = currentDetailed;

        const courseId = this.attendeesDialog.data.course_id || this.attendeesDialog.data.course?.id;
        if (!courseId) throw new Error("لا يوجد معرّف كورس في هذه الجلسة");
        const confRes = await TeacherApi.getCourseConfirmedStudents(courseId);
        const candidates = confRes?.data?.data || [];
        this.attendeesDialog.candidates = candidates;

        this.attendeesDialog.selectedIds = candidates
          .map(c => c.student_id)
          .filter(id => currentIds.includes(id));
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.message || "تعذّر تحميل الطلاب");
      } finally { this.attendeesDialog.loading = false; }
    },
    async submitAddAttendees() {
      const selected = this.attendeesDialog.selectedIds || [];
      const current  = this.attendeesDialog.currentIds || [];
      const toAdd = selected.filter(id => !current.includes(id));
      if (toAdd.length === 0) { this.showAlert("info", "لا توجد إضافات جديدة"); this.attendeesDialog.open = false; return; }
      this.attendeesDialog.loading = true;
      try {
        const res = await TeacherApi.addSessionAttendees(this.attendeesDialog.data.id, toAdd);
        this.showAlert("success", res?.data?.message || "تم حفظ التغييرات");
        await this.fetchSessions();
        this.attendeesDialog.open = false;
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر إضافة الطلاب");
      } finally { this.attendeesDialog.loading = false; }
    },
    async removeOneAttendee(studentId) {
      try {
        await TeacherApi.removeSessionAttendees(this.attendeesDialog.data.id, [studentId]);
        await this.loadAddDialogData();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّرت إزالة الطالب");
      }
    },

    openViewStudentsDialog(item) {
      this.studentsViewDialog.data = item;
      this.studentsViewDialog.open = true;
      this.studentsViewDialog.students = [];
      this.loadStudentsView();
    },
    async loadStudentsView() {
      try {
        this.studentsViewDialog.loading = true;
        const res = await TeacherApi.getSessionAttendees(this.studentsViewDialog.data.id);
        const data = res?.data?.data || [];
        this.studentsViewDialog.students = data.map(x => typeof x === "object" ? x : { student_id: x, student_name: String(x), grade_name: "", study_year: "" });
      } catch (e) { this.showAlert("error", e?.response?.data?.message || "تعذّر جلب الطلاب"); }
      finally { this.studentsViewDialog.loading = false; }
    },

    // ---- End / Delete ----
    openEndSessionDialog(item) { this.endDialog.data = item; this.endDialog.open = true; },
    async handleEndSession() {
      try {
        const res = await TeacherApi.endSession(this.endDialog.data.id);
        this.showAlert("success", res?.data?.message || "تم إنهاء الجلسة");
        await this.fetchSessions();
      } catch (e) { this.showAlert("error", e?.response?.data?.message || "تعذّر الإنهاء"); }
      finally { this.endDialog.open = false; }
    },
    deleteItem(item) { this.deleteDialog.data = item; this.deleteDialog.open = true; },
    async handleDelete() {
      try {
        const res = await TeacherApi.deleteSession(this.deleteDialog.data.id);
        this.showAlert("success", res?.data?.message || "تم الحذف");
        await this.fetchSessions();
      } catch (e) { this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف"); }
      finally { this.deleteDialog.open = false; }
    },

    navigateToAttendance(item) {
      if (!item?.id) return;
      this.$router.push(`/teacher/sessions/attendance/${item.id}`);
    },
  },
};
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="sessions-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon icon="ri-calendar-2-line" size="28" color="white" />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">الجدول الأسبوعي</div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          إدارة جلساتك الأسبوعية بسرعة. اليوم: <strong>{{ todayName }}</strong> ·
          <strong>{{ todayCount }}</strong> جلسة مجدولة.
        </div>
      </div>
      <VBtn color="warning" prepend-icon="ri-add-line" size="large" rounded="pill" @click="openCreateDialog({})">
        إضافة جلسة
      </VBtn>
    </div>

    <!-- KPIs -->
    <VRow class="mb-4">
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-stack-line" color="primary" size="24" />
              <VChip size="small" color="primary" variant="flat">إجمالي</VChip>
            </div>
            <div class="text-h5 font-weight-bold">{{ numberWithComma(items.length) }}</div>
            <div class="text-caption text-medium-emphasis">عدد الجلسات</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card kpi-today">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-calendar-check-line" color="warning" size="24" />
              <VChip size="small" color="warning" variant="flat">اليوم</VChip>
            </div>
            <div class="text-h5 font-weight-bold text-warning">{{ numberWithComma(todayCount) }}</div>
            <div class="text-caption text-medium-emphasis">جلسات {{ todayName }}</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-time-line" color="info" size="24" />
              <VChip size="small" color="info" variant="flat">ساعات</VChip>
            </div>
            <div class="text-h5 font-weight-bold">{{ weeklyHours }}</div>
            <div class="text-caption text-medium-emphasis">ساعة أسبوعياً</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-group-line" color="success" size="24" />
              <VChip size="small" color="success" variant="flat">طلاب</VChip>
            </div>
            <div class="text-h5 font-weight-bold text-success">{{ numberWithComma(totalAttendees) }}</div>
            <div class="text-caption text-medium-emphasis">مجموع الحضور</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Filter bar -->
    <VCard rounded="lg" elevation="0" class="mb-4 border">
      <VCardText>
        <div class="d-flex align-center mb-3 ga-3 flex-wrap">
          <VIcon icon="ri-filter-3-line" color="primary" />
          <span class="text-subtitle-1 font-weight-bold">التصفية والبحث</span>
          <VSpacer />
          <VBtnToggle v-model="view" mandatory color="primary" variant="outlined" divided class="view-toggle">
            <VBtn value="grid" @click="setView('grid')">
              <VIcon icon="ri-layout-grid-line" start />
              شبكة
            </VBtn>
            <VBtn value="table" @click="setView('table')">
              <VIcon icon="ri-table-line" start />
              جدول
            </VBtn>
          </VBtnToggle>
          <VBtn variant="tonal" prepend-icon="ri-refresh-line" @click="reload">إعادة تعيين</VBtn>
        </div>
        <VRow dense>
          <VCol cols="12" md="5">
            <VTextField
              v-model="searchTerm" prepend-inner-icon="ri-search-line"
              label="بحث في عنوان الجلسة أو الكورس"
              density="comfortable" variant="outlined" clearable
              @keyup.enter="onSearch" @click:clear="onSearch"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.course_id"
              :items="courseItems" item-title="text" item-value="value"
              label="الكورس" density="comfortable" variant="outlined"
              :loading="coursesLoading" clearable
              prepend-inner-icon="ri-book-3-line"
              @update:model-value="onFilterChange"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="filters.weekday"
              :items="weekdays" item-title="text" item-value="value"
              label="يوم محدد" density="comfortable" variant="outlined" clearable
              prepend-inner-icon="ri-calendar-line"
              @update:model-value="onFilterChange"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Loading skeleton -->
    <VCard v-if="loading" rounded="lg" elevation="0" class="border pa-4">
      <VSkeletonLoader type="table" />
    </VCard>

    <!-- Empty -->
    <VCard v-else-if="!items.length" rounded="lg" elevation="0" class="border text-center pa-8">
      <VIcon icon="ri-calendar-todo-line" size="64" color="grey" class="mb-3" />
      <div class="text-h6 mb-2">لا توجد جلسات بهذا الفلتر</div>
      <div class="text-body-2 text-medium-emphasis mb-4">ابدأ بإضافة جلستك الأولى لتظهر في الجدول الأسبوعي.</div>
      <VBtn color="primary" prepend-icon="ri-add-line" @click="openCreateDialog({})">إضافة جلسة</VBtn>
    </VCard>

    <!-- GRID VIEW -->
    <template v-else-if="view === 'grid'">
      <!-- Desktop / tablet grid -->
      <VCard rounded="lg" elevation="0" class="border d-none d-md-block">
        <VCardText class="pa-3">
          <div class="schedule-grid">
            <!-- Header row -->
            <div class="schedule-corner">الوقت</div>
            <div
              v-for="d in weekdays" :key="`h-${d.value}`"
              class="schedule-day-head"
              :class="{ 'schedule-day-today': d.value === today }"
            >
              <div class="text-subtitle-2">{{ d.text }}</div>
              <div v-if="d.value === today" class="text-caption">اليوم</div>
            </div>

            <!-- Time-slot rows. Vue 3 REQUIRES the key on <template v-for>. -->
            <!-- eslint-disable-next-line vue/no-v-for-template-key -->
            <template v-for="row in weeklyCalendar" :key="row.slotKey">
              <div class="schedule-time" :title="`${row.start} - ${row.end}`">
                <span v-html="row.label.replace('\n', '<br>')" />
              </div>
              <div
                v-for="d in weekdays" :key="`${row.slotKey}-${d.value}`"
                class="schedule-cell"
                :class="{ 'schedule-cell-today': d.value === today }"
                @click="row.byDay[d.value].length === 0 && openCreateDialog({ weekday: d.value, start_time: row.start, end_time: row.end })"
              >
                <div v-if="row.byDay[d.value].length" class="schedule-cell-stack">
                  <VMenu v-for="s in row.byDay[d.value]" :key="s.__key" location="bottom center">
                    <template #activator="{ props }">
                      <div
                        v-bind="props" class="schedule-session"
                        :style="{ background: courseColor(s.course_id).bg, borderInlineStart: `4px solid ${courseColor(s.course_id).border}`, color: courseColor(s.course_id).text }"
                        :title="s.title || s.course_name"
                      >
                        <div class="schedule-session-title">{{ s.title || s.course_name || "جلسة" }}</div>
                        <div class="schedule-session-meta">{{ s.course_name }}</div>
                        <div class="schedule-session-foot">
                          <VChip size="x-small" variant="flat" color="white" class="opacity-75">
                            <VIcon icon="ri-group-line" size="10" start />
                            {{ s.attendees_count || 0 }}
                          </VChip>
                        </div>
                      </div>
                    </template>
                    <VList density="compact">
                      <VListItem prepend-icon="ri-team-line" @click="openViewStudentsDialog(s)">عرض الطلاب</VListItem>
                      <VListItem prepend-icon="ri-user-add-line" @click="openAddAttendeesDialog(s)">إضافة طلاب</VListItem>
                      <VListItem prepend-icon="ri-calendar-check-line" @click="navigateToAttendance(s)">سجل الحضور</VListItem>
                      <VListItem prepend-icon="ri-pencil-line" @click="editItem(s)">تعديل</VListItem>
                      <VListItem prepend-icon="ri-stop-circle-line" @click="openEndSessionDialog(s)">إنهاء الجلسة</VListItem>
                      <VDivider />
                      <VListItem prepend-icon="ri-delete-bin-line" base-color="error" @click="deleteItem(s)">حذف</VListItem>
                    </VList>
                  </VMenu>
                </div>
                <div v-else class="schedule-empty">
                  <VIcon icon="ri-add-line" size="14" class="opacity-50" />
                </div>
              </div>
            </template>
          </div>
        </VCardText>
      </VCard>

      <!-- Mobile day cards -->
      <div class="d-block d-md-none">
        <VCard
          v-for="day in mobileDays" :key="day.value"
          rounded="lg" elevation="0" class="border mb-3"
          :class="{ 'mobile-today': day.isToday }"
        >
          <VCardTitle class="d-flex align-center py-3 px-4">
            <VIcon :icon="day.isToday ? 'ri-calendar-event-line' : 'ri-calendar-line'" :color="day.isToday ? 'warning' : 'primary'" class="me-2" />
            <span>{{ day.text }}</span>
            <VChip v-if="day.isToday" size="x-small" color="warning" variant="flat" class="ms-2">اليوم</VChip>
            <VSpacer />
            <VChip size="small" color="primary" variant="tonal">{{ day.sessions.length }} جلسة</VChip>
          </VCardTitle>
          <VDivider />
          <VCardText class="pa-3">
            <div v-if="!day.sessions.length" class="text-center text-medium-emphasis py-3">
              لا توجد جلسات في {{ day.text }}
            </div>
            <div v-else class="d-flex flex-column ga-2">
              <VMenu v-for="s in day.sessions" :key="s.id" location="bottom center">
                <template #activator="{ props }">
                  <div
                    v-bind="props" class="mobile-session"
                    :style="{ background: courseColor(s.course_id).bg, borderInlineStart: `4px solid ${courseColor(s.course_id).border}` }"
                  >
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="font-weight-bold">{{ s.title || s.course_name }}</div>
                        <div class="text-caption text-medium-emphasis">{{ s.course_name }}</div>
                      </div>
                      <div class="text-end">
                        <div class="text-caption font-weight-bold">{{ s.start_time }}</div>
                        <div class="text-caption text-medium-emphasis">{{ s.end_time }}</div>
                      </div>
                    </div>
                    <div class="d-flex ga-1 mt-2">
                      <VChip size="x-small" color="primary" variant="tonal" prepend-icon="ri-group-line">
                        {{ s.attendees_count || 0 }} طالب
                      </VChip>
                      <VChip v-if="s.grade_name" size="x-small" color="info" variant="tonal">{{ s.grade_name }}</VChip>
                    </div>
                  </div>
                </template>
                <VList density="compact">
                  <VListItem prepend-icon="ri-team-line" @click="openViewStudentsDialog(s)">عرض الطلاب</VListItem>
                  <VListItem prepend-icon="ri-user-add-line" @click="openAddAttendeesDialog(s)">إضافة طلاب</VListItem>
                  <VListItem prepend-icon="ri-calendar-check-line" @click="navigateToAttendance(s)">سجل الحضور</VListItem>
                  <VListItem prepend-icon="ri-pencil-line" @click="editItem(s)">تعديل</VListItem>
                  <VListItem prepend-icon="ri-stop-circle-line" @click="openEndSessionDialog(s)">إنهاء الجلسة</VListItem>
                  <VDivider />
                  <VListItem prepend-icon="ri-delete-bin-line" base-color="error" @click="deleteItem(s)">حذف</VListItem>
                </VList>
              </VMenu>
            </div>
          </VCardText>
        </VCard>
      </div>
    </template>

    <!-- TABLE VIEW -->
    <VCard v-else rounded="lg" elevation="0" class="border">
      <VCardText>
        <div class="d-flex align-center mb-3">
          <VIcon icon="ri-table-line" color="primary" class="me-2" />
          <span class="text-subtitle-1 font-weight-bold">قائمة الجلسات</span>
          <VSpacer />
          <VChip color="primary" variant="flat" size="small">{{ numberWithComma(items.length) }} جلسة</VChip>
        </div>
        <SmartTable
          :headers="headers" :items="items"
          :actions="tableActions" :loading="loading"
          :totalItems="items.length" :tableOptions="tableOptions"
          @updateTableOptions="updateTableOptions"
          @editItem="editItem" @deleteItem="deleteItem"
          @showItem="navigateToAttendance"
          @showAttendeesItem="openViewStudentsDialog"
          @addAttendeesItem="openAddAttendeesDialog"
          @endSessionItem="openEndSessionDialog"
        />
      </VCardText>
    </VCard>

    <!-- Create/Edit dialog -->
    <VDialog v-model="sessionDialog.open" max-width="720">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon :icon="sessionDialog.mode === 'create' ? 'ri-add-circle-line' : 'ri-pencil-line'" color="primary" class="me-2" />
          {{ sessionDialog.mode === "create" ? "إضافة جلسة" : "تعديل الجلسة" }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="sessionDialog.conflictMessage" type="error" variant="tonal" density="compact" class="mb-3" prepend-icon="ri-error-warning-line">
            {{ sessionDialog.conflictMessage }}
          </VAlert>
          <VRow>
            <VCol cols="12">
              <VTextField v-model="sessionDialog.form.title" label="عنوان الجلسة (اختياري)" variant="outlined" density="comfortable" prepend-inner-icon="ri-text" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="sessionDialog.form.course_id"
                :items="courseItems" item-title="text" item-value="value"
                label="الكورس *" variant="outlined" density="comfortable"
                :loading="coursesLoading" prepend-inner-icon="ri-book-3-line"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="sessionDialog.form.weekdays"
                :items="weekdays" item-title="text" item-value="value"
                label="أيام الأسبوع *" multiple chips variant="outlined" density="comfortable"
                prepend-inner-icon="ri-calendar-2-line"
                :disabled="sessionDialog.mode === 'edit'"
                :hint="sessionDialog.mode === 'edit' ? 'لتغيير أكثر من يوم، احذف الجلسة وأنشئها من جديد' : 'يمكنك اختيار أكثر من يوم لإنشاء جلسات متعددة دفعة واحدة'"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="sessionDialog.form.start_time" type="time" label="البداية *" variant="outlined" density="comfortable" prepend-inner-icon="ri-time-line" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="sessionDialog.form.end_time" type="time" label="النهاية *" variant="outlined" density="comfortable" prepend-inner-icon="ri-time-line" />
            </VCol>
            <VCol cols="12">
              <VSwitch v-model="sessionDialog.form.recurrence" inset color="primary" :true-value="true" :false-value="false">
                <template #label>
                  <span class="font-weight-bold">تكرار أسبوعي</span>
                </template>
              </VSwitch>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="sessionDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="sessionDialog.saving" prepend-icon="ri-save-3-line" @click="saveSession">
            {{ sessionDialog.mode === "create" ? "إضافة" : "تحديث" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Manage attendees dialog -->
    <VDialog v-model="attendeesDialog.open" max-width="720">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon icon="ri-user-add-line" color="primary" class="me-2" />
          إضافة طلاب للجلسة
          <VSpacer />
          <VBtn icon="ri-close-line" variant="text" @click="attendeesDialog.open = false" />
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert type="info" variant="tonal" density="compact" class="mb-3">
            اختر الطلاب المؤكدين في هذا الكورس. الطلاب الموجودون مسبقاً محددون تلقائياً.
          </VAlert>
          <VSelect
            v-model="attendeesDialog.selectedIds"
            :items="attendeesDialog.candidates" item-title="name" item-value="id"
            label="اختر الطلاب" variant="outlined" density="comfortable"
            :loading="attendeesDialog.loading" :disabled="attendeesDialog.loading"
            multiple chips clearable
            prepend-inner-icon="ri-search-line"
          />
          <VDivider class="my-3" />
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-bold">الطلاب الحاليون</span>
            <VChip size="small" color="primary" variant="tonal">{{ attendeesDialog.currentDetailed.length }}</VChip>
          </div>
          <div v-if="attendeesDialog.loading" class="text-medium-emphasis">جاري التحميل...</div>
          <div v-else-if="!attendeesDialog.currentDetailed.length" class="text-medium-emphasis">لا يوجد طلاب بعد.</div>
          <div v-else class="d-flex flex-wrap ga-2">
            <VChip
              v-for="st in attendeesDialog.currentDetailed" :key="st.student_id || st"
              size="small" variant="outlined" closable
              @click:close="removeOneAttendee(st.student_id || st)"
            >
              {{ st.student_name || st }}
            </VChip>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="attendeesDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="attendeesDialog.loading" prepend-icon="ri-save-3-line" @click="submitAddAttendees">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- View students dialog -->
    <VDialog v-model="studentsViewDialog.open" max-width="720">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon icon="ri-team-line" color="primary" class="me-2" />
          طلاب الجلسة
          <VSpacer />
          <VBtn icon="ri-close-line" variant="text" @click="studentsViewDialog.open = false" />
        </VCardTitle>
        <VDivider />
        <VCardText>
          <div v-if="studentsViewDialog.loading" class="text-medium-emphasis">جاري التحميل...</div>
          <VAlert v-else-if="!studentsViewDialog.students.length" type="info" variant="tonal" density="compact">
            لا يوجد طلاب مسجلون في هذه الجلسة بعد.
          </VAlert>
          <VRow v-else>
            <VCol v-for="st in studentsViewDialog.students" :key="st.student_id" cols="12" sm="6">
              <VCard variant="tonal" class="pa-3 d-flex align-center ga-3">
                <VAvatar color="primary" size="36">
                  <span class="text-caption font-weight-bold">{{ (st.student_name || '?').charAt(0) }}</span>
                </VAvatar>
                <div>
                  <div class="text-subtitle-2 font-weight-bold">{{ st.student_name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ st.grade_name }} · {{ st.study_year }}</div>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="tonal" color="primary" @click="studentsViewDialog.open = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <ConfirmDangerDialog
      v-if="endDialog.open" v-model="endDialog.open"
      :messages="endDialog.messages" :title="endDialog.title"
      :confirmButtonText="endDialog.confirmButtonText" @confirm="handleEndSession"
    />
    <ConfirmDangerDialog
      v-if="deleteDialog.open" v-model="deleteDialog.open"
      :messages="deleteDialog.messages" :title="deleteDialog.title"
      :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete"
    />

    <BaseAlert
      v-if="alert.open" v-model="alert.open"
      :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false"
    />
  </div>
</template>

<style scoped>
.sessions-hero {
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
.kpi-today {
  background: linear-gradient(135deg, rgba(255, 138, 0, 0.06), rgba(255, 138, 0, 0));
}
.view-toggle :deep(.v-btn) {
  min-inline-size: 90px;
  padding-inline: 12px;
}

/* ---- Weekly grid ---- */
.schedule-grid {
  display: grid;
  align-items: stretch;
  gap: 6px;
  grid-template-columns: 110px repeat(7, minmax(0, 1fr));
}
.schedule-corner,
.schedule-day-head {
  padding: 10px 6px;
  text-align: center;
  border-radius: 10px;
  background: rgba(11, 37, 69, 0.05);
  font-weight: 700;
  color: #0B2545;
}
.schedule-day-today {
  background: rgba(255, 138, 0, 0.15) !important;
  color: #A55B00 !important;
  position: relative;
}
.schedule-time {
  padding: 8px 4px;
  text-align: center;
  border-radius: 10px;
  background: rgba(11, 37, 69, 0.04);
  font-size: 0.75rem;
  font-weight: 600;
  color: #0B2545;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.schedule-cell {
  border: 1px dashed rgba(11, 37, 69, 0.12);
  border-radius: 10px;
  min-block-size: 80px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.6);
  transition: background 0.15s ease;
}
.schedule-cell-today {
  background: rgba(255, 138, 0, 0.04);
}
.schedule-cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.schedule-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-block-size: 70px;
  opacity: 0.3;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.schedule-empty:hover { opacity: 0.8; }
.schedule-session {
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.schedule-session:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(11, 37, 69, 0.12);
}
.schedule-session-title {
  font-weight: 700;
  font-size: 0.8rem;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.schedule-session-meta {
  font-size: 0.7rem;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-block-start: 2px;
}
.schedule-session-foot {
  margin-block-start: 4px;
  display: flex;
  gap: 4px;
}

/* ---- Mobile day cards ---- */
.mobile-today {
  border: 2px solid #FF8A00 !important;
}
.mobile-session {
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.mobile-session:active { transform: scale(0.99); }
</style>
