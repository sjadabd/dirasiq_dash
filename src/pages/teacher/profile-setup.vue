<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// متغيرات النموذج
const form = ref({
  phone: "",
  address: "",
  bio: "",
  experienceYears: 0,
  country: "",
  city: "",
  state: "",
  zipcode: "",
  streetName: "",
  suburb: "",
});

const isLoading = ref(false);
const error = ref("");
const success = ref("");

// بيانات المستخدم من localStorage
const user = ref(null);

onMounted(() => {
  // جلب بيانات المستخدم من localStorage
  const userData = localStorage.getItem("user");
  if (userData) {
    user.value = JSON.parse(userData);
    // ملء البيانات الموجودة
    if (user.value) {
      form.value.phone = user.value.phone || "";
      form.value.address = user.value.address || "";
      form.value.bio = user.value.bio || "";
      form.value.experienceYears = user.value.experienceYears || 0;
      form.value.country = user.value.country || "";
      form.value.city = user.value.city || "";
      form.value.state = user.value.state || "";
      form.value.zipcode = user.value.zipcode || "";
      form.value.streetName = user.value.streetName || "";
      form.value.suburb = user.value.suburb || "";
    }
  } else {
    // إذا لم توجد بيانات المستخدم، توجيه للصفحة الرئيسية
    router.push("/login");
  }
});

// دالة حفظ البيانات
const saveProfile = async () => {
  if (!form.value.phone || !form.value.address) {
    error.value = "يرجى ملء جميع الحقول المطلوبة";
    return;
  }

  isLoading.value = true;
  error.value = "";
  success.value = "";

  try {
    // محاكاة طلب للسيرفر
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // في الواقع، ستقوم بإرسال البيانات للسيرفر
    // const response = await fetch('/api/teacher/profile', {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': localStorage.getItem('accessToken')
    //   },
    //   body: JSON.stringify(form.value)
    // })

    // const result = await response.json()

    success.value = "تم حفظ البيانات بنجاح";

    // تحديث بيانات المستخدم في localStorage
    if (user.value) {
      user.value = { ...user.value, ...form.value };
      localStorage.setItem("user", JSON.stringify(user.value));
    }

    // توجيه للصفحة الرئيسية بعد 2 ثانية
    setTimeout(() => {
      router.push("/teacher/dashboard");
    }, 2000);
  } catch (err) {
    console.error("Error saving profile:", err);
    error.value = "خطأ في حفظ البيانات. يرجى المحاولة مرة أخرى.";
  } finally {
    isLoading.value = false;
  }
};

// دالة تخطي (للمستخدمين الذين يريدون إكمال البيانات لاحقاً)
const skipSetup = () => {
  router.push("/teacher/dashboard");
};
</script>

<template>
  <div class="profile-setup-container">
    <VContainer max-width="800">
      <VRow justify="center">
        <VCol cols="12" md="8">
          <VCard elevation="2" class="pa-6">
            <VCardTitle class="text-center mb-6">
              <VIcon size="48" color="primary" class="mb-4"
                >mdi-account-edit</VIcon
              >
              <h2 class="text-h4">إكمال الملف الشخصي</h2>
              <p class="text-body-1 text-medium-emphasis mt-2">
                مرحباً {{ user?.name }}! يرجى إكمال بياناتك الشخصية للاستفادة من
                جميع الميزات
              </p>
            </VCardTitle>

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

              <!-- رسالة نجاح -->
              <VAlert
                v-if="success"
                type="success"
                variant="tonal"
                class="mb-4"
              >
                <VIcon start>mdi-check-circle</VIcon>
                {{ success }}
              </VAlert>

              <VForm @submit.prevent="saveProfile">
                <VRow>
                  <!-- معلومات أساسية -->
                  <VCol cols="12">
                    <h3 class="text-h6 mb-4">المعلومات الأساسية</h3>
                  </VCol>

                  <!-- رقم الهاتف -->
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.phone"
                      label="رقم الهاتف"
                      placeholder="+966 50 123 4567"
                      :rules="[(v) => !!v || 'رقم الهاتف مطلوب']"
                      required
                    />
                  </VCol>

                  <!-- سنوات الخبرة -->
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model.number="form.experienceYears"
                      label="سنوات الخبرة"
                      type="number"
                      min="0"
                      max="50"
                      :rules="[
                        (v) =>
                          v >= 0 || 'يجب أن تكون القيمة أكبر من أو تساوي 0',
                      ]"
                    />
                  </VCol>

                  <!-- العنوان -->
                  <VCol cols="12">
                    <VTextarea
                      v-model="form.address"
                      label="العنوان"
                      placeholder="اكتب عنوانك الكامل"
                      rows="3"
                      :rules="[(v) => !!v || 'العنوان مطلوب']"
                      required
                    />
                  </VCol>

                  <!-- نبذة شخصية -->
                  <VCol cols="12">
                    <VTextarea
                      v-model="form.bio"
                      label="نبذة شخصية"
                      placeholder="اكتب نبذة عن نفسك وخبراتك"
                      rows="4"
                    />
                  </VCol>

                  <!-- معلومات الموقع -->
                  <VCol cols="12">
                    <h3 class="text-h6 mb-4">معلومات الموقع (اختيارية)</h3>
                  </VCol>

                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.country"
                      label="البلد"
                      placeholder="السعودية"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.city"
                      label="المدينة"
                      placeholder="الرياض"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.state"
                      label="المنطقة"
                      placeholder="منطقة الرياض"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.zipcode"
                      label="الرمز البريدي"
                      placeholder="12345"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.streetName"
                      label="اسم الشارع"
                      placeholder="شارع الملك فهد"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="form.suburb"
                      label="الحي"
                      placeholder="حي النخيل"
                    />
                  </VCol>

                  <!-- أزرار العمل -->
                  <VCol cols="12" class="text-center mt-6">
                    <VBtn
                      type="submit"
                      color="primary"
                      size="large"
                      :loading="isLoading"
                      :disabled="isLoading"
                      class="me-4"
                    >
                      <VIcon start>mdi-content-save</VIcon>
                      حفظ البيانات
                    </VBtn>

                    <VBtn
                      variant="outlined"
                      size="large"
                      @click="skipSetup"
                      :disabled="isLoading"
                    >
                      <VIcon start>mdi-skip-next</VIcon>
                      تخطي الآن
                    </VBtn>
                  </VCol>
                </VRow>
              </VForm>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<style scoped>
.profile-setup-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-block-size: 100vh;
  padding-block: 2rem;
  padding-inline: 0;
}

.v-card {
  border-radius: 16px;
}

.v-text-field,
.v-textarea {
  margin-block-end: 1rem;
}

.v-btn {
  min-inline-size: 150px;
}
</style>
