<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />

    <VCard class="my-4">
      <VCardTitle class="d-flex align-center">
        <VIcon class="me-2">ri-article-line</VIcon>
        <span class="text-h6">الامتحانات والدرجات</span>
        <VSpacer />
        <VSelect v-model="filters.type" :items="typeItems" item-title="title" item-value="value" label="نوع الامتحان"
          style="max-inline-size: 200px;" density="comfortable" clearable @update:modelValue="getExams" />
        <VBtn color="primary" class="ms-3" prepend-icon="ri-add-line" @click="openCreateDialog">امتحان جديد</VBtn>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <SmartTable :headers="table.headers" :items="table.items" :actions="table.actions" :loading="table.loading"
          :totalItems="table.total" :tableOptions="table.options" @updateTableOptions="updateOptions"
          @editItem="openEditDialog" @deleteItem="confirmDelete" @showItem="goToDetails" />
      </VCardText>
    </VCard>

    <!-- Create/Edit Dialog -->
    <VDialog v-model="dialog.open" max-width="700">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon class="me-2">ri-edit-2-line</VIcon>
          <span class="text-h6">{{ dialog.mode === 'create' ? 'إنشاء امتحان' : 'تعديل امتحان' }}</span>
          <VSpacer />
          <VBtn icon variant="text" @click="dialog.open = false">
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VSelect v-model="form.course_id" :items="courseItems" item-title="text" item-value="value" label="الدورة"
                :loading="coursesLoading" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.subject_id" :items="subjectItems" item-title="text" item-value="value"
                label="المادة" :loading="subjectsLoading" />
            </VCol>
            <VCol cols="12" md="12">
              <VSelect v-model="form.sessionIds" :items="sessionItems" item-title="text" item-value="value"
                label="الجلسات (اختياري متعدد)" chips multiple clearable :loading="sessionsLoading" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.exam_date" type="datetime-local" label="تاريخ ووقت الامتحان" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="form.exam_type" :items="typeItems" item-title="title" item-value="value"
                label="نوع الامتحان" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model.number="form.max_score" type="number" label="الدرجة القصوى" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="form.description" label="الوصف (اختياري)" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="form.notes" label="ملاحظات (اختياري)" />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="dialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="dialog.loading" @click="submitForm">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Confirm Delete -->
    <ConfirmDangerDialog v-model="confirm.open" :title="confirm.title" :messages="confirm.messages"
      :confirmButtonText="confirm.buttonText" @confirm="doDelete" />

    <!-- Alerts -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'teacher-exams-manage',
  data() {
    return {
      breadcrumbs: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'الامتحانات والدرجات', disabled: true },
      ],
      filters: { type: null },
      typeItems: [
        { title: 'يومي', value: 'daily' },
        { title: 'شهري', value: 'monthly' },
      ],
      table: {
        headers: [
          { title: '#', type: 'strong', sortable: false, key: 'num' },
          { title: 'العنوان/الوصف', type: 'link', sortable: false, key: 'title' },
          { title: 'النوع', type: 'strong', sortable: true, key: 'exam_type_label' },
          { title: 'التاريخ', type: 'strong', sortable: true, key: 'exam_date' },
          { title: 'الدرجة القصوى', type: 'strong', sortable: false, key: 'max_score' },
          { title: 'الجلسات', type: 'strong', sortable: false, key: 'sessions_label' },
          { title: 'إجراءات', type: 'strong', sortable: false, key: 'actions' },
        ],
        actions: ['تعديل', 'حذف'],
        items: [],
        total: 0,
        loading: false,
        options: { page: 1, limit: 10, search: null },
      },
      dialog: { open: false, loading: false, mode: 'create' },
      form: {
        id: null,
        course_id: null,
        subject_id: null,
        sessionIds: [],
        exam_date: '',
        exam_type: 'daily',
        max_score: 20,
        description: '',
        notes: '',
      },
      confirm: { open: false, id: null, title: 'تأكيد الحذف', buttonText: 'حذف', messages: ['سيتم حذف الامتحان نهائياً'] },
      alert: { open: false, type: 'success', message: '' },

      // selects
      courseItems: [], subjectItems: [], sessionItems: [],
      coursesLoading: false, subjectsLoading: false, sessionsLoading: false,
    };
  },
  created() {
    this.loadCourseNames();
  },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },

    examTypeLabel(v) { return v === 'monthly' ? 'شهري' : 'يومي'; },

    async getExams() {
      try {
        this.table.loading = true;
        const params = { page: this.table.options.page, limit: this.table.options.limit };
        if (this.filters.type) params.type = this.filters.type;
        const res = await TeacherApi.listExams(params);
        const data = res?.data?.data || [];
        const pagination = res?.data?.pagination || { total: data.length };
        this.table.total = pagination.total || 0;
        this.table.items = data.map((x, idx) => ({
          ...x,
          num: (this.table.options.page - 1) * this.table.options.limit + (idx + 1),
          title: x.description || `امتحان ${this.examTypeLabel(x.exam_type)}`,
          exam_type_label: this.examTypeLabel(x.exam_type),
          sessions_label: Array.isArray(x.sessions) && x.sessions.length
            ? x.sessions.map(s => `${s.title || ''}${s.start_time && s.end_time ? ` (${s.start_time} - ${s.end_time})` : ''}`).join('، ')
            : '—',
        }));
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل جلب الامتحانات');
      } finally { this.table.loading = false; }
    },
    updateOptions(opts) { this.table.options = opts; this.getExams(); },

    openCreateDialog() { this.dialog.mode = 'create'; this.resetForm(); this.dialog.open = true; },
    openEditDialog(row) {
      this.dialog.mode = 'edit';
      this.form = {
        id: row.id,
        course_id: row.course_id || row.course?.id || null,
        subject_id: row.subject_id || row.subject?.id || null,
        sessionIds: Array.isArray(row.sessions) ? row.sessions.map(s => s.id) : [],
        exam_date: row.exam_date ? row.exam_date.substring(0, 16) : '',
        exam_type: row.exam_type || 'daily',
        max_score: row.max_score ?? 20,
        description: row.description || '',
        notes: row.notes || '',
      };
      this.dialog.open = true;
    },
    resetForm() {
      this.form = { id: null, course_id: null, subject_id: null, sessionIds: [], exam_date: '', exam_type: 'daily', max_score: 20, description: '', notes: '' };
    },

    async submitForm() {
      try {
        this.dialog.loading = true;
        const f = this.form;
        const payload = {
          course_id: f.course_id,
          subject_id: f.subject_id,
          sessionIds: f.sessionIds && f.sessionIds.length ? f.sessionIds : undefined,
          session_id: (!f.sessionIds || !f.sessionIds.length) ? null : undefined,
          exam_date: f.exam_date ? new Date(f.exam_date).toISOString() : null,
          exam_type: f.exam_type,
          max_score: f.max_score,
          description: f.description || null,
          notes: f.notes || null,
        };
        if (this.dialog.mode === 'edit' && f.id) await TeacherApi.updateExam(f.id, payload);
        else await TeacherApi.createExam(payload);
        this.dialog.open = false;
        this.showAlert('success', 'تم حفظ الامتحان بنجاح');
        this.getExams();
      } catch (e) { this.showAlert('error', e?.response?.data?.message || 'فشل حفظ الامتحان'); }
      finally { this.dialog.loading = false; }
    },

    confirmDelete(row) { this.confirm = { open: true, id: row.id, title: 'تأكيد الحذف', buttonText: 'حذف', messages: ['سيتم حذف الامتحان نهائياً'] }; },
    async doDelete() {
      try {
        if (!this.confirm.id) return;
        await TeacherApi.deleteExam(this.confirm.id);
        this.showAlert('success', 'تم حذف الامتحان');
        this.getExams();
      } catch (e) { this.showAlert('error', e?.response?.data?.message || 'فشل حذف الامتحان'); }
      finally { this.confirm = { ...this.confirm, open: false, id: null }; }
    },

    goToDetails(row) { this.$router.push({ name: 'teacher-exams-exam-details', query: { id: row.id } }); },

    // selects
    async loadCourseNames() {
      try {
        this.coursesLoading = true; this.subjectsLoading = true; this.sessionsLoading = true;
        const [courses, subjects, sessions] = await Promise.all([
          TeacherApi.getCourseNames(),
          TeacherApi.getAllSubjects(),
          TeacherApi.getSessionNames(),
        ]);
        this.courseItems = (courses?.data?.data || []).map(c => ({ text: c.name, value: c.id }));
        this.subjectItems = (subjects?.data?.data || []).map(s => ({ text: s.name, value: s.id }));
        this.sessionItems = (sessions?.data?.data || []).map(ss => ({ text: ss.title || ss.name || ss.label, value: ss.id }));
      } catch (e) {
        // noop
      } finally { this.coursesLoading = false; this.subjectsLoading = false; this.sessionsLoading = false; }
    },
  },
};
</script>
