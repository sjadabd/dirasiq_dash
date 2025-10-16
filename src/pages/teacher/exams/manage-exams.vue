<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbs" />

    <!-- Operations Card -->
    <VCard class="my-4 operations-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-cog-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">العمليات</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="align-center justify-start pa-2">
          <VBtn color="primary" class="ms-3" prepend-icon="ri-add-line" @click="openCreateDialog">
            إضافة امتحان جديد
          </VBtn>
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
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="3">
            <VSelect v-model="filters.type" :items="typeItems" item-title="title" item-value="value"
              label="نوع الامتحان" style="max-inline-size: 200px;" density="comfortable" clearable
              @update:modelValue="getExams" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <VCard class="my-4">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <!-- <CHANGE> Fixed reload method call -->
            <VBtn color="primary" @click="reload" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small"
              class="rotate-on-hover" :loading="reloading" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">الامتحانات والدرجات</h3>
          </VCol>
          <VCol cols="auto">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ Number(table.total).toLocaleString() }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
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

// <CHANGE> Added cache configuration constants
const CACHE_KEY = 'teacher_exams_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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

      // <CHANGE> Added cache-related state
      reloading: false,
      cacheStatus: { isValid: false, age: '' },
    };
  },
  created() {
    this.loadCourseNames();
    this.loadFromCache();
  },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },

    examTypeLabel(v) { return v === 'monthly' ? 'شهري' : 'يومي'; },

    // <CHANGE> Added cache management methods
    getCacheKey() {
      const filterKey = JSON.stringify(this.filters);
      const optionsKey = JSON.stringify(this.table.options);
      return `${CACHE_KEY}_${filterKey}_${optionsKey}`;
    },

    saveToCache(data) {
      try {
        const cacheData = {
          data,
          timestamp: Date.now(),
          filters: this.filters,
          options: this.table.options,
        };
        sessionStorage.setItem(this.getCacheKey(), JSON.stringify(cacheData));
        this.updateCacheStatus();
      } catch (e) {
        console.error('Failed to save cache:', e);
      }
    },

    loadFromCache() {
      try {
        const cached = sessionStorage.getItem(this.getCacheKey());
        if (!cached) return false;

        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;

        if (age > CACHE_DURATION) {
          sessionStorage.removeItem(this.getCacheKey());
          return false;
        }

        // Restore data from cache
        this.table.items = cacheData.data.items;
        this.table.total = cacheData.data.total;
        this.updateCacheStatus();
        return true;
      } catch (e) {
        console.error('Failed to load cache:', e);
        return false;
      }
    },

    updateCacheStatus() {
      try {
        const cached = sessionStorage.getItem(this.getCacheKey());
        if (!cached) {
          this.cacheStatus = { isValid: false, age: '' };
          return;
        }

        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;
        const ageMinutes = Math.floor(age / 60000);
        const ageSeconds = Math.floor((age % 60000) / 1000);

        this.cacheStatus = {
          isValid: age <= CACHE_DURATION,
          age: ageMinutes > 0 ? `${ageMinutes} دقيقة` : `${ageSeconds} ثانية`,
        };
      } catch (e) {
        this.cacheStatus = { isValid: false, age: '' };
      }
    },

    clearCache() {
      try {
        // Clear all exam-related cache
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith(CACHE_KEY)) {
            sessionStorage.removeItem(key);
          }
        });
        this.cacheStatus = { isValid: false, age: '' };
        this.showAlert('success', 'تم مسح الكاش بنجاح');
        this.getExams();
      } catch (e) {
        this.showAlert('error', 'فشل مسح الكاش');
      }
    },

    // <CHANGE> Added reload method that was missing
    async reload() {
      this.reloading = true;
      try {
        // Clear cache for current filters/options
        sessionStorage.removeItem(this.getCacheKey());
        this.cacheStatus = { isValid: false, age: '' };
        await this.getExams();
      } catch (e) {
        this.showAlert('error', 'فشل تحديث البيانات');
      } finally {
        this.reloading = false;
      }
    },

    async getExams() {
      // Check cache first
      if (this.loadFromCache()) {
        return;
      }

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

        // <CHANGE> Save to cache after successful fetch
        this.saveToCache({
          items: this.table.items,
          total: this.table.total,
        });
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل جلب الامتحانات');
      } finally { this.table.loading = false; }
    },

    updateOptions(opts) {
      this.table.options = opts;
      this.getExams();
    },

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
        // <CHANGE> Clear cache after create/update
        this.clearCache();
      } catch (e) { this.showAlert('error', e?.response?.data?.message || 'فشل حفظ الامتحان'); }
      finally { this.dialog.loading = false; }
    },

    confirmDelete(row) { this.confirm = { open: true, id: row.id, title: 'تأكيد الحذف', buttonText: 'حذف', messages: ['سيتم حذف الامتحان نهائياً'] }; },
    async doDelete() {
      try {
        if (!this.confirm.id) return;
        await TeacherApi.deleteExam(this.confirm.id);
        this.showAlert('success', 'تم حذف الامتحان');
        // <CHANGE> Clear cache after delete
        this.clearCache();
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

<style scoped>
.rotate-on-hover {
  transition: transform 0.3s ease;
}

.rotate-on-hover:hover {
  transform: rotate(180deg);
}
</style>
