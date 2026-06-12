import axiosInstance from "@/utils/axios.js"

/**
 * Build a query string from an options bag, dropping null / undefined /
 * empty / "null" / "undefined" values so they don't reach the backend as the
 * literal string "null" (which would never match a real boolean / id).
 * Bug fix: previous `?foo=${opts.foo}` interpolation sent "null".
 */
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

class Admin {
  // academic-years
  async createAcademicYear(userData) {
    return await axiosInstance.post(`/academic-years`, userData)
  }
  async getAcademicYear(userData) {
    const opts = userData?.options || {}

    return await axiosInstance.get(`/academic-years${buildQuery({
      page: opts.page, limit: opts.limit, search: opts.search, is_active: opts.is_active,
    })}`)
  }
  async getAcademicYearById(id) {
    return await axiosInstance.get(`/academic-years/${id}`)
  }
  async getActiveAcademicYear() {
    return await axiosInstance.get(`/academic-years/active`)
  }
  async updateAcademicYear(id, payload) {
    return await axiosInstance.put(`/academic-years/${id}`, payload)
  }
  async activateAcademicYear(id) {
    return await axiosInstance.patch(`/academic-years/${id}/activate`)
  }
  async deleteAcademicYear(id) {
    return await axiosInstance.delete(`/academic-years/${id}`)
  }

  //   academic-years

  // grades
  async createGrade(userData) {
    return await axiosInstance.post(`/grades`, userData)
  }
  async getGrade(userData) {
    const opts = userData?.options || {}

    return await axiosInstance.get(`/grades${buildQuery({
      page: opts.page, limit: opts.limit, search: opts.search, is_active: opts.is_active,
    })}`)
  }
  async getGradeById(id) {
    return await axiosInstance.get(`/grades/${id}`)
  }
  async editGrade(id, userData) {
    return await axiosInstance.put(`/grades/${id}`, userData)
  }
  async activateGrade(id) {
    return await axiosInstance.patch(`/grades/${id}/activate`)
  }
  async deleteGrade(id) {
    return await axiosInstance.delete(`/grades/${id}`)
  }

  //   grades

  // teachers (super-admin view)
  async getTeachers(params = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set("page", params.page)
    if (params.limit) q.set("limit", params.limit)
    if (params.search) q.set("search", params.search)
    const qs = q.toString()
    
    return await axiosInstance.get(`/super-admin/teachers${qs ? `?${qs}` : ""}`)
  }
  async getTeacherById(id) {
    return await axiosInstance.get(`/super-admin/teachers/${id}`)
  }

  // teachers (super-admin view)

  // (Phase 7) subscription-package CRUD removed alongside the subscription
  // model. The new commission tier admin endpoints land in Phase 8.

  // super-admin settings
  async getBookingConfirmFee() {
    return await axiosInstance.get(`/super-admin/settings/booking-confirm-fee`)
  }

  async setBookingConfirmFee(feeIqd) {
    return await axiosInstance.put(`/super-admin/settings/booking-confirm-fee`, { feeIqd })
  }

  // super-admin settings

  // dashboard
  async getDashboardStats() {
    return await axiosInstance.get(`/super-admin/dashboard/stats`)
  }

  // dashboard

  // news
  async createNews(payload) {
    return await axiosInstance.post(`/news`, payload)
  }
  async getNews(params = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set("page", params.page)
    if (params.limit) q.set("limit", params.limit)
    if (params.search) q.set("search", params.search)
    if (params.newsType) q.set("newsType", params.newsType)
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== "") {
      q.set("isActive", params.isActive)
    }
    const qs = q.toString()
    
