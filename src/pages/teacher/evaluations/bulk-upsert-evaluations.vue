<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />

    <VCard class="my-4">
      <VCardTitle class="d-flex align-center">
        <VIcon class="me-2">ri-award-line</VIcon>
        <span class="text-h6">إضافة تقييمات يومية (مجموعة)</span>
        <VSpacer />
        <VTextField v-model="form.date" type="date" label="تاريخ التقييم" density="comfortable" style="max-width: 180px" class="me-2" />
        <VSelect v-model="form.course_id" :items="courseItems" item-title="text" item-value="value" label="الدورة" density="comfortable" style="max-width: 260px" :loading="coursesLoading" />
        <VBtn color="primary" class="ms-3" variant="tonal" prepend-icon="ri-refresh-line" :loading="loading" @click="loadStudents">تحديث الطلاب</VBtn>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VAlert v-if="!form.date || !form.course_id" type="info" variant="tonal" class="mb-4">
          اختر التاريخ والدورة. سيتم جلب الطلاب تلقائيًا عند اكتمال الاختيار، أو اضغط "تحديث الطلاب" يدويًا.
        </VAlert>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>#</th>
              <th>الطالب</th>
              <th>علمي</th>
              <th>سلوكي</th>
              <th>حضور</th>
              <th>واجب</th>
              <th>مشاركة</th>
              <th>اتباع التعليمات</th>
              <th style="min-width: 200px">توجيه</th>
              <th style="min-width: 200px">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in students" :key="s.student_id">
              <td>{{ i + 1 }}</td>
              <td>{{ s.student_name }}</td>
              <td>
                <VSelect :items="levelOptions" v-model="s.scientific_level" item-title="title" item-value="value" density="compact" hide-details />
              </td>
              <td>
                <VSelect :items="levelOptions" v-model="s.behavioral_level" item-title="title" item-value="value" density="compact" hide-details />
              </td>
              <td>
                <VSelect :items="levelOptions" v-model="s.attendance_level" item-title="title" item-value="value" density="compact" hide-details />
              </td>
              <td>
                <VSelect :items="levelOptions" v-model="s.homework_preparation" item-title="title" item-value="value" density="compact" hide-details />
              </td>
              <td>
                <VSelect :items="levelOptions" v-model="s.participation_level" item-title="title" item-value="value" density="compact" hide-details />
              </td>
              <td>
                <VSelect :items="levelOptions" v-model="s.instruction_following" item-title="title" item-value="value" density="compact" hide-details />
              </td>
              <td>
                <VTextField v-model="s.guidance" density="compact" hide-details placeholder="توجيه (اختياري)" />
              </td>
              <td>
                <VTextField v-model="s.notes" density="compact" hide-details placeholder="ملاحظات (اختياري)" />
              </td>
            </tr>
            <tr v-if="!loading && !students.length">
              <td colspan="10" class="text-center text-medium-emphasis">لا يوجد طلاب لعرضهم</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn color="primary" :loading="saving" prepend-icon="ri-save-3-line" @click="saveAll">حفظ التقييمات</VBtn>
      </VCardActions>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true" close-text="موافق" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'teacher-evaluations-bulk-upsert-evaluations',
  data() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return {
      breadcrumbs: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'تقييمات الطلاب', disabled: false, to: '/teacher/evaluations/manage-evaluations' },
        { title: 'إضافة تقييمات يومية', disabled: true },
      ],
      form: { date: `${yyyy}-${mm}-${dd}`, course_id: null },
      levelOptions: [
        { title: 'ممتاز', value: 'excellent' },
        { title: 'جيد جدًا', value: 'very_good' },
        { title: 'جيد', value: 'good' },
        { title: 'مقبول', value: 'fair' },
        { title: 'ضعيف', value: 'weak' },
      ],
      students: [],
      loading: false,
      saving: false,
      alert: { open: false, type: 'success', message: '' },
      // selects
      courseItems: [],
      coursesLoading: false,
    };
  },
  created() { this.loadCourses(); },
  watch: {
    'form.date'(v) { if (v && this.form.course_id) this.loadStudents(); },
    'form.course_id'(v) { if (v && this.form.date) this.loadStudents(); },
  },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
    async loadCourses() {
      try {
        this.coursesLoading = true;
        const res = await TeacherApi.getCourseNames();
        this.courseItems = (res?.data?.data || []).map(c => ({ text: c.name, value: c.id }));
      } catch (e) { /* noop */ }
      finally { this.coursesLoading = false; }
    },
    async loadStudents() {
      try {
        if (!this.form.date || !this.form.course_id) {
          this.showAlert('info', 'اختر التاريخ والدورة أولاً');
          return;
        }
        this.loading = true;
        const params = { date: this.form.date, courseId: this.form.course_id, page: 1, limit: 200 };
        const res = await TeacherApi.getStudentsWithEval(params);
        const data = res?.data?.data || [];
        // normalize: ensure properties exist
        this.students = data.map(r => ({
          student_id: r.student_id,
          student_name: r.student_name,
          scientific_level: r.scientific_level,
          behavioral_level: r.behavioral_level,
          attendance_level: r.attendance_level,
          homework_preparation: r.homework_preparation,
          participation_level: r.participation_level,
          instruction_following: r.instruction_following,
          guidance: r.guidance,
          notes: r.notes,
        }));
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل جلب الطلاب');
      } finally { this.loading = false; }
    },
    async saveAll() {
      try {
        if (!this.form.date) { this.showAlert('error', 'التاريخ مطلوب'); return; }
        const items = this.students
          .filter(s => s.student_id)
          .map(s => ({
            student_id: s.student_id,
            scientific_level: s.scientific_level || null,
            behavioral_level: s.behavioral_level || null,
            attendance_level: s.attendance_level || null,
            homework_preparation: s.homework_preparation || null,
            participation_level: s.participation_level || null,
            instruction_following: s.instruction_following || null,
            guidance: s.guidance || null,
            notes: s.notes || null,
          }));
        if (!items.length) { this.showAlert('error', 'أضف طالبًا واحدًا على الأقل'); return; }
        this.saving = true;
        const isoDate = new Date(`${this.form.date}T00:00:00`).toISOString();
        await TeacherApi.bulkUpsertEvaluations({ eval_date: isoDate, items });
        this.showAlert('success', 'تم حفظ التقييمات وإرسال الإشعارات');
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل حفظ التقييمات');
      } finally { this.saving = false; }
    },
  },
};
</script>
