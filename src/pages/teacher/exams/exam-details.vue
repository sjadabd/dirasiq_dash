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
                <div class="text-body-2 mb-1" v-if="exam?.description"><strong>الوصف:</strong> {{ exam.description }}</div>
                <div class="text-body-2 mb-1" v-if="exam?.notes"><strong>ملاحظات:</strong> {{ exam.notes }}</div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Students and grading -->
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon class="me-2">ri-team-line</VIcon>
        <span class="text-h6">طلاب الامتحان وتسجيل الدرجات</span>
        <VSpacer />
        <VSelect
          v-model="selectedSessionId"
          :items="sessionItems"
          item-title="text"
          item-value="value"
          label="اختر الجلسة"
          density="comfortable"
          hide-details
          style="max-width: 260px"
          :loading="sessionsLoading"
        />
        <VChip size="small" variant="flat" style="color: white;">{{ students.length }} طالب</VChip>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>#</th>
              <th>الطالب</th>
              <th style="width: 180px;">الدرجة</th>
              <th style="width: 160px;">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in students" :key="s.id">
              <td>{{ i + 1 }}</td>
              <td>{{ s.name }}</td>
              <td>
                <VTextField v-model.number="s.score" type="number" :max="exam?.max_score || 100" :min="0" density="compact" hide-details />
              </td>
              <td>
                <VBtn color="primary" size="small" :loading="s.saving" @click="saveGrade(s)">حفظ</VBtn>
              </td>
            </tr>
            <tr v-if="!studentsLoading && !students.length">
              <td colspan="4" class="text-center text-medium-emphasis">لا يوجد طلاب</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true" close-text="موافق" />
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
