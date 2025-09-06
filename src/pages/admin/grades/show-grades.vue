<template>
  <div>
    <!-- Settings page -->
    <AppLoadingOverlay
      :loading="loading"
      :progress="progress"
      :results="results"
    />
    <AppBreadcrumbs :items="breadcrumbItems" />
    <!-- Settings page -->

    <!-- Operations Card -->
    <VCard class="my-4 operations-card" elevation="3" rounded="lg">
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
            إضافة مرحلة دراسية جديدة
          </v-btn>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Operations Card -->

    <!-- SmartTable -->
    <VCard class="my-4 data-table-card" elevation="3" rounded="lg">
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
              class="rotate-on-hover"
            />
          </VCol>
          <VCol>
            <h3 class="text-h5 font-weight-bold text-center">
              المراحل الدراسية
            </h3>
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
          @deleteItem="deleteItem"
          @editItem="editItem"
          class="reservation-table"
        />
      </VCardItem>
    </VCard>
    <!-- SmartTable -->

    <!-- Add grades Dialog -->
    <AddGradesDialog
      v-if="Actions.open"
      v-model="Actions.open"
      @close="Actions.open = false"
      @dataAdded="handleDataAdded"
      @showAlert="showAlert"
    />
    <!-- Add grades Dialog -->

    <!-- Add grades Dialog -->
    <EditGradesDialog
      v-if="editGrades.open"
      v-model="editGrades.open"
      :data="editGrades.data"
      @close="editGrades.open = false"
      @dataAdded="handleDataAdded"
      @showAlert="showAlert"
    />
    <!-- Add grades Dialog -->

    <!-- ConfirmDangerDialog -->
    <ConfirmDangerDialog
      v-model="enableDialog.open"
      :messages="enableDialog.messages"
      :title="enableDialog.title"
      :confirmButtonText="enableDialog.confirmButtonText"
      @confirm="handleDelete"
    />

    <!-- BaseAlert -->
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
import adminApi from "@/api/admin/admin_api";
import numberWithComma from "@/constant/number";

export default {
  data() {
    return {
      // Settings page
      keyName: "show-grades",
      results: JSON.parse(localStorage.getItem("user-data")),
      breadcrumbItems: [
        {
          title: "الرئيسية",
          disabled: false,
          to: "/teacher/index",
        },
        {
          title: "السنة الدراسية",
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
        actions: ["حذف", "تعديل"],
        loading: false,
        headers: [
          {
            title: "#",
            type: "strong",
            sortable: true,
            key: "num",
          },
          {
            title: "اسم السنة",
            type: "link",
            sortable: true,
            key: "name",
          },
          {
            title: "التفاصيل",
            type: "strong",
            sortable: true,
            key: "description",
          },
          {
            title: "الحالة",
            type: "strong",
            sortable: true,
            key: "isActive",
          },
          {
            title: "العمليات",
            type: "strong",
            sortable: true,
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
            is_disabled: false,
            is_active: null,
            sort: '{"key":"createdAt","order":"desc"}',
          },
        },
      },
      // Table data

      // courseIsDisabled
      gradeLevelAll: [],
      courseIsDisabled: [
        { text: "الكل", value: null },
        { text: "مفعل", value: true },
        { text: "معطل", value: false },
      ],
      // courseIsDisabled

      // Actions
      Actions: {
        open: false,
        data: null,
      },

      // editGrades
      editGrades: {
        open: false,
        data: null,
      },

      // enableDialog
      enableDialog: {
        open: false,
        data: null,
        messages: [],
        title: null,
        confirmButtonText: null,
      },
      // enableDialog

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
        gradeLevelId: null,
        is_disabled: false,
        is_active: false,
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
        const { sortBy = [], sortDesc = [] } = this.table.tableSettings.options;
        const sort = {
          key: Array.isArray(sortBy) && sortBy[0] ? sortBy[0] : "createdAt",
          order: Array.isArray(sortDesc) && sortDesc[0] ? "desc" : "desc",
        };
        this.table.tableSettings.options.sort = JSON.stringify(sort);

        localStorage.setItem(
          this.keyName,
          JSON.stringify(this.table.tableSettings)
        );

        const response = await adminApi.getGrade(this.table.tableSettings);

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

    // editItem
    editItem(item) {
      this.editGrades.data = item;
      this.editGrades.open = true;
    },
    // editItem

    // deleteItem
    deleteItem(item) {
      this.enableDialog.data = item;
      this.enableDialog.messages = [
        "سيتم حذف المرحلة الدراسية",
        "لا يمكنك التراجع بعد الحذف",
      ];
      this.enableDialog.title = "تأكيد الحذف";
      this.enableDialog.confirmButtonText = "حذف";
      this.enableDialog.open = true;
    },
    async handleDelete() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await adminApi.deleteGrade(this.enableDialog.data.id);
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
          this.enableDialog.open = false;
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
