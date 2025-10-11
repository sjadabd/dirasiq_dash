import { defineThemeConfig } from "@core"
import { Skins } from "@core/enums"
import { breakpointsVuetifyV3 } from "@vueuse/core"
import { VIcon } from "vuetify/components/VIcon"

import logo from "@images/logo.svg?raw"
import {
  AppContentLayoutNav,
  ContentWidth,
  FooterType,
  NavbarType,
} from "@layouts/enums"

export const { themeConfig, layoutConfig } = defineThemeConfig({
  app: {
    title: "mulhim-iq",

    logo: h("div", {
      innerHTML: logo,
      style: "line-height:0; color: rgb(var(--v-global-theme-primary))",
    }),
    contentWidth: ContentWidth.Boxed,
    contentLayoutNav: AppContentLayoutNav.Vertical,
    overlayNavFromBreakpoint: breakpointsVuetifyV3.lg - 1,

    theme: "light",
    skin: Skins.Default,
    iconRenderer: VIcon,
    i18n: {
      enable: false,
    },
  },
  navbar: {
    type: NavbarType.Sticky,
    navbarBlur: true,
  },
  footer: { type: FooterType.Static },
  verticalNav: {
    isVerticalNavCollapsed: false,
    defaultNavItemIconProps: { icon: "ri-circle-line" },
    isVerticalNavSemiDark: false,
  },
  horizontalNav: {
    type: "sticky",
    transition: "slide-y-reverse-transition",
    popoverOffset: 4,
  },
  icons: {
    chevronDown: { icon: "ri-arrow-down-s-line" },
    chevronRight: { icon: "ri-arrow-right-s-line" },
    close: { icon: "ri-close-line", size: "20" },
    verticalNavPinned: { icon: "ri-radio-button-line", size: "20" },
    verticalNavUnPinned: { icon: "ri-circle-line", size: "20" },
    sectionTitlePlaceholder: { icon: "ri-subtract-line" },
  },
})
