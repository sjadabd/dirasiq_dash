<script setup>
import adminApi from "@/api/admin/admin_api";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

definePage({
    meta: {
        layout: "default",
        requiresAuth: true,
    },
});

const router = useRouter();
const { hasPermission } = useAuth();

const loading = ref(false);
const saving = ref(false);
const feeIqd = ref(0);
const error = ref("");
const snackbar = ref({
    show: false,
    message: "",
    color: "success",
});

async function loadFee() {
    loading.value = true;
    error.value = "";
    try {
        const res = await adminApi.getBookingConfirmFee();
        const ok = res?.data?.success || res?.success;
        const data = res?.data?.data || res?.data || res;
        if (!ok) throw new Error(res?.data?.message || "تعذر جلب الرسوم");
        feeIqd.value = Number(data?.feeIqd ?? 0);
    } catch (e) {
        error.value = e?.response?.data?.message || e?.message || "تعذر جلب الرسوم";
    } finally {
        loading.value = false;
    }
}

async function save() {
    const value = Number(feeIqd.value);
    if (Number.isNaN(value) || value < 0) {
        snackbar.value = {
            show: true,
            message: "الرسوم يجب أن تكون رقمًا أكبر أو يساوي 0",
            color: "error",
        };
        return;
    }

    saving.value = true;
    try {
        const res = await adminApi.setBookingConfirmFee(value);
        const ok = res?.data?.success || res?.success;
        const msg = res?.data?.message || (ok ? "تم الحفظ بنجاح" : "تعذر الحفظ");

        snackbar.value = {
            show: true,
            message: msg,
            color: ok ? "success" : "error",
        };
    } catch (e) {
        snackbar.value = {
            show: true,
            message: e?.response?.data?.message || e?.message || "تعذر الحفظ",
            color: "error",
        };
    } finally {
        saving.value = false;
    }
}

onMounted(async () => {
    if (!hasPermission("super_admin")) {
        router.push("/login");
        return;
    }
    await loadFee();
});
</script>

<template>
    <div class="pa-6 d-flex flex-column gap-4">
        <AppBreadcrumbs :items="[
            { title: 'الرئيسية', disabled: false, to: '/admin/dashboard' },
            { title: 'الإعدادات', disabled: false, to: '/admin/settings' },
            { title: 'رسوم تأكيد طلب الطالب', disabled: true },
        ]" />

        <VCard elevation="2">
            <VCardTitle class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-2">
                    <VIcon color="primary">mdi-cash</VIcon>
                    <span>رسوم تأكيد طلب الطالب</span>
                </div>
                <VBtn variant="text" size="small" :loading="loading" @click="loadFee">تحديث</VBtn>
            </VCardTitle>
            <VCardText>
                <VAlert v-if="error" type="error" variant="tonal" density="comfortable" class="mb-4">
                    {{ error }}
                </VAlert>

                <VTextField v-model="feeIqd" type="number" label="الرسوم (IQD)" variant="outlined" :disabled="loading"
                    min="0" />

                <div class="text-caption text-medium-emphasis mt-2">
                    إذا كانت القيمة 0 فهذا يعني لا يوجد خصم عند التأكيد.
                </div>

                <div class="d-flex justify-end mt-4">
                    <VBtn color="primary" :loading="saving" @click="save">حفظ</VBtn>
                </div>
            </VCardText>
        </VCard>

        <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top" :timeout="4000">
            {{ snackbar.message }}
            <template #actions>
                <VBtn variant="text" @click="snackbar.show = false">إغلاق</VBtn>
            </template>
        </VSnackbar>
    </div>
</template>
