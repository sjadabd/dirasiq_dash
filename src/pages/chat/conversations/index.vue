<script setup>
import { useChatRealtime } from "@/composables/useChatRealtime"
import { CHAT_BASE_URL as chatBase } from "@/utils/api-mode"

const chat = useChatRealtime()
const {
  conversations,
  conversationsLoading,
  currentId,
  currentConversation,
  currentMembers,
  messages,
  messagesLoading,
  messagesHasMore,
  sending,
  typingUserName,
} = chat

// ── Local UI state ─────────────────────────────────────────────────────────
const searchQuery = ref("")
const composerText = ref("")
const fileInput = ref(null)
const uploading = ref(false)
const messagesScrollEl = ref(null)
const alert = reactive({ open: false, type: "success", text: "" })

const editDialog = reactive({
  open: false,
  saving: false,
  name: "",
  description: "",
  mode: "open",
})

const confirm = reactive({
  open: false,
  title: "",
  text: "",
  action: null,
  loading: false,
})

function notify(text, type = "success") {
  alert.text = text
  alert.type = type
  alert.open = true
}

function showError(err, fallback = "حدث خطأ") {
  notify(err?.response?.data?.message ?? fallback, "error")
}

const filteredConversations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return conversations.value

  return conversations.value.filter(c => {
    const name = displayName(c).toLowerCase()
    const lastBody = (c.lastMessage?.body ?? "").toLowerCase()

    return name.includes(q) || lastBody.includes(q)
  })
})

function displayName(c) {
  if (!c) return ""
  if (c.type === "group") return c.name || "مجموعة"

  return c.peer?.name || "محادثة"
}

function previewLastMessage(c) {
  const m = c.lastMessage
  if (!m) return c.type === "group" ? "لا توجد رسائل بعد" : "ابدأ المحادثة"
  if (m.deletedAt) return "تم حذف هذه الرسالة"
  if ((m.body ?? "").trim()) return m.body.trim()
  if (m.kind === "image") return "📷 صورة"
  if (m.kind === "file") return "📎 ملف"

  return ""
}

function relativeTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "الآن"
  if (min < 60) return `${min} د`
  const hr = Math.floor(min / 60)
  if (hr < 24) return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
  const day = Math.floor(hr / 24)
  if (day < 7) return d.toLocaleDateString("ar", { weekday: "short" })

  return d.toLocaleDateString("ar")
}

function bubbleTime(iso) {
  if (!iso) return ""

  return new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
}

function readMyId() {
  try {
    const u = JSON.parse(localStorage.getItem("user") ?? "{}")

    return (u?.id ?? u?._id)?.toString() ?? null
  } catch (_) {
    return null
  }
}

function isMine(message) {
  return message.senderId && message.senderId === readMyId()
}

function resolveAttachmentUrl(att) {
  if (!att?.url) return ""
  if (att.url.startsWith("http")) return att.url
  // Single source of truth — `@/utils/api-mode` exports the chat origin.
  // Imported eagerly at module scope is fine; the value is a constant.

  return `${chatBase}${att.url}`
}

const composerDisabledReason = computed(() => {
  const c = currentConversation.value
  if (!c) return null
  if (c.isArchived) return "المحادثة مؤرشفة — لا يمكن الإرسال."
  if (c.mode === "announce_only" && c.myRole === "member") {
    return "هذه المجموعة للإعلانات فقط — لا يمكن للأعضاء الإرسال."
  }
  const me = currentMembers.value.find(m => m.userId === readMyId())
  if (me?.isMutedByAdminUntil && new Date(me.isMutedByAdminUntil) > new Date()) {
    const fmt = new Date(me.isMutedByAdminUntil).toLocaleString("ar")

    return `أنت مكتوم في هذه المجموعة حتى ${fmt}.`
  }

  return null
})

const canManage = computed(() => {
  const role = currentConversation.value?.myRole

  return role === "owner" || role === "admin"
})

// ── Send + attachments ─────────────────────────────────────────────────────

async function onSend() {
  const text = composerText.value.trim()
  if (!text) return
  composerText.value = ""
  await chat.sendMessage({ body: text })
  scrollToBottomSoon()
}

function onComposerKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    onSend()

    return
  }
  chat.emitTyping()
}

function triggerFilePick() {
  fileInput.value?.click()
}

