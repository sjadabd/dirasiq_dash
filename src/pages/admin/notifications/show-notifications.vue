<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Statistics row -->
    <VRow
      class="my-2"
      dense
    >
      <VCol
        cols="12"
        sm="6"
        lg="3"
      >
        <VCard
          class="stat-card"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center">
              <VAvatar
                color="primary"
                size="44"
                class="me-3"
              >
                <VIcon color="white">
                  ri-notification-3-line
                </VIcon>
              </VAvatar>
              <div>
                <div class="stat-label">
                  إجمالي الإشعارات
                </div>
                <div class="stat-value">
                  {{ statsLoading ? "…" : (stats.total ?? 0) }}
                </div>
              </div>
            </div>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        lg="3"
      >
        <VCard
          class="stat-card"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center">
              <VAvatar
                color="success"
                size="44"
                class="me-3"
              >
                <VIcon color="white">
                  ri-checkbox-circle-line
                </VIcon>
              </VAvatar>
              <div>
                <div class="stat-label">
                  تم الإرسال
                </div>
                <div class="stat-value">
                  {{ statsLoading ? "…" : (stats.sent ?? 0) }}
                </div>
              </div>
            </div>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        lg="3"
      >
        <VCard
          class="stat-card"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center">
              <VAvatar
                color="warning"
                size="44"
                class="me-3"
              >
                <VIcon color="white">
                  ri-time-line
                </VIcon>
              </VAvatar>
              <div>
                <div class="stat-label">
                  معلّقة
                </div>
                <div class="stat-value">
                  {{ statsLoading ? "…" : (stats.pending ?? 0) }}
                </div>
              </div>
            </div>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        lg="3"
      >
        <VCard
          class="stat-card"
          elevation="0"
          rounded="lg"
          border
        >
          <VCardItem>
            <div class="d-flex align-center">
              <VAvatar
                color="error"
                size="44"
                class="me-3"
              >
                <VIcon color="white">
                  ri-error-warning-line
                </VIcon>
              </VAvatar>
              <div>
                <div class="stat-label">
                  فشل الإرسال
                </div>
                <div class="stat-value">
                  {{ statsLoading ? "…" : (stats.failed ?? 0) }}
                </div>
              </div>
            </div>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- byType / byPriority breakdown -->
    <VRow
      v-if="stats && (Object.keys(stats.byType || {}).length || Object.keys(stats.byPriority || {}).length)"
      class="mb-2"
      dense
    >
      <VCol
        cols="12"
        md="6"
      >
        <VCard
          elevation="0"
          rounded="lg"
          border
        >
          <VCardTitle class="d-flex align-center py-3 px-4">
            <VIcon
              color="primary"
              class="me-2"
            >
              ri-pie-chart-line
            </VIcon>
            <span class="text-subtitle-1 font-weight-bold">حسب النوع</span>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <div
              v-for="(count, key) in stats.byType || {}"
              :key="key"
              class="breakdown-row"
            >
              <VChip
                size="small"
                variant="tonal"
                color="primary"
              >
                {{ key }}
              </VChip>
              <VSpacer />
              <span class="font-weight-bold">{{ count }}</span>
            </div>
            <div
              v-if="!Object.keys(stats.byType || {}).length"
              class="text-medium-emphasis text-center py-3"
            >
              لا توجد بيانات
            </div>
          </VCardItem>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="6"
      >
        <VCard
          elevation="0"
          rounded="lg"
          border
        >
          <VCardTitle class="d-flex align-center py-3 px-4">
            <VIcon
              color="warning"
              class="me-2"
            >
              ri-flag-2-line
            </VIcon>
            <span class="text-subtitle-1 font-weight-bold">حسب الأولوية</span>
          </VCardTitle>
          <VDivider />
          <VCardItem>
            <div
              v-for="(count, key) in stats.byPriority || {}"
              :key="key"
              class="breakdown-row"
            >
              <VChip
                size="small"
                variant="tonal"
                :color="priorityColor(key)"
              >
                {{ priorityLabel(key) }}
              </VChip>
              <VSpacer />
              <span class="font-weight-bold">{{ count }}</span>
            </div>
            <div
              v-if="!Object.keys(stats.byPriority || {}).length"
              class="text-medium-emphasis text-center py-3"
            >
              لا توجد بيانات
            </div>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>

    <!-- Operations -->
    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="d-flex align-center py-4 px-6 flex-wrap gap-2">
        <VIcon
          icon="ri-notification-3-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">
          إدارة الإشعارات
        </h3>
        <VSpacer />
        <VBtn
          color="warning"
          variant="tonal"
          prepend-icon="ri-play-circle-line"
          rounded="lg"
          :loading="processing"
          @click="processPending"
        >
          معالجة المعلّقات الآن
        </VBtn>
        <VBtn
          color="primary"
          variant="tonal"
          prepend-icon="ri-refresh-line"
          rounded="lg"
          :loading="loading"
          @click="reloadAll"
        >
          تحديث
        </VBtn>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow dense>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.status"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              label="الحالة"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @update:model-value="fetchData"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.priority"
              :items="priorityOptions"
              item-title="title"
              item-value="value"
              label="الأولوية"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @update:model-value="fetchData"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.type"
              placeholder="نوع الإشعار (اختياري)"
              prepend-inner-icon="ri-price-tag-3-line"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @keyup.enter="fetchData"
              @click:clear="fetchData"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.recipientType"
              :items="recipientOptions"
              item-title="title"
              item-value="value"
              label="المستلم"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              @update:model-value="fetchData"
            />
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- List -->
    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="py-4 px-6 d-flex align-center">
        <VIcon
          color="primary"
          class="me-2"
        >
          ri-list-check
        </VIcon>
        <h3 class="text-h6 font-weight-bold">
          قائمة الإشعارات
        </h3>
        <VSpacer />
        <VChip
          color="primary"
          variant="elevated"
        >
          {{ totalItems }} إشعار
        </VChip>
      </VCardTitle>
      <VDivider />

      <VCardItem v-if="loading">
        <VSkeletonLoader
          v-for="n in 6"
          :key="n"
          type="list-item-avatar-three-line"
          class="mb-2"
        />
      </VCardItem>

      <VCardItem v-else-if="!items.length">
        <div class="text-center py-12 text-medium-emphasis">
          <VIcon
            size="56"
            color="grey-lighten-1"
            class="mb-3"
          >
            ri-notification-off-line
          </VIcon>
          <h4 class="text-h6 mb-1">
            لا توجد إشعارات
          </h4>
          <p>عدّل الفلاتر أو انتظر إرسال إشعارات جديدة.</p>
        </div>
      </VCardItem>

      <VList
        v-else
        class="notif-list"
      >
        <VListItem
          v-for="n in items"
          :key="n.id"
          class="notif-item"
        >
          <template #prepend>
            <VAvatar
              :color="priorityColor(n.priority)"
              size="44"
              class="me-2"
            >
              <VIcon color="white">
                {{ statusIcon(n.status) }}
              </VIcon>
            </VAvatar>
          </template>
          <VListItemTitle class="d-flex align-center flex-wrap gap-2">
            <strong class="text-body-1">{{ n.title }}</strong>
            <VChip
              size="x-small"
              variant="tonal"
              :color="statusColor(n.status)"
            >
              {{ statusLabel(n.status) }}
            </VChip>
            <VChip
              size="x-small"
              variant="tonal"
              :color="priorityColor(n.priority)"
            >
              {{ priorityLabel(n.priority) }}
            </VChip>
            <VChip
              v-if="n.type"
              size="x-small"
              variant="tonal"
              color="grey"
            >
              {{ n.type }}
            </VChip>
            <VChip
              v-if="n.recipientType || n.recipient_type"
              size="x-small"
              variant="tonal"
              color="info"
            >
              {{ recipientLabel(n.recipientType || n.recipient_type) }}
            </VChip>
          </VListItemTitle>
          <VListItemSubtitle class="mt-1">
            <div class="text-body-2 text-medium-emphasis notif-message">
              {{ n.message }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              <VIcon
                size="14"
                class="me-1"
              >
                ri-calendar-line
              </VIcon>
              {{ formatDate(n.sentAt || n.sent_at || n.createdAt || n.created_at) }}
            </div>
          </VListItemSubtitle>
          <template #append>
            <VBtn
              icon="ri-delete-bin-line"
              size="small"
              color="error"
              variant="text"
              @click.stop="confirmDelete(n)"
            />
          </template>
        </VListItem>
      </VList>

      <div
        v-if="totalPages > 1"
        class="d-flex justify-center py-4"
      >
        <VPagination
          v-model="filters.page"
          :length="totalPages"
          :total-visible="6"
          rounded="circle"
          @update:model-value="fetchData"
        />
      </div>
    </VCard>

    <ConfirmDangerDialog
      v-model="confirmDelete_.open"
      :messages="confirmDelete_.messages"
      :title="confirmDelete_.title"
      :confirm-button-text="confirmDelete_.cta"
      @confirm="handleDelete"
    />

    <BaseAlert
      v-if="alert.open"
      v-model="alert.open"
      :type="alert.type"
      :message="alert.message"
      :closable="true"
      close-text="موافق"
      @close="alert.open = false"
    />
  </div>
</template>

<script>
import adminApi from "@/api/admin/admin_api"

export default {
  name: "AdminNotificationsShow",
  data() {
    return {
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/admin/dashboard" },
        { title: "الإشعارات", disabled: true },
      ],
      loading: false,
      statsLoading: false,
      processing: false,
      items: [],
      totalItems: 0,
      stats: { total: 0, sent: 0, pending: 0, failed: 0, byType: {}, byPriority: {} },
      filters: {
        page: 1, limit: 15,
        status: null, priority: null, type: "", recipientType: null,
      },
      statusOptions: [
        { title: "الكل", value: null },
        { title: "معلّق", value: "pending" },
        { title: "مرسَل", value: "sent" },
        { title: "مُسلَّم", value: "delivered" },
        { title: "مقروء", value: "read" },
        { title: "فشل", value: "failed" },
      ],
      priorityOptions: [
        { title: "الكل", value: null },
        { title: "منخفض", value: "LOW" },
        { title: "متوسط", value: "MEDIUM" },
        { title: "عالٍ", value: "HIGH" },
        { title: "عاجل", value: "URGENT" },
      ],
      recipientOptions: [
        { title: "الكل", value: null },
        { title: "جميع المستخدمين", value: "all" },
        { title: "معلّمون", value: "teachers" },
        { title: "طلاب", value: "students" },
        { title: "محدّدون", value: "specific" },
      ],
      confirmDelete_: {
        open: false,
        id: null,
        title: "تأكيد الحذف",
        messages: ["سيتم حذف الإشعار من السجلات.", "لا يمكن التراجع عن هذه العملية."],
        cta: "حذف",
      },
      alert: { open: false, type: "success", message: "" },
    }
  },
  computed: {
    totalPages() {
      if (!this.totalItems || !this.filters.limit) return 1
      
      return Math.max(1, Math.ceil(this.totalItems / this.filters.limit))
    },
  },
  mounted() {
    this.reloadAll()
  },
  methods: {
    async reloadAll() {
      await Promise.all([this.fetchStats(), this.fetchData()])
    },

    async fetchStats() {
      this.statsLoading = true
      try {
        const res = await adminApi.getNotificationStatistics()
        const data = res?.data?.data || res?.data || {}

        this.stats = {
          total: Number(data.total) || 0,
          sent: Number(data.sent) || 0,
          pending: Number(data.pending) || 0,
          failed: Number(data.failed) || 0,
          byType: data.byType || {},
          byPriority: data.byPriority || {},
        }
      } catch (e) {
        console.warn("Failed to load stats:", e)
      } finally {
        this.statsLoading = false
      }
    },

    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.filters.page,
          limit: this.filters.limit,
        }

        if (this.filters.status) params.status = this.filters.status
        if (this.filters.priority) params.priority = this.filters.priority
        if (this.filters.type?.trim()) params.type = this.filters.type.trim()
        if (this.filters.recipientType) params.recipientType = this.filters.recipientType

        const res = await adminApi.getAdminNotifications(params)
        const payload = res?.data || {}

        // Same wrapper-tolerance as the news page.
        const inner = payload?.data?.data ?? payload?.data ?? []

        this.items = Array.isArray(inner) ? inner : []

        const pagination = payload?.data?.pagination || payload?.meta?.pagination || {}

        this.totalItems = pagination.total ?? payload?.count ?? this.items.length
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر تحميل الإشعارات")
      } finally {
        this.loading = false
      }
    },

    async processPending() {
      this.processing = true
      try {
        const res = await adminApi.processPendingNotifications()

        this.showAlert("success", res?.data?.message || "تم بدء المعالجة")
        await this.reloadAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر بدء المعالجة")
      } finally {
        this.processing = false
      }
    },

    confirmDelete(n) {
      this.confirmDelete_.id = n.id
      this.confirmDelete_.open = true
    },

    async handleDelete() {
      try {
        const res = await adminApi.deleteNotification(this.confirmDelete_.id)

        this.showAlert("success", res?.data?.message || "تم الحذف")
        await this.reloadAll()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر الحذف")
      } finally {
        this.confirmDelete_.open = false
        this.confirmDelete_.id = null
      }
    },

    formatDate(d) {
      try { return new Date(d).toLocaleString("en-IQ") } catch { return d || "" }
    },

    statusLabel(s) {
      return ({ pending: "معلّق", sent: "مرسَل", delivered: "مُسلَّم", read: "مقروء", failed: "فشل" })[s] || (s || "—")
    },
    statusColor(s) {
      return ({ pending: "warning", sent: "info", delivered: "info", read: "success", failed: "error" })[s] || "grey"
    },
    statusIcon(s) {
      return ({
        pending: "ri-time-line", sent: "ri-send-plane-line", delivered: "ri-check-line",
        read: "ri-check-double-line", failed: "ri-error-warning-line",
      })[s] || "ri-notification-3-line"
    },
    priorityLabel(p) {
      return ({ LOW: "منخفض", MEDIUM: "متوسط", HIGH: "عالٍ", URGENT: "عاجل" })[p] || (p || "—")
    },
    priorityColor(p) {
      return ({ LOW: "grey", MEDIUM: "info", HIGH: "warning", URGENT: "error" })[p] || "grey"
    },
    recipientLabel(r) {
      return ({ all: "الجميع", teachers: "معلّمون", students: "طلاب", specific: "محدّدون" })[r] || (r || "—")
    },

    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true })
    },
  },
}
</script>

<style scoped>
.stat-card { transition: transform .2s ease, box-shadow .2s ease; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(11, 37, 69, .07) !important; }
.stat-label { font-size: .8rem; color: rgba(11, 37, 69, .6); font-weight: 600; }
.stat-value { font-size: 1.5rem; font-weight: 900; color: #0b2545; line-height: 1.1; margin-top: 2px; }
.breakdown-row { display: flex; align-items: center; padding-block: 8px; border-bottom: 1px dashed rgba(11, 37, 69, .06); }
.breakdown-row:last-child { border-bottom: none; }
.notif-list { padding: 0; }
.notif-item {
  padding-block: 12px !important;
  border-bottom: 1px solid rgba(11, 37, 69, .06);
}
.notif-item:last-child { border-bottom: none; }
.notif-message { white-space: pre-line; line-height: 1.7; }
</style>
