<template>
  <!-- :model-value="loading" -->
  <v-overlay
    :model-value="loading"
    class="align-center justify-center"
    persistent
    contained
  >
    <v-card
      class="loading-card d-flex flex-column align-center justify-center pa-8"
      color="surface"
      rounded="xl"
      elevation="12"
      max-width="320"
      style="
        border: none;
        background-color: #fff0 !important;
        color: white !important;
        max-inline-size: 320px;
      "
    >
      <div class="loading-wrapper mb-6">
        <div class="pulse-ring"></div>
        <v-img
          v-if="centerLogoUrl"
          :src="centerLogoUrl"
          alt="Center Logo"
          class="center-image"
          width="100px"
          height="100px"
          cover
        ></v-img>
        <v-icon v-else size="80" color="primary" class="loading-icon">
          mdi-loading
        </v-icon>
      </div>

      <div class="progress-container mb-4">
        <v-progress-linear
          :model-value="progress"
          color="primary"
          height="8"
          rounded
          class="progress-bar"
          striped
          stream
        >
          <template #default>
            <span class="progress-text">{{ progress }}%</span>
          </template>
        </v-progress-linear>
      </div>

      <div class="loading-text">
        جاري تحميل البيانات...
      </div>
    </v-card>
  </v-overlay>
</template>

<script setup>
import { computed, defineProps } from "vue";

const props = defineProps({
  loading: {
    type: Boolean,
    required: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  results: {
    type: Object,
    default: null,
  },
});

const centerLogoUrl = computed(() => {
  if (
    props.results &&
    props.results.center_id &&
    props.results.center_id.logo
  ) {
    const baseUrl =
      props.results.content_url || "https://api.myexperience.center/storage/";
    return `${baseUrl}${props.results.center_id.logo}`;
  }
  return null;
});
</script>

<style scoped>
/* Enhanced loading card with smooth animations */
.loading-card {
  border: 1px solid rgba(255, 255, 255, 20%);
  animation: fadeInScale 0.3s ease-out;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 95%) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Improved loading wrapper with better positioning */
.loading-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: 100px;
  inline-size: 100px;
}

/* Added pulsing ring animation around logo */
.pulse-ring {
  position: absolute;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: pulse 2s infinite;
  block-size: 110px;
  inline-size: 110px;
  opacity: 0.6;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.8);
  }

  50% {
    opacity: 0.3;
    transform: scale(1.1);
  }

  100% {
    opacity: 0.6;
    transform: scale(0.8);
  }
}

/* Enhanced center image styling */
.center-image {
  z-index: 2;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 15%);
  transition: transform 0.3s ease;
}

/* Rotating animation for loading icon */
.loading-icon {
  z-index: 2;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Enhanced progress container */
.progress-container {
  position: relative;
  inline-size: 260px;
}

/* Improved progress bar styling */
.progress-bar {
  overflow: hidden;
  border-radius: 12px !important;
  background: rgba(0, 0, 0, 5%) !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 10%);
}

/* Better progress text styling */
.progress-text {
  position: absolute;
  z-index: 10;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 30%);
  transform: translate(-50%, -50%);
}

/* Enhanced loading text */
.loading-text {
  animation: fadeInUp 0.5s ease-out 0.2s both;
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  opacity: 0.8;
  text-align: center;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 0.8;
    transform: translateY(0);
  }
}

/* Dark theme support */
.v-theme--dark .loading-card {
  border: 1px solid rgba(255, 255, 255, 10%);
  background: rgba(33, 33, 33, 95%) !important;
}

/* Responsive design improvements */
@media (max-width: 480px) {
  .loading-card {
    padding: 1.5rem;
    max-inline-size: 280px;
  }

  .progress-container {
    inline-size: 220px;
  }

  .loading-wrapper {
    block-size: 80px;
    inline-size: 80px;
  }

  .pulse-ring {
    block-size: 80px;
    inline-size: 80px;
  }
}
</style>