async function onFileChosen(e) {
  const file = e.target.files?.[0]
  e.target.value = ""
  if (!file) return
  uploading.value = true
  try {
    const att = await chat.uploadAttachment(file)
    if (att?.id) {
      await chat.sendMessage({ attachmentIds: [att.id] })
      scrollToBottomSoon()
    }
  } catch (err) {
    showError(err, "تعذّر رفع الملف.")
  } finally {
    uploading.value = false
  }
}

// ── Scroll behaviour ───────────────────────────────────────────────────────

function scrollToBottomSoon() {
  nextTick(() => {
    const el = messagesScrollEl.value
    if (!el) return
    // reverse-flex layout — "bottom" visually = scrollTop 0.
    el.scrollTop = 0
  })
}

function onMessagesScroll(e) {
  const el = e.target
  if (
    !messagesLoading.value
    && messagesHasMore.value
    && Math.abs(el.scrollTop) >= el.scrollHeight - el.clientHeight - 220
  ) {
    chat.fetchMessages({ reset: false })
  }
}

// ── Conversation actions ───────────────────────────────────────────────────

async function openConv(c) {
  if (currentId.value === c.id) return
  await chat.openConversation(c.id)
  scrollToBottomSoon()
}

function openEditDialog() {
  const c = currentConversation.value
  if (!c) return
  editDialog.name = c.name ?? ""
  editDialog.description = c.description ?? ""
  editDialog.mode = c.mode ?? "open"
  editDialog.open = true
}

async function saveEdit() {
  editDialog.saving = true
  try {
    await chat.updateGroup({
      name: editDialog.name?.trim() || undefined,
      description: editDialog.description?.trim() || null,
      mode: editDialog.mode,
    })
    notify("تم تحديث المجموعة.")
    editDialog.open = false
  } catch (err) {
    showError(err, "تعذّر حفظ التغييرات.")
  } finally {
    editDialog.saving = false
  }
}

function askArchive() {
  confirm.open = true
  confirm.title = "أرشفة المجموعة؟"
  confirm.text = "ستصبح المجموعة مؤرشفة. لا يمكن الإرسال بعد ذلك."
  confirm.action = async () => {
    confirm.loading = true
    try {
      await chat.archiveGroup()
      notify("تمت الأرشفة.")
    } catch (err) {
      showError(err, "تعذّرت الأرشفة.")
    } finally {
      confirm.loading = false
      confirm.open = false
    }
  }
}

function askDeleteMessage(m) {
  confirm.open = true
  confirm.title = "حذف الرسالة؟"
  confirm.text = "ستظهر كمحذوفة لجميع الأعضاء."
  confirm.action = async () => {
    confirm.loading = true
    try {
      await chat.deleteMessage(m.id)
      notify("تم الحذف.")
    } catch (err) {
      showError(err, "تعذّر الحذف.")
    } finally {
      confirm.loading = false
      confirm.open = false
    }
  }
}

async function pinToggle(m) {
  try {
    await chat.togglePin(m)
    notify(m.isPinned ? "تم إلغاء التثبيت." : "تم التثبيت.")
  } catch (err) {
    showError(err, "تعذّرت العملية.")
  }
}

const showMembersDrawer = ref(false)

function askRemoveMember(member) {
  confirm.open = true
  confirm.title = `إزالة ${member.profile?.name ?? "العضو"}؟`
  confirm.text = "ستفقد العضوية في المجموعة فوراً."
  confirm.action = async () => {
    confirm.loading = true
    try {
      await chat.removeMember(member.userId)
      notify("تمت الإزالة.")
    } catch (err) {
      showError(err, "تعذّرت الإزالة.")
    } finally {
      confirm.loading = false
      confirm.open = false
    }
  }
}

async function mute24h(member) {
  try { await chat.muteMember(member.userId, 24); notify("تم الكتم 24 ساعة.") }
  catch (err) { showError(err, "تعذّر الكتم.") }
}

async function muteWeek(member) {
  try { await chat.muteMember(member.userId, 24 * 7); notify("تم الكتم لأسبوع.") }
  catch (err) { showError(err, "تعذّر الكتم.") }
}

async function unmute(member) {
  try { await chat.unmuteMember(member.userId); notify("تم إلغاء الكتم.") }
  catch (err) { showError(err, "تعذّر إلغاء الكتم.") }
}

// ── Boot ───────────────────────────────────────────────────────────────────

onMounted(async () => {
  await chat.initialize()
})

watch(currentId, () => {
  scrollToBottomSoon()
})
</script>

