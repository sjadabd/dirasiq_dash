<template>
  <v-container fluid class="min-height-screen pa-8" style="
  background:
    linear-gradient(
      135deg,
      rgba(16, 185, 129, 5%) 0%,
      rgba(255, 255, 255, 100%) 50%,
      rgba(34, 197, 94, 5%) 100%
    );
">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <!-- Header -->
        <div class="text-center mb-8">
          <v-avatar size="96" class="mb-4" variant="elevated">
            <img v-if="avatarPreviewSrc" style="inline-size: 100px;" :src="avatarPreviewSrc" alt="Teacher Avatar" />
            <v-icon v-else size="48" color="primary">mdi-account</v-icon>
          </v-avatar>
          <h1 class="text-h3 font-weight-bold mb-2">إعداد ملف الشخصي</h1>
          <p class="text-h6 text-medium-emphasis">
            يرجى إكمال البيانات التالية لإنشاء ملف الشخصي
          </p>
        </div>

        <v-form ref="form">
          <!-- Alerts -->
          <v-alert v-if="error" type="error" variant="tonal" class="mb-6" closable @click:close="error = ''">
            {{ error }}
          </v-alert>

          <v-alert v-if="success" type="success" variant="tonal" class="mb-6" closable @click:close="success = ''">
            {{ success }}
          </v-alert>

          <!-- Personal Information -->
          <v-card class="mb-6" elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="me-2">mdi-account</v-icon>
              المعلومات الشخصية
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <div class="d-flex align-center flex-wrap ga-4">
                    <v-avatar size="72">
                      <img v-if="avatarPreviewSrc" style="inline-size: 100px;" :src="avatarPreviewSrc"
                        alt="Teacher Avatar" />
                      <v-icon v-else size="36">mdi-account</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-body-2 mb-2">صورة الملف الشخصي (اختياري)</div>
                      <v-file-input accept="image/*" variant="outlined" density="comfortable" show-size
                        prepend-icon="mdi-image" label="اختر صورة" @change="onAvatarSelected" />
                      <div class="text-caption text-medium-emphasis mt-1">يدعم: PNG, JPG. الحجم الموصى به أقل من 2MB.
                      </div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.name" label="اسم الكامل *" placeholder="أدخل اسم الكامل"
                    variant="outlined" :rules="[rules.required]" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.phone" label="رقم الهاتف *" placeholder="أدخل رقم الهاتف"
                    variant="outlined" :rules="[rules.required]" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.gender" label="الجنس *" :items="genderOptions" item-title="text"
                    item-value="value" variant="outlined" :rules="[rules.required]" required />
                </v-col>
                <v-col cols="12" md="6">
                  <AppDateTimePicker id="invoiceStartDate" v-model="formData.birthDate" label="تاريخ الميلاد *"
                    variant="outlined" :rules="[rules.required]" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.experienceYears" label="سنوات الخبرة *" variant="outlined"
                    :rules="[rules.required]" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.address" label="العنوان *" variant="outlined"
                    :rules="[rules.required]" required />
                </v-col>
                <v-col cols="12" md="12">
                  <v-textarea v-model="formData.bio" label="نبذة عن نفسك *" variant="outlined" :rules="[rules.required]"
                    required />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Academic Information -->
          <v-card class="mb-6" elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="me-2">mdi-school-outline</v-icon>
              المعلومات الأكاديمية
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-autocomplete v-model="formData.gradeIds" label="الصفوف التي تدرسها *" :items="grades"
                    item-title="name" item-value="id" variant="outlined" :rules="[rules.required]" chips multiple
                    required />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Added Video Upload Editor Component -->
          <VideoUploadEditor @upload-success="handleVideoUploadSuccess" class="mb-6" />

          <!-- Location Selection -->
          <MapPicker :initial-lat="formData.latitude" :initial-lng="formData.longitude"
            @location-update="handleLocationUpdate" class="mb-6" />
        </v-form>

        <!-- Submit Button -->
        <div class="text-center pt-6">
          <v-btn type="submit" color="primary" size="large" :loading="isLoading" :disabled="isLoading"
            @click="handleSubmit" class="px-12">
            <v-icon start>mdi-school</v-icon>
            حفظ بيانات
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import TeacherApi from "@/api/teacher/teacher_api";
import VideoUploadEditor from "@/components/teacher/VideoUploadEditor.vue";

