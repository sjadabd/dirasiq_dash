<script setup>
import { useAuth } from "@/composables/useAuth";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { user, logout, hasPermission } = useAuth();

// بيانات المستخدم
const isLoading = ref(true);

// إحصائيات الطالب
const stats = ref({
  enrolledCourses: 0,
  completedLessons: 0,
  totalHours: 0,
  certificates: 0,
  currentStreak: 0,
  totalPoints: 0,
});

onMounted(() => {
  // التحقق من صلاحية المستخدم
  if (!hasPermission("student")) {
    router.push("/login");
    return;
  }

  // محاكاة جلب الإحصائيات
  setTimeout(() => {
    stats.value = {
      enrolledCourses: 5,
      completedLessons: 23,
      totalHours: 45,
      certificates: 2,
      currentStreak: 7,
      totalPoints: 1250,
    };
    isLoading.value = false;
  }, 1000);
});

// دالة تحديث الملف الشخصي
const updateProfile = () => {
  router.push("/student/profile-setup");
};

// دالة عرض الدورات
const viewCourses = () => {
  router.push("/student/courses");
};

// دالة الشهادات
const viewCertificates = () => {
  router.push("/student/certificates");
};

// دالة التقدم
const viewProgress = () => {
  router.push("/student/progress");
};
</script>

<template>
  <div class="student-dashboard">
    <!-- شريط التنقل العلوي -->
    <VAppBar color="primary" dark>
      <VAppBarTitle>
        <VIcon class="me-2">mdi-account</VIcon>
        لوحة تحكم الطالب
      </VAppBarTitle>

      <VSpacer />

      <VBtn icon @click="updateProfile">
        <VIcon>mdi-account-edit</VIcon>
      </VBtn>

      <VBtn icon @click="logout">
        <VIcon>mdi-logout</VIcon>
      </VBtn>
    </VAppBar>

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
                  {{ new Date(user?.createdAt).toLocaleDateString("ar-SA") }}
                </p>
              </VCol>
              <VCol cols="12" md="4" class="text-center">
                <VAvatar size="80" color="primary">
                  <VIcon size="40">mdi-account</VIcon>
                </VAvatar>
              </VCol>
            </VRow>
          </VCard>
        </VCol>
      </VRow>

      <!-- الإحصائيات -->
      <VRow class="mb-6">
        <VCol cols="12">
          <h2 class="text-h5 mb-4">إحصائياتك التعليمية</h2>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="primary" class="mb-2">mdi-book-open</VIcon>
            <h3 class="text-h4">{{ stats.enrolledCourses }}</h3>
            <p class="text-body-2 text-medium-emphasis">الدورات المسجلة</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="success" class="mb-2"
              >mdi-check-circle</VIcon
            >
            <h3 class="text-h4">{{ stats.completedLessons }}</h3>
            <p class="text-body-2 text-medium-emphasis">الدروس المكتملة</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="info" class="mb-2">mdi-clock</VIcon>
            <h3 class="text-h4">{{ stats.totalHours }}</h3>
            <p class="text-body-2 text-medium-emphasis">ساعات التعلم</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="warning" class="mb-2"
              >mdi-certificate</VIcon
            >
            <h3 class="text-h4">{{ stats.certificates }}</h3>
            <p class="text-body-2 text-medium-emphasis">الشهادات</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="success" class="mb-2">mdi-fire</VIcon>
            <h3 class="text-h4">{{ stats.currentStreak }}</h3>
            <p class="text-body-2 text-medium-emphasis">أيام متتالية</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4" lg="2">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="primary" class="mb-2">mdi-star</VIcon>
            <h3 class="text-h4">{{ stats.totalPoints }}</h3>
            <p class="text-body-2 text-medium-emphasis">النقاط</p>
          </VCard>
        </VCol>
      </VRow>

      <!-- الإجراءات السريعة -->
      <VRow>
        <VCol cols="12" md="6">
          <VCard elevation="2" class="pa-6">
            <VCardTitle>
              <VIcon class="me-2">mdi-school</VIcon>
              التعلم
            </VCardTitle>

            <VCardText>
              <VList>
                <VListItem @click="viewCourses">
                  <VListItemTitle>دوراتي</VListItemTitle>
                  <VListItemSubtitle>عرض الدورات المسجلة</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-book-open</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem @click="viewProgress">
                  <VListItemTitle>تقدمي</VListItemTitle>
                  <VListItemSubtitle>عرض تقدمك في التعلم</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-chart-line</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem @click="viewCertificates">
                  <VListItemTitle>شهاداتي</VListItemTitle>
                  <VListItemSubtitle
                    >عرض الشهادات المحصل عليها</VListItemSubtitle
                  >
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-certificate</VIcon>
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
                    <VChip color="info" size="small"> طالب </VChip>
                  </VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <VListItemTitle>الحالة</VListItemTitle>
                  <VListItemSubtitle>
                    <VChip
                      :color="user?.status === 'active' ? 'success' : 'warning'"
                      size="small"
                    >
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
.student-dashboard {
  background-color: #f5f5f5;
  min-block-size: 100vh;
}

.v-card {
  border-radius: 12px;
}

.v-list-item {
  border-block-end: 1px solid
    rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: pointer;
}

.v-list-item:last-child {
  border-block-end: none;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
