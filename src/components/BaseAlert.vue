<template>
  <v-dialog
    v-model="dialogModel"
    max-width="500"
    persistent
    transition="dialog-transition"
    class="message-dialog"
  >
    <v-card
      :class="[
        'message-card',
        `message-card--${type}`,
        'elevation-24',
        'rounded-xl',
      ]"
      style="overflow: visible"
    >
      <!-- Background Pattern -->
      <div class="background-pattern">
        <div
          class="pattern-circle pattern-circle--1"
          :style="{
            background: `radial-gradient(circle, ${getTypeColor()}20 0%, transparent 70%)`,
          }"
        ></div>
        <div
          class="pattern-circle pattern-circle--2"
          :style="{
            background: `radial-gradient(circle, ${getTypeColor()}10 0%, transparent 70%)`,
          }"
        ></div>
      </div>

      <!-- Decorative Elements -->
      <div class="decorative-elements">
        <div
          class="deco-dot deco-dot--1"
          :style="{ backgroundColor: getTypeColor() }"
        ></div>
        <div
          class="deco-dot deco-dot--2"
          :style="{ backgroundColor: getTypeColor() }"
        ></div>
        <div
          class="deco-dot deco-dot--3"
          :style="{ backgroundColor: getTypeColor() }"
        ></div>
      </div>

      <!-- Close Button -->
      <v-btn
        v-if="closable"
        icon
        size="small"
        variant="text"
        class="close-btn"
        @click="closeDialog"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <v-card-text class="text-center pa-8 position-relative">
        <!-- Icon Section -->
        <div class="icon-container mb-6">
          <div
            class="icon-wrapper"
            :style="{
              background: `linear-gradient(135deg, ${getTypeColor()}15, ${getTypeColor()}05)`,
              border: `3px solid ${getTypeColor()}30`,
            }"
          >
            <v-icon
              :icon="getTypeIcon()"
              size="48"
              :color="getTypeColor()"
              class="icon-main"
            ></v-icon>
          </div>
        </div>

        <!-- Title -->
        <h3 class="dialog-title mb-4">
          {{ title || getDefaultTitle() }}
        </h3>

        <!-- Message -->
        <p class="dialog-message mb-6">
          {{ message }}
        </p>

        <!-- Action Button -->
        <div v-if="closable" class="action-section">
          <v-btn
            :color="getTypeColor()"
            variant="elevated"
            size="large"
            rounded="pill"
            class="action-btn px-8"
            @click="closeDialog"
          >
            <v-icon start>mdi-check</v-icon>
            {{ closeText || "إغلاق" }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "info",
    validator: (value) =>
      ["success", "error", "warning", "info"].includes(value),
  },
  title: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  closable: {
    type: Boolean,
    default: true,
  },
  closeText: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const typeConfig = {
  success: {
    icon: "mdi-check-circle",
    color: "#4CAF50",
    title: "تم بنجاح!",
  },
  error: {
    icon: "mdi-close-circle",
    color: "#F44336",
    title: "حدث خطأ!",
  },
  warning: {
    icon: "mdi-alert-circle",
    color: "#FF9800",
    title: "تحذير!",
  },
  info: {
    icon: "mdi-information",
    color: "#2196F3",
    title: "معلومة مهمة",
  },
};

const getTypeIcon = () => typeConfig[props.type]?.icon || typeConfig.info.icon;
const getTypeColor = () =>
  typeConfig[props.type]?.color || typeConfig.info.color;
const getDefaultTitle = () =>
  typeConfig[props.type]?.title || typeConfig.info.title;

const closeDialog = () => {
  dialogModel.value = false;
  emit("close");
};
</script>

<style scoped>
.message-dialog :deep(.v-overlay__content) {
  margin: 24px;
}

.message-card {
  position: relative;
  overflow: hidden !important;
  border: 2px solid rgba(255, 255, 255, 10%);
  backdrop-filter: blur(10px);
}

.message-card--success {
  background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
}

.message-card--error {
  background: linear-gradient(135deg, #ffebee 0%, #fce4ec 100%);
}

.message-card--warning {
  background: linear-gradient(135deg, #fff8e1 0%, #fffde7 100%);
}

.message-card--info {
  background: linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%);
}

.background-pattern {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
}

.pattern-circle {
  position: absolute;
  border-radius: 50%;
  block-size: 200px;
  inline-size: 200px;
}

.pattern-circle--1 {
  inset-block-start: -50px;
  inset-inline-end: -50px;
}

.pattern-circle--2 {
  inset-block-end: -50px;
  inset-inline-start: -50px;
}

.decorative-elements {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
}

.deco-dot {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
}

.deco-dot--1 {
  block-size: 8px;
  inline-size: 8px;
  inset-block-start: 16px;
  inset-inline-end: 16px;
}

.deco-dot--2 {
  block-size: 4px;
  inline-size: 4px;
  inset-block-start: 24px;
  inset-inline-end: 32px;
  opacity: 0.4;
}

.deco-dot--3 {
  block-size: 12px;
  inline-size: 12px;
  inset-block-end: 16px;
  inset-inline-start: 16px;
  opacity: 0.3;
}

.close-btn {
  position: absolute;
  z-index: 10;
  background: rgba(255, 255, 255, 90%) !important;
  inset-block-start: 8px;
  inset-inline-start: 8px;
}

.icon-container {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: center;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  block-size: 80px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 10%);
  inline-size: 80px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-wrapper:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 15%);
  transform: scale(1.1);
}

.icon-main {
  transition: all 0.3s ease;
}

.dialog-title {
  position: relative;
  z-index: 3;
  margin: 0;
  color: #1a1a1a;
  font-size: 1.5rem;
  font-weight: 700;
}

.dialog-message {
  position: relative;
  z-index: 3;
  margin: 0;
  color: #666;
  font-size: 1rem;
  line-height: 1.6;
}

.action-section {
  position: relative;
  z-index: 3;
}

.action-btn {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 10%);
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 15%);
  transform: translateY(-2px);
}

/* Animation Classes */
.dialog-transition-enter-active,
.dialog-transition-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-transition-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

.dialog-transition-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

/* RTL Support */
[dir="rtl"] .close-btn {
  inset-inline: auto 8px;
}

[dir="rtl"] .deco-dot--1 {
  inset-inline: 16px auto;
}

[dir="rtl"] .deco-dot--2 {
  inset-inline: 32px auto;
}

[dir="rtl"] .deco-dot--3 {
  inset-inline: auto 16px;
}

/* Dark Theme Support */
.v-theme--dark .message-card--success {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
}

.v-theme--dark .message-card--error {
  background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%);
}

.v-theme--dark .message-card--warning {
  background: linear-gradient(135deg, #e65100 0%, #ef6c00 100%);
}

.v-theme--dark .message-card--info {
  background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
}

.v-theme--dark .dialog-title {
  color: #fff;
}

.v-theme--dark .dialog-message {
  color: #ccc;
}
</style>
