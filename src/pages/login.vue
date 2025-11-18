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
import { useRoute, useRouter } from "vue-router";

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

// ✅ إنشاء حساب معلم
const handleRegisterTeacher = async () => {
  try {
    error.value = ''
    isRegisterLoading.value = true
    const f = registerForm.value

    // تحقق مبسّط من الحقول المطلوبة
    if (!f.name || !f.email || !f.password || !f.confirmPassword || !f.phone || !f.address || !f.bio || f.experienceYears === null || f.experienceYears === undefined || !Array.isArray(f.gradeIds) || !f.gradeIds.length || !f.studyYear) {
      error.value = 'يرجى تعبئة جميع الحقول المطلوبة'
      return
    }
    // كلمة المرور: أحرف أو أرقام فقط بطول لا يقل عن 6
    const pwOk = /^[A-Za-z0-9]{6,}$/.test(f.password)
    if (!pwOk) {
      error.value = 'كلمة المرور يجب أن تكون 6 رموز على الأقل من أحرف أو أرقام'
      return
    }
    if (f.password !== f.confirmPassword) {
      error.value = 'تأكيد كلمة المرور غير مطابق'
      return
    }

    const payload = {
      name: f.name,
      email: f.email,
      password: f.password,
      phone: f.phone,
      address: f.address,
      bio: f.bio,
      experienceYears: Number(f.experienceYears) || 0,
      gradeIds: f.gradeIds,
      studyYear: f.studyYear,
    }

    if (referralCode.value) {
      payload.referralCode = referralCode.value
    }

    const res = await Auth.registerTeacher(payload)
    const ok = res?.data?.success || res?.success
    const msg = res?.data?.message || res?.data?.errors?.[0] || res?.message || 'تم إنشاء الحساب بنجاح'
    if (ok) {
      // تحويل المستخدم مباشرة إلى صفحة التحقق
      registerForm.value.password = ''
      await router.push({ path: '/verify-email', query: { email: f.email } })
    } else {
      error.value = msg || 'تعذر إنشاء الحساب'
    }
  } catch (e) {
    console.error('Register teacher failed:', e)
    const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0] || e?.message
    error.value = msg || 'حدث خطأ أثناء إنشاء الحساب'
  } finally {
    isRegisterLoading.value = false
  }
}

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
const route = useRoute();
const form = ref({ email: "", password: "", remember: false });
const isPasswordVisible = ref(false);
const isLoading = ref(false);
const error = ref("");
const isUserAuthenticated = ref(false);
const activeAuthTab = ref('login') // 'login' | 'register'
const showStudentAppDialog = ref(false)
const referralCode = ref('')
// Registration state
const registerForm = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  bio: '',
  experienceYears: 0,
  gradeIds: [],
  studyYear: ''
})
const gradesOptions = ref([])
const isRegisterLoading = ref(false)

// Forgot/Reset Password state
const forgotDialog = ref(false)
const resetDialog = ref(false)
const forgotEmail = ref('')
const resetForm = ref({ email: '', newPassword: '', confirmPassword: '', code: '', resetToken: '' })

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

      if (userData?.userType === 'student') {
        showStudentAppDialog.value = true
        return
      }

      localStorage.setItem("isProfileComplete", isProfileComplete);
      localStorage.setItem('content_url', response.data.content_url)
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
    } else {
      // عرض رسالة الخطأ القادمة من الخادم عندما success=false
      const msg = response?.data?.message || response?.data?.errors?.[0]
      error.value = msg || 'خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.'
    }
  } catch (err) {
    try {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0] || err?.message || ''
      const email = form.value.email
      if (typeof msg === 'string' && msg.includes('غير مفعل')) {
        return await router.push({ path: '/verify-email', query: { email } })
      }
      if (msg) error.value = msg
      else error.value = "خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى."
    } catch {
      error.value = "خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى."
    }
    console.error("Login error:", err);
  } finally {
    isLoading.value = false;
  }
};

