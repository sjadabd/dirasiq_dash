<script setup>
import { useAuth } from "@/composables/useAuth";
import axiosInstance from "@/utils/axios.js";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { user, logout, hasPermission } = useAuth();

// بيانات المستخدم
const isLoading = ref(true);

// إحصائيات النظام
const stats = ref({
  totalUsers: 0,
  totalTeachers: 0,
  totalStudents: 0,
  activeCourses: 0,
  totalRevenue: 0,
  pendingApprovals: 0,
});

onMounted(async () => {
  // التحقق من صلاحية المستخدم
  if (!hasPermission("super_admin")) {
    router.push("/login");
    return;
  }

  // محاكاة جلب الإحصائيات
  try {
    const response = await axiosInstance.get("/super-admin/dashboard/stats");
    const data = response?.data?.data || {};

    stats.value = {
      ...stats.value,
      totalUsers: data.totalUsers ?? 0,
      totalTeachers: data.totalTeachers ?? 0,
      totalStudents: data.totalStudents ?? 0,
      activeCourses: data.activeCourses ?? 0,
    };
  } catch (error) {
    console.error("Failed to load super admin stats", error);
  } finally {
    isLoading.value = false;
  }
});

// دالة تحديث الملف الشخصي
const updateProfile = () => {
  router.push("/admin/profile");
};

// دالة إدارة المستخدمين
const manageUsers = () => {
  router.push("/admin/users");
};

// دالة إدارة الدورات
const manageCourses = () => {
  router.push("/admin/courses");
};

// دالة التقارير
const viewReports = () => {
  router.push("/admin/reports");
};

// دالة الإعدادات
const openSettings = () => {
  router.push("/admin/settings");
};
</script>

<template>
  <div class="admin-dashboard">
    <VContainer fluid class="pa-6">
      <!-- ترحيب -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard color="primary" variant="tonal" class="pa-6">
            <VRow align="center">
              <VCol cols="12" md="8">
                <h1 class="text-h4 mb-2">مرحباً {{ user?.name }}! 👋</h1>
                <p class="text-body-1 mb-0">
                  {{ user?.email }} • {{ user?.userType }}
                </p>
                <p class="text-caption mt-2">
                  عضو منذ
                  {{ new Date(user?.createdAt).toLocaleDateString("en-IQ") }}
                </p>
              </VCol>
              <VCol cols="12" md="4" class="text-center">
                <VAvatar size="80" color="primary">
                  <VIcon size="40">mdi-shield-account</VIcon>
                </VAvatar>
              </VCol>
            </VRow>
          </VCard>
        </VCol>
      </VRow>

      <!-- الإحصائيات -->
      <VRow class="mb-6">
        <VCol cols="12">
          <h2 class="text-h5 mb-4">إحصائيات النظام</h2>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="primary" class="mb-2">mdi-account-group</VIcon>
            <h3 class="text-h4">{{ stats.totalUsers }}</h3>
            <p class="text-body-2 text-medium-emphasis">إجمالي المستخدمين</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="success" class="mb-2">mdi-school</VIcon>
            <h3 class="text-h4">{{ stats.totalTeachers }}</h3>
            <p class="text-body-2 text-medium-emphasis">المعلمين</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="info" class="mb-2">mdi-account</VIcon>
            <h3 class="text-h4">{{ stats.totalStudents }}</h3>
            <p class="text-body-2 text-medium-emphasis">الطلاب</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="warning" class="mb-2">mdi-book-open</VIcon>
            <h3 class="text-h4">{{ stats.activeCourses }}</h3>
            <p class="text-body-2 text-medium-emphasis">الدورات النشطة</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="success" class="mb-2">mdi-currency-usd</VIcon>
            <h3 class="text-h4">{{ stats.totalRevenue.toLocaleString() }}</h3>
            <p class="text-body-2 text-medium-emphasis">إجمالي الإيرادات</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="error" class="mb-2">mdi-clock-alert</VIcon>
            <h3 class="text-h4">{{ stats.pendingApprovals }}</h3>
            <p class="text-body-2 text-medium-emphasis">في انتظار الموافقة</p>
          </VCard>
        </VCol>
      </VRow>

      <!-- الإجراءات السريعة -->
      <VRow>
        <VCol cols="12" md="6">
          <VCard elevation="2" class="pa-6">
            <VCardTitle>
              <VIcon class="me-2">mdi-cog</VIcon>
              إدارة النظام
            </VCardTitle>

            <VCardText>
              <VList>
                <VListItem @click="manageUsers">
                  <VListItemTitle>إدارة المستخدمين</VListItemTitle>
                  <VListItemSubtitle>عرض وإدارة جميع المستخدمين</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-account-group</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem @click="manageCourses">
                  <VListItemTitle>إدارة الدورات</VListItemTitle>
                  <VListItemSubtitle>عرض وإدارة جميع الدورات</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-book-open</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem @click="viewReports">
                  <VListItemTitle>التقارير والإحصائيات</VListItemTitle>
                  <VListItemSubtitle>عرض تقارير مفصلة عن النظام</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-chart-line</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem @click="openSettings">
                  <VListItemTitle>إعدادات النظام</VListItemTitle>
                  <VListItemSubtitle>تخصيص إعدادات المنصة</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-cog</VIcon>
                    </VBtn>
                  </template>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" md="6">
          <VCard elevation="2" class="pa-6">
            <VCardTitle>
              <VIcon class="me-2">mdi-account</VIcon>
              معلومات الحساب
            </VCardTitle>

            <VCardText>
              <VList>
                <VListItem>
                  <VListItemTitle>الاسم</VListItemTitle>
                  <VListItemSubtitle>{{ user?.name }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <VListItemTitle>البريد الإلكتروني</VListItemTitle>
                  <VListItemSubtitle>{{ user?.email }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <VListItemTitle>نوع المستخدم</VListItemTitle>
                  <VListItemSubtitle>
                    <VChip :color="user?.userType === 'super_admin' ? 'warning' : 'info'
                      " size="small">
                      {{
                        user?.userType === "super_admin" ? "سوبر أدمن" : "أدمن"
                      }}
                    </VChip>
                  </VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <VListItemTitle>الحالة</VListItemTitle>
                  <VListItemSubtitle>
                    <VChip :color="user?.status === 'active' ? 'success' : 'warning'" size="small">
                      {{ user?.status === "active" ? "نشط" : "غير نشط" }}
                    </VChip>
                  </VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <VListItemTitle>تاريخ الإنشاء</VListItemTitle>
                  <VListItemSubtitle>{{
                    new Date(user?.createdAt).toLocaleDateString("ar-SA")
                    }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </VCardText>

            <VCardActions>
              <VBtn color="primary" @click="updateProfile">
                <VIcon start>mdi-account-edit</VIcon>
                تحديث الملف الشخصي
              </VBtn>
            </VCardActions>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<style scoped>
.admin-dashboard {
  background-color: #f5f5f5;
  min-block-size: 100vh;
}

.v-card {
  border-radius: 12px;
}

.v-list-item {
  border-block-end:
    1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: pointer;
}

.v-list-item:last-child {
  border-block-end: none;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
