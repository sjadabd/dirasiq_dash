<script setup>
import { onMounted } from "vue";
import { useRoute } from "vue-router";

definePage({
    meta: {
        layout: "default",
        requiresAuth: true,
    },
});

const route = useRoute();

onMounted(() => {
    const url = route?.query?.url;
    if (typeof url === "string" && url.length > 0) {
        window.location.href = url;
    }
});
</script>

<template>
    <div class="pa-6 d-flex flex-column align-center justify-center" style="min-block-size: 60vh;">
        <VProgressCircular indeterminate color="primary" size="64" />
        <div class="text-h6 mt-4">جارٍ تحويلك للدفع...</div>
        <div class="text-body-2 text-medium-emphasis mt-2">لا تغلق الصفحة</div>
    </div>
</template>
