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
}
export default new Auth();
