import axiosInstance from "@/utils/axios.js";

class TeacherApi {
    // profile
    async completeProfile(userData) {
        const response = await axiosInstance.post(`/auth/complete-profile`, userData);
        return response;
    }
    // profile

    // grades
    async getAllGrades() {
        const response = await axiosInstance.get(`/grades/all`);
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
}
export default new TeacherApi();
