// Reactive state container for chat in the dashboard. Mirrors the Flutter
// `ConversationsController` + `ConversationController` + `ChatUnreadService`
// trio in a single composable for the web surface.
//
// Three responsibility groups, all reactive (Vue refs):
//   1. Conversations list (left sidebar) + unread totals (navbar badge).
//   2. Currently-open conversation (right pane) — header + members + msgs.
//   3. Send path (REST) + socket dedup + optimistic UI.
//
// Architectural rules carried over from Flutter:
//   - SEND  = REST only (`POST /chat/messages`).
//   - RECEIVE = Socket only (`message:new`, `conversation:read`, …).
//   - Dedup by server id first; for the sender's own messages, fall back
//     to (clientMessageId + body + senderId) so a socket broadcast that
//     beats the REST response doesn't create a duplicate bubble.
//
// Single shared instance: the composable is invoked from the layout, and
// any child page reads the same reactive refs via `useChatRealtime()` —
// there is no per-call factory.

import chatAdminApi from "@/api/chat/chat_admin_api"
import chatAxios from "@/utils/chat-axios"
import chatSocket from "@/utils/chat-socket"

// -----------------------------------------------------------------------------
// Module-level state — single source of truth for every consumer in the app.
// -----------------------------------------------------------------------------
const conversations = ref([])            // list shown in sidebar
const totalUnread = ref(0)               // navbar badge
const conversationsLoading = ref(false)

const currentId = ref(null)              // selected conversation id
const currentConversation = ref(null)    // header + flags
const currentMembers = ref([])           // members of the open group
const messages = ref([])                 // newest-first
const messagesLoading = ref(false)
const messagesHasMore = ref(true)
const sending = ref(false)
const typingUserName = ref(null)
const lastError = ref(null)

let _myUserId = null
let _initialized = false
let _typingDismissTimer = null
let _socketUnsubs = []

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

function readUserIdFromStorage() {
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return null
    const u = JSON.parse(raw)

    return (u?.id ?? u?._id ?? null)?.toString() || null
  } catch (_) {
    return null
  }
}

async function initialize() {
  if (_initialized) return
  _initialized = true
  _myUserId = readUserIdFromStorage()
  _wireSocket()
  chatSocket.connect()
  await fetchConversations()
}

function reset() {
  for (const u of _socketUnsubs) {
    try { u() } catch (_) { /* nop */ }
  }
  _socketUnsubs = []
  conversations.value = []
  totalUnread.value = 0
  currentId.value = null
  currentConversation.value = null
  currentMembers.value = []
  messages.value = []
  sending.value = false
  _initialized = false
  _myUserId = null
}

// -----------------------------------------------------------------------------
// Conversations list (sidebar)
// -----------------------------------------------------------------------------

async function fetchConversations() {
  conversationsLoading.value = true
  try {
    const res = await chatAxios.get("/chat/me/conversations?page=1&limit=50")
    const list = res.data?.data ?? []
    conversations.value = list
    recomputeUnread()
  } catch (e) {
    lastError.value = e?.response?.data?.message ?? "تعذّر تحميل المحادثات"
  } finally {
    conversationsLoading.value = false
  }
}

function recomputeUnread() {
  totalUnread.value = conversations.value.reduce(
    (s, c) => s + (c.unreadCount ?? 0),
    0,
  )
}

function bumpConversationToTop(convId, lastMessage) {
  const idx = conversations.value.findIndex(c => c.id === convId)
  if (idx === -1) return false
  const conv = conversations.value[idx]
  conv.lastMessage = lastMessage
  conv.lastMessageAt = lastMessage?.createdAt ?? conv.lastMessageAt
  // bump unread only for messages from someone other than me, and only
  // when the conversation is NOT currently open
  if (
    lastMessage?.senderId
    && lastMessage.senderId !== _myUserId
    && currentId.value !== convId
  ) {
    conv.unreadCount = (conv.unreadCount ?? 0) + 1
  }
  conversations.value.splice(idx, 1)
  conversations.value.unshift(conv)
  recomputeUnread()

  return true
}

// -----------------------------------------------------------------------------
// Active conversation
// -----------------------------------------------------------------------------

