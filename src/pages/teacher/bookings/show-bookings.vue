<script>
// =====================================================
// Show Bookings v2 — rebuilt 2026-05-17.
// Workflow-aware redesign for the teacher's most-used review queue.
// Big changes vs v1 (9-column dense table + every action button always visible):
//   • CARD GRID by default — each booking is a card with student, course,
//     status badge, dates, message, and ONLY the actions valid for the
//     current status (no more "what does تاكيد do on a rejected booking?").
//   • Status pill bar at the top — one click filters by status (الكل / معلقة /
//     موافقة أولية / مؤكدة / مرفوضة / ملغاة), with live counts where available.
//   • 4 KPI cards: total / pending / pre_approved / confirmed.
//   • Brand UI (navy hero + tonal accents) — matches sibling teacher pages.
//   • Subscription capacity strip ("الباقة: X من Y طالب") so the teacher
//     knows their headroom before approving.
//   • Free-text search wired (was hard-coded to "null" via string-interp).
//   • Fixed the v1 reactivity leak in updateResponseDialog (was binding the
//     same row reference).
//   • mdi-* icons → ri-* (eslint rule).
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api";
import ConfirmDangerDialog from "@/components/ConfirmDangerDialog.vue";
import numberWithComma from "@/constant/number";

const DEFAULT_PRE_APPROVE_RESPONSE = "مرحباً بكم في الدورة، يرجى إحضار مبلغ الحجز لتأكيد الحجز";
const DEFAULT_CONSENT_RESPONSE = "مرحباً بكم في الدورة، يرجى إحضار مبلغ الحجز لتأكيد الحجز";

export default {
  components: { ConfirmDangerDialog },
  data() {
    return {
      keyName: "teacher-show-bookings-v2",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "الحجوزات", disabled: true },
      ],

      // Reference / KPIs
      studyYears: [],
      yearsLoading: false,
      pendingCount: 0,
      subscription: { currentStudents: 0, maxStudents: 0, remaining: 0, canAdd: true },
      pageCounts: { pending: 0, pre_approved: 0, confirmed: 0, approved: 0, rejected: 0, cancelled: 0 },

      // Filters
      filters: {
        study_year: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        status: null,
      },
      searchTerm: "",
      statusPills: [
        { label: "الكل",          value: null,           color: "primary", icon: "ri-list-check-2" },
        { label: "قيد الانتظار",  value: "pending",      color: "warning", icon: "ri-time-line" },
        { label: "موافقة أولية",  value: "pre_approved", color: "info",    icon: "ri-thumb-up-line" },
        { label: "مؤكدة",         value: "confirmed",    color: "success", icon: "ri-checkbox-circle-line" },
        { label: "مقبولة",        value: "approved",     color: "success", icon: "ri-shield-check-line" },
        { label: "مرفوضة",        value: "rejected",     color: "error",   icon: "ri-close-circle-line" },
        { label: "ملغاة",         value: "cancelled",    color: "grey",    icon: "ri-forbid-line" },
      ],

      // Data
      items: [],
      loading: false,
      totalItems: 0,
      page: 1,
      limit: 12,

      // Dialogs
      preApproveDialog: { open: false, data: null, teacherResponse: DEFAULT_PRE_APPROVE_RESPONSE, saving: false },
      consentDialog:    { open: false, data: null, teacherResponse: DEFAULT_CONSENT_RESPONSE, reservationPaid: false, saving: false },
      rejectDialog:     { open: false, data: null, rejectionReason: "", teacherResponse: "", saving: false },
      updateResponseDialog: { open: false, data: null, teacherResponse: "", saving: false },
      enableDialog:     { open: false, data: null, messages: [], title: null, confirmButtonText: null, checkboxLabel: null },
      deleteDialog:     { open: false, data: null, messages: [], title: null, confirmButtonText: null },
      insufficientBalanceDialog: { open: false },

      alert: { open: false, message: null, type: "success" },
    };
  },

  computed: {
    activeStudyYear() {
      return this.filters.study_year || this.studyYears[0]?.value || "—";
    },
    capacityPct() {
      const max = Number(this.subscription.maxStudents) || 0;
      if (max <= 0) return 0;
      const cur = Number(this.subscription.currentStudents) || 0;
      return Math.min(100, Math.round((cur / max) * 100));
    },
    hasReservationSelected() {
      return this.consentDialog?.data?.course?.hasReservation === true;
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null");
    if (stored) {
      if (stored.filters) this.filters = { ...this.filters, ...stored.filters };
      if (stored.page) this.page = stored.page;
      if (typeof stored.searchTerm === "string") this.searchTerm = stored.searchTerm;
    }
    this.loadAcademicYears();
    this.loadSubscriptionCapacity();
  },

  methods: {
    numberWithComma,
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
    formatDate(d) {
      if (!d) return "—";
      const dt = new Date(d);
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${dt.getFullYear()}`;
    },
    formatRelative(d) {
      if (!d) return "—";
      const now = Date.now();
      const then = new Date(d).getTime();
      const diff = Math.max(0, now - then);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return "اليوم";
      if (days === 1) return "أمس";
      if (days < 7) return `قبل ${days} أيام`;
      if (days < 30) return `قبل ${Math.floor(days / 7)} أسابيع`;
      return this.formatDate(d);
    },
    statusInfo(s) {
      return this.statusPills.find(p => p.value === s) || { label: s || "—", color: "grey", icon: "ri-circle-line" };
    },
    studentInitials(name) {
      if (!name) return "?";
      const parts = String(name).trim().split(/\s+/);
      return parts.length === 1 ? parts[0].charAt(0) : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0));
    },

    persistState() {
      localStorage.setItem(this.keyName, JSON.stringify({
        filters: this.filters,
        page: this.page,
        searchTerm: this.searchTerm,
      }));
    },

    async loadAcademicYears() {
      this.yearsLoading = true;
      try {
        const res = await TeacherApi.getAcademicYears();
        const data = res?.data?.data || {};
        const years = Array.isArray(data.years) ? data.years : [];
        const active = data.active || null;
        this.studyYears = years.map((y) => ({ label: y.year, value: y.year }));
        if (!this.filters.study_year) this.filters.study_year = active?.year || "";
        await this.fetchBookings();
        await this.fetchStats();
      } catch {
        await this.fetchBookings();
      } finally {
        this.yearsLoading = false;
      }
    },

    async loadSubscriptionCapacity() {
      try {
        const res = await TeacherApi.getRemainingStudents();
        const data = res?.data?.data || {};
        this.subscription = {
          currentStudents: Number(data.currentStudents) || 0,
          maxStudents: Number(data.maxStudents) || 0,
          remaining: Number(data.remaining) || 0,
          canAdd: Boolean(data.canAdd),
        };
      } catch { /* silent: capacity is informational */ }
    },

    async fetchStats() {
      if (!this.filters.study_year) return;
      try {
        const res = await TeacherApi.getBookingStats(this.filters.study_year);
        const data = res?.data?.data || {};
        this.pendingCount = Number(data.pendingBookings) || 0;
      } catch { /* silent */ }
    },

    async fetchBookings() {
      this.loading = true;
      try {
        this.persistState();
        if (!this.filters.study_year) { this.items = []; this.totalItems = 0; return; }
        const res = await TeacherApi.getBookings({
          options: {
            page: this.page,
            limit: this.limit,
            studyYear: this.filters.study_year,
            status: this.filters.status || null,
            search: this.searchTerm?.trim() || null,
          },
        });
        const env = res?.data || {};
        const list = Array.isArray(env.data) ? env.data : [];
        const pagination = env.meta?.pagination || {};
        this.totalItems = pagination.total ?? list.length;
        this.items = list.map((it, idx) => ({
          ...it,
          num: (this.page - 1) * this.limit + idx + 1,
        }));

        // Per-status counts on the current page (best-effort indicator)
        const counts = { pending: 0, pre_approved: 0, confirmed: 0, approved: 0, rejected: 0, cancelled: 0 };
        for (const b of this.items) {
          if (counts[b.status] !== undefined) counts[b.status] += 1;
        }
        this.pageCounts = counts;
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر جلب الحجوزات");
      } finally {
        this.loading = false;
      }
    },

    setStatus(s) {
      this.filters.status = s;
      this.page = 1;
      this.fetchBookings();
    },
    onFilterChange() { this.page = 1; this.fetchBookings(); this.fetchStats(); },
    onSearch()       { this.page = 1; this.fetchBookings(); },
    onPageChange(p)  { this.page = p; this.fetchBookings(); },
    reload() {
      localStorage.removeItem(this.keyName);
      this.filters = { study_year: this.filters.study_year, status: null };
      this.searchTerm = "";
      this.page = 1;
      this.fetchBookings();
      this.fetchStats();
    },

    // ---- Actions ----
    canPreApprove(item) { return item.status === "pending"; },
    canConfirm(item)    { return item.status === "pre_approved"; },
    canReject(item)     { return ["pending", "pre_approved"].includes(item.status); },
    canUpdateResp(item) { return ["pending", "pre_approved", "confirmed", "approved"].includes(item.status); },
    canReactivate(item) { return ["rejected", "cancelled"].includes(item.status); },
    canDelete(item)     { return ["pending", "rejected", "cancelled"].includes(item.status); },

    // ---- Pre-approve ----
    preApproveItem(item) {
      this.preApproveDialog.data = { ...item };
      this.preApproveDialog.teacherResponse = item.teacherResponse || DEFAULT_PRE_APPROVE_RESPONSE;
      this.preApproveDialog.open = true;
    },
    async handlePreApprove() {
      this.preApproveDialog.saving = true;
      try {
        const res = await TeacherApi.preApproveBookings(this.preApproveDialog.data.id, this.preApproveDialog.teacherResponse);
        this.showAlert("success", res?.data?.message || "تمت الموافقة الأولية");
        this.preApproveDialog.open = false;
        await this.fetchBookings();
        await this.fetchStats();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّرت الموافقة الأولية");
      } finally { this.preApproveDialog.saving = false; }
    },

    // ---- Confirm ----
    consentItem(item) {
      this.consentDialog.data = { ...item };
      this.consentDialog.teacherResponse = item.teacherResponse || DEFAULT_CONSENT_RESPONSE;
      this.consentDialog.reservationPaid = false;
      this.consentDialog.open = true;
    },
    async handleConsent() {
      this.consentDialog.saving = true;
      try {
        const hasReservation = this.consentDialog?.data?.course?.hasReservation === true;
        const payload = {
          teacherResponse: this.consentDialog.teacherResponse,
          reservationPaid: hasReservation ? this.consentDialog.reservationPaid === true : true,
        };
        const res = await TeacherApi.consentBookings(this.consentDialog.data.id, payload);
        this.showAlert("success", res?.data?.message || "تم تأكيد الحجز");
        this.consentDialog.open = false;
        await this.fetchBookings();
        await this.fetchStats();
        await this.loadSubscriptionCapacity();
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "تعذّر التأكيد";
        const lower = String(msg).toLowerCase();
        const isInsufficient = lower.includes("insufficient") || lower.includes("wallet")
          || lower.includes("balance") || msg.includes("رصيد") || msg.includes("غير كافي");
        if (isInsufficient) this.insufficientBalanceDialog.open = true;
        else this.showAlert("error", msg);
      } finally { this.consentDialog.saving = false; }
    },
    goToWalletTopup() {
      this.insufficientBalanceDialog.open = false;
      this.$router.push({ path: "/teacher/wallet", query: { poll: "1" } });
    },

    // ---- Reject ----
    rejectItem(item) {
      this.rejectDialog.data = { ...item };
      this.rejectDialog.rejectionReason = "";
      this.rejectDialog.teacherResponse = "";
      this.rejectDialog.open = true;
    },
    async handleReject() {
      if (!this.rejectDialog.rejectionReason?.trim()) {
        this.showAlert("error", "سبب الرفض مطلوب");
        return;
      }
      this.rejectDialog.saving = true;
      try {
        const payload = {
          rejectionReason: this.rejectDialog.rejectionReason.trim(),
        };
        if (this.rejectDialog.teacherResponse?.trim()) payload.teacherResponse = this.rejectDialog.teacherResponse.trim();
        const res = await TeacherApi.rejectBooking(this.rejectDialog.data.id, payload);
        this.showAlert("success", res?.data?.message || "تم رفض الحجز");
        this.rejectDialog.open = false;
        await this.fetchBookings();
        await this.fetchStats();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الرفض");
      } finally { this.rejectDialog.saving = false; }
    },

    // ---- Update teacher response ----
    updateResponseItem(item) {
      this.updateResponseDialog.data = { ...item };
      this.updateResponseDialog.teacherResponse = item.teacherResponse || "";
      this.updateResponseDialog.open = true;
    },
    async handleUpdateResponse() {
      if (!this.updateResponseDialog.teacherResponse?.trim()) {
        this.showAlert("error", "الرد مطلوب");
        return;
      }
      this.updateResponseDialog.saving = true;
      try {
        const res = await TeacherApi.updateBookingResponse(this.updateResponseDialog.data.id, this.updateResponseDialog.teacherResponse.trim());
        this.showAlert("success", res?.data?.message || "تم تحديث الرد");
        this.updateResponseDialog.open = false;
        await this.fetchBookings();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر التحديث");
      } finally { this.updateResponseDialog.saving = false; }
    },

    // ---- Reactivate ----
    enableItem(item) {
      this.enableDialog.data = item;
      this.enableDialog.messages = [
        "سيتم إعادة تفعيل الحجز وإرجاعه إلى قائمة الانتظار.",
        "ستتمكن من مواصلة الإجراءات عليه.",
      ];
      this.enableDialog.title = "تأكيد إعادة التفعيل";
      this.enableDialog.confirmButtonText = "إعادة تفعيل الحجز";
      this.enableDialog.checkboxLabel = "أفهم وأؤكد إعادة التفعيل";
      this.enableDialog.open = true;
    },
    async handleRestore() {
      try {
        const res = await TeacherApi.reactivateBooking(this.enableDialog.data.id, null);
        this.showAlert("success", res?.data?.message || "تمت إعادة التفعيل");
        await this.fetchBookings();
        await this.fetchStats();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّرت إعادة التفعيل");
      } finally { this.enableDialog.open = false; }
    },

    // ---- Delete ----
    deleteItem(item) {
      this.deleteDialog.data = item;
      this.deleteDialog.messages = [
        "سيتم حذف الحجز نهائياً.",
        "لا يمكن استرجاعه بعد الحذف.",
      ];
      this.deleteDialog.title = "تأكيد الحذف";
      this.deleteDialog.confirmButtonText = "حذف الحجز";
      this.deleteDialog.open = true;
    },
    async handleDelete() {
      try {
        const res = await TeacherApi.deleteBooking(this.deleteDialog.data.id);
        this.showAlert("success", res?.data?.message || "تم الحذف");
        await this.fetchBookings();
        await this.fetchStats();
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف");
      } finally { this.deleteDialog.open = false; }
    },
  },
};
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="bookings-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon icon="ri-calendar-check-line" size="28" color="white" />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">طلبات الحجز</div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          راجع طلبات الطلاب الجديدة، وافق أولياً ثم أكّد الحجز بعد دفع العربون.
          السنة: <strong>{{ activeStudyYear }}</strong>
        </div>
      </div>
      <VBtn variant="flat" color="white" class="text-primary" prepend-icon="ri-refresh-line" :loading="loading" @click="reload">
        تحديث
      </VBtn>
    </div>

    <!-- KPIs + capacity -->
    <VRow class="mb-4">
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-stack-line" color="primary" size="24" />
              <VChip size="small" color="primary" variant="flat">إجمالي</VChip>
            </div>
            <div class="text-h5 font-weight-bold">{{ numberWithComma(totalItems) }}</div>
            <div class="text-caption text-medium-emphasis">حجوزات السنة</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card kpi-pending">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-time-line" color="warning" size="24" />
              <VChip size="small" color="warning" variant="flat">تحتاج موافقة</VChip>
            </div>
            <div class="text-h5 font-weight-bold text-warning">{{ numberWithComma(pendingCount) }}</div>
            <div class="text-caption text-medium-emphasis">قيد الانتظار</div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-group-line" color="info" size="24" />
              <VChip size="small" color="info" variant="flat">باقتك</VChip>
            </div>
            <div class="text-h5 font-weight-bold">{{ subscription.currentStudents }} / {{ subscription.maxStudents }}</div>
            <div class="text-caption text-medium-emphasis">سعة الطلاب</div>
            <VProgressLinear :model-value="capacityPct" :color="capacityPct >= 90 ? 'error' : capacityPct >= 70 ? 'warning' : 'info'" height="6" rounded class="mt-2" />
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" md="3">
        <VCard rounded="lg" elevation="0" class="kpi-card">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <VIcon icon="ri-checkbox-circle-line" color="success" size="24" />
              <VChip size="small" :color="subscription.canAdd ? 'success' : 'error'" variant="flat">
                {{ subscription.canAdd ? "متاح" : "ممتلئة" }}
              </VChip>
            </div>
            <div class="text-h5 font-weight-bold text-success">{{ numberWithComma(subscription.remaining) }}</div>
            <div class="text-caption text-medium-emphasis">طلاب متبقين</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Status pill bar + search -->
    <VCard rounded="lg" elevation="0" class="mb-4 border">
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2 flex-wrap">
          <VIcon icon="ri-filter-3-line" color="primary" />
          <span class="text-subtitle-1 font-weight-bold">التصفية والبحث</span>
          <VSpacer />
          <VBtn variant="text" size="small" prepend-icon="ri-refresh-line" @click="reload">إعادة تعيين</VBtn>
        </div>
        <div class="d-flex flex-wrap ga-2 mb-3">
          <VChip
            v-for="p in statusPills" :key="p.value ?? 'all'"
            :color="p.color" :variant="filters.status === p.value ? 'flat' : 'tonal'"
            :prepend-icon="p.icon"
            @click="setStatus(p.value)"
            class="cursor-pointer status-pill"
          >
            {{ p.label }}
            <span v-if="p.value && pageCounts[p.value] > 0" class="ms-2 chip-count">{{ pageCounts[p.value] }}</span>
          </VChip>
        </div>
        <VRow dense>
          <VCol cols="12" md="8">
            <VTextField
              v-model="searchTerm" prepend-inner-icon="ri-search-line"
              label="بحث في اسم الطالب أو الكورس"
              density="comfortable" variant="outlined" clearable
              @keyup.enter="onSearch" @click:clear="onSearch"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.study_year"
              :items="studyYears" item-title="label" item-value="value"
              label="السنة الدراسية" density="comfortable" variant="outlined"
              :loading="yearsLoading" prepend-inner-icon="ri-calendar-2-line"
              @update:model-value="onFilterChange"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Loading skeleton -->
    <VRow v-if="loading">
      <VCol v-for="n in 6" :key="n" cols="12" sm="6" md="4">
        <VCard rounded="lg" elevation="0" class="border">
          <VSkeletonLoader type="card-avatar, article, actions" />
        </VCard>
      </VCol>
    </VRow>

    <!-- Empty -->
    <VCard v-else-if="!items.length" rounded="lg" elevation="0" class="border text-center pa-8">
      <VIcon icon="ri-calendar-2-line" size="64" color="grey" class="mb-3" />
      <div class="text-h6 mb-2">لا يوجد حجوزات بهذا الفلتر</div>
      <div class="text-body-2 text-medium-emphasis">
        طلبات الطلاب الجديدة ستظهر هنا فور وصولها.
      </div>
    </VCard>

    <!-- Cards -->
    <VRow v-else>
      <VCol v-for="item in items" :key="item.id" cols="12" md="6" lg="4">
        <VCard rounded="lg" elevation="0" class="booking-card h-100 d-flex flex-column">
          <VCardText class="pb-2">
            <!-- Student row -->
            <div class="d-flex align-center ga-3 mb-3">
              <VAvatar :color="statusInfo(item.status).color" size="40">
                <span class="text-subtitle-1 font-weight-bold">{{ studentInitials(item.student?.name) }}</span>
              </VAvatar>
              <div class="flex-grow-1 overflow-hidden">
                <div class="text-subtitle-1 font-weight-bold text-truncate">{{ item.student?.name || "—" }}</div>
                <div class="text-caption text-medium-emphasis">{{ formatRelative(item.createdAt) }}</div>
              </div>
              <VChip :color="statusInfo(item.status).color" size="small" variant="flat" :prepend-icon="statusInfo(item.status).icon">
                {{ statusInfo(item.status).label }}
              </VChip>
            </div>

            <!-- Course row -->
            <div class="course-strip pa-2 rounded mb-2">
              <div class="d-flex align-center ga-2 mb-1">
                <VIcon icon="ri-book-3-line" size="16" color="primary" />
                <span class="text-body-2 font-weight-bold text-truncate">{{ item.course?.courseName || "—" }}</span>
              </div>
              <div class="d-flex flex-wrap ga-1">
                <VChip size="x-small" color="info" variant="tonal" prepend-icon="ri-graduation-cap-line">
                  {{ item.course?.gradeName || "—" }}
                </VChip>
                <VChip v-if="item.course?.hasReservation" size="x-small" color="warning" variant="tonal" prepend-icon="ri-coins-line">
                  عربون مطلوب
                </VChip>
              </div>
            </div>

            <!-- Messages -->
            <div v-if="item.studentMessage" class="mb-2">
              <div class="text-caption text-medium-emphasis mb-1">
                <VIcon icon="ri-chat-quote-line" size="14" /> رسالة الطالب
              </div>
              <div class="text-body-2 message-box pa-2 rounded">{{ item.studentMessage }}</div>
            </div>
            <div v-if="item.teacherResponse" class="mb-2">
              <div class="text-caption text-medium-emphasis mb-1">
                <VIcon icon="ri-reply-line" size="14" /> ردك
              </div>
              <div class="text-body-2 response-box pa-2 rounded">{{ item.teacherResponse }}</div>
            </div>
            <div v-if="item.rejectionReason" class="mb-2">
              <div class="text-caption text-medium-emphasis mb-1">
                <VIcon icon="ri-information-line" size="14" /> سبب الرفض
              </div>
              <div class="text-body-2 reject-box pa-2 rounded">{{ item.rejectionReason }}</div>
            </div>
          </VCardText>

          <VDivider />
          <VCardActions class="pa-2 flex-wrap ga-1">
            <VBtn v-if="canPreApprove(item)" color="info" variant="tonal" size="small" prepend-icon="ri-thumb-up-line" @click="preApproveItem(item)">
              موافقة أولية
            </VBtn>
            <VBtn v-if="canConfirm(item)" color="success" variant="tonal" size="small" prepend-icon="ri-checkbox-circle-line" @click="consentItem(item)">
              تأكيد
            </VBtn>
            <VBtn v-if="canReject(item)" color="error" variant="tonal" size="small" prepend-icon="ri-close-circle-line" @click="rejectItem(item)">
              رفض
            </VBtn>
            <VBtn v-if="canReactivate(item)" color="primary" variant="tonal" size="small" prepend-icon="ri-refresh-line" @click="enableItem(item)">
              إعادة تفعيل
            </VBtn>
            <VSpacer />
            <VBtn v-if="canUpdateResp(item)" icon="ri-pencil-line" size="small" variant="text" color="warning" @click="updateResponseItem(item)" title="تحديث الرد" />
            <VBtn v-if="canDelete(item)" icon="ri-delete-bin-line" size="small" variant="text" color="error" @click="deleteItem(item)" title="حذف" />
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>

    <!-- Pagination -->
    <div v-if="totalItems > limit" class="d-flex justify-center mt-6">
      <VPagination
        :model-value="page"
        :length="Math.ceil(totalItems / limit)"
        :total-visible="5" color="primary"
        @update:model-value="onPageChange"
      />
    </div>

    <!-- Pre-approve dialog -->
    <VDialog v-model="preApproveDialog.open" max-width="540">
      <VCard>
        <VCardTitle class="d-flex align-center"><VIcon icon="ri-thumb-up-line" color="info" class="me-2" /> موافقة أولية</VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert type="info" variant="tonal" density="compact" class="mb-3">
            سيتم إشعار الطالب بالموافقة الأولية. أكمل التأكيد بعد دفع العربون.
          </VAlert>
          <VTextarea
            v-model="preApproveDialog.teacherResponse"
            label="رسالة للطالب (اختياري)" variant="outlined" rows="3"
            prepend-inner-icon="ri-chat-3-line"
          />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="preApproveDialog.open = false">إلغاء</VBtn>
          <VBtn color="info" :loading="preApproveDialog.saving" prepend-icon="ri-thumb-up-line" @click="handlePreApprove">موافقة أولية</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Consent (confirm) dialog -->
    <VDialog v-model="consentDialog.open" max-width="540">
      <VCard>
        <VCardTitle class="d-flex align-center"><VIcon icon="ri-checkbox-circle-line" color="success" class="me-2" /> تأكيد الحجز</VCardTitle>
        <VDivider />
        <VCardText>
          <VTextarea
            v-model="consentDialog.teacherResponse"
            label="رسالة للطالب (اختياري)" variant="outlined" rows="3"
            prepend-inner-icon="ri-chat-3-line"
          />
          <div v-if="hasReservationSelected" class="mt-3">
            <VSwitch v-model="consentDialog.reservationPaid" inset color="success" :true-value="true" :false-value="false">
              <template #label>
                <span class="font-weight-bold">تم دفع العربون</span>
              </template>
            </VSwitch>
            <VAlert v-if="!consentDialog.reservationPaid" type="warning" variant="tonal" density="compact">
              إذا لم يُدفع العربون بعد، اترك المفتاح مغلقاً — سيُرسل للطالب طلب دفع.
            </VAlert>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="consentDialog.open = false">إلغاء</VBtn>
          <VBtn color="success" :loading="consentDialog.saving" prepend-icon="ri-check-line" @click="handleConsent">تأكيد</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Reject dialog -->
    <VDialog v-model="rejectDialog.open" max-width="540">
      <VCard>
        <VCardTitle class="d-flex align-center"><VIcon icon="ri-close-circle-line" color="error" class="me-2" /> رفض الحجز</VCardTitle>
        <VDivider />
        <VCardText>
          <VTextarea
            v-model="rejectDialog.rejectionReason"
            label="سبب الرفض *" variant="outlined" rows="3"
            prepend-inner-icon="ri-information-line"
            :rules="[v => !!v?.trim() || 'سبب الرفض مطلوب']"
          />
          <VTextarea
            v-model="rejectDialog.teacherResponse"
            label="ملاحظة إضافية (اختياري)" variant="outlined" rows="2"
            prepend-inner-icon="ri-chat-3-line" class="mt-2"
          />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="rejectDialog.open = false">إلغاء</VBtn>
          <VBtn color="error" :loading="rejectDialog.saving" prepend-icon="ri-close-line" @click="handleReject">رفض</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Update response dialog -->
    <VDialog v-model="updateResponseDialog.open" max-width="540">
      <VCard>
        <VCardTitle class="d-flex align-center"><VIcon icon="ri-pencil-line" color="warning" class="me-2" /> تحديث الرد</VCardTitle>
        <VDivider />
        <VCardText>
          <VTextarea
            v-model="updateResponseDialog.teacherResponse"
            label="رد المعلم *" variant="outlined" rows="4"
            prepend-inner-icon="ri-chat-3-line"
          />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="updateResponseDialog.open = false">إلغاء</VBtn>
          <VBtn color="warning" :loading="updateResponseDialog.saving" prepend-icon="ri-save-3-line" @click="handleUpdateResponse">تحديث</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <ConfirmDangerDialog
      v-if="enableDialog.open" v-model="enableDialog.open"
      :messages="enableDialog.messages" :title="enableDialog.title"
      :confirmButtonText="enableDialog.confirmButtonText"
      :checkboxLabel="enableDialog.checkboxLabel" @confirm="handleRestore"
    />
    <ConfirmDangerDialog
      v-if="deleteDialog.open" v-model="deleteDialog.open"
      :messages="deleteDialog.messages" :title="deleteDialog.title"
      :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete"
    />

    <!-- Insufficient balance -->
    <VDialog v-model="insufficientBalanceDialog.open" max-width="520">
      <VCard>
        <VCardTitle class="d-flex align-center"><VIcon icon="ri-error-warning-line" color="error" class="me-2" /> رصيد المحفظة غير كافٍ</VCardTitle>
        <VDivider />
        <VCardText>
          <div>رصيد محفظتك غير كافٍ لتأكيد الطلب.</div>
          <div class="text-caption text-medium-emphasis mt-2">
            يمكنك شحن المحفظة ثم العودة وإعادة المحاولة. (سيتم تأكيد الدفع من خلال الـ webhook وقد يتأخر ثوانٍ.)
          </div>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="insufficientBalanceDialog.open = false">إغلاق</VBtn>
          <VBtn color="primary" prepend-icon="ri-wallet-3-line" @click="goToWalletTopup">شحن المحفظة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <BaseAlert
      v-if="alert.open" v-model="alert.open"
      :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false"
    />
  </div>
</template>

<style scoped>
.bookings-hero {
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
.kpi-pending {
  background: linear-gradient(135deg, rgba(255, 138, 0, 0.06), rgba(255, 138, 0, 0));
}
.booking-card {
  border: 1px solid rgba(11, 37, 69, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.booking-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(11, 37, 69, 0.08);
}
.cursor-pointer { cursor: pointer; }
.status-pill { transition: transform 0.15s ease; }
.status-pill:hover { transform: translateY(-1px); }
.chip-count {
  background: rgba(255, 255, 255, 0.4);
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: bold;
}
.course-strip { background: rgba(11, 37, 69, 0.04); }
.message-box  { background: rgba(63, 169, 245, 0.08); }
.response-box { background: rgba(255, 138, 0, 0.08); }
.reject-box   { background: rgba(229, 57, 53, 0.08); }
</style>
