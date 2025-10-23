import axiosInstance from "@/utils/axios.js";

class Auth {
  async loginInGoogele(userData) {
    const requestData = {
      googleData: userData,
      userType: "teacher",
    };
    const response = await axiosInstance.post(`/auth/google-auth`, requestData);

    return response;
  }
  async login(userData) {
    const response = await axiosInstance.post(`/auth/login`, userData);

    return response;
  }
  async logout() {
    const response = await axiosInstance.post(`/auth/logout`);

    return response;
  }

  // Teacher registration & auth flows
  async registerTeacher(payload) {
    // payload should match backend schema
    return await axiosInstance.post(`/auth/register/teacher`, payload)
  }

  async verifyEmail(payload) {
    // payload: { email, code? , verificationToken? }
    return await axiosInstance.post(`/auth/verify-email`, payload)
  }

  async resendVerification(payload) {
    // payload: { email }
    return await axiosInstance.post(`/auth/resend-verification`, payload)
  }

  async requestPasswordReset(payload) {
    // payload: { email }
    return await axiosInstance.post(`/auth/request-password-reset`, payload)
  }

  async resetPassword(payload) {
    // payload: { email, newPassword, code? , resetToken? }
    return await axiosInstance.post(`/auth/reset-password`, payload)
  }
}
export default new Auth();