// ✅ تسجيل الدخول باستخدام Google
const handleGoogleLogin = async (response) => {
  try {
    const token = response.credential;
    if (token) {
      const playerId = await getOneSignalPlayerId();
      console.log("playerId", playerId)

      const res = await Auth.loginInGoogele({
        idToken: token,
        oneSignalPlayerId: playerId,
        // دعم إحالات المعلمين عبر Google: نمرر referralCode إن وُجد
        referralCode: referralCode.value || undefined,
      });

      if (res.data.success) {
        const {
          user: userData,
          token: accessToken,
          requiresProfileCompletion,
          isProfileComplete,
        } = res.data.data;

        if (userData?.userType === 'student') {
          showStudentAppDialog.value = true
          return
        }

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
      } else {
        // عرض رسالة الخطأ القادمة من الخادم عندما success=false
        const msg = res?.data?.message || res?.data?.errors?.[0]
        error.value = msg || 'خطأ في تسجيل الدخول بـ Google'
      }
    }
  } catch (err) {
    console.error("Google login error:", err);
    const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0] || err?.message
    error.value = msg || "خطأ في تسجيل الدخول بـ Google";
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
  // Prefill email from query if present
  try {
    const qEmail = route?.query?.email
    if (qEmail) form.value.email = String(qEmail)
    const qRef = route?.query?.ref
    if (qRef) referralCode.value = String(qRef)
  } catch { }

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



  const signinBtn = document.getElementById("google-signin-button");
  if (signinBtn) {
    google.accounts.id.renderButton(signinBtn, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 300,
    });
  }
  const signupBtn = document.getElementById("google-signup-button");
  if (signupBtn) {
    google.accounts.id.renderButton(signupBtn, {
      theme: "outline",
      size: "large",
      text: "signup_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 300,
    });
  }
});

// Helper: load grades for registration
const loadGrades = async () => {
  try {
    const res = await (await import('@/api/teacher/teacher_api')).default.getAllGradess()
    const payload = res?.data?.data ? res.data : res
    const items = Array.isArray(payload?.data) ? payload.data : []
    gradesOptions.value = items.map(g => ({ title: g.name || g.gradeName || g.title, value: g.id }))
  } catch (e) { console.warn('Failed to load grades', e) }
}

onMounted(() => {
  // prefill study year like 2025-2026
  try {
    const now = new Date();
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    registerForm.value.studyYear = `${y}-${y + 1}`
  } catch { }
  loadGrades()
})

// نسيت كلمة المرور: طلب إرسال رمز إعادة التعيين
const handleRequestPasswordReset = async () => {
  try {
    error.value = ''
    if (!forgotEmail.value) {
      error.value = 'يرجى إدخال البريد الإلكتروني'
      return
    }
    isLoading.value = true
    const res = await Auth.requestPasswordReset({ email: forgotEmail.value })
    const ok = res?.data?.success || res?.success
    const msg = res?.data?.message || res?.message || 'تم إرسال رمز إعادة التعيين إلى بريدك'
    if (ok) {
      forgotDialog.value = false
      resetForm.value.email = forgotEmail.value
      resetDialog.value = true
    } else {
      error.value = msg || 'تعذر إرسال رمز إعادة التعيين'
    }
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message
    error.value = msg || 'تعذر إرسال رمز إعادة التعيين'
  } finally {
    isLoading.value = false
  }
}