<template>
  <div class="chat-shell">
    <!-- ────────── Sidebar ────────── -->
    <aside class="chat-sidebar">
      <div class="chat-sidebar-head">
        <h2 class="chat-sidebar-title">المحادثات</h2>
      </div>
      <div class="chat-sidebar-search">
        <VTextField
          v-model="searchQuery"
          prepend-inner-icon="ri-search-line"
          placeholder="ابحث بالاسم أو محتوى…"
          density="comfortable"
          variant="solo-filled"
          hide-details
          flat
          rounded
        />
      </div>
      <div class="chat-sidebar-list">
        <div v-if="conversationsLoading && !conversations.length" class="d-flex justify-center pa-4">
          <VProgressCircular indeterminate color="primary" size="28" />
        </div>
        <div v-else-if="!conversations.length" class="text-medium-emphasis text-center pa-6">
          لا توجد محادثات بعد.
        </div>
        <div
          v-for="c in filteredConversations"
          v-else
          :key="c.id"
          class="chat-tile"
          :class="{ 'is-active': c.id === currentId }"
          @click="openConv(c)"
        >
          <VAvatar
            :color="c.type === 'group' ? 'tertiary' : 'primary'"
            variant="tonal"
            size="44"
          >
            <VIcon :icon="c.type === 'group' ? 'ri-group-line' : 'ri-user-3-line'" />
          </VAvatar>
          <div class="chat-tile-body">
            <div class="chat-tile-row1">
              <span class="chat-tile-name">{{ displayName(c) }}</span>
              <span class="chat-tile-time">{{ relativeTime(c.lastMessageAt ?? c.createdAt) }}</span>
            </div>
            <div class="chat-tile-row2">
              <span class="chat-tile-preview">{{ previewLastMessage(c) }}</span>
              <VBadge
                v-if="c.unreadCount > 0"
                :content="c.unreadCount > 99 ? '99+' : String(c.unreadCount)"
                color="success"
                inline
              />
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ────────── Main pane ────────── -->
    <main class="chat-main">
      <template v-if="!currentConversation">
        <div class="chat-empty">
          <VIcon icon="ri-chat-smile-3-line" size="64" color="primary" class="mb-3" />
          <div class="text-h6 font-weight-bold mb-1">اختر محادثة لبدء المراسلة</div>
          <div class="text-body-2 text-medium-emphasis">
            القائمة تتحدّث آنيّاً مع وصول الرسائل.
          </div>
        </div>
      </template>

      <template v-else>
        <header class="chat-header">
          <VAvatar
            :color="currentConversation.type === 'group' ? 'tertiary' : 'primary'"
            variant="tonal"
            size="40"
          >
            <VIcon :icon="currentConversation.type === 'group' ? 'ri-group-line' : 'ri-user-3-line'" />
          </VAvatar>
          <div class="chat-header-body">
            <div class="chat-header-title">{{ displayName(currentConversation) }}</div>
            <div class="chat-header-subtitle">
              <template v-if="currentConversation.type === 'group'">
                {{ currentMembers.filter(m => !m.leftAt).length }} عضو
              </template>
              <template v-else-if="currentConversation.peer">
                {{ currentConversation.peer.userType === "teacher" ? "معلم" : "طالب" }}
              </template>
              <template v-if="typingUserName">
                · <span class="text-primary">{{ typingUserName }} يكتب…</span>
              </template>
            </div>
          </div>
          <VSpacer />
          <VChip
            v-if="currentConversation.mode === 'announce_only'"
            size="small"
            color="warning"
            variant="tonal"
            class="me-2"
          >
            <VIcon icon="ri-megaphone-line" start size="14" />
            إعلانات
          </VChip>
          <VChip
            v-if="currentConversation.isArchived"
            size="small"
            color="default"
            variant="tonal"
            class="me-2"
          >
            مؤرشفة
          </VChip>
          <VBtn
            v-if="currentConversation.type === 'group'"
            icon="ri-team-line"
            variant="text"
            size="small"
            @click="showMembersDrawer = true"
          />
          <VMenu v-if="currentConversation.type === 'group' && canManage">
            <template #activator="{ props: act }">
              <VBtn v-bind="act" icon="ri-more-2-line" variant="text" size="small" />
            </template>
            <VList density="compact">
              <VListItem
                title="تعديل المجموعة"
                prepend-icon="ri-edit-line"
                @click="openEditDialog"
              />
              <VListItem
                v-if="!currentConversation.isArchived"
                title="أرشفة"
                prepend-icon="ri-archive-line"
                base-color="warning"
                @click="askArchive"
              />
            </VList>
          </VMenu>
        </header>

        <div
          v-if="currentConversation.mode === 'announce_only'"
          class="chat-banner chat-banner--info"
        >
          <VIcon icon="ri-megaphone-line" size="16" class="me-1" />
          هذه المجموعة للإعلانات فقط — {{ canManage ? "أنت والمشرفون يمكنكم الإرسال." : "القراءة فقط للأعضاء." }}
        </div>

        <section
          ref="messagesScrollEl"
          class="chat-messages"
          @scroll="onMessagesScroll"
        >
          <div v-if="messagesLoading && !messages.length" class="d-flex justify-center py-4">
            <VProgressCircular indeterminate color="primary" size="28" />
          </div>
          <template v-else>
            <div
              v-for="m in messages"
              :key="m.clientMessageId ?? m.id"
              class="chat-bubble-row"
              :class="{ 'is-mine': isMine(m) }"
            >
              <div class="chat-bubble" :class="{ 'is-mine': isMine(m), 'is-deleted': !!m.deletedAt }">
                <div v-if="!isMine(m) && m.sender" class="chat-bubble-sender">
                  {{ m.sender.name }}
                </div>
                <div v-if="m.isPinned" class="chat-bubble-pin">
                  <VIcon icon="ri-pushpin-fill" size="12" />
                  <span>مثبّتة</span>
                </div>
                <div v-if="m.deletedAt" class="chat-bubble-deleted">
                  تم حذف هذه الرسالة
                </div>
                <template v-else>
                  <div v-for="a in m.attachments ?? []" :key="a.id" class="chat-attachment">
                    <img
                      v-if="a.mime?.startsWith('image/')"
                      :src="resolveAttachmentUrl(a)"
                      :alt="a.originalName ?? 'attachment'"
                      class="chat-attachment-img"
                    >
                    <a
                      v-else
                      :href="resolveAttachmentUrl(a)"
                      target="_blank"
                      rel="noopener"
                      class="chat-attachment-file"
                    >
                      <VIcon :icon="a.mime === 'application/pdf' ? 'ri-file-pdf-line' : 'ri-file-line'" />
                      <span>{{ a.originalName ?? "ملف" }}</span>
                    </a>
                  </div>
                  <div v-if="(m.body ?? '').length" class="chat-bubble-body">
                    {{ m.body }}
                  </div>
                </template>
                <div class="chat-bubble-meta">
                  <span>{{ bubbleTime(m.createdAt) }}</span>
                  <template v-if="isMine(m)">
                    <VIcon v-if="m.status === 'sending'" icon="ri-time-line" size="11" class="ms-1" />
                    <VIcon
                      v-else-if="m.status === 'failed'"
                      icon="ri-error-warning-line"
                      size="11"
                      color="error"
                      class="ms-1"
                    />
                    <VIcon v-else icon="ri-check-line" size="11" class="ms-1" />
                    <a
                      v-if="m.status === 'failed'"
                      class="chat-bubble-retry"
                      @click="chat.retrySend(m)"
                    >إعادة</a>
                  </template>
                </div>
                <VMenu v-if="!m.deletedAt && (isMine(m) || canManage)">
                  <template #activator="{ props: act }">
                    <VBtn
                      v-bind="act"
                      icon="ri-more-2-line"
                      variant="text"
                      size="x-small"
                      class="chat-bubble-menu"
                    />
                  </template>
                  <VList density="compact">
                    <VListItem
                      v-if="canManage"
                      :title="m.isPinned ? 'إلغاء التثبيت' : 'تثبيت'"
                      :prepend-icon="m.isPinned ? 'ri-pushpin-2-line' : 'ri-pushpin-fill'"
                      @click="pinToggle(m)"
                    />
                    <VListItem
                      v-if="isMine(m) || canManage"
                      title="حذف"
                      prepend-icon="ri-delete-bin-line"
                      base-color="error"
                      @click="askDeleteMessage(m)"
                    />
                  </VList>
                </VMenu>
              </div>
            </div>
            <div v-if="messagesLoading && messages.length" class="d-flex justify-center py-2">
              <VProgressCircular indeterminate color="primary" size="20" />
            </div>
          </template>
        </section>

        <footer class="chat-composer">
          <div v-if="composerDisabledReason" class="chat-composer-hint">
            <VIcon icon="ri-information-line" size="14" />
            <span>{{ composerDisabledReason }}</span>
          </div>
          <div class="chat-composer-row">
            <input
              ref="fileInput"
              type="file"
              accept="image/*,application/pdf"
              hidden
              @change="onFileChosen"
            >
            <VBtn
              icon="ri-attachment-2"
              variant="text"
              :disabled="!!composerDisabledReason || uploading"
              :loading="uploading"
              @click="triggerFilePick"
            />
            <VTextarea
              v-model="composerText"
              :disabled="!!composerDisabledReason"
              placeholder="اكتب رسالة…"
              rows="1"
              auto-grow
              max-rows="5"
              density="comfortable"
              variant="solo-filled"
              hide-details
              flat
              rounded
              class="chat-composer-input"
              @keydown="onComposerKeydown"
            />
            <VBtn
              icon="ri-send-plane-2-line"
              color="primary"
              :disabled="!!composerDisabledReason || !composerText.trim() || sending"
              :loading="sending"
              @click="onSend"
            />
          </div>
        </footer>
      </template>
    </main>

    <!-- Members drawer -->
    <VNavigationDrawer
      v-model="showMembersDrawer"
      location="left"
      temporary
      width="320"
    >
      <VList density="comfortable">
        <VListSubheader>
          الأعضاء ({{ currentMembers.filter(m => !m.leftAt).length }})
        </VListSubheader>
        <VListItem
          v-for="m in currentMembers"
          :key="m.userId"
          :class="{ 'opacity-50': m.leftAt }"
        >
          <template #prepend>
            <VAvatar color="primary" variant="tonal" size="36">
              {{ (m.profile?.name ?? "?").charAt(0) }}
            </VAvatar>
          </template>
          <VListItemTitle class="font-weight-bold">
            {{ m.profile?.name ?? "—" }}
          </VListItemTitle>
          <VListItemSubtitle>
            <VChip
              size="x-small"
              :color="m.role === 'owner' ? 'warning' : (m.role === 'admin' ? 'primary' : 'default')"
              variant="tonal"
              class="me-1"
            >
              {{ m.role === "owner" ? "مالك" : (m.role === "admin" ? "مشرف" : "عضو") }}
            </VChip>
            <VChip
              v-if="m.leftAt"
              size="x-small"
              color="default"
              variant="tonal"
            >
              غادر
            </VChip>
            <VChip
              v-else-if="m.isMutedByAdminUntil && new Date(m.isMutedByAdminUntil) > new Date()"
              size="x-small"
              color="warning"
              variant="tonal"
            >
              مكتوم
            </VChip>
          </VListItemSubtitle>
          <template #append>
            <VMenu v-if="canManage && !m.leftAt && m.role === 'member'">
              <template #activator="{ props: act }">
                <VBtn v-bind="act" icon="ri-more-2-line" variant="text" size="small" />
              </template>
              <VList density="compact">
                <VListItem
                  v-if="!m.isMutedByAdminUntil || new Date(m.isMutedByAdminUntil) < new Date()"
                  title="كتم 24 ساعة"
                  prepend-icon="ri-volume-mute-line"
                  @click="mute24h(m)"
                />
                <VListItem
                  v-if="!m.isMutedByAdminUntil || new Date(m.isMutedByAdminUntil) < new Date()"
                  title="كتم أسبوعاً"
                  prepend-icon="ri-volume-mute-line"
                  @click="muteWeek(m)"
                />
                <VListItem
                  v-else
                  title="إلغاء الكتم"
                  prepend-icon="ri-volume-up-line"
                  @click="unmute(m)"
                />
                <VListItem
                  title="إزالة"
                  prepend-icon="ri-user-unfollow-line"
                  base-color="error"
                  @click="askRemoveMember(m)"
                />
              </VList>
            </VMenu>
          </template>
        </VListItem>
      </VList>
    </VNavigationDrawer>

    <!-- Edit dialog -->
    <VDialog v-model="editDialog.open" max-width="520">
      <VCard>
        <VCardTitle>تعديل المجموعة</VCardTitle>
        <VDivider />
        <VCardText class="pt-4">
          <VTextField
            v-model="editDialog.name"
            label="الاسم"
            density="comfortable"
            class="mb-3"
          />
          <VTextarea
            v-model="editDialog.description"
            label="الوصف"
            rows="2"
            auto-grow
            density="comfortable"
            class="mb-3"
          />
          <VSelect
            v-model="editDialog.mode"
            :items="[
              { title: 'محادثة مفتوحة', value: 'open' },
              { title: 'إعلانات فقط', value: 'announce_only' },
            ]"
            item-title="title"
            item-value="value"
            label="الوضع"
            density="comfortable"
          />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="editDialog.saving" @click="editDialog.open = false">
            إلغاء
          </VBtn>
          <VBtn color="primary" :loading="editDialog.saving" @click="saveEdit">
            حفظ
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Confirm dialog -->
    <VDialog v-model="confirm.open" max-width="460" persistent>
      <VCard>
        <VCardTitle>{{ confirm.title }}</VCardTitle>
        <VDivider />
        <VCardText class="pt-4">{{ confirm.text }}</VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="confirm.loading" @click="confirm.open = false">
            إلغاء
          </VBtn>
          <VBtn color="error" :loading="confirm.loading" @click="confirm.action && confirm.action()">
            متابعة
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="alert.open" :color="alert.type" location="bottom" timeout="2500">
      {{ alert.text }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.chat-shell {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 0;
  height: calc(100dvh - 130px);
  min-height: 480px;
  border-radius: 16px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.12);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.05);
}

