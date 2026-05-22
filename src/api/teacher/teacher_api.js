import axiosInstance from "@/utils/axios.js";

class TeacherApi {
  // profile
  async completeProfile(userData) {
    const response = await axiosInstance.post(`/auth/complete-profile`, userData);
    return response;
  }
  async uploadIntroVideo(payload, config = {}) {
    if (payload instanceof FormData) {
      const response = await axiosInstance.post("/teacher/profile/intro-video", payload, {
        ...config,
        // Do NOT set Content-Type manually; Axios will set the correct multipart boundary
      })
      return response
    }
    // Fallback: JSON payload (base64)
    const response = await axiosInstance.post("/teacher/profile/intro-video", payload, config)
    return response
  }

  async getIntroVideo() {
    const response = await axiosInstance.get("/teacher/profile/intro-video")
    return response
  }


  // Academic years (Teacher)
  async getAcademicYears() {
    const response = await axiosInstance.get(`/teacher/academic-years`)
    return response
  }
  async getDashboard() {
    const response = await axiosInstance.get(`/teacher/dashboard`);
    return response;
  }
  async getReferralDashboard() {
    const response = await axiosInstance.get(`/teacher/dashboard/referrals`);
    return response;
  }
  // (Phase 7) getActivePackages removed — subscription model is gone.
  async getPublicNews() {
    const response = await axiosInstance.get(`/public/news`);
    return response;
  }
  // Public — list of governorates the platform covers. Used by the landing
  // "live stats" strip to advertise coverage. Anonymous-callable.
  async getGovernorates() {
    const response = await axiosInstance.get(`/teacher-search/governorates`);
    return response;
  }

  // wallet (Teacher)
  async getWallet() {
    const response = await axiosInstance.get(`/teacher/wallet`)
    return response
  }

  async getWalletTransactions(page = 1, limit = 20) {
    const response = await axiosInstance.get(`/teacher/wallet/transactions`, {
      params: { page, limit },
    })
    return response
  }

  // (Phase 7) Wayl topup + subscription link + package activation removed.
  // Wallet credits will be generated automatically from course purchases
  // in a later phase; manual top-ups are no longer in scope.
  // profile

  // expenses
  // GET /teacher/expenses
  //   params: { page, limit, studyYear?, from?, to?, category?, paymentMethod?, search?, deleted? }
  //   response: { data: TeacherExpense[], meta: { pagination, summary: { totalAmount, count, byCategory } } }
  async getExpenses(params) {
    const response = await axiosInstance.get(`/teacher/expenses`, { params })
    return response
  }
  // POST /teacher/expenses
  //   body: { amount, note?, expense_date?, category?, paymentMethod? }
  async addExpense(payload) {
    const response = await axiosInstance.post(`/teacher/expenses`, payload)
    return response
  }
  // PATCH /teacher/expenses/:id
  async updateExpense(id, payload) {
    const response = await axiosInstance.patch(`/teacher/expenses/${encodeURIComponent(id)}`, payload)
    return response
  }
  // DELETE /teacher/expenses/:id  (soft delete)
  async deleteExpense(id) {
    const response = await axiosInstance.delete(`/teacher/expenses/${encodeURIComponent(id)}`)
    return response
  }
  // PATCH /teacher/expenses/:id/restore
  async restoreExpense(id) {
    const response = await axiosInstance.patch(`/teacher/expenses/${encodeURIComponent(id)}/restore`)
    return response
  }
  // expenses

  // reports
  async getFinancialReport(params) {
    const response = await axiosInstance.get(`/teacher/reports/financial`, { params })
    return response
  }
  // reports

  // dashboard
  async getUpcomingToday() {
    // returns: { success, message, data: [ { sessionId, courseId, courseName, title, startTime, endTime, startAt, endAt, state } ], count }
    const response = await axiosInstance.get(`/teacher/dashboard/upcoming-today`);
    return response;
  }
  // dashboard

  // grades
  async getAllGrades() {
    const response = await axiosInstance.get(`/grades/all`);
    return response;
  }
  async getAllGradess() {
    const response = await axiosInstance.get(`/grades/all-student`);
    return response;
  }
  async getAllMyGrades() {
    const response = await axiosInstance.get(`/grades/my-grades`);
    return response;
  }
  // grades

