<template>
  <VDialog v-model="dialog" max-width="900px">
    <VCard>
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-add-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">إضافة</h3>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VContainer>
          <VForm ref="noteForm">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.name"
                  :rules="rules.required"
                  label="اسم الباقة"
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.maxStudents"
                  :rules="rules.required"
                  label="عدد الطلاب"
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.price"
                  :rules="rules.required"
                  label="المبلغ"
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.durationDays"
                  :rules="rules.required"
                  label="عدد الأيام"
                  outlined
                />
              </VCol>
              <VCol cols="12" md="12">
                <VTextarea
                  v-model="formData.description"
                  :rules="rules.required"
                  label="وصف الباقة"
                  outlined
                />
              </VCol>
            </VRow>
          </VForm>
        </VContainer>
      </VCardText>
      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn
          color="grey"
          variant="outlined"
          @click="closeDialog"
          :disabled="loading"
        >
          <VIcon start>ri-close-line</VIcon>
          الغاء
        </VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          @click="saveNote"
          variant="elevated"
        >
          <VIcon start>ri-save-line</VIcon>
          حفظ
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
    
    <script>
import adminApi from "@/api/admin/admin_api";

export default {
  name: "AddStudyYearDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Object,
      required: true,
    },
  },
  emits: ["update:modelValue", "close", "dataAdded", "error", "showAlert"],
  data() {
    return {
      loading: false,
      isDragOver: false,
      formData: {
        name: null,
        description: null,
        maxStudents: null,
        price: null,
        durationDays: null,
        isFree: false,
      },
    };
  },
  created() {
    this.formData = this.data;
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
      return {
        required: [(value) => !!value || "هذا الحقل مطلوب"],
      };
    },
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.resetForm();
      }
    },
  },
  methods: {
    resetForm() {
      this.formData = {
        id: null,
        name: null,
        description: null,
        maxStudents: null,
        price: null,
        durationDays: null,
        isFree: false,
      };
      this.isDragOver = false;
    },
    closeDialog() {
      this.resetForm();
      this.$emit("close");
    },
    async saveNote() {
      const { valid } = await this.$refs.noteForm.validate();
      if (!valid) return;

      this.loading = true;

      try {
        const bankData = {
          name: this.formData.name,
          description: this.formData.description,
          maxStudents: this.formData.maxStudents,
          price: this.formData.price,
          durationDays: this.formData.durationDays,
          isFree: this.formData.isFree,
        };

        const response = await adminApi.editSubscriptionPackage(
          this.formData.id,
          bankData
        );

        this.$emit(
          "showAlert",
          "success",
          response.data.message || "تم تعديل الباقة بنجاح"
        );

        this.$emit("dataAdded", response.data.message);
        this.closeDialog();
      } catch (error) {
        let errorMessage = "حدث خطأ أثناء تعديل الباقة";

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
</style>
    