<script setup>
import Auth from "@/api/auth/auth_api.js";
import logo from "@/assets/images/logo.png";
import { useAuth } from "@/composables/useAuth.js";
import tree1 from "@images/misc/tree1.png";
import authV2LoginIllustrationBorderedDark from "@images/pages/auth-v2-login-illustration-bordered-dark.png";
import authV2LoginIllustrationBorderedLight from "@images/pages/auth-v2-login-illustration-bordered-light.png";
import authV2LoginIllustrationDark from "@images/pages/auth-v2-login-illustration-dark.png";
import authV2LoginIllustrationLight from "@images/pages/auth-v2-login-illustration-light.png";
import authV2MaskDark from "@images/pages/mask-v2-dark.png";
import authV2MaskLight from "@images/pages/mask-v2-light.png";
import { themeConfig } from "@themeConfig";
import { useRouter } from "vue-router";

// ✅ دالة محدثة لجلب playerId من OneSignal
// ✅ نسخة محسّنة تمنع التهيئة المكررة وتعمل على public domain
const getOneSignalPlayerId = async () => {
  return new Promise(async (resolve) => {
    try {
      if (!window.OneSignal) {
        console.error("❌ OneSignal SDK not loaded");
        resolve(null);
        return;
      }

      // ✅ منع التهيئة المكررة
      if (!window.OneSignalInitialized) {
        console.log("🚀 Initializing OneSignal...");
        await window.OneSignal.init({
          appId: "b136e33d-56f0-4fc4-ad08-8c8a534ca447",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
        window.OneSignalInitialized = true;
      } else {
        console.log("⚠️ OneSignal already initialized, skipping init()");
      }

      // ✅ طلب الإذن بالإشعارات
      await window.OneSignal.Notifications.requestPermission();

      // ✅ ننتظر اشتراك المستخدم في الإشعارات
      const subscription = await window.OneSignal.User.PushSubscription;
      if (!subscription) {
        console.warn("⚠️ PushSubscription object not available yet");
        resolve(null);
        return;
      }

      // انتظار الـ playerId إن لم يُولَد بعد
      if (!subscription.id) {
        console.log("🕐 Waiting for OneSignal to generate playerId...");
        await new Promise((r) => setTimeout(r, 2000));
      }

      const playerId = subscription.id || (await window.OneSignal.getUserId());
      console.log("🎯 Final PlayerID:", playerId);

      resolve(playerId || null);
    } catch (err) {
      console.error("❌ Error getting Player ID:", err);
      resolve(null);
    }
  });
};

// إعداد الصور والثيم
const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true
);
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark);

definePage({
  meta: { layout: "blank", public: true },
});

const router = useRouter();
const form = ref({ email: "", password: "", remember: false });
const isPasswordVisible = ref(false);
const isLoading = ref(false);
const error = ref("");
const isUserAuthenticated = ref(false);
const loginMethod = ref("email");

const { login } = useAuth();

// ✅ التحقق من المستخدم المسجل مسبقًا
const checkUserAuth = () => {
  const userData = localStorage.getItem("user");
  const token = localStorage.getItem("accessToken");

  if (userData && token) {
    isUserAuthenticated.value = true;
    const user = JSON.parse(userData);
    redirectBasedOnUserType(user, false);
    return true;
  }
  isUserAuthenticated.value = false;
  return false;
};

// ✅ التوجيه حسب نوع المستخدم
const redirectBasedOnUserType = (userData, requiresProfileCompletion) => {
  const userType = userData.userType;
  switch (userType) {
    case "teacher":
      router.push(requiresProfileCompletion ? "/teacher/profile-setup" : "/teacher/dashboard");
      break;
    case "student":
      router.push(requiresProfileCompletion ? "/student/profile-setup" : "/student/dashboard");
      break;
    case "admin":
    case "super_admin":
      router.push("/admin/dashboard");
      break;
    default:
      router.push("/");
  }
};

// ✅ تسجيل الدخول بالبريد الإلكتروني
const handleEmailLogin = async () => {
  if (!form.value.email || !form.value.password) {
    error.value = "يرجى ملء جميع الحقول المطلوبة";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    const playerId = await getOneSignalPlayerId();

    const data = {
      email: form.value.email,
      password: form.value.password,
      oneSignalPlayerId: playerId,
    };

    const response = await Auth.login(data);

    if (response.data.success) {
      const {
        user: userData,
        token: accessToken,
        requiresProfileCompletion,
        isProfileComplete,
      } = response.data.data;

      localStorage.setItem("isProfileComplete", isProfileComplete);
      localStorage.setItem('content_url', res.data.content_url)
      login(userData, accessToken);

      // ✅ ربط المستخدم في OneSignal بعد تسجيل الدخول
      try {
        if (window.OneSignalInitialized && userData?.id) {
          try {
            await window.OneSignal.login(userData.id);
            console.log("✅ OneSignal linked with external_id:", userData.id);
          } catch (e) {
            console.warn("⚠️ Failed to link OneSignal user:", e);
          }
        }

        console.log("✅ OneSignal linked with external_id:", userData.id);
      } catch (e) {
        console.warn("⚠️ Failed to link OneSignal user:", e);
      }

      redirectBasedOnUserType(userData, requiresProfileCompletion);
    }
  } catch (err) {
    error.value = "خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.";
    console.error("Login error:", err);
  } finally {
    isLoading.value = false;
  }
};

