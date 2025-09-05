<script setup>
import navItems from "@/navigation/horizontal";
import { themeConfig } from "@themeConfig";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";
import { HorizontalNavLayout } from "@layouts";
import { VNodeRenderer } from "@layouts/components/VNodeRenderer";
</script>

<template>
  <HorizontalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar>
      <RouterLink to="/" class="d-flex align-start gap-x-4">
        <VNodeRenderer :nodes="themeConfig.app.logo" />

        <h1 class="leading-normal text-xl text-uppercase">
          {{ themeConfig.app.title }}
        </h1>
      </RouterLink>
      <VSpacer />

      <NavbarThemeSwitcher class="me-2" />
      <UserProfile />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </HorizontalNavLayout>
</template>
