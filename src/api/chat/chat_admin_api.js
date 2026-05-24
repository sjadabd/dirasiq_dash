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
    return await chatAxios.get(
      `/chat/admin/conversations${buildQuery({
        page: opts.page,
        limit: opts.limit,
        type: opts.type,
        status: opts.status,
        q: opts.q,
        teacherId: opts.teacherId,
      })}`,
    )
  }

  async getConversation(id) {
    return await chatAxios.get(`/chat/admin/conversations/${id}`)
  }

  async listMessages(id, opts = {}) {
    return await chatAxios.get(
      `/chat/admin/conversations/${id}/messages${buildQuery({
        before: opts.before,
        limit: opts.limit,
      })}`,
    )
  }

  async listModerationLogs(opts = {}) {
    return await chatAxios.get(
      `/chat/admin/moderation-logs${buildQuery({
        page: opts.page,
        limit: opts.limit,
        conversationId: opts.conversationId,
        actorUserId: opts.actorUserId,
        action: opts.action,
      })}`,
    )
  }

  // -------------------------------- conversation management (existing /chat)
  // These hit the non-admin endpoints which enforce ownership/role server-side.
  // Teachers can act on conversations they own. Super-admins will need the
  // Phase 8.B permission bypass to act on conversations they don't belong to;
  // until then the dashboard surfaces a 403 toast for those.

  async updateGroup(id, payload) {
    return await chatAxios.put(`/chat/groups/${id}`, payload)
  }

  async archiveGroup(id) {
    return await chatAxios.delete(`/chat/groups/${id}`)
  }

  async addMembers(id, userIds) {
    return await chatAxios.post(`/chat/groups/${id}/members`, { userIds })
  }

  async removeMember(id, memberId) {
    return await chatAxios.delete(`/chat/groups/${id}/members/${memberId}`)
  }

  async updateMember(id, memberId, payload) {
    return await chatAxios.patch(
      `/chat/groups/${id}/members/${memberId}`,
      payload,
    )
  }

  async deleteMessage(messageId) {
    return await chatAxios.delete(`/chat/messages/${messageId}`)
  }

  async togglePin(messageId, pinned) {
    return await chatAxios.post(`/chat/messages/${messageId}/pin`, { pinned })
  }
}

export default new ChatAdmin()
