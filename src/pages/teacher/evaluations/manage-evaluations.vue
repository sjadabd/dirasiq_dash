<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />
    <VCard class="my-4">
      <VCardTitle class="d-flex align-center">
        <VIcon class="me-2">ri-award-line</VIcon>
        <span class="text-h6">تقييمات الطلاب</span>
        <VSpacer />
        <VTextField v-model="filters.from" type="date" label="من" density="comfortable" style="max-inline-size: 160px;"
          class="me-2" />
        <VTextField v-model="filters.to" type="date" label="إلى" density="comfortable" style="max-inline-size: 160px;"
          class="me-4" />
        <VBtn color="primary" variant="tonal" prepend-icon="ri-search-line" @click="getData">بحث</VBtn>
        <VBtn color="primary" class="ms-3" prepend-icon="ri-add-line" @click="goToBulk">إضافة تقييمات يومية</VBtn>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <SmartTable :headers="table.headers" :items="table.items" :actions="table.actions" :loading="table.loading"
          :totalItems="table.total" :tableOptions="table.options" @updateTableOptions="updateOptions"
          @showItem="openDetails" />
      </VCardText>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'teacher-evaluations-manage-evaluations',
  data() {
    return {
      breadcrumbs: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'تقييمات الطلاب', disabled: true },
      ],
      filters: { from: '', to: '' },
      table: {
        headers: [
          { title: '#', type: 'strong', key: 'num', sortable: false },
          { title: 'الطالب', type: 'strong', key: 'student_name', sortable: true },
          { title: 'الدورة', type: 'strong', key: 'course_name', sortable: false },
          { title: 'التاريخ', type: 'date', key: 'eval_date', sortable: true },
          { title: 'علمي', type: 'strong', key: 'scientific_level_label', sortable: false },
          { title: 'سلوكي', type: 'strong', key: 'behavioral_level_label', sortable: false },
          { title: 'حضور', type: 'strong', key: 'attendance_level_label', sortable: false },
          { title: 'واجب', type: 'strong', key: 'homework_preparation_label', sortable: false },
          { title: 'مشاركة', type: 'strong', key: 'participation_level_label', sortable: false },
          { title: 'اتباع التعليمات', type: 'strong', key: 'instruction_following_label', sortable: false },
        ],
        actions: ['عرض', 'تعديل'],
        items: [],
        total: 0,
        loading: false,
        options: { page: 1, limit: 10, search: null },
      },
      alert: { open: false, type: 'success', message: '' },
    };
  },
  created() { this.getData(); },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
    levelLabel(v) {
      const map = { excellent: 'ممتاز', very_good: 'جيد جدًا', good: 'جيد', fair: 'مقبول', weak: 'ضعيف' };
      return map[String(v || '').toLowerCase()] || '—';
    },
    async getData() {
      try {
        this.table.loading = true;
        const params = { page: this.table.options.page, limit: this.table.options.limit };
        if (this.filters.from) params.from = this.filters.from;
        if (this.filters.to) params.to = this.filters.to;
        const res = await TeacherApi.listEvaluations(params);
        const data = res?.data?.data || [];
        const pagination = res?.data?.pagination || { total: data.length };
        this.table.total = pagination.total || 0;
        this.table.items = data.map((x, i) => ({
          ...x,
          num: (this.table.options.page - 1) * this.table.options.limit + (i + 1),
          student_name: x.student?.name || x.student_name || '—',
          scientific_level_label: this.levelLabel(x.scientific_level),
          behavioral_level_label: this.levelLabel(x.behavioral_level),
          attendance_level_label: this.levelLabel(x.attendance_level),
          homework_preparation_label: this.levelLabel(x.homework_preparation),
          participation_level_label: this.levelLabel(x.participation_level),
          instruction_following_label: this.levelLabel(x.instruction_following),
        }));
      } catch (e) { this.showAlert('error', e?.response?.data?.message || 'فشل جلب التقييمات'); }
      finally { this.table.loading = false; }
    },
    updateOptions(opts) { this.table.options = opts; this.getData(); },
    openDetails(row) { this.$router.push({ name: 'teacher-evaluations-evaluation-details', query: { id: row.id } }); },
    goToBulk() { this.$router.push({ name: 'teacher-evaluations-bulk-upsert-evaluations' }); },
  },
};
</script>
