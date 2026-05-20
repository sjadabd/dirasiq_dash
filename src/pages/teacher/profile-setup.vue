<script setup>
// =====================================================
// Teacher Profile Setup v2 — rebuilt 2026-05-17.
// Matches the dashboard v2 design language:
//   navy + orange + sky · Cairo · ri-* icons · live preview rail
// Preserves every business-logic dependency from v1:
//   • TeacherApi.getAllGrades  → academic grades select
//   • TeacherApi.completeProfile → POST profile + redirect to dashboard
//   • VideoUploadEditor component (intro video upload)
//   • MapPicker component (location)
//   • AppDateTimePicker component (birth date)
// =====================================================

import TeacherApi from "@/api/teacher/teacher_api";
import VideoUploadEditor from "@/components/teacher/VideoUploadEditor.vue";
import axiosInstance from "@/utils/axios";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// ---- Source: hydrate from localStorage user ------------------------------
const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
})();
const contentUrl = ref(localStorage.getItem("content_url") || "");

// ---- Reactive state ------------------------------------------------------
const formRef = ref(null);
const isLoading = ref(false);
const error = ref("");
const success = ref("");

const formData = ref({
  name: storedUser.name || "",
  phone: storedUser.phone || "",
  studyYear: (() => {
    try { return JSON.parse(localStorage.getItem("studyYear")); } catch { return null; }
  })(),
  bio: storedUser.bio || "",
  experienceYears: storedUser.experienceYears ?? "",
  gradeIds: Array.isArray(storedUser.teacherGrades) ? storedUser.teacherGrades.map(g => g.gradeId) : [],
  address: storedUser.address || "",
  gender: storedUser.gender || null,
  birthDate: storedUser.birthDate || null,
  latitude: parseFloat(storedUser?.location?.latitude) || 33.3152,
  longitude: parseFloat(storedUser?.location?.longitude) || 44.3661,
  profileImageBase64: null,
});

const grades = ref([]);
const gradesLoading = ref(false);

const genderOptions = [
  { text: "ذكر", value: "male" },
  { text: "أنثى", value: "female" },
];

// Vuetify rule contract: each rule must return exactly `true` or a `string`
// (the error message). Returning a number/array/etc throws "X is not a valid
// value." — that's the source of the console error on the multi-select.
const rules = {
  required: (v) => {
    if (v === null || v === undefined || v === "") return "هذا الحقل مطلوب";
    return true;
  },
  phone: (v) => /^[0-9]{10,15}$/.test(String(v ?? "")) || "رقم الهاتف يجب أن يكون 10-15 رقم",
  positiveInt: (v) => {
    if (v === null || v === undefined || v === "") return "يجب أن يكون رقماً موجباً";
    const n = Number(v);
    if (Number.isNaN(n) || n < 0) return "يجب أن يكون رقماً موجباً";
    return true;
  },
  gradesRequired: (v) => {
    if (Array.isArray(v) && v.length > 0) return true;
    return "اختر صفاً واحداً على الأقل";
  },
};

// Avatar preview
const avatarPreviewSrc = ref(null);

function resolveAsset(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = (contentUrl.value || axiosInstance?.defaults?.baseURL?.replace(/\/api\/?$/, "") || "")
    .replace(/\/+$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}

if (storedUser?.profileImagePath) {
  avatarPreviewSrc.value = resolveAsset(storedUser.profileImagePath);
}

// ---- Derived: progress / completion % ------------------------------------
const requiredFields = ["name", "phone", "gender", "birthDate", "experienceYears", "address", "bio"];
const completionPercent = computed(() => {
  let done = 0;
  for (const f of requiredFields) {
    const v = formData.value[f];
    if (v !== null && v !== undefined && String(v).trim() !== "") done++;
  }
  if (Array.isArray(formData.value.gradeIds) && formData.value.gradeIds.length) done++;
  if (formData.value.latitude && formData.value.longitude) done++;
  // Total = 7 required text fields + grades + location = 9
  return Math.round((done / 9) * 100);
});

const selectedGradeNames = computed(() => {
  if (!Array.isArray(formData.value.gradeIds) || !formData.value.gradeIds.length) return [];
  return grades.value
    .filter(g => formData.value.gradeIds.includes(g.id))
    .map(g => g.name);
});

const genderLabel = computed(() =>
  (genderOptions.find(o => o.value === formData.value.gender)?.text) || "—"
);

// ---- Helpers --------------------------------------------------------------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function onAvatarSelected(files) {
  try {
    const file = Array.isArray(files) ? files[0] : files?.target?.files?.[0] || files;
    if (!file) return;
    const base64 = await fileToBase64(file);
    formData.value.profileImageBase64 = base64;
    avatarPreviewSrc.value = base64;
  } catch (e) {
    console.error("avatar select error:", e);
    error.value = "تعذّر قراءة الصورة المختارة";
  }
}

