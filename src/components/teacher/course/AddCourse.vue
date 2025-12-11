<template>
  <VDialog v-model="dialog" max-width="1000px">
    <VCard>
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-add-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">إضافة كورس جديد</h3>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VContainer>
          <VForm ref="courseForm">
            <VRow>
              <!-- Course Name -->
              <VCol cols="12" md="6">
                <VTextField v-model="formData.course_name" :rules="rules.required" label="اسم الكورس" outlined />
              </VCol>

              <!-- Grade Selection -->
              <VCol cols="12" md="6">
                <VSelect v-model="formData.grade_id" :items="grades" :rules="rules.required" item-title="gradeName"
                  item-value="gradeId" label="المرحلة الدراسية" outlined :loading="loadingGrades" />
              </VCol>

              <!-- Subject Selection -->
              <VCol cols="12" md="6">
                <VSelect v-model="formData.subject_id" :items="subjects" :rules="rules.required" item-title="name"
                  item-value="id" label="المادة" outlined :loading="loadingSubjects" />
              </VCol>

              <!-- Price -->
              <VCol cols="12" md="6">
                <VTextField :model-value="formatMoney(formData.price)"
                  @update:model-value="val => onFormatMoney('price', val)" :rules="rules.price"
                  label="السعر (دينار عراقي)" hint="رجاءً اكتب المبلغ كاملاً مع الأصفار، مثال: 250,000 وليس 250"
                  persistent-hint outlined />
              </VCol>

              <!-- Start Date -->
              <VCol cols="12" md="6">
                <AppDateTimePicker v-model="formData.start_date" :rules="rules.required" label="تاريخ البداية"
                  variant="outlined" />
              </VCol>

              <!-- End Date -->
              <VCol cols="12" md="6">
                <AppDateTimePicker v-model="formData.end_date" :rules="rules.required" label="تاريخ النهاية"
                  variant="outlined" />
              </VCol>

              <!-- Seats Count -->
              <VCol cols="12" md="6">
                <VTextField v-model.number="formData.seats_count" :rules="rules.seats" label="عدد المقاعد" type="number"
                  outlined />
              </VCol>

              <!-- Has Reservation -->
              <VCol cols="12" md="6">
                <VSwitch v-model="formData.has_reservation" inset color="primary" :true-value="true"
                  :false-value="false" label="هل يوجد عربون؟" />
              </VCol>

              <!-- Reservation Amount (shown only if has_reservation) -->
              <VCol cols="12" md="6" v-if="formData.has_reservation">
                <VTextField :model-value="formatMoney(formData.reservation_amount)"
                  @update:model-value="val => onFormatMoney('reservation_amount', val)" :rules="rules.reservation"
                  label="مبلغ العربون (دينار عراقي)"
                  hint="رجاءً اكتب مبلغ العربون كاملاً مع الأصفار، مثال: 100,000 وليس 100" persistent-hint outlined />
              </VCol>

              <!-- Description -->
              <VCol cols="12">
                <VTextarea v-model="formData.description" :rules="rules.required" label="وصف الكورس" outlined
                  rows="3" />
              </VCol>

              <!-- Image Upload -->
              <VCol cols="12">
                <VCard class="pa-4" :class="{ 'drag-over': isDragOver }" @dragover.prevent="isDragOver = true"
                  @dragleave.prevent="isDragOver = false" @drop.prevent="handleDrop">
                  <VCardTitle class="text-subtitle-1 pb-2">
                    <VIcon icon="ri-image-line" class="me-2" />
                    صور الكورس
                  </VCardTitle>

                  <VFileInput v-model="selectedFiles" accept="image/*" multiple label="اختر الصور"
                    prepend-icon="ri-camera-line" variant="outlined" />

                  <!-- Image Preview -->
                  <VRow v-if="imagesPreviews.length > 0" class="mt-4">
                    <VCol v-for="(preview, index) in imagesPreviews" :key="index" cols="6" md="3">
                      <VCard class="position-relative">
                        <VImg :src="preview.url" height="120" cover class="rounded" />
                        <VBtn icon size="small" color="error" class="position-absolute"
                          style="inset-block-start: 8px; inset-inline-end: 8px;" @click="removeImage(index)">
                          <VIcon size="16">ri-close-line</VIcon>
                        </VBtn>
                      </VCard>
                    </VCol>
                  </VRow>
                </VCard>
              </VCol>
            </VRow>
          </VForm>
        </VContainer>
      </VCardText>
      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn color="grey" variant="outlined" @click="closeDialog" :disabled="loading">
          <VIcon start>ri-close-line</VIcon>
          الغاء
        </VBtn>
        <VBtn color="primary" :loading="loading" @click="saveCourse" variant="elevated">
          <VIcon start>ri-save-line</VIcon>
          حفظ الكورس
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script>
import TeacherApi from "@/api/teacher/teacher_api";

