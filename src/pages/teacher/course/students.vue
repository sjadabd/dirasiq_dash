<template>
  <div>
    <!-- Breadcrumbs -->
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-team-line" color="primary" class="me-2" size="24" />
        <div>
          <h3 class="text-h5 font-weight-bold mb-1">طلاب الكورس</h3>
          <div v-if="courseName" class="text-subtitle-2 text-medium-emphasis">
            {{ courseName }}
          </div>
        </div>
        <VSpacer />
        <VBtn color="primary" variant="text" prepend-icon="ri-arrow-go-back-line" @click="goBack">
          عودة إلى الكورسات
        </VBtn>
      </VCardTitle>
      <VDivider />

      <VCardItem>
        <VRow class="align-center">
          <VCol cols="12" md="6">
            <div class="text-subtitle-2 text-medium-emphasis">
              إجمالي الطلاب:
              <strong>{{ numberWithComma(table.totalItems) }}</strong>
            </div>
          </VCol>
        </VRow>
      </VCardItem>

      <VDivider />

      <VCardItem>
        <SmartTable :headers="table.headers" :items="table.Data" :actions="table.actions" :loading="table.loading"
          :totalItems="table.totalItems" :tableOptions="table.tableSettings.options"
          @updateTableOptions="updateTableOptions" />
      </VCardItem>
    </VCard>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />
  </div>
</template>

<script>
import TeacherApi from "@/api/teacher/teacher_api";
import numberWithComma from "@/constant/number";

export default {
  data() {
    const courseId = this.$route.query.courseId || null;
    const courseName = this.$route.query.courseName || null;

    return {
      courseId,
      courseName,
      breadcrumbItems: [
        {
          title: "الرئيسية",
          disabled: false,
          to: "/teacher/index",
        },
        {
          title: "الكورسات",
          disabled: false,
          to: "/teacher/course/show-course",
        },
        {
          title: "طلاب الكورس",
          disabled: true,
        },
      ],
      table: {
        totalItems: 0,
        Data: [],
        actions: [],
        loading: false,
        headers: [
          { title: "#", type: "strong", sortable: false, key: "num" },
          { title: "اسم الطالب", type: "strong", sortable: true, key: "name" },
        ],
        tableSettings: {
          options: {
            page: 1,
            limit: 10,
            search: null,
          },
        },
      },
      alert: { open: false, message: null, type: "success" },
    };
  },
  created() {
    if (!this.courseId) {
      this.showAlert("error", "لم يتم تمرير معرف الكورس");
      return;
    }
    this.getDataAxios();
  },
  methods: {
    numberWithComma,

    goBack() {
      this.$router.push({ path: "/teacher/course/show-course" });
    },

    async getDataAxios() {
      if (!this.courseId) return;

      this.table.loading = true;
      try {
        const { page, limit, search } = this.table.tableSettings.options;
        const q = search || "";
        const response = await TeacherApi.getStudentsByCoursePaginated(
          this.courseId,
          { page, limit, q }
        );

        const body = response.data || {};
        const items = body.data || [];
        const pagination = body.pagination || {};

        this.table.totalItems = pagination.total || items.length || 0;
        this.table.tableSettings.options = {
          ...this.table.tableSettings.options,
          page: pagination.page || page,
          limit: pagination.limit || limit,
        };

        this.table.Data = items.map((student, index) => ({
          id: student.id,
          num:
            (this.table.tableSettings.options.page - 1) *
            this.table.tableSettings.options.limit +
            index +
            1,
          name: student.name,
        }));
      } catch (error) {
        this.showAlert(
          "error",
          error?.response?.data?.message || "حدث خطأ أثناء جلب طلاب الكورس"
        );
      } finally {
        this.table.loading = false;
      }
    },

    reload() {
      this.table.tableSettings.options = {
        page: 1,
        limit: 10,
        search: null,
      };
      this.getDataAxios();
    },

    updateTableOptions(newOptions) {
      this.table.tableSettings.options = {
        ...this.table.tableSettings.options,
        ...newOptions,
      };
      this.getDataAxios();
    },

    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true });
    },
  },
};
</script>