// إعادة تعيين كلمة المرور
const handleResetPassword = async () => {
  try {
    error.value = ''
    const f = resetForm.value
    if (!f.email || !f.newPassword || !f.confirmPassword || (!f.code && !f.resetToken)) {
      error.value = 'يرجى تعبئة جميع الحقول المطلوبة'
      return
    }
    const pwOk = /^[A-Za-z0-9]{6,}$/.test(f.newPassword)
    if (!pwOk) { error.value = 'كلمة المرور يجب أن تكون 6 رموز على الأقل من أحرف أو أرقام'; return }
    if (f.newPassword !== f.confirmPassword) { error.value = 'تأكيد كلمة المرور غير مطابق'; return }
    isLoading.value = true
    const payload = { email: f.email, newPassword: f.newPassword }
    if (f.code) payload.code = String(f.code)
    if (f.resetToken) payload.resetToken = String(f.resetToken)
    const res = await Auth.resetPassword(payload)
    const ok = res?.data?.success || res?.success
    const msg = res?.data?.message || res?.message || 'تمت إعادة تعيين كلمة المرور بنجاح'
    if (ok) {
      resetDialog.value = false
      await router.push({ path: '/login', query: { email: f.email } })
    } else {
      error.value = msg || 'تعذر إعادة تعيين كلمة المرور'
    }
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message
    error.value = msg || 'تعذر إعادة تعيين كلمة المرور'
  } finally {
    isLoading.value = false
  }
}
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
        <VCard flat :max-width="580" class="mt-12 mt-sm-0 pa-4">
          <VCardText class="text-center py-8">
            <div class="mb-6">
              <h4 class="text-h4 font-weight-bold mb-2">
                👋🏻 مرحباً بك في <span class="text-primary">{{ themeConfig.app.title }}</span>
              </h4>
              <p class="text-body-1 text-medium-emphasis">
                الدخول أو إنشاء حساب جديد للمعلمين
              </p>
            </div>

            <div class="d-flex flex-column flex-sm-row align-center justify-center gap-3">
              <VBtn value="login" size="large" color="primary" variant="flat" class="px-8 text-white text-subtitle-1"
                @click="activeAuthTab = 'login'">
                تسجيل الدخول
              </VBtn>

              <VBtn value="register" size="large" color="secondary" variant="outlined" class="px-8  text-subtitle-1"
                @click="activeAuthTab = 'register'">
                إنشاء حساب معلم
              </VBtn>
            </div>
          </VCardText>
          <VCardText>
            <VAlert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
              {{ error }}
            </VAlert>

            <div v-if="activeAuthTab === 'login'">
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
                    <div class="d-flex justify-space-between mt-3">
                      <VBtn variant="text" size="small" @click="forgotDialog = true">نسيت كلمة المرور؟</VBtn>
                      <VBtn variant="text" size="small" :to="{ path: '/verify-email', query: { email: form.email } }">
                        تفعيل الحساب</VBtn>
                    </div>
                  </VCol>
                </VRow>
              </VForm>
            </div>

            <div v-else>
              <VForm @submit.prevent="handleRegisterTeacher">
                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField v-model="registerForm.name" label="الاسم الكامل" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model="registerForm.email" label="البريد الإلكتروني" type="email" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model="registerForm.password" label="كلمة المرور"
                      :type="isPasswordVisible ? 'text' : 'password'"
                      :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                      @click:append-inner="isPasswordVisible = !isPasswordVisible" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model="registerForm.confirmPassword" label="تأكيد كلمة المرور"
                      :type="isPasswordVisible ? 'text' : 'password'"
                      :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                      @click:append-inner="isPasswordVisible = !isPasswordVisible" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model="registerForm.phone" label="رقم الهاتف" />
                  </VCol>
                  <VCol cols="12">
                    <VTextField v-model="registerForm.address" label="العنوان" />
                  </VCol>
                  <VCol cols="12">
                    <VTextarea v-model="registerForm.bio" label="نبذة عنك" rows="3" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField v-model.number="registerForm.experienceYears" label="سنوات الخبرة" type="number"
                      min="0" />
                  </VCol>
                  <!-- <VCol cols="12" md="6">
                    <VTextField v-model="registerForm.studyYear" label="السنة الدراسية (YYYY-YYYY)" />
                  </VCol> -->
                  <VCol cols="12">
                    <VSelect v-model="registerForm.gradeIds" :items="gradesOptions" item-title="title"
                      item-value="value" label="المراحل الدراسية" multiple chips />
                  </VCol>
                  <VCol cols="12">
                    <VBtn block type="submit" :loading="isRegisterLoading">إنشاء حساب معلم</VBtn>
                    <br />
                    <div id="google-signup-button" class="google-signin-wrapper"></div>
                  </VCol>
                </VRow>
              </VForm>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Student must use mobile app dialog -->
    <VDialog v-model="showStudentAppDialog" max-width="520">
      <VCard>
        <VCardTitle>تسجيل الدخول للطلاب</VCardTitle>
        <VCardText>
          <p class="mb-4">
            لا يمكن للطلاب تسجيل الدخول من المتصفح. للمتابعة، يرجى استخدام تطبيق ملهم على الجوال.
          </p>
          <p class="mb-4">
            قم بتحميل التطبيق من الروابط التالية:
          </p>
          <div class="d-flex flex-column gap-2">
            <VBtn color="primary" variant="elevated" href="https://apps.apple.com/us/app/mulhimiq/id6754453929"
              target="_blank">
              تحميل من App Store
            </VBtn>
            <VBtn color="success" variant="elevated" href="#" target="_blank">
              تحميل من Google Play
            </VBtn>
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="showStudentAppDialog = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Forgot Password Dialog -->
    <VDialog v-model="forgotDialog" max-width="520">
      <VCard>
        <VCardTitle>نسيت كلمة المرور</VCardTitle>
        <VCardText>
          <VTextField v-model="forgotEmail" type="email" label="البريد الإلكتروني" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="forgotDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="isLoading" @click="handleRequestPasswordReset">إرسال الرمز</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Reset Password Dialog -->
    <VDialog v-model="resetDialog" max-width="560">
      <VCard>
        <VCardTitle>إعادة تعيين كلمة المرور</VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12">
              <VTextField v-model="resetForm.email" type="email" label="البريد الإلكتروني" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="resetForm.newPassword" label="كلمة المرور الجديدة"
                :type="isPasswordVisible ? 'text' : 'password'"
                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="isPasswordVisible = !isPasswordVisible" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="resetForm.confirmPassword" label="تأكيد كلمة المرور"
                :type="isPasswordVisible ? 'text' : 'password'"
                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="isPasswordVisible = !isPasswordVisible" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="resetForm.code" label="رمز التحقق (6 أرقام)" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="resetForm.resetToken" label="رمز بديل (إن وجد)" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="resetDialog = false">إلغاء</VBtn>
          <VBtn color="primary" :loading="isLoading" @click="handleResetPassword">تعيين كلمة المرور</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>


<style lang="scss">
@use "@core/scss/template/pages/page-auth";

.login-method-selector {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
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

.auth-toggle {
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-variant));
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