  // subjects
  // GET /teacher/subjects
  //   params: { page, limit, search?, is_deleted? }
  //   response: { data: Subject[], meta: { pagination } }
  async getSubjects(opts = {}) {
    const o = opts.options || opts;
    const params = {
      page: o.page || 1,
      limit: o.limit || 10,
    };
    if (o.search != null && o.search !== '') params.search = o.search;
    // Only forward is_deleted when explicitly true/false; null = "all" → omit.
    if (o.is_deleted === true || o.is_deleted === false) params.is_deleted = o.is_deleted;
    const response = await axiosInstance.get(`/teacher/subjects`, { params });
    return response;
  }
  async getAllSubjects() {
    const response = await axiosInstance.get(`/teacher/subjects/all`);
    return response;
  }
  async addSubjects(payload) {
    const response = await axiosInstance.post(`/teacher/subjects`, payload);
    return response;
  }
  async editSubjects(id, payload) {
    const response = await axiosInstance.put(`/teacher/subjects/${encodeURIComponent(id)}`, payload);
    return response;
  }
  async deleteSubjects(id) {
    const response = await axiosInstance.delete(`/teacher/subjects/${encodeURIComponent(id)}`);
    return response;
  }
  async restoreSubjects(id) {
    const response = await axiosInstance.patch(`/teacher/subjects/${encodeURIComponent(id)}/restore`);
    return response;
  }
  // subjects

  // course
  // GET /teacher/courses
  //   params: { page, limit, search?, study_year?, grade_id?, subject_id?, deleted? }
  //   response: { data: Course[], meta: { pagination } }
  async getCourse(opts = {}) {
    const o = opts.options || opts;
    const params = {
      page: o.page || 1,
      limit: o.limit || 12,
    };
    if (o.search != null && o.search !== '') params.search = o.search;
    if (o.study_year) params.study_year = o.study_year;
    if (o.grade_id) params.grade_id = o.grade_id;
    if (o.subject_id) params.subject_id = o.subject_id;
    // Map UI's `is_deleted` (legacy name) to backend's `deleted`. Only forward
    // when explicitly true/false; null = "all" → omit.
    const del = o.deleted ?? o.is_deleted;
    if (del === true || del === false) params.deleted = del;
    const response = await axiosInstance.get(`/teacher/courses`, { params });
    return response;
  }
  async addCourse(payload) {
    const response = await axiosInstance.post(`/teacher/courses`, payload);
    return response;
  }
  async editCourse(id, payload) {
    const response = await axiosInstance.put(`/teacher/courses/${encodeURIComponent(id)}`, payload);
    return response;
  }
  async deleteCourse(id) {
    const response = await axiosInstance.delete(`/teacher/courses/${encodeURIComponent(id)}`);
    return response;
  }
  async restoreCourse(id) {
    const response = await axiosInstance.patch(`/teacher/courses/${encodeURIComponent(id)}/restore`);
    return response;
  }
  // course

  // bookings
  // GET /teacher/bookings
  //   params: { page, limit, studyYear (required), status?, search? }
  //   response: { data: Booking[], meta: { pagination } }
  async getBookings(opts = {}) {
    const o = opts.options || opts;
    const params = {
      page: o.page || 1,
      limit: o.limit || 12,
      studyYear: o.studyYear || o.study_year,
    };
    if (o.status) params.status = o.status;
    if (o.search != null && o.search !== '') params.search = o.search;
    const response = await axiosInstance.get(`/teacher/bookings`, { params });
    return response;
  }
  async getBookingById(id) {
    const response = await axiosInstance.get(`/teacher/bookings/${id}`);
    return response;
  }
  async preApproveBookings(id, teacherResponse) {
    const response = await axiosInstance.patch(`/teacher/bookings/${id}/pre-approve`, { teacherResponse: teacherResponse });
    return response;
  }
  async consentBookings(id, payload) {
    const response = await axiosInstance.patch(`/teacher/bookings/${id}/confirm`, payload);
    return response;
  }
  async rejectBooking(id, payload) {
    // payload: { rejectionReason: string, teacherResponse?: string }
    const response = await axiosInstance.patch(`/teacher/bookings/${id}/reject`, payload);
    return response;
  }
  async updateBookingResponse(id, teacherResponse) {
    const response = await axiosInstance.patch(`/teacher/bookings/${id}/response`, { teacherResponse });
    return response;
  }
  async deleteBooking(id) {
    const response = await axiosInstance.delete(`/teacher/bookings/${id}`);
    return response;
  }
  async reactivateBooking(id, teacherResponse) {
    const response = await axiosInstance.patch(`/teacher/bookings/${id}/reactivate`, { teacherResponse });
    return response;
  }
  async getBookingStats(studyYear) {
    const response = await axiosInstance.get(`/teacher/bookings/stats/summary?studyYear=${encodeURIComponent(studyYear)}`);
    return response;
  }
  // bookings

