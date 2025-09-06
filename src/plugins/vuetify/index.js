import { deepMerge } from "@antfu/utils";
import { themeConfig } from "@themeConfig";
import { createVuetify } from "vuetify";
import { VBtn } from "vuetify/components/VBtn";
import { VDateInput } from "vuetify/labs/VDateInput";
import defaults from "./defaults";
import { icons } from "./icons";
import { themes } from "./theme";

// Styles
import "@core/scss/template/libs/vuetify/index.scss";
import "vuetify/styles";

export default function (app) {
  const cookieThemeValues = {
    defaultTheme: resolveVuetifyTheme(themeConfig.app.theme),
    theme: {
      defaultTheme: "light",
      themes,
    },
  };

  const optionTheme = deepMerge({ themes }, cookieThemeValues);

  const vuetify = createVuetify({
    components: {
      VDateInput,
    },
    aliases: {
      IconBtn: VBtn,
    },
    defaults,
    icons,
    theme: optionTheme,
    display: {
      mobileBreakpoint: 'sm',
      thresholds: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
  });

  app.use(vuetify);
}
