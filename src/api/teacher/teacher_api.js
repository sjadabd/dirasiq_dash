import axiosInstance from "@/utils/axios.js"

class TeacherApi {
  // profile
  async completeProfile(userData) {
    return await axiosInstance.post(`/auth/complete-profile`, userData)
  }
  async uploadIntroVideo(payload, config = {}) {
    if (payload instanceof FormData) {
      return await axiosInstance.post("/teacher/profile/intro-video", payload, {
        ...config,

        // Do NOT set Content-Type manually; Axios will set the correct multipart boundary
      })
    }

    // Fallback: JSON payload (base64)
    return await axiosInstance.post("/teacher/profile/intro-video", payload, config)
  }

  async getIntroVideo() {
    return await axiosInstance.get("/teacher/profile/intro-video")
  }


  // Academic years (Teacher)
  async getAcademicYears() {
    return await axiosInstance.get(`/teacher/academic-years`)
  }
  async getDashboard() {
    return await axiosInstance.get(`/teacher/dashboard`)
  }
  async getReferralDashboard() {
    return await axiosInstance.get(`/teacher/dashboard/referrals`)
  }

  // (Phase 7) getActivePackages removed — subscription model is gone.
  async getPublicNews() {
    return await axiosInstance.get(`/public/news`)
  }

  // Public — list of governorates the platform covers. Used by the landing
  // "live stats" strip to advertise coverage. Anonymous-callable.
  async getGovernorates() {
    return await axiosInstance.get(`/teacher-search/governorates`)
  }

  // wallet (Teacher)
  async getWallet() {
    return await axiosInstance.get(`/teacher/wallet`)
  }

  async getWalletTransactions(page = 1, limit = 20) {
    return await axiosInstance.get(`/teacher/wallet/transactions`, {
      params: { page, limit },
    })
  }

  // (Phase 7) Subscription / package-activation links removed. Wallet
  // top-up via Wayl was restored separately — see createWaylTopupLink
  // below. Future enrollment-based credits will flow through the same
  // wallet_ledger but server-side, not via this client method.

  // Create a Wayl payment link the teacher will redirect to. Server returns
  // { url, referenceId, amount }; the wayl webhook credits the wallet when
  // the user completes payment. The dashboard then polls /teacher/wallet
  // (with ?poll=1 on the return URL) until the balance updates.
  async createWaylTopupLink(amount) {
    return await axiosInstance.post(`/teacher/wallet/topup`, { amount })
  }
  // profile

  // expenses
  // GET /teacher/expenses
  //   params: { page, limit, studyYear?, from?, to?, category?, paymentMethod?, search?, deleted? }
  //   response: { data: TeacherExpense[], meta: { pagination, summary: { totalAmount, count, byCategory } } }
  async getExpenses(params) {
    return await axiosInstance.get(`/teacher/expenses`, { params })
  }

  // POST /teacher/expenses
  //   body: { amount, note?, expense_date?, category?, paymentMethod? }
  async addExpense(payload) {
    return await axiosInstance.post(`/teacher/expenses`, payload)
  }

  // PATCH /teacher/expenses/:id
  async updateExpense(id, payload) {
    return await axiosInstance.patch(`/teacher/expenses/${encodeURIComponent(id)}`, payload)
  }

  // DELETE /teacher/expenses/:id  (soft delete)
  async deleteExpense(id) {
    return await axiosInstance.delete(`/teacher/expenses/${encodeURIComponent(id)}`)
  }

  // PATCH /teacher/expenses/:id/restore
  async restoreExpense(id) {
    return await axiosInstance.patch(`/teacher/expenses/${encodeURIComponent(id)}/restore`)
  }

  // expenses

  // reports
  async getFinancialReport(params) {
    return await axiosInstance.get(`/teacher/reports/financial`, { params })
  }

  // reports

  // dashboard
  async getUpcomingToday() {
    // returns: { success, message, data: [ { sessionId, courseId, courseName, title, startTime, endTime, startAt, endAt, state } ], count }
    return await axiosInstance.get(`/teacher/dashboard/upcoming-today`)
  }

  // dashboard

  // grades
  async getAllGrades() {
    return await axiosInstance.get(`/grades/all`)
  }
  async getAllGradess() {
    return await axiosInstance.get(`/grades/all-student`)
  }
  async getAllMyGrades() {
    return await axiosInstance.get(`/grades/my-grades`)
  }

  // grades

  // subjects
  // GET /teacher/subjects
  //   params: { page, limit, search?, is_deleted? }
  //   response: { data: Subject[], meta: { pagination } }
  async getSubjects(opts = {}) {
    const o = opts.options || opts

    const params = {
      page: o.page || 1,
      limit: o.limit || 10,
    }

    if (o.search != null && o.search !== '') params.search = o.search

    // Only forward is_deleted when explicitly true/false; null = "all" → omit.
    if (o.is_deleted === true || o.is_deleted === false) params.is_deleted = o.is_deleted
    
    return await axiosInstance.get(`/teacher/subjects`, { params })
  }
  async getAllSubjects() {
    return await axiosInstance.get(`/teacher/subjects/all`)
  }
  async addSubjects(payload) {
    return await axiosInstance.post(`/teacher/subjects`, payload)
  }
  async editSubjects(id, payload) {
    return await axiosInstance.put(`/teacher/subjects/${encodeURIComponent(id)}`, payload)
  }
  async deleteSubjects(id) {
    return await axiosInstance.delete(`/teacher/subjects/${encodeURIComponent(id)}`)
  }
  async restoreSubjects(id) {
    return await axiosInstance.patch(`/teacher/subjects/${encodeURIComponent(id)}/restore`)
  }

  // subjects

  // course
  // GET /teacher/courses
  //   params: { page, limit, search?, study_year?, grade_id?, subject_id?, deleted? }
  //   response: { data: Course[], meta: { pagination } }
  async getCourse(opts = {}) {
    const o = opts.options || opts

    const params = {
      page: o.page || 1,
      limit: o.limit || 12,
    }

    if (o.search != null && o.search !== '') params.search = o.search
    if (o.study_year) params.study_year = o.study_year
    if (o.grade_id) params.grade_id = o.grade_id
    if (o.subject_id) params.subject_id = o.subject_id

    // Map UI's `is_deleted` (legacy name) to backend's `deleted`. Only forward
    // when explicitly true/false; null = "all" → omit.
    const del = o.deleted ?? o.is_deleted
    if (del === true || del === false) params.deleted = del
    
    return await axiosInstance.get(`/teacher/courses`, { params })
  }
  async addCourse(payload) {
    return await axiosInstance.post(`/teacher/courses`, payload)
  }
  async editCourse(id, payload) {
    return await axiosInstance.put(`/teacher/courses/${encodeURIComponent(id)}`, payload)
  }
  async deleteCourse(id) {
    return await axiosInstance.delete(`/teacher/courses/${encodeURIComponent(id)}`)
  }
  async restoreCourse(id) {
    return await axiosInstance.patch(`/teacher/courses/${encodeURIComponent(id)}/restore`)
  }

  // course

  // bookings
  // GET /teacher/bookings
  //   params: { page, limit, studyYear (required), status?, search? }
  //   response: { data: Booking[], meta: { pagination } }
  async getBookings(opts = {}) {
    const o = opts.options || opts

    const params = {
      page: o.page || 1,
      limit: o.limit || 12,
      studyYear: o.studyYear || o.study_year,
    }

    if (o.status) params.status = o.status
    if (o.search != null && o.search !== '') params.search = o.search
    
    return await axiosInstance.get(`/teacher/bookings`, { params })
  }
  async getBookingById(id) {
    return await axiosInstance.get(`/teacher/bookings/${id}`)
  }
  async preApproveBookings(id, teacherResponse) {
    return await axiosInstance.patch(`/teacher/bookings/${id}/pre-approve`, { teacherResponse: teacherResponse })
  }
  async consentBookings(id, payload) {
    return await axiosInstance.patch(`/teacher/bookings/${id}/confirm`, payload)
  }
  async rejectBooking(id, payload) {
    // payload: { rejectionReason: string, teacherResponse?: string }
    return await axiosInstance.patch(`/teacher/bookings/${id}/reject`, payload)
  }
  async updateBookingResponse(id, teacherResponse) {
    return await axiosInstance.patch(`/teacher/bookings/${id}/response`, { teacherResponse })
  }
  async deleteBooking(id) {
    return await axiosInstance.delete(`/teacher/bookings/${id}`)
  }
  async reactivateBooking(id, teacherResponse) {
    return await axiosInstance.patch(`/teacher/bookings/${id}/reactivate`, { teacherResponse })
  }
  async getBookingStats(studyYear) {
    return await axiosInstance.get(`/teacher/bookings/stats/summary?studyYear=${encodeURIComponent(studyYear)}`)
  }