async function openConversation(convId) {
  if (!convId) return
  currentId.value = convId
  // Optimistic zero — server-side broadcast confirms in ~100ms.
  const tile = conversations.value.find(c => c.id === convId)
  if (tile && tile.unreadCount > 0) {
    tile.unreadCount = 0
    recomputeUnread()
  }
  await fetchCurrentConversation()
  await fetchMessages({ reset: true })
}

async function fetchCurrentConversation() {
  if (!currentId.value) return
  try {
    const res = await chatAxios.get(`/chat/conversations/${currentId.value}`)
    const data = res.data?.data ?? {}
    const conv = data.conversation ?? data
    // Stitch `me.role` onto the conversation row — mirrors the Flutter fix.
    if (data?.me) {
      const role = data.me.role
      conv.myRole = role === "owner" || role === "admin" || role === "member" ? role : "member"
      if (data.me.notificationsMuted === true) conv.notificationsMuted = true
    }
    currentConversation.value = conv
    currentMembers.value = Array.isArray(data.members) ? data.members : []
  } catch (e) {
    lastError.value = e?.response?.data?.message ?? "تعذّر تحميل المحادثة"
  }
}

async function fetchMessages({ reset = false } = {}) {
  if (!currentId.value) return
  messagesLoading.value = true
  try {
    let url = `/chat/conversations/${currentId.value}/messages?limit=30`
    if (!reset && messages.value.length) {
      const oldest = messages.value[messages.value.length - 1]
      url += `&before=${oldest.id}`
    }
    const res = await chatAxios.get(url)
    const rows = res.data?.data ?? []
    if (reset) {
      messages.value = rows
    } else {
      messages.value = [...messages.value, ...rows]
    }
    messagesHasMore.value = rows.length >= 30

    if (reset && rows.length) {
      // Mark read up to the latest known message — REST emits the
      // conversation:read socket event so other clients sync too.
      markRead(rows[0].id).catch(() => undefined)
    }
  } catch (e) {
    lastError.value = e?.response?.data?.message ?? "تعذّر تحميل الرسائل"
  } finally {
    messagesLoading.value = false
  }
}

async function markRead(lastReadMessageId) {
  if (!currentId.value) return
  try {
    await chatAxios.post(
      `/chat/conversations/${currentId.value}/read`,
      lastReadMessageId ? { lastReadMessageId } : {},
    )
    const tile = conversations.value.find(c => c.id === currentId.value)
    if (tile && tile.unreadCount > 0) {
      tile.unreadCount = 0
      recomputeUnread()
    }
  } catch (_) { /* silent — socket broadcast also keeps state in sync */ }
}

// -----------------------------------------------------------------------------
// Send (optimistic + race-safe dedup)
// -----------------------------------------------------------------------------

function newClientId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function sendMessage({ body, attachmentIds } = {}) {
  if (!currentId.value) return
  const trimmed = (body ?? "").trim()
  if (!trimmed && !(attachmentIds?.length)) return

  const clientId = newClientId()
  const optimistic = {
    id: clientId,
    clientMessageId: clientId,
    conversationId: currentId.value,
    senderId: _myUserId,
    body: trimmed || null,
    kind: attachmentIds?.length ? "image" : "text",
    createdAt: new Date().toISOString(),
    attachments: [],
    status: "sending",
  }
  messages.value = [optimistic, ...messages.value]

  sending.value = true
  try {
    const res = await chatAxios.post("/chat/messages", {
      conversationId: currentId.value,
      ...(trimmed ? { body: trimmed } : {}),
      ...(attachmentIds?.length ? { attachmentIds } : {}),
    })
    const saved = res.data?.data ?? null
    _reconcileOptimistic(clientId, saved)
  } catch (_) {
    const idx = messages.value.findIndex(m => m.clientMessageId === clientId)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], status: "failed" }
    }
  } finally {
    sending.value = false
  }
}

