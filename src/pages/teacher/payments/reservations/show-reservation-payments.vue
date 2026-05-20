<script>
// =====================================================
// Reservation Payments v2 — rebuilt 2026-05-17.
// Brand-aligned page for the teacher to monitor & collect course
// reservation deposits:
//   • Hero compact (page context + back link)
//   • 4 inline KPI cards (replaces external ReportCharts)
//   • Filter strip: study year + status + free-text search
//   • SmartTable preserved (shared component, untouched)
//   • Confirm dialog kept (with checkbox safety)
// API contract: GET /api/teacher/payments/reservations?studyYear=YYYY-YYYY
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api";
import numberWithComma from "@/constant/number";

export default {
  name: "ReservationPaymentsShow",
  data() {
    return {
      keyName: "show-reservation-payments",
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "فواتير العربون", disabled: true },
      ],

      // Loading flags
      yearsLoading: false,
      summaryError: "",

      // Study years
      studyYears: [],

      // Filters (extra: status + search are client-side because the BE doesn't
      // accept them for this endpoint yet)
      filters: {
        status: null, // 'paid' | 'pending' | null
      },
      searchTerm: "",

      table: {
        totalItems: 0,
        Data: [],
        rawData: [],
        actions: ["تسديد عربون"],
        loading: false,
        headers: [
          { title: "#", type: "strong", sortable: false, key: "num" },
          { title: "اسم الطالب", type: "strong", sortable: true, key: "studentName" },
          { title: "اسم الكورس", type: "strong", sortable: true, key: "courseName" },
          { title: "المبلغ", type: "number", sortable: true, key: "amount" },
          { title: "الحالة", type: "status", sortable: true, key: "status" },
          { title: "تاريخ الدفع", type: "date", sortable: true, key: "paidAt" },
          { title: "تفاصيل", type: "link", sortable: false, key: "reportText" },
          { title: "العمليات", type: "strong", sortable: false, key: "actions" },
        ],
        tableSettings: {
          options: {
            page: 1,
            limit: 10,
            sortBy: "",
            search: null,
            study_year: JSON.parse(localStorage.getItem("studyYear") || "null"),
            sort: JSON.stringify({ key: "paidAt", order: "desc" }),
          },
        },
      },

      // Report summary
      report: null,
      kpis: {
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalDiscount: 0,
        paidCount: 0,
        pendingCount: 0,
        totalCount: 0,
      },

      // Alert
      alert: { open: false, message: null, type: "success" },

      // Confirm dialog
      confirmDialog: {
        open: false,
        item: null,
        messages: [],
        title: null,
        confirmButtonText: null,
      },
    };
  },

  computed: {
    activeStudyYear() {
      return (
        this.table.tableSettings.options.study_year ||
        this.studyYears[0]?.value ||
        "—"
      );
    },
    paidPercent() {
      if (!this.kpis.totalAmount) return 0;
      return Math.round((this.kpis.totalPaid / this.kpis.totalAmount) * 100);
    },
    pendingCount() {
      return this.kpis.pendingCount;
    },
    statusOptions() {
      return [
        { title: "كل الحالات", value: null },
        { title: "مُسدّدة", value: "paid" },
        { title: "معلّقة", value: "pending" },
      ];
    },
  },

  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName) || "null");
    if (stored) this.table.tableSettings = stored;
    this.loadAcademicYears();
  },

  methods: {
    numberWithComma,

    formatIQDShort(n) {
      const num = Number(n) || 0;
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
      if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K";
      return new Intl.NumberFormat("en-IQ").format(num);
    },

    async loadAcademicYears() {
      try {
        this.yearsLoading = true;
        const res = await TeacherApi.getAcademicYears();
        const data = res?.data?.data || {};
        const years = Array.isArray(data.years) ? data.years : [];
        const active = data.active || null;
        this.studyYears = years.map((y) => ({ label: y.year, value: y.year }));
        if (!this.table.tableSettings.options.study_year) {
          this.table.tableSettings.options.study_year = active?.year || null;
        }
        this.getDataAxios();
      } catch (e) {
        this.getDataAxios();
      } finally {
        this.yearsLoading = false;
      }
    },

    reload() {
      localStorage.removeItem(this.keyName);
      this.table.tableSettings.options = {
        page: 1,
        limit: 10,
        sortBy: "",
        search: null,
        study_year: this.table.tableSettings.options.study_year, // keep current
        sort: JSON.stringify({ key: "paidAt", order: "desc" }),
      };
      this.filters.status = null;
      this.searchTerm = "";
      this.getDataAxios();
    },

    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
        search: !newOptions.search ? null : newOptions.search,
      };
      this.getDataAxios();
    },

    applyClientFilters() {
      const status = this.filters.status;
      const q = (this.searchTerm || "").trim().toLowerCase();
      this.table.Data = this.table.rawData.filter((row) => {
        const okStatus = !status || row.status === status;
        const okSearch = !q
          || String(row.studentName || "").toLowerCase().includes(q)
          || String(row.courseName || "").toLowerCase().includes(q);
        return okStatus && okSearch;
      });
      this.table.totalItems = this.table.Data.length;
    },

    async getDataAxios() {
      this.table.loading = true;
      try {
        localStorage.setItem(this.keyName, JSON.stringify(this.table.tableSettings));
        const response = await TeacherApi.getReservationPayments(this.table.tableSettings);
        const payload = response?.data?.data || {};
        const items = payload.items || [];
        this.report = payload.report || null;
        const counts = this.report?.counts || {};
        const totals = this.report?.totals || {};
        this.kpis = {
          totalAmount: Number(totals.totalAmount) || 0,
          totalPaid: Number(totals.totalPaidAmount) || 0,
          totalRemaining: Number(totals.remainingAmount) || 0,
          totalDiscount: Number(totals.discountAmount) || 0,
          paidCount: Number(counts.totalPaid) || 0,
          pendingCount: Number(counts.totalPending) || 0,
          totalCount: (Number(counts.totalPaid) || 0) + (Number(counts.totalPending) || 0),
        };
        const mapped = items.map((it, idx) => ({
          bookingId: it.bookingId || it.booking_id,
          num: (this.table.tableSettings.options.page - 1) * this.table.tableSettings.options.limit + idx + 1,
          studentName: it.studentName,
          courseName: it.courseName,
          amount: it.amount,
          status: it.status,
          paidAt: it.paidAt,
          reportText: "عرض",
          reportLink: it.reportLink,
        }));
        this.table.rawData = mapped;
        this.applyClientFilters();
        // Override totalItems with server total when no client filter is active
        if (!this.filters.status && !this.searchTerm) {
          this.table.totalItems = payload?.pagination?.total || mapped.length;
        }
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || "حدث خطأ أثناء جلب البيانات");
      } finally {
        this.table.loading = false;
      }
    },

    goToDetails(item) {
      const to = item?.reportLink || (item?.report && item.report.to) || null;
      if (!to) return;
      this.$router.push(to);
    },

    handleMarkReservationPaid(item) {
      if (!item?.bookingId) return;
      this.confirmDialog.item = item;
      this.confirmDialog.messages = [
        "هل أنت متأكد من تسديد عربون هذا الحجز؟",
        item.studentName ? `الطالب: ${item.studentName}` : "",
        item.courseName ? `الكورس: ${item.courseName}` : "",
        item.amount ? `المبلغ: ${this.numberWithComma(item.amount)} د.ع` : "",
      ].filter(Boolean);
      this.confirmDialog.title = "تأكيد تسديد العربون";
      this.confirmDialog.confirmButtonText = "تسديد العربون";
      this.confirmDialog.open = true;
    },

    async confirmMarkReservationPaid() {
      const item = this.confirmDialog.item;
      if (!item?.bookingId) return;
      this.table.loading = true;
      try {
        const res = await TeacherApi.markReservationPaymentPaid(item.bookingId);
        const msg = res?.data?.message || "تم تسديد عربون الحجز بنجاح";
        this.showAlert("success", msg);
        this.getDataAxios();
      } catch (error) {
        this.showAlert("error", error?.response?.data?.message || "حدث خطأ أثناء تسديد عربون الحجز");
      } finally {
        this.table.loading = false;
        this.confirmDialog.open = false;
      }
    },

    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true });
    },
  },
};
</script>

<template>
  <div class="reservation-page">
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- 1. HERO ============================================== -->
    <VCard class="hero-card mb-4" elevation="0" rounded="lg">
      <div class="hero-mesh" />
      <VCardItem class="position-relative">
        <VRow align="center" class="g-3">
          <VCol cols="12" md="8">
            <div class="d-flex align-center gap-3 flex-wrap">
              <VAvatar size="64" color="warning" class="hero-avatar">
                <VIcon size="32" color="white">ri-money-dollar-circle-line</VIcon>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="hero-greet">فواتير العربون</div>
                <h1 class="hero-name">دفعات تأكيد الحجوزات</h1>
                <div class="hero-sub">
                  تابع عربون الحجوزات من طلابك، سدّد المُستلَم نقداً بضغطة، وراجع تفاصيل كل حجز.
                </div>
              </div>
            </div>
          </VCol>
          <VCol cols="12" md="4" class="text-md-end">
            <VChip color="white" variant="text" prepend-icon="ri-calendar-2-line" class="me-2 hero-chip">
              السنة: {{ activeStudyYear }}
            </VChip>
            <VBtn color="white" variant="text" prepend-icon="ri-arrow-right-line"
              to="/teacher/dashboard" class="back-link">
              لوحة التحكم
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Alerts -->
    <VAlert v-if="alert.open" :type="alert.type" variant="tonal" closable class="mb-3"
      @click:close="alert.open = false">
      {{ alert.message }}
    </VAlert>

    <!-- 2. KPI ROW =========================================== -->
    <VRow class="mb-2" dense>
      <VCol cols="12" sm="6" md="3">
        <VCard class="kpi-card h-100" elevation="0" rounded="lg" border>
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-primary">
                <VIcon size="20" color="white">ri-bill-line</VIcon>
              </div>
              <VChip size="x-small" color="primary" variant="tonal">{{ kpis.totalCount }} فاتورة</VChip>
            </div>
            <div class="kpi-value">{{ formatIQDShort(kpis.totalAmount) }} <span class="kpi-currency">د.ع</span></div>
            <div class="kpi-label">إجمالي العربون</div>
            <div class="kpi-sub">المبلغ الكلي المتوقع تحصيله</div>
          </VCardItem>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard class="kpi-card h-100" elevation="0" rounded="lg" border>
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-success">
                <VIcon size="20" color="white">ri-checkbox-circle-line</VIcon>
              </div>
              <VChip size="x-small" color="success" variant="tonal">{{ kpis.paidCount }} مدفوع</VChip>
            </div>
            <div class="kpi-value text-success">{{ formatIQDShort(kpis.totalPaid) }} <span class="kpi-currency">د.ع</span></div>
            <div class="kpi-label">المُسدّد</div>
            <div class="kpi-sub">{{ paidPercent }}% من الإجمالي</div>
            <VProgressLinear :model-value="paidPercent" color="success" rounded height="4" class="mt-2" />
          </VCardItem>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard class="kpi-card h-100" elevation="0" rounded="lg" border>
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-warning">
                <VIcon size="20" color="white">ri-time-line</VIcon>
              </div>
              <VChip size="x-small" color="warning" variant="tonal">{{ pendingCount }} معلّق</VChip>
            </div>
            <div class="kpi-value text-warning">{{ formatIQDShort(kpis.totalRemaining) }} <span class="kpi-currency">د.ع</span></div>
            <div class="kpi-label">المتبقّي</div>
            <div class="kpi-sub">في انتظار التسديد</div>
          </VCardItem>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard class="kpi-card h-100" elevation="0" rounded="lg" border>
          <VCardItem>
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="kpi-icon kpi-icon-info">
                <VIcon size="20" color="white">ri-discount-percent-line</VIcon>
              </div>
              <VChip v-if="kpis.totalDiscount" size="x-small" color="info" variant="tonal">خصومات</VChip>
            </div>
            <div class="kpi-value text-info">{{ formatIQDShort(kpis.totalDiscount) }} <span class="kpi-currency">د.ع</span></div>
            <div class="kpi-label">الخصومات</div>
            <div class="kpi-sub">{{ kpis.totalDiscount ? "خصومات مطبّقة" : "لا توجد خصومات" }}</div>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- 3. FILTERS =========================================== -->
    <VCard class="panel mb-4" elevation="0" rounded="lg" border>
      <VCardItem>
        <VRow dense align="center">
          <VCol cols="12" md="4">
            <VTextField v-model="searchTerm" prepend-inner-icon="ri-search-line"
              placeholder="ابحث باسم الطالب أو الكورس…" variant="outlined" density="comfortable"
              hide-details clearable @input="applyClientFilters" @click:clear="applyClientFilters" />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect v-model="table.tableSettings.options.study_year" :items="studyYears"
              item-title="label" item-value="value" label="السنة الدراسية"
              prepend-inner-icon="ri-calendar-2-line" variant="outlined" density="comfortable"
              :loading="yearsLoading" hide-details @update:model-value="getDataAxios" />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect v-model="filters.status" :items="statusOptions" item-title="title" item-value="value"
              label="الحالة" prepend-inner-icon="ri-checkbox-multiple-line"
              variant="outlined" density="comfortable" hide-details clearable
              @update:model-value="applyClientFilters" />
          </VCol>
          <VCol cols="12" md="2" class="d-flex justify-end">
            <VBtn color="primary" variant="tonal" prepend-icon="ri-refresh-line" rounded="lg"
              @click="reload" class="filter-cta">
              تحديث
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- 4. TABLE ============================================= -->
    <VCard class="panel mb-4" elevation="0" rounded="lg" border>
      <VCardTitle class="panel-head">
        <VIcon color="primary" class="me-2">ri-table-line</VIcon>
        <span>سجل الفواتير</span>
        <VSpacer />
        <VChip size="small" color="primary" variant="elevated" class="font-weight-bold">
          {{ numberWithComma(table.totalItems) }} سجل
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable
          :headers="table.headers"
          :items="table.Data"
          :actions="table.actions"
          :loading="table.loading"
          :totalItems="table.totalItems"
          :tableOptions="table.tableSettings.options"
          @updateTableOptions="updateTableOptions"
          @showItem="goToDetails"
          @markReservationPaidItem="handleMarkReservationPaid"
          class="reservation-payments-table"
        />
      </VCardItem>
    </VCard>

    <!-- 5. HELP STRIP ======================================== -->
    <VCard class="help-card panel" elevation="0" rounded="lg">
      <VCardItem>
        <div class="d-flex align-center gap-3 flex-wrap">
          <VAvatar size="40" color="warning" variant="tonal">
            <VIcon color="warning">ri-information-line</VIcon>
          </VAvatar>
          <div class="flex-grow-1">
            <div class="help-title">كيف يعمل عربون الحجز؟</div>
            <div class="help-text">
              عندما يحجز الطالب كورساً يجب عليه دفع عربون لتأكيد الحجز. لو سدّد الطالب نقداً لك،
              اضغط <strong>"تسديد عربون"</strong> أمام الفاتورة لتأكيد الاستلام. لو الطالب يستخدم
              التطبيق فالعربون يُسدّد إلكترونياً تلقائياً ويظهر هنا بحالة <strong>مُسدّد</strong>.
            </div>
          </div>
        </div>
      </VCardItem>
    </VCard>

    <!-- Confirm dialog (kept from v1) -->
    <ConfirmDangerDialog v-if="confirmDialog.open" v-model="confirmDialog.open"
      :messages="confirmDialog.messages" :title="confirmDialog.title"
      :confirmButtonText="confirmDialog.confirmButtonText" :showCheckbox="true"
      checkboxLabel="أفهم وأؤكد تسديد هذا العربون"
      confirmIcon="ri-money-dollar-box-line" confirmIconActive="ri-check-double-line"
      @confirm="confirmMarkReservationPaid" />
  </div>
</template>

<style scoped>
/* =====================================================
   Reservation Payments v2 — brand-aligned
   navy #0B2545 · orange #FF8A00 · sky #3FA9F5
   ===================================================== */
.reservation-page { padding-block: 4px; }

/* ---- HERO ---- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #050d1f 0%, #0b2545 55%, #122e54 100%) !important;
  color: white;
}
.hero-mesh {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(40% 80% at 100% 0%, rgba(255, 138, 0, .30), transparent 60%),
    radial-gradient(35% 70% at 0% 100%, rgba(63, 169, 245, .20), transparent 60%);
}
.hero-avatar { box-shadow: 0 10px 24px rgba(255, 138, 0, .35); }
.hero-greet { font-size: .82rem; color: rgba(255, 255, 255, .78); font-weight: 600; }
.hero-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.4rem; font-weight: 900;
  color: white !important; margin: 2px 0 4px;
  letter-spacing: -.01em;
}
.hero-sub { color: rgba(255, 255, 255, .82); font-size: .9rem; line-height: 1.65; }
.hero-chip { color: white !important; font-weight: 700; }
.back-link {
  color: rgba(255, 255, 255, .85) !important;
  font-weight: 700; text-transform: none; letter-spacing: 0;
}
.back-link:hover { color: white !important; background: rgba(255, 255, 255, .08); }

/* ---- KPI cards ---- */
.kpi-card {
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  height: 100%;
}
.kpi-card:hover {
  transform: translateY(-3px);
  border-color: rgba(11, 37, 69, .25) !important;
  box-shadow: 0 10px 24px rgba(11, 37, 69, .08) !important;
}
.kpi-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.kpi-icon-primary { background: linear-gradient(135deg, #0b2545 0%, #103261 100%); }
.kpi-icon-success { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
.kpi-icon-warning { background: linear-gradient(135deg, #FF8A00 0%, #FFB766 100%); }
.kpi-icon-info    { background: linear-gradient(135deg, #3FA9F5 0%, #2E8DDC 100%); }
.kpi-value {
  font-family: "Cairo", sans-serif;
  font-size: 1.4rem; font-weight: 900; color: #0b2545;
  line-height: 1.1; letter-spacing: -.02em;
  margin-top: 10px;
}
.kpi-currency { font-size: .82rem; font-weight: 700; color: rgba(11, 37, 69, .55); }
.kpi-label { font-size: .9rem; color: #0b2545; font-weight: 700; margin-top: 4px; }
.kpi-sub { font-size: .76rem; color: rgba(11, 37, 69, .58); margin-top: 2px; }

/* ---- Panel cards ---- */
.panel { background: white; }
.panel-head {
  display: flex; align-items: center;
  padding: 12px 16px !important;
  font-size: 1rem; font-weight: 700; color: #0b2545;
}

/* Filter CTA */
.filter-cta { font-weight: 700; text-transform: none; letter-spacing: 0; width: 100%; }

/* SmartTable: scope the existing styles inside our wrapper */
.reservation-payments-table :deep(.v-data-table) { border-radius: 12px; }
.reservation-payments-table :deep(.v-data-table__td) { font-family: "Cairo", sans-serif; }

/* ---- Help strip ---- */
.help-card {
  background: linear-gradient(135deg, rgba(255, 138, 0, .07) 0%, rgba(255, 138, 0, .02) 100%) !important;
  border: 1px solid rgba(255, 138, 0, .22) !important;
}
.help-title { font-weight: 800; color: #0b2545; font-size: 1rem; margin-bottom: 4px; }
.help-text { font-size: .9rem; color: rgba(11, 37, 69, .78); line-height: 1.75; }

/* Mobile */
@media (max-width: 600px) {
  .hero-name { font-size: 1.2rem; }
  .filter-cta { width: 100%; }
}
</style>
