<template>
  <div>
    <!-- Loading Overlay -->
    <AppLoadingOverlay :loading="loading" :progress="progress" :results="results" />

    <!-- Breadcrumbs -->
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Operations Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-calendar-schedule-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">الجلسات الأسبوعية</h3>
        <VSpacer />
        <VBtn color="primary" prepend-icon="ri-add-line" rounded="pill" @click="openCreateDialog">إضافة جلسة</VBtn>
      </VCardTitle>
    </VCard>

    <!-- Filter Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3">
          <VCol cols="12" md="4">
            <VSelect v-model="table.tableSettings.options.weekday" :items="weekdays" item-title="text"
              item-value="value" label="يوم الأسبوع" variant="outlined" @update:model-value="getDataAxios" clearable />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="table.tableSettings.options.course_id" :items="courseItems" item-title="text"
              item-value="value" label="الكورس" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading"
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
            <h3 class="text-h6 font-weight-bold text-center">قائمة الجلسات</h3>
          </VCol>
          <VCol cols="auto">
            <VChip color="primary" variant="elevated" class="font-weight-medium">
              {{ numberWithComma(table.totalItems) }} عدد السجلات
            </VChip>
          </VCol>
        </VRow>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <SmartTable :headers="table.headers" :items="table.Data" :actions="table.actions" :loading="table.loading"
          :totalItems="table.totalItems" :tableOptions="table.tableSettings.options"
          @updateTableOptions="updateTableOptions" @editItem="editItem" @deleteItem="deleteItem"
          @showItem="navigateToAttendance" @showAttendeesItem="openViewStudentsDialog"
          @addAttendeesItem="openAddAttendeesDialog" @endSessionItem="openEndSessionDialog" />
      </VCardItem>
    </VCard>

    <!-- Create/Edit Session Dialog -->
    <v-dialog v-model="sessionDialog.open" max-width="700">
      <v-card :title="sessionDialog.mode === 'create' ? 'إضافة جلسة' : 'تعديل الجلسة'">
        <v-card-text>
          <VRow>
            <VCol cols="12">
              <VTextField v-model="sessionDialog.form.title" label="عنوان الجلسة" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="sessionDialog.form.course_id" :items="courseItems" item-title="text" item-value="value"
                label="اختر الكورس" variant="outlined" :loading="coursesLoading" :disabled="coursesLoading" clearable />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect v-model="sessionDialog.form.weekdays" :items="weekdays.filter((w) => w.value !== null)"
                item-title="text" item-value="value" label="أيام الأسبوع" multiple chips variant="outlined" />
            </VCol>
            <VCol cols="12" md="3">
              <AppDateTimePicker
                v-model="sessionDialog.form.start_time"
                label="بداية"
                variant="outlined"
                clearable
                :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, minuteIncrement: 5 }"
              />
            </VCol>
            <VCol cols="12" md="3">
              <AppDateTimePicker
                v-model="sessionDialog.form.end_time"
                label="نهاية"
                variant="outlined"
                clearable
                :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, minuteIncrement: 5 }"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSwitch v-model="sessionDialog.form.recurrence" inset color="primary" :true-value="true"
                :false-value="false" label="تكرار أسبوعي" />
            </VCol>
          </VRow>
          <VDivider class="my-4" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="sessionDialog.open = false">إلغاء</v-btn>
          <v-btn color="primary" @click="saveSession">
            {{ sessionDialog.mode === "create" ? "إضافة" : "تحديث" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Attendees Dialog (Select confirmed students) -->
    <v-dialog v-model="attendeesDialog.open" max-width="720">
      <v-card>
        <v-card-title class="d-flex align-center">
          <VIcon icon="ri-user-add-line" class="me-2" />
          إضافة طلاب للجلسة
          <VSpacer />
          <VBtn icon variant="text" @click="attendeesDialog.open = false">
            <VIcon icon="ri-close-line" />
          </VBtn>
        </v-card-title>
        <v-card-text>
          <div class="mb-4 text-medium-emphasis">
            اختر الطلاب المؤكدين في هذا الكورس لإضافتهم إلى الجلسة. الطلاب
            الموجودون مسبقًا محددون تلقائيًا.
          </div>
          <VRow>
            <VCol cols="12">
              <VSelect v-model="attendeesDialog.selectedIds" :items="attendeesDialog.candidates" item-title="name"
                item-value="id" label="اختر الطلاب" variant="outlined" :loading="attendeesDialog.loading"
                :disabled="attendeesDialog.loading" multiple chips clearable />
            </VCol>
          </VRow>
          <VDivider class="my-4" />
          <div class="text-subtitle-2 mb-2">الطلاب الحاليون في الجلسة</div>
          <div v-if="attendeesDialog.loading" class="text-medium-emphasis">
            جاري التحميل...
          </div>
          <div v-else>
            <div v-if="attendeesDialog.currentDetailed.length" class="d-flex flex-wrap gap-2">
              <VChip v-for="st in attendeesDialog.currentDetailed" :key="st.student_id || st" size="small" class="ma-1"
                variant="outlined" closable @click:close="removeOneAttendee(st.student_id || st)">
                {{ st.student_name || st }}
              </VChip>
            </div>
            <div v-else class="text-medium-emphasis">
              لا توجد قائمة حضور بعد
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="attendeesDialog.open = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="attendeesDialog.loading" @click="submitAddAttendees">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Students Dialog -->
    <v-dialog v-model="studentsViewDialog.open" max-width="720">
      <v-card>
        <v-card-title class="d-flex align-center">
          <VIcon icon="ri-team-line" class="me-2" />
          طلاب الجلسة
          <VSpacer />
          <VBtn icon variant="text" @click="studentsViewDialog.open = false">
            <VIcon icon="ri-close-line" />
          </VBtn>
        </v-card-title>
        <v-card-text>
          <div v-if="studentsViewDialog.loading" class="text-medium-emphasis">
            جاري التحميل...
          </div>
          <div v-else>
            <VAlert v-if="!studentsViewDialog.students.length" type="info" variant="tonal">
              لا يوجد طلاب مسجلون في هذه الجلسة بعد.
            </VAlert>
            <VRow v-else>
              <VCol cols="12" md="6" v-for="st in studentsViewDialog.students" :key="st.student_id">
                <VCard variant="tonal" class="pa-3 d-flex align-center justify-space-between">
                  <div>
                    <div class="text-subtitle-1">{{ st.student_name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ st.grade_name }} • {{ st.study_year }}
                    </div>
                  </div>
                </VCard>
              </VCol>
            </VRow>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="tonal" @click="studentsViewDialog.open = false">إغلاق</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm End Session Dialog -->
    <ConfirmDangerDialog v-if="endDialog.open" v-model="endDialog.open" :messages="endDialog.messages"
      :title="endDialog.title" :confirmButtonText="endDialog.confirmButtonText" @confirm="handleEndSession" />

    <!-- Delete Confirm Dialog -->
    <ConfirmDangerDialog v-if="deleteDialog.open" v-model="deleteDialog.open" :messages="deleteDialog.messages"
      :title="deleteDialog.title" :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete" />

    <!-- Alerts -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from "@/api/teacher/teacher_api";
import numberWithComma from "@/constant/number";

export default {
  data() {
    return {
      keyName: "manage-sessions",
      results: JSON.parse(localStorage.getItem("user")),
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/teacher/index" },
        { title: "الجلسات", disabled: true },
      ],
      loading: false,
      progress: 0,

      weekdays: [
        { text: "الكل", value: null },
        { text: "الأحد", value: 0 },
        { text: "الاثنين", value: 1 },
        { text: "الثلاثاء", value: 2 },
        { text: "الأربعاء", value: 3 },
        { text: "الخميس", value: 4 },
        { text: "الجمعة", value: 5 },
        { text: "السبت", value: 6 },
      ],

      table: {
        totalItems: 0,
        Data: [],
        actions: ["عرض الطلاب", "إضافة طلاب", "إنهاء الجلسة", "تعديل", "حذف"],
        loading: false,
        headers: [
          { title: "#", type: "strong", sortable: false, key: "num" },
          { title: "العنوان", type: "link", sortable: true, key: "title" },
          {
            title: "الدورة",
            type: "strong",
            sortable: true,
            key: "course_name",
          },
          {
            title: "المرحلة",
            type: "strong",
            sortable: true,
            key: "grade_name",
          },
          {
            title: "عدد الطلاب",
            type: "strong",
            sortable: true,
            key: "attendees_count",
          },
          {
            title: "اليوم",
            type: "strong",
            sortable: true,
            key: "weekdayLabel",
          },
          { title: "من", type: "strong", sortable: true, key: "start_time" },
          { title: "إلى", type: "strong", sortable: true, key: "end_time" },
          {
            title: "العمليات",
            type: "strong",
            sortable: false,
            key: "actions",
          },
        ],
        tableSettings: {
          options: {
            page: 1,
            limit: 10,
            search: null,
            weekday: null,
          },
        },
      },

      // dialogs
      sessionDialog: {
        open: false,
        mode: "create", // create | edit
        form: {
          id: null,
          title: "",
          course_id: "",
          teacher_id: JSON.parse(localStorage.getItem("user"))?.id,
          weekdays: [],
          start_time: "",
          end_time: "",
          recurrence: true,
          flex_type: null,
          flex_minutes: null,
        },
      },
      attendeesDialog: {
        open: false,
        data: null,
        loading: false,
        candidates: [], // full objects from confirmed students API
        selectedIds: [], // selection in the VSelect
        currentIds: [], // ids currently in session
        currentDetailed: [], // for chips display
      },
      studentsViewDialog: {
        open: false,
        data: null,
        loading: false,
        loadingItem: null,
        students: [], // full objects
      },
      endDialog: {
        open: false,
        data: null,
        messages: ["سيتم إنهاء المحاضرة وإشعار الطلاب الحاضرين اليوم."],
        title: "تأكيد إنهاء الجلسة",
        confirmButtonText: "إنهاء الجلسة",
        saving: false,
        menus: { start: false, end: false },
      },
      deleteDialog: {
        open: false,
        loading: false,
        data: null,
        messages: ["سيتم حذف الجلسة.", "لا يمكن استرجاعها بعد الحذف."],
        title: "تأكيد الحذف",
        confirmButtonText: "حذف الجلسة",
      },

      alert: { open: false, message: null, type: "success" },
      // courses select
      courseItems: [],
      coursesLoading: false,
      flexTypes: [
        { text: "نافذة (window)", value: "window" },
        { text: "ثابت (fixed)", value: "fixed" },
        { text: "بدون", value: null },
      ],
    };
  },
  created() {
    const stored = JSON.parse(localStorage.getItem(this.keyName));
    this.table.tableSettings = stored || this.table.tableSettings;
    this.tempScrollTop = stored?.scrollTop || 0;
    this.loadCourseNames();
  },
  mounted() {
    window.addEventListener("scroll", this.handleScroll);
    this.$watch(
      () => this.table.Data,
      (val) => {
        if (val?.length > 0 && this.tempScrollTop) {
          setTimeout(() => {
            window.scrollTo({ top: this.tempScrollTop, behavior: "smooth" });
            this.tempScrollTop = 0;
          }, 300);
        }
      },
      { deep: true }
    );
  },
  beforeUnmount() {
    this.unwatch?.();
    window.removeEventListener("scroll", this.handleScroll);
  },
  methods: {
    numberWithComma,
    weekdayName(n) {
      const names = [
        "الأحد",
        "الاثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
      return Number.isInteger(n) && n >= 0 && n <= 6
        ? names[n]
        : String(n ?? "");
    },
    formatWeekdays(value) {
      if (Array.isArray(value)) return value.map(this.weekdayName).join("، ");
      return this.weekdayName(value);
    },

    // scroll persistence
    handleScroll() {
      const scrollTop = window.scrollY || window.pageYOffset;
      const stored = JSON.parse(localStorage.getItem(this.keyName)) || {};
      stored.scrollTop = scrollTop;
      localStorage.setItem(this.keyName, JSON.stringify(stored));
    },

    // table ops
    reload() {
      localStorage.removeItem(this.keyName);
      this.table.tableSettings.options = {
        page: 1,
        limit: 10,
        search: null,
        weekday: null,
      };
      this.getDataAxios();
    },
    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
        search: !newOptions.search ? null : newOptions.search,
      };
      this.getDataAxios();
    },

    // data
    async getDataAxios() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);
      try {
        localStorage.setItem(
          this.keyName,
          JSON.stringify(this.table.tableSettings)
        );
        const response = await TeacherApi.getSessions(this.table.tableSettings);
        const res = response?.data || {};
        const list = res.data || res.sessions || [];
        // map weekday number(s) to label for display
        this.table.Data = list.map((item) => ({
          ...item,
          weekdayLabel: item.hasOwnProperty("weekdays")
            ? this.formatWeekdays(item.weekdays)
            : this.formatWeekdays(item.weekday),
        }));
        this.table.totalItems =
          res.count || res.total || res.pagination?.total || 0;
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء جلب البيانات"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
        }, 500);
      }
    },

    async loadCourseNames() {
      try {
        this.coursesLoading = true;
        const response = await TeacherApi.getCourseNames();
        const list = response?.data?.data || [];
        this.courseItems = list.map((x) => ({ text: x.name, value: x.id }));
      } catch (e) {
        this.showAlert("error", "تعذر جلب أسماء الدورات");
      } finally {
        this.coursesLoading = false;
      }
    },

    // dialog openers
    openCreateDialog() {
      this.sessionDialog.mode = "create";
      this.sessionDialog.form = {
        id: null,
        title: "",
        course_id: "",
        teacher_id: JSON.parse(localStorage.getItem("user"))?.id,
        weekdays: [],
        start_time: "",
        end_time: "",
        recurrence: true,
        flex_type: null,
        flex_minutes: null,
      };
      this.sessionDialog.open = true;
    },
    editItem(item) {
      this.sessionDialog.mode = "edit";
      this.sessionDialog.form = {
        id: item.id,
        title: item.title || "",
        course_id: item.course_id || item.course?.id || "",
        teacher_id: JSON.parse(localStorage.getItem("user"))?.id,
        weekdays: Array.isArray(item.weekdays)
          ? item.weekdays
          : item.weekday !== undefined
            ? [item.weekday]
            : [],
        start_time: item.start_time,
        end_time: item.end_time,
        recurrence: item.recurrence ?? true,
        flex_type: item.flex_type ?? null,
        flex_minutes: item.flex_minutes ?? null,
      };
      this.sessionDialog.open = true;
    },

    // save (create/update)
    async saveSession() {
      const isCreate = this.sessionDialog.mode === "create";
      const f = this.sessionDialog.form;
      // validations
      if (
        !f.course_id ||
        (isCreate ? f.weekdays.length === 0 : f.weekdays.length === 0) ||
        !f.start_time ||
        !f.end_time
      ) {
        this.showAlert("error", "الحقول الأساسية مطلوبة");
        return;
      }

      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        let response;
        if (isCreate) {
          const payload = {
            course_id: f.course_id,
            teacher_id: f.teacher_id,
            weekdays: f.weekdays,
            start_time: f.start_time,
            end_time: f.end_time,
            title: f.title || undefined,
            recurrence: f.recurrence === true,
            flex_type: f.flex_type ?? null,
            flex_minutes: f.flex_minutes ?? null,
            flex_alternates: null,
            hard_constraints: null,
            soft_constraints: null,
            state: "confirmed",
          };
          response = await TeacherApi.createSession(payload);
        } else {
          // update API expects single weekday field
          const payload = {
            course_id: f.course_id,
            teacher_id: f.teacher_id,
            weekday: f.weekdays?.[0],
            start_time: f.start_time,
            end_time: f.end_time,
            title: f.title || undefined,
            recurrence: f.recurrence === true,
            flex_type: f.flex_type ?? null,
            flex_minutes: f.flex_minutes ?? null,
            state: "confirmed",
          };
          response = await TeacherApi.updateSession(f.id, payload);
        }
        this.showAlert(
          "success",
          response?.data?.message ||
          (isCreate ? "تم إنشاء الجلسة" : "تم تحديث الجلسة")
        );
        this.sessionDialog.open = false;
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء الحفظ"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
        }, 500);
      }
    },

    // attendees
    openAddAttendeesDialog(item) {
      this.attendeesDialog.data = item;
      this.attendeesDialog.open = true;
      this.attendeesDialog.candidates = [];
      this.attendeesDialog.selectedIds = [];
      this.attendeesDialog.currentIds = [];
      this.attendeesDialog.currentDetailed = [];
      this.loadAddDialogData();
    },
    async loadAddDialogData() {
      try {
        this.attendeesDialog.loading = true;
        // 1) current attendees (could be ids or objects)
        const currentRes = await TeacherApi.getSessionAttendees(
          this.attendeesDialog.data.id
        );
        const currentData = currentRes?.data?.data || [];
        // normalize
        const currentIds = currentData
          .map((x) => (typeof x === "object" ? x.student_id || x.id : x))
          .filter(Boolean);
        const currentDetailed = currentData.map((x) =>
          typeof x === "object" ? x : { student_id: x, student_name: String(x) }
        );
        this.attendeesDialog.currentIds = currentIds;
        this.attendeesDialog.currentDetailed = currentDetailed;

        // 2) confirmed students for this course
        const courseId =
          this.attendeesDialog.data.course_id ||
          this.attendeesDialog.data.course?.id;
        if (!courseId) throw new Error("لا يوجد معرّف كورس في هذه الجلسة");
        const confRes = await TeacherApi.getCourseConfirmedStudents(courseId);
        const candidates = confRes?.data?.data || [];
        this.attendeesDialog.candidates = candidates;

        // preselect existing
        this.attendeesDialog.selectedIds = candidates
          .map((c) => c.student_id)
          .filter((id) => this.attendeesDialog.currentIds.includes(id));
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || e?.message || "تعذر تحميل الطلاب"
        );
      } finally {
        this.attendeesDialog.loading = false;
      }
    },
    async submitAddAttendees() {
      const selected = this.attendeesDialog.selectedIds || [];
      const current = this.attendeesDialog.currentIds || [];
      const toAdd = selected.filter((id) => !current.includes(id));
      if (toAdd.length === 0) {
        this.showAlert("info", "لا توجد إضافات جديدة");
        this.attendeesDialog.open = false;
        return;
      }

      this.progress = 0;
      this.loading = true;
      this.attendeesDialog.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);
      try {
        const response = await TeacherApi.addSessionAttendees(
          this.attendeesDialog.data.id,
          toAdd
        );
        this.showAlert(
          "success",
          response?.data?.message || "تم حفظ التغييرات"
        );
        await this.loadAddDialogData();
        this.attendeesDialog.open = false;
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "تعذر إضافة الطلاب"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.attendeesDialog.loading = false;
        }, 500);
      }
    },

    openViewStudentsDialog(item) {
      this.studentsViewDialog.data = item;
      this.studentsViewDialog.open = true;
      this.studentsViewDialog.students = [];
      this.loadStudentsView();
    },
    openEndSessionDialog(item) {
      this.endDialog.data = item;
      this.endDialog.open = true;
    },
    navigateToAttendance(item) {
      if (!item?.id) return;
      this.$router.push(`/teacher/sessions/attendance/${item.id}`);
    },
    async loadStudentsView() {
      try {
        this.studentsViewDialog.loading = true;
        const res = await TeacherApi.getSessionAttendees(this.studentsViewDialog.data.id);
        const data = res?.data?.data || [];
        // normalize to objects
        const list = data.map((x) =>
          typeof x === "object"
            ? x
            : {
              student_id: x,
              student_name: String(x),
              grade_name: "",
              study_year: "",
            }
        );
        this.studentsViewDialog.students = list;
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر جلب طلاب الجلسة"
        );
      } finally {
        this.studentsViewDialog.loading = false;
      }
    },
    async handleEndSession() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);
      try {
        const response = await TeacherApi.endSession(this.endDialog.data.id);
        this.showAlert(
          "success",
          response?.data?.message || "تم إنهاء الجلسة وإشعار الطلاب"
        );
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "تعذر إنهاء الجلسة"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.endDialog.open = false;
        }, 500);
      }
    },

    // delete
    deleteItem(item) {
      this.deleteDialog.data = item;
      this.deleteDialog.open = true;
    },
    async handleDelete() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);
      try {
        const response = await TeacherApi.deleteSession(
          this.deleteDialog.data.id
        );
        this.showAlert("success", response?.data?.message || "تم حذف الجلسة");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "تعذر حذف الجلسة"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.deleteDialog.open = false;
        }, 500);
      }
    },

    // alerts
    allowEvery5(m) { return m % 5 === 0 },
    showAlert(type, message) {
      this.alert = { open: true, type, message }
    },
  },
};
</script>
