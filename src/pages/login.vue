<script setup>
import Auth from "@/api/auth/auth_api.js";
import { useAuth } from "@/composables/useAuth.js";
import tree1 from "@images/misc/tree1.png";
import authV2LoginIllustrationBorderedDark from "@images/pages/auth-v2-login-illustration-bordered-dark.png";
import authV2LoginIllustrationBorderedLight from "@images/pages/auth-v2-login-illustration-bordered-light.png";
import authV2LoginIllustrationDark from "@images/pages/auth-v2-login-illustration-dark.png";
import authV2LoginIllustrationLight from "@images/pages/auth-v2-login-illustration-light.png";
import authV2MaskDark from "@images/pages/mask-v2-dark.png";
import authV2MaskLight from "@images/pages/mask-v2-light.png";
import { VNodeRenderer } from "@layouts/components/VNodeRenderer";
import { themeConfig } from "@themeConfig";
import { useRouter } from "vue-router";

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true
);
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark);

definePage({
  meta: {
    layout: "blank",
    public: true,
  },
});

// استخدام router للتوجيه
const router = useRouter();

// متغيرات النموذج
const form = ref({
  email: "",
  password: "",
  remember: false,
});

const isPasswordVisible = ref(false);
const loginMethod = ref("email"); // 'email' أو 'google'
const isLoading = ref(false);
const error = ref("");
const isUserAuthenticated = ref(false);

// استخدام composable المصادقة
const { login, redirectBasedOnUserStatus } = useAuth();

// تحقق من حالة المستخدم - منع الوصول للمستخدمين المسجلين
const checkUserAuth = () => {
  const userData = localStorage.getItem("user");
  const token = localStorage.getItem("accessToken");

  if (userData && token) {
    isUserAuthenticated.value = true;
    // المستخدم مسجل دخول، توجيهه إلى dashboard المناسب
    const user = JSON.parse(userData);
    const userType = user.userType;

    switch (userType) {
      case "student":
        router.push("/student/dashboard");
        break;
      case "teacher":
        router.push("/teacher/dashboard");
        break;
      case "admin":
      case "super_admin":
        router.push("/admin/dashboard");
        break;
      default:
        router.push("/");
    }
    return true; // المستخدم مسجل دخول
  }
  isUserAuthenticated.value = false;
  return false; // المستخدم غير مسجل دخول
};

// دالة التوجيه بناءً على نوع المستخدم
const redirectBasedOnUserType = (userData, requiresProfileCompletion) => {
  const userType = userData.userType;

  switch (userType) {
    case "teacher":
      if (requiresProfileCompletion) {
        router.push("/teacher/profile-setup");
      } else {
        router.push("/teacher/dashboard");
      }
      break;

    case "super_admin":
      router.push("/admin/dashboard");
      break;

    case "admin":
      router.push("/admin/dashboard");
      break;

    case "student":
      if (requiresProfileCompletion) {
        router.push("/student/profile-setup");
      } else {
        router.push("/student/dashboard");
      }
      break;

    default:
      router.push("/dashboard");
  }
};

// دالة تسجيل الدخول بالبريد الإلكتروني
const handleEmailLogin = async () => {
  if (!form.value.email || !form.value.password) {
    error.value = "يرجى ملء جميع الحقول المطلوبة";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    const data = {
      email: form.value.email,
      password: form.value.password,
    };
    const response = await Auth.login(data);

    // معالجة النجاح والتوجيه
    if (response.data.success) {
      const {
        user: userData,
        token: accessToken,
        requiresProfileCompletion,
        isProfileComplete,
      } = response.data.data;

      // تسجيل الدخول باستخدام composable
      login(userData, accessToken);

      // التوجيه بناءً على نوع المستخدم وحالة الملف الشخصي
      redirectBasedOnUserType(userData, requiresProfileCompletion);
    }
  } catch (err) {
    error.value = "خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.";
    console.error("Login error:", err);
  } finally {
    isLoading.value = false;
  }
};

