import axiosInstance from './axios';

export const notificationApi = {
  getAll:      (limit = 25) => axiosInstance.get(`/notifications?limit=${limit}`),
  markRead:    (id)         => axiosInstance.patch(`/notifications/${id}/read`),
  markAllRead: ()           => axiosInstance.patch('/notifications/read-all'),
  delete:      (id)         => axiosInstance.delete(`/notifications/${id}`),
};