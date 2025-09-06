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
              <VCol cols="12" md="12">
                <VTextField
                  v-model="formData.year"
                  :rules="rules.required"
                  label="اسم السنة"
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
  },
  emits: ["update:modelValue", "close", "dataAdded", "error", "showAlert"],
  data() {
    return {
      loading: false,
      isDragOver: false,
      formData: {
        year: null,
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
        year: null,
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
          year: this.formData.year,
        };

        const response = await adminApi.createAcademicYear(bankData);

        this.$emit(
          "showAlert",
          "success",
          response.data.message || "تم إضافة السنة بنجاح"
        );

        this.$emit("dataAdded", response.data.message);
        this.closeDialog();
      } catch (error) {
        let errorMessage = "حدث خطأ أثناء إضافة السنة";

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
