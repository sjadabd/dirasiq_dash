<script setup>
import navItems from "@/navigation/horizontal"
import { themeConfig } from "@themeConfig"

// Components
import logo from "@images/logo.png"
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue"
import UserProfile from "@/layouts/components/UserProfile.vue"
import { HorizontalNavLayout } from "@layouts"
</script>

<template>
  <HorizontalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar>
      <RouterLink
        to="/"
        class="d-flex align-start gap-x-4"
      >
        <img
          style="
    background-color: white;inline-size: 60px;"
          :src="logo"
        >

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
    <!--
      <template #footer>
      <Footer />
      </template> 
    -->

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </HorizontalNavLayout>
</template>