// ✅ تسجيل الدخول باستخدام Google
const handleGoogleLogin = async (response) => {
  try {
    const token = response.credential;
    const decodedToken = decodeJWT(token);

    if (decodedToken) {
      const playerId = await getOneSignalPlayerId();
      console.log("playerId", playerId)

      const res = await Auth.loginInGoogele({
        ...decodedToken,
        oneSignalPlayerId: playerId,
      });

      if (res.data.success) {
        const {
          user: userData,
          token: accessToken,
          requiresProfileCompletion,
          isProfileComplete,
        } = res.data.data;

        localStorage.setItem("isProfileComplete", isProfileComplete);
        localStorage.setItem('content_url', res.data.content_url)
        login(userData, accessToken);

        // ✅ ربط المستخدم مع OneSignal
        try {
          if (window.OneSignalInitialized && userData?.id) {
            try {
              await window.OneSignal.login(userData.id);
              console.log("✅ OneSignal linked with external_id:", userData.id);
            } catch (e) {
              console.warn("⚠️ Failed to link OneSignal user:", e);
            }
          }

          console.log("✅ OneSignal linked with external_id:", userData.id);
        } catch (e) {
          console.warn("⚠️ Failed to link OneSignal user:", e);
        }

        redirectBasedOnUserType(userData, requiresProfileCompletion);
      }
    }
  } catch (err) {
    console.error("Google login error:", err);
    error.value = "خطأ في تسجيل الدخول بـ Google";
  }
};

// 🔐 فك ترميز Google JWT
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

// ✅ تهيئة Google Sign-In
onMounted(async () => {
  if (checkUserAuth()) return;
  await nextTick();

  const google = window.google;
  if (!google?.accounts?.id) {
    console.error("❌ Google API not loaded.");
    return;
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("❌ Google Client ID not found in .env");
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleLogin,
    ux_mode: "popup",
    auto_select: false,
    use_fedcm_for_prompt: false,
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
  }
});
</script>

<template>
  <!-- المحتوى كما هو بدون تعديل -->
  <!-- ✅ نفس التصميم السابق -->
  <div v-if="isUserAuthenticated" class="d-flex align-center justify-center min-vh-100">
    <VCard max-width="400" class="pa-6 text-center">
      <VCardText>
        <VIcon size="64" color="success" class="mb-4">ri-checkbox-circle-line</VIcon>
        <h3 class="text-h5 mb-2">أنت مسجل دخول بالفعل</h3>
        <p class="text-body-1 mb-4">سيتم توجيهك إلى لوحة التحكم...</p>
        <VProgressCircular indeterminate color="primary" />
      </VCardText>
    </VCard>
  </div>

  <div v-else>
    <a href="javascript:void(0)">
      <div class="auth-logo d-flex align-center gap-x-3">
        <img style="
    background-color: white;inline-size: 60px;" :src="logo" />
        <h1 class="auth-title">{{ themeConfig.app.title }}</h1>
      </div>
    </a>

    <VRow no-gutters class="auth-wrapper">
      <VCol md="8" class="d-none d-md-flex position-relative">
        <div class="d-flex align-center justify-end w-100 h-100 pa-10 pe-0">
          <VImg max-width="797" :src="authThemeImg" class="auth-illustration" />
        </div>
        <img class="auth-footer-mask" height="360" :src="authThemeMask" />
        <VImg :src="tree1" alt="tree image" height="190" width="90" class="auth-footer-tree" />
      </VCol>

      <VCol cols="12" md="4" class="auth-card-v2 d-flex align-center justify-center"
        style="background-color: rgb(var(--v-theme-surface));">
        <VCard flat :max-width="500" class="mt-12 mt-sm-0 pa-4">
          <VCardText>
            <h4 class="text-h4 mb-1">مرحباً بك في {{ themeConfig.app.title }} 👋🏻</h4>
            <p class="mb-0">يرجى تسجيل الدخول إلى حسابك لبدء المغامرة</p>
          </VCardText>

          <VCardText>
            <VAlert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
              {{ error }}
            </VAlert>

            <VForm @submit.prevent="handleEmailLogin">
              <VRow>
                <VCol cols="12">
                  <VTextField v-model="form.email" autofocus label="البريد الإلكتروني" type="email"
                    placeholder="example@email.com" />
                </VCol>
                <VCol cols="12">
                  <VTextField v-model="form.password" label="كلمة المرور"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                    @click:append-inner="isPasswordVisible = !isPasswordVisible" />
                  <VBtn block type="submit" :loading="isLoading">تسجيل الدخول</VBtn>
                  <br />
                  <div id="google-signin-button" class="google-signin-wrapper"></div>
                </VCol>
              </VRow>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
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
