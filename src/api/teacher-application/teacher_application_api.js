// Public (unauthenticated) teacher-application API client.
//
// Mirrors the Flutter `TeacherApplicationApiService`. Used by the
// dashboard's /apply-as-teacher flow + /check-application-status.
//
// Why a separate file (not auth_api.js):
//   - This surface is conceptually public — no Bearer token, no
//     localStorage user reads. Co-locating with the auth flows would mix
//     concerns.
//   - The X-Upload-Token header for file uploads is exclusive to this
//     domain.
//
// All requests still go through the shared axiosInstance — the request
// interceptor attaches Authorization only when present in localStorage,
// which is correct for both the (anonymous applicant) AND the (logged-in
// dashboard operator testing the form) flows.

import axiosInstance from '@/utils/axios.js'

class TeacherApplicationApi {
  // -------------------------------------------------------------------------
  // Phase 8 — Submit + verify-email + resend
  // -------------------------------------------------------------------------

  /**
   * Submit a new application. Returns the created id + the upload token
   * that authorises subsequent file uploads in the same session.
   *
   * payload shape (mirrors the backend Zod schema):
   *   - authProvider: 'email' | 'google'  (default 'email')
   *   - firstName, lastName, phone, gender, birthDate, city, area,
   *     subject, teachingStage, yearsOfExperience, hasPhysicalCourses,
   *     estimatedStudentCount     (always required)
   *   - email, password            (email path)
   *   - googleToken                (google path)
   *   - description, bio, social URLs, currentWorkplace,
   *     customTeachingStage, oneSignalPlayerId  (optional)
   */
  async submit(payload) {
    return axiosInstance.post('/teacher-applications', payload)
  }

  async verifyEmailOtp(applicationId, code) {
    return axiosInstance.post(
      `/teacher-applications/${applicationId}/verify-email`,
      { code },
    )
  }

  async resendVerificationCode(applicationId) {
    return axiosInstance.post(
      `/teacher-applications/${applicationId}/resend-verification`,
      {},
    )
  }

  // -------------------------------------------------------------------------
  // Phase 8.12 — status-check OTP (returning applicant)
  // -------------------------------------------------------------------------

  /**
   * Always responds 200 regardless of whether the email matches a real
   * application — anti-enumeration is enforced server-side.
   */
  async requestStatusOtp(email) {
    return axiosInstance.post('/teacher-applications/status/request', { email })
  }

  async verifyStatusOtp(email, code) {
    return axiosInstance.post('/teacher-applications/status/verify', {
      email,
      code,
    })
  }

  // -------------------------------------------------------------------------
  // Phase 8.12 — public catalogs for the dropdowns
  // -------------------------------------------------------------------------

  async getSubjects() {
    return axiosInstance.get('/public/subjects')
  }

  async getTeachingStages() {
    return axiosInstance.get('/public/teaching-stages')
  }

  // -------------------------------------------------------------------------
  // Phase 3 — file upload (multipart, gated by X-Upload-Token)
  // -------------------------------------------------------------------------

  /**
   * Upload one file to an existing application. `kind` must be one of:
   *   profile_image | certificate_image | national_id_image |
   *   optional_attachment | intro_video
   *
   * Returns the standard envelope. Reports 0–100 progress via the
   * optional `onProgress` callback.
   */
  async uploadFile({
    applicationId,
    uploadToken,
    kind,
    file,
    onProgress,
  }) {
    const fd = new FormData()

    fd.append('kind', kind)
    fd.append('file', file)
    
    return axiosInstance.post(
      `/teacher-applications/${applicationId}/files`,
      fd,
      {
        headers: {
          'X-Upload-Token': uploadToken,

          // Content-Type is set automatically by axios for multipart.
        },
        onUploadProgress: e => {
          if (e.total && typeof onProgress === 'function') {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      },
    )
  }
}

export default new TeacherApplicationApi()