export default {
  name: "AddCourseDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "close", "dataAdded", "error", "showAlert"],
  data() {
    return {
      loading: false,
      loadingGrades: false,
      loadingSubjects: false,
      isDragOver: false,
      selectedFiles: [],
      imagesPreviews: [],
      grades: [],
      subjects: [],
      formData: {
        course_name: null,
        grade_id: null,
        subject_id: null,
        description: null,
        start_date: null,
        end_date: null,
        price: null,
        seats_count: null,
        has_reservation: false,
        reservation_amount: null,
      },
    };
  },
  computed: {
    dialog: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      },
    },
    rules() {
      const parseMoneySafely = (v) => {
        if (v === '' || v === null || typeof v === 'undefined') return null
        const cleaned = String(v).replace(/[^0-9.-]/g, '')
        const num = Number(cleaned)
        return isFinite(num) ? num : null
      }
      return {
        required: [(value) => !!value || "هذا الحقل مطلوب"],
        price: [
          (value) => parseMoneySafely(value) != null || "هذا الحقل مطلوب",
          (value) => (parseMoneySafely(value) ?? 0) >= 10000 || "السعر يجب أن لا يقل عن 10000 دينار",
        ],
        seats: [
          (value) => !!value || "هذا الحقل مطلوب",
          (value) => Number(value) > 0 || "عدد المقاعد يجب أن يكون أكبر من صفر",
        ],
        reservation: [
          (value) =>
            !this.formData.has_reservation || parseMoneySafely(value) != null || "هذا الحقل مطلوب",
          (value) =>
            !this.formData.has_reservation || (parseMoneySafely(value) ?? 0) >= 10000 ||
            "مبلغ العربون يجب أن لا يقل عن 10000 دينار",
        ],
      };
    },
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.resetForm();
        this.fetchGrades();
        this.fetchSubjects();
      }
    },
    selectedFiles(newFiles) {
      if (newFiles && newFiles.length > 0) {
        this.imagesPreviews = [];
        this.processFiles(newFiles);
      }
    },
    'formData.has_reservation'(val) {
      if (!val) {
        this.formData.reservation_amount = null;
      }
    },
  },
  created() {
    this.resetForm();
    this.fetchGrades();
    this.fetchSubjects();
  },
  methods: {
    formatMoney(val) {
      if (val === '' || val === null || typeof val === 'undefined') return ''
      const num = Number(val)
      if (!isFinite(num)) return String(val)
      return num.toLocaleString()
    },
    parseMoney(val) {
      if (val === '' || val === null || typeof val === 'undefined') return null
      const cleaned = String(val).replace(/[^0-9.-]/g, '')
      const num = Number(cleaned)
      return isFinite(num) ? num : null
    },
    onFormatMoney(field, val) {
      const num = this.parseMoney(val)
      this.formData[field] = num
    },
    resetForm() {
      this.formData = {
        course_name: null,
        grade_id: null,
        subject_id: null,
        description: null,
        start_date: null,
        end_date: null,
        price: null,
        seats_count: null,
        has_reservation: false,
        reservation_amount: null,
      };
      this.selectedFiles = [];
      this.imagesPreviews = [];
      this.isDragOver = false;
    },

    closeDialog() {
      this.resetForm();
      this.$emit("close");
    },

    async fetchGrades() {
      this.loadingGrades = true;
      try {
        const response = await TeacherApi.getAllMyGrades();
        this.grades = response.data.data.grades || response.data || [];
      } catch (error) {
        this.$emit("showAlert", "error", "خطأ في جلب المراحل الدراسية");
      } finally {
        this.loadingGrades = false;
      }
    },

    async fetchSubjects() {
      this.loadingSubjects = true;
      try {
        const response = await TeacherApi.getAllSubjects();
        this.subjects = response.data.data || response.data || [];
      } catch (error) {
        this.$emit("showAlert", "error", "خطأ في جلب المواد");
      } finally {
        this.loadingSubjects = false;
      }
    },

    handleFileSelect(event) {
      const files = event.target.files;

      if (files && files.length > 0) {
        this.imagesPreviews = [];
        this.processFiles(Array.from(files));
      }
    },
    handleDrop(event) {
      this.isDragOver = false;
      const files = Array.from(event.dataTransfer.files);
      this.selectedFiles = files;
      this.processFiles(files);
    },

    processFiles(files) {
      files.forEach((file, index) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.imagesPreviews.push({
              url: e.target.result,
              base64: e.target.result,
              name: file.name,
            });
          };
          reader.onerror = (error) => {
            console.error("[v0] Error reading file:", error);
          };
          reader.readAsDataURL(file);
        } else {
          console.warn("[v0] Skipped non-image file:", file.name);
        }
      });
    },

    removeImage(index) {
      this.imagesPreviews.splice(index, 1);
      // Also remove from selectedFiles if it exists
      if (this.selectedFiles[index]) {
        this.selectedFiles.splice(index, 1);
      }
    },

    async saveCourse() {
      const { valid } = await this.$refs.courseForm.validate();
      if (!valid) return;

      this.loading = true;

      try {
        // Get study year from localStorage
        const studyYear = JSON.parse(localStorage.getItem("studyYear"));

        const imageBase64Array = this.imagesPreviews.map((img) => img.base64);

        const courseData = {
          study_year: studyYear,
          grade_id: this.formData.grade_id,
          subject_id: this.formData.subject_id,
          course_name: this.formData.course_name,
          course_images: imageBase64Array,
          description: this.formData.description,
          start_date: this.formData.start_date,
          end_date: this.formData.end_date,
          price: this.formData.price != null ? Number(this.formData.price) : null,
          seats_count: this.formData.seats_count,
          has_reservation: this.formData.has_reservation,
          reservation_amount: this.formData.has_reservation
            ? (this.formData.reservation_amount != null ? Number(this.formData.reservation_amount) : null)
            : null,
        };
        const response = await TeacherApi.addCourse(courseData);

        this.$emit("dataAdded", response.data.message);
        this.closeDialog();
      } catch (error) {
        let errorMessage = "حدث خطأ أثناء إضافة الكورس";

        if (error.response?.status === 401) {
          errorMessage = "غير مصرح لك بالعملية";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        this.$emit("showAlert", "error", errorMessage);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.v-btn {
  text-transform: none;
}

.drag-over {
  border: 2px dashed #1976d2 !important;
  background-color: rgba(25, 118, 210, 10%) !important;
}

.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
}
</style>