function handleLocationUpdate(coords) {
  formData.value.latitude = coords.latitude;
  formData.value.longitude = coords.longitude;
}

function handleVideoUploadSuccess() {
  success.value = "تم رفع الفيديو بنجاح! سيتم معالجته قريباً.";
}

function validateForm() {
  const f = formData.value;
  if (!f.name?.trim()) return "اسم المعلم مطلوب";
  if (!f.phone?.trim()) return "رقم الهاتف مطلوب";
  if (!/^[0-9]{10,15}$/.test(f.phone)) return "رقم الهاتف يجب أن يكون 10-15 رقم";
  if (!f.bio?.trim()) return "النبذة الشخصية مطلوبة";
  if (f.experienceYears === null || f.experienceYears === undefined || f.experienceYears === "") return "سنوات الخبرة مطلوبة";
  if (Number.isNaN(Number(f.experienceYears)) || Number(f.experienceYears) < 0) return "سنوات الخبرة يجب أن تكون رقماً موجباً";
  if (!Array.isArray(f.gradeIds) || !f.gradeIds.length) return "اختر صفاً دراسياً واحداً على الأقل";
  if (!f.address?.trim()) return "العنوان مطلوب";
  if (!f.gender) return "الجنس مطلوب";
  if (!f.birthDate) return "تاريخ الميلاد مطلوب";
  return null;
}

// ---- Data loaders ---------------------------------------------------------
async function loadGrades() {
  gradesLoading.value = true;
  try {
    const res = await TeacherApi.getAllGrades();
    const payload = res?.data?.data ?? res?.data ?? [];
    grades.value = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
  } catch (e) {
    console.warn("Failed to load grades:", e);
    error.value = e?.response?.data?.message || "تعذّر تحميل قائمة الصفوف";
  } finally {
    gradesLoading.value = false;
  }
}

async function handleSubmit() {
  // Native validate first (Vuetify rules)
  if (formRef.value?.validate) {
    const { valid } = await formRef.value.validate();
    if (!valid) {
      error.value = "يرجى تصحيح الحقول الناقصة في النموذج";
      return;
    }
  }

  const ve = validateForm();
  if (ve) { error.value = ve; return; }

  isLoading.value = true;
  error.value = "";
  success.value = "";

  try {
    const payload = { ...formData.value };
    const response = await TeacherApi.completeProfile(payload);

    if (response.status === 200 || response.status === 201) {
      const updatedUser = response.data?.data?.user || payload;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("isProfileComplete", response.data?.data?.isProfileComplete ?? true);
      success.value = "تم حفظ بياناتك بنجاح! جارٍ التوجيه للوحة التحكم…";
      setTimeout(() => router.push("/teacher/dashboard"), 900);
    }
  } catch (err) {
    console.error("Error saving profile:", err);
    error.value = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message
      || "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.";
  } finally {
    isLoading.value = false;
  }
}

// ---- Lifecycle ------------------------------------------------------------
onMounted(() => {
  loadGrades();
});
</script>

