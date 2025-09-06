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
            إضافة باقة اشتراك جديدة
          </v-btn>
        </VRow>
      </VCardItem>
    </VCard>
    <!-- Operations Card -->

    <!-- Filter Card -->
    <VCard class="my-4 filter-card" elevation="3" rounded="lg">
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
        <VRow style="padding-block: 10px">
          <VCol cols="12" md="4">
            <VSelect
              v-model="table.tableSettings.options.isActive"
              :items="courseIsDisabled"
              item-title="text"
              item-value="value"
              label="حالة السنة"
              variant="outlined"
              @update:model-value="getDataAxios"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="table.tableSettings.options.isFree"
              :items="isFreeOptions"
              item-title="text"
              item-value="value"
              label="نوع الباقة"
              variant="outlined"
              @update:model-value="getDataAxios"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="table.tableSettings.options.deleted"
              :items="deletedOptions"
              item-title="text"
              item-value="value"
              label="حالة الباقة"
              variant="outlined"
              @update:model-value="getDataAxios"
            />
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
            <h3 class="text-h5 font-weight-bold text-center">باقات الاشتراك</h3>
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
          @enableItem="enableItem"
          @editItem="editItem"
          @deactivateItem="deactivateItem"
          class="reservation-table"
        />
      </VCardItem>
    </VCard>
    <!-- SmartTable -->

    <!-- Add subscription-packages Dialog -->
    <AddSubscriptionPackagesDialog
      v-if="Actions.open"
      v-model="Actions.open"
      @close="Actions.open = false"
      @dataAdded="handleDataAdded"
      @showAlert="showAlert"
    />
    <!-- Add subscription-packages Dialog -->

    <!-- Add grades Dialog -->
    <EditSubscriptionPackagesDialog
      v-if="editSubscriptionPackages.open"
      v-model="editSubscriptionPackages.open"
      :data="editSubscriptionPackages.data"
      @close="editSubscriptionPackages.open = false"
      @dataAdded="handleDataAdded"
      @showAlert="showAlert"
    />
    <!-- Add subscription-packages Dialog -->

    <!-- ConfirmDangerDialog -->
    <ConfirmDangerDialog
      v-model="enableDialog.open"
      :messages="enableDialog.messages"
      :title="enableDialog.title"
      :confirmButtonText="enableDialog.confirmButtonText"
      @confirm="handleEnable"
    />

    <!-- ConfirmDangerDialog -->
    <ConfirmDangerDialog
      v-model="deactivateDialog.open"
      :messages="deactivateDialog.messages"
      :title="deactivateDialog.title"
      :confirmButtonText="deactivateDialog.confirmButtonText"
      @confirm="handleDeactivate"
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
      keyName: "show-getSubscriptionPackage",
      results: JSON.parse(localStorage.getItem("user-data")),
      breadcrumbItems: [
        {
          title: "الرئيسية",
          disabled: false,
          to: "/teacher/index",
        },
        {
          title: "باقات الاشتراك",
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
        actions: ["اعادة تفعيل", "تعديل", "ايقاف"],
        loading: false,
        headers: [
          {
            title: "#",
            type: "strong",
            sortable: true,
            key: "num",
          },
          {
            title: "اسم الباقة",
            type: "link",
            sortable: true,
            key: "name",
          },
          {
            title: "مبلغ الباقة",
            type: "number",
            sortable: true,
            key: "price",
          },
          {
            title: "عدد الطلاب المسموح به",
            type: "number",
            sortable: true,
            key: "maxStudents",
          },
          {
            title: "عدد الايام المسموح به",
            type: "number",
            sortable: true,
            key: "durationDays",
          },
          {
            title: "مجانية؟",
            type: "strong",
            sortable: true,
            key: "isFree",
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
            isActive: null,
            isFree: null,
            deleted: null,
            sort: '{"key":"createdAt","order":"desc"}',
          },
        },
      },
      // Table data

      gradeLevelAll: [],
      courseIsDisabled: [
        { text: "الكل", value: null },
        { text: "مفعل", value: true },
        { text: "معطل", value: false },
      ],
      // isFree options
      isFreeOptions: [
        { text: "الكل", value: null },
        { text: "مجانية", value: true },
        { text: "مدفوعة", value: false },
      ],
      // isFree options
      // deleted options
      deletedOptions: [
        { text: "الكل", value: null },
        { text: "محذوفة", value: true },
        { text: "مفعلة", value: false },
      ],
      // deleted options

      // Actions
      Actions: {
        open: false,
        data: null,
      },

      // editGrades
      editSubscriptionPackages: {
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

      // deactivateDialog
      deactivateDialog: {
        open: false,
        data: null,
        messages: [],
        title: null,
        confirmButtonText: null,
      },
      // deactivateDialog

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
        isActive: null,
        isFree: null,
        deleted: null,
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

        const response = await adminApi.getSubscriptionPackage(
          this.table.tableSettings
        );

        if (response.data?.error) {
          return this.showAlert(
            "error",
            response.data.message || "حدث خطأ أثناء جلب البيانات"
          );
        }

        this.table.Data = response.data.data;
        this.table.totalItems = response.data.data.length;
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
      this.editSubscriptionPackages.data = item;
      this.editSubscriptionPackages.open = true;
    },
    // editItem

    // enableItem
    enableItem(item) {
      this.enableDialog.data = item;
      this.enableDialog.messages = [
        "سيتم تفعيل الباقة",
        "لا يمكنك التراجع بعد التفعيل",
      ];
      this.enableDialog.title = "تأكيد التفعيل";
      this.enableDialog.confirmButtonText = "تفعيل";
      this.enableDialog.open = true;
    },
    async handleEnable() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await adminApi.activateSubscriptionPackage(
          this.enableDialog.data.id
        );
        this.showAlert("success", response.data.message || "تم التفعيل بنجاح");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية التفعيل"
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

    // deactivateItem
    deactivateItem(item) {
      this.deactivateDialog.data = item;
      this.deactivateDialog.messages = [
        "سيتم ايقاف الباقة",
        "لا يمكنك التراجع بعد ايقاف",
      ];
      this.deactivateDialog.title = "تأكيد ايقاف";
      this.deactivateDialog.confirmButtonText = "ايقاف";
      this.deactivateDialog.open = true;
    },
    async handleDeactivate() {
      this.progress = 0;
      this.loading = true;
      const fakeProgress = setInterval(() => {
        if (this.progress < 90) this.progress += 10;
      }, 100);

      try {
        const response = await adminApi.deactivateSubscriptionPackage(
          this.deactivateDialog.data.id
        );
        this.showAlert("success", response.data.message || "تم ايقاف بنجاح");
        this.getDataAxios();
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء عملية ايقاف"
        );
      } finally {
        clearInterval(fakeProgress);
        this.progress = 100;
        setTimeout(() => {
          this.loading = false;
          this.progress = 0;
          this.deactivateDialog.open = false;
        }, 500);
      }
    },
    // enableItem

    // Alert
    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true });
    },
    // Alert
  },
};
</script>
