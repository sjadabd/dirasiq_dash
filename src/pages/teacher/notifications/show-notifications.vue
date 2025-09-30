<template>
  <div>
    <!-- Loading Overlay -->
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />

    <!-- Breadcrumbs -->
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Filter Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-notification-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">إشعارات المعلم</h3>
        <VSpacer />
        <VBtn color="primary" prepend-icon="ri-add-line" @click="openCreateDialog">إشعار جديد</VBtn>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3">
          <VCol cols="12" md="4">
            <VSelect v-model="table.tableSettings.options.subType" :items="subTypeItems" item-title="text"
              item-value="value" label="نوع الإشعار" variant="outlined" @update:model-value="getDataAxios" clearable />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="table.tableSettings.options.courseId" :items="courseItems" item-title="text"
              item-value="value" label="الدورة" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading"
              @update:model-value="getDataAxios" clearable />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Table Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle"
              size="small" />
          </VCol>
          <VCol>
            <h3 class="text-h6 font-weight-bold text-center">قائمة الإشعارات</h3>
          </VCol>
          <VCol cols="auto">
            <VBtn color="primary" @click="openCreateDialog()" icon="ri-add-line" variant="tonal" rounded="circle"
              size="small" />
          </VCol>
        </VRow>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable :headers="table.headers" :items="table.Data" :actions="table.actions" :loading="table.loading"
          :totalItems="table.totalItems" :tableOptions="table.tableSettings.options"
          @updateTableOptions="updateTableOptions" @deleteItem="handleDeleteNotification" />
      </VCardItem>
    </VCard>

    <!-- Create Notification Dialog -->
    <VDialog v-model="createDialog.open" max-width="1000">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon icon="ri-notification-3-line" class="me-2" />
          <span class="text-h6">إرسال إشعار جديد</span>
          <VSpacer />
          <VBtn icon variant="text" @click="createDialog.open = false">
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VSelect v-model="createDialog.form.subType" :items="subTypeItems.filter(i => i.value)" item-title="text"
                item-value="value" label="نوع الإشعار" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="createDialog.form.title" label="عنوان الإشعار" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="createDialog.form.link" label="رابط (اختياري)" variant="outlined" />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="createDialog.form.message" label="نص الإشعار" variant="outlined" auto-grow />
            </VCol>

            <VCol cols="12" md="4">
              <VSelect v-model="createDialog.form.courseId" :items="courseItems" item-title="text" item-value="value"
                label="الدورة (اختياري)" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading" />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect v-model="createDialog.form.subjectId" :items="subjectItems" item-title="text" item-value="value"
                label="المادة (اختياري)" variant="outlined" :loading="subjectsLoading" :disabled="subjectsLoading"
                clearable />
            </VCol>

            <VCol cols="12" md="4">
              <VSelect v-model="createDialog.form.recipients.mode" :items="recipientModeItems" item-title="text"
                item-value="value" label="نطاق المستلمين" variant="outlined"
                @update:model-value="onRecipientsModeChange" />
            </VCol>
            <!-- specific_students: عرض جميع طلاب المعلم للاختيار -->
            <VCol cols="12" md="8" v-if="createDialog.form.recipients.mode === 'specific_students'">
              <VSelect v-model="createDialog.form.recipients.selectedStudentIds" :items="studentsOptions"
                item-title="name" item-value="id" label="اختر الطلاب" chips multiple clearable
                :loading="studentsLoading" variant="outlined" />
            </VCol>

            <!-- all_students_of_teacher: لا نعرض أي اختيار، يتم اختيار الجميع تلقائياً -->

            <!-- students of course -->
            <VCol cols="12" md="4" v-if="createDialog.form.recipients.mode === 'students_of_course'">
              <VSelect v-model="createDialog.form.recipients.courseIdForStudents" :items="courseItems" item-title="text"
                item-value="value" label="اختر الدورة" variant="outlined" :loading="coursesLoading"
                :disabled="coursesLoading" @update:model-value="loadStudentsByCourse" />
            </VCol>
            <VCol cols="12" md="8" v-if="createDialog.form.recipients.mode === 'students_of_course'">
              <VSelect v-model="createDialog.form.recipients.selectedStudentIds" :items="studentsOptions"
                item-title="name" item-value="id" label="طلاب الدورة" chips multiple clearable
                :loading="studentsLoading" variant="outlined" />
            </VCol>

            <!-- students of session -->
            <VCol cols="12" md="4" v-if="createDialog.form.recipients.mode === 'students_of_session'">
              <VSelect v-model="createDialog.form.recipients.sessionIdForStudents" :items="sessionItems"
                item-title="text" item-value="value" label="اختر الجلسة" variant="outlined" :loading="sessionsLoading"
                :disabled="sessionsLoading" @update:model-value="loadStudentsBySession" />
            </VCol>
            <VCol cols="12" md="8" v-if="createDialog.form.recipients.mode === 'students_of_session'">
              <VSelect v-model="createDialog.form.recipients.selectedStudentIds" :items="studentsOptions"
                item-title="name" item-value="id" label="طلاب الجلسة" chips multiple clearable
                :loading="studentsLoading" variant="outlined" />
            </VCol>

            <VCol cols="12" md="4">
              <VFileInput label="مرفق PDF (اختياري)" accept="application/pdf" prepend-icon="ri-file-pdf-2-line"
                @change="onPdfSelected" />
            </VCol>
            <VCol cols="12" md="4">
              <VFileInput label="صور (اختياري)" accept="image/*" multiple prepend-icon="ri-image-2-line"
                @change="onImagesSelected" />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="createDialog.open = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="createDialog.loading" @click="submitCreateNotification">إرسال</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirm Dialog -->
    <ConfirmDangerDialog v-if="deleteDialog.open" v-model="deleteDialog.open" :messages="deleteDialog.messages"
      :title="deleteDialog.title" :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDeleteConfirm" />

    <!-- Alerts -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>
