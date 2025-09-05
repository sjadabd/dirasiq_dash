<script setup>
import navItemsHorizontal from '@/navigation/horizontal'
import navItemsVertical from '@/navigation/vertical'
import { themeConfig } from '@themeConfig'
import { onMounted, onUnmounted, ref } from 'vue'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import { HorizontalNavLayout, VerticalNavLayout } from '@layouts'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'

// Responsive breakpoint (lg = 1024px in Vuetify)
const isMobile = ref(false)
const breakpoint = 1024

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < breakpoint
}
const token = ref(null)

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  try {
    const storedToken = localStorage.getItem("token")
    token.value = storedToken ? JSON.parse(storedToken) : null
  } catch (e) {
    token.value = null
  }

})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

</script>

<template>
  <!-- Vertical Layout for Mobile/Small Screens -->
  <VerticalNavLayout 
    v-if="isMobile" 
    :nav-items="navItemsVertical"
  >
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n2 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon icon="ri-menu-line" />
        </IconBtn>

        <NavbarThemeSwitcher />

        <VSpacer />

        <UserProfile v-if="token && token !== ''" />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>

  <!-- Horizontal Layout for Desktop/Large Screens -->
  <HorizontalNavLayout 
    v-else 
    :nav-items="navItemsHorizontal"
  >
    <!-- 👉 navbar -->
    <template #navbar>
      <RouterLink
        to="/"
        class="d-flex align-start gap-x-4"
      >
        <VNodeRenderer :nodes="themeConfig.app.logo" />

        <h1 class="leading-normal text-xl text-uppercase">
          {{ themeConfig.app.title }}
        </h1>
      </RouterLink>
      <VSpacer />

      <NavbarThemeSwitcher class="me-2" />
      <UserProfile v-if="token && token !== ''" />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </HorizontalNavLayout>
</template>
