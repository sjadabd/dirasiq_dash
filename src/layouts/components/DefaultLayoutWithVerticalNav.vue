<script setup>
import navItems from "@/navigation/vertical";
import teacher_api from "@/api/teacher/teacher_api";
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from 'vue-router'
defineOptions({ inheritAttrs: false })

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";

// @layouts plugin
import { VerticalNavLayout } from "@layouts";

const isLoggedIn = ref(false)
const notificationsMenu = ref(false)
const notificationDialog = ref(false)
const notificationsList = ref([])
const notificationsPage = ref(1)
const notificationsLimit = ref(10)
const notificationsHasMore = ref(false)
const notificationsLoading = ref(false)
const unreadCount = ref(0)
const selectedNotification = ref(null)
const router = useRouter()
const route = useRoute()

const formatDate = d => {
  try { return new Date(d).toLocaleString('en-IQ') } catch { return d }
}

const buildInternalRoute = (raw) => {
  try {
    const t = raw?.type || raw?.data?.type
    const d = raw?.data || {}
    switch (t) {
      case 'new_booking':
      case 'booking_update': {
        if (d.bookingId) return `/teacher/payments/reservations/${encodeURIComponent(d.bookingId)}`
        return '/teacher/payments/reservations/show-reservation-payments'
      }
      case 'course_update':
        return '/teacher/course/show-course'
      case 'teacher_message':
      case 'message':
        return '/teacher/notifications/show-notifications'
      default:
        return null
    }
  } catch { return null }
}

const fetchNotifications = async (page = 1, append = false) => {
  try {
    notificationsLoading.value = true
    const res = await teacher_api.getNotifications({ page, limit: notificationsLimit.value })
    const payload = res?.data?.data ? res.data : res
    const items = Array.isArray(payload?.data) ? payload.data : []
    const baseUrl = payload?.content_url || ''
    const mapped = items.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: !!n.is_read,
      sentAt: n.sent_at || n.created_at,
      image: n.data?.imageUrl ? (baseUrl ? `${baseUrl}${n.data.imageUrl}` : n.data.imageUrl) : null,
      url: n.data?.url || buildInternalRoute(n) || null,
      raw: n,
    }))
    notificationsList.value = append ? [...notificationsList.value, ...mapped] : mapped
    unreadCount.value = notificationsList.value.filter(n => !n.is_read).length
    const pagination = payload.pagination || {}
    const totalPages = pagination.totalPages || (mapped.length < notificationsLimit.value ? page : page + 1)
    notificationsHasMore.value = page < totalPages && mapped.length > 0
    notificationsPage.value = page
  } catch (err) {
    console.warn('Failed to fetch notifications:', err)
  } finally {
    notificationsLoading.value = false
  }
}

const refreshNotifications = () => {
  notificationsPage.value = 1
  fetchNotifications(1, false)
}

const loadMoreNotifications = () => {
  const next = notificationsPage.value + 1
  fetchNotifications(next, true)
}

const openNotification = async (n) => {
  try {
    notificationsMenu.value = false
    console.debug('[Notifications] item clicked', n?.id)
    if (n?.id) await markNotificationAsRead(String(n.id))
    selectedNotification.value = n
    notificationDialog.value = true
  } catch (e) {
    console.warn('openNotification failed:', e)
  }
}

