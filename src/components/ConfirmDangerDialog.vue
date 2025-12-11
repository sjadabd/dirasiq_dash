<template>
  <VDialog v-model="visible" max-width="600px" persistent>
    <VCard rounded="lg" elevation="10">
      <!-- Dialog Header -->
      <VCardTitle class="d-flex align-center pa-4 bg-error-lighten-5">
        <VIcon color="error" size="36" class="mr-3" v-if="!hideIcon">mdi-alert-octagon</VIcon>
        <span class="text-h6 font-weight-bold text-error">{{ title }}</span>
      </VCardTitle>

      <!-- Dialog Content -->
      <VCardText class="pa-6">
        <v-card class="pa-4 text-center" style="
            background-color: #f5a0111f;
            border-inline-start: 4px solid rgb(var(--v-theme-warning));
" elevation="2" rounded="lg">
          <div style="
              display: flex;
              flex-direction: column;
              align-items: flex-start;
">
            <v-icon size="48" color="warning" class="mb-2">mdi-alert</v-icon>
            <ul class="pl-4" style="list-style-type: disclosure-closed; margin-inline: 15px;">
              <li v-for="(msg, index) in messages" :key="index" class="text-body-3 mb-1">
                {{ msg }}
              </li>
            </ul>
          </div>
        </v-card>

        <!-- Confirm Checkbox (اختياري) -->
        <VCheckbox v-if="showCheckbox" v-model="confirmChecked" :label="checkboxLabel" :color="checkboxColor"
          density="compact" hide-details class="mt-4" />
      </VCardText>

      <!-- Dialog Actions -->
      <VCardActions class="pa-4 border-t d-flex justify-end">
        <VBtn variant="text" @click="closeDialog">اغلاق</VBtn>
        <VBtn color="error" :disabled="(showCheckbox && !confirmChecked) || isDeleting" @click="confirmDelete">
          <Transition name="delete-icon-transition" mode="out-in">
            <VIcon :key="isDeleting ? 'empty' : 'full'" class="mr-2 delete-icon-animated">
              {{
                isDeleting
                  ? confirmIconActive || "mdi-delete-empty"
                  : confirmIcon || "mdi-delete"
              }}
            </VIcon>
          </Transition>
          {{ confirmButtonText }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: "Confirm Deletion" },
  messages: { type: Array, default: () => [] },
  confirmButtonText: { type: String, default: "Delete Permanently" },
  hideIcon: { type: Boolean, default: false },
  checkboxColor: { type: String, default: "error" },
  showCheckbox: { type: Boolean, default: true },
  checkboxLabel: {
    type: String,
    default: "أفهم التحذير وأؤكد الحذف",
  },
  confirmIcon: { type: String, default: "" },
  confirmIconActive: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "confirm"]);

const visible = ref(props.modelValue);
const confirmChecked = ref(false);
const isDeleting = ref(false); // حالة جديدة للتحكم في حركة الأيقونة

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
    if (!val) {
      confirmChecked.value = false; // إعادة تعيين عند إغلاق الحوار
      isDeleting.value = false; // إعادة تعيين حالة الحركة
    }
  }
);

watch(visible, (val) => {
  emit("update:modelValue", val);
});

function closeDialog() {
  visible.value = false;
}

async function confirmDelete() {
  if (!confirmChecked.value || isDeleting.value) return;

  isDeleting.value = true;
  // تأخير بسيط للسماح لحركة الأيقونة بالظهور قبل إغلاق الحوار
  await new Promise((resolve) => setTimeout(resolve, 400)); // يمكن تعديل المدة حسب الحاجة

  emit("confirm");
  closeDialog(); // سيؤدي هذا إلى إعادة تعيين isDeleting عبر الـ watch على modelValue
}
</script>

<style scoped>
/* تصميم عام للحوار */
.v-card-title {
  border-block-end:
    1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* انتقال أيقونة زر الحذف */
.delete-icon-transition-enter-active,
.delete-icon-transition-leave-active {
  transition: all 0.3s ease-in-out;
}

.delete-icon-transition-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.8);
  /* حركة دخول من الأعلى مع تصغير */
}

.delete-icon-transition-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.8);
  /* حركة خروج للأسفل مع تصغير */
}

/* الأيقونة المتحركة (لا تحتاج @keyframes منفصلة هنا لأن Transition تتعامل معها) */
.delete-icon-animated {
  /* هذا يضمن أن الأيقونة تبدأ من حالتها الطبيعية قبل الانتقال */
  transform: translateY(0) rotate(0deg);
  transition: transform 0.3s ease-out;
}
</style>
