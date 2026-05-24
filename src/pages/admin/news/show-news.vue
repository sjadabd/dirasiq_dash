<template>
  <div>
    <AppBreadcrumbs :items="breadcrumbItems" />

    <!-- Operations -->
    <VCard
      class="my-4"
      elevation="3"
      rounded="lg"
    >
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon
          icon="ri-newspaper-line"
          color="primary"
          class="me-2"
          size="24"
        />
        <h3 class="text-h5 font-weight-bold">
          إدارة الأخبار
        </h3>
        <VSpacer />
        <VBtn
          color="primary"
          prepend-icon="ri-add-line"
          rounded="lg"
          @click="openCreate"
        >
          خبر جديد
        </VBtn>
      </VCardTitle>
      <VDivider />
      <VCardItem>
        <VRow
          class="align-center"
          dense
        >
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="filters.search"
              prepend-inner-icon="ri-search-line"
              placeholder="ابحث في العناوين…"
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
              v-model="filters.newsType"
              :items="channelOptions"
              item-title="title"
              item-value="value"
              label="قناة النشر"
              prepend-inner-icon="ri-broadcast-line"
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
              v-model="filters.isActive"
              :items="isActiveOptions"
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
            md="2"
            class="d-flex justify-end"
          >
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="ri-refresh-line"
              rounded="lg"
              @click="fetchData"
            >
              تحديث
            </VBtn>
          </VCol>
        </VRow>
      </VCardItem>
    </VCard>

    <!-- List card -->
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
          قائمة الأخبار
        </h3>
        <VSpacer />
        <VChip
          color="primary"
          variant="elevated"
        >
          {{ totalItems }} خبر
        </VChip>
      </VCardTitle>
      <VDivider />
      <VCardItem v-if="loading">
        <div
          v-for="n in 4"
          :key="n"
          class="mb-3"
        >
          <VSkeletonLoader type="article" />
        </div>
      </VCardItem>
      <VCardItem v-else-if="!items.length">
        <div class="text-center py-12 text-medium-emphasis">
          <VIcon
            size="56"
            color="grey-lighten-1"
            class="mb-3"
          >
            ri-newspaper-line
          </VIcon>
          <h4 class="text-h6 mb-1">
            لا توجد أخبار
          </h4>
          <p>أضِف أول خبر للمنصة من زر "خبر جديد".</p>
        </div>
      </VCardItem>
      <VCardItem v-else>
        <VRow>
          <VCol
            v-for="n in items"
            :key="n.id"
            cols="12"
            md="6"
            lg="4"
          >
            <VCard
              class="news-card h-100"
              :elevation="1"
              rounded="lg"
              border
            >
              <VImg
                v-if="resolveImage(n)"
                :src="resolveImage(n)"
                :alt="n.title"
                height="180"
                cover
              />
              <div
                v-else
                class="news-card-placeholder"
              >
                <VIcon
                  size="48"
                  color="grey-lighten-1"
                >
                  ri-image-line
                </VIcon>
              </div>
              <VCardItem>
                <div class="d-flex align-center mb-2 gap-2 flex-wrap">
                  <VChip
                    size="x-small"
                    :color="channelColor(n.newsType || n.news_type)"
                    variant="tonal"
                    :prepend-icon="channelIcon(n.newsType || n.news_type)"
                  >
                    {{ channelLabel(n.newsType || n.news_type) }}
                  </VChip>
                  <VSpacer />
                  <VChip
                    size="x-small"
                    :color="(n.isActive ?? n.is_active ?? true) ? 'success' : 'grey'"
                    variant="tonal"
                  >
                    {{ (n.isActive ?? n.is_active ?? true) ? 'نشط' : 'معلّق' }}
                  </VChip>
                </div>
                <h4 class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ n.title }}
                </h4>
                <p class="text-body-2 text-medium-emphasis news-card-excerpt">
                  {{ excerpt(n.details || n.content) }}
                </p>
                <div class="text-caption text-medium-emphasis mt-2">
                  <VIcon
                    size="14"
                    class="me-1"
                  >
                    ri-calendar-line
                  </VIcon>
                  {{ formatDate(n.createdAt || n.created_at) }}
                </div>
              </VCardItem>
              <VDivider />
              <VCardActions class="px-4 py-2">
                <VBtn
                  size="small"
                  variant="text"
                  prepend-icon="ri-edit-line"
                  @click="openEdit(n)"
                >
                  تعديل
                </VBtn>
                <VBtn
                  size="small"
                  variant="text"
                  :color="(n.isActive ?? n.is_active ?? true) ? 'warning' : 'success'"
                  :prepend-icon="(n.isActive ?? n.is_active ?? true) ? 'ri-eye-off-line' : 'ri-send-plane-line'"
                  @click="togglePublish(n)"
                >
                  {{ (n.isActive ?? n.is_active ?? true) ? 'تعليق' : 'إعادة نشر' }}
                </VBtn>
                <VSpacer />
                <VBtn
                  size="small"
                  variant="text"
                  color="error"
                  icon="ri-delete-bin-line"
                  @click="confirmDelete(n)"
                />
              </VCardActions>
            </VCard>
          </VCol>
        </VRow>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="d-flex justify-center mt-6"
        >
          <VPagination
            v-model="filters.page"
            :length="totalPages"
            :total-visible="6"
            rounded="circle"
            @update:model-value="fetchData"
          />
        </div>
      </VCardItem>
    </VCard>

    <!-- Create / Edit dialog -->
    <VDialog
      v-model="dialog.open"
      max-width="720"
      persistent
      scrollable
    >
      <VCard>
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon
            start
            :color="dialog.mode === 'create' ? 'primary' : 'warning'"
            class="me-2"
          >
            {{ dialog.mode === 'create' ? 'ri-add-line' : 'ri-edit-line' }}
          </VIcon>
          <span class="text-h6 font-weight-bold">
            {{ dialog.mode === 'create' ? 'إضافة خبر جديد' : 'تعديل الخبر' }}
          </span>
          <VSpacer />
          <VBtn
            icon
            variant="text"
            @click="dialog.open = false"
          >
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VForm @submit.prevent="submitForm">
            <VRow dense>
              <VCol cols="12">
                <VTextField
                  v-model="form.title"
                  label="عنوان الخبر"
                  prepend-inner-icon="ri-heading"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'العنوان مطلوب']"
                />
              </VCol>
              <VCol cols="12">
                <label class="channel-label">قناة النشر</label>
                <div class="channel-picker">
                  <button
                    v-for="opt in channelOptions.filter(o => o.value)"
                    :key="opt.value"
                    type="button"
                    class="channel-card"
                    :class="{ active: form.newsType === opt.value }"
                    @click="form.newsType = opt.value"
                  >
                    <VIcon
                      size="22"
                      :color="form.newsType === opt.value ? 'white' : opt.color"
                    >
                      {{ opt.icon }}
                    </VIcon>
                    <div class="channel-card-title">
                      {{ opt.title }}
                    </div>
                    <div class="channel-card-sub">
                      {{ opt.hint }}
                    </div>
                  </button>
                </div>
              </VCol>
              <VCol cols="12">
                <VSwitch
                  v-model="form.isActive"
                  color="success"
                  inset
                  :label="form.isActive ? 'الخبر نشط ومرئي' : 'الخبر معلّق'"
                  hide-details
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.details"
                  label="محتوى الخبر"
                  prepend-inner-icon="ri-file-text-line"
                  variant="outlined"
                  rows="6"
                  auto-grow
                  density="comfortable"
                  :rules="[v => !!v || 'المحتوى مطلوب']"
                />
              </VCol>
              <VCol cols="12">
                <VFileInput
                  v-model="form.imageFile"
                  label="صورة الخبر (اختياري)"
                  prepend-inner-icon="ri-image-line"
                  variant="outlined"
                  density="comfortable"
                  accept="image/*"
                  show-size
                  clearable
                  prepend-icon=""
                  @update:model-value="onImageChange"
                />
                <div
                  v-if="form.imageBase64 || form.existingImageUrl"
                  class="mt-3"
                >
                  <VImg
                    :src="form.imageBase64 || form.existingImageUrl"
                    max-height="200"
                    rounded="lg"
                    cover
                  />
                </div>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="dialog.submitting"
            @click="dialog.open = false"
          >
            إلغاء
          </VBtn>
          <VBtn
            color="primary"
            rounded="lg"
            :loading="dialog.submitting"
            @click="submitForm"
          >
            {{ dialog.mode === 'create' ? 'حفظ ونشر' : 'حفظ التعديلات' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

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
  name: "AdminNewsShow",
  data() {
    return {
      breadcrumbItems: [
        { title: "الرئيسية", disabled: false, to: "/admin/dashboard" },
        { title: "الأخبار", disabled: true },
      ],
      loading: false,
      items: [],
      totalItems: 0,
      contentUrl: "",
      filters: { page: 1, limit: 12, search: "", newsType: null, isActive: null },

      // Channel-targeting options. These map 1:1 to the backend NewsType enum
      // and decide WHERE the news is visible (web app, mobile app, or both).
      channelOptions: [
        { title: "كل القنوات", value: null, icon: "ri-broadcast-line", color: "grey", hint: "عرض الكل" },
        { title: "ويب وهاتف", value: "web_and_mobile", icon: "ri-global-line",
          color: "success", hint: "يظهر في الموقع وتطبيق الطلاب معاً" },
        { title: "الموقع فقط", value: "web", icon: "ri-computer-line",
          color: "primary", hint: "يظهر في الموقع الإلكتروني فقط" },
        { title: "الهاتف فقط", value: "mobile", icon: "ri-smartphone-line",
          color: "warning", hint: "يظهر في تطبيق الطلاب على الهاتف فقط" },
      ],
      isActiveOptions: [
        { title: "الكل", value: null },
        { title: "نشط", value: true },
        { title: "معلّق", value: false },
      ],
      dialog: {
        open: false,
        mode: "create", // 'create' | 'edit'
        id: null,
        submitting: false,
      },
      form: {
        title: "",
        details: "",
        newsType: "web_and_mobile",
        isActive: true,
        imageFile: null,
        imageBase64: null,
        existingImageUrl: null,
      },
      confirmDelete_: {
        open: false,
        id: null,
        title: "تأكيد الحذف",
        messages: ["سيتم حذف الخبر نهائياً.", "لا يمكن التراجع عن هذه العملية."],
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
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await adminApi.getNews({
          page: this.filters.page,
          limit: this.filters.limit,
          search: this.filters.search || undefined,
          newsType: this.filters.newsType || undefined,
          isActive: this.filters.isActive ?? undefined,
        })

        const payload = res?.data || {}

        // Paginated controllers wrap rows in `data.data` + `data.pagination`.
        // Non-paginated ones return rows directly in `data`. Handle both.
        const inner = payload?.data?.data ?? payload?.data ?? []

        this.items = Array.isArray(inner) ? inner : []

        const pagination = payload?.data?.pagination || payload?.meta?.pagination || {}

        this.totalItems = pagination.total ?? payload?.count ?? this.items.length
        this.contentUrl = payload?.content_url || ""
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر تحميل الأخبار")
      } finally {
        this.loading = false
      }
    },

    resolveImage(n) {
      const raw = n.imageUrl || n.image_url
      if (!raw) return null
      if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw
      
      return `${this.contentUrl}${raw}`
    },

    excerpt(text) {
      if (!text) return ""
      const t = String(text).replace(/\s+/g, " ").trim()
      
      return t.length > 130 ? t.slice(0, 130) + "…" : t
    },

    formatDate(d) {
      try { return new Date(d).toLocaleDateString("en-IQ") } catch { return "" }
    },

    // Channel helpers (web / mobile / web_and_mobile)
    channelLabel(t) {
      const map = { web: "الموقع", mobile: "تطبيق الهاتف", web_and_mobile: "الموقع + الهاتف" }
      
      return map[t] || "الموقع + الهاتف"
    },
    channelIcon(t) {
      const map = { web: "ri-computer-line", mobile: "ri-smartphone-line", web_and_mobile: "ri-global-line" }
      
      return map[t] || "ri-global-line"
    },
    channelColor(t) {
      const map = { web: "primary", mobile: "warning", web_and_mobile: "success" }
      
      return map[t] || "success"
    },

    openCreate() {
      this.dialog = { open: true, mode: "create", id: null, submitting: false }
      this.form = { title: "", details: "", newsType: "web_and_mobile", isActive: true,
        imageFile: null, imageBase64: null, existingImageUrl: null }
    },

    openEdit(n) {
      this.dialog = { open: true, mode: "edit", id: n.id, submitting: false }
      this.form = {
        title: n.title || "",
        details: n.details || n.content || "",
        newsType: n.newsType || n.news_type || "web_and_mobile",
        isActive: n.isActive ?? n.is_active ?? true,
        imageFile: null,
        imageBase64: null,
        existingImageUrl: this.resolveImage(n),
      }
    },

    async onImageChange(file) {
      // VFileInput in Vuetify 3 emits either File or File[] depending on multiple flag.
      const f = Array.isArray(file) ? file[0] : file
      if (!f) { this.form.imageBase64 = null 

        return }
      try {
        const reader = new FileReader()

        reader.onload = () => { this.form.imageBase64 = reader.result }
        reader.readAsDataURL(f)
      } catch {
        this.form.imageBase64 = null
      }
    },

    async submitForm() {
      if (!this.form.title?.trim() || !this.form.details?.trim()) {
        this.showAlert("error", "يرجى تعبئة العنوان والمحتوى")
        
        return
      }
      this.dialog.submitting = true
      try {
        const payload = {
          title: this.form.title.trim(),
          details: this.form.details.trim(),
          newsType: this.form.newsType || "web_and_mobile",
        }


        // Backend stores image_url; accept either base64 (new upload) or keep
        // the existing URL untouched when not uploading a new image.
        if (this.form.imageBase64) payload.imageUrl = this.form.imageBase64

        // isActive is only sent on UPDATE (newsUpdateSchema accepts it;
        // newsCreateSchema does not — server defaults new rows to active).
        if (this.dialog.mode === "edit") payload.isActive = !!this.form.isActive

        let res
        if (this.dialog.mode === "create") {
          res = await adminApi.createNews(payload)
        } else {
          res = await adminApi.updateNews(this.dialog.id, payload)
        }
        const msg = res?.data?.message || (this.dialog.mode === "create" ? "تم نشر الخبر" : "تم تحديث الخبر")

        this.showAlert("success", msg)
        this.dialog.open = false
        await this.fetchData()
      } catch (e) {
        const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message ||
          "تعذّر حفظ الخبر"

        this.showAlert("error", msg)
      } finally {
        this.dialog.submitting = false
      }
    },

    async togglePublish(n) {
      try {
        const res = await adminApi.publishNews(n.id)

        this.showAlert("success", res?.data?.message || "تم تحديث حالة النشر")
        await this.fetchData()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر تغيير حالة النشر")
      }
    },

    confirmDelete(n) {
      this.confirmDelete_.id = n.id
      this.confirmDelete_.open = true
    },

    async handleDelete() {
      try {
        const res = await adminApi.deleteNews(this.confirmDelete_.id)

        this.showAlert("success", res?.data?.message || "تم حذف الخبر")
        await this.fetchData()
      } catch (e) {
        this.showAlert("error", e?.response?.data?.message || "تعذّر حذف الخبر")
      } finally {
        this.confirmDelete_.open = false
        this.confirmDelete_.id = null
      }
    },

    showAlert(type, message) {
      Object.assign(this.alert, { type, message, open: true })
    },
  },
}
</script>

<style scoped>
.news-card { transition: transform .25s ease, box-shadow .25s ease; }
.news-card:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(11, 37, 69, .08) !important; }
.news-card-placeholder {
  height: 180px; display: flex; align-items: center; justify-content: center;
  background: rgba(11, 37, 69, .04);
}
.news-card-excerpt {
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  min-height: 2.6em;
}

/* Channel picker — visual selector for web / mobile / both. */
.channel-label {
  display: block;
  font-size: .82rem;
  font-weight: 700;
  color: rgba(11, 37, 69, .75);
  margin-block-end: 10px;
}
.channel-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 600px) { .channel-picker { grid-template-columns: 1fr; } }
.channel-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 16px 12px;
  border-radius: 14px;
  border: 2px solid rgba(11, 37, 69, .10);
  background: white;
  cursor: pointer;
  transition: all .2s ease;
  text-align: center;
}
.channel-card:hover {
  border-color: rgba(11, 37, 69, .25);
  transform: translateY(-2px);
}
.channel-card.active {
  background: linear-gradient(135deg, #0b2545 0%, #103261 100%);
  border-color: #0b2545;
  color: white;
  box-shadow: 0 10px 22px rgba(11, 37, 69, .25);
}
.channel-card-title {
  font-size: .92rem;
  font-weight: 800;
  margin-block-start: 6px;
  color: inherit;
}
.channel-card-sub {
  font-size: .72rem;
  margin-block-start: 4px;
  opacity: .72;
  line-height: 1.4;
  color: inherit;
}
.channel-card.active .channel-card-sub { opacity: .85; }
</style>