<template>
  <div class="profile-setup">
    <!-- 1. HERO ============================================== -->
    <VCard class="hero-card mb-4" elevation="0" rounded="lg">
      <div class="hero-mesh" />
      <VCardItem class="position-relative">
        <VRow align="center" class="g-3">
          <VCol cols="12" md="8">
            <div class="d-flex align-center gap-3 flex-wrap">
              <VAvatar size="64" color="warning" class="hero-avatar">
                <VIcon size="32" color="white">ri-user-settings-line</VIcon>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="hero-greet">إعداد ملفك الشخصي</div>
                <h1 class="hero-name">أكمل بياناتك لبدء استقبال الطلاب</h1>
                <div class="hero-sub">
                  املأ المعلومات أدناه. كلما اكتمل ملفك، زادت ثقة الطلاب بك وفرص حصولك على حجوزات.
                </div>
              </div>
            </div>
          </VCol>
          <VCol cols="12" md="4" class="text-md-end">
            <VBtn color="white" variant="text" prepend-icon="ri-arrow-right-line"
              to="/teacher/dashboard" class="back-link">
              عودة للوحة التحكم
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- Alerts (sticky on top) -->
    <VAlert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">
      {{ error }}
    </VAlert>
    <VAlert v-if="success" type="success" variant="tonal" closable class="mb-4" @click:close="success = ''">
      {{ success }}
    </VAlert>

    <!-- 2. MAIN GRID ========================================== -->
    <VRow dense>
      <!-- LEFT: form sections -->
      <VCol cols="12" lg="8">
        <VForm ref="formRef">
          <!-- Section 1: Personal -->
          <VCard class="panel mb-4" elevation="0" rounded="lg" border>
            <VCardTitle class="panel-head">
              <div class="panel-step">1</div>
              <VIcon color="primary" class="me-2">ri-user-line</VIcon>
              <span>المعلومات الشخصية</span>
            </VCardTitle>
            <VDivider />
            <VCardItem>
              <!-- Avatar uploader -->
              <div class="avatar-uploader">
                <VAvatar size="84" class="avatar-shadow" color="grey-lighten-3">
                  <img v-if="avatarPreviewSrc" :src="avatarPreviewSrc" alt="avatar" class="avatar-preview-img" />
                  <VIcon v-else size="36" color="grey-darken-1">ri-user-3-line</VIcon>
                </VAvatar>
                <div class="flex-grow-1">
                  <div class="uploader-title">الصورة الشخصية <span class="uploader-optional">(اختياري)</span></div>
                  <VFileInput accept="image/*" variant="outlined" density="comfortable" show-size
                    prepend-icon="" prepend-inner-icon="ri-image-add-line"
                    label="اختر صورة من جهازك" hide-details
                    @change="onAvatarSelected" />
                  <div class="uploader-hint">
                    <VIcon size="14" class="me-1">ri-information-line</VIcon>
                    PNG أو JPG · يفضّل أقل من 2 ميجابايت · مربعة الشكل للنتيجة الأفضل
                  </div>
                </div>
              </div>

              <VDivider class="my-4" />

              <VRow dense>
                <VCol cols="12" md="6">
                  <VTextField v-model="formData.name" label="الاسم الكامل *" placeholder="مثال: أحمد محمد"
                    prepend-inner-icon="ri-user-line" variant="outlined" density="comfortable" color="primary"
                    :rules="[rules.required]" />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField v-model="formData.phone" label="رقم الهاتف *" placeholder="07700000000"
                    prepend-inner-icon="ri-phone-line" variant="outlined" density="comfortable" color="primary"
                    :rules="[rules.required, rules.phone]" />
                </VCol>
                <VCol cols="12" md="6">
                  <VSelect v-model="formData.gender" label="الجنس *" :items="genderOptions"
                    item-title="text" item-value="value" prepend-inner-icon="ri-user-2-line"
                    variant="outlined" density="comfortable" color="primary" :rules="[rules.required]" />
                </VCol>
                <VCol cols="12" md="6">
                  <AppDateTimePicker id="birth-date" v-model="formData.birthDate" label="تاريخ الميلاد *"
                    variant="outlined" density="comfortable" prepend-inner-icon="ri-calendar-line"
                    :rules="[rules.required]" />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField v-model="formData.experienceYears" label="سنوات الخبرة *" placeholder="مثال: 5"
                    type="number" min="0" prepend-inner-icon="ri-medal-line"
                    variant="outlined" density="comfortable" color="primary"
                    :rules="[rules.required, rules.positiveInt]" />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField v-model="formData.address" label="العنوان *" placeholder="بغداد - الكرادة"
                    prepend-inner-icon="ri-map-pin-line" variant="outlined" density="comfortable" color="primary"
                    :rules="[rules.required]" />
                </VCol>
                <VCol cols="12">
                  <VTextarea v-model="formData.bio" label="نبذة عن نفسك *"
                    placeholder="معلم رياضيات وفيزياء بخبرة 10 سنوات في تدريس المراحل المتوسطة والإعدادية..."
                    prepend-inner-icon="ri-file-text-line" variant="outlined" density="comfortable"
                    color="primary" rows="4" auto-grow counter="500" maxlength="500"
                    :rules="[rules.required]" />
                </VCol>
              </VRow>
            </VCardItem>
          </VCard>

          <!-- Section 2: Academic -->
          <VCard class="panel mb-4" elevation="0" rounded="lg" border>
            <VCardTitle class="panel-head">
              <div class="panel-step">2</div>
              <VIcon color="primary" class="me-2">ri-graduation-cap-line</VIcon>
              <span>المعلومات الأكاديمية</span>
            </VCardTitle>
            <VDivider />
            <VCardItem>
              <VAutocomplete v-model="formData.gradeIds" label="الصفوف الدراسية التي تدرسها *"
                placeholder="ابحث أو اختر من القائمة" prepend-inner-icon="ri-stack-line"
                :items="grades" item-title="name" item-value="id"
                variant="outlined" density="comfortable" color="primary"
                multiple chips closable-chips :loading="gradesLoading"
                :rules="[rules.gradesRequired]"
                no-data-text="لا توجد صفوف متاحة">
                <template #chip="{ props, item }">
                  <VChip v-bind="props" color="primary" variant="tonal" closable class="font-weight-bold">
                    {{ item.raw.name }}
                  </VChip>
                </template>
              </VAutocomplete>
              <div class="field-hint mt-2">
                <VIcon size="14" class="me-1" color="info">ri-information-line</VIcon>
                ستظهر هذه الصفوف للطلاب عند البحث عن معلمين في منطقتك.
              </div>
            </VCardItem>
          </VCard>

          <!-- Section 3: Intro video (external component) -->
          <VCard class="panel mb-4 panel-video" elevation="0" rounded="lg" border>
            <VCardTitle class="panel-head">
              <div class="panel-step">3</div>
              <VIcon color="primary" class="me-2">ri-video-line</VIcon>
              <span>فيديو تعريفي</span>
              <VChip size="x-small" color="grey" variant="tonal" class="ms-2">اختياري</VChip>
            </VCardTitle>
            <VDivider />
            <VCardItem>
              <div class="field-hint mb-3">
                <VIcon size="14" class="me-1" color="info">ri-information-line</VIcon>
                فيديو قصير (دقيقة-دقيقتين) تعرّف فيه عن نفسك ومنهجك التدريسي. يعزّز ثقة الطلاب بك.
              </div>
              <VideoUploadEditor @upload-success="handleVideoUploadSuccess" />
            </VCardItem>
          </VCard>

          <!-- Section 4: Location -->
          <VCard class="panel mb-4 panel-map" elevation="0" rounded="lg" border>
            <VCardTitle class="panel-head">
              <div class="panel-step">4</div>
              <VIcon color="primary" class="me-2">ri-map-pin-line</VIcon>
              <span>الموقع الجغرافي</span>
            </VCardTitle>
            <VDivider />
            <VCardItem>
              <div class="field-hint mb-3">
                <VIcon size="14" class="me-1" color="info">ri-information-line</VIcon>
                اضغط على الخريطة لتحديد موقعك. سيتم استخدامه ليجدك الطلاب القريبون منك.
              </div>
              <MapPicker :initial-lat="formData.latitude" :initial-lng="formData.longitude"
                @location-update="handleLocationUpdate" />
            </VCardItem>
          </VCard>
        </VForm>
      </VCol>

      <!-- RIGHT: live preview + completion summary (sticky on lg+) -->
      <VCol cols="12" lg="4">
        <div class="preview-rail">
          <!-- Completion -->
          <VCard class="panel mb-4" elevation="0" rounded="lg" border>
            <VCardTitle class="panel-head">
              <VIcon color="primary" class="me-2">ri-progress-3-line</VIcon>
              <span>اكتمال الملف</span>
              <VSpacer />
              <VChip size="small" :color="completionPercent >= 100 ? 'success' : completionPercent >= 60 ? 'warning' : 'error'"
                variant="tonal">{{ completionPercent }}%</VChip>
            </VCardTitle>
            <VDivider />
            <VCardItem>
              <VProgressLinear :model-value="completionPercent"
                :color="completionPercent >= 100 ? 'success' : completionPercent >= 60 ? 'warning' : 'error'"
                rounded height="10" />
              <div class="text-caption text-medium-emphasis mt-2">
                {{ completionPercent >= 100
                  ? "ملفك جاهز للحفظ — أضف التغييرات النهائية واضغط حفظ."
                  : completionPercent >= 60
                  ? "أنت قريب من الاكتمال. أكمل الحقول المتبقية."
                  : "ابدأ بتعبئة الحقول الأساسية في الأقسام أعلاه." }}
              </div>
            </VCardItem>
          </VCard>

          <!-- Live preview card -->
          <VCard class="preview-card panel mb-4" elevation="0" rounded="lg" border>
            <VCardTitle class="panel-head">
              <VIcon color="primary" class="me-2">ri-eye-line</VIcon>
              <span>كيف يراك الطلاب</span>
            </VCardTitle>
            <VDivider />
            <VCardItem>
              <div class="preview-header">
                <VAvatar size="76" color="grey-lighten-3">
                  <img v-if="avatarPreviewSrc" :src="avatarPreviewSrc" alt="avatar" class="avatar-preview-img" />
                  <VIcon v-else size="34" color="grey-darken-1">ri-user-3-line</VIcon>
                </VAvatar>
                <div class="preview-id">
                  <h3 class="preview-name">{{ formData.name || "اسم المعلم" }}</h3>
                  <div class="preview-sub">
                    <VIcon size="14" class="me-1">ri-medal-line</VIcon>
                    {{ formData.experienceYears !== "" && formData.experienceYears !== null
                       ? formData.experienceYears + " سنوات خبرة"
                       : "أضف سنوات الخبرة" }}
                  </div>
                </div>
              </div>

              <p class="preview-bio">
                {{ formData.bio || "ستظهر نبذة عنك هنا — اكتب ما يميّز أسلوبك التدريسي ومنهجك مع الطلاب." }}
              </p>

              <div class="preview-tags" v-if="selectedGradeNames.length">
                <VChip v-for="g in selectedGradeNames.slice(0, 4)" :key="g"
                  size="x-small" color="primary" variant="tonal" class="me-1 mb-1">{{ g }}</VChip>
                <VChip v-if="selectedGradeNames.length > 4" size="x-small" variant="tonal" color="grey">
                  +{{ selectedGradeNames.length - 4 }}
                </VChip>
              </div>

              <VDivider class="my-3" />

              <div class="preview-meta">
                <div class="meta-row">
                  <VIcon size="16" color="primary">ri-phone-line</VIcon>
                  <span>{{ formData.phone || "—" }}</span>
                </div>
                <div class="meta-row">
                  <VIcon size="16" color="primary">ri-map-pin-line</VIcon>
                  <span>{{ formData.address || "—" }}</span>
                </div>
                <div class="meta-row">
                  <VIcon size="16" color="primary">ri-user-2-line</VIcon>
                  <span>{{ genderLabel }}</span>
                </div>
                <div class="meta-row">
                  <VIcon size="16" color="primary">ri-calendar-line</VIcon>
                  <span>{{ formData.birthDate || "—" }}</span>
                </div>
              </div>
            </VCardItem>
          </VCard>

          <!-- Help tip -->
          <VCard class="panel tip-card" elevation="0" rounded="lg">
            <VCardItem>
              <div class="d-flex align-center gap-2 mb-2">
                <VIcon color="warning">ri-lightbulb-line</VIcon>
                <span class="font-weight-bold">نصيحة</span>
              </div>
              <div class="text-body-2">
                المعلمون الذين يكملون <strong>الفيديو التعريفي</strong> و <strong>الموقع الجغرافي</strong>
                يحصلون على حجوزات أكثر بنسبة <strong class="text-warning">3 أضعاف</strong>
                مقارنة بالملفات الناقصة.
              </div>
            </VCardItem>
          </VCard>
        </div>
      </VCol>
    </VRow>

    <!-- 3. STICKY SAVE BAR =================================== -->
    <div class="save-bar">
      <div class="save-bar-inner">
        <div class="save-bar-status">
          <VIcon :color="completionPercent >= 100 ? 'success' : 'warning'" size="22">
            {{ completionPercent >= 100 ? "ri-check-double-line" : "ri-error-warning-line" }}
          </VIcon>
          <div>
            <div class="save-bar-title">
              {{ completionPercent >= 100 ? "ملفك مكتمل ✓" : `الإكمال: ${completionPercent}%` }}
            </div>
            <div class="save-bar-sub">
              {{ completionPercent >= 100
                ? "اضغط حفظ للانتقال للوحة التحكم"
                : "أكمل الحقول الإلزامية للحفظ" }}
            </div>
          </div>
        </div>
        <div class="d-flex gap-2 align-center">
          <VBtn variant="text" color="grey-darken-1" to="/teacher/dashboard" :disabled="isLoading">
            إلغاء
          </VBtn>
          <VBtn color="primary" size="large" rounded="lg" :loading="isLoading"
            :disabled="isLoading" class="save-cta" @click="handleSubmit">
            <VIcon start>ri-save-line</VIcon>
            حفظ البيانات
          </VBtn>
        </div>
      </div>
    </div>

    <!-- Bottom spacer so the sticky bar doesn't cover content -->
    <div class="save-bar-spacer" />
  </div>
