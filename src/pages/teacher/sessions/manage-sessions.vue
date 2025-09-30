<template>
  <div>
    <!-- Loading Overlay -->
    <AppLoadingOverlay
      :loading="loading"
      :progress="progress"
      :results="results"
    />

    <!-- Breadcrumbs -->
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Operations Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="ri-calendar-schedule-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">الجلسات الأسبوعية</h3>
        <VSpacer />
        <VBtn
          color="primary"
          prepend-icon="ri-add-line"
          rounded="pill"
          @click="openCreateDialog"
          >إضافة جلسة</VBtn
        >
      </VCardTitle>
    </VCard>

    <!-- Filter Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="mdi mdi-filter-outline"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="py-3">
          <VCol cols="12" md="4">
            <VSelect
              v-model="table.tableSettings.options.weekday"
              :items="weekdays"
              item-title="text"
              item-value="value"
              label="يوم الأسبوع"
              variant="outlined"
              @update:model-value="getDataAxios"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="table.tableSettings.options.course_id"
              :items="courseItems"
              item-title="text"
              item-value="value"
              label="الكورس"
              variant="outlined"
              :loading="coursesLoading"
              :disabled="coursesLoading"
              @update:model-value="getDataAxios"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model="table.tableSettings.options.search"
              label="بحث بالعنوان"
              variant="outlined"
              @keyup.enter="getDataAxios"
              clearable
              @click:clear="getDataAxios"
            />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Table Card -->
    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn
              color="primary"
              @click="reload()"
              icon="ri-refresh-line"
              variant="tonal"
              rounded="circle"
              size="small"
            />
          </VCol>
          <VCol>
            <h3 class="text-h6 font-weight-bold text-center">قائمة الجلسات</h3>
          </VCol>
          <VCol cols="auto">
            <VChip
              color="primary"
              variant="elevated"
              class="font-weight-medium"
            >
              {{ numberWithComma(table.totalItems) }} عدد السجلات
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
          @editItem="editItem"
          @deleteItem="deleteItem"
          @showAttendeesItem="openAddAttendeesDialog"
          @addAttendeesItem="openAddAttendeesDialog"
          @removeAttendeesItem="openAddAttendeesDialog"
          @endSessionItem="confirmEndSession"
        />
      </VCardItem>
    </VCard>

    <!-- Create/Edit Session Dialog -->
    <v-dialog v-model="sessionDialog.open" max-width="700">
      <v-card
        :title="sessionDialog.mode === 'create' ? 'إضافة جلسة' : 'تعديل الجلسة'"
      >
        <v-card-text>
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="sessionDialog.form.title"
                label="عنوان الجلسة"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="sessionDialog.form.course_id"
                :items="courseItems"
                item-title="text"
                item-value="value"
                label="اختر الكورس"
                variant="outlined"
                :loading="coursesLoading"
                :disabled="coursesLoading"
                clearable
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="sessionDialog.form.weekdays"
                :items="weekdays.filter((w) => w.value !== null)"
                item-title="text"
                item-value="value"
                label="أيام الأسبوع"
                multiple
                chips
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="sessionDialog.form.start_time"
                type="time"
                label="بداية"
                variant="outlined"
                :step="60"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="sessionDialog.form.end_time"
                type="time"
                label="نهاية"
                variant="outlined"
                :step="60"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSwitch
                v-model="sessionDialog.form.recurrence"
                inset
                color="primary"
                :true-value="true"
                :false-value="false"
                label="تكرار أسبوعي"
              />
            </VCol>
          </VRow>
          <VDivider class="my-4" />
          <!-- <VExpansionPanels variant="accordion">
            <VExpansionPanel>
              <VExpansionPanelTitle>خيارات متقدمة</VExpansionPanelTitle>
              <VExpansionPanelText>
                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="sessionDialog.form.flex_minutes" label="دقائق المرونة (اختياري)" type="number" variant="outlined" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VSelect
                      v-model="sessionDialog.form.flex_type"
                      :items="flexTypes"
                      item-title="text"
                      item-value="value"
                      label="نوع المرونة"
                      variant="outlined"
                      clearable
                    />
                  </VCol>
                </VRow>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels> -->
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="sessionDialog.open = false"
            >إلغاء</v-btn
          >
          <v-btn color="primary" @click="saveSession">
            {{ sessionDialog.mode === "create" ? "إضافة" : "تحديث" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Attendees Dialog -->
    <v-dialog v-model="attendeesDialog.open" max-width="600">
      <v-card title="إضافة طلاب للجلسة">
        <v-card-text>
          <div class="text-caption mb-2">
            أدخل معرفات الطلاب مفصولة بفواصل (,)
          </div>
          <v-textarea
            v-model="attendeesDialog.studentIdsText"
            rows="4"
            variant="outlined"
            placeholder="1001,1002,1003"
          ></v-textarea>
          <VDivider class="my-4" />
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-subtitle-2">قائمة الحضور الحالية</div>
            <VBtn
              :loading="attendeesDialog.loading"
              @click="loadAttendees()"
              size="small"
              variant="tonal"
              prepend-icon="ri-refresh-line"
              >تحديث</VBtn
            >
          </div>
          <div v-if="attendeesDialog.loading" class="text-medium-emphasis">
            جاري التحميل...
          </div>
          <div v-else>
            <div
              v-if="attendeesDialog.current && attendeesDialog.current.length"
              class="d-flex flex-wrap gap-2"
            >
              <VChip
                v-for="sid in attendeesDialog.current"
                :key="sid"
                size="small"
                class="ma-1"
                variant="outlined"
                closable
                @click:close="removeOneAttendee(sid)"
              >
                {{ sid }}
              </VChip>
            </div>
            <div v-else class="text-medium-emphasis">
              لا توجد قائمة حضور بعد
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="attendeesDialog.open = false"
            >إلغاء</v-btn
          >
          <v-btn
            color="primary"
            :loading="attendeesDialog.loading"
            @click="submitAddAttendees"
            >إضافة</v-btn
          >
          <v-btn
            color="error"
            :loading="attendeesDialog.loading"
            @click="submitRemoveAttendees"
            >حذف</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm End Session Dialog -->
    <ConfirmDangerDialog
      v-if="endDialog.open"
      v-model="endDialog.open"
      :messages="endDialog.messages"
      :title="endDialog.title"
      :confirmButtonText="endDialog.confirmButtonText"
      @confirm="handleEndSession"
    />

    <!-- Delete Confirm Dialog -->
    <ConfirmDangerDialog
      v-if="deleteDialog.open"
      v-model="deleteDialog.open"
      :messages="deleteDialog.messages"
      :title="deleteDialog.title"
      :confirmButtonText="deleteDialog.confirmButtonText"
      @confirm="handleDelete"
    />

    <!-- Alerts -->
    <BaseAlert
      v-if="alert.open"
      v-model="alert.open"
      :type="alert.type"
      :message="alert.message"
      :closable="true"
      close-text="موافق"
      @close="alert.open = false"
    />
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
        actions: [
          "عرض الحضور",
          "إضافة طلاب",
          "حذف طلاب",
          "إنهاء الجلسة",
          "تعديل",
          "حذف",
        ],
        loading: false,
        headers: [
          { title: "#", type: "strong", sortable: false, key: "num" },
          { title: "العنوان", type: "strong", sortable: true, key: "title" },
          {
            title: "المقرر",
            type: "strong",
            sortable: true,
            key: "course.courseName",
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
        studentIdsText: "",
        current: [],
        loading: false,
      },
      endDialog: {
        open: false,
        data: null,
        messages: ["سيتم إنهاء المحاضرة وإشعار الطلاب الحاضرين اليوم."],
        title: "تأكيد إنهاء الجلسة",
        confirmButtonText: "إنهاء الجلسة",
      },
      deleteDialog: {
        open: false,
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
    this.getDataAxios();
    this.loadCourseNames();
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
      this.attendeesDialog.studentIdsText = "";
      this.attendeesDialog.open = true;
      this.attendeesDialog.current = [];
      this.loadAttendees();
    },
    async submitAddAttendees() {
      const raw = this.attendeesDialog.studentIdsText || "";
      const ids = raw
        .split(/[,\n\s]+/)
        .map((x) => x.trim())
        .filter((x) => x)
        .map((x) => (isNaN(Number(x)) ? x : Number(x)));
      if (ids.length === 0) {
        this.showAlert("error", "يرجى إدخال معرفات الطلاب");
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
          ids
        );
        this.showAlert(
          "success",
          response?.data?.message || "تمت الإضافة بنجاح"
        );
        await this.loadAttendees();
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

    async loadAttendees() {
      try {
        this.attendeesDialog.loading = true;
        const res = await TeacherApi.getSessionAttendees(
          this.attendeesDialog.data.id
        );
        this.attendeesDialog.current = res?.data?.data || [];
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر جلب قائمة الحضور"
        );
      } finally {
        this.attendeesDialog.loading = false;
      }
    },
    async removeOneAttendee(studentId) {
      try {
        this.attendeesDialog.loading = true;
        const res = await TeacherApi.removeSessionAttendees(
          this.attendeesDialog.data.id,
          [studentId]
        );
        this.attendeesDialog.current = this.attendeesDialog.current.filter(
          (id) => String(id) !== String(studentId)
        );
        this.showAlert(
          "success",
          res?.data?.message || "تم حذف الطالب من الجلسة"
        );
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر حذف الطالب"
        );
      } finally {
        this.attendeesDialog.loading = false;
      }
    },
    async submitRemoveAttendees() {
      const raw = this.attendeesDialog.studentIdsText || "";
      const ids = raw
        .split(/[\,\n\s]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        this.showAlert("error", "أدخل معرفات الطلاب المراد حذفهم");
        return;
      }
      try {
        this.attendeesDialog.loading = true;
        const res = await TeacherApi.removeSessionAttendees(
          this.attendeesDialog.data.id,
          ids
        );
        // refresh current list
        await this.loadAttendees();
        this.showAlert(
          "success",
          res?.data?.message || "تم حذف الطلاب المحددين"
        );
      } catch (e) {
        this.showAlert(
          "error",
          e?.response?.data?.message || "تعذر حذف الطلاب"
        );
      } finally {
        this.attendeesDialog.loading = false;
      }
    },

    // end session
    confirmEndSession(item) {
      this.endDialog.data = item;
      this.endDialog.open = true;
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
    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true });
    },
  },
};
</script>