export default {
  name: "StudentProfileForm",

  components: {
    VideoUploadEditor,
  },

  data() {
    return {
      user: localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : {},
      form: null,
      isLoading: false,
      error: "",
      success: "",
      formData: {
        name: "",
        phone: "",
        studyYear: localStorage.getItem("studyYear")
          ? JSON.parse(localStorage.getItem("studyYear"))
          : null,
        bio: "",
        experienceYears: "",
        gradeIds: [],
        address: "",
        gender: null,
        birthDate: null,
        latitude: 31.2001,
        longitude: 29.9187,
        profileImageBase64: null,
      },
      grades: [],
      genderOptions: [
        { text: "ذكر", value: "male" },
        { text: "أنثى", value: "female" },
      ],
      rules: {
        required: (value) => !!value || "هذا الحقل مطلوب",
        phone: (value) => {
          const pattern = /^[0-9]{10,15}$/;
          return pattern.test(value) || "رقم الهاتف غير صحيح";
        },
      },
      avatarPreviewSrc: null,
    };
  },

  created() {
    this.getAllGrades();
    this.formData.name = this.user.name;
    this.formData.phone = this.user.phone;
    this.formData.bio = this.user.bio;
    this.formData.experienceYears = this.user.experienceYears;
    this.formData.address = this.user.address;
    this.formData.gender = this.user.gender;
    this.formData.latitude = this.user.location?.latitude
      ? parseFloat(this.user.location.latitude)
      : 31.2001;

    this.formData.longitude = this.user.location?.longitude
      ? parseFloat(this.user.location.longitude)
      : 29.9187;
    this.formData.birthDate = this.user.birthDate;
    if (this.user.teacherGrades && this.user.teacherGrades.length) {
      this.formData.gradeIds = this.user.teacherGrades.map((g) => g.gradeId);
    }

    if (this.user?.profileImagePath) {
      const contentUrl = localStorage.getItem('content_url') || '';
      const img = this.user.profileImagePath.trim();

      if (img.startsWith('data:image/')) {
        this.avatarPreviewSrc = img;
      }
      else if (img.startsWith('http')) {
        this.avatarPreviewSrc = img;
      }
      else {
        this.avatarPreviewSrc = `${contentUrl}${img.startsWith('/') ? '' : '/'}${img}`;
      }
    }
  },

  methods: {
    handleLocationUpdate(coords) {
      this.formData.latitude = coords.latitude;
      this.formData.longitude = coords.longitude;
    },

    async onAvatarSelected(files) {
      try {
        const file = Array.isArray(files) ? files[0] : files?.target?.files?.[0] || files;
        if (!file) return;
        const base64 = await this.fileToBase64(file);
        this.formData.profileImageBase64 = base64;
        this.avatarPreviewSrc = base64;
      } catch (e) {
        console.error('avatar select error', e);
        this.error = 'تعذر قراءة الصورة المختارة';
      }
    },

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    handleVideoUploadSuccess(response) {
      this.success = "تم رفع الفيديو بنجاح! سيتم معالجته قريباً.";
      console.log("Video upload response:", response);
    },

    validateForm() {
      if (!this.formData.name.trim()) return "اسم الطالب مطلوب";
      if (!this.formData.phone.trim()) return "رقم هاتف مطلوب";
      if (!this.formData.bio.trim()) return "النبذة مطلوبة";
      if (!this.formData.experienceYears && this.formData.experienceYears !== 0)
        return "سنوات الخبرة مطلوبة";
      if (!this.formData.gradeIds || !this.formData.gradeIds.length)
        return "الصف الدراسي مطلوب";
      if (!this.formData.address.trim()) return "العنوان مطلوب";
      if (!this.formData.gender) return "الجنس مطلوب";
      if (!this.formData.birthDate) return "تاريخ الميلاد مطلوب";
      return null;
    },

    async getAllGrades() {
      try {
        const response = await TeacherApi.getAllGrades();
        this.grades = response.data.data;
      } catch (err) {
        console.error("Error saving profile:", err);
        this.error =
          err.response?.data?.message ||
          "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.";
      } finally {
        this.isLoading = false;
      }
    },

    async handleSubmit() {
      const { valid } = await this.$refs.form.validate();
      if (!valid) return;

      const validationError = this.validateForm();
      if (validationError) {
        this.error = validationError;
        return;
      }

      this.isLoading = true;
      this.error = "";
      this.success = "";

      try {
        const payload = { ...this.formData };
        const response = await TeacherApi.completeProfile(payload);

        if (response.status === 200 || response.status === 201) {
          const updatedUser = response.data.data.user || this.formData;
          localStorage.setItem("user", JSON.stringify(updatedUser));
          localStorage.setItem(
            "isProfileComplete",
            response.data.data.isProfileComplete
          );

          this.success = "تم حفظ بيانات المعلم بنجاح!";

          this.$router.push("/teacher/dashboard");
        }
      } catch (err) {
        console.error("Error saving profile:", err);
        this.error =
          err.response?.data?.message ||
          "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.";
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.min-height-screen {
  min-block-size: 100vh;
}
</style>