</template>

<style scoped>
/* =====================================================
   Teacher Profile Setup v2
   Brand: navy #0B2545 · orange #FF8A00 · sky #3FA9F5
   ===================================================== */
.profile-setup { padding-block: 4px; padding-inline: 0; }

/* ---- HERO ---- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #050d1f 0%, #0b2545 55%, #122e54 100%) !important;
  color: white;
}
.hero-mesh {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(40% 80% at 100% 0%, rgba(255, 138, 0, .28), transparent 60%),
    radial-gradient(35% 70% at 0% 100%, rgba(63, 169, 245, .20), transparent 60%);
}
.hero-avatar { box-shadow: 0 10px 24px rgba(255, 138, 0, .35); }
.hero-greet { font-size: .82rem; color: rgba(255, 255, 255, .78); font-weight: 600; }
.hero-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.4rem; font-weight: 900;
  color: white !important; margin: 2px 0 4px;
  letter-spacing: -.01em; line-height: 1.3;
}
.hero-sub {
  color: rgba(255, 255, 255, .82); font-size: .9rem;
  line-height: 1.65; max-inline-size: 60ch;
}
.back-link {
  color: rgba(255, 255, 255, .85) !important;
  font-weight: 700; text-transform: none; letter-spacing: 0;
}
.back-link:hover { color: white !important; background: rgba(255, 255, 255, .08); }

/* ---- Panels ---- */
.panel { background: white; }
.panel-head {
  display: flex; align-items: center;
  padding: 14px 16px !important;
  font-size: 1rem; font-weight: 700; color: #0b2545;
}
.panel-step {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0b2545 0%, #103261 100%);
  color: white; font-weight: 800; font-size: .85rem;
  display: inline-flex; align-items: center; justify-content: center;
  margin-inline-end: 10px;
  box-shadow: 0 4px 10px rgba(11, 37, 69, .25);
}

