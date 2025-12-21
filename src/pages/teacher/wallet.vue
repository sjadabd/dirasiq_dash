<script setup>
import teacher_api from "@/api/teacher/teacher_api";
import numberWithComma from "@/constant/number";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

definePage({
    meta: {
        layout: "default",
        requiresAuth: true,
    },
});

const router = useRouter();
const route = useRoute();

const balance = ref(0);
const transactions = ref([]);
const page = ref(1);
const limit = ref(20);
const total = ref(0);

const loadingWallet = ref(false);
const loadingTx = ref(false);
const polling = ref(false);

const topupDialog = ref(false);
const topupAmount = ref(10000);
const creatingTopupLink = ref(false);

const snackbar = ref({
    show: false,
    message: "",
    color: "success",
});

let pollTimer = null;
let pollStopTimer = null;

async function fetchWallet() {
    loadingWallet.value = true;
    try {
        const res = await teacher_api.getWallet();
        const ok = res?.data?.success || res?.success;
        const data = res?.data?.data || res?.data || res;
        if (!ok) throw new Error(res?.data?.message || "تعذر جلب الرصيد");
        balance.value = Number(data?.balance ?? 0);
    } catch (e) {
        snackbar.value = {
            show: true,
            message: e?.response?.data?.message || e?.message || "تعذر جلب الرصيد",
            color: "error",
        };
    } finally {
        loadingWallet.value = false;
    }
}

async function fetchTransactions() {
    loadingTx.value = true;
    try {
        const res = await teacher_api.getWalletTransactions(page.value, limit.value);
        const ok = res?.data?.success || res?.success;
        const payload = res?.data?.data || res?.data || res;

        if (!ok) throw new Error(res?.data?.message || "تعذر جلب الحركات");

        const items = Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : [];

        transactions.value = items;
        total.value = Number(payload?.pagination?.total ?? payload?.total ?? items.length);
    } catch (e) {
        snackbar.value = {
            show: true,
            message: e?.response?.data?.message || e?.message || "تعذر جلب الحركات",
            color: "error",
        };
    } finally {
        loadingTx.value = false;
    }
}

function startPollingWallet(durationMs = 60000, intervalMs = 4000) {
    if (pollTimer) clearInterval(pollTimer);
    if (pollStopTimer) clearTimeout(pollStopTimer);

    polling.value = true;
    pollTimer = setInterval(() => {
        fetchWallet();
    }, intervalMs);

    pollStopTimer = setTimeout(() => {
        stopPollingWallet();
    }, durationMs);
}

function stopPollingWallet() {
    polling.value = false;
    if (pollTimer) clearInterval(pollTimer);
    if (pollStopTimer) clearTimeout(pollStopTimer);
    pollTimer = null;
    pollStopTimer = null;
}

async function createTopupLink() {
    const amount = Number(topupAmount.value);
    if (Number.isNaN(amount) || amount <= 0) {
        snackbar.value = {
            show: true,
            message: "يرجى إدخال مبلغ صحيح أكبر من 0",
            color: "error",
        };
        return;
    }

    creatingTopupLink.value = true;
    try {
        const res = await teacher_api.createWaylTopupLink(amount);
        const ok = res?.data?.success || res?.success;
        const data = res?.data?.data || res?.data || res;

        if (!ok || !data?.url) {
            throw new Error(res?.data?.message || "تعذر إنشاء رابط الدفع");
        }

        localStorage.setItem(
            "pending_wayl_action",
            JSON.stringify({ type: "wallet_topup", createdAt: Date.now(), amount })
        );

        router.push({
            path: "/teacher/payment/redirecting",
            query: {
                url: data.url,
            },
        });
    } catch (e) {
        snackbar.value = {
            show: true,
            message: e?.response?.data?.message || e?.message || "تعذر إنشاء رابط الدفع",
            color: "error",
        };
    } finally {
        creatingTopupLink.value = false;
    }
}