async function retrySend(failed) {
  if (!failed || failed.status !== "failed") return
  const idx = messages.value.findIndex(m => m.clientMessageId === failed.clientMessageId)
  if (idx === -1) return
  messages.value[idx] = { ...failed, status: "sending" }
  try {
    const res = await chatAxios.post("/chat/messages", {
      conversationId: currentId.value,
      ...(failed.body ? { body: failed.body } : {}),
      ...(failed.attachments?.length
        ? { attachmentIds: failed.attachments.map(a => a.id) }
        : {}),
    })
    const saved = res.data?.data ?? null
    _reconcileOptimistic(failed.clientMessageId, saved)
  } catch (_) {
    messages.value[idx] = { ...failed, status: "failed" }
  }
}

function _reconcileOptimistic(clientId, saved) {
  if (!saved) return
  const idx = messages.value.findIndex(m => m.clientMessageId === clientId)
  if (idx === -1) {
    // Socket beat REST — promotion already happened in _onMessageNew.
    return
  }
  const existing = messages.value[idx]
  if (existing.id === saved.id) {
    messages.value[idx] = { ...existing, status: "sent" }

    return
  }
  messages.value[idx] = {
    ...saved,
    clientMessageId: clientId,
    status: "sent",
  }
}

// -----------------------------------------------------------------------------
// Attachments
// -----------------------------------------------------------------------------