/* ---- Avatar uploader ---- */
.avatar-uploader {
  display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap;
}
.avatar-shadow { box-shadow: 0 6px 18px rgba(11, 37, 69, .12); }
.avatar-preview-img {
  width: 100%; height: 100%; object-fit: cover;
}
.uploader-title {
  font-weight: 700; color: #0b2545; margin-bottom: 8px; font-size: .95rem;
}
.uploader-optional { color: rgba(11, 37, 69, .55); font-weight: 500; font-size: .82rem; }
.uploader-hint {
  font-size: .76rem; color: rgba(11, 37, 69, .58); margin-top: 6px;
  display: inline-flex; align-items: center;
}

.field-hint {
  font-size: .8rem; color: rgba(11, 37, 69, .65);
  display: inline-flex; align-items: center;
}

/* Override Vuetify field radius to match brand */
:deep(.v-field) { border-radius: 12px; }

/* ---- Preview rail ---- */
.preview-rail { position: sticky; inset-block-start: 16px; }
@media (max-width: 1280px) { .preview-rail { position: static; } }

.preview-card { transition: box-shadow .3s ease; }
.preview-header {
  display: flex; align-items: center; gap: 14px; margin-bottom: 14px;
}
.preview-id { flex: 1; min-width: 0; }
.preview-name {
  font-family: "Cairo", sans-serif;
  font-size: 1.15rem; font-weight: 800; color: #0b2545;
  margin: 0 0 4px;
  letter-spacing: -.01em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.preview-sub {
  font-size: .82rem; color: rgba(11, 37, 69, .65);
  display: inline-flex; align-items: center;
}
.preview-bio {
  font-size: .88rem; color: rgba(11, 37, 69, .8);
  line-height: 1.75; margin: 8px 0 12px;
  background: rgba(11, 37, 69, .035);
  border-inline-start: 3px solid #FF8A00;
  border-radius: 8px;
  padding: 10px 12px;
  display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4;
  -webkit-box-orient: vertical; overflow: hidden;
}
.preview-tags { margin-top: 4px; }
.preview-meta { display: flex; flex-direction: column; gap: 8px; }
.meta-row {
  display: flex; align-items: center; gap: 8px;
  font-size: .85rem; color: rgba(11, 37, 69, .8);
}

/* Tip card */
.tip-card {
  background: linear-gradient(135deg, rgba(255, 138, 0, .08) 0%, rgba(255, 138, 0, .03) 100%) !important;
  border: 1px solid rgba(255, 138, 0, .25) !important;
}

/* ---- Sticky save bar ---- */
.save-bar {
  position: sticky;
  inset-block-end: 0;
  z-index: 50;
  margin-block-start: 12px;
  margin-inline: -8px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, .92);
  backdrop-filter: blur(14px);
  border-block-start: 1px solid rgba(11, 37, 69, .08);
  box-shadow: 0 -8px 28px rgba(11, 37, 69, .06);
}
.save-bar-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.save-bar-status {
  display: flex; align-items: center; gap: 12px;
}
.save-bar-title {
  font-weight: 800; color: #0b2545; font-size: .95rem;
  font-family: "Cairo", sans-serif;
}
.save-bar-sub {
  font-size: .78rem; color: rgba(11, 37, 69, .65);
}
.save-cta {
  font-weight: 800 !important; text-transform: none; letter-spacing: 0;
  padding-inline: 24px !important;
  box-shadow: 0 8px 22px rgba(11, 37, 69, .18);
}
.save-bar-spacer { height: 16px; }

/* Mobile tweaks */
@media (max-width: 600px) {
  .hero-name { font-size: 1.2rem; }
  .save-bar-inner { gap: 10px; }
  .save-cta { width: 100%; }
  .save-bar-status { width: 100%; justify-content: center; text-align: center; }
}
</style>
