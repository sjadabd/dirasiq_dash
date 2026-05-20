import axiosInstance from "@/utils/axios.js";

/**
 * Build a query string from an options bag, dropping null / undefined /
 * empty / "null" / "undefined" values so they don't reach the backend as the
 * literal string "null" (which would never match a real boolean / id).
 * Bug fix: previous `?foo=${opts.foo}` interpolation sent "null".
 */
function buildQuery(opts = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s === "" || s === "null" || s === "undefined") continue;
    q.set(k, s);
  }
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

class Admin {
  // academic-years
  async createAcademicYear(userData) {
    const response = await axiosInstance.post(`/academic-years`, userData);
    return response;
  }
  async getAcademicYear(userData) {
    const opts = userData?.options || {};
    const response = await axiosInstance.get(`/academic-years${buildQuery({
      page: opts.page, limit: opts.limit, search: opts.search, is_active: opts.is_active,
    })}`);
    return response;
  }
  async getAcademicYearById(id) {
    const response = await axiosInstance.get(`/academic-years/${id}`);
    return response;
  }
  async getActiveAcademicYear() {
    const response = await axiosInstance.get(`/academic-years/active`);
    return response;
  }
  async updateAcademicYear(id, payload) {
    const response = await axiosInstance.put(`/academic-years/${id}`, payload);
    return response;
  }
  async activateAcademicYear(id) {
    const response = await axiosInstance.patch(`/academic-years/${id}/activate`);
    return response;
  }
  async deleteAcademicYear(id) {
    const response = await axiosInstance.delete(`/academic-years/${id}`);
    return response;
  }
  //   academic-years

  // grades
  async createGrade(userData) {
    const response = await axiosInstance.post(`/grades`, userData);
    return response;
  }
  async getGrade(userData) {
    const opts = userData?.options || {};
    const response = await axiosInstance.get(`/grades${buildQuery({
      page: opts.page, limit: opts.limit, search: opts.search, is_active: opts.is_active,
    })}`);
    return response;
  }
  async getGradeById(id) {
    const response = await axiosInstance.get(`/grades/${id}`);
    return response;
  }
  async editGrade(id, userData) {
    const response = await axiosInstance.put(`/grades/${id}`, userData);
    return response;
  }
  async activateGrade(id) {
    const response = await axiosInstance.patch(`/grades/${id}/activate`);
    return response;
  }
  async deleteGrade(id) {
    const response = await axiosInstance.delete(`/grades/${id}`);
    return response;
  }
  //   grades

  // teachers (super-admin view)
  async getTeachers(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    if (params.search) q.set("search", params.search);
    const qs = q.toString();
    const response = await axiosInstance.get(`/super-admin/teachers${qs ? `?${qs}` : ""}`);
    return response;
  }
  async getTeacherById(id) {
    const response = await axiosInstance.get(`/super-admin/teachers/${id}`);
    return response;
  }
  // teachers (super-admin view)

  // subscription-packages
  async createSubscriptionPackage(userData) {
    const response = await axiosInstance.post(`/subscription-packages`, userData);
    return response;
  }
  async getSubscriptionPackage(userData) {
    const opts = userData?.options || {};
    const response = await axiosInstance.get(`/subscription-packages${buildQuery({
      page: opts.page, limit: opts.limit, search: opts.search,
      isActive: opts.isActive, isFree: opts.isFree, deleted: opts.deleted,
    })}`);
    return response;
  }
  async editSubscriptionPackage(id, userData) {
    const response = await axiosInstance.put(`/subscription-packages/${id}`, userData);
    return response;
  }
  async activateSubscriptionPackage(id) {
    const response = await axiosInstance.patch(`/subscription-packages/${id}/activate`);
    return response;
  }
  async deactivateSubscriptionPackage(id) {
    const response = await axiosInstance.patch(`/subscription-packages/${id}/deactivate`);
    return response;
  }
  // subscription-packages

  // super-admin settings
  async getBookingConfirmFee() {
    const response = await axiosInstance.get(`/super-admin/settings/booking-confirm-fee`)
    return response
  }

  async setBookingConfirmFee(feeIqd) {
    const response = await axiosInstance.put(`/super-admin/settings/booking-confirm-fee`, { feeIqd })
    return response
  }
  // super-admin settings

  // dashboard
  async getDashboardStats() {
    const response = await axiosInstance.get(`/super-admin/dashboard/stats`);
    return response;
  }
  // dashboard

  // news
  async createNews(payload) {
    const response = await axiosInstance.post(`/news`, payload);
    return response;
  }
  async getNews(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    if (params.search) q.set("search", params.search);
    if (params.newsType) q.set("newsType", params.newsType);
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== "") {
      q.set("isActive", params.isActive);
    }
    const qs = q.toString();
    const response = await axiosInstance.get(`/news${qs ? `?${qs}` : ""}`);
    return response;
  }
  async getNewsById(id) {
    const response = await axiosInstance.get(`/news/${id}`);
    return response;
  }
  async updateNews(id, payload) {
    const response = await axiosInstance.put(`/news/${id}`, payload);
    return response;
  }
  async deleteNews(id) {
    const response = await axiosInstance.delete(`/news/${id}`);
    return response;
  }
  async publishNews(id) {
    const response = await axiosInstance.patch(`/news/${id}/publish`);
    return response;
  }
  // news

  // notifications (admin)
  async getAdminNotifications(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    if (params.priority) q.set("priority", params.priority);
    if (params.recipientType) q.set("recipientType", params.recipientType);
    if (params.dateFrom) q.set("dateFrom", params.dateFrom);
    if (params.dateTo) q.set("dateTo", params.dateTo);
    const qs = q.toString();
    const response = await axiosInstance.get(`/notifications${qs ? `?${qs}` : ""}`);
    return response;
  }
  async getNotificationStatistics() {
    const response = await axiosInstance.get(`/notifications/statistics`);
    return response;
  }
  async processPendingNotifications() {
    const response = await axiosInstance.post(`/notifications/process-pending`);
    return response;
  }
  async deleteNotification(id) {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response;
  }
  // notifications (admin)
}
export default new Admin();
