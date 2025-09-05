<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// بيانات المستخدم
const user = ref(null);
const isLoading = ref(true);

// إحصائيات المعلم
const stats = ref({
  totalStudents: 0,
  activeCourses: 0,
  completedLessons: 0,
  rating: 0,
});

onMounted(() => {
  // جلب بيانات المستخدم من localStorage
  const userData = localStorage.getItem("user");
  if (userData) {
    user.value = JSON.parse(userData);
  } else {
    // إذا لم توجد بيانات المستخدم، توجيه لصفحة تسجيل الدخول
    router.push("/login");
    return;
  }

  // محاكاة جلب الإحصائيات
  setTimeout(() => {
    stats.value = {
      totalStudents: 25,
      activeCourses: 3,
      completedLessons: 45,
      rating: 4.8,
    };
    isLoading.value = false;
  }, 1000);
});

// دالة تسجيل الخروج
const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  router.push("/login");
};

// دالة تحديث الملف الشخصي
const updateProfile = () => {
  router.push("/teacher/profile-setup");
};
</script>

<template>
  <div class="teacher-dashboard">
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
          <h2 class="text-h5 mb-4">إحصائياتك</h2>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="primary" class="mb-2"
              >mdi-account-group</VIcon
            >
            <h3 class="text-h4">{{ stats.totalStudents }}</h3>
            <p class="text-body-2 text-medium-emphasis">إجمالي الطلاب</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="success" class="mb-2">mdi-book-open</VIcon>
            <h3 class="text-h4">{{ stats.activeCourses }}</h3>
            <p class="text-body-2 text-medium-emphasis">الدورات النشطة</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="info" class="mb-2">mdi-check-circle</VIcon>
            <h3 class="text-h4">{{ stats.completedLessons }}</h3>
            <p class="text-body-2 text-medium-emphasis">الدروس المكتملة</p>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard class="pa-4 text-center" elevation="2">
            <VIcon size="48" color="warning" class="mb-2">mdi-star</VIcon>
            <h3 class="text-h4">{{ stats.rating }}</h3>
            <p class="text-body-2 text-medium-emphasis">التقييم</p>
          </VCard>
        </VCol>
      </VRow>

      <!-- معلومات الملف الشخصي -->
      <VRow>
        <VCol cols="12" md="6">
          <VCard elevation="2" class="pa-6">
            <VCardTitle>
              <VIcon class="me-2">mdi-account</VIcon>
              معلومات الملف الشخصي
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
                  <VListItemSubtitle>{{ user?.userType }}</VListItemSubtitle>
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

                <VListItem v-if="user?.phone">
                  <VListItemTitle>رقم الهاتف</VListItemTitle>
                  <VListItemSubtitle>{{ user.phone }}</VListItemSubtitle>
                </VListItem>

                <VListItem v-if="user?.address">
                  <VListItemTitle>العنوان</VListItemTitle>
                  <VListItemSubtitle>{{ user.address }}</VListItemSubtitle>
                </VListItem>

                <VListItem v-if="user?.bio">
                  <VListItemTitle>نبذة شخصية</VListItemTitle>
                  <VListItemSubtitle>{{ user.bio }}</VListItemSubtitle>
                </VListItem>

                <VListItem v-if="user?.experienceYears">
                  <VListItemTitle>سنوات الخبرة</VListItemTitle>
                  <VListItemSubtitle
                    >{{ user.experienceYears }} سنة</VListItemSubtitle
                  >
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

        <VCol cols="12" md="6">
          <VCard elevation="2" class="pa-6">
            <VCardTitle>
              <VIcon class="me-2">mdi-cog</VIcon>
              الإجراءات السريعة
            </VCardTitle>

            <VCardText>
              <VList>
                <VListItem>
                  <VListItemTitle>إنشاء دورة جديدة</VListItemTitle>
                  <VListItemSubtitle>ابدأ دورة تعليمية جديدة</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-plus</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem>
                  <VListItemTitle>إدارة الطلاب</VListItemTitle>
                  <VListItemSubtitle>عرض وإدارة قائمة الطلاب</VListItemSubtitle>
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-account-group</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem>
                  <VListItemTitle>التقارير</VListItemTitle>
                  <VListItemSubtitle
                    >عرض تقارير الأداء والإحصائيات</VListItemSubtitle
                  >
                  <template #append>
                    <VBtn icon variant="text">
                      <VIcon>mdi-chart-line</VIcon>
                    </VBtn>
                  </template>
                </VListItem>

                <VListItem>
                  <VListItemTitle>الإعدادات</VListItemTitle>
                  <VListItemSubtitle>تخصيص إعدادات الحساب</VListItemSubtitle>
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
      </VRow>
    </VContainer>
  </div>
</template>

<style scoped>
.teacher-dashboard {
  background-color: #f5f5f5;
  min-block-size: 100vh;
}

.v-card {
  border-radius: 12px;
}

.v-list-item {
  border-block-end: 1px solid
    rgba(var(--v-border-color), var(--v-border-opacity));
}

.v-list-item:last-child {
  border-block-end: none;
}
</style>
