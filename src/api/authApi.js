import axiosInstance from './axios';

export const authApi = {
    register: async(data) => {
        const response = await axiosInstance.post('/auth/register', data);
        return response.data;
    },

    login: async(data) => {
        const response = await axiosInstance.post('/auth/login', data);
        return response.data;
    },

    logout: async() => {
        const response = await axiosInstance.post('/auth/logout');
        return response.data;
    },

    getCurrentUser: async() => {
        const response = await axiosInstance.post('/auth/me');
        return response.data;
    },

    refreshToken: async() => {
        const response = await axiosInstance.post('/auth/refresh-token');
        return response.data;
    }
};