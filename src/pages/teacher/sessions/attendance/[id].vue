<template>
  <div>
    <!-- Breadcrumbs -->
    <AppBreadcrumbs :items="breadcrumbs" />

    <!-- Header Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-calendar-check-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">إدارة حضور الجلسة</h3>
        <VSpacer />
        <VChip color="primary" variant="elevated" class="font-weight-medium">
          {{ sessionInfo?.title || 'جلسة' }}
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3" align="center">
          <VCol cols="12" md="4">
            <VTextField v-model="filters.date" type="date" label="تاريخ اليوم" variant="outlined"
              @update:model-value="loadAttendance" />
          </VCol>
          <VCol cols="12" md="8" class="d-flex gap-2 justify-end">
            <VBtn color="primary" variant="tonal" prepend-icon="ri-refresh-line" :loading="loading"
              @click="loadAttendance">
              تحديث
            </VBtn>
            <VBtn color="success" prepend-icon="ri-save-3-line" :loading="saving" @click="saveAttendance">
              حفظ الحضور
            </VBtn>
            <VBtn variant="text" prepend-icon="ri-arrow-go-back-line" @click="$router.back()">
              رجوع
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Students List Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon icon="ri-team-line" color="primary" class="me-2" size="22" />
        <h3 class="text-h6 font-weight-bold">طلاب الجلسة لليوم المحدد</h3>
        <VSpacer />
        <VChip color="primary" variant="elevated" class="font-weight-medium">
          {{ students.length }} طالب
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <div v-if="loading" class="text-medium-emphasis">جاري التحميل...</div>
        <div v-else>
          <VAlert v-if="!students.length" type="info" variant="tonal">
            لا يوجد طلاب في هذه الجلسة.
          </VAlert>
          <VTable v-else density="comfortable">
            <thead>
              <tr>
                <th class="text-center">#</th>
                <th class="text-center">اسم الطالب</th>
                <th class="text-center">المرحلة</th>
                <th class="text-center">السنة</th>
                <th class="text-center">الحالة</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(st, idx) in students" :key="st.student_id">
                <td class="text-center" :data-label="'#'">
                  <VChip size="small" color="primary" variant="flat">{{ idx + 1 }}</VChip>
                </td>

                <td class="text-center" :data-label="'اسم الطالب'">
                  {{ st.student_name }}
                </td>

                <td class="text-center" :data-label="'المرحلة'">
                  {{ st.grade_name || '-' }}
                </td>

                <td class="text-center" :data-label="'السنة'">
                  {{ st.study_year || '-' }}
                </td>

                <td class="text-center" :data-label="'الحالة'" style="min-inline-size: 180px;">
                  <VSelect v-model="attendanceMap[st.student_id]" :items="statusItems" item-title="text"
                    item-value="value" variant="outlined" density="comfortable" />
                </td>
              </tr>
            </tbody>
          </VTable>

        </div>
      </VCardText>
    </VCard>

    <!-- Alerts -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'TeacherSessionAttendance',
  data() {
    const today = new Date().toISOString().substring(0, 10);
    return {
      sessionId: this.$route.params.id,
      sessionInfo: null,
      filters: { date: today },
      loading: false,
      saving: false,
      students: [], // [{ student_id, student_name, grade_name, study_year }]
      attendanceMap: {}, // { [student_id]: 'present' | 'absent' | 'leave' | null }
      statusItems: [
        { text: 'حاضر', value: 'present' },
        { text: 'غائب', value: 'absent' },
        { text: 'إجازة', value: 'leave' },
      ],
      breadcrumbs: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'الجلسات', disabled: false, to: '/teacher/sessions/manage-sessions' },
        { title: 'حضور الجلسة', disabled: true },
      ],
      alert: { open: false, message: null, type: 'success' },
    };
  },
  created() {
    this.initLoad();
  },
  methods: {
    async initLoad() {
      await this.loadStudentsBase();
      await this.loadAttendance();
    },
    async loadStudentsBase() {
      try {
        this.loading = true;
        // Try to get attendees with details first
        const res = await TeacherApi.getSessionAttendees(this.sessionId);
        const arr = res?.data?.data || [];
        // normalize to full objects
        this.students = arr.map(x => typeof x === 'object' ? x : ({ student_id: x, student_name: String(x), grade_name: '', study_year: '' }));
        // init default map if empty
        this.students.forEach(s => {
          if (!this.attendanceMap.hasOwnProperty(s.student_id)) {
            this.$set ? this.$set(this.attendanceMap, s.student_id, null) : (this.attendanceMap[s.student_id] = null);
          }
        });
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب طلاب الجلسة');
      } finally {
        this.loading = false;
      }
    },
    async loadAttendance() {
      try {
        this.loading = true;
        const res = await TeacherApi.getSessionAttendanceByDate(this.sessionId, this.filters.date);
        const data = res?.data?.data || [];
        // data expected: [{ student_id|studentId, status }]
        const map = {};
        data.forEach(item => {
          const sid = item.student_id || item.studentId;
          if (sid) map[String(sid)] = item.status || null;
        });
        // merge into attendanceMap, ensure all students keys exist
        const merged = {};
        this.students.forEach(s => {
          merged[s.student_id] = map.hasOwnProperty(String(s.student_id)) ? map[String(s.student_id)] : (this.attendanceMap[s.student_id] ?? null);
        });
        this.attendanceMap = merged;
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر جلب حضور الجلسة');
      } finally {
        this.loading = false;
      }
    },
    async saveAttendance() {
      try {
        this.saving = true;
        const items = Object.keys(this.attendanceMap).map(sid => ({ studentId: sid, status: this.attendanceMap[sid] || null }));
        const payload = { date: this.filters.date, items };
        const res = await TeacherApi.bulkSetSessionAttendance(this.sessionId, payload);
        this.showAlert('success', res?.data?.message || 'تم حفظ الحضور');
        await this.loadAttendance();
      } catch (e) {
        this.showAlert('error', e?.response?.data?.message || 'تعذر حفظ الحضور');
      } finally {
        this.saving = false;
      }
    },
    showAlert(type, message) {
      Object.assign(this.alert, { open: true, type, message });
    },
  },
};
</script>


<style scoped>
/* ⚡ جعل جدول الطلاب Responsive في الموبايل */
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

  /* إخفاء رؤوس الأعمدة */
  .v-table thead {
    display: none;
  }

  /* كل صف يصبح بطاقة */
  .v-table tr {
    padding: 10px;
    border-radius: 10px;
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 8%);
    margin-block-end: 14px;
  }

  /* تنسيق الخلايا داخل البطاقة */
  .v-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: none !important;
    border-block-end: 1px solid rgba(0, 0, 0, 5%) !important;
    padding-block: 10px;
    padding-inline: 6px;
  }

  /* إظهار عنوان العمود */
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

  /* تصغير حجم النص قليلاً */
  .v-table td {
    font-size: 13px;
  }

  /* ضبط حجم مكونات Vuetify داخل الخلية */
  .v-table .v-chip {
    block-size: 26px;
    font-size: 12px;
  }

  .v-table .v-select {
    inline-size: 100%;
  }

  .v-table .v-field {
    block-size: 36px !important;
  }
}
</style>
