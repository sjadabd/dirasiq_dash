<script setup>
import Auth from "@/api/auth/auth_api";
import avatar1 from "@images/avatars/avatar-1.png";
import { useRouter } from "vue-router";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";

const router = useRouter();

// بيانات المستخدم
const user = ref(null);
const isAuthenticated = ref(false);

// فحص حالة المستخدم عند تحميل المكون
onMounted(() => {
  const userData = localStorage.getItem("user");
  const token = localStorage.getItem("accessToken");

  if (userData && token) {
    user.value = JSON.parse(userData);
    isAuthenticated.value = true;
  }
});

const handleNavItemClick = (item) => {
  if (item.value === "profile") {
    router.push("/teacher/profile-setup");
  }
  // يمكن إضافة توجيه لباقي العناصر حسب item.value
  else if (item.value === "settings") {
    router.push("/teacher/settings");
  } else if (item.value === "billing") {
    router.push("/teacher/billing");
  } else if (item.value === "help") {
    router.push("/help");
  }
};

// متغيرات تسجيل الخروج
const isLoggingOut = ref(false);

// وظيفة تسجيل الخروج
const logout = async () => {
  try {
    isLoggingOut.value = true;

    // استدعاء API لتسجيل الخروج
    await Auth.logout();

    // مسح البيانات من localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");

    // إعادة تعيين حالة المستخدم
    user.value = null;
    isAuthenticated.value = false;

    // التوجه إلى الصفحة الرئيسية
    router.push("/");

    // إظهار رسالة نجاح
    console.log("تم تسجيل الخروج بنجاح");
  } catch (error) {
    console.error("خطأ في تسجيل الخروج:", error);

    // حتى لو فشل API، نمسح البيانات المحلية
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    user.value = null;
    isAuthenticated.value = false;
    router.push("/");
  } finally {
    isLoggingOut.value = false;
  }
};

const userProfileList = [
  { type: "divider" },
  {
    type: "navItem",
    icon: "ri-user-line",
    title: "الملف الشخصي",
    value: "profile",
  },
  {
    type: "navItem",
    icon: "ri-settings-4-line",
    title: "الإعدادات",
    value: "settings",
  },
  {
    type: "navItem",
    icon: "ri-file-text-line",
    title: "الخطة",
    value: "billing",
  },
  { type: "divider" },
  {
    type: "navItem",
    icon: "ri-question-line",
    title: "المساعدة",
    value: "help",
  },
  { type: "divider" },
];
</script>

<template>
  <VBadge
    dot
    bordered
    location="bottom right"
    offset-x="3"
    offset-y="3"
    color="success"
  >
    <VAvatar class="cursor-pointer" size="38">
      <VImg :src="user?.avatar || user?.profileImage || avatar1" />

      <!-- SECTION Menu -->
      <VMenu activator="parent" width="230" location="bottom end" offset="15px">
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar color="primary" variant="tonal">
                    <VImg
                      :src="user?.avatar || user?.profileImage || avatar1"
                    />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <h6 class="text-sm font-weight-medium">
              {{ user?.name || user?.firstName || "المستخدم" }}
            </h6>
            <VListItemSubtitle class="text-capitalize text-disabled">
              {{
                user?.userType === "student"
                  ? "طالب"
                  : user?.userType === "teacher"
                  ? "معلم"
                  : user?.userType === "admin"
                  ? "إداري"
                  : user?.userType === "super_admin"
                  ? "مدير عام"
                  : "مستخدم"
              }}
            </VListItemSubtitle>
          </VListItem>

          <PerfectScrollbar :options="{ wheelPropagation: false }">
            <template v-for="item in userProfileList" :key="item.title">
              <VListItem
                v-if="item.type === 'navItem'"
                :value="item.value"
                @click="handleNavItemClick(item)"
              >
                <template #prepend>
                  <VIcon :icon="item.icon" size="22" />
                </template>

                <VListItemTitle>{{ item.title }}</VListItemTitle>

                <template v-if="item.badgeProps" #append>
                  <VBadge inline v-bind="item.badgeProps" />
                </template>
              </VListItem>

              <VDivider v-else class="my-1" />
            </template>

            <VListItem>
              <VBtn
                block
                color="error"
                append-icon="ri-logout-box-r-line"
                :loading="isLoggingOut"
                :disabled="isLoggingOut"
                @click="logout"
              >
                {{ isLoggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج" }}
              </VBtn>
            </VListItem>
          </PerfectScrollbar>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
