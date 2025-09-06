<template>
  <v-card class="mx-auto pa-4" elevation="2" rounded="lg" color="surface">
    <v-breadcrumbs :items="items" class="pa-0">
      <template v-slot:divider>
        <v-icon :icon="dividerIcon"></v-icon>
      </template>

      <template v-slot:title="{ item }">
        <router-link
          v-if="!item.disabled && item.to"
          :to="item.to"
          class="text-info font-weight-medium"
        >
          {{ item.title }}
        </router-link>

        <span v-else class="text-primary font-weight-medium">
          {{ item.title }}
        </span>
      </template>
    </v-breadcrumbs>
  </v-card>
</template>


<script setup>
import { computed, defineProps } from "vue";
import { useLocale } from "vuetify";

const { isRtl } = useLocale();

const props = defineProps({
  items: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const dividerIcon = computed(() =>
  isRtl.value ? "mdi-chevron-left" : "mdi-chevron-right"
);

// breadcrumbItems: [
//   {
//     title: "الرئيسية",
//     disabled: true,
//   },
//   {
//     title: "المنتجات",
//     disabled: false,
//     href: "/products",
//   },
//   {
//     title: "الإلكترونيات",
//     disabled: true,
//   },
// ],
</script>

<style scoped>
/* Vuetify handles most of the styling, but you can add custom adjustments here */
.v-breadcrumbs {
  font-size: 0.875rem; /* حجم الخط */
}

/* إزالة أي حشوة داخلية قد تتعارض مع حشوة البطاقة */
.v-breadcrumbs-item {
  padding-block: 0;
  padding-inline: 8px;
}

.v-breadcrumbs-item:first-child {
  padding-inline-start: 0;
}
</style>
