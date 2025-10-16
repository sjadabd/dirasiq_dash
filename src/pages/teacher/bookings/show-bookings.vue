<template>
  <div>
    <!-- Settings page -->
    <AppBreadcrumbs :items="breadcrumbItems" />
    <!-- Settings page -->

    <!-- Operations Card -->
    <!-- <VCard class="my-4 operations-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-cog-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">العمليات</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow class="align-center justify-start pa-2">
          <v-btn
            color="primary"
            class="ma-2"
            prepend-icon="ri-add-line"
            rounded="pill"
            elevation="2"
            size="default"
            @click="Actions.open = true"
          >
            إضافة كورس جديد
          </v-btn>
        </VRow>
      </VCardItem>
    </VCard> -->
    <!-- Operations Card -->

    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi mdi-filter-outline" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تصفية</h3>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow style="padding-block: 10px;">
          <VCol cols="12" md="4">
            <VSelect v-model="table.tableSettings.options.status" :items="courseIsStatus" item-title="text"
              item-value="value" label="حالة الحجز" variant="outlined" @update:model-value="getDataAxios" />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Filter Card -->

    <!-- SmartTable -->
    <VCard class="my-4 data-table-card" elevation="3" rounded="lg">
      <VCardTitle class="py-4 px-6">
        <VRow class="align-center">
          <VCol cols="auto">
            <VBtn color="primary" @click="reload()" icon="ri-refresh-line" variant="tonal" rounded="circle" size="small"
              class="rotate-on-hover" />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">الحجوزات</h3>
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
          @updateTableOptions="updateTableOptions" @preApproveItem="preApproveItem" @consentItem="consentItem"
          @rejectItem="rejectItem" @updateResponseItem="updateResponseItem" @enableItem="enableItem"
          @deleteItem="deleteItem" class="reservation-table" />
      </VCardItem>
    </VCard>
    <!-- SmartTable -->

    <!-- preApproveDialog -->
    <v-dialog v-model="preApproveDialog.open" max-width="500">
      <v-card title="الموافقة الاولية على حجز الطالب">
        <v-card-text>
          <v-textarea v-model="preApproveDialog.teacherResponse" label="ملاحظة"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="preApproveDialog.open = false">الغاء</v-btn>
          <v-btn @click="handlePreApprove">موافقة اولية</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- rejectDialog -->
    <v-dialog v-model="rejectDialog.open" max-width="500">
      <v-card title="رفض حجز الطالب">
        <v-card-text>
          <v-textarea v-model="rejectDialog.rejectionReason" label="سبب الرفض (مطلوب)"></v-textarea>
          <v-textarea class="mt-2" v-model="rejectDialog.teacherResponse" label="ملاحظة (اختياري)"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="rejectDialog.open = false">الغاء</v-btn>
          <v-btn color="error" @click="handleReject">رفض</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- rejectDialog -->

    <!-- updateResponseDialog -->
    <v-dialog v-model="updateResponseDialog.open" max-width="500">
      <v-card title="تحديث رد المعلم">
        <v-card-text>
          <v-textarea v-model="updateResponseDialog.teacherResponse" label="رد المعلم"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="updateResponseDialog.open = false">الغاء</v-btn>
          <v-btn color="primary" @click="handleUpdateResponse">تحديث</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- updateResponseDialog -->
    <!-- preApproveDialog -->

    <v-dialog v-model="consentDialog.open" max-width="500">
      <v-card title="الموافقة على حجز الطالب">
        <v-card-text>
          <v-textarea v-model="consentDialog.teacherResponse" label="ملاحظة"></v-textarea>
          <div v-if="hasReservationSelected" class="mt-4">
            <VSwitch v-model="consentDialog.reservationPaid" inset color="primary" :true-value="true"
              :false-value="false" label="تم دفع العربون؟" />
            <div class="text-caption text-medium-emphasis">
              إذا لم يتم دفع العربون بعد، اختر إلغاء التفعيل لإرسال رسالة طلب
              الدفع.
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="consentDialog.open = false">الغاء</v-btn>
          <v-btn @click="handleConsent">موافقة</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ConfirmDangerDialog -->
    <ConfirmDangerDialog v-if="enableDialog.open" v-model="enableDialog.open" :messages="enableDialog.messages"
      :title="enableDialog.title" :confirmButtonText="enableDialog.confirmButtonText"
      :checkboxLabel="enableDialog.checkboxLabel" @confirm="handleRestore" />

    <!-- Delete Confirm Dialog -->
    <ConfirmDangerDialog v-if="deleteDialog.open" v-model="deleteDialog.open" :messages="deleteDialog.messages"
      :title="deleteDialog.title" :confirmButtonText="deleteDialog.confirmButtonText" @confirm="handleDelete" />

    <!-- BaseAlert -->
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
      // Settings page
      keyName: "show-bookings",
      results: JSON.parse(localStorage.getItem("user")),
      breadcrumbItems: [
        {
          title: "الرئيسية",
          disabled: false,
          to: "/teacher/index",
        },
        {
          title: "الحجوزات",
          disabled: true,
        },
      ],
      loading: false,
      progress: 0,
      // Settings page

      // Table data
      table: {
        totalItems: 0,
        Data: [],
        actions: [
          "موافقة اولية",
          "تاكيد",
          "رفض",
          "تحديث رد",
          "حذف",
          "اعادة تفعيل",
        ],
        loading: false,
        headers: [
          {
            title: "#",
            type: "strong",
            sortable: true,
            key: "num",
          },
          {
            title: "اسم الكورس",
            type: "link",
            sortable: true,
            key: "course.courseName", // 🔑 من course
          },
          {
            title: "اسم الطالب",
            type: "strong",
            sortable: true,
            key: "student.name",
          },
          {
            title: "الحالة",
            type: "status",
            sortable: true,
            key: "status", // 🔑 من booking نفسه
          },
          {
            title: "تاريخ ارسال الحجز",
            type: "date",
            sortable: true,
            key: "createdAt",
          },
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
            scroll: 0,
            sortBy: "",
            search: null,
            status: null,
            grade_id: null,
            subject_id: null,
            study_year: JSON.parse(localStorage.getItem("studyYear")),
            sort: '{"key":"createdAt","order":"desc"}',
          },
        },
      },
      // Table data

      gradeLevelAll: [],
      // courseIsStatus
      courseIsStatus: [
        { text: "الكل", value: null },
        { text: "قيد الانتظار", value: "pending" },
        { text: "موافقة أولية", value: "pre_approved" },
        { text: "تأكيد الحجز", value: "confirmed" },
        { text: "مقبول", value: "approved" },
        { text: "مرفوض", value: "rejected" },
        { text: "ملغي", value: "cancelled" },
      ],
      // courseIsStatus

      // preApproveDialog
      preApproveDialog: {
        open: false,
        data: null,
        teacherResponse:
          "مرحباً بكم في الدورة، يرجى إحضار مبلغ الحجز لتأكيد الحجز",
      },
      // preApproveDialog

      // consentDialog
      consentDialog: {
        open: false,
        data: null,
        teacherResponse:
          "مرحباً بكم في الدورة، يرجى إحضار مبلغ الحجز لتأكيد الحجز",
        reservationPaid: false,
      },
      // consentDialog

      // enableDialog (reactivate)
      enableDialog: {
        open: false,
        data: null,
        messages: [],
        title: null,
        confirmButtonText: null,
        checkboxLabel: null,
      },
      // enableDialog

      // deleteDialog
      deleteDialog: {
        open: false,
        data: null,
        messages: [],
        title: null,
        confirmButtonText: null,
      },
      // deleteDialog

      // rejectDialog
      rejectDialog: {
        open: false,
        data: null,
        rejectionReason: "",
        teacherResponse: "",
      },
      // rejectDialog

      // updateResponseDialog
      updateResponseDialog: {
        open: false,
        data: null,
        teacherResponse: "",
      },
      // updateResponseDialog

      // alert
      alert: { open: false, message: null, type: "success" },
      // alert
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
  },
  computed: {
    hasReservationSelected() {
      return this.consentDialog?.data?.course?.hasReservation === true;
    },
  },
  beforeUnmount() {
    this.unwatch?.();
    window.removeEventListener("scroll", this.handleScroll);
  },
  methods: {
    numberWithComma,
    // add new Notifications
    handleDataAdded(message) {
      this.getDataAxios();
      this.showAlert("success", message);
    },
    // add new Notifications

    // get Scroll
    handleScroll() {
      const scrollTop = window.scrollY || window.pageYOffset;
      const stored = JSON.parse(localStorage.getItem(this.keyName)) || {};
      stored.scrollTop = scrollTop;
      localStorage.setItem(this.keyName, JSON.stringify(stored));
    },
    // get Scroll

    // get data
    reload() {
      localStorage.removeItem(this.keyName);
      this.table.tableSettings.options = {
        page: 1,
        limit: 10,
        scroll: 0,
        sortBy: "",
        search: null,
        status: null,
        grade_id: null,
        subject_id: null,
        study_year: JSON.parse(localStorage.getItem("studyYear")),
        sort: JSON.stringify({ key: "createdAt", order: "desc" }),
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

        const response = await TeacherApi.getBookings(this.table.tableSettings);

        if (response.data?.error) {
          return this.showAlert(
            "error",
            response.data.message || "حدث خطأ أثناء جلب البيانات"
          );
        }

        this.table.Data = response.data.data;
        this.table.totalItems = response.data.count;
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
    // get data

    // preApproveItem
    preApproveItem(item) {
      this.preApproveDialog.data = item;
      this.preApproveDialog.open = true;
    },
    async handlePreApprove() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await TeacherApi.preApproveBookings(
          this.preApproveDialog.data.id,
          this.preApproveDialog.teacherResponse
        );
        this.showAlert("success", response.data.message || "تم الحذف بنجاح");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية الحذف"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.preApproveDialog.teacherResponse = null;
          this.preApproveDialog.open = false;
        }, 500);
      }
    },
    // preApproveItem

    // consentItem
    consentItem(item) {
      this.consentDialog.data = item;
      this.consentDialog.open = true;
    },
    async handleConsent() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const hasReservation =
          this.consentDialog?.data?.course?.hasReservation === true;

        const payload = {
          teacherResponse: this.consentDialog.teacherResponse,
          reservationPaid: hasReservation
            ? this.consentDialog.reservationPaid === true
            : true,
        };

        const response = await TeacherApi.consentBookings(
          this.consentDialog.data.id,
          payload
        );
        this.showAlert("success", response.data.message || "تم الحذف بنجاح");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية الحذف"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.consentDialog.teacherResponse = null;
          this.consentDialog.reservationPaid = false;
          this.consentDialog.open = false;
        }, 500);
      }
    },
    // consentItem

    // rejectItem
    rejectItem(item) {
      this.rejectDialog.data = item;
      this.rejectDialog.rejectionReason = "";
      this.rejectDialog.teacherResponse = "";
      this.rejectDialog.open = true;
    },
    async handleReject() {
      if (
        !this.rejectDialog.rejectionReason ||
        !this.rejectDialog.rejectionReason.trim()
      ) {
        this.showAlert("error", "سبب الرفض مطلوب");
        return;
      }

      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await TeacherApi.rejectBooking(
          this.rejectDialog.data.id,
          {
            rejectionReason: this.rejectDialog.rejectionReason,
            teacherResponse: this.rejectDialog.teacherResponse || undefined,
          }
        );
        this.showAlert("success", response.data.message || "تم رفض الحجز");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية الرفض"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.rejectDialog.open = false;
        }, 500);
      }
    },
    // rejectItem

    // updateResponseItem
    updateResponseItem(item) {
      this.updateResponseDialog.data = item;
      this.updateResponseDialog.teacherResponse = item?.teacherResponse || "";
      this.updateResponseDialog.open = true;
    },
    async handleUpdateResponse() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await TeacherApi.updateBookingResponse(
          this.updateResponseDialog.data.id,
          this.updateResponseDialog.teacherResponse
        );
        this.showAlert("success", response.data.message || "تم التحديث بنجاح");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية التحديث"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.updateResponseDialog.open = false;
        }, 500);
      }
    },
    // updateResponseItem

    // enableItem
    enableItem(item) {
      this.enableDialog.data = item;
      this.enableDialog.messages = [
        "سيتم إعادة تفعيل الحجز.",
        "ستتمكن من مواصلة الإجراءات عليه.",
      ];
      this.enableDialog.title = "تأكيد إعادة التفعيل";
      this.enableDialog.confirmButtonText = "إعادة تفعيل الحجز";
      this.enableDialog.checkboxLabel = "أفهم التحذير وأؤكد إعادة التفعيل";
      this.enableDialog.open = true;
    },
    async handleRestore() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await TeacherApi.reactivateBooking(
          this.enableDialog.data.id,
          null
        );
        this.showAlert(
          "success",
          response.data.message || "تمت إعادة التفعيل بنجاح"
        );
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية إعادة التفعيل"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.enableDialog.open = false;
        }, 500);
      }
    },
    // enableItem

    // deleteItem
    deleteItem(item) {
      this.deleteDialog.data = item;
      this.deleteDialog.messages = [
        "سيتم حذف الحجز.",
        "لا يمكن استرجاعه بعد الحذف.",
      ];
      this.deleteDialog.title = "تأكيد الحذف";
      this.deleteDialog.confirmButtonText = "حذف الحجز";
      this.deleteDialog.open = true;
    },
    async handleDelete() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await TeacherApi.deleteBooking(
          this.deleteDialog.data.id
        );
        this.showAlert(
          "success",
          response.data.message || "تم حذف الحجز بنجاح"
        );
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية الحذف"
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
    // deleteItem

    // Alert
    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true });
    },
    // Alert
  },
};
</script>
