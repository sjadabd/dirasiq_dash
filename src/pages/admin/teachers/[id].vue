<script setup>
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import axiosInstance from "@/utils/axios.js";

const route = useRoute();
const router = useRouter();
const { hasPermission } = useAuth();

const isLoading = ref(true);
const teacher = ref(null);
const stats = ref(null);
const recentCourses = ref([]);
const alert = ref({ open: false, message: null, type: "success" });
const contentUrl = ref("");
const imageDialog = ref(false);

const teacherImageUrl = computed(() => {
  if (!teacher.value?.profile_image_path) return null;
  const base = contentUrl.value || "";
  const path = teacher.value.profile_image_path;
  return base ? `${base}${path}` : path;
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const breadcrumbItems = ref([
  {
    title: "الرئيسية",
    disabled: false,
    to: "/admin/dashboard",
  },
  {
    title: "المعلمين",
    disabled: false,
    to: "/admin/teachers/show-teachers",
  },
  {
    title: "تفاصيل المعلم",
    disabled: true,
  },
]);

const showAlert = (type, message) => {
  alert.value = { open: true, type, message };
};

const loadTeacher = async () => {
  const id = route.params.id;
  if (!id) {
    router.push("/admin/teachers/show-teachers");
    return;
  }

  if (!hasPermission("super_admin")) {
    router.push("/login");
    return;
  }

  try {
    const response = await axiosInstance.get(`/super-admin/teachers/${id}`);

    if (!response.data?.success) {
      showAlert("error", response.data?.message || "المعلم غير موجود");
      return;
    }

    contentUrl.value = response.data?.content_url || "";
    const data = response.data.data || {};
    teacher.value = data.teacher || null;
    stats.value = data.stats || null;
    recentCourses.value = data.recentCourses || [];
  } catch (error) {
    showAlert(
      "error",
      error?.response?.data?.message || "حدث خطأ أثناء جلب بيانات المعلم"
    );
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadTeacher();
});
</script>

<template>
  <div>
    <!-- Settings page -->
    <AppBreadcrumbs :items="breadcrumbItems" />
    <!-- Settings page -->

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="mdi-account" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">بيانات المعلم</h3>
      </VCardTitle>
      <VDivider />
      <VCardText v-if="isLoading">
        <VProgressLinear indeterminate color="primary" />
      </VCardText>
      <VCardText v-else>
        <VRow v-if="teacher">
          <VCol cols="12" md="4" class="text-center">
            <VAvatar size="100" color="primary" class="cursor-pointer" @click="teacherImageUrl && (imageDialog = true)">
              <VImg v-if="teacherImageUrl" :src="teacherImageUrl" cover />
              <VIcon v-else size="48">mdi-account</VIcon>
            </VAvatar>
            <h2 class="text-h5 mt-4">{{ teacher.name }}</h2>
            <p class="text-body-2 mb-1">{{ teacher.email }}</p>
            <p class="text-body-2 mb-1">{{ teacher.phone }}</p>
            <VChip :color="teacher.status === 'active' ? 'success' : 'warning'" size="small" class="mt-2">
              {{ teacher.status === "active" ? "نشط" : "غير نشط" }}
            </VChip>
          </VCol>

          <VCol cols="12" md="8">
            <VRow>
              <VCol cols="12" md="6">
                <p class="text-subtitle-2 mb-1">العنوان</p>
                <p class="text-body-2">
                  {{ teacher.address || "-" }}
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <p class="text-subtitle-2 mb-1">سنوات الخبرة</p>
                <p class="text-body-2">
                  {{ teacher.experience_years ?? 0 }}
                </p>
              </VCol>
              <VCol cols="12">
                <p class="text-subtitle-2 mb-1">نبذة</p>
                <p class="text-body-2">
                  {{ teacher.bio || "لا توجد نبذة" }}
                </p>
              </VCol>
            </VRow>
          </VCol>
        </VRow>

        <VAlert v-else type="error" variant="tonal" class="mt-4">
          المعلم غير موجود
        </VAlert>
      </VCardText>
    </VCard>

    <VRow>
      <VCol cols="12" md="6">
        <VCard class="my-4" elevation="3" rounded="lg">
          <VCardTitle class="d-flex align-center py-4 px-6">
            <VIcon icon="mdi-chart-bar" color="primary" class="me-2" size="24" />
            <h3 class="text-h6 font-weight-bold">إحصائيات المعلم</h3>
          </VCardTitle>
          <VDivider />
          <VCardText v-if="stats">
            <VRow>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">إجمالي الدورات</p>
                <p class="text-h6">{{ stats.totalCourses ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">إجمالي الطلاب</p>
                <p class="text-h6">{{ stats.totalStudents ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">إجمالي الحجوزات</p>
                <p class="text-h6">{{ stats.totalBookings ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">الحجوزات المعلقة</p>
                <p class="text-h6">{{ stats.pendingBookings ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">حجوزات بانتظار الموافقة</p>
                <p class="text-h6">{{ stats.preApprovedBookings ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">الحجوزات المؤكدة</p>
                <p class="text-h6">{{ stats.confirmedBookings ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">الحجوزات المرفوضة</p>
                <p class="text-h6">{{ stats.rejectedBookings ?? 0 }}</p>
              </VCol>
              <VCol cols="6">
                <p class="text-subtitle-2 mb-1">الحجوزات الملغاة</p>
                <p class="text-h6">{{ stats.cancelledBookings ?? 0 }}</p>
              </VCol>
            </VRow>
          </VCardText>
          <VCardText v-else>
            <p class="text-body-2">لا توجد إحصائيات متاحة.</p>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard class="my-4" elevation="3" rounded="lg">
          <VCardTitle class="d-flex align-center py-4 px-6">
            <VIcon icon="mdi-book-open-page-variant" color="primary" class="me-2" size="24" />
            <h3 class="text-h6 font-weight-bold">أحدث الدورات</h3>
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VList v-if="recentCourses.length">
              <VListItem v-for="course in recentCourses" :key="course.id">
                <VListItemTitle>{{ course.course_name }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ course.study_year }} • {{ formatDate(course.start_date) }} -
                  {{ formatDate(course.end_date) }}
                </VListItemSubtitle>
                <template #append>
                  <VChip color="primary" variant="outlined" size="small">
                    {{ course.price }}
                  </VChip>
                </template>
              </VListItem>
            </VList>
            <p v-else class="text-body-2">
              لا توجد دورات حديثة.
            </p>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <BaseAlert v-if="alert.open" v-model="alert.open" :type="alert.type" :message="alert.message" :closable="true"
      close-text="موافق" @close="alert.open = false" />

    <VDialog v-model="imageDialog" max-width="500">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <span class="text-subtitle-1">صورة المعلم</span>
          <VSpacer />
          <VBtn icon variant="text" @click="imageDialog = false">
            <VIcon>mdi-close</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText class="text-center">
          <VImg v-if="teacherImageUrl" :src="teacherImageUrl" max-height="400" contain />
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>