  // bookings

  // Subscription capacity (Teacher)
  async getRemainingStudents() {
    return await axiosInstance.get('/teacher/bookings/subscription/remaining-students')
  }

  // sessions
  // GET /teacher/sessions
  //   params: { page, limit, weekday?, courseId?, search? }
  //   response: { data: Session[], meta: { pagination } }
  async getSessions(opts = {}) {
    const o = opts.options || opts

    const params = {
      page: o.page || 1,
      limit: o.limit || 50,
    }

    if (typeof o.weekday === 'number' && o.weekday >= 0 && o.weekday <= 6) params.weekday = o.weekday
    const courseId = o.courseId || o.course_id
    if (courseId) params.courseId = courseId
    if (o.search != null && o.search !== '') params.search = o.search
    
    return await axiosInstance.get(`/teacher/sessions`, { params })
  }
  async createSession(payload) {
    return await axiosInstance.post(`/teacher/sessions`, payload)
  }
  async updateSession(id, payload) {
    return await axiosInstance.put(`/teacher/sessions/${encodeURIComponent(id)}`, payload)
  }
  async deleteSession(id) {
    return await axiosInstance.delete(`/teacher/sessions/${encodeURIComponent(id)}`)
  }
  async addSessionAttendees(id, studentIds) {
    return await axiosInstance.post(`/teacher/sessions/${encodeURIComponent(id)}/attendees`, { studentIds })
  }
  async getSessionAttendees(id) {
    return await axiosInstance.get(`/teacher/sessions/${encodeURIComponent(id)}/attendees`)
  }
  async removeSessionAttendees(id, studentIds) {
    return await axiosInstance.delete(`/teacher/sessions/${encodeURIComponent(id)}/attendees`, { data: { studentIds } })
  }
  async endSession(id) {
    return await axiosInstance.post(`/teacher/sessions/${encodeURIComponent(id)}/end`)
  }

  // sessions

  // confirmed students for a course (to add to a session)
  async getCourseConfirmedStudents(courseId) {
    return await axiosInstance.get(`/teacher/sessions/courses/${courseId}/confirmed-students`)
  }

  // attendance
  async getSessionAttendanceByDate(id, dateISO) {
    const url = `/teacher/sessions/${id}/attendance` + (dateISO ? `?date=${encodeURIComponent(dateISO)}` : ``)
    
    return await axiosInstance.get(url)
  }
  async bulkSetSessionAttendance(id, payload) {
    // payload: { date: 'YYYY-MM-DD', items: [{ studentId, status }] }
    return await axiosInstance.post(`/teacher/sessions/${id}/attendance`, payload)
  }

  // course names for teacher
  async getCourseNames() {
    return await axiosInstance.get(`/teacher/courses/names`)
  }

  // notifications
  // GET /teacher/notifications
  //   params: { page, limit, q?, type?, subType?, courseId? }
  //   response: { data: Notification[], meta: { pagination } }
  async getNotifications(options = {}) {
    const params = {
      page: options.page ?? 1,
      limit: options.limit ?? 20,
    }

    if (options.q && options.q !== '') params.q = options.q
    if (options.type && options.type !== '') params.type = options.type
    if (options.subType && options.subType !== '') params.subType = options.subType
    if (options.courseId && options.courseId !== '') params.courseId = options.courseId
    
    return await axiosInstance.get(`/teacher/notifications`, { params })
  }
  async getUnreadNotifications(limit = 20) {
    return await axiosInstance.get(`/teacher/notifications/unread`, { params: { limit } })
  }
  async markNotificationRead(id) {
    return await axiosInstance.put(`/notifications/${encodeURIComponent(id)}/read`)
  }
  async createNotification(payload) {
    // payload should include: type, subType, title, message, courseId, subjectId, link, recipients{mode, studentIds}, attachments{pdfBase64, imagesBase64}, priority
    return await axiosInstance.post(`/teacher/notifications`, payload)
  }
  async deleteNotification(id) {
    return await axiosInstance.delete(`/teacher/notifications/${id}`)
  }