//  Google
const handleGoogleLogin = async (response) => {
  try {
    const token = response.credential;

    // فك تشفير JWT للحصول على بيانات المستخدم
    const decodedToken = decodeJWT(token);

    if (decodedToken) {
      // إرسال البيانات للسيرفر
      const res = await Auth.loginInGoogele(decodedToken);

      // معالجة النجاح والتوجيه
      if (res.data.success) {
        const {
          user: userData,
          token: accessToken,
          requiresProfileCompletion,
          isNewUser,
        } = res.data.data;

        // تسجيل الدخول باستخدام composable
        login(userData, accessToken);

        // التوجيه بناءً على نوع المستخدم وحالة الملف الشخصي
        redirectBasedOnUserType(userData, requiresProfileCompletion);
      }
    }
  } catch (err) {
    console.error("Google login error:", err);
    error.value = "خطأ في تسجيل الدخول بـ Google";
  }
};

// دالة لفك تشفير JWT token
function decodeJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

// تهيئة Google Sign-In عند تحميل المكون
onMounted(async () => {
  // تحقق من حالة المستخدم أولاً
  if (checkUserAuth()) {
    return; // إذا كان المستخدم مسجل دخول، لا نكمل تهيئة Google
  }

  await nextTick();

  const google = window.google;
  if (!google?.accounts?.id) {
    console.error("❌ Google API not loaded.");
    return;
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error(
      "❌ Google Client ID not found. Please add VITE_GOOGLE_CLIENT_ID to .env file"
    );
    error.value =
      "Google Client ID غير موجود. يرجى إضافة VITE_GOOGLE_CLIENT_ID إلى ملف .env";
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleLogin,
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    const buttonElement = document.getElementById("google-signin-button");
    if (buttonElement) {
      google.accounts.id.renderButton(buttonElement, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 300,
      });
    } else {
      console.warn("❌ لم يتم العثور على العنصر #google-signin-button");
    }
  } catch (err) {
    console.error("❌ Error initializing Google Sign-In:", err);
    error.value =
      "خطأ في تهيئة Google Sign-In. تأكد من إعدادات Google Cloud Console";
  }
});
</script>

