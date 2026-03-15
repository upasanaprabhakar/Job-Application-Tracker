import axiosInstance from "./axios";

export const applicationApi = {
  getStatistics: async () => {
    const res = await axiosInstance.get('/applications/stats');
    return res.data;
  },

  getAllApplications: async (params = {}) => {
    const res = await axiosInstance.get('/applications', { params });
    return res.data;
  },

  getApplicationById: async (id) => {
    const res = await axiosInstance.get(`/applications/${id}`);
    return res.data;
  },

  createApplication: async (data) => {
    const res = await axiosInstance.post('/applications', data);
    return res.data;
  },

  updateApplication: async (id, data) => {
    const res = await axiosInstance.put(`/applications/${id}`, data);
    return res.data;
  },

  deleteApplication: async (id) => {
    const res = await axiosInstance.delete(`/applications/${id}`);
    return res.data;
  },

  getUpcomingDeadlines: async (days = 7) => {
    const res = await axiosInstance.get('/applications/deadlines/upcoming', {
      params: { days }
    });
    return res.data;
  },

  checkDuplicates: async (companyName, jobTitle) => {
    const res = await axiosInstance.get('/applications/duplicates', {
      params: { companyName, jobTitle }
    });
    return res.data;
  },

  bulkUpdateStatus: async (applicationIds, status) => {
    const res = await axiosInstance.post('/applications/bulk-update', {
      applicationIds,
      status
    });
    return res.data;
  },

  bulkDelete: async (applicationIds) => {
    const res = await axiosInstance.post('/applications/bulk-delete', {
      applicationIds
    });
    return res.data;
  },

  exportApplications: async (params = {}) => {
    const res = await axiosInstance.get('/applications/export', {
      params,
      responseType: 'blob'
    });
    return res.data;
  },

  cloneApplication: async (id) => {
    const res = await axiosInstance.post(`/applications/${id}/clone`);
    return res.data;
  },

  getApplicationTimeline: async (id) => {
    const res = await axiosInstance.get(`/applications/${id}/timeline`);
    return res.data;
  }
};

export default applicationApi;