async function uploadAttachment(file) {
  if (!currentId.value || !file) return null
  const form = new FormData()
  form.append("conversationId", currentId.value)
  form.append("file", file)
  const res = await chatAxios.post("/chat/attachments", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return res.data?.data?.attachment ?? null
}

// -----------------------------------------------------------------------------
// Moderation passthroughs (reuse the existing chat-admin api class)
// -----------------------------------------------------------------------------

async function deleteMessage(messageId) {
  await chatAdminApi.deleteMessage(messageId)
  const idx = messages.value.findIndex(m => m.id === messageId)
  if (idx !== -1) {
    messages.value[idx] = { ...messages.value[idx], deletedAt: new Date().toISOString() }
  }
}

async function togglePin(message) {
  await chatAdminApi.togglePin(message.id, !message.isPinned)
  const idx = messages.value.findIndex(m => m.id === message.id)
  if (idx !== -1) {
    messages.value[idx] = { ...messages.value[idx], isPinned: !message.isPinned }
  }
}

async function updateGroup(payload) {
  if (!currentId.value) return
  await chatAdminApi.updateGroup(currentId.value, payload)
  await fetchCurrentConversation()
  await fetchConversations()
}

async function archiveGroup() {
  if (!currentId.value) return
  await chatAdminApi.archiveGroup(currentId.value)
  await fetchConversations()
  await fetchCurrentConversation()
}

async function removeMember(memberUserId) {
  if (!currentId.value) return
  await chatAdminApi.removeMember(currentId.value, memberUserId)
  await fetchCurrentConversation()
}

async function muteMember(memberUserId, hours) {
  if (!currentId.value) return
  const muteUntil = new Date(Date.now() + hours * 3600_000).toISOString()
  await chatAdminApi.updateMember(currentId.value, memberUserId, { muteUntil })
  await fetchCurrentConversation()
}

async function unmuteMember(memberUserId) {
  if (!currentId.value) return
  await chatAdminApi.updateMember(currentId.value, memberUserId, { muteUntil: null })
  await fetchCurrentConversation()
}

// -----------------------------------------------------------------------------
// Socket wiring
// -----------------------------------------------------------------------------

function _wireSocket() {
  _socketUnsubs.push(chatSocket.on("message:new", _onMessageNew))
  _socketUnsubs.push(chatSocket.on("message:deleted", _onMessageDeleted))
  _socketUnsubs.push(chatSocket.on("message:pin_updated", _onPinUpdated))
  _socketUnsubs.push(chatSocket.on("message:typing", _onTyping))
  _socketUnsubs.push(chatSocket.on("conversation:read", _onConversationRead))
  _socketUnsubs.push(chatSocket.on("group:updated", _onGroupUpdated))
  _socketUnsubs.push(chatSocket.on("member:added", _onMembersChanged))
  _socketUnsubs.push(chatSocket.on("member:removed", _onMembersChanged))
  _socketUnsubs.push(chatSocket.onConnected(() => {
    // Re-fetch list on reconnect — we may have missed events.
    fetchConversations()
    if (currentId.value) fetchMessages({ reset: true })
  }))
}

function _onMessageNew(data) {
  if (!data || typeof data !== "object") return
  const convId = String(data.conversationId ?? "")
  if (!convId) return

  // ── List update (sidebar)
  const handled = bumpConversationToTop(convId, data)
  if (!handled) {
    // Conversation we didn't know about — fetch the list.
    fetchConversations()
  }

  // ── Active conversation update (right pane)
  if (currentId.value !== convId) return

  // Layer 1: dedup by server id.
  if (messages.value.some(m => m.id === data.id)) return

  // Layer 2: own-send socket-beat-REST race. Promote optimistic in place.
  if (data.senderId === _myUserId) {
    const optIdx = messages.value.findIndex(m =>
      m.clientMessageId
      && m.status === "sending"
      && m.senderId === _myUserId
      && (m.body ?? "") === (data.body ?? ""),
    )
    if (optIdx !== -1) {
      messages.value[optIdx] = {
        ...data,
        clientMessageId: messages.value[optIdx].clientMessageId,
        status: "sent",
      }

      return
    }
  }

  messages.value = [{ ...data, status: "sent" }, ...messages.value]
  // Mark read since the user is looking at it.
  markRead(data.id).catch(() => undefined)
}

function _onMessageDeleted(data) {
  if (!data || data.conversationId !== currentId.value) return
  const idx = messages.value.findIndex(m => m.id === data.messageId)
  if (idx !== -1) {
    messages.value[idx] = {
      ...messages.value[idx],
      deletedAt: new Date().toISOString(),
    }
  }
}

function _onPinUpdated(data) {
  if (!data || data.conversationId !== currentId.value) return
  const idx = messages.value.findIndex(m => m.id === data.messageId)
  if (idx !== -1) {
    messages.value[idx] = { ...messages.value[idx], isPinned: data.pinned === true }
  }
}

function _onTyping(data) {
  if (!data || data.conversationId !== currentId.value) return
  if (data.userId === _myUserId) return
  const m = currentMembers.value.find(x => x.userId === data.userId)
  typingUserName.value = m?.profile?.name ?? "يكتب"
  if (_typingDismissTimer) clearTimeout(_typingDismissTimer)
  _typingDismissTimer = setTimeout(() => { typingUserName.value = null }, 4000)
}

function _onConversationRead(data) {
  if (!data) return
  const convId = data.conversationId
  // Only my-own read should zero the count.
  if (data.userId !== _myUserId) return
  const tile = conversations.value.find(c => c.id === convId)
  if (tile && tile.unreadCount > 0) {
    tile.unreadCount = 0
    recomputeUnread()
  }
}

function _onGroupUpdated(data) {
  if (!data) return
  if (data.conversationId === currentId.value) fetchCurrentConversation()
  fetchConversations()
}

function _onMembersChanged(data) {
  if (!data) return
  if (data.conversationId === currentId.value) {
    fetchCurrentConversation()
    // If I was the one removed, the next fetch will 403 → controller clears.
  }
  fetchConversations()
}

// Throttle typing emit to one per 3 seconds.
let _lastTypingEmit = 0
function emitTyping() {
  const now = Date.now()
  if (now - _lastTypingEmit < 3000) return
  _lastTypingEmit = now
  if (currentId.value) chatSocket.emit("message:typing", { conversationId: currentId.value })
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function useChatRealtime() {
  return {
    // state
    conversations,
    totalUnread,
    conversationsLoading,
    currentId,
    currentConversation,
    currentMembers,
    messages,
    messagesLoading,
    messagesHasMore,
    sending,
    typingUserName,
    lastError,

    // lifecycle
    initialize,
    reset,

    // list + open
    fetchConversations,
    openConversation,

    // active conversation
    fetchMessages,
    sendMessage,
    retrySend,
    uploadAttachment,
    markRead,
    emitTyping,

    // moderation
    deleteMessage,
    togglePin,
    updateGroup,
    archiveGroup,
    removeMember,
    muteMember,
    unmuteMember,
  }
}
