<script setup lang="ts">
import ScrollToTop from "@core/components/ScrollToTop.vue";
import initCore from "@core/initCore";
import { initConfigStore, useConfigStore } from "@core/stores/config";
import { hexToRgb } from "@core/utils/colorConverter";
import { onMounted, onUnmounted, ref } from "vue";
import { useTheme } from "vuetify";

const { global } = useTheme();

initCore();
initConfigStore();

const configStore = useConfigStore();

const isProfileComplete = ref(false)
const userType = ref<string | null>(null)

try {
  const storedUser = localStorage.getItem("user")
  const storedProfileComplete = localStorage.getItem("isProfileComplete")

  if (storedProfileComplete !== null)
    isProfileComplete.value = JSON.parse(storedProfileComplete)

  if (storedUser) {
    const parsedUser = JSON.parse(storedUser)
    userType.value = parsedUser?.userType || null
  }
} catch (err) {
  console.warn("⚠️ Error reading user data:", err)
  isProfileComplete.value = false
  userType.value = null
}

interface Position {
  x: number
  y: number
}

const getInitialPosition = (): Position => {
  try {
    const saved = localStorage.getItem('wa_pos')
    if (saved) return JSON.parse(saved)
  } catch { }
  return { x: 24, y: 24 }
}

const waPos = ref<Position>(getInitialPosition())
const dragging = ref(false)
const dragStart = ref({ mx: 0, my: 0, x: 0, y: 0 })
const waRef = ref<HTMLElement | null>(null)
const moved = ref(false)
const recentlyDragged = ref(false)

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

const onMove = (e: MouseEvent | TouchEvent) => {
  if (!dragging.value) return
  const point = 'touches' in e ? e.touches[0] : e
  const dx = point.clientX - dragStart.value.mx
  const dy = point.clientY - dragStart.value.my

  if (!moved.value && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    moved.value = true
  }

  // لا نمنع الحدث إلا بعد التأكد أنه سحب حقيقي، حتى يعمل الضغط على الجوال
  if (moved.value) {
    e.preventDefault()
    e.stopPropagation()
  }

  const btn = waRef.value
  const btnW = btn ? btn.offsetWidth : 120
  const btnH = btn ? btn.offsetHeight : 40
  const vw = window.innerWidth
  const vh = window.innerHeight

  const newX = clamp(dragStart.value.x + dx, 0, vw - btnW)
  const newY = clamp(dragStart.value.y - dy, 0, vh - btnH)
  waPos.value = { x: newX, y: newY }
}

const stopDrag = (e?: MouseEvent | TouchEvent) => {
  if (!dragging.value) return
  dragging.value = false

  // نمنع الحدث فقط إذا كان هناك سحب فعلي
  if (e && moved.value) {
    e.preventDefault()
    e.stopPropagation()
  }

  try {
    localStorage.setItem('wa_pos', JSON.stringify(waPos.value))
  } catch { }

  if (moved.value) {
    recentlyDragged.value = true
    setTimeout(() => { recentlyDragged.value = false }, 250)
  }

  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('touchmove', onMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
}

const startDrag = (e: MouseEvent | TouchEvent) => {
  const point = 'touches' in e ? e.touches[0] : e
  dragging.value = true
  dragStart.value = {
    mx: point.clientX,
    my: point.clientY,
    x: waPos.value.x,
    y: waPos.value.y
  }
  moved.value = false

  // على الفأرة نمنع الحدث مباشرة، أما على اللمس فنتركه حتى نعرف إن كان سحبًا فعليًا
  if (!('touches' in e)) {
    e.preventDefault()
    e.stopPropagation()
  }

  document.addEventListener('mousemove', onMove, { passive: false })
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)
}

const onWaClick = (e: MouseEvent) => {
  if (dragging.value || moved.value || recentlyDragged.value) {
    e.preventDefault()
    e.stopPropagation()
  }
}

onMounted(() => {
  // Event listeners are attached dynamically during drag
})

onUnmounted(() => {
  // Cleanup any remaining listeners
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('touchmove', onMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <VApp :style="`--v-global-theme-primary: ${hexToRgb(
      global.current.value.colors.primary
    )}`">
      <v-alert v-if="isProfileComplete === false && userType !== 'super_admin' && userType !== null" type="warning"
        style="
          position: fixed;
          z-index: 98999999;
          block-size: 11%;
          inline-size: 78%;
          inset-block-start: 1%;
          inset-inline-end: 1%;
" prominent border="start" elevation="2" class="mb-4">
        <template #prepend>
          <v-icon color="warning" size="28">mdi-account-alert</v-icon>
        </template>

        <div>
          <strong>يرجى إكمال بياناتك الشخصية</strong>
          <p class="text-body-2 mb-0">
            لن تتمكن من الحصول على طلاب عبر المنصة إلا بعد إكمال ملفك الشخصي.
          </p>
        </div>

        <template #append>
          <v-btn color="primary" variant="tonal" to="/teacher/profile-setup">
            إكمال البيانات الآن
          </v-btn>
        </template>
      </v-alert>

      <RouterView />
      <ScrollToTop />

      <div ref="waRef" :style="{
        position: 'fixed',
        left: waPos.x + 'px',
        bottom: waPos.y + 'px',
        zIndex: 9999,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }" @mousedown="startDrag" @touchstart="startDrag">
        <a href="https://wa.me/9647724275947" target="_blank" rel="noopener noreferrer" aria-label="الدعم عبر واتساب"
          @click="onWaClick" style="text-decoration: none;">
          <VBtn color="success" variant="elevated" density="comfortable" rounded="pill" elevation="4">
            <VIcon start>mdi-whatsapp</VIcon>
            دعم واتساب
          </VBtn>
        </a>
      </div>
    </VApp>
  </VLocaleProvider>
</template>
