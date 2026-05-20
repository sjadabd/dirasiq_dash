import chatAxios from "@/utils/chat-axios.js"

// Build a query string from an options bag, dropping null / undefined /
// empty values so the backend Zod schema doesn't reject the literal "null".
function buildQuery(opts = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(opts)) {
    if (v === null || v === undefined) continue
    const s = String(v).trim()
    if (s === "" || s === "null" || s === "undefined") continue
    q.set(k, s)
  }
  const qs = q.toString()

  return qs ? `?${qs}` : ""
}

class ChatAdmin {
  // ---------------------------------------------------- conversations (read)
  async listConversations(opts = {}) {
    const res = await chatAxios.get(
      `/chat/admin/conversations${buildQuery({
        page: opts.page,
        limit: opts.limit,
        type: opts.type,
        status: opts.status,
        q: opts.q,
        teacherId: opts.teacherId,
      })}`,
    )

    return res
  }

  async getConversation(id) {
    const res = await chatAxios.get(`/chat/admin/conversations/${id}`)

    return res
  }

  async listMessages(id, opts = {}) {
    const res = await chatAxios.get(
      `/chat/admin/conversations/${id}/messages${buildQuery({
        before: opts.before,
        limit: opts.limit,
      })}`,
    )

    return res
  }

  async listModerationLogs(opts = {}) {
    const res = await chatAxios.get(
      `/chat/admin/moderation-logs${buildQuery({
        page: opts.page,
        limit: opts.limit,
        conversationId: opts.conversationId,
        actorUserId: opts.actorUserId,
        action: opts.action,
      })}`,
    )

    return res
  }

  // -------------------------------- conversation management (existing /chat)
  // These hit the non-admin endpoints which enforce ownership/role server-side.
  // Teachers can act on conversations they own. Super-admins will need the
  // Phase 8.B permission bypass to act on conversations they don't belong to;
  // until then the dashboard surfaces a 403 toast for those.

  async updateGroup(id, payload) {
    const res = await chatAxios.put(`/chat/groups/${id}`, payload)

    return res
  }

  async archiveGroup(id) {
    const res = await chatAxios.delete(`/chat/groups/${id}`)

    return res
  }

  async addMembers(id, userIds) {
    const res = await chatAxios.post(`/chat/groups/${id}/members`, { userIds })

    return res
  }

  async removeMember(id, memberId) {
    const res = await chatAxios.delete(`/chat/groups/${id}/members/${memberId}`)

    return res
  }

  async updateMember(id, memberId, payload) {
    const res = await chatAxios.patch(
      `/chat/groups/${id}/members/${memberId}`,
      payload,
    )

    return res
  }

  async deleteMessage(messageId) {
    const res = await chatAxios.delete(`/chat/messages/${messageId}`)

    return res
  }

  async togglePin(messageId, pinned) {
    const res = await chatAxios.post(`/chat/messages/${messageId}/pin`, { pinned })

    return res
  }
}

export default new ChatAdmin()