<template>
  <!-- رسالة للمستخدمين المسجلين دخول -->
  <div
    v-if="isUserAuthenticated"
    class="d-flex align-center justify-center min-vh-100"
  >
    <VCard max-width="400" class="pa-6 text-center">
      <VCardText>
        <VIcon size="64" color="success" class="mb-4"
          >ri-checkbox-circle-line</VIcon
        >
        <h3 class="text-h5 mb-2">أنت مسجل دخول بالفعل</h3>
        <p class="text-body-1 mb-4">سيتم توجيهك إلى لوحة التحكم...</p>
        <VProgressCircular indeterminate color="primary" />
      </VCardText>
    </VCard>
  </div>

  <!-- محتوى تسجيل الدخول للمستخدمين غير المسجلين -->
  <div v-else>
    <a href="javascript:void(0)">
      <div class="auth-logo d-flex align-center gap-x-3">
        <VNodeRenderer :nodes="themeConfig.app.logo" />
        <h1 class="auth-title">
          {{ themeConfig.app.title }}
        </h1>
      </div>
    </a>

    <a href="javascript:void(0)">
      <div class="auth-logo d-flex align-center gap-x-3">
        <VNodeRenderer :nodes="themeConfig.app.logo" />
        <h1 class="auth-title">
          {{ themeConfig.app.title }}
        </h1>
      </div>
    </a>

    <VRow no-gutters class="auth-wrapper">
      <VCol md="8" class="d-none d-md-flex position-relative">
        <div class="d-flex align-center justify-end w-100 h-100 pa-10 pe-0">
          <VImg max-width="797" :src="authThemeImg" class="auth-illustration" />
        </div>

        <img class="auth-footer-mask" height="360" :src="authThemeMask" />

        <VImg
          :src="tree1"
          alt="tree image"
          height="190"
          width="90"
          class="auth-footer-tree"
        />
      </VCol>

      <VCol
        cols="12"
        md="4"
        class="auth-card-v2 d-flex align-center justify-center"
        style="background-color: rgb(var(--v-theme-surface))"
      >
        <VCard flat :max-width="500" class="mt-12 mt-sm-0 pa-4">
          <VCardText>
            <h4 class="text-h4 mb-1">
              مرحباً بك في
              <span class="text-capitalize">{{ themeConfig.app.title }}!</span>
              👋🏻
            </h4>
            <p class="mb-0">يرجى تسجيل الدخول إلى حسابك لبدء المغامرة</p>
          </VCardText>

          <VCardText>
            <!-- رسالة خطأ -->
            <VAlert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="error = ''"
            >
              {{ error }}
            </VAlert>

            <!-- تسجيل الدخول بالبريد الإلكتروني -->
            <div>
              <VForm @submit.prevent="handleEmailLogin">
                <VRow>
                  <!-- البريد الإلكتروني -->
                  <VCol cols="12">
                    <VTextField
                      v-model="form.email"
                      autofocus
                      label="البريد الإلكتروني"
                      type="email"
                      placeholder="example@email.com"
                      :rules="[(v) => !!v || 'البريد الإلكتروني مطلوب']"
                    />
                  </VCol>

                  <!-- كلمة المرور -->
                  <VCol cols="12">
                    <VTextField
                      v-model="form.password"
                      label="كلمة المرور"
                      placeholder="············"
                      :type="isPasswordVisible ? 'text' : 'password'"
                      autocomplete="password"
                      :append-inner-icon="
                        isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'
                      "
                      @click:append-inner="
                        isPasswordVisible = !isPasswordVisible
                      "
                      :rules="[(v) => !!v || 'كلمة المرور مطلوبة']"
                    />

                    <div
                      class="d-flex align-center flex-wrap justify-space-between my-5 gap-2"
                    >
                      <VCheckbox v-model="form.remember" label="تذكرني" />
                      <a class="text-primary" href="javascript:void(0)">
                        نسيت كلمة المرور؟
                      </a>
                    </div>

                    <VBtn
                      block
                      type="submit"
                      :loading="isLoading"
                      :disabled="isLoading"
                    >
                      تسجيل الدخول
                    </VBtn>
                    <br />
                    <!-- Google Sign-In Button -->
                    <div
                      id="google-signin-button"
                      class="google-signin-wrapper"
                    ></div>
                  </VCol>
                </VRow>
              </VForm>
            </div>

            <!-- رابط إنشاء حساب جديد -->
            <VCol cols="12" class="text-center text-base mt-6">
              <span>جديد على منصتنا؟</span>
              <a class="text-primary d-inline-block" href="javascript:void(0)">
                إنشاء حساب جديد
              </a>
            </VCol>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
  <!-- إغلاق div للمستخدمين غير المسجلين -->
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";

.login-method-selector {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;

  .v-btn {
    min-inline-size: 140px;
  }
}

.google-login-container {
  text-align: center;
}

.google-signin-wrapper {
  display: flex;
  justify-content: center;
  margin-block-start: 16px;

  // تحسين مظهر زر Google
  iframe {
    border-radius: 8px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 10%) !important;
  }
}

// تحسين مظهر أزرار اختيار طريقة تسجيل الدخول
.v-btn--variant-elevated {
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.3);
}

// تحسين مظهر النموذج
.v-text-field {
  .v-field__input {
    text-align: end;
  }
}

// تحسين مظهر رسائل الخطأ
.v-alert {
  border-radius: 8px;
}

.google-login-container .v-alert {
  text-align: end;
}
</style>
