import axiosInstance from './axios';

export const aiApi = {

  /* POST /ai/analyze-resume  { resumeId } */
  analyzeResume: async (resumeId) => {
    const res = await axiosInstance.post('/ai/analyze-resume', { resumeId });
    return res.data;
  },

  /* POST /ai/optimize-resume  { resumeId, jobDescription } */
  optimizeResume: async (resumeId, jobDescription) => {
    const res = await axiosInstance.post('/ai/optimize-resume', { resumeId, jobDescription });
    return res.data;
  },

  /* POST /ai/interview-tips  { applicationId, resumeId? } */
  getInterviewTips: async (applicationId, resumeId = null) => {
    const res = await axiosInstance.post('/ai/interview-tips', { applicationId, resumeId });
    return res.data;
  },
};