import axiosInstance from './axios';

export const settingsApi = {

  getProfile: async () => {
    const res = await axiosInstance.get('/users/me');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await axiosInstance.put('/users/profile', data);
    return res.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await axiosInstance.put('/users/password', { currentPassword, newPassword });
    return res.data;
  },

  getNotifications: async () => {
    const res = await axiosInstance.get('/users/notifications');
    return res.data;
  },

  updateNotifications: async (prefs) => {
    const res = await axiosInstance.put('/users/notifications', prefs);
    return res.data;
  },

  exportData: async () => {
    const res = await axiosInstance.get('/users/export', { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', `jobtracker-export-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  deleteAccount: async (password) => {
    const res = await axiosInstance.delete('/users/account', { data: { password } });
    return res.data;
  },
};