  // Subscription capacity (Teacher)
  async getRemainingStudents() {
    const response = await axiosInstance.get('/teacher/bookings/subscription/remaining-students')
    return response
  }

  // sessions
  // GET /teacher/sessions
  //   params: { page, limit, weekday?, courseId?, search? }
  //   response: { data: Session[], meta: { pagination } }
  async getSessions(opts = {}) {
    const o = opts.options || opts;
    const params = {
      page: o.page || 1,
      limit: o.limit || 50,
    };
    if (typeof o.weekday === 'number' && o.weekday >= 0 && o.weekday <= 6) params.weekday = o.weekday;
    const courseId = o.courseId || o.course_id;
    if (courseId) params.courseId = courseId;
    if (o.search != null && o.search !== '') params.search = o.search;
    const response = await axiosInstance.get(`/teacher/sessions`, { params });
    return response;
  }
  async createSession(payload) {
    const response = await axiosInstance.post(`/teacher/sessions`, payload);
    return response;
  }
  async updateSession(id, payload) {
    const response = await axiosInstance.put(`/teacher/sessions/${encodeURIComponent(id)}`, payload);
    return response;
  }
  async deleteSession(id) {
    const response = await axiosInstance.delete(`/teacher/sessions/${encodeURIComponent(id)}`);
    return response;
  }
  async addSessionAttendees(id, studentIds) {
    const response = await axiosInstance.post(`/teacher/sessions/${encodeURIComponent(id)}/attendees`, { studentIds });
    return response;
  }
  async getSessionAttendees(id) {
    const response = await axiosInstance.get(`/teacher/sessions/${encodeURIComponent(id)}/attendees`);
    return response;
  }
  async removeSessionAttendees(id, studentIds) {
    const response = await axiosInstance.delete(`/teacher/sessions/${encodeURIComponent(id)}/attendees`, { data: { studentIds } });
    return response;
  }
  async endSession(id) {
    const response = await axiosInstance.post(`/teacher/sessions/${encodeURIComponent(id)}/end`);
    return response;
  }
  // sessions

  // confirmed students for a course (to add to a session)
  async getCourseConfirmedStudents(courseId) {
    const response = await axiosInstance.get(`/teacher/sessions/courses/${courseId}/confirmed-students`);
    return response;
  }

  // attendance
  async getSessionAttendanceByDate(id, dateISO) {
    const url = `/teacher/sessions/${id}/attendance` + (dateISO ? `?date=${encodeURIComponent(dateISO)}` : ``);
    const response = await axiosInstance.get(url);
    return response;
  }
  async bulkSetSessionAttendance(id, payload) {
    // payload: { date: 'YYYY-MM-DD', items: [{ studentId, status }] }
    const response = await axiosInstance.post(`/teacher/sessions/${id}/attendance`, payload);
    return response;
  }

  // course names for teacher
  async getCourseNames() {
    const response = await axiosInstance.get(`/teacher/courses/names`);
    return response;
  }

  // notifications
  // GET /teacher/notifications
  //   params: { page, limit, q?, type?, subType?, courseId? }
  //   response: { data: Notification[], meta: { pagination } }
  async getNotifications(options = {}) {
    const params = {
      page: options.page ?? 1,
      limit: options.limit ?? 20,
    };
    if (options.q && options.q !== '') params.q = options.q;
    if (options.type && options.type !== '') params.type = options.type;
    if (options.subType && options.subType !== '') params.subType = options.subType;
    if (options.courseId && options.courseId !== '') params.courseId = options.courseId;
    const response = await axiosInstance.get(`/teacher/notifications`, { params });
    return response;
  }
  async getUnreadNotifications(limit = 20) {
    const response = await axiosInstance.get(`/teacher/notifications/unread`, { params: { limit } });
    return response;
  }
  async markNotificationRead(id) {
    const response = await axiosInstance.put(`/notifications/${encodeURIComponent(id)}/read`);
    return response;
  }
  async createNotification(payload) {
    // payload should include: type, subType, title, message, courseId, subjectId, link, recipients{mode, studentIds}, attachments{pdfBase64, imagesBase64}, priority
    const response = await axiosInstance.post(`/teacher/notifications`, payload);
    return response;
  }
  async deleteNotification(id) {
    const response = await axiosInstance.delete(`/teacher/notifications/${id}`);
    return response;
  }

  // Roster: Students
  async getTeacherStudents() {
    const response = await axiosInstance.get(`/teacher/students`);
    return response;
  }
  async getStudentsByCourse(courseId) {
    const response = await axiosInstance.get(`/teacher/students/by-course/${encodeURIComponent(courseId)}`);
    return response;
  }
  async getStudentsByCoursePaginated(courseId, options = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const q = options.q ?? "";
    const url = `/teacher/students/by-course/${encodeURIComponent(courseId)}/paginated?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&q=${encodeURIComponent(q)}`;
    const response = await axiosInstance.get(url);
    return response;
  }
  async getStudentsBySession(sessionId) {
    const response = await axiosInstance.get(`/teacher/students/by-session/${encodeURIComponent(sessionId)}`);
    return response;
  }
  // Roster: Sessions (names)
  async getSessionNames() {
    const response = await axiosInstance.get(`/teacher/sessions/names`);
    return response;
  }

  // assignments
  async getAssignments(userData = {}) {
    const page = userData?.options?.page ?? 1;
    const limit = userData?.options?.limit ?? 10;
    const url = `/teacher/assignments?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`;
    const response = await axiosInstance.get(url);
    return response;
  }
  async createAssignment(payload) {
    const response = await axiosInstance.post(`/teacher/assignments`, payload);
    return response;
  }
  async updateAssignment(id, payload) {
    const response = await axiosInstance.patch(`/teacher/assignments/${encodeURIComponent(id)}`, payload);
    return response;
  }
  async deleteAssignment(id) {
    const response = await axiosInstance.delete(`/teacher/assignments/${encodeURIComponent(id)}`);
    return response;
  }
  async getAssignmentById(id) {
    const response = await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(id)}`);
    return response;
  }
  async setAssignmentRecipients(id, studentIds) {
    const response = await axiosInstance.put(`/teacher/assignments/${encodeURIComponent(id)}/recipients`, { studentIds });
    return response;
  }
  async gradeAssignment(assignmentId, studentId, payload) {
    const response = await axiosInstance.put(`/teacher/assignments/${encodeURIComponent(assignmentId)}/grade/${encodeURIComponent(studentId)}`, payload);
    return response;
  }
  async getAssignmentRecipients(id) {
    const response = await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(id)}/students`);
    return response;
  }
  async getAssignmentSubmission(assignmentId, studentId) {
    const response = await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(assignmentId)}/submission/${encodeURIComponent(studentId)}`);
    return response;
  }
  async getAssignmentOverview(id) {
    const response = await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(id)}/overview`);
    return response;
  }
  // Exams
  async listExams(params = {}) {
    const response = await axiosInstance.get('/teacher/exams', { params });
    return response;
  }
  async createExam(payload) {
    const response = await axiosInstance.post('/teacher/exams', payload);
    return response;
  }
  async getExamById(id) {
    const response = await axiosInstance.get(`/teacher/exams/${encodeURIComponent(id)}`);
    return response;
  }
  async updateExam(id, payload) {
    const response = await axiosInstance.patch(`/teacher/exams/${encodeURIComponent(id)}`, payload);
    return response;
  }
  async deleteExam(id) {
    const response = await axiosInstance.delete(`/teacher/exams/${encodeURIComponent(id)}`);
    return response;
  }
  async getExamStudents(id, sessionId) {
    const params = sessionId ? { sessionId } : undefined;
    const response = await axiosInstance.get(`/teacher/exams/${encodeURIComponent(id)}/students`, { params });
    return response;
  }
  async gradeExam(examId, studentId, payload) {
    const response = await axiosInstance.put(`/teacher/exams/${encodeURIComponent(examId)}/grade/${encodeURIComponent(studentId)}`, payload);
    return response;
  }

  // Student Evaluations (Teacher)
  async listEvaluations(params = {}) {
    const response = await axiosInstance.get('/teacher/evaluations', { params });
    return response;
  }
  async bulkUpsertEvaluations(payload) {
    const response = await axiosInstance.post('/teacher/evaluations/bulk-upsert', payload);
    return response;
  }
  async getEvaluationById(id) {
    const response = await axiosInstance.get(`/teacher/evaluations/${encodeURIComponent(id)}`);
    return response;
  }
  async updateEvaluation(id, payload) {
    const response = await axiosInstance.patch(`/teacher/evaluations/${encodeURIComponent(id)}`, payload);
    return response;
  }
  async getStudentsWithEval(params = {}) {
    const response = await axiosInstance.get('/teacher/evaluations/students-with-eval', { params });
    return response;
  }

  // Reservation Payments (Teacher)
  async getReservationPayments(userData = {}) {
    const page = userData?.options?.page ?? 1;
    const limit = userData?.options?.limit ?? 10;
    const studyYear = userData?.options?.study_year ?? '';
    const url = `/teacher/payments/reservations?studyYear=${encodeURIComponent(studyYear)}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`;
    const response = await axiosInstance.get(url);
    return response;
  }
  async getReservationPaymentsReport(studyYear) {
    const url = `/teacher/payments/reservations/report?studyYear=${encodeURIComponent(studyYear)}`;
    const response = await axiosInstance.get(url);
    return response;
  }
  async getReservationPaymentByBooking(bookingId) {
    const response = await axiosInstance.get(`/teacher/payments/reservations/${encodeURIComponent(bookingId)}`);
    return response;
  }
  async markReservationPaymentPaid(bookingId) {
    const response = await axiosInstance.patch(`/teacher/payments/reservations/${encodeURIComponent(bookingId)}/mark-paid`);
    return response;
  }

  // ============================================================
  // Invoices (Teacher) — aligned with simplified backend (2026-05-17)
  // Surface:
  //   GET    /teacher/invoices              → list + filters + pagination
  //   GET    /teacher/invoices/summary      → KPIs
  //   GET    /teacher/invoices/:id          → single + installments + totals
  //   POST   /teacher/invoices              → create (cash or installments)
  //   POST   /teacher/invoices/:id/payments → add payment (partial-friendly)
  //   PATCH  /teacher/invoices/:id/meta     → update dates + notes
  //   PATCH  /teacher/invoices/:id/discount → set exact discount
  //   DELETE /teacher/invoices/:id          → soft delete
  //   PATCH  /teacher/invoices/:id/restore  → restore
  // ============================================================
  async listInvoices(params = {}) {
    // params: { studyYear, status?, studentId?, courseId?, paymentMode?,
    //          search?, deleted?, page?, limit? }
    const response = await axiosInstance.get('/teacher/invoices', { params });
    return response;
  }
  async getInvoicesSummary(params = {}) {
    // returns: { totalAmount, totalPaid, totalDiscount, totalRemaining,
    //           totalCount, paidCount, partialCount, pendingCount,
    //           overdueCount, discountCount }
    const response = await axiosInstance.get('/teacher/invoices/summary', { params });
    return response;
  }
  async getInvoiceFull(invoiceId) {
    // returns: { invoice, installments[], totals }
    // (Replaces v1 trio: getInvoiceDetails / getInvoiceFull / getInvoiceInstallments / getInvoiceEntries)
    const response = await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}`);
    return response;
  }
  async createInvoice(payload) {
    // For installments: pass either `installmentsCount` (auto-split) or `installments[]` (manual).
    const response = await axiosInstance.post('/teacher/invoices', payload);
    return response;
  }
  async addInvoicePayment(invoiceId, payload) {
    // payload: { amount, paymentMethod, installmentId?, paidAt?, notes? }
    // Supports partial payments. Omit `installmentId` to auto-allocate across pending.
    const response = await axiosInstance.post(`/teacher/invoices/${encodeURIComponent(invoiceId)}/payments`, payload);
    return response;
  }
  async updateInvoiceMeta(invoiceId, payload) {
    // payload: { invoiceDate?, dueDate?, notes? }  — pass null to clear a field.
    const response = await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}/meta`, payload);
    return response;
  }
  async setInvoiceDiscount(invoiceId, discountAmount) {
    // Sets the discount to an exact value (not additive).
    const response = await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}/discount`, { discountAmount });
    return response;
  }
  async softDeleteInvoice(invoiceId) {
    const response = await axiosInstance.delete(`/teacher/invoices/${encodeURIComponent(invoiceId)}`);
    return response;
  }
  async restoreInvoice(invoiceId) {
    const response = await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}/restore`);
    return response;
  }

  // --- Removed in v2 (backend endpoints no longer exist) ---
  // addInvoiceDiscount(id, {amount, notes})         → use setInvoiceDiscount(id, amount)
  // updateInvoice(id, payload) [monolithic]          → use updateInvoiceMeta() or setInvoiceDiscount()
  // getInvoiceDetails / getInvoiceInstallments
  //   / getInvoiceEntries / getInvoiceEntriesReport  → use getInvoiceFull(id)
}
export default new TeacherApi();
