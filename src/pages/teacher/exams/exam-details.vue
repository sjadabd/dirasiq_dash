<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />

    <VCard class="my-4" elevation="2">
      <VCardTitle class="d-flex align-center">
        <VIcon class="me-2">ri-article-line</VIcon>
        <span class="text-h6">تفاصيل الامتحان</span>
        <VSpacer />
        <VBtn variant="tonal" prepend-icon="ri-arrow-go-back-line" @click="$router.back()">رجوع</VBtn>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <!-- Exam info -->
          <VCol cols="12" md="6">
            <VCard variant="tonal">
              <VCardTitle class="d-flex align-center">
                <VIcon class="me-2">ri-information-line</VIcon>
                <span class="text-h6">معلومات الامتحان</span>
              </VCardTitle>
              <VDivider />
              <VCardText>
                <div class="text-body-2 mb-1"><strong>نوع الامتحان:</strong> {{ examTypeLabel(exam?.exam_type) }}</div>
                <div class="text-body-2 mb-1"><strong>التاريخ:</strong> {{ formatDateTime(exam?.exam_date) }}</div>
                <div class="text-body-2 mb-1"><strong>الدرجة القصوى:</strong> {{ exam?.max_score }}</div>
                <div class="text-body-2 mb-1" v-if="exam?.description"><strong>الوصف:</strong> {{ exam.description }}
                </div>
                <div class="text-body-2 mb-1" v-if="exam?.notes"><strong>ملاحظات:</strong> {{ exam.notes }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="3">
            <VSelect v-model="selectedSessionId" :items="sessionItems" item-title="text" item-value="value"
              label="اختر الجلسة" density="comfortable" hide-details style="max-inline-size: 260px;"
              :loading="sessionsLoading" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Students and grading -->
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon class="me-2">ri-team-line</VIcon>
        <span class="text-h6">طلاب الامتحان وتسجيل الدرجات</span>
        <VSpacer />
        <VChip size="small" variant="flat" style="color: white;">{{ students.length }} طالب</VChip>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>#</th>
              <th>الطالب</th>
              <th style="inline-size: 180px;">الدرجة</th>
              <th style="inline-size: 160px;">إجراء</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(s, i) in students" :key="s.id">
              <td :data-label="'#'">{{ i + 1 }}</td>

              <td :data-label="'الطالب'">
                {{ s.name }}
              </td>

              <td :data-label="'الدرجة'">
                <VTextField v-model.number="s.score" type="number" :max="exam?.max_score || 100" :min="0"
                  density="compact" hide-details />
              </td>

              <td :data-label="'إجراء'">
                <VBtn color="primary" size="small" :loading="s.saving" @click="saveGrade(s)">
                  حفظ
                </VBtn>
              </td>
            </tr>

            <tr v-if="!studentsLoading && !students.length">
              <td colspan="4" class="text-center text-medium-emphasis">
                لا يوجد طلاب
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'teacher-exams-details',
  data() {
    return {
      breadcrumbs: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'الامتحانات والدرجات', disabled: false, to: '/teacher/exams/manage-exams' },
        { title: 'تفاصيل الامتحان', disabled: true },
      ],
      exam: null,
      students: [],
      studentsLoading: false,
      // sessions select
      sessionItems: [],
      selectedSessionId: null,
      sessionsLoading: false,
      alert: { open: false, type: 'success', message: '' },
    };
  },
  created() {
    const id = this.$route.query.id;
    if (id) {
      this.fetchExam(id);
      this.loadSessionsAndStudents(id);
    }
  },
  watch: {
    selectedSessionId: {
      handler(newVal) {
        const id = this.$route.query.id;
        if (id) this.fetchStudents(id, newVal);
      },
    },
  },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
    formatDateTime(val) { if (!val) return ''; const d = new Date(val); return isNaN(d) ? '' : d.toLocaleString('ar-IQ'); },
    examTypeLabel(v) { return v === 'monthly' ? 'شهري' : 'يومي'; },

    async fetchExam(id) {
      try {
        const res = await TeacherApi.getExamById(id);
        this.exam = res?.data?.data || null;
        // Optionally load current grades if present in exam payload later
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل جلب تفاصيل الامتحان');
      }
    },
    async fetchStudents(id, sessionId) {
      try {
        this.studentsLoading = true;
        const res = await TeacherApi.getExamStudents(id, sessionId);
        const list = res?.data?.data || [];
        // Initialize score and saving flag; backend may separately expose grades
        this.students = list.map(s => ({ id: s.id, name: s.name, score: s.score ?? null, saving: false }));
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل جلب الطلاب');
      } finally { this.studentsLoading = false; }
    },
    async loadSessionsAndStudents(examId) {
      try {
        this.sessionsLoading = true;
        const res = await TeacherApi.getSessionNames();
        this.sessionItems = (res?.data?.data || []).map(ss => ({ text: ss.title || ss.name || ss.label, value: ss.id }));
        // default to first session if exists
        this.selectedSessionId = this.sessionItems.length ? this.sessionItems[0].value : null;
      } catch (e) {
        this.sessionItems = [];
        this.selectedSessionId = null;
      } finally {
        this.sessionsLoading = false;
        // fetch students based on selected session (may be null)
        this.fetchStudents(examId, this.selectedSessionId);
      }
    },
    async saveGrade(s) {
      try {
        if (!this.exam?.id || !s?.id) return;
        s.saving = true;
        const score = (s.score === null || s.score === undefined || s.score === '') ? null : Number(s.score);
        await TeacherApi.gradeExam(this.exam.id, s.id, { score });
        this.showAlert('success', `تم حفظ درجة ${s.name}`);
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل حفظ الدرجة');
      } finally { s.saving = false; }
    },
  },
};
</script>


<style scoped>
/* ⚡ جعل جدول الدرجات Responsive */
@media (max-width: 768px) {

  .v-table table,
  .v-table thead,
  .v-table tbody,
  .v-table th,
  .v-table td,
  .v-table tr {
    display: block;
    inline-size: 100%;
  }

  /* إخفاء رأس الجدول */
  .v-table thead {
    display: none;
  }

  /* كل صف يصبح بطاقة */
  .v-table tr {
    padding: 10px;
    border-radius: 10px;
    background-color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 8%);
    margin-block-end: 12px;
  }

  /* خلايا البطاقة */
  .v-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: none !important;
    border-block-end: 1px solid rgba(0, 0, 0, 5%) !important;
    padding-block: 8px;
    padding-inline: 6px;
  }

  /* عنوان العمود */
  .v-table td::before {
    flex: 1;
    color: var(--v-theme-primary);
    content: attr(data-label);
    font-weight: 600;
    text-align: start;
  }

  /* إزالة الحد السفلي عن آخر خلية */
  .v-table td:last-child {
    border-block-end: none !important;
  }

  /* ضبط حجم الخط */
  .v-table td {
    font-size: 13px;
  }

  /* جعل الـ TextField بعرض كامل */
  .v-table .v-text-field {
    inline-size: 100%;
  }

  .v-table .v-field {
    block-size: 38px !important;
  }

  /* زر حفظ صغير ومتناسق */
  .v-table .v-btn {
    block-size: 30px;
    font-size: 12px;
    padding-inline: 10px;
  }

  /* تباعد بين الصفوف */
  .v-table tr+tr {
    margin-block-start: 10px;
  }
}
</style>
