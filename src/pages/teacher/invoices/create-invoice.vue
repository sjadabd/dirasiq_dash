<script>
// =====================================================
// Create Invoice v2 — rebuilt 2026-05-17.
// Aligned with the simplified backend create endpoint:
//   POST /api/teacher/invoices   { studentId, courseId, studyYear, paymentMode, amountDue, ...
//     paymentMode === 'installments'
//       ? { installmentsCount, installmentIntervalDays, installmentFirstDueDate }   // auto-split
//         OR { installments: [{ installmentNumber, plannedAmount, dueDate, notes? }] }  // manual
//       : {} }
// Big changes vs v1:
//   • Removed `invoiceType` (backend assumes "course").
//   • Removed manual `payments`/`additionalDiscounts` builders — those belong on the manage page.
//   • Installments builder defaults to **auto-split** (count + interval + first due) — fast common case.
//     "Advanced" toggle exposes the per-row manual editor for non-uniform plans.
//   • Brand UI (navy hero + tonal cards) to match the redesigned manage / billing / reservations pages.
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api"

export default {
  data() {
    return {
      results: JSON.parse(localStorage.getItem("user") || "{}"),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/dashboard" },
        { title: "فواتير الطلاب", disabled: false, to: { name: "teacher-invoices-manage-invoices" } },
        { title: "إنشاء فاتورة", disabled: true },
      ],
      saving: false,
      alert: { open: false, type: "success", message: "" },

      // Reference data
      studyYears: [],
      yearsLoading: false,
      paymentModes: [
        { text: "كاش (دفعة واحدة)", value: "cash" },
        { text: "أقساط", value: "installments" },
      ],

      // Selects
      courseItems: [],
      coursesLoading: false,
      studentItems: [],
      studentsLoading: false,

      // Form
      form: {
        studentId: "",
        courseId: "",
        studyYear: JSON.parse(localStorage.getItem("studyYear") || "null") || "",
        paymentMode: "installments",
        amountDue: null,
        discountAmount: 0,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        notes: "",
      },

      // Auto-split (default)
      autoSplit: {
        count: 4,
        intervalDays: 30,
        firstDueDate: "",
      },

      // Advanced manual mode
      manualMode: false,
      manualInstallments: [],
    }
  },

  computed: {
    netAmount() {
      const due = Number(this.form.amountDue) || 0
      const disc = Number(this.form.discountAmount) || 0
      
      return Math.max(0, due - disc)
    },
    perInstallment() {
      if (!this.autoSplit.count || this.autoSplit.count < 1) return 0
      
      return Math.floor(this.netAmount / this.autoSplit.count)
    },
    perInstallmentLast() {
      // last installment absorbs the rounding remainder
      if (!this.autoSplit.count || this.autoSplit.count < 1) return 0
      
      return this.netAmount - this.perInstallment * (this.autoSplit.count - 1)
    },
    manualTotal() {
      return this.manualInstallments.reduce((s, i) => s + (Number(i.plannedAmount) || 0), 0)
    },
    manualDelta() {
      return this.netAmount - this.manualTotal
    },
  },

  created() {
    this.loadAcademicYears()
  },
  mounted() {
    this.loadCourses()


    // default first due to today + 7 days
    const d = new Date()

    d.setDate(d.getDate() + 7)
    this.autoSplit.firstDueDate = d.toISOString().slice(0, 10)
  },

  methods: {
    formatMoney(v) {
      const n = Number(v)
      if (!Number.isFinite(n)) return ""
      
      return n.toLocaleString()
    },
    parseMoney(v) {
      if (v == null || v === "") return null
      const cleaned = String(v).replace(/[^0-9.-]/g, "")
      const n = Number(cleaned)
      
      return Number.isFinite(n) ? n : null
    },
    onFormatMoney(field, v) {
      const n = this.parseMoney(v)

      this.form[field] = n
    },
    onFormatInstallment(idx, v) {
      const n = this.parseMoney(v)
      if (this.manualInstallments[idx]) this.manualInstallments[idx].plannedAmount = n
    },

    async loadAcademicYears() {
      this.yearsLoading = true
      try {
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null

        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.form.studyYear) this.form.studyYear = active?.year || ""
      } finally {
        this.yearsLoading = false
      }
    },

    async loadCourses() {
      this.coursesLoading = true
      try {
        const res = await TeacherApi.getCourseNames()
        const list = res?.data?.data || []

        this.courseItems = list.map(x => ({ text: x.name || x.course_name || "-", value: x.id }))
      } catch {
        this.showAlert("error", "تعذّر جلب أسماء الكورسات")
      } finally {
        this.coursesLoading = false
      }
    },

    async onCourseChange() {
      this.form.studentId = ""
      this.studentItems = []
      if (!this.form.courseId) return
      this.studentsLoading = true
      try {
        const res = await TeacherApi.getStudentsByCourse(this.form.courseId)
        const list = res?.data?.data || []

        this.studentItems = list.map(s => ({ id: s.id || s.student_id, name: s.name || s.student_name }))
      } catch {
        this.showAlert("error", "تعذّر جلب طلاب الكورس")
      } finally {
        this.studentsLoading = false
      }
    },

    // Switch manual mode → prefill from auto-split for convenience
    toggleManual() {
      this.manualMode = !this.manualMode
      if (this.manualMode && !this.manualInstallments.length) {
        this.seedManualFromAuto()
      }
    },
    seedManualFromAuto() {
      const count = Math.max(2, Number(this.autoSplit.count) || 2)
      const interval = Math.max(1, Number(this.autoSplit.intervalDays) || 30)
      const first = this.autoSplit.firstDueDate || new Date().toISOString().slice(0, 10)
      const per = this.perInstallment
      const last = this.perInstallmentLast
      const result = []
      for (let i = 0; i < count; i++) {
        const d = new Date(first)

        d.setDate(d.getDate() + interval * i)
        result.push({
          installmentNumber: i + 1,
          plannedAmount: i === count - 1 ? last : per,
          dueDate: d.toISOString().slice(0, 10),
          notes: "",
        })
      }
      this.manualInstallments = result
    },
    addManualRow() {
      this.manualInstallments.push({
        installmentNumber: this.manualInstallments.length + 1,
        plannedAmount: null,
        dueDate: "",
        notes: "",
      })
    },
    removeManualRow(idx) {
      this.manualInstallments.splice(idx, 1)

      // renumber
      this.manualInstallments.forEach((r, i) => { r.installmentNumber = i + 1 })
    },

    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message })
    },

    validate() {
      if (!this.form.studentId) return "اختر الطالب"
      if (!this.form.courseId) return "اختر الكورس"
      if (!this.form.studyYear) return "اختر السنة الدراسية"
      if (this.form.amountDue == null || Number(this.form.amountDue) <= 0) return "أدخل المبلغ المستحق"
      if (Number(this.form.discountAmount) < 0) return "الخصم لا يمكن أن يكون سالباً"
      if (Number(this.form.discountAmount) > Number(this.form.amountDue)) return "الخصم لا يمكن أن يتجاوز المبلغ المستحق"
      if (this.form.paymentMode === "installments") {
        if (this.manualMode) {
          if (!this.manualInstallments.length) return "أضف قسطاً واحداً على الأقل"
          for (const i of this.manualInstallments) {
            if (!Number.isFinite(Number(i.plannedAmount)) || Number(i.plannedAmount) <= 0) return "كل قسط يحتاج مبلغاً صحيحاً"
            if (!i.dueDate) return "كل قسط يحتاج تاريخ استحقاق"
          }
          if (Math.abs(this.manualDelta) > 0.5) return `مجموع الأقساط (${this.formatMoney(this.manualTotal)}) لا يساوي صافي الفاتورة (${this.formatMoney(this.netAmount)})`
        } else {
          if (!this.autoSplit.count || this.autoSplit.count < 2) return "عدد الأقساط 2 على الأقل"
          if (!this.autoSplit.firstDueDate) return "أدخل تاريخ أول قسط"
          if (!this.autoSplit.intervalDays || this.autoSplit.intervalDays < 1) return "الفترة بين الأقساط يجب أن تكون يوماً على الأقل"
        }
      }
      
      return null
    },

    async submit() {
      const err = this.validate()
      if (err) { this.showAlert("error", err) 

        return }

      const payload = {
        studentId: this.form.studentId,
        courseId: this.form.courseId,
        studyYear: this.form.studyYear,
        paymentMode: this.form.paymentMode,
        amountDue: Number(this.form.amountDue),
      }

      if (Number(this.form.discountAmount) > 0) payload.discountAmount = Number(this.form.discountAmount)
      if (this.form.invoiceDate) payload.invoiceDate = this.form.invoiceDate
      if (this.form.dueDate) payload.dueDate = this.form.dueDate
      if (this.form.notes?.trim()) payload.notes = this.form.notes.trim()

      if (this.form.paymentMode === "installments") {
        if (this.manualMode) {
          payload.installments = this.manualInstallments.map(i => {
            const entry = {
              installmentNumber: Number(i.installmentNumber),
              plannedAmount: Number(i.plannedAmount),
              dueDate: i.dueDate,
            }

            if (i.notes?.trim()) entry.notes = i.notes.trim()
            
            return entry
          })
        } else {
          payload.installmentsCount = Number(this.autoSplit.count)
          payload.installmentIntervalDays = Number(this.autoSplit.intervalDays)
          payload.installmentFirstDueDate = this.autoSplit.firstDueDate
        }
      }

      this.saving = true
      try {
        const { data } = await TeacherApi.createInvoice(payload)

        this.showAlert("success", data?.message || "تم إنشاء الفاتورة")
        setTimeout(() => this.$router.push({ name: "teacher-invoices-manage-invoices" }), 600)
      } catch (e) {
        const msg = e?.response?.data?.message
          || e?.response?.data?.errors?.[0]?.message
          || "تعذّر إنشاء الفاتورة"

        this.showAlert("error", msg)
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Hero -->
    <div class="invoice-create-hero rounded-xl pa-5 pa-md-6 mb-6 d-flex flex-wrap align-center ga-3">
      <div class="hero-icon-wrap rounded-circle d-flex align-center justify-center">
        <VIcon
          icon="ri-file-add-line"
          size="28"
          color="white"
        />
      </div>
      <div class="flex-grow-1">
        <div class="text-h6 text-md-h5 font-weight-bold text-white">
          إنشاء فاتورة جديدة
        </div>
        <div class="text-caption text-md-body-2 text-white opacity-90">
          اختر الطالب والكورس، وحدد المبلغ. للأقساط: اختر عدد الأقساط وتاريخ أول قسط — وسنوزّع الباقي تلقائياً.
        </div>
      </div>
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
    </div>

    <!-- Step 1: Student + Course -->
    <VCard
      rounded="lg"
      elevation="0"
      class="mb-4 border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2">
          <VAvatar
            color="primary"
            variant="tonal"
            size="28"
          >
            <span class="text-caption font-weight-bold">1</span>
          </VAvatar>
          <span class="text-subtitle-1 font-weight-bold">الطالب والكورس</span>
        </div>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.courseId"
              :items="courseItems"
              item-title="text"
              item-value="value"
              label="اختر الكورس"
              variant="outlined"
              density="comfortable"
              :loading="coursesLoading"
              :disabled="coursesLoading"
              prepend-inner-icon="ri-book-3-line"
              clearable
              @update:model-value="onCourseChange"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.studentId"
              :items="studentItems"
              item-title="name"
              item-value="id"
              label="اختر الطالب"
              variant="outlined"
              density="comfortable"
              :loading="studentsLoading"
              :disabled="studentsLoading || !form.courseId"
              prepend-inner-icon="ri-user-3-line"
              clearable
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.studyYear"
              :items="studyYears"
              item-title="label"
              item-value="value"
              label="السنة الدراسية"
              variant="outlined"
              density="comfortable"
              :loading="yearsLoading"
              prepend-inner-icon="ri-calendar-2-line"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Step 2: Amount + Discount + Dates -->
    <VCard
      rounded="lg"
      elevation="0"
      class="mb-4 border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2">
          <VAvatar
            color="primary"
            variant="tonal"
            size="28"
          >
            <span class="text-caption font-weight-bold">2</span>
          </VAvatar>
          <span class="text-subtitle-1 font-weight-bold">المبلغ والخصم</span>
        </div>
        <VRow>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              :model-value="formatMoney(form.amountDue)"
              label="المبلغ المستحق (د.ع)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-money-dollar-circle-line"
              @update:model-value="v => onFormatMoney('amountDue', v)"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              :model-value="formatMoney(form.discountAmount)"
              label="خصم عام (د.ع)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-percent-line"
              hint="اختياري"
              persistent-hint
              @update:model-value="v => onFormatMoney('discountAmount', v)"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.invoiceDate"
              type="date"
              label="تاريخ الفاتورة"
              variant="outlined"
              density="comfortable"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.dueDate"
              type="date"
              label="تاريخ الاستحقاق (اختياري)"
              variant="outlined"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12">
            <VTextField
              v-model="form.notes"
              label="ملاحظات"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-sticky-note-line"
            />
          </VCol>
        </VRow>
        <VAlert
          v-if="form.amountDue"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          <div class="d-flex flex-wrap align-center justify-space-between">
            <span>صافي الفاتورة بعد الخصم:</span>
            <strong>{{ formatMoney(netAmount) }} د.ع</strong>
          </div>
        </VAlert>
      </VCardText>
    </VCard>

    <!-- Step 3: Payment mode -->
    <VCard
      rounded="lg"
      elevation="0"
      class="mb-4 border"
    >
      <VCardText>
        <div class="d-flex align-center mb-3 ga-2">
          <VAvatar
            color="primary"
            variant="tonal"
            size="28"
          >
            <span class="text-caption font-weight-bold">3</span>
          </VAvatar>
          <span class="text-subtitle-1 font-weight-bold">طريقة الدفع</span>
        </div>
        <VRow>
          <VCol
            cols="12"
            md="6"
          >
            <VSelect
              v-model="form.paymentMode"
              :items="paymentModes"
              item-title="text"
              item-value="value"
              label="طريقة الدفع"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="ri-bank-card-line"
            />
          </VCol>
          <VCol
            v-if="form.paymentMode === 'installments' && !manualMode"
            cols="12"
            md="2"
          >
            <VTextField
              v-model.number="autoSplit.count"
              type="number"
              min="2"
              max="36"
              label="عدد الأقساط"
              variant="outlined"
              density="comfortable"
            />
          </VCol>
          <VCol
            v-if="form.paymentMode === 'installments' && !manualMode"
            cols="12"
            md="2"
          >
            <VTextField
              v-model.number="autoSplit.intervalDays"
              type="number"
              min="1"
              max="365"
              label="الفترة (أيام)"
              variant="outlined"
              density="comfortable"
            />
          </VCol>
          <VCol
            v-if="form.paymentMode === 'installments' && !manualMode"
            cols="12"
            md="2"
          >
            <VTextField
              v-model="autoSplit.firstDueDate"
              type="date"
              label="أول قسط"
              variant="outlined"
              density="comfortable"
            />
          </VCol>
        </VRow>

        <!-- Auto-split preview -->
        <VAlert
          v-if="form.paymentMode === 'installments' && !manualMode && netAmount > 0"
          type="success"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          <div class="d-flex flex-wrap align-center justify-space-between ga-2">
            <span>توزيع تلقائي: <strong>{{ autoSplit.count }}</strong> أقساط، كل قسط:</span>
            <span><strong>{{ formatMoney(perInstallment) }}</strong> د.ع
              <template v-if="perInstallment !== perInstallmentLast">
                (الأخير: <strong>{{ formatMoney(perInstallmentLast) }}</strong> د.ع)
              </template>
            </span>
          </div>
        </VAlert>

        <!-- Advanced toggle -->
        <div
          v-if="form.paymentMode === 'installments'"
          class="mt-3"
        >
          <VBtn
            variant="text"
            size="small"
            :prepend-icon="manualMode ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"
            @click="toggleManual"
          >
            {{ manualMode ? "إخفاء الوضع المتقدّم (إدارة يدوية لكل قسط)" : "وضع متقدّم (مبالغ مختلفة لكل قسط)" }}
          </VBtn>
        </div>

        <!-- Manual installments table -->
        <div
          v-if="form.paymentMode === 'installments' && manualMode"
          class="mt-3"
        >
          <VAlert
            v-if="manualInstallments.length"
            :type="Math.abs(manualDelta) > 0.5 ? 'warning' : 'success'"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <div class="d-flex flex-wrap align-center justify-space-between ga-2">
              <span>مجموع الأقساط: <strong>{{ formatMoney(manualTotal) }}</strong> / صافي الفاتورة: <strong>{{ formatMoney(netAmount) }}</strong></span>
              <span v-if="Math.abs(manualDelta) > 0.5">
                <VChip
                  size="small"
                  :color="manualDelta > 0 ? 'warning' : 'error'"
                  variant="flat"
                >
                  الفرق: {{ formatMoney(manualDelta) }}
                </VChip>
              </span>
              <VChip
                v-else
                size="small"
                color="success"
                variant="flat"
              >
                مطابق
              </VChip>
            </div>
          </VAlert>

          <VRow
            v-for="(ins, idx) in manualInstallments"
            :key="idx"
            class="mb-1"
          >
            <VCol
              cols="12"
              md="1"
            >
              <VTextField
                v-model.number="ins.installmentNumber"
                type="number"
                label="#"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                :model-value="formatMoney(ins.plannedAmount)"
                label="المبلغ"
                variant="outlined"
                density="comfortable"
                @update:model-value="v => onFormatInstallment(idx, v)"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="ins.dueDate"
                type="date"
                label="تاريخ الاستحقاق"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="ins.notes"
                label="ملاحظات"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol
              cols="12"
              md="1"
              class="d-flex align-center"
            >
              <VBtn
                color="error"
                size="small"
                icon="ri-delete-bin-line"
                variant="text"
                @click="removeManualRow(idx)"
              />
            </VCol>
          </VRow>

          <div class="d-flex ga-2">
            <VBtn
              variant="tonal"
              size="small"
              prepend-icon="ri-add-line"
              @click="addManualRow"
            >
              إضافة قسط
            </VBtn>
            <VBtn
              variant="text"
              size="small"
              prepend-icon="ri-magic-line"
              @click="seedManualFromAuto"
            >
              توليد تلقائي
            </VBtn>
          </div>
        </div>
      </VCardText>
    </VCard>

    <div class="d-flex justify-end ga-2">
      <RouterLink
        :to="{ name: 'teacher-invoices-manage-invoices' }"
        class="text-decoration-none"
      >
        <VBtn variant="text">
          إلغاء
        </VBtn>
      </RouterLink>
      <VBtn
        color="primary"
        :loading="saving"
        prepend-icon="ri-save-3-line"
        @click="submit"
      >
        حفظ الفاتورة
      </VBtn>
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
.invoice-create-hero {
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
</style>
