<template>
  <div>
    <!-- Header -->
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
          <VBtn color="primary" class="ma-2" prepend-icon="ri-add-line" rounded="pill" elevation="2" size="default" @click="openCreateDialog">
            إضافة واجب جديد
          </VBtn>
        </VRow>
      </VCardItem>
    </VCard>

        <!-- Filter Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-notification-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">إشعارات المعلم</h3>
        <VSpacer />
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3">
          <VCol cols="12" md="4">
            <VSelect v-model="filters.course_id" :items="courseItems" item-title="text" item-value="value"
              label="الدورة" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading"
              @update:model-value="reload" clearable />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="filters.subject_id" :items="subjectItems" item-title="text" item-value="value"
              label="المادة" variant="outlined" :loading="subjectsLoading" :disabled="subjectsLoading"
              @update:model-value="reload" clearable />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Table -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
                <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small" class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">قائمة الواجبات</h3>
          </VCol>
          <VCol cols="auto">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ Number(table.totalItems).toLocaleString() }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
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
          @deleteItem="handleDeleteAssignment"
          @editItem="openEditDialog"
          @updateResponseItem="openGradeDialog"
          @sendNotificationsItem="openRecipientsDialog"
          @showItem="openAssignmentOverview"
        />
      </VCardItem>
    </VCard>

    <!-- Create/Edit Dialog -->
    <VDialog v-model="formDialog.open" max-width="1000">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon icon="ri-task-line" class="me-2" />
          <span class="text-h6">{{ formDialog.mode === 'create' ? 'إنشاء واجب' : 'تعديل واجب' }}</span>
          <VSpacer />
          <VBtn icon variant="text" @click="formDialog.open = false">
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <!-- التاريخ أولاً -->
            <VCol cols="12" md="6">
              <AppDateTimePicker v-model="form.assigned_date" type="date" label="تاريخ الإسناد" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <AppDateTimePicker v-model="form.due_date" type="date" label="تاريخ التسليم" variant="outlined" />
            </VCol>

            <!-- العنوان والوصف -->
            <VCol cols="12" md="6">
              <VTextField v-model="form.title" label="العنوان" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.description" label="الوصف" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="form.course_id" :items="courseItems" item-title="text" item-value="value" label="الدورة" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading" />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="form.subject_id" :items="subjectItems" item-title="text" item-value="value" label="المادة" variant="outlined" :loading="subjectsLoading" :disabled="subjectsLoading" clearable />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="form.session_id" :items="sessionItems" item-title="text" item-value="value" label="الجلسة (اختياري)" variant="outlined" :loading="sessionsLoading" :disabled="sessionsLoading" clearable />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="form.submission_type" :items="submissionTypes" label="نوع التسليم (مطلوب للطالب)" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="form.delivery_mode" :items="deliveryModes" label="وضع التسليم (ورقي/إلكتروني)" variant="outlined" />
            </VCol>

            <VCol cols="12" md="4">
              <VTextField v-model.number="form.max_score" type="number" label="الدرجة القصوى" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch v-model="form.is_active" label="مفعل" inset />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="form.visibility" :items="visibilityItems" label="نطاق الظهور" variant="outlined" />
            </VCol>

            <!-- Recipients when specific_students -->
            <VCol cols="12" v-if="form.visibility === 'specific_students'">
              <VSelect
                v-model="form.recipients.studentIds"
                :items="studentsOptions"
                item-title="name"
                item-value="id"
                label="اختر الطلاب"
                chips
                multiple
                clearable
                :loading="studentsLoading"
                variant="outlined"
              />
            </VCol>

            <!-- المرفقات (Base64) -->
            <VCol cols="12">
              <h4 class="text-subtitle-1 mb-2">المرفقات</h4>
            </VCol>
            <VCol cols="12" md="6">
              <VFileInput
                label="ملف PDF (اختياري)"
                variant="outlined"
                accept="application/pdf"
                show-size
                @update:model-value="(files) => onPdfSelected(files)"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VFileInput
                label="صور (اختياري، متعدد)"
                variant="outlined"
                accept="image/*"
                multiple
                show-size
                @update:model-value="(files) => onImagesSelected(files)"
              />
            </VCol>

            <!-- ملفات موجودة مسبقًا (بالروابط) -->
            <VCol cols="12" v-if="formDialog.mode !== 'create'">
              <div class="d-flex align-center mb-2">
                <h4 class="text-subtitle-1 mb-0">ملفات موجودة مسبقًا</h4>
                <VSpacer />
                <VBtn size="small" variant="tonal" color="primary" @click="addExistingFile" prepend-icon="ri-add-line">إضافة ملف موجود</VBtn>
              </div>
              <VRow v-for="(ex, i) in form.attachments.existing" :key="i" class="mb-2">
                <VCol cols="12" md="2">
                  <VSelect :items="attachmentTypeItems" v-model="ex.type" label="النوع" variant="outlined" />
                </VCol>
                <VCol cols="12" md="4">
                  <VTextField v-model="ex.name" label="الاسم" variant="outlined" />
                </VCol>
                <VCol cols="12" md="5">
                  <VTextField v-model="ex.url" label="الرابط" variant="outlined" />
                </VCol>
                <VCol cols="12" md="1" class="d-flex align-center">
                  <VBtn icon color="error" variant="text" @click="removeExistingFile(i)">
                    <VIcon>ri-delete-bin-line</VIcon>
                  </VBtn>
                </VCol>
              </VRow>
            </VCol>

            <!-- الموارد (JSON) -->
            <VCol cols="12">
              <div class="d-flex align-center mb-2">
                <h4 class="text-subtitle-1 mb-0">الموارد</h4>
                <VSpacer />
                <VBtn size="small" variant="tonal" color="primary" @click="addResourceRow" prepend-icon="ri-add-line">إضافة مورد</VBtn>
              </div>
              <VRow v-for="(resItem, idx) in form.resources" :key="idx" class="mb-2">
                <VCol cols="12" md="3">
                  <VSelect v-model="resItem.type" :items="resourceTypes" label="النوع" variant="outlined" />
                </VCol>
                <VCol cols="12" md="4">
                  <VTextField v-model="resItem.title" label="عنوان المورد" variant="outlined" />
                </VCol>
                <VCol cols="12" md="5">
                  <VTextField v-model="resItem.url" label="رابط المورد" variant="outlined" />
                </VCol>
                <VCol cols="12" md="1" class="d-flex align-center">
                  <VBtn icon color="error" variant="text" @click="removeResourceRow(idx)">
                    <VIcon>ri-delete-bin-line</VIcon>
                  </VBtn>
                </VCol>
              </VRow>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="formDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="formDialog.loading" @click="submitForm">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Image Preview Dialog -->
    <VDialog v-model="imagePreview.open" max-width="900">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon class="me-2">ri-image-line</VIcon>
          <span class="text-h6">{{ imagePreview.title || 'معاينة الصورة' }}</span>
          <VSpacer />
          <VBtn icon variant="text" @click="closeImage"><VIcon>ri-close-line</VIcon></VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VImg :src="imagePreview.src" :alt="imagePreview.title" height="70vh" contain class="rounded" />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn :href="imagePreview.src" target="_blank" rel="noopener" variant="tonal" prepend-icon="ri-download-2-line">فتح/تحميل</VBtn>
          <VBtn color="primary" @click="closeImage">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Alerts -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true" close-text="موافق" @close="alert.open = false" />

    <!-- Confirm Delete Dialog -->
    <ConfirmDangerDialog
      v-model="confirmDialog.open"
      :title="confirmDialog.title"
      :messages="confirmDialog.messages"
      :confirmButtonText="confirmDialog.buttonText"
      @confirm="confirmDeleteAssignment"
    />

    <!-- Grade Dialog -->
    <VDialog v-model="gradeDialog.open" max-width="600">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon class="me-2">ri-mark-pen-line</VIcon>
          <span class="text-h6">تقييم واجب</span>
          <VSpacer />
          <VBtn icon variant="text" @click="gradeDialog.open = false"><VIcon>ri-close-line</VIcon></VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12">
              <VSelect v-model="gradeDialog.studentId" :items="studentsOptions" item-title="name" item-value="id" label="اختر الطالب" :loading="studentsLoading" clearable />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model.number="gradeDialog.score" type="number" label="الدرجة" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="gradeDialog.feedback" label="ملاحظات (اختياري)" />
            </VCol>
            <!-- Submission preview -->
            <VCol cols="12" v-if="gradeDialog.submission">
              <VCard variant="tonal" class="pa-3">
                <div class="d-flex align-center mb-2">
                  <VChip size="small" :color="gradeDialog.submission.status === 'submitted' ? 'primary' : 'default'" class="me-2">
                    {{ gradeDialog.submission.status || '—' }}
                  </VChip>
                  <span class="text-caption">تم الإرسال: {{ formatDateTime(gradeDialog.submission.submitted_at) }}</span>
                </div>
                <div v-if="gradeDialog.submission.content_text" class="mb-2">
                  <strong>النص:</strong>
                  <div class="text-body-2 mt-1" style="white-space: pre-wrap;">{{ gradeDialog.submission.content_text }}</div>
                </div>
                <div v-if="gradeDialog.submission.link_url" class="mb-2">
                  <strong>رابط:</strong>
                  <a :href="gradeDialog.submission.link_url" target="_blank" rel="noopener" class="ms-1">فتح الرابط</a>
                </div>
                <div v-if="Array.isArray(gradeDialog.submission.attachments) && gradeDialog.submission.attachments.length">
                  <strong class="d-block mb-2">مرفقات:</strong>
                  <VRow class="ga-2">
                    <VCol v-for="(att, i) in gradeDialog.submission.attachments" :key="i" cols="12" sm="6">
                      <div v-if="(att.type || '').toLowerCase() === 'image'">
                        <VImg :src="resolveUrl(att.url)" :alt="att.name" height="150" cover class="rounded" style="cursor: pointer;"
                              @click="openImage(att)" />
                      </div>
                      <div v-else>
                        <VBtn :href="resolveUrl(att.url)" target="_blank" rel="noopener" variant="tonal" size="small" prepend-icon="ri-attachment-2">
                          {{ att.name || 'ملف' }}
                        </VBtn>
                      </div>
                    </VCol>
                  </VRow>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="gradeDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="gradeDialog.loading" @click="submitGrade">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Recipients Dialog -->
    <VDialog v-model="recipientsDialog.open" max-width="700">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon class="me-2">ri-user-add-line</VIcon>
          <span class="text-h6">تعيين الطلاب المستهدفين</span>
          <VSpacer />
          <VBtn icon variant="text" @click="recipientsDialog.open = false"><VIcon>ri-close-line</VIcon></VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VSelect
            v-model="recipientsDialog.studentIds"
            :items="studentsOptions"
            item-title="name"
            item-value="id"
            label="اختر الطلاب"
            chips multiple clearable :loading="studentsLoading" />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="recipientsDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="recipientsDialog.loading" @click="submitRecipients">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'teacher-assignments-manage-assignments',
  data() {
    return {
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'الواجبات', disabled: true },
      ],
      attachmentTypeItems: [
        { title: 'image', value: 'image' },
        { title: 'pdf', value: 'pdf' },
      ],
      resourceTypes: [
        { title: 'link', value: 'link' },
      ],
      alert: { open: false, type: 'success', message: '' },
      confirmDialog: {
        open: false,
        title: 'تأكيد الحذف',
        buttonText: 'حذف نهائي',
        messages: [
          'سيتم حذف هذا الواجب نهائياً.',
          'لا يمكن التراجع عن هذه العملية.',
        ],
        targetId: null,
      },

      filters: { course_id: null, subject_id: null },

      table: {
        totalItems: 0,
        Data: [],
        actions: ['تعديل', 'تحديث رد', 'ارسال اشعار', 'حذف'],
        loading: false,
        headers: [
          { title: '#', type: 'strong', sortable: false, key: 'num' },
          { title: 'العنوان', type: 'link', sortable: true, key: 'title' },
          { title: 'الدورة', type: 'strong', sortable: false, key: 'course_label' },
          { title: 'تاريخ التسليم', type: 'strong', sortable: true, key: 'due_date' },
          { title: 'الظهور', type: 'strong', sortable: false, key: 'visibility_label' },
          { title: 'الحالة', type: 'strong', sortable: false, key: 'is_active_label' },
          { title: 'إجراءات', type: 'strong', sortable: false, key: 'actions' },
        ],
        tableSettings: { options: { page: 1, limit: 10, search: null } },
      },

      // selects
      courseItems: [],
      subjectItems: [],
      sessionItems: [],
      coursesLoading: false,
      subjectsLoading: false,
      sessionsLoading: false,

      // students for recipients
      studentsOptions: [],
      studentsLoading: false,
      // grade dialog
      gradeDialog: { open: false, loading: false, assignmentId: null, studentId: null, score: null, feedback: '', submission: null },
      // recipients dialog
      recipientsDialog: { open: false, loading: false, assignmentId: null, studentIds: [] },

      // image preview dialog
      imagePreview: { open: false, src: '', title: '' },

      // form dialog
      formDialog: { open: false, mode: 'create', loading: false },
      form: {
        id: null,
        title: '',
        description: '',
        course_id: null,
        subject_id: null,
        session_id: null,
        assigned_date: '',
        due_date: '',
        submission_type: 'mixed',
        delivery_mode: 'mixed',
        attachments: { pdf: { name: '', base64: '' }, images: [], existing: [] },
        resources: [],
        max_score: 100,
        is_active: true,
        visibility: 'all_students',
        study_year: null,
        grade_id: null,
        recipients: { studentIds: [] },
      },

      submissionTypes: [
        { title: 'نصي فقط', value: 'text' },
        { title: 'رابط فقط', value: 'link' },
        { title: 'ملف فقط', value: 'file' },
        { title: 'مختلط (نص/رابط/ملف)', value: 'mixed' },
      ],
      deliveryModes: [
        { title: 'ورقي', value: 'paper' },
        { title: 'إلكتروني', value: 'electronic' },
        { title: 'مختلط', value: 'mixed' },
      ],
      visibilityItems: [
        { title: 'كل الطلاب', value: 'all_students' },
        { title: 'طلاب محددون', value: 'specific_students' },
      ],
    };
  },
  created() {
    this.loadCourseNames();
    this.loadSubjects();
    this.loadSessionNames();
    this.getDataAxios();
  },
  watch: {
    'form.visibility'(val) {
      // reset selection when mode changes
      this.form.recipients.studentIds = [];
      if (val === 'specific_students') {
        // choose best source: session > course > all
        if (this.form.session_id) {
          this.loadStudentsBySession(this.form.session_id);
        } else if (this.form.course_id) {
          this.loadStudentsByCourse(this.form.course_id);
        } else {
          this.loadTeacherStudents();
        }
      } else {
        this.studentsOptions = [];
      }
    },
    'form.session_id'(sid) {
      if (this.form.visibility === 'specific_students') {
        if (sid) {
          this.loadStudentsBySession(sid);
        } else if (this.form.course_id) {
          this.loadStudentsByCourse(this.form.course_id);
        } else {
          this.loadTeacherStudents();
        }
      }
    },
    'form.course_id'(cid) {
      if (this.form.visibility === 'specific_students') {
        if (!this.form.session_id) {
          // only load by course if no session is chosen
          if (cid) this.loadStudentsByCourse(cid);
          else this.loadTeacherStudents();
        }
      }
    },
    // when selecting student in grade dialog, fetch existing submission if any
    'gradeDialog.studentId': {
      async handler(sid) {
        try {
          const aId = this.gradeDialog.assignmentId;
          if (!aId || !sid) { this.gradeDialog.score = null; this.gradeDialog.feedback = ''; this.gradeDialog.submission = null; return; }
          const res = await TeacherApi.getAssignmentSubmission(aId, sid);
          const sub = res?.data?.data;
          if (sub) {
            this.gradeDialog.score = typeof sub.score === 'number' ? sub.score : (sub.score ? Number(sub.score) : null);
            this.gradeDialog.feedback = sub.feedback || '';
            this.gradeDialog.submission = sub;
          } else {
            this.gradeDialog.score = null;
            this.gradeDialog.feedback = '';
            this.gradeDialog.submission = null;
          }
        } catch (e) {
          // if not found, clear fields silently
          this.gradeDialog.score = null;
          this.gradeDialog.feedback = '';
          this.gradeDialog.submission = null;
        }
      },
      immediate: false,
    },
  },
  methods: {
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
    formatDateTime(val) {
      if (!val) return '';
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString('ar-IQ');
    },
    resolveUrl(url) {
      if (!url) return '';
      if (/^https?:\/\//i.test(url)) return url;
      try {
        const cfg = JSON.parse(localStorage.getItem('results') || '{}');
        const base = cfg?.content_url || 'http://localhost:3000';
        // Use URL to properly join and percent-encode unicode characters
        const full = new URL(url, base);
        return full.href;
      } catch {
        // Fallback simple join
        const base = 'http://localhost:3000';
        return (base.replace(/\/$/, '')) + (String(url).startsWith('/') ? '' : '/') + String(url);
      }
    },
    openImage(att) {
      const src = this.resolveUrl(att?.url);
      this.imagePreview = { open: true, src, title: att?.name || '' };
    },
    closeImage() {
      this.imagePreview.open = false;
    },

    // attachments handlers (Base64)
    async onPdfSelected(files) {
      try {
        if (!this.form) this.form = {};
        if (!this.form.attachments) this.form.attachments = { pdf: { name: '', base64: '' }, images: [], existing: [] };
        const file = Array.isArray(files) ? files[0] : files;
        if (!file) { this.form.attachments.pdf = { name: '', base64: '' }; return; }
        const base64 = await this.readFileAsBase64(file);
        this.form.attachments.pdf = { name: file.name || 'document.pdf', base64 };
      } catch { this.form.attachments.pdf = { name: '', base64: '' }; }
    },
    async onImagesSelected(files) {
      try {
        if (!this.form) this.form = {};
        if (!this.form.attachments) this.form.attachments = { pdf: { name: '', base64: '' }, images: [], existing: [] };
        const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
        const results = [];
        for (const f of list) {
          const base64 = await this.readFileAsBase64(f);
          results.push({ name: f.name || 'image.png', base64 });
        }
        this.form.attachments.images = results;
      } catch { this.form.attachments.images = []; }
    },
    readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    // Grade
    async openGradeDialog(row) {
      try {
        if (!row?.id) return;
        this.gradeDialog.assignmentId = row.id;
        this.gradeDialog.submission = null;
        // load eligible recipients for grading from backend
        this.studentsLoading = true;
        try {
          const res = await TeacherApi.getAssignmentRecipients(row.id);
          const list = res?.data?.data || [];
          this.studentsOptions = list.map(s => ({ id: String(s.id || s.studentId || s.student_id), name: s.name || s.fullName || s.student_name }));
        } finally { this.studentsLoading = false; }
        // reset selected student and previous values
        this.gradeDialog.studentId = null;
        this.gradeDialog.score = null;
        this.gradeDialog.feedback = '';
        this.gradeDialog.open = true;
      } catch (e) { this.showAlert('error', 'تعذر فتح التقييم'); }
    },
    async submitGrade() {
      try {
        this.gradeDialog.loading = true;
        const { assignmentId, studentId, score, feedback } = this.gradeDialog;
        if (!assignmentId || !studentId) { this.showAlert('error', 'اختر الطالب'); return; }
        await TeacherApi.gradeAssignment(assignmentId, studentId, { score, feedback });
        this.showAlert('success', 'تم حفظ التقييم');
        this.gradeDialog.open = false;
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل حفظ التقييم');
      } finally { this.gradeDialog.loading = false; }
    },

    // Recipients
    async openRecipientsDialog(row) {
      try {
        if (!row?.id) return;
        this.recipientsDialog.assignmentId = row.id;
        // preload existing recipients for this assignment
        try {
          const res = await TeacherApi.getAssignmentRecipients(row.id);
          const existing = (res?.data?.data || []).map(s => String(s.id || s.studentId || s.student_id || s));
          this.recipientsDialog.studentIds = existing;
        } catch (_) {
          this.recipientsDialog.studentIds = [];
        }
        // load students for selection (source priority: session > course > all)
        if (this.form.session_id) await this.loadStudentsBySession(this.form.session_id);
        else if (this.form.course_id) await this.loadStudentsByCourse(this.form.course_id);
        else await this.loadTeacherStudents();
        this.recipientsDialog.open = true;
      } catch (e) { this.showAlert('error', 'تعذر فتح المستلمين'); }
    },
    async submitRecipients() {
      try {
        this.recipientsDialog.loading = true;
        const { assignmentId, studentIds } = this.recipientsDialog;
        await TeacherApi.setAssignmentRecipients(assignmentId, studentIds.map(String));
        this.showAlert('success', 'تم حفظ المستلمين');
        this.recipientsDialog.open = false;
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل حفظ المستلمين');
      } finally { this.recipientsDialog.loading = false; }
    },

    async loadCourseNames() {
      try {
        this.coursesLoading = true;
        const res = await TeacherApi.getCourseNames();
        const list = res?.data?.data || [];
        this.courseItems = list.map(x => ({ text: x.name, value: x.id }));
      } finally { this.coursesLoading = false; }
    },
    async loadSubjects() {
      try {
        this.subjectsLoading = true;
        const res = await TeacherApi.getAllSubjects();
        const list = res?.data?.data || [];
        this.subjectItems = list.map(s => ({ text: s.name, value: s.id }));
      } finally { this.subjectsLoading = false; }
    },
    async loadSessionNames() {
      try {
        this.sessionsLoading = true;
        const res = await TeacherApi.getSessionNames();
        const list = res?.data?.data || [];
        this.sessionItems = list.map(x => ({ text: x.title || x.name, value: x.id }));
      } finally { this.sessionsLoading = false; }
    },

    async loadTeacherStudents() {
      try {
        this.studentsLoading = true;
        const res = await TeacherApi.getTeacherStudents();
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } finally { this.studentsLoading = false; }
    },
    async loadStudentsByCourse(courseId) {
      try {
        if (!courseId) { this.studentsOptions = []; return; }
        this.studentsLoading = true;
        const res = await TeacherApi.getStudentsByCourse(courseId);
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } finally { this.studentsLoading = false; }
    },
    async loadStudentsBySession(sessionId) {
      try {
        if (!sessionId) { this.studentsOptions = []; return; }
        this.studentsLoading = true;
        const res = await TeacherApi.getStudentsBySession(sessionId);
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } finally { this.studentsLoading = false; }
    },

    // table
    reload() {
      this.table.tableSettings.options = { page: 1, limit: 10, search: null };
      this.getDataAxios();
    },
    updateTableOptions(newOptions) {
      this.table.tableSettings.options = { ...this.table.tableSettings.options, ...newOptions };
      this.getDataAxios();
    },

    async getDataAxios() {
      try {
        this.table.loading = true;
        const opts = this.table.tableSettings.options;
        const res = await TeacherApi.getAssignments({ options: opts });
        const payload = res?.data || {};
        const list = payload.data || [];
        this.table.totalItems = payload.pagination?.total || 0;
        this.table.Data = list.map((item, idx) => ({
          id: item.id,
          num: (opts.page - 1) * opts.limit + idx + 1,
          title: item.title || '-',
          course_label: item.course?.name || '-',
          due_date: item.due_date || '-',
          visibility_label: item.visibility === 'all_students' ? 'كل الطلاب' : (item.visibility === 'specific_students' ? 'طلاب محددون' : (item.visibility || '-')),
          is_active_label: item.is_active ? 'مفعل' : 'معطل',
        }));
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب الواجبات');
      } finally {
        this.table.loading = false;
      }
    },

    openCreateDialog() {
      this.formDialog.mode = 'create';
      this.formDialog.open = true;
    },

    async openEditDialog(row) {
      try {
        if (!row?.id) return;
        const res = await TeacherApi.getAssignmentById(row.id);
        const item = res?.data?.data || {};
        // Populate form
        this.form = {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          course_id: item.course_id || item.course?.id || null,
          subject_id: item.subject_id || item.subject?.id || null,
          session_id: item.session_id || item.session?.id || null,
          assigned_date: item.assigned_date || '',
          due_date: item.due_date || '',
          submission_type: (['text','link','file','mixed'].includes(String(item.submission_type || '').toLowerCase()) ? String(item.submission_type).toLowerCase() : 'mixed'),
          attachments: (() => {
            const files = Array.isArray(item.attachments?.files) ? item.attachments.files : [];
            const pdf = { name: '', base64: '' };
            const images = [];
            const existing = [];
            for (const f of files) {
              if (f.base64) {
                if ((f.type || '').toLowerCase() === 'pdf') pdf.name = f.name || 'document.pdf', pdf.base64 = f.base64;
                else images.push({ name: f.name || 'image.png', base64: f.base64 });
              } else if (f.url) {
                existing.push({ type: f.type || 'image', name: f.name || '', url: f.url || '' });
              }
            }
            return { pdf, images, existing };
          })(),
          resources: Array.isArray(item.resources) ? item.resources.map(r => ({ type: r.type || 'link', title: r.title || '', url: r.url || '' })) : [],
          max_score: typeof item.max_score === 'number' ? item.max_score : 100,
          is_active: typeof item.is_active === 'boolean' ? item.is_active : true,
          visibility: item.visibility || 'all_students',
          study_year: item.study_year || null,
          grade_id: item.grade_id || null,
          recipients: { studentIds: Array.isArray(item.recipients) ? item.recipients.map(s => String(s.id || s.studentId || s)) : [] },
          delivery_mode: (item.attachments?.meta?.delivery_mode) ? String(item.attachments.meta.delivery_mode).toLowerCase() : 'mixed',
        };
        // Load students list as per watchers
        if (this.form.visibility === 'specific_students') {
          if (this.form.session_id) await this.loadStudentsBySession(this.form.session_id);
          else if (this.form.course_id) await this.loadStudentsByCourse(this.form.course_id);
          else await this.loadTeacherStudents();
        }
        this.formDialog.mode = 'edit';
        this.formDialog.open = true;
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر فتح التعديل');
      }
    },

    async submitForm() {
      try {
        this.formDialog.loading = true;
        const f = this.form;
        if (!f.title || !f.course_id) {
          this.showAlert('error', 'الحقول course_id و title مطلوبة');
          return;
        }
        // Build attachments.files mixed (base64/url)
        const files = [];
        if (f.attachments?.pdf?.base64) files.push({ type: 'pdf', name: f.attachments.pdf.name || 'document.pdf', base64: f.attachments.pdf.base64 });
        if (Array.isArray(f.attachments?.images)) {
          for (const img of f.attachments.images) {
            if (img?.base64) files.push({ type: 'image', name: img.name || 'image.png', base64: img.base64 });
          }
        }
        if (Array.isArray(f.attachments?.existing)) {
          for (const ex of f.attachments.existing) {
            if (ex?.url && ex?.name && ex?.type) files.push({ type: ex.type, name: ex.name, url: ex.url });
          }
        }
        // Always include meta.delivery_mode
        const normalizedDelivery = (['paper','electronic','mixed'].includes(String(f.delivery_mode || '').toLowerCase()) ? String(f.delivery_mode).toLowerCase() : 'mixed');
        const attachments = { };
        if (files.length) attachments.files = files;
        attachments.meta = { delivery_mode: normalizedDelivery };

        // Build payload
        // Normalize submission_type to allowed values
        const allowedSubmission = ['text','link','file','mixed'];
        const normalizedSubmissionType = allowedSubmission.includes(String(f.submission_type || '').toLowerCase()) ? String(f.submission_type).toLowerCase() : 'mixed';

        const payload = {
          course_id: f.course_id,
          subject_id: f.subject_id || null,
          session_id: f.session_id || null,
          title: f.title,
          description: f.description || null,
          assigned_date: f.assigned_date || null,
          due_date: f.due_date || null,
          submission_type: normalizedSubmissionType,
          attachments,
          resources: f.resources || [],
          max_score: f.max_score ?? 100,
          is_active: !!f.is_active,
          visibility: f.visibility || 'all_students',
          study_year: f.study_year || null,
          grade_id: f.grade_id || null,
          recipients: f.visibility === 'specific_students' ? { studentIds: (f.recipients?.studentIds || []).map(String) } : undefined,
        };
        if (this.formDialog.mode === 'edit' && f.id) {
          await TeacherApi.updateAssignment(f.id, payload);
          this.showAlert('success', 'تم تحديث الواجب');
        } else {
          await TeacherApi.createAssignment(payload);
          this.showAlert('success', 'تم إنشاء الواجب');
        }
        this.formDialog.open = false;
        this.getDataAxios();
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || (this.formDialog.mode === 'edit' ? 'فشل تحديث الواجب' : 'فشل إنشاء الواجب'));
      } finally {
        this.formDialog.loading = false;
      }
    },

    addResourceRow() {
      if (!Array.isArray(this.form.resources)) this.form.resources = [];
      this.form.resources.push({ type: 'link', title: '', url: '' });
    },
    removeResourceRow(idx) {
      if (!Array.isArray(this.form.resources)) return;
      this.form.resources.splice(idx, 1);
    },

    addExistingFile() {
      if (!this.form.attachments || !Array.isArray(this.form.attachments.existing)) this.form.attachments = { pdf: { name: '', base64: '' }, images: [], existing: [] };
      this.form.attachments.existing.push({ type: 'image', name: '', url: '' });
    },
    removeExistingFile(i) {
      if (!this.form.attachments || !Array.isArray(this.form.attachments.existing)) return;
      this.form.attachments.existing.splice(i, 1);
    },

    async handleDeleteAssignment(row) {
      if (!row?.id) return;
      this.confirmDialog.targetId = row.id;
      this.confirmDialog.open = true;
    },
    async confirmDeleteAssignment() {
      try {
        const id = this.confirmDialog.targetId;
        if (!id) return;
        await TeacherApi.deleteAssignment(id);
        this.showAlert('success', 'تم حذف الواجب');
        this.getDataAxios();
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل حذف الواجب');
      } finally {
        this.confirmDialog.targetId = null;
        this.confirmDialog.open = false;
      }
    },

    openAssignmentOverview(row) {
      if (!row?.id) return;
      this.$router.push({ name: 'teacher-assignments-assignment-overview', query: { id: row.id } });
    },
  },
};
</script>
