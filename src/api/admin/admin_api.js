import axiosInstance from "@/utils/axios.js";

class Admin {
  // academic-years
  async createAcademicYear(userData) {
    const response = await axiosInstance.post(`/academic-years`, userData);
    return response;
  }
  async getAcademicYear(userData) {
    const response = await axiosInstance.get(`/academic-years?page=${userData.options.page}&limit=${userData.options.limit}&search=${userData.options.search}&is_active=${userData.options.is_active}`);
    return response;
  }
  async activateAcademicYear(id) {
    const response = await axiosInstance.patch(`/academic-years/${id}/activate`);
    return response;
  }
  //   academic-years

  // grades
  async createGrade(userData) {
    const response = await axiosInstance.post(`/grades`, userData);
    return response;
  }
  async getGrade(userData) {
    const response = await axiosInstance.get(`/grades?page=${userData.options.page}&limit=${userData.options.limit}&search=${userData.options.search}&is_active=${userData.options.is_active}`);
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

  // subscription-packages
  async createSubscriptionPackage(userData) {
    const response = await axiosInstance.post(`/subscription-packages`, userData);
    return response;
  }
  async getSubscriptionPackage(userData) {
    const response = await axiosInstance.get(`/subscription-packages?page=${userData.options.page}&limit=${userData.options.limit}&search=${userData.options.search}&isActive=${userData.options.isActive}&isFree=${userData.options.isFree}&deleted=${userData.options.deleted}`);
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
}
export default new Admin();
