import axiosInstance from './axios';

export const documentsApi = {

  /* ── Resumes ─────────────────────────────────────────── */
  getAllResumes: async () => {
    const res = await axiosInstance.get('/resumes');
    return res.data;
  },
  getResumeById: async (id) => {
    const res = await axiosInstance.get(`/resumes/${id}`);
    return res.data;
  },
  uploadResume: async (formData) => {
    const res = await axiosInstance.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  updateResume: async (id, data) => {
    const res = await axiosInstance.put(`/resumes/${id}`, data);
    return res.data;
  },
  deleteResume: async (id) => {
    const res = await axiosInstance.delete(`/resumes/${id}`);
    return res.data;
  },
  getResumeText: async (id) => {
    const res = await axiosInstance.get(`/resumes/${id}/text`);
    return res.data;
  },

  /* ── Cover Letters ───────────────────────────────────── */
  getAllCoverLetters: async () => {
    const res = await axiosInstance.get('/cover-letters');
    return res.data;
  },
  createCoverLetter: async (data) => {
    const res = await axiosInstance.post('/cover-letters', data);
    return res.data;
  },
  deleteCoverLetter: async (id) => {
    const res = await axiosInstance.delete(`/cover-letters/${id}`);
    return res.data;
  },

  /* ── Certifications ──────────────────────────────────── */
  getAllCertifications: async () => {
    const res = await axiosInstance.get('/certifications');
    return res.data;
  },
  createCertification: async (data) => {
    const res = await axiosInstance.post('/certifications', data);
    return res.data;
  },
  updateCertification: async (id, data) => {
    const res = await axiosInstance.put(`/certifications/${id}`, data);
    return res.data;
  },
  deleteCertification: async (id) => {
    const res = await axiosInstance.delete(`/certifications/${id}`);
    return res.data;
  },

  /* ── Portfolio ───────────────────────────────────────── */
  getAllPortfolios: async () => {
    const res = await axiosInstance.get('/portfolios');
    return res.data;
  },
  createPortfolio: async (data) => {
    const res = await axiosInstance.post('/portfolios', data);
    return res.data;
  },
  updatePortfolio: async (id, data) => {
    const res = await axiosInstance.put(`/portfolios/${id}`, data);
    return res.data;
  },
  deletePortfolio: async (id) => {
    const res = await axiosInstance.delete(`/portfolios/${id}`);
    return res.data;
  },

  /* ── References ──────────────────────────────────────── */
  getAllReferences: async () => {
    const res = await axiosInstance.get('/references');
    return res.data;
  },
  createReference: async (data) => {
    const res = await axiosInstance.post('/references', data);
    return res.data;
  },
  updateReference: async (id, data) => {
    const res = await axiosInstance.put(`/references/${id}`, data);
    return res.data;
  },
  deleteReference: async (id) => {
    const res = await axiosInstance.delete(`/references/${id}`);
    return res.data;
  },
};