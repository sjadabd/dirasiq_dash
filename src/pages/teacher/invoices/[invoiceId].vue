<script>
// =====================================================
// Invoice details v2 — rebuilt 2026-05-17.
// Single source of truth: GET /api/teacher/invoices/:invoiceId  → { invoice, installments, totals }
// Removed dead methods that called the deleted /entries + /installments endpoints.
// Per-installment pay button now sets `installmentId` on the payment payload so the backend
// allocates the payment to that specific row instead of running auto-allocation.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"
import numberWithComma from "@/constant/number"

export default {
  data() {
    return {
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "فواتير الطلاب", disabled: false, to: { name: "teacher-invoices-manage-invoices" } },
        { title: "التفاصيل", disabled: true },
      ],

      loading: false,
      saving: false,

      invoiceId: this.$route.params.invoiceId,
      inv: {
        id: "",
        student_name: "",
        course_name: "",
        amount_due: 0,
        discount_total: 0,
        amount_paid: 0,
        remaining_amount: 0,
        invoice_status: "",
        study_year: "",
        payment_mode: "",
        invoice_date: "",
        due_date: "",
        notes: "",
      },
      totals: {
        count: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        plannedTotal: 0,
        paidTotal: 0,
        remainingTotal: 0,
      },
      installments: [],

      paymentMethods: [
        { text: "نقد", value: "cash" },
        { text: "تحويل بنكي", value: "bank_transfer" },
        { text: "بطاقة", value: "credit_card" },
        { text: "دفع جوال", value: "mobile_payment" },
      ],

      payDialog: {
        open: false,
        installmentId: "",
        installmentNumber: null,
        remaining: 0,
        form: { amount: null, paymentMethod: "cash", paidAt: "", notes: "" },
      },

      deleteDialog: { open: false, loading: false },
      restoreDialog: { open: false, loading: false },

      alert: { open: false, type: "success", message: "" },
    }
  },

  computed: {
    isDeleted() {
      return Boolean(this.inv?.deleted_at)
    },
    paidPct() {
      const due = Number(this.inv.amount_due) - Number(this.inv.discount_total)
      if (!due || due <= 0) return 0
      
      return Math.min(100, Math.round((Number(this.inv.amount_paid) / due) * 100))
    },
    statusInfo() {
      const s = this.inv.invoice_status

      const m = {
        paid: { label: "مدفوعة", color: "success", icon: "ri-checkbox-circle-line" },
        partial: { label: "جزئية",  color: "info",    icon: "ri-progress-3-line" },
        pending: { label: "معلّقة", color: "warning", icon: "ri-time-line" },
        overdue: { label: "متأخرة", color: "error",   icon: "ri-alarm-warning-line" },
        cancelled: { label: "ملغاة",  color: "grey",    icon: "ri-close-circle-line" },
      }

      
      return m[s] || { label: s || "-", color: "grey", icon: "ri-bill-line" }
    },
  },

  created() {
    // Prefill from router state if user clicked into this page from the table
    const stateInv = this.$route?.state || this.$router?.options?.history?.state?.data
    if (stateInv && typeof stateInv === "object") {
      const fields = ["id",
        "student_name",
        "course_name",
        "amount_due",
        "discount_total",
        "amount_paid",
        "remaining_amount",
        "invoice_status",
        "study_year",
        "payment_mode",
        "invoice_date",
        "due_date",
        "notes"]

      for (const k of fields) if (stateInv[k] != null) this.inv[k] = stateInv[k]
    } else {
      this.inv.id = this.invoiceId
    }
  },

  mounted() {
    this.loadFull()
  },

  methods: {
    numberWithComma,
    formatIQD(n) {
      return new Intl.NumberFormat("en-IQ").format(Number(n) || 0) + " د.ع"
    },
    formatDate(d) {
      if (!d) return "—"
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, "0")
      const mm = String(dt.getMonth() + 1).padStart(2, "0")
      
      return `${dd}/${mm}/${dt.getFullYear()}`
    },

    installmentStatusInfo(s) {
      const m = {
        paid: { label: "مدفوع",     color: "success", icon: "ri-checkbox-circle-line" },
        pending: { label: "قيد السداد", color: "warning", icon: "ri-time-line" },
        overdue: { label: "متأخر",     color: "error",   icon: "ri-alarm-warning-line" },
        partial: { label: "جزئي",      color: "info",    icon: "ri-progress-3-line" },
        cancelled: { label: "ملغي",      color: "grey",    icon: "ri-close-circle-line" },
      }

      
      return m[s] || { label: s || "-", color: "grey", icon: "ri-circle-line" }
    },

    async loadFull() {
      this.loading = true
      try {
        const res = await TeacherApi.getInvoiceFull(this.invoiceId)
        const data = res?.data?.data || {}
        const inv = data.invoice || {}
        const installments = Array.isArray(data.installments) ? data.installments : []
        const totals = data.totals || {}

        const num = v => (v != null ? Number(v) : 0)

        this.inv = {
          ...this.inv,
          ...inv,
          amount_due: num(inv.amount_due),
          discount_total: num(inv.discount_total),
          amount_paid: num(inv.amount_paid),
          remaining_amount: num(inv.remaining_amount),
        }

        this.installments = installments.map(i => ({
          ...i,
          planned_amount: num(i.planned_amount),
          paid_amount: num(i.paid_amount),
          remaining_amount: num(i.remaining_amount),
        }))

        this.totals = {
          count: totals.count ?? installments.length,
          paidCount: totals.paidCount ?? 0,
          partialCount: totals.partialCount ?? 0,
          pendingCount: totals.pendingCount ?? 0,
          overdueCount: totals.overdueCount ?? 0,
          plannedTotal: num(totals.plannedTotal),
          paidTotal: num(totals.paidTotal),
          remainingTotal: num(totals.remainingTotal),
        }
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر جلب تفاصيل الفاتورة")
      } finally {
        this.loading = false
      }
    },

    // ----- Pay a specific installment -----
    payInstallment(ins) {
      if (!ins) return
      const remaining = Number(ins.remaining_amount) || 0

      this.payDialog.installmentId = ins.id || ""
      this.payDialog.installmentNumber = ins.installment_number ?? null
      this.payDialog.remaining = remaining
      this.payDialog.form = {
        amount: remaining,
        paymentMethod: "cash",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      }
      this.payDialog.open = true
    },

    // ----- Pay whole invoice (auto-allocate across pending installments) -----
    payInvoice() {
      this.payDialog.installmentId = ""
      this.payDialog.installmentNumber = null
      this.payDialog.remaining = Number(this.inv.remaining_amount) || 0
      this.payDialog.form = {
        amount: this.payDialog.remaining,
        paymentMethod: "cash",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      }
      this.payDialog.open = true
    },

    async submitPayment() {
      const f = this.payDialog.form
      if (!f.amount || Number(f.amount) <= 0) {
        this.showAlert("error", "أدخل مبلغاً صحيحاً أكبر من صفر")
        
        return
      }
      if (Number(f.amount) > this.payDialog.remaining + 0.005) {
        this.showAlert("error", `المبلغ يتجاوز المتبقّي (${this.formatIQD(this.payDialog.remaining)})`)
        
        return
      }
      this.saving = true
      try {
        const payload = {
          amount: Number(f.amount),
          paymentMethod: f.paymentMethod,
        }

        if (this.payDialog.installmentId) payload.installmentId = this.payDialog.installmentId
        if (f.paidAt) payload.paidAt = new Date(f.paidAt).toISOString()
        if (f.notes?.trim()) payload.notes = f.notes.trim()
        await TeacherApi.addInvoicePayment(this.invoiceId, payload)
        this.showAlert("success", "تمت إضافة الدفعة")
        this.payDialog.open = false
        await this.loadFull()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "تعذّر إضافة الدفعة")
      } finally {
        this.saving = false
      }
    },

    // ----- Soft delete / restore -----
    openDeleteDialog() { this.deleteDialog.open = true },
    openRestoreDialog() { this.restoreDialog.open = true },

    async handleSoftDelete() {
      this.deleteDialog.loading = true
      try {
        await TeacherApi.softDeleteInvoice(this.invoiceId)
        this.showAlert("success", "تم الحذف")
        this.deleteDialog.open = false
        await this.loadFull()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف")
      } finally {
        this.deleteDialog.loading = false
      }
    },

    async handleRestore() {
      this.restoreDialog.loading = true
      try {
        await TeacherApi.restoreInvoice(this.invoiceId)
        this.showAlert("success", "تم الاسترجاع")
        this.restoreDialog.open = false
        await this.loadFull()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الاسترجاع")
      } finally {
        this.restoreDialog.loading = false
      }
    },

    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="inv-hero rounded-xl pa-5 pa-md-6 mb-6">
      <div class="d-flex flex-wrap align-center ga-3">
        <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
          <VIcon
            icon="ri-bill-line"
            size="28"
            color="white"
          />
        </div>
        <div class="flex-grow-1">
          <div class="d-flex align-center ga-2 flex-wrap">
            <span class="text-h6 text-md-h5 font-weight-bold text-white">{{ inv.student_name || "فاتورة طالب" }}</span>
            <VChip
              v-if="inv.invoice_status"
              :color="statusInfo.color"
              size="small"
              variant="flat"
              :prepend-icon="statusInfo.icon"
              class="text-white"
            >
              {{ statusInfo.label }}
            </VChip>
            <VChip
              v-if="isDeleted"
              color="error"
              size="small"
              variant="flat"
              prepend-icon="ri-delete-bin-line"
              class="text-white"
            >
              محذوفة
            </VChip>
          </div>
          <div class="text-caption text-md-body-2 text-white opacity-90 mt-1">
            {{ inv.course_name || "—" }} · سنة {{ inv.study_year || "—" }} ·
            {{ inv.payment_mode === "installments" ? "أقساط" : "كاش" }}
          </div>
        </div>
        <div class="d-flex ga-2">
          <RouterLink
            :to="{ name: 'teacher-invoices-manage-invoices' }"
            class="text-decoration-none"
          >
            <VBtn
              variant="flat"
              color="white"
              class="text-primary"
              prepend-icon="ri-arrow-right-line"
            >
              رجوع
            </VBtn>
          </RouterLink>
          <VBtn
            v-if="!isDeleted && Number(inv.remaining_amount) > 0"
            color="warning"
            prepend-icon="ri-money-dollar-circle-line"
            @click="payInvoice"
          >
            دفعة
          </VBtn>
          <VBtn
            v-if="!isDeleted"
            color="error"
            variant="tonal"
            prepend-icon="ri-delete-bin-line"
            @click="openDeleteDialog"
          >
            حذف
          </VBtn>
          <VBtn
            v-else
            color="success"
            variant="tonal"
            prepend-icon="ri-refresh-line"
            @click="openRestoreDialog"
          >
            استرجاع
          </VBtn>
        </div>
      </div>

      <!-- Progress -->
      <div class="mt-4">
        <div class="d-flex justify-space-between text-caption text-white opacity-90 mb-1">
          <span>مدفوع {{ formatIQD(inv.amount_paid) }} من {{ formatIQD(inv.amount_due - inv.discount_total) }}</span>
          <span>{{ paidPct }}%</span>
        </div>
        <VProgressLinear
          :model-value="paidPct"
          color="warning"
          bg-color="rgba(255,255,255,0.2)"
          height="8"
          rounded
        />
      </div>
    </div>

    <!-- KPI cards -->
    <VRow class="mb-4">
      <VCol
        cols="6"
        md="3"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="border"
        >
          <VCardText>
            <div class="text-caption text-medium-emphasis">
              المبلغ المستحق
            </div>
            <div class="text-h6 font-weight-bold mt-1">
              {{ formatIQD(inv.amount_due) }}
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
          class="border"
        >
          <VCardText>
            <div class="text-caption text-medium-emphasis">
              الخصم
            </div>
            <div class="text-h6 font-weight-bold text-info mt-1">
              {{ formatIQD(inv.discount_total) }}
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
          class="border"
        >
          <VCardText>
            <div class="text-caption text-medium-emphasis">
              المدفوع
            </div>
            <div class="text-h6 font-weight-bold text-success mt-1">
              {{ formatIQD(inv.amount_paid) }}
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
          class="border"
        >
          <VCardText>
            <div class="text-caption text-medium-emphasis">
              المتبقّي
            </div>
            <div class="text-h6 font-weight-bold text-error mt-1">
              {{ formatIQD(inv.remaining_amount) }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Meta + Totals -->
    <VRow class="mb-4">
      <VCol
        cols="12"
        md="6"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="border h-100"
        >
          <VCardText>
            <div class="text-subtitle-2 font-weight-bold mb-2">
              <VIcon
                icon="ri-information-line"
                class="me-1"
              /> بيانات الفاتورة
            </div>
            <VRow>
              <VCol cols="6">
                <div class="text-caption text-medium-emphasis">
                  تاريخ الفاتورة
                </div><div>{{ formatDate(inv.invoice_date) }}</div>
              </VCol>
              <VCol cols="6">
                <div class="text-caption text-medium-emphasis">
                  تاريخ الاستحقاق
                </div><div>{{ formatDate(inv.due_date) }}</div>
              </VCol>
              <VCol cols="12">
                <div class="text-caption text-medium-emphasis">
                  ملاحظات
                </div><div>{{ inv.notes || "—" }}</div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="6"
      >
        <VCard
          rounded="lg"
          elevation="0"
          class="border h-100"
        >
          <VCardText>
            <div class="text-subtitle-2 font-weight-bold mb-2">
              <VIcon
                icon="ri-pie-chart-2-line"
                class="me-1"
              /> إحصائيات الأقساط
            </div>
            <VRow dense>
              <VCol
                cols="4"
                sm="2"
              >
                <VChip
                  size="small"
                  color="primary"
                  variant="flat"
                  class="w-100"
                >
                  العدد: {{ totals.count }}
                </VChip>
              </VCol>
              <VCol
                cols="4"
                sm="2"
              >
                <VChip
                  size="small"
                  color="success"
                  variant="flat"
                  class="w-100"
                >
                  مدفوع: {{ totals.paidCount }}
                </VChip>
              </VCol>
              <VCol
                cols="4"
                sm="2"
              >
                <VChip
                  size="small"
                  color="info"
                  variant="flat"
                  class="w-100"
                >
                  جزئي: {{ totals.partialCount }}
                </VChip>
              </VCol>
              <VCol
                cols="4"
                sm="2"
              >
                <VChip
                  size="small"
                  color="warning"
                  variant="flat"
                  class="w-100"
                >
                  معلق: {{ totals.pendingCount }}
                </VChip>
              </VCol>
              <VCol
                cols="4"
                sm="2"
              >
                <VChip
                  size="small"
                  color="error"
                  variant="flat"
                  class="w-100"
                >
                  متأخر: {{ totals.overdueCount }}
                </VChip>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Installments table -->
    <VCard
      rounded="lg"
      elevation="0"
      class="border mb-4"
    >
      <VCardText>
        <div class="d-flex align-center mb-3">
          <VIcon
            icon="ri-calendar-schedule-line"
            class="me-2"
          />
          <span class="text-subtitle-1 font-weight-bold">الأقساط</span>
        </div>

        <VAlert
          v-if="loading"
          type="info"
          variant="tonal"
          density="compact"
        >
          جاري التحميل...
        </VAlert>
        <VAlert
          v-else-if="!installments.length"
          type="info"
          variant="tonal"
          density="compact"
        >
          {{ inv.payment_mode === "cash" ? "هذه فاتورة كاش — لا يوجد أقساط." : "لا يوجد أقساط لهذه الفاتورة." }}
        </VAlert>

        <VTable
          v-else
          density="comfortable"
        >
          <thead>
            <tr>
              <th>#</th>
              <th>المخطط</th>
              <th>المدفوع</th>
              <th>المتبقّي</th>
              <th>تاريخ الاستحقاق</th>
              <th>الحالة</th>
              <th class="text-end">
                العمليات
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ins in installments"
              :key="ins.id"
            >
              <td data-label="#">
                {{ ins.installment_number }}
              </td>
              <td data-label="المخطط">
                {{ numberWithComma(ins.planned_amount) }}
              </td>
              <td data-label="المدفوع">
                {{ numberWithComma(ins.paid_amount) }}
              </td>
              <td data-label="المتبقّي">
                {{ numberWithComma(ins.remaining_amount) }}
              </td>
              <td data-label="تاريخ الاستحقاق">
                {{ formatDate(ins.due_date) }}
              </td>
              <td data-label="الحالة">
                <VChip
                  :color="installmentStatusInfo(ins.installment_status).color"
                  size="small"
                  variant="flat"
                  :prepend-icon="installmentStatusInfo(ins.installment_status).icon"
                >
                  {{ installmentStatusInfo(ins.installment_status).label }}
                </VChip>
              </td>
              <td
                data-label="العمليات"
                class="text-end"
              >
                <VBtn
                  v-if="!isDeleted && ins.installment_status !== 'paid' && Number(ins.remaining_amount) > 0"
                  size="small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="ri-money-dollar-circle-line"
                  @click="payInstallment(ins)"
                >
                  تسديد
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <!-- Add Payment Dialog -->
    <VDialog
      v-model="payDialog.open"
      max-width="520"
    >
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon
            icon="ri-money-dollar-circle-line"
            class="me-2"
          />
          {{ payDialog.installmentId ? `تسديد القسط #${payDialog.installmentNumber}` : "إضافة دفعة على الفاتورة" }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert
            v-if="payDialog.installmentId"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            متبقّي على هذا القسط: <strong>{{ formatIQD(payDialog.remaining) }}</strong>
          </VAlert>
          <VAlert
            v-else
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            متبقّي على الفاتورة: <strong>{{ formatIQD(payDialog.remaining) }}</strong> — سيتم توزيع الدفعة تلقائياً على الأقساط المعلّقة.
          </VAlert>
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model.number="payDialog.form.amount"
                type="number"
                label="المبلغ"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-money-dollar-circle-line"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="payDialog.form.paymentMethod"
                :items="paymentMethods"
                item-title="text"
                item-value="value"
                label="طريقة الدفع"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-bank-card-line"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="payDialog.form.paidAt"
                type="datetime-local"
                label="تاريخ الدفع"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="payDialog.form.notes"
                label="ملاحظات"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="ri-sticky-note-line"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="payDialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            prepend-icon="ri-check-line"
            @click="submitPayment"
          >
            تسديد
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete -->
    <VDialog
      v-model="deleteDialog.open"
      max-width="520"
    >
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon
            icon="ri-delete-bin-line"
            class="me-2"
          /> تأكيد الحذف
        </VCardTitle>
        <VCardText>سيتم حذف الفاتورة حذفاً منطقياً مع أقساطها. يمكن استرجاعها لاحقاً.</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="error"
            :loading="deleteDialog.loading"
            @click="handleSoftDelete"
          >
            حذف
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Restore -->
    <VDialog
      v-model="restoreDialog.open"
      max-width="520"
    >
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon
            icon="ri-refresh-line"
            class="me-2"
          /> تأكيد الاسترجاع
        </VCardTitle>
        <VCardText>سيتم استرجاع الفاتورة مع أقساطها.</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="restoreDialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="success"
            :loading="restoreDialog.loading"
            @click="handleRestore"
          >
            استرجاع
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

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
.inv-hero {
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

/* Responsive table → card layout on mobile */
@media (max-width: 768px) {
  .v-table table, .v-table thead, .v-table tbody, .v-table th, .v-table td, .v-table tr {
    display: block;
    inline-size: 100%;
  }
  .v-table thead { display: none; }
  .v-table tr {
    border-radius: 10px;
    background-color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 8%);
    margin-block-end: 12px;
    padding: 8px 10px;
  }
  .v-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: none !important;
    border-block-end: 1px solid rgba(0, 0, 0, 5%) !important;
    padding: 10px 8px;
  }
  .v-table td::before {
    flex: 1;
    color: var(--v-theme-primary);
    content: attr(data-label);
    font-weight: 600;
    text-align: start;
  }
  .v-table td:last-child { border-block-end: none !important; }
}
</style>
