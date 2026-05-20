<script>
// =====================================================
// Show Notifications v2 — rebuilt 2026-05-17.
// Bugs fixed:
//   • Pagination read corrected: `res.meta.pagination.total` (was
//     `res.pagination.total` → total stuck at 0).
//   • API client switched to a `params` object (was sending literal "null"
//     strings via encodeURIComponent of empty values).
//   • `link` sent as null/"" broke Zod (`z.string().url().optional().or(z.literal(""))`).
//     We now omit it entirely when empty.
//   • UUID fields (courseId, subjectId) omitted (not null'd) when empty.
//   • mdi-* icons replaced with ri-* (eslint rule).
// UX upgrade:
//   • Card list view — title, type chip, recipients, attachments at a glance.
//   • Filter bar with search + sub-type + course chips.
//   • 4 KPI cards: total / this week / your students / last sent.
//   • Cleaner send dialog with smart recipient mode toggles + sticky save.
//   • Image/PDF attachment chips (compact instead of file inputs cluttering).
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api";
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue";
import numberWithComma from "@/constant/number";

const SUB_TYPES = [
  { value: null,             text: "كل الأنواع",      color: "primary", icon: "ri-list-check-2" },
  { value: "homework",       text: "واجب بيتي",      color: "info",    icon: "ri-pencil-line" },
  { value: "message",        text: "رسالة",          color: "primary", icon: "ri-chat-3-line" },
  { value: "report",         text: "تقرير",          color: "info",    icon: "ri-file-chart-line" },
  { value: "notice",         text: "تبليغ",          color: "warning", icon: "ri-megaphone-line" },
  { value: "installments",   text: "أقساط",          color: "success", icon: "ri-money-dollar-circle-line" },
  { value: "attendance",     text: "حضور",           color: "info",    icon: "ri-calendar-check-line" },
  { value: "daily_summary",  text: "ملخص يومي",      color: "primary", icon: "ri-bookmark-line" },
  { value: "birthday",       text: "عيد ميلاد",      color: "warning", icon: "ri-cake-2-line" },
  { value: "daily_exam",     text: "امتحان يومي",    color: "error",   icon: "ri-question-line" },
];

const RECIPIENT_MODES = [
  { value: "specific_students",       text: "طلاب محددون",  icon: "ri-user-3-line" },
  { value: "students_of_course",      text: "طلاب الكورس",  icon: "ri-book-3-line" },
  { value: "students_of_session",     text: "طلاب الجلسة",  icon: "ri-calendar-line" },
  { value: "all_students_of_teacher", text: "كل طلابي",     icon: "ri-group-line" },
];

const TYPE_LABELS = {
  course_update:        { text: "تحديث دورة",     color: "info" },
  session_update:       { text: "تحديث جلسة",     color: "info" },
  teacher_message:      { text: "رسالة معلم",     color: "primary" },
  booking_update:       { text: "تحديث حجز",      color: "warning" },
  new_booking:          { text: "حجز جديد",       color: "success" },
  system:               { text: "نظام",            color: "grey" },
  system_announcement:  { text: "إعلان نظام",     color: "secondary" },
};

const RECIPIENT_LABELS = {
  all_students_of_teacher: "كل طلابي",
  students_of_course:      "طلاب الكورس",
  students_of_session:     "طلاب الجلسة",
  specific_students:       "طلاب محددون",
  specific_teachers:       "معلمون محددون",
  course_teachers:         "معلمي الكورس",
  all:                     "الكل",
};

export default {
  components: { ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-notifications-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "الإشعارات", disabled: true },
      ],
      contentUrl: localStorage.getItem("content_url") || "",

      // Filters
      filters: { subType: null, courseId: null },
      searchTerm: "",

      // Data
      items: [],
      loading: false,
      totalItems: 0,
      page: 1,
      limit: 12,

      // Reference selects
      courseItems: [],
      coursesLoading: false,
      subjectItems: [],
      subjectsLoading: false,
      sessionItems: [],
      sessionsLoading: false,
      studentsOptions: [],
      studentsLoading: false,

      SUB_TYPES,
      RECIPIENT_MODES,

      // Create dialog
      createDialog: {
        open: false,
        loading: false,
        form: {
          subType: null,
          title: "",
          message: "",
          courseId: null,
          subjectId: null,
          link: "",
          recipients: { mode: "specific_students", selectedStudentIds: [], courseIdForStudents: null, sessionIdForStudents: null },
          attachments: { pdfBase64: null, imagesBase64: [] },
          priority: "medium",
        },
      },

      deleteDialog: {
        open: false,
        data: null,
        title: "تأكيد الحذف",
        confirmButtonText: "حذف الإشعار",
        messages: ["سيتم حذف هذا الإشعار.", "لا يمكن التراجع عن العملية."],
      },

      alert: { open: false, message: null, type: "success" },
    };
  },

  computed: {
    weekSentCount() {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return this.items.filter(it => {
        const d = new Date(it.sent_at || it.created_at).getTime();
        return Number.isFinite(d) && d >= weekAgo;
      }).length;
    },
    broadcastCount() {
      return this.items.filter(it => {
        const mode = it.data?.recipients?.mode || it.recipient_type;
        return mode === "all_students_of_teacher" || mode === "all";
      }).length;
    },
    lastSent() {
      if (!this.items.length) return null;
      const sorted = [...this.items].sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
      return sorted[0]?.sent_at || sorted[0]?.created_at || null;
    },
    selectedAllStudents: {
      get() {
        const all = (this.studentsOptions || []).map(s => s.id);
        const sel = this.createDialog.form.recipients.selectedStudentIds || [];
        return all.length > 0 && sel.length === all.length;
      },
      set(v) {
        this.createDialog.form.recipients.selectedStudentIds = v
          ? (this.studentsOptions || []).map(s => s.id)
          : [];
      },
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null");
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters };
      if (typeof stored.searchTerm === "string") this.searchTerm = stored.searchTerm;
    }
    Promise.all([this.loadCourseNames(), this.loadSubjects(), this.loadSessionNames()]);
    this.fetchNotifications();
  },

  methods: {
    numberWithComma,
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },

    formatDateTime(value) {
      if (!value) return "—";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      const am = h < 12;
      h = h % 12 || 12;
      return `${dd}/${mm}/${d.getFullYear()} · ${h}:${m} ${am ? "ص" : "م"}`;
    },
    formatRelative(value) {
      if (!value) return "—";
      const diff = Date.now() - new Date(value).getTime();
      if (!Number.isFinite(diff) || diff < 0) return this.formatDateTime(value);
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "الآن";
      if (mins < 60) return `قبل ${mins} دقيقة`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `قبل ${hours} ساعة`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `قبل ${days} يوم`;
      return this.formatDateTime(value);
    },

    subTypeInfo(v) {
      return SUB_TYPES.find(s => s.value === v) || null;
    },
    typeInfo(v) {
      return TYPE_LABELS[v] || { text: v || "—", color: "grey" };
    },
    recipientsLabel(it) {
      const rec = it.data?.recipients || null;
      if (rec && typeof rec === "object") {
        const mode = rec.mode || rec.type || "-";
        const cnt = rec.studentCount ?? (Array.isArray(rec.studentIds) ? rec.studentIds.length : undefined);
        const modeLabel = RECIPIENT_LABELS[mode] || String(mode);
        return cnt !== undefined ? `${modeLabel} (${cnt})` : modeLabel;
      }
      const legacyMode = it.recipient_type;
      const legacyCnt = Array.isArray(it.recipient_ids) ? it.recipient_ids.length : undefined;
      const modeLabel = RECIPIENT_LABELS[legacyMode] || (legacyMode ? String(legacyMode) : "—");
      return legacyCnt !== undefined ? `${modeLabel} (${legacyCnt})` : modeLabel;
    },
    senderName(it) {
      return it.sender?.name || it.data?.sender?.name || "—";
    },
    resolveImageUrl(path) {
      if (!path) return "";
      if (/^(https?:|data:|blob:)/i.test(path)) return path;
      const base = (this.contentUrl || "").replace(/\/$/, "");
      const rel = path.startsWith("/") ? path : `/${path}`;
      return `${base}${rel}`;
    },
    attachmentImages(it) {
      const imgs = it.data?.attachments?.imagesBase64 || it.data?.attachments?.images || [];
      const url  = it.data?.imageUrl || it.data?.image_url;
      const arr = Array.isArray(imgs) ? [...imgs] : [];
      if (url) arr.unshift(url);
      return arr.map(this.resolveImageUrl).filter(Boolean);
    },
    attachmentPdf(it) {
      return it.data?.attachments?.pdfBase64 || it.data?.attachments?.pdf || null;
    },

    persistState() {
      localStorage.setItem(this.keyName, JSON.stringify({
        filters: this.filters,
        searchTerm: this.searchTerm,
      }));
    },

    // ---- Reference loaders ----
    async loadCourseNames() {
      this.coursesLoading = true;
      try {
        const res = await TeacherApi.getCourseNames();
        this.courseItems = (res?.data?.data || []).map(c => ({ text: c.name, value: c.id }));
      } catch { /* noop */ }
      finally { this.coursesLoading = false; }
    },
    async loadSubjects() {
      this.subjectsLoading = true;
      try {
        const res = await TeacherApi.getAllSubjects();
        this.subjectItems = (res?.data?.data || []).map(s => ({ text: s.name, value: s.id }));
      } catch { /* noop */ }
      finally { this.subjectsLoading = false; }
    },
    async loadSessionNames() {
      this.sessionsLoading = true;
      try {
        const res = await TeacherApi.getSessionNames();
        this.sessionItems = (res?.data?.data || []).map(x => ({ text: x.title || x.name, value: x.id }));
      } catch { /* noop */ }
      finally { this.sessionsLoading = false; }
    },

    async fetchNotifications() {
      this.loading = true;
      try {
        this.persistState();
        const opts = {
          page: this.page,
          limit: this.limit,
        };
        if (this.searchTerm?.trim()) opts.q = this.searchTerm.trim();
        if (this.filters.subType)    opts.subType = this.filters.subType;
        if (this.filters.courseId)   opts.courseId = this.filters.courseId;
        const res = await TeacherApi.getNotifications(opts);
        const env = res?.data || {};
        const list = Array.isArray(env.data) ? env.data : [];
        const pagination = env.meta?.pagination || {};
        if (env.content_url) {
          this.contentUrl = env.content_url;
          localStorage.setItem("content_url", env.content_url);
        }
        this.totalItems = pagination.total ?? list.length;

        // Client-side subType filter (in case backend doesn't honor it).
        let filtered = list;
        if (this.filters.subType) {
          filtered = list.filter(n => (n?.data?.subType || n?.subType) === this.filters.subType);
        }
        this.items = filtered.map((it, idx) => ({
          ...it,
          num: (this.page - 1) * this.limit + idx + 1,
        }));
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر جلب الإشعارات");
      } finally {
        this.loading = false;
      }
    },

    onFilterChange() { this.page = 1; this.fetchNotifications(); },
    onSearch() { this.page = 1; this.fetchNotifications(); },
    onPageChange(p) { this.page = p; this.fetchNotifications(); },
    setSubType(v) { this.filters.subType = v; this.onFilterChange(); },
    reload() {
      localStorage.removeItem(this.keyName);
      this.filters = { subType: null, courseId: null };
      this.searchTerm = "";
      this.page = 1;
      this.fetchNotifications();
    },

    // ---- Create dialog ----
    openCreateDialog() {
      this.createDialog.form = {
        subType: null,
        title: "",
        message: "",
        courseId: null,
        subjectId: null,
        link: "",
        recipients: { mode: "specific_students", selectedStudentIds: [], courseIdForStudents: null, sessionIdForStudents: null },
        attachments: { pdfBase64: null, imagesBase64: [] },
        priority: "medium",
      };
      this.studentsOptions = [];
      this.createDialog.open = true;
      // Pre-load students for the default mode
      this.loadAllStudents();
    },
    async onRecipientsModeChange() {
      const mode = this.createDialog.form.recipients.mode;
      this.createDialog.form.recipients.selectedStudentIds = [];
      this.createDialog.form.recipients.courseIdForStudents = null;
      this.createDialog.form.recipients.sessionIdForStudents = null;
      this.studentsOptions = [];
      if (mode === "all_students_of_teacher" || mode === "specific_students") {
        await this.loadAllStudents();
        if (mode === "all_students_of_teacher") {
          this.createDialog.form.recipients.selectedStudentIds = this.studentsOptions.map(s => s.id);
        }
      }
    },
    async loadAllStudents() {
      this.studentsLoading = true;
      try {
        const res = await TeacherApi.getTeacherStudents();
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } catch { this.showAlert("error", "تعذّر جلب طلاب المعلم"); }
      finally { this.studentsLoading = false; }
    },
    async loadStudentsByCourse(courseId) {
      if (!courseId) { this.studentsOptions = []; this.createDialog.form.recipients.selectedStudentIds = []; return; }
      this.studentsLoading = true;
      try {
        const res = await TeacherApi.getStudentsByCourse(courseId);
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
        this.createDialog.form.recipients.selectedStudentIds = this.studentsOptions.map(s => s.id);
      } catch { this.showAlert("error", "تعذّر جلب طلاب الكورس"); }
      finally { this.studentsLoading = false; }
    },
    async loadStudentsBySession(sessionId) {
      if (!sessionId) { this.studentsOptions = []; this.createDialog.form.recipients.selectedStudentIds = []; return; }
      this.studentsLoading = true;
      try {
        const res = await TeacherApi.getStudentsBySession(sessionId);
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
        this.createDialog.form.recipients.selectedStudentIds = this.studentsOptions.map(s => s.id);
      } catch { this.showAlert("error", "تعذّر جلب طلاب الجلسة"); }
      finally { this.studentsLoading = false; }
    },

    async onPdfSelected(e) {
      const file = e?.target?.files?.[0] || (Array.isArray(e) ? e[0] : e?.[0]);
      if (!file) { this.createDialog.form.attachments.pdfBase64 = null; return; }
      this.createDialog.form.attachments.pdfBase64 = await this.toBase64(file);
    },
    async onImagesSelected(e) {
      const list = e?.target?.files ? Array.from(e.target.files) : (Array.isArray(e) ? e : []);
      const arr = [];
      for (const f of list) arr.push(await this.toBase64(f));
      this.createDialog.form.attachments.imagesBase64 = arr;
    },
    removeImageAttachment(idx) {
      this.createDialog.form.attachments.imagesBase64.splice(idx, 1);
    },
    removePdfAttachment() {
      this.createDialog.form.attachments.pdfBase64 = null;
    },
    toBase64(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    },

    async submitCreateNotification() {
      const f = this.createDialog.form;
      if (!f.title?.trim()) { this.showAlert("error", "العنوان مطلوب"); return; }
      if (!f.message?.trim()) { this.showAlert("error", "نص الرسالة مطلوب"); return; }
      if (!f.recipients?.mode) { this.showAlert("error", "اختر نطاق المستلمين"); return; }

      const mode = f.recipients.mode;
      const recipients = { mode };
      if (mode === "specific_students" || mode === "students_of_course" || mode === "students_of_session") {
        const ids = (f.recipients.selectedStudentIds || []).map(String);
        if (!ids.length) { this.showAlert("error", "اختر طالباً واحداً على الأقل"); return; }
        recipients.studentIds = ids;
      }

      const attachments = {};
      if (f.attachments?.pdfBase64) attachments.pdfBase64 = f.attachments.pdfBase64;
      if (f.attachments?.imagesBase64?.length) attachments.imagesBase64 = f.attachments.imagesBase64;

      // Build payload — OMIT empty/null UUIDs and link (schema rejects empty strings).
      const payload = {
        type: "teacher_message",
        title: f.title.trim(),
        message: f.message.trim(),
        recipients,
        attachments,
        priority: f.priority || "medium",
      };
      if (f.subType) payload.subType = f.subType;
      if (f.courseId) payload.courseId = f.courseId;
      if (f.subjectId) payload.subjectId = f.subjectId;
      if (f.link?.trim()) payload.link = f.link.trim();

      this.createDialog.loading = true;
      try {
        const res = await TeacherApi.createNotification(payload);
        this.showAlert("success", res?.data?.message || "تم إرسال الإشعار");
        this.createDialog.open = false;
        await this.fetchNotifications();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر الإرسال");
      } finally {
        this.createDialog.loading = false;
      }
    },

    handleDelete(item) {
      this.deleteDialog.data = item;
      this.deleteDialog.open = true;
    },
    async handleDeleteConfirm() {
      try {
        const id = this.deleteDialog?.data?.id;
        if (!id) return;
        const res = await TeacherApi.deleteNotification(id);
        this.showAlert("success", res?.data?.message || "تم الحذف");
        this.deleteDialog.open = false;
        await this.fetchNotifications();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف");
      }
    },
  },
};
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="notif-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon icon="ri-notification-3-line" size="28" color="white" />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">إشعارات المعلم</div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          أرسل رسائل مستهدفة لطلابك بكل سهولة. <strong>{{ broadcastCount }}</strong> رسالة جماعية في القائمة.
        </div>
      </div>
      <VBtn color="warning" prepend-icon="ri-add-line" size="large" rounded="pill" @click="openCreateDialog">
        إشعار جديد
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
            <div class="text-h5 font-weight-bold">{{ numberWithComma(totalItems) }}</div>
            <div class="text-caption text-medium-emphasis">إشعار</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-calendar-event-line" color="info" size="24" />
              <VChip size="small" color="info" variant="flat">7 أيام</VChip>
            </div>
            <div class="text-h5 font-weight-bold">{{ weekSentCount }}</div>
            <div class="text-caption text-medium-emphasis">هذا الأسبوع</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-broadcast-line" color="warning" size="24" />
              <VChip size="small" color="warning" variant="flat">جماعي</VChip>
            </div>
            <div class="text-h5 font-weight-bold text-warning">{{ broadcastCount }}</div>
            <div class="text-caption text-medium-emphasis">لكل طلابي</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-time-line" color="success" size="24" />
              <VChip size="small" color="success" variant="flat">آخر</VChip>
            </div>
            <div class="text-body-1 font-weight-bold">{{ formatRelative(lastSent) }}</div>
            <div class="text-caption text-medium-emphasis">آخر إشعار</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Filter bar -->
    <VCard rounded="lg" elevation="0" class="mb-4 border">
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2 flex-wrap">
          <VIcon icon="ri-filter-3-line" color="primary" />
          <span class="text-subtitle-1 font-weight-bold">التصفية والبحث</span>
          <VSpacer />
          <VBtn variant="text" size="small" prepend-icon="ri-refresh-line" @click="reload">إعادة تعيين</VBtn>
        </div>

        <!-- Sub-type chips -->
        <div class="d-flex flex-wrap ga-2 mb-3">
          <VChip
            v-for="t in SUB_TYPES" :key="t.value ?? 'all'"
            :color="t.color"
            :variant="filters.subType === t.value ? 'flat' : 'tonal'"
            :prepend-icon="t.icon"
            class="cursor-pointer"
            @click="setSubType(t.value)"
          >{{ t.text }}</VChip>
        </div>

        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="searchTerm" prepend-inner-icon="ri-search-line"
              label="بحث في عنوان أو نص الإشعار"
              density="comfortable" variant="outlined" clearable
              @keyup.enter="onSearch" @click:clear="onSearch"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="filters.courseId"
              :items="courseItems" item-title="text" item-value="value"
              label="فلتر حسب الكورس" density="comfortable" variant="outlined"
              :loading="coursesLoading" clearable
              prepend-inner-icon="ri-book-3-line"
              @update:model-value="onFilterChange"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Loading skeleton -->
    <VRow v-if="loading && !items.length">
      <VCol v-for="n in 4" :key="n" cols="12" md="6">
        <VCard rounded="lg" elevation="0" class="border">
          <VSkeletonLoader type="article" />
        </VCard>
      </VCol>
    </VRow>

    <!-- Empty -->
    <VCard v-else-if="!items.length" rounded="lg" elevation="0" class="border text-center pa-8">
      <VIcon icon="ri-notification-off-line" size="64" color="grey" class="mb-3" />
      <div class="text-h6 mb-2">لا توجد إشعارات</div>
      <div class="text-body-2 text-medium-emphasis mb-4">ابدأ بإرسال إشعارك الأول لطلابك.</div>
      <VBtn color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">إشعار جديد</VBtn>
    </VCard>

    <!-- Cards -->
    <VRow v-else>
      <VCol v-for="it in items" :key="it.id" cols="12" md="6">
        <VCard rounded="lg" elevation="0" class="notif-card h-100 d-flex flex-column">
          <VCardText class="flex-grow-1">
            <!-- Header -->
            <div class="d-flex align-start ga-3 mb-3">
              <VAvatar :color="typeInfo(it.type).color" size="40" rounded>
                <VIcon :icon="subTypeInfo(it.data?.subType)?.icon || 'ri-notification-3-line'" color="white" />
              </VAvatar>
              <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span class="text-subtitle-1 font-weight-bold text-truncate">{{ it.title || "—" }}</span>
                  <VChip v-if="subTypeInfo(it.data?.subType)" :color="subTypeInfo(it.data?.subType).color" size="x-small" variant="flat">
                    {{ subTypeInfo(it.data?.subType).text }}
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  <VIcon icon="ri-time-line" size="12" class="me-1" />
                  {{ formatRelative(it.sent_at || it.created_at) }}
                </div>
              </div>
              <VMenu location="bottom end">
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="ri-more-2-fill" variant="text" size="small" />
                </template>
                <VList density="compact">
                  <VListItem prepend-icon="ri-delete-bin-line" base-color="error" @click="handleDelete(it)">حذف</VListItem>
                </VList>
              </VMenu>
            </div>

            <!-- Message -->
            <div class="message-box pa-3 rounded mb-3">
              <div class="text-body-2" style="white-space: pre-wrap;">{{ it.message || "—" }}</div>
            </div>

            <!-- Image attachments -->
            <div v-if="attachmentImages(it).length" class="d-flex flex-wrap ga-2 mb-3">
              <VImg
                v-for="(url, idx) in attachmentImages(it)" :key="idx"
                :src="url" :width="80" :height="80"
                cover rounded class="attachment-img"
              />
            </div>

            <!-- PDF attachment -->
            <div v-if="attachmentPdf(it)" class="mb-3">
              <VChip color="error" variant="tonal" prepend-icon="ri-file-pdf-2-line">مرفق PDF</VChip>
            </div>

            <!-- Meta chips -->
            <div class="d-flex flex-wrap ga-1">
              <VChip size="x-small" :color="typeInfo(it.type).color" variant="tonal" prepend-icon="ri-price-tag-3-line">
                {{ typeInfo(it.type).text }}
              </VChip>
              <VChip size="x-small" color="info" variant="tonal" prepend-icon="ri-group-line">
                {{ recipientsLabel(it) }}
              </VChip>
              <VChip v-if="senderName(it) !== '—'" size="x-small" color="primary" variant="tonal" prepend-icon="ri-user-3-line">
                {{ senderName(it) }}
              </VChip>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Pagination -->
    <div v-if="totalItems > limit" class="d-flex justify-center mt-6">
      <VPagination
        :model-value="page" :length="Math.ceil(totalItems / limit)"
        :total-visible="5" color="primary"
        @update:model-value="onPageChange"
      />
    </div>

    <!-- Create dialog -->
    <VDialog v-model="createDialog.open" max-width="900" scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center py-4 px-6">
          <VIcon icon="ri-notification-3-line" color="primary" class="me-2" />
          <span class="text-h6">إشعار جديد</span>
          <VSpacer />
          <VBtn icon="ri-close-line" variant="text" @click="createDialog.open = false" />
        </VCardTitle>
        <VDivider />
        <VCardText style="max-height: 75vh;">
          <!-- Step 1: content -->
          <div class="dialog-section mb-4">
            <div class="d-flex align-center mb-3 ga-2">
              <VAvatar color="primary" variant="tonal" size="26"><span class="text-caption font-weight-bold">1</span></VAvatar>
              <span class="text-subtitle-2 font-weight-bold">المحتوى</span>
            </div>
            <VRow dense>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="createDialog.form.subType"
                  :items="SUB_TYPES.filter(s => s.value)" item-title="text" item-value="value"
                  label="نوع الإشعار" variant="outlined" density="comfortable"
                  prepend-inner-icon="ri-price-tag-3-line"
                />
              </VCol>
              <VCol cols="12" md="8">
                <VTextField v-model="createDialog.form.title" label="عنوان الإشعار *" variant="outlined" density="comfortable" prepend-inner-icon="ri-text" />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="createDialog.form.message" label="نص الرسالة *" variant="outlined" rows="4" auto-grow prepend-inner-icon="ri-chat-3-line" />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="createDialog.form.courseId"
                  :items="courseItems" item-title="text" item-value="value"
                  label="الكورس (اختياري)" variant="outlined" density="comfortable"
                  :loading="coursesLoading" clearable
                  prepend-inner-icon="ri-book-3-line"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="createDialog.form.subjectId"
                  :items="subjectItems" item-title="text" item-value="value"
                  label="المادة (اختياري)" variant="outlined" density="comfortable"
                  :loading="subjectsLoading" clearable
                  prepend-inner-icon="ri-book-open-line"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="createDialog.form.link" label="رابط (اختياري)"
                  variant="outlined" density="comfortable"
                  prepend-inner-icon="ri-link"
                  hint="https://..."
                  persistent-hint
                />
              </VCol>
            </VRow>
          </div>

          <VDivider class="mb-4" />

          <!-- Step 2: recipients -->
          <div class="dialog-section mb-4">
            <div class="d-flex align-center mb-3 ga-2">
              <VAvatar color="primary" variant="tonal" size="26"><span class="text-caption font-weight-bold">2</span></VAvatar>
              <span class="text-subtitle-2 font-weight-bold">المستلمون</span>
            </div>
            <div class="d-flex flex-wrap ga-2 mb-3">
              <VChip
                v-for="m in RECIPIENT_MODES" :key="m.value"
                :color="createDialog.form.recipients.mode === m.value ? 'primary' : 'default'"
                :variant="createDialog.form.recipients.mode === m.value ? 'flat' : 'tonal'"
                :prepend-icon="m.icon"
                class="cursor-pointer"
                @click="createDialog.form.recipients.mode = m.value; onRecipientsModeChange()"
              >{{ m.text }}</VChip>
            </div>

            <VRow dense>
              <!-- students_of_course requires picking a course -->
              <VCol v-if="createDialog.form.recipients.mode === 'students_of_course'" cols="12" md="6">
                <VSelect
                  v-model="createDialog.form.recipients.courseIdForStudents"
                  :items="courseItems" item-title="text" item-value="value"
                  label="اختر الكورس" variant="outlined" density="comfortable"
                  :loading="coursesLoading" prepend-inner-icon="ri-book-3-line"
                  @update:model-value="loadStudentsByCourse"
                />
              </VCol>
              <!-- students_of_session requires picking a session -->
              <VCol v-if="createDialog.form.recipients.mode === 'students_of_session'" cols="12" md="6">
                <VSelect
                  v-model="createDialog.form.recipients.sessionIdForStudents"
                  :items="sessionItems" item-title="text" item-value="value"
                  label="اختر الجلسة" variant="outlined" density="comfortable"
                  :loading="sessionsLoading" prepend-inner-icon="ri-calendar-line"
                  @update:model-value="loadStudentsBySession"
                />
              </VCol>

              <!-- Students multi-select -->
              <VCol v-if="createDialog.form.recipients.mode !== 'all_students_of_teacher'" cols="12" :md="createDialog.form.recipients.mode === 'specific_students' ? 12 : 6">
                <VSelect
                  v-model="createDialog.form.recipients.selectedStudentIds"
                  :items="studentsOptions" item-title="name" item-value="id"
                  label="اختر الطلاب" variant="outlined" density="comfortable"
                  :loading="studentsLoading"
                  multiple chips clearable
                  prepend-inner-icon="ri-search-line"
                >
                  <template #prepend-item>
                    <VListItem @click="selectedAllStudents = !selectedAllStudents">
                      <template #prepend>
                        <VCheckbox :model-value="selectedAllStudents" hide-details />
                      </template>
                      <VListItemTitle class="font-weight-bold">تحديد الكل ({{ studentsOptions.length }})</VListItemTitle>
                    </VListItem>
                    <VDivider />
                  </template>
                </VSelect>
              </VCol>
              <VCol v-else cols="12">
                <VAlert type="info" variant="tonal" density="compact" prepend-icon="ri-group-line">
                  سيُرسل الإشعار إلى <strong>كل طلابك ({{ studentsOptions.length }})</strong> تلقائياً.
                </VAlert>
              </VCol>
            </VRow>
          </div>

          <VDivider class="mb-4" />

          <!-- Step 3: attachments -->
          <div class="dialog-section">
            <div class="d-flex align-center mb-3 ga-2">
              <VAvatar color="primary" variant="tonal" size="26"><span class="text-caption font-weight-bold">3</span></VAvatar>
              <span class="text-subtitle-2 font-weight-bold">المرفقات (اختياري)</span>
            </div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VFileInput
                  label="مرفق PDF" accept="application/pdf"
                  prepend-icon="ri-file-pdf-2-line"
                  variant="outlined" density="comfortable"
                  @change="onPdfSelected"
                />
                <VChip v-if="createDialog.form.attachments.pdfBase64" color="error" variant="tonal" size="small" closable class="mt-1" @click:close="removePdfAttachment">
                  مرفق PDF جاهز
                </VChip>
              </VCol>
              <VCol cols="12" md="6">
                <VFileInput
                  label="صور (متعددة)" accept="image/*" multiple
                  prepend-icon="ri-image-2-line"
                  variant="outlined" density="comfortable"
                  @change="onImagesSelected"
                />
                <div v-if="createDialog.form.attachments.imagesBase64.length" class="d-flex flex-wrap ga-1 mt-1">
                  <VChip
                    v-for="(_, idx) in createDialog.form.attachments.imagesBase64" :key="idx"
                    color="info" variant="tonal" size="small" closable
                    @click:close="removeImageAttachment(idx)"
                  >صورة #{{ idx + 1 }}</VChip>
                </div>
              </VCol>
            </VRow>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions class="px-6 py-3">
          <VSpacer />
          <VBtn variant="text" @click="createDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="createDialog.loading" prepend-icon="ri-send-plane-line" @click="submitCreateNotification">
            إرسال الإشعار
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <ConfirmDangerDialog
      v-if="deleteDialog.open" v-model="deleteDialog.open"
      :messages="deleteDialog.messages" :title="deleteDialog.title"
      :confirmButtonText="deleteDialog.confirmButtonText"
      @confirm="handleDeleteConfirm"
    />

    <BaseAlert
      v-if="alert.open" v-model="alert.open"
      :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false"
    />
  </div>
</template>

<style scoped>
.notif-hero {
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
.notif-card {
  border: 1px solid rgba(11, 37, 69, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.notif-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(11, 37, 69, 0.08);
}
.cursor-pointer { cursor: pointer; }
.message-box {
  background: rgba(11, 37, 69, 0.04);
  border-inline-start: 3px solid #3FA9F5;
}
.attachment-img {
  border: 1px solid rgba(11, 37, 69, 0.1);
}
.dialog-section {
  padding: 4px;
}
</style>
