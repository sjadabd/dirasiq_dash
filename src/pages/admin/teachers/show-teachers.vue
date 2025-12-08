<template>
  <div>
    <!-- Settings page -->
    <AppBreadcrumbs :items="breadcrumbItems" />
    <!-- Settings page -->

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
            <VTextField v-model="table.tableSettings.options.search" label="بحث بالاسم أو البريد الإلكتروني"
              variant="outlined" clearable @keyup.enter="getDataAxios" @click:clear="handleClearSearch" />
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
            <h3 class="text-h5 font-weight-bold text-center">
              قائمة المعلمين
            </h3>
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
          @updateTableOptions="updateTableOptions" @showItem="viewTeacher" class="reservation-table" />
      </VCardItem>
    </VCard>
    <!-- SmartTable -->

    <!-- BaseAlert -->
    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import axiosInstance from "@/utils/axios.js";
import numberWithComma from "@/constant/number";

export default {
  data() {
    return {
      // Settings page
      keyName: "show-teachers",
      results: JSON.parse(localStorage.getItem("user")),
      breadcrumbItems: [
        {
          title: "الرئيسية",
          disabled: false,
          to: "/admin/dashboard",
        },
        {
          title: "المعلمين",
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
        actions: [""],
        loading: false,
        headers: [
          {
            title: "#",
            type: "strong",
            sortable: false,
            key: "num",
          },
          {
            title: "الاسم",
            type: "link",
            sortable: false,
            key: "name",
          },
          {
            title: "البريد الإلكتروني",
            type: "strong",
            sortable: false,
            key: "email",
          },
          {
            title: "رقم الجوال",
            type: "strong",
            sortable: false,
            key: "phone",
          },
          {
            title: "الحالة",
            type: "strong",
            sortable: false,
            key: "status",
          },
          {
            title: "تاريخ الإنشاء",
            type: "strong",
            sortable: false,
            key: "created_at",
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
          },
        },
      },
      // Table data

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
    this.getDataAxios();
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  },
  methods: {
    numberWithComma,
    // get Scroll
    handleScroll() {
      const scrollTop = window.scrollY || window.pageYOffset;
      const stored = JSON.parse(localStorage.getItem(this.keyName)) || {};
      stored.scrollTop = scrollTop;
      localStorage.setItem(this.keyName, JSON.stringify(stored));
    },
    // get Scroll

    // reload
    reload() {
      localStorage.removeItem(this.keyName);
      this.table.tableSettings.options = {
        page: 1,
        limit: 10,
        scroll: 0,
        sortBy: "",
        search: null,
      };
      this.getDataAxios();
    },
    // reload

    // updateTableOptions
    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
        search: !newOptions.search ? null : newOptions.search,
      };
      this.getDataAxios();
    },
    // updateTableOptions

    handleClearSearch() {
      this.table.tableSettings.options.search = null;
      this.getDataAxios();
    },

    async getDataAxios() {
      this.progress = 0;
      this.loading = true;

      try {
        localStorage.setItem(
          this.keyName,
          JSON.stringify(this.table.tableSettings)
        );

        const options = this.table.tableSettings.options;
        const params = {
          page: options.page || 1,
          limit: options.limit || 10,
          search: options.search || "",
        };

        const response = await axiosInstance.get("/super-admin/teachers", {
          params,
        });

        if (response.data?.error) {
          return this.showAlert(
            "error",
            response.data.message || "حدث خطأ أثناء جلب البيانات"
          );
        }

        const data = response.data?.data || [];
        const pagination = response.data?.pagination || {};

        this.table.Data = data.map((item, index) => ({
          ...item,
          num: (params.page - 1) * params.limit + (index + 1),
          created_at: item.created_at
            ? new Date(item.created_at).toLocaleDateString("ar-SA")
            : "-",
        }));
        this.table.totalItems = pagination.total || data.length || 0;
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء جلب البيانات"
        );
      } finally {
        this.loading = false;
      }
    },

    viewTeacher(item) {
      if (!item?.id) return;
      this.$router.push({
        name: "admin-teachers-id",
        params: { id: item.id },
      });
    },

    // Alert
    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true });
    },
    // Alert
  },
};
</script>