<script>
import TeacherApi from '@/api/teacher/teacher_api';
import numberWithComma from '@/constant/number';

export default {
  data() {
    return {
      keyName: 'teacher-notifications',
      results: JSON.parse(localStorage.getItem('user')),
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'الإشعارات', disabled: true },
      ],
      loading: false,
      progress: 0,

      table: {
        totalItems: 0,
        Data: [],
        actions: ['حذف'],
        loading: false,
        headers: [
          { title: '#', type: 'strong', sortable: false, key: 'num' },
          { title: 'العنوان', type: 'strong', sortable: true, key: 'title' },
          { title: 'الرسالة', type: 'strong', sortable: false, key: 'message' },
          { title: 'النوع', type: 'strong', sortable: true, key: 'type_label' },
          { title: 'اسم المرسل', type: 'strong', sortable: true, key: 'sender_name' },
          { title: 'المستلمون', type: 'strong', sortable: false, key: 'recipients_label' },
          { title: 'أُرسل في', type: 'strong', sortable: true, key: 'sent_at_label' },
          { title: 'إجراءات', type: 'strong', sortable: false, key: 'actions' },
        ],
        tableSettings: {
          options: {
            page: 1,
            limit: 10,
            search: null,
            q: null,
            type: null,
            subType: null,
            courseId: null,
          },
        },
      },

      // filters helper
      subTypeItems: [
        { text: 'الكل', value: null },
        { text: 'واجب بيتي', value: 'homework' },
        { text: 'رسالة', value: 'message' },
        { text: 'تقرير', value: 'report' },
        { text: 'تبليغ', value: 'notice' },
        { text: 'أقساط', value: 'installments' },
        { text: 'حضور', value: 'attendance' },
        { text: 'ملخص درس اليومي', value: 'daily_summary' },
        { text: 'أعياد ميلاد', value: 'birthday' },
        { text: 'امتحان يومي', value: 'daily_exam' },
      ],
      courseItems: [],
      subjectItems: [],
      subjectsLoading: false,
      coursesLoading: false,

      alert: { open: false, message: null, type: 'success' },
      // delete dialog state
      deleteDialog: {
        open: false,
        data: null,
        title: 'تأكيد الحذف',
        confirmButtonText: 'حذف',
        messages: [
          'سيتم حذف هذا الإشعار.',
          'لا يمكن التراجع عن هذه العملية.',
        ],
      },
      // dialog state
      createDialog: {
        open: false,
        loading: false,
        form: {
          type: null,
          subType: null,
          title: '',
          message: '',
          courseId: null,
          subjectId: null,
          link: null,
          recipients: { mode: 'specific_students', studentIdsText: '', selectedStudentIds: [], courseIdForStudents: null, sessionIdForStudents: null },
          attachments: { pdfBase64: null, imagesBase64: [] },
          priority: 'medium',
        },
      },
      // dropdown items
      priorityItems: [
        { text: 'منخفض', value: 'low' },
        { text: 'متوسط', value: 'medium' },
        { text: 'عالي', value: 'high' },
      ],
      recipientModeItems: [
        { text: 'طلاب محددون', value: 'specific_students' },
        { text: 'طلاب الدورة', value: 'students_of_course' },
        { text: 'طلاب الجلسة', value: 'students_of_session' },
        { text: 'كل طلابي', value: 'all_students_of_teacher' },
      ],
      // roster selects
      sessionItems: [],
      sessionsLoading: false,
      studentsOptions: [],
      studentsLoading: false,
    };
  },
  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName));
    this.table.tableSettings = stored || this.table.tableSettings;
    this.loadCourseNames();
    this.loadSessionNames();
    this.loadSubjects();
  },
  methods: {
    numberWithComma,

    // table ops
    reload() {
      localStorage.removeItem(this.keyName);
      this.table.tableSettings.options = { page: 1, limit: 10, q: null, type: null, courseId: null };
      this.getDataAxios();
    },
    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
        q: !newOptions.q ? null : newOptions.q,
      };
      this.getDataAxios();
    },

    // data
    async getDataAxios() {
      this.progress = 0;
      this.loading = true;
      const fake = setInterval(() => { if (this.progress < 90) this.progress += 10; }, 100);
      try {
        localStorage.setItem(this.keyName, JSON.stringify(this.table.tableSettings));
        const opts = this.table.tableSettings.options;
        const response = await TeacherApi.getNotifications({
          page: opts.page,
          limit: opts.limit,
          q: opts.search ?? '',
          type: opts.type ?? '',
          subType: opts.subType ?? '',
          courseId: opts.courseId ?? '',
        });
        const res = response?.data || {};
        let list = res.data || [];
        // client-side filter by subType if selected
        if (opts.subType) {
          list = list.filter((n) => (n?.data?.subType || n?.subType) === opts.subType);
        }
        // helpers for localization
        const mapType = (v) => ({
          course_update: 'تحديث دورة',
          session_update: 'تحديث جلسة',
          teacher_message: 'رسالة معلم',
          booking_update: 'تحديث حجز',
          new_booking: 'حجز جديد',
          system: 'نظام',
        })[v] || v || '-';
        const mapPriority = (v) => ({ high: 'عالي', medium: 'متوسط', low: 'منخفض' })[v] || v || '-';
        const mapStatus = (v) => ({ sent: 'مُرسل', pending: 'قيد الإرسال', failed: 'فشل' })[v] || v || '-';
        const mapSenderType = (v) => ({ system: 'النظام', teacher: 'معلم', student: 'طالب', admin: 'مسؤول' })[v] || v || '-';
        const mapRecipients = (rec, legacy) => {
          // prefer structured recipients from data
          if (rec && typeof rec === 'object') {
            const mode = rec.mode || rec.type || '-';
            const cnt = rec.studentCount ?? (Array.isArray(rec.studentIds) ? rec.studentIds.length : undefined);
            const modeLabel = ({
              all_students_of_teacher: 'كل طلابي',
              students_of_course: 'طلاب الدورة',
              students_of_session: 'طلاب الجلسة',
              specific_students: 'طلاب محددون',
              specific_teachers: 'معلمون محددون',
              course_teachers: 'معلمي الدورة',
              all: 'الكل',
            })[mode] || String(mode);
            return cnt !== undefined ? `${modeLabel} (${cnt})` : modeLabel;
          }
          // fallback to legacy top-level fields
          const legacyMode = legacy?.recipient_type;
          const legacyCnt = Array.isArray(legacy?.recipient_ids) ? legacy.recipient_ids.length : undefined;
          const modeLabel = ({
            all_students_of_teacher: 'كل طلابي',
            students_of_course: 'طلاب الدورة',
            students_of_session: 'طلاب الجلسة',
            specific_students: 'طلاب محددون',
            specific_teachers: 'معلمون محددون',
            course_teachers: 'معلمي الدورة',
            all: 'الكل',
          })[legacyMode] || (legacyMode ? String(legacyMode) : '-');
          return legacyCnt !== undefined ? `${modeLabel} (${legacyCnt})` : modeLabel;
        };

        // map to rows with detailed fields
        this.table.Data = list.map((item, idx) => {
          const data = item.data || {};
          const sender = item.sender || data.sender || {};
          // Prefer data.recipients if present; ignore legacy mismatch
          const recipientsObj = data?.recipients ? data.recipients : (item.recipients || null);
          return {
            id: item.id,
            num: (opts.page - 1) * opts.limit + idx + 1,
            title: item.title || '-',
            message: item.message || '-',
            type_label: mapType(item.type),
            priority_label: mapPriority(item.priority),
            status_label: mapStatus(item.status),
            sender_name: sender.name || '-',
            sender_type_label: mapSenderType(sender.type),
            recipients_label: mapRecipients(recipientsObj, item),
            is_read_label: item.is_read ? 'مقروء' : 'غير مقروء',
            occurred_on: data.occurredOn || '-',
            scheduled_at: item.scheduled_at || '-',
            sent_at_label: this.formatDateTimeArabic(item.sent_at),
            read_at: item.read_at || '-',
            user_read_at: item.user_read_at || '-',
            created_at: item.created_at || item.createdAt || '-',
            updated_at: item.updated_at || item.updatedAt || '-',
          };
        });
        this.table.totalItems = res.pagination?.total || 0;
      } catch (error) {
        this.showAlert('error', error?.response?.data?.message || 'حدث خطأ أثناء جلب الإشعارات');
      } finally {
        clearInterval(fake);
        this.progress = 100;
        setTimeout(() => { this.loading = false; this.progress = 0; }, 500);
      }
    },
    async loadSubjects() {
      try {
        this.subjectsLoading = true;
        const res = await TeacherApi.getAllSubjects();
        const list = res?.data?.data || [];
        this.subjectItems = list.map(s => ({ text: s.name, value: s.id }));
      } catch (e) {
        this.showAlert('error', 'تعذر جلب المواد');
      } finally { this.subjectsLoading = false; }
    },
    async loadCourseNames() {
      try {
        this.coursesLoading = true;
        const response = await TeacherApi.getCourseNames();
        const list = response?.data?.data || [];
        this.courseItems = list.map(x => ({ text: x.name, value: x.id }));
      } catch (e) {
        this.showAlert('error', 'تعذر جلب أسماء الدورات');
      } finally {
        this.coursesLoading = false;
      }
    },
    async loadSessionNames() {
      try {
        this.sessionsLoading = true;
        const res = await TeacherApi.getSessionNames();
        const list = res?.data?.data || [];
        this.sessionItems = list.map((x) => ({ text: x.title || x.name, value: x.id }));
      } catch (e) {
        this.showAlert('error', 'تعذر جلب أسماء الجلسات');
      } finally {
        this.sessionsLoading = false;
      }
    },
    async onRecipientsModeChange() {
      const mode = this.createDialog.form.recipients.mode;
      this.createDialog.form.recipients.selectedStudentIds = [];
      this.studentsOptions = [];
      if (mode === 'all_students_of_teacher') {
        await this.loadAllStudents();
        // حدد جميع الطلاب افتراضياً
        this.createDialog.form.recipients.selectedStudentIds = this.studentsOptions.map(s => s.id);
      } else if (mode === 'specific_students') {
        // اعرض كل الطلاب للاختيار
        await this.loadAllStudents();
      } else if (mode === 'students_of_course') {
        // ينتظر اختيار الكورس
      } else if (mode === 'students_of_session') {
        // ينتظر اختيار الجلسة
      }
    },
    async loadAllStudents() {
      try {
        this.studentsLoading = true;
        const res = await TeacherApi.getTeacherStudents();
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } catch (e) {
        this.showAlert('error', 'تعذر جلب طلاب المعلم');
      } finally { this.studentsLoading = false; }
    },
    async loadStudentsByCourse(courseId) {
      try {
        if (!courseId) { this.studentsOptions = []; return; }
        this.studentsLoading = true;
        const res = await TeacherApi.getStudentsByCourse(courseId);
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } catch (e) {
        this.showAlert('error', 'تعذر جلب طلاب الدورة');
      } finally { this.studentsLoading = false; }
    },
    async loadStudentsBySession(sessionId) {
      try {
        if (!sessionId) { this.studentsOptions = []; return; }
        this.studentsLoading = true;
        const res = await TeacherApi.getStudentsBySession(sessionId);
        const list = res?.data?.data || [];
        this.studentsOptions = list.map(s => ({ id: String(s.id || s.student_id), name: s.name || s.student_name }));
      } catch (e) {
        this.showAlert('error', 'تعذر جلب طلاب الجلسة');
      } finally { this.studentsLoading = false; }
    },

    formatDateTimeArabic(value) {
      if (!value) return '-';
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      let hh = d.getHours();
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const isAM = hh < 12;
      const period = isAM ? 'صباحاً' : 'مساءً';
      hh = ((hh + 11) % 12) + 1; // 0->12,13->1
      const HH = String(hh).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${HH}:${min}:${ss} ${period}`;
    },
    // create/delete notification UI
    openCreateDialog() {
      this.createDialog.open = true;
    },
    async onPdfSelected(files) {
      const file = Array.isArray(files) ? files[0] : (files?.target ? files.target.files?.[0] : files?.[0]);
      if (!file) { this.createDialog.form.attachments.pdfBase64 = null; return; }
      this.createDialog.form.attachments.pdfBase64 = await this.toBase64(file);
    },
    async onImagesSelected(files) {
      const list = Array.isArray(files) ? files : (files?.target ? Array.from(files.target.files || []) : (files || []));
      const arr = [];
      for (const f of list) {
        const b64 = await this.toBase64(f);
        arr.push(b64);
      }
      this.createDialog.form.attachments.imagesBase64 = arr;
    },
    toBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    async submitCreateNotification() {
      try {
        this.createDialog.loading = true;
        const f = this.createDialog.form;
        if (!f.title || !f.message) {
          this.showAlert('error', 'الحقول title, message مطلوبة');
          return;
        }
        if (!f.recipients || !f.recipients.mode) {
          this.showAlert('error', 'recipients.mode مطلوب');
          return;
        }
        let recipients = { mode: f.recipients.mode };
        if (f.recipients.mode === 'specific_students') {
          const ids = (f.recipients.selectedStudentIds || []).map(String);
          if (!ids.length) {
            this.showAlert('error', 'الرجاء اختيار طلاب واحد على الأقل');
            return;
          }
          recipients = { mode: 'specific_students', studentIds: ids };
        }
        // attachments: ensure empty object when none
        const attachments = {};
        if (f.attachments?.pdfBase64) attachments.pdfBase64 = f.attachments.pdfBase64;
        if ((f.attachments?.imagesBase64 || []).length) attachments.imagesBase64 = f.attachments.imagesBase64;

        const payload = {
          type: 'teacher_message',
          subType: f.subType || null,
          title: f.title,
          message: f.message,
          courseId: f.courseId || null,
          subjectId: f.subjectId || null,
          link: f.link || null,
          recipients,
          attachments,
          priority: f.priority || 'medium',
        };
        const res = await TeacherApi.createNotification(payload);
        this.showAlert('success', res?.data?.message || 'تم إرسال الإشعار');
        this.createDialog.open = false;
        this.createDialog.loading = false;
        // reset form minimal
        this.createDialog.form.recipients.studentIdsText = '';
        await this.getDataAxios();
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل إرسال الإشعار');
      } finally {
        this.createDialog.loading = false;
      }
    },
    async handleDeleteNotification(item) {
      if (!item?.id) { this.showAlert('error', 'عنصر غير صالح'); return; }
      this.deleteDialog.data = item;
      this.deleteDialog.open = true;
    },
    async handleDeleteConfirm() {
      try {
        const id = this.deleteDialog?.data?.id;
        if (!id) { this.showAlert('error', 'عنصر غير صالح'); return; }
        const res = await TeacherApi.deleteNotification(id);
        this.showAlert('success', res?.data?.message || 'تم حذف الإشعار');
        this.deleteDialog.open = false;
        await this.getDataAxios();
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'فشل حذف الإشعار');
      }
    },
    showAlert(type, message) { Object.assign(this.alert, { type, message, open: true }); },
  },
};
</script>