    return await axiosInstance.get(`/news${qs ? `?${qs}` : ""}`)
  }
  async getNewsById(id) {
    return await axiosInstance.get(`/news/${id}`)
  }
  async updateNews(id, payload) {
    return await axiosInstance.put(`/news/${id}`, payload)
  }
  async deleteNews(id) {
    return await axiosInstance.delete(`/news/${id}`)
  }
  async publishNews(id) {
    return await axiosInstance.patch(`/news/${id}/publish`)
  }

  // news

  // notifications (admin)
  async getAdminNotifications(params = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set("page", params.page)
    if (params.limit) q.set("limit", params.limit)
    if (params.type) q.set("type", params.type)
    if (params.status) q.set("status", params.status)
    if (params.priority) q.set("priority", params.priority)
    if (params.recipientType) q.set("recipientType", params.recipientType)
    if (params.dateFrom) q.set("dateFrom", params.dateFrom)
    if (params.dateTo) q.set("dateTo", params.dateTo)
    const qs = q.toString()
    
    return await axiosInstance.get(`/notifications${qs ? `?${qs}` : ""}`)
  }
  async getNotificationStatistics() {
    return await axiosInstance.get(`/notifications/statistics`)
  }
  async processPendingNotifications() {
    return await axiosInstance.post(`/notifications/process-pending`)
  }
  async deleteNotification(id) {
    return await axiosInstance.delete(`/notifications/${id}`)
  }

  // notifications (admin)

  // ===========================================================================
  // Teacher Applications (super-admin) — Phase 5
  // ===========================================================================
  //
  // Phase 1/2/3 backend surface (gated by requireRole(SUPER_ADMIN)):
  //   GET    /super-admin/teacher-applications        — paginated list
  //   GET    /super-admin/teacher-applications/:id    — detail
  //   PATCH  /super-admin/teacher-applications/:id/approve
  //   PATCH  /super-admin/teacher-applications/:id/reject
  //   PATCH  /super-admin/teacher-applications/:id/request-more-info
  //   GET    /super-admin/teacher-applications/:id/files
  //   GET    /super-admin/teacher-applications/:id/files/:fileId  (streams bytes)

  async listTeacherApplications({ page = 1, limit = 20, status, search } = {}) {
    const qs = buildQuery({ page, limit, status, search })
    
    return await axiosInstance.get(`/super-admin/teacher-applications${qs}`)
  }

  async getTeacherApplication(id) {
    return await axiosInstance.get(`/super-admin/teacher-applications/${id}`)
  }

  async approveTeacherApplication(id, { adminNotes } = {}) {
    return await axiosInstance.patch(
      `/super-admin/teacher-applications/${id}/approve`,
      adminNotes ? { adminNotes } : {},
    )
  }

  async rejectTeacherApplication(id, { rejectionReason, adminNotes } = {}) {
    return await axiosInstance.patch(
      `/super-admin/teacher-applications/${id}/reject`,
      { rejectionReason, ...(adminNotes ? { adminNotes } : {}) },
    )
  }

  async requestMoreInfoTeacherApplication(id, { adminNotes } = {}) {
    return await axiosInstance.patch(
      `/super-admin/teacher-applications/${id}/request-more-info`,
      { adminNotes },
    )
  }

  async listTeacherApplicationFiles(id) {
    return await axiosInstance.get(`/super-admin/teacher-applications/${id}/files`)
  }

  // Returns the raw streaming endpoint URL — used in <img src=…> / <iframe src=…>.
  // The axios instance attaches Authorization on real fetches, but <img> tags
  // can't send a header. We use a fetch-based blob loader on the page side
  // (see file-preview helpers in the detail page) so files stream through the
  // auth-gated endpoint and never bypass the JWT check.
  teacherApplicationFileUrl(id, fileId) {
    return `/super-admin/teacher-applications/${id}/files/${fileId}`
  }

  // -------------------------------------------------------------------------
  // Phase 10.1.A — Video courses moderation
  // -------------------------------------------------------------------------
  //
  // Endpoints (super-admin only):
  //   GET    /super-admin/video-courses             — list
  //   GET    /super-admin/video-courses/:id         — detail + lessons
  //   PATCH  /super-admin/video-courses/:id/approve
  //   PATCH  /super-admin/video-courses/:id/hide
  //   PATCH  /super-admin/video-courses/:id/reject
  //   DELETE /super-admin/video-courses/:id         — soft delete

  async listVideoCourses({
    page = 1,
    limit = 20,
    status,
    visibility,
    subject,
    teachingStage,
    teacherId,
    search,
  } = {}) {
    const qs = buildQuery({
      page, limit, status, visibility, subject, teachingStage, teacherId, search,
    })

    return await axiosInstance.get(`/super-admin/video-courses${qs}`)
  }

  async getVideoCourse(id) {
    return await axiosInstance.get(`/super-admin/video-courses/${id}`)
  }

  async approveVideoCourse(id, { reviewNotes } = {}) {
    return await axiosInstance.patch(
      `/super-admin/video-courses/${id}/approve`,
      reviewNotes ? { reviewNotes } : {},
    )
  }

  async hideVideoCourse(id, { reviewNotes } = {}) {
    return await axiosInstance.patch(
      `/super-admin/video-courses/${id}/hide`,
      reviewNotes ? { reviewNotes } : {},
    )
  }

  async rejectVideoCourse(id, { reviewNotes }) {
    return await axiosInstance.patch(
      `/super-admin/video-courses/${id}/reject`,
      { reviewNotes },
    )
  }

  async deleteVideoCourse(id) {
    return await axiosInstance.delete(`/super-admin/video-courses/${id}`)
  }

  // teacher withdrawals (payouts)
  async listWithdrawals({ page = 1, limit = 20, status } = {}) {
    return await axiosInstance.get(`/super-admin/withdrawals${buildQuery({ page, limit, status })}`)
  }
  async approveWithdrawal(id, adminNotes) {
    return await axiosInstance.patch(`/super-admin/withdrawals/${id}/approve`, { adminNotes })
  }
  async rejectWithdrawal(id, reason) {
    return await axiosInstance.patch(`/super-admin/withdrawals/${id}/reject`, { reason })
  }
  async markWithdrawalPaid(id, payload) {
    return await axiosInstance.patch(`/super-admin/withdrawals/${id}/mark-paid`, payload)
  }

  // The receipt is private on the server. Stream it through the auth-gated
  // endpoint as a blob and hand back an object URL — an <img>/VImg tag can't
  // attach the JWT header itself.
  async getWithdrawalReceiptObjectUrl(id) {
    const res = await axiosInstance.get(`/super-admin/withdrawals/${id}/receipt`, {
      responseType: "blob",
    })

    return URL.createObjectURL(res.data)
  }
}
export default new Admin()
