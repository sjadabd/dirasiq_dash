<template>
  <div>
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />
    <AppBreadcrumbs :items="breadcrumbItems" />

        <!-- Operations Card -->
    <VCard class="my-4 operations-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-cog-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">العمليات</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="align-center justify-start pa-2">
        <VBtn color="primary" class="ms-3" prepend-icon="ri-add-line" @click="goToBulk">إضافة تقييمات </VBtn>
        </VRow>
      </VCardItem>
    </VCard>
    
    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px">
          <VCol cols="12" md="3">
            <VSelect v-model="filters.studyYear" @update:model-value="applyFilters" :items="studyYears" item-title="label" item-value="value" label="السنة الدراسية" variant="outlined" :loading="yearsLoading" />
          </VCol>
          <VCol cols="12" md="3">
            <AppDateTimePicker v-model="filters.from" clearable @update:model-value="getData" label="من تاريخ" variant="outlined" />
          </VCol>
          <VCol cols="12" md="3">
            <AppDateTimePicker v-model="filters.to" clearable @update:model-value="getData" label="إلى تاريخ" variant="outlined" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <VCard class="my-4">
            <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small" class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">تقييمات الطلاب</h3>
          </VCol>
          <VCol cols="auto">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ Number(total).toLocaleString() }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
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
      keyName: 'teacher-manage-evaluations',
      results: JSON.parse(localStorage.getItem('user')),
      loading: false,
      progress: 0,
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'تقييمات الطلاب', disabled: true },
      ],
      studyYears: [],
      yearsLoading: false,
      filters: { studyYear: '', from: null, to: null },
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
  computed: {
    total() { return Number(this.table.total || 0) }
  },
  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName))
    if (stored?.filters) this.filters = { ...this.filters, ...stored.filters }
    if (stored?.tableOptions) this.table.options = { ...this.table.options, ...stored.tableOptions }
    this.loadAcademicYears()
  },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
    levelLabel(v) {
      const map = { excellent: 'ممتاز', very_good: 'جيد جدًا', good: 'جيد', fair: 'مقبول', weak: 'ضعيف' };
      return map[String(v || '').toLowerCase()] || '—';
    },
    async loadAcademicYears() {
      try {
        this.yearsLoading = true
        const res = await TeacherApi.getAcademicYears()
        const data = res?.data?.data || {}
        const years = Array.isArray(data.years) ? data.years : []
        const active = data.active || null
        this.studyYears = years.map(y => ({ label: y.year, value: y.year }))
        if (!this.filters.studyYear) this.filters.studyYear = active?.year || ''
      } catch (e) {
        // noop
      } finally {
        this.yearsLoading = false
        this.getData()
      }
    },
    async getData() {
      try {
        this.table.loading = true;
        // persist current state
        localStorage.setItem(this.keyName, JSON.stringify({ filters: this.filters, tableOptions: this.table.options }))
        const params = { page: this.table.options.page, limit: this.table.options.limit };
        if (this.filters.studyYear) params.studyYear = this.filters.studyYear;
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
    updateOptions(opts) { this.table.options = { ...this.table.options, ...opts }; this.getData(); },
    applyFilters() { this.table.options.page = 1; this.getData() },
    resetFilters() { this.filters = { studyYear: this.filters.studyYear || '', from: null, to: null }; this.applyFilters() },
    reload() { this.table.options = { page: 1, limit: 10, search: null }; this.getData() },
    openDetails(row) { this.$router.push({ name: 'teacher-evaluations-evaluation-details', query: { id: row.id } }); },
    goToBulk() { this.$router.push({ name: 'teacher-evaluations-bulk-upsert-evaluations' }); },
  },
};
</script>
