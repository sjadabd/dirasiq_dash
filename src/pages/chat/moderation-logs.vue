<script setup>
import chatAdminApi from "@/api/chat/chat_admin_api"
import numberWithComma from "@/constant/number"
import { formatLocaleDateTime12 } from "@/utils/time-format"

const filters = reactive({
  page: 1,
  limit: 30,
  conversationId: null,
  actorUserId: null,
  action: null,
})

const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref(null)

// Action vocabulary mirrors the CHECK constraint on moderation_logs.action.
// `title` is the Arabic label; `value` matches the server enum exactly.
const ACTION_OPTIONS = [
  { title: "كل العمليات", value: null },
  { title: "إنشاء", value: "create" },
  { title: "حذف رسالة", value: "delete_message" },
  { title: "طرد عضو", value: "kick" },
  { title: "كتم", value: "mute" },
  { title: "إلغاء كتم", value: "unmute" },
  { title: "تثبيت", value: "pin" },
  { title: "إلغاء تثبيت", value: "unpin" },
  { title: "أرشفة", value: "archive" },
  { title: "إلغاء أرشفة", value: "unarchive" },
  { title: "إعادة تسمية", value: "rename" },
  { title: "تحديث المجموعة", value: "update_group" },
  { title: "تغيير الوضع", value: "set_mode" },
  { title: "إضافة عضو", value: "add_member" },
  { title: "ترقية", value: "promote" },
  { title: "تخفيض", value: "demote" },
]

function actionLabel(v) {
  return ACTION_OPTIONS.find(o => o.value === v)?.title ?? v
}

function actionColor(v) {
  switch (v) {
  case "delete_message":
  case "kick":
  case "archive":
    return "error"
  case "mute":
  case "set_mode":
  case "unarchive":
    return "warning"
  case "pin":
  case "unpin":
  case "rename":
  case "update_group":
    return "primary"
  case "create":
  case "add_member":
  case "promote":
    return "success"
  default:
    return "default"
  }
}

async function fetchRows() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await chatAdminApi.listModerationLogs({
      page: filters.page,
      limit: filters.limit,
      conversationId: filters.conversationId,
      actorUserId: filters.actorUserId,
      action: filters.action,
    })

    items.value = res.data?.data ?? []
    total.value = res.data?.meta?.pagination?.total ?? items.value.length
  } catch (err) {
    errorMessage.value
      = err?.response?.data?.message ?? "تعذّر تحميل السجلات."
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.conversationId = null
  filters.actorUserId = null
  filters.action = null
  filters.page = 1
  fetchRows()
}

function fmtDate(iso) {
  return formatLocaleDateTime12(iso)
}

watch(
  () => [filters.page, filters.limit, filters.action],
  () => fetchRows(),
)

onMounted(() => fetchRows())
</script>

<template>
  <div>
    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="ri-shield-keyhole-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">
          سجلات الإشراف
        </h3>
        <VSpacer />
        <VChip
          color="primary"
          variant="elevated"
          class="font-weight-medium"
        >
          {{ numberWithComma(total) }} سجل
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow dense>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.action"
              :items="ACTION_OPTIONS"
              item-title="title"
              item-value="value"
              label="نوع العملية"
              density="comfortable"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.conversationId"
              label="معرّف المحادثة (اختياري)"
              density="comfortable"
              clearable
              @keyup.enter="fetchRows"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.actorUserId"
              label="معرّف المنفّذ (اختياري)"
              density="comfortable"
              clearable
              @keyup.enter="fetchRows"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
            class="d-flex align-center"
            style="gap: 8px;"
          >
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="ri-search-line"
              rounded="pill"
              @click="fetchRows"
            >
              بحث
            </VBtn>
            <VBtn
              variant="text"
              prepend-icon="ri-close-line"
              @click="clearFilters"
            >
              تصفير
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
      <VDivider />

      <VAlert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="ma-4"
        :text="errorMessage"
      />

      <VCardText>
        <VTable hover>
          <thead>
            <tr>
              <th class="text-start">
                الوقت
              </th>
              <th class="text-start">
                العملية
              </th>
              <th class="text-start">
                المنفّذ
              </th>
              <th class="text-start">
                المستهدَف
              </th>
              <th class="text-start">
                المحادثة
              </th>
              <th class="text-start">
                السبب
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td
                colspan="6"
                class="text-center py-6"
              >
                <VProgressCircular
                  indeterminate
                  color="primary"
                  size="32"
                />
              </td>
            </tr>
            <tr v-else-if="!items.length">
              <td
                colspan="6"
                class="text-center text-medium-emphasis py-8"
              >
                لا توجد عمليات تطابق التصفية.
              </td>
            </tr>
            <tr
              v-for="row in items"
              v-else
              :key="row.id"
            >
              <td class="text-caption">
                {{ fmtDate(row.createdAt) }}
              </td>
              <td>
                <VChip
                  size="small"
                  :color="actionColor(row.action)"
                  variant="tonal"
                >
                  {{ actionLabel(row.action) }}
                </VChip>
              </td>
              <td>
                <div class="font-weight-medium">
                  {{ row.actorName ?? row.actorUserId.slice(0, 8) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ row.actorUserId }}
                </div>
              </td>
              <td>
                <template v-if="row.targetUserId">
                  <div class="font-weight-medium">
                    {{ row.targetName ?? row.targetUserId.slice(0, 8) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ row.targetUserId }}
                  </div>
                </template>
                <template v-else-if="row.targetMessageId">
                  <span class="text-caption text-medium-emphasis">
                    رسالة: {{ row.targetMessageId.slice(0, 8) }}…
                  </span>
                </template>
                <template v-else>
                  —
                </template>
              </td>
              <td>
                <RouterLink
                  v-if="row.conversationId"
                  :to="`/chat/conversations/${row.conversationId}`"
                  class="text-primary"
                  style="text-decoration: none;"
                >
                  {{ row.conversationId.slice(0, 8) }}…
                </RouterLink>
                <span v-else>—</span>
              </td>
              <td class="text-caption">
                {{ row.reason ?? "—" }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>

      <VDivider />
      <VCardActions class="d-flex justify-space-between align-center px-6 py-3">
        <VBtn
          variant="tonal"
          size="small"
          :disabled="filters.page <= 1 || loading"
          prepend-icon="ri-arrow-right-line"
          @click="filters.page = filters.page - 1"
        >
          السابق
        </VBtn>
        <div class="text-caption">
          صفحة {{ filters.page }} —
          {{ Math.max(Math.ceil(total / filters.limit), 1) }}
        </div>
        <VBtn
          variant="tonal"
          size="small"
          :disabled="filters.page * filters.limit >= total || loading"
          append-icon="ri-arrow-left-line"
          @click="filters.page = filters.page + 1"
        >
          التالي
        </VBtn>
      </VCardActions>
    </VCard>
  </div>
</template>
