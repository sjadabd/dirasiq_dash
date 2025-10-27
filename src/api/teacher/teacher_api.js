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
  async getActivePackages() {
    const response = await axiosInstance.get(`/teacher/subscription-packages/active`);
    return response;
  }
  async getPublicNews() {
    const response = await axiosInstance.get(`/public/news`);
    return response;
  }
  // profile

  // expenses
  async getExpenses(params) {
    const response = await axiosInstance.get(`/teacher/expenses`, { params })
    return response
  }
  async addExpense(payload) {
    const response = await axiosInstance.post(`/teacher/expenses`, payload)
    return response
  }
  async updateExpense(id, payload) {
    const response = await axiosInstance.patch(`/teacher/expenses/${id}`, payload)
    return response
  }
  async deleteExpense(id) {
    const response = await axiosInstance.delete(`/teacher/expenses/${id}`)
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
  async getSubjects(userData) {
    const response = await axiosInstance.get(`/subjects?page=${userData.options.page}&limit=${userData.options.limit}&search=${userData.options.search}&is_deleted=${userData.options.is_deleted}`);
    return response;
  }
  async getAllSubjects() {
    const response = await axiosInstance.get(`/subjects/all`);
    return response;
  }
  async addSubjects(userData) {
    const response = await axiosInstance.post(`/subjects`, userData);
    return response;
  }
  async editSubjects(id, userData) {
    const response = await axiosInstance.put(`/subjects/${id}`, userData);
    return response;
  }
  async deleteSubjects(id) {
    const response = await axiosInstance.delete(`/subjects/${id}`);
    return response;
  }
  async restoreSubjects(id) {
    const response = await axiosInstance.patch(`/subjects/${id}/restore`);
    return response;
  }
  // subjects

  // course
  async getCourse(userData) {
    const response = await axiosInstance.get(`/courses?page=${userData.options.page}&limit=${userData.options.limit}&search=${userData.options.search}&deleted=${userData.options.is_deleted}&grade_id=${userData.options.grade_id}&subject_id=${userData.options.subject_id}&study_year=${userData.options.study_year}`);
    return response;
  }
  async addCourse(userData) {
    const response = await axiosInstance.post(`/courses`, userData);
    return response;
  }
  async editCourse(id, userData) {
    const response = await axiosInstance.put(`/courses/${id}`, userData);
    return response;
  }
  async deleteCourse(id) {
    const response = await axiosInstance.delete(`/courses/${id}`);
    return response;
  }
  async restoreCourse(id) {
    const response = await axiosInstance.patch(`/courses/${id}/restore`);
    return response;
  }
  // course

  // bookings
  async getBookings(userData) {
    const response = await axiosInstance.get(`/teacher/bookings?page=${userData.options.page}&limit=${userData.options.limit}&search=${userData.options.search}&status=${userData.options.status}&studyYear=${userData.options.study_year}`);
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

  // sessions
  async getSessions(userData) {
    const page = userData?.options?.page ?? 1;
    const limit = userData?.options?.limit ?? 10;
    const search = userData?.options?.search ?? '';
    const weekday = userData?.options?.weekday ?? '';
    const courseId = userData?.options?.course_id ?? '';
    const url = `/teacher/sessions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&weekday=${encodeURIComponent(weekday)}&courseId=${encodeURIComponent(courseId)}`;
    const response = await axiosInstance.get(url);
    return response;
  }
  async createSession(payload) {
    const response = await axiosInstance.post(`/teacher/sessions`, payload);
    return response;
  }
  async updateSession(id, payload) {
    const response = await axiosInstance.put(`/teacher/sessions/${id}`, payload);
    return response;
  }
  async deleteSession(id) {
    const response = await axiosInstance.delete(`/teacher/sessions/${id}`);
    return response;
  }
  async addSessionAttendees(id, studentIds) {
    const response = await axiosInstance.post(`/teacher/sessions/${id}/attendees`, { studentIds });
    return response;
  }
  async getSessionAttendees(id) {
    const response = await axiosInstance.get(`/teacher/sessions/${id}/attendees`);
    return response;
  }
  async removeSessionAttendees(id, studentIds) {
    const response = await axiosInstance.delete(`/teacher/sessions/${id}/attendees`, { data: { studentIds } });
    return response;
  }
  async endSession(id) {
    const response = await axiosInstance.post(`/teacher/sessions/${id}/end`);
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
  async getNotifications(options = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const q = options.q ?? '';
    const type = options.type ?? '';
    const subType = options.subType ?? '';
    const courseId = options.courseId ?? '';
    const url = `/teacher/notifications?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&subType=${encodeURIComponent(subType)}&courseId=${encodeURIComponent(courseId)}`;
    const response = await axiosInstance.get(url);
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

  // Invoices (Teacher)
  async listInvoices(params = {}) {
    // params: { studyYear, status, page, limit }
    const response = await axiosInstance.get('/teacher/invoices', { params });
    return response;
  }
  async getInvoiceDetails(invoiceId) {
    // returns: { invoice, installments, entries }
    const response = await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}`)
    return response;
  }
  async getInvoiceFull(invoiceId) {
    // returns: { invoice, installments, totals }
    const response = await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}/full`)
    return response;
  }
  async getInvoicesSummary(params = {}) {
    // params: { studyYear, status, deleted }
    const response = await axiosInstance.get('/teacher/invoices/summary', { params });
    return response;
  }
  async createInvoice(payload) {
    // payload follows the backend spec
    const response = await axiosInstance.post('/teacher/invoices', payload);
    return response;
  }
  async addInvoicePayment(invoiceId, payload) {
    const response = await axiosInstance.post(`/teacher/invoices/${encodeURIComponent(invoiceId)}/payments`, payload);
    return response;
  }
  async addInvoiceDiscount(invoiceId, payload) {
    const response = await axiosInstance.post(`/teacher/invoices/${encodeURIComponent(invoiceId)}/discounts`, payload);
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
  async updateInvoice(invoiceId, payload) {
    const response = await axiosInstance.patch(`/teacher/invoices/${encodeURIComponent(invoiceId)}`, payload);
    return response;
  }
  // Optional detail reads (if backend provides them)
  async getInvoiceInstallments(invoiceId) {
    const response = await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}/installments`);
    return response;
  }
  async getInvoiceEntries(invoiceId) {
    const response = await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}/entries`);
    return response;
  }
  async getInvoiceEntriesReport(invoiceId) {
    const response = await axiosInstance.get(`/teacher/invoices/${encodeURIComponent(invoiceId)}/entries/report`);
    return response;
  }
}
export default new TeacherApi();