const markNotificationAsRead = async (id) => {
  try {
    if (!id) return
    console.debug('[Notifications] marking read ->', id)
    await teacher_api.markNotificationRead(String(id))
    const idx = notificationsList.value.findIndex(x => String(x.id) === String(id))
    if (idx > -1 && !notificationsList.value[idx].is_read) {
      notificationsList.value[idx].is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } else {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  } catch (err) {
    console.warn('Failed to mark notification as read:', err)
  }
}

onMounted(() => {
  const token = localStorage.getItem('accessToken')
  const user = localStorage.getItem('user')
  isLoggedIn.value = !!(token && user)
  if (isLoggedIn.value) refreshNotifications()
  const qid = route.query?.notificationId
  if (qid) markNotificationAsRead(String(qid)).then(() => {}).catch(() => {})
})

const openLink = async (n) => {
  if (!n?.url) return
  try {
    if (n.url.startsWith('http://') || n.url.startsWith('https://')) {
      window.open(n.url, '_blank')
    } else {
      await router.push(n.url)
    }
  } catch (e) { /* noop */ }
}
</script>

<template>
  <div>
  <VerticalNavLayout v-bind="$attrs" :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n2 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon icon="ri-menu-line" />
        </IconBtn>

        <NavbarThemeSwitcher />

        <VSpacer />

        <VMenu v-if="isLoggedIn" v-model="notificationsMenu" location="bottom" :close-on-content-click="false">
          <template #activator="{ props }">
            <VBtn icon variant="text" v-bind="props">
              <VBadge v-if="unreadCount" color="error" :content="unreadCount" overlap>
                <VIcon>mdi-bell</VIcon>
              </VBadge>
              <template v-else>
                <VIcon>mdi-bell</VIcon>
              </template>
            </VBtn>
          </template>
          <VCard min-width="360">
            <VCardTitle class="d-flex align-center">
              <VIcon start class="me-2">mdi-bell</VIcon>
              <span class="text-subtitle-1">الإشعارات</span>
              <VSpacer />
              <VBtn size="small" variant="text" @click="refreshNotifications">تحديث</VBtn>
            </VCardTitle>
            <VDivider />
            <VList v-if="notificationsList.length" density="compact">
              <VListItem v-for="n in notificationsList" :key="n.id" @click="openNotification(n)"
                         :title="n.title" :subtitle="formatDate(n.sentAt)" class="notification-item">
                <template #prepend>
                  <VAvatar size="36" :color="n.is_read ? 'grey' : 'primary'">
                    <VImg v-if="n.image" :src="n.image" cover />
                    <VIcon v-else color="white" size="18">mdi-bell</VIcon>
                  </VAvatar>
                </template>
              </VListItem>
            </VList>
            <div v-else class="text-center pa-6 text-medium-emphasis">لا توجد إشعارات</div>
            <VDivider v-if="notificationsHasMore" />
            <div v-if="notificationsHasMore" class="d-flex justify-center pa-2">
              <VBtn size="small" :loading="notificationsLoading" variant="text" @click="loadMoreNotifications">عرض المزيد</VBtn>
            </div>
            <VCardActions class="justify-end">
              <VBtn variant="text" @click="notificationsMenu = false">إغلاق</VBtn>
            </VCardActions>
          </VCard>
        </VMenu>

        <UserProfile />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </VerticalNavLayout>

  <VDialog v-model="notificationDialog" max-width="700">
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon start color="primary" class="me-2">mdi-bell</VIcon>
        <span class="text-h6 font-weight-bold">{{ selectedNotification?.title }}</span>
        <VSpacer />
        <VBtn icon variant="text" @click="notificationDialog = false">
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </VCardTitle>
      <VDivider />
      <VImg v-if="selectedNotification?.image" :src="selectedNotification.image" height="260" cover />
      <VCardText>
        <div class="text-body-2 text-medium-emphasis mb-2" v-if="selectedNotification?.sentAt">
          <VIcon size="16" class="me-1">mdi-calendar</VIcon>
          {{ formatDate(selectedNotification.sentAt) }}
        </div>
        <div style="white-space: pre-line;" class="mb-3">
          {{ selectedNotification?.message }}
        </div>
        <div class="text-caption text-medium-emphasis" v-if="selectedNotification?.type">
          <VIcon size="14" class="me-1">mdi-tag</VIcon>
          {{ selectedNotification.type }}
        </div>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn v-if="selectedNotification?.url" @click="openLink(selectedNotification)" variant="tonal">فتح</VBtn>
        <VBtn variant="text" @click="notificationDialog = false">إغلاق</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
  </div>
</template>