/* ── Sidebar ───────────────────────────────────────────── */
.chat-sidebar {
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid rgba(var(--v-border-color), 0.12);
  background: rgb(var(--v-theme-background));
  min-width: 0;
  min-height: 0;
}
.chat-sidebar-head {
  padding: 16px 16px 8px;
}
.chat-sidebar-title {
  font-size: 18px;
  font-weight: 700;
}
.chat-sidebar-search {
  padding: 0 12px 8px;
}
.chat-sidebar-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.chat-tile {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.06);
}
.chat-tile:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.chat-tile.is-active {
  background: rgba(var(--v-theme-primary), 0.1);
}
.chat-tile-body {
  flex: 1;
  min-width: 0;
}
.chat-tile-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.chat-tile-name {
  font-weight: 700;
  font-size: 14px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.chat-tile-time {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  flex-shrink: 0;
}
.chat-tile-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 2px;
}
.chat-tile-preview {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── Main pane ─────────────────────────────────────────── */
.chat-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
}
.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  background: rgb(var(--v-theme-background));
}
.chat-header-body { min-width: 0; flex: 1; }
.chat-header-title {
  font-weight: 700;
  font-size: 14px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.chat-header-subtitle {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.chat-banner {
  padding: 6px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
}
.chat-banner--info {
  background: rgba(var(--v-theme-warning), 0.12);
  color: rgb(var(--v-theme-on-surface));
}

/* ── Messages (reverse stack) ──────────────────────────── */
.chat-messages {
  flex: 1 1 auto;
  /* CRITICAL: a flex child with overflow:auto must set min-height:0
     otherwise the default min-height:auto blocks shrinking and the
     container grows past the viewport instead of scrolling internally. */
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px;
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  background:
    linear-gradient(180deg, rgba(var(--v-theme-primary), 0.02), transparent 200px),
    rgb(var(--v-theme-background));
}
.chat-bubble-row {
  display: flex;
  justify-content: flex-end;
}
.chat-bubble-row.is-mine {
  justify-content: flex-start;
}
.chat-bubble {
  position: relative;
  max-width: 70%;
  padding: 8px 12px 6px;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}
.chat-bubble.is-mine {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.chat-bubble.is-deleted {
  font-style: italic;
  opacity: 0.7;
}
.chat-bubble-sender {
  font-size: 11px;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 3px;
}
.chat-bubble-pin {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: rgb(var(--v-theme-warning));
  margin-bottom: 3px;
  font-weight: 700;
}
.chat-bubble-body {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.chat-bubble-deleted {
  font-size: 13px;
}
.chat-bubble-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  opacity: 0.7;
  margin-top: 2px;
  justify-content: flex-end;
}
.chat-bubble.is-mine .chat-bubble-meta {
  color: rgb(var(--v-theme-on-primary));
}
.chat-bubble-retry {
  color: rgb(var(--v-theme-error));
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  margin-inline-start: 6px;
}
.chat-bubble-menu {
  position: absolute;
  top: 2px;
  inset-inline-end: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.chat-bubble:hover .chat-bubble-menu {
  opacity: 1;
}

/* ── Attachments ───────────────────────────────────────── */
.chat-attachment {
  margin-bottom: 4px;
}
.chat-attachment-img {
  max-width: 240px;
  max-height: 240px;
  border-radius: 10px;
  display: block;
}
.chat-attachment-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  font-size: 12px;
  color: inherit;
  text-decoration: none;
}

/* ── Composer ──────────────────────────────────────────── */
.chat-composer {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  padding: 8px 12px;
  background: rgb(var(--v-theme-background));
}
.chat-composer-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 6px;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.chat-composer-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.chat-composer-input {
  flex: 1;
}
</style>