  // Roster: Students
  async getTeacherStudents() {
    return await axiosInstance.get(`/teacher/students`)
  }
  async getStudentsByCourse(courseId) {
    return await axiosInstance.get(`/teacher/students/by-course/${encodeURIComponent(courseId)}`)
  }
  async getStudentsByCoursePaginated(courseId, options = {}) {
    const page = options.page ?? 1
    const limit = options.limit ?? 10
    const q = options.q ?? ""
    const url = `/teacher/students/by-course/${encodeURIComponent(courseId)}/paginated?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&q=${encodeURIComponent(q)}`
    
    return await axiosInstance.get(url)
  }
  async getStudentsBySession(sessionId) {
    return await axiosInstance.get(`/teacher/students/by-session/${encodeURIComponent(sessionId)}`)
  }

  // Roster: Sessions (names)
  async getSessionNames() {
    return await axiosInstance.get(`/teacher/sessions/names`)
  }

  // assignments
  async getAssignments(userData = {}) {
    const page = userData?.options?.page ?? 1
    const limit = userData?.options?.limit ?? 10
    const url = `/teacher/assignments?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
    
    return await axiosInstance.get(url)
  }
  async createAssignment(payload) {
    return await axiosInstance.post(`/teacher/assignments`, payload)
  }
  async updateAssignment(id, payload) {
    return await axiosInstance.patch(`/teacher/assignments/${encodeURIComponent(id)}`, payload)
  }
  async deleteAssignment(id) {
    return await axiosInstance.delete(`/teacher/assignments/${encodeURIComponent(id)}`)
  }
  async getAssignmentById(id) {
    return await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(id)}`)
  }
  async setAssignmentRecipients(id, studentIds) {
    return await axiosInstance.put(`/teacher/assignments/${encodeURIComponent(id)}/recipients`, { studentIds })
  }
  async gradeAssignment(assignmentId, studentId, payload) {
    return await axiosInstance.put(`/teacher/assignments/${encodeURIComponent(assignmentId)}/grade/${encodeURIComponent(studentId)}`, payload)
  }
  async getAssignmentRecipients(id) {
    return await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(id)}/students`)
  }
  async getAssignmentSubmission(assignmentId, studentId) {
    return await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(assignmentId)}/submission/${encodeURIComponent(studentId)}`)
  }
  async getAssignmentOverview(id) {
    return await axiosInstance.get(`/teacher/assignments/${encodeURIComponent(id)}/overview`)
  }

  // Exams
  async listExams(params = {}) {
    return await axiosInstance.get('/teacher/exams', { params })
  }
  async createExam(payload) {
    return await axiosInstance.post('/teacher/exams', payload)
  }
  async getExamById(id) {
    return await axiosInstance.get(`/teacher/exams/${encodeURIComponent(id)}`)
  }
  async updateExam(id, payload) {
    return await axiosInstance.patch(`/teacher/exams/${encodeURIComponent(id)}`, payload)
  }
  async deleteExam(id) {
    return await axiosInstance.delete(`/teacher/exams/${encodeURIComponent(id)}`)
  }
  async getExamStudents(id, sessionId) {
    const params = sessionId ? { sessionId } : undefined
    
    return await axiosInstance.get(`/teacher/exams/${encodeURIComponent(id)}/students`, { params })
  }
  async gradeExam(examId, studentId, payload) {
    return await axiosInstance.put(`/teacher/exams/${encodeURIComponent(examId)}/grade/${encodeURIComponent(studentId)}`, payload)
  }

  // Student Evaluations (Teacher)
  async listEvaluations(params = {}) {
    return await axiosInstance.get('/teacher/evaluations', { params })
  }
  async bulkUpsertEvaluations(payload) {
    return await axiosInstance.post('/teacher/evaluations/bulk-upsert', payload)
  }
  async getEvaluationById(id) {
    return await axiosInstance.get(`/teacher/evaluations/${encodeURIComponent(id)}`)
  }
  async updateEvaluation(id, payload) {
    return await axiosInstance.patch(`/teacher/evaluations/${encodeURIComponent(id)}`, payload)
  }
  async getStudentsWithEval(params = {}) {
    return await axiosInstance.get('/teacher/evaluations/students-with-eval', { params })
  }

  // Reservation Payments (Teacher)
  async getReservationPayments(userData = {}) {
    const page = userData?.options?.page ?? 1
    const limit = userData?.options?.limit ?? 10
    const studyYear = userData?.options?.study_year ?? ''
    const url = `/teacher/payments/reservations?studyYear=${encodeURIComponent(studyYear)}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
    
    return await axiosInstance.get(url)
  }
  async getReservationPaymentsReport(studyYear) {
    const url = `/teacher/payments/reservations/report?studyYear=${encodeURIComponent(studyYear)}`
    
    return await axiosInstance.get(url)
  }
  async getReservationPaymentByBooking(bookingId) {
    return await axiosInstance.get(`/teacher/payments/reservations/${encodeURIComponent(bookingId)}`)
  }
  async markReservationPaymentPaid(bookingId) {
    return await axiosInstance.patch(`/teacher/payments/reservations/${encodeURIComponent(bookingId)}/mark-paid`)
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
    return await axiosInstance.get('/teacher/invoices', { params })
  }
  async getInvoicesSummary(params = {}) {
    // returns: { totalAmount, totalPaid, totalDiscount, totalRemaining,
    //           totalCount, paidCount, partialCount, pendingCount,
    //           overdueCount, discountCount }
    return await axiosInstance.get('/teacher/invoices/summary', { params })
  }
  async getInvoiceFull(invoiceId) {
    // returns: { invoice, installments[], totals }
    // (Replaces v1 trio: getInvoiceDetails / getInvoiceFull / getInvoiceInstallments / getInvoiceEntries)
    return await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}`)
  }
  async createInvoice(payload) {
    // For installments: pass either `installmentsCount` (auto-split) or `installments[]` (manual).
    return await axiosInstance.post('/teacher/invoices', payload)
  }
  async addInvoicePayment(invoiceId, payload) {
    // payload: { amount, paymentMethod, installmentId?, paidAt?, notes? }
    // Supports partial payments. Omit `installmentId` to auto-allocate across pending.
    return await axiosInstance.post(`/teacher/invoices/${encodeURIComponent(invoiceId)}/payments`, payload)
  }
  async updateInvoiceMeta(invoiceId, payload) {
    // payload: { invoiceDate?, dueDate?, notes? }  — pass null to clear a field.
    return await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}/meta`, payload)
  }
  async setInvoiceDiscount(invoiceId, discountAmount) {
    // Sets the discount to an exact value (not additive).
    return await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}/discount`, { discountAmount })
  }
  async softDeleteInvoice(invoiceId) {
    return await axiosInstance.delete(`/teacher/invoices/${encodeURIComponent(invoiceId)}`)
  }
  async restoreInvoice(invoiceId) {
    return await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}/restore`)
  }

  // --- Removed in v2 (backend endpoints no longer exist) ---
  // addInvoiceDiscount(id, {amount, notes})         → use setInvoiceDiscount(id, amount)
  // updateInvoice(id, payload) [monolithic]          → use updateInvoiceMeta() or setInvoiceDiscount()
  // getInvoiceDetails / getInvoiceInstallments
  //   / getInvoiceEntries / getInvoiceEntriesReport  → use getInvoiceFull(id)

  // -------------------------------------------------------------------------
  // Phase 10.1.B — Video courses (teacher-owned VOD)
  // -------------------------------------------------------------------------

  async listMyVideoCourses({ page = 1, limit = 20, status } = {}) {
    const params = new URLSearchParams()

    params.set('page', String(page))
    params.set('limit', String(limit))
    if (status) params.set('status', status)
    
    return axiosInstance.get(`/teacher/video-courses?${params.toString()}`)
  }

  async getMyVideoCourse(id) {
    return axiosInstance.get(`/teacher/video-courses/${id}`)
  }

  async getMyVideoCourseLessons(id) {
    return axiosInstance.get(`/teacher/video-courses/${id}/lessons`)
  }

  async createVideoCourse(payload) {
    return axiosInstance.post(`/teacher/video-courses`, payload)
  }

  async updateVideoCourse(id, payload) {
    return axiosInstance.patch(`/teacher/video-courses/${id}`, payload)
  }

  async deleteVideoCourse(id) {
    return axiosInstance.delete(`/teacher/video-courses/${id}`)
  }

  async uploadVideoCourseCoverImage(id, file) {
    const fd = new FormData()

    fd.append('file', file)
    
    return axiosInstance.post(`/teacher/video-courses/${id}/cover-image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  /**
   * Create a lesson — backend mints a Bunny videoId + returns the upload
   * contract. Caller is responsible for PUTing the bytes directly to
   * Bunny using the returned { url, method, headers } shape (see
   * `uploadLessonBytesToBunny()` below).
   */
  async createVideoLesson(courseId, { title, description, displayOrder } = {}) {
    return axiosInstance.post(`/teacher/video-courses/${courseId}/lessons`, {
      title,
      ...(description ? { description } : {}),
      ...(displayOrder !== undefined ? { displayOrder } : {}),
    })
  }

  async updateVideoLesson(courseId, lessonId, payload) {
    return axiosInstance.patch(
      `/teacher/video-courses/${courseId}/lessons/${lessonId}`,
      payload,
    )
  }

  async deleteVideoLesson(courseId, lessonId) {
    return axiosInstance.delete(
      `/teacher/video-courses/${courseId}/lessons/${lessonId}`,
    )
  }

  async reorderVideoLessons(courseId, lessonIds) {
    return axiosInstance.post(
      `/teacher/video-courses/${courseId}/lessons/reorder`,
      { lessonIds },
    )
  }

  async syncVideoLesson(courseId, lessonId) {
    return axiosInstance.post(
      `/teacher/video-courses/${courseId}/lessons/${lessonId}/sync`,
    )
  }

  // -------------------------------------------------------------------------
  // Phase 10.1.B.2 — intro video to Bunny Stream
  // -------------------------------------------------------------------------

  async startBunnyIntroVideoUpload() {
    return axiosInstance.post(`/teacher/profile/intro-video/bunny`)
  }

  // -------------------------------------------------------------------------
  // Direct-to-Bunny upload helper (used by both lesson + intro-video flows)
  // -------------------------------------------------------------------------

  /**
   * Stream `file` to Bunny via a PUT, reporting progress 0–100. The
   * `upload` object is the contract returned by createVideoLesson() or
   * startBunnyIntroVideoUpload() — { url, method, headers }.
   *
   * Returns a Promise<{ok: true}> on a 2xx Bunny response, rejects with
   * an Error('upload-failed') with `.status` and `.detail` properties
   * otherwise. The caller can decide whether to retry / surface the error.
   *
   * NOTE: we use XHR (not fetch) because fetch's body-stream-progress
   * support is browser-spotty and we want a reliable progress bar.
   */
  uploadBytesToBunny(upload, file, { onProgress } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.open(upload.method || 'PUT', upload.url, true)
      for (const [k, v] of Object.entries(upload.headers || {})) {
        try {
          xhr.setRequestHeader(k, v)
        } catch (_) {
          // Some browsers block setting certain headers — ignore.
        }
      }
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true, status: xhr.status })
        } else {
          const err = new Error('upload-failed')

          err.status = xhr.status
          err.detail = xhr.responseText
          reject(err)
        }
      }
      xhr.onerror = () => reject(new Error('network-error'))
      xhr.onabort = () => reject(new Error('upload-aborted'))
      xhr.send(file)
    })
  }
}
export default new TeacherApi()