function formatDate(val) {
    if (!val) return "-";
    try {
        return new Date(val).toLocaleString("en-IQ");
    } catch {
        return "-";
    }
}

onMounted(async () => {
    await fetchWallet();
    await fetchTransactions();

    if (route?.query?.poll === "1") {
        startPollingWallet();
    }
});

onBeforeUnmount(() => {
    stopPollingWallet();
});
</script>

<template>
    <div class="pa-6 d-flex flex-column gap-4">
        <AppBreadcrumbs :items="[
            { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
            { title: 'المحفظة', disabled: true },
        ]" />

        <VCard elevation="2">
            <VCardTitle class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-2">
                    <VIcon color="primary">mdi-wallet</VIcon>
                    <span>المحفظة</span>
                </div>
                <div class="d-flex align-center gap-2">
                    <VBtn variant="text" size="small" :loading="loadingWallet" @click="fetchWallet">
                        تحديث الرصيد
                    </VBtn>
                    <VBtn color="primary" @click="topupDialog = true">شحن المحفظة</VBtn>
                </div>
            </VCardTitle>
            <VCardText>
                <div class="text-caption text-medium-emphasis">الرصيد الحالي (IQD)</div>
                <div class="text-h4 font-weight-bold">
                    {{ numberWithComma(balance) }} د.ع
                </div>
                <VAlert v-if="polling" type="info" variant="tonal" density="comfortable" class="mt-4">
                    جارٍ التحقق من تحديث الرصيد بعد الدفع...
                </VAlert>
            </VCardText>
        </VCard>

        <VCard elevation="2">
            <VCardTitle class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-2">
                    <VIcon color="primary">mdi-swap-horizontal</VIcon>
                    <span>حركات المحفظة</span>
                </div>
                <VBtn variant="text" size="small" :loading="loadingTx" @click="fetchTransactions">
                    تحديث
                </VBtn>
            </VCardTitle>
            <VCardText>
                <VTable density="comfortable">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                            <th>قبل/بعد</th>
                            <th>المرجع</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(t, idx) in transactions" :key="t.id || idx">
                            <td>{{ formatDate(t.createdAt || t.date) }}</td>
                            <td>{{ t.type || '-' }}</td>
                            <td>{{ numberWithComma(t.amount || 0) }}</td>
                            <td>
                                {{ numberWithComma(t.balanceBefore || 0) }} / {{ numberWithComma(t.balanceAfter || 0) }}
                            </td>
                            <td>{{ t.reference || t.referenceType || '-' }}</td>
                        </tr>
                        <tr v-if="!loadingTx && transactions.length === 0">
                            <td colspan="5" class="text-center text-medium-emphasis">لا توجد حركات</td>
                        </tr>
                    </tbody>
                </VTable>

                <div class="d-flex justify-end mt-4">
                    <VPagination v-model="page" :length="Math.max(1, Math.ceil(total / limit))" :disabled="loadingTx"
                        @update:model-value="fetchTransactions" />
                </div>
            </VCardText>
        </VCard>

        <VDialog v-model="topupDialog" max-width="520">
            <VCard>
                <VCardTitle>شحن المحفظة</VCardTitle>
                <VCardText>
                    <VTextField v-model="topupAmount" type="number" label="المبلغ (IQD)" variant="outlined" min="1" />
                    <div class="text-caption text-medium-emphasis mt-2">
                        سيتم تحويلك إلى صفحة الدفع الخاصة بـ Wayl.
                    </div>
                </VCardText>
                <VCardActions>
                    <VSpacer />
                    <VBtn variant="text" @click="topupDialog = false">إلغاء</VBtn>
                    <VBtn color="primary" :loading="creatingTopupLink" @click="createTopupLink">
                        متابعة الدفع
                    </VBtn>
                </VCardActions>
            </VCard>
        </VDialog>

        <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top" :timeout="5000">
            {{ snackbar.message }}
            <template #actions>
                <VBtn variant="text" @click="snackbar.show = false">إغلاق</VBtn>
            </template>
        </VSnackbar>
    </div>
</template>
