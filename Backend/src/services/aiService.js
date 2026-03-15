const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ─── safe JSON parse ─────────────────────────────────── */
const parseJSON = (text) => {
  try {
    const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error('JSON parse failed, raw:', text.slice(0, 300));
    throw new Error('AI returned invalid JSON');
  }
};

const chat = async (prompt) => {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 2048,
  });
  return res.choices[0]?.message?.content || '';
};

/* ═══════════════════════════════════════════════════════
   1. ANALYZE RESUME
═══════════════════════════════════════════════════════ */
const analyzeResume = async (resumeText) => {
  try {
    const prompt = `You are an expert resume reviewer. Analyze the resume below and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

Resume:
"""
${resumeText.slice(0, 4000)}
"""

Return exactly this JSON structure:
{
  "score": <number 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "improvements": [
    "<actionable tip 1>",
    "<actionable tip 2>",
    "<actionable tip 3>",
    "<actionable tip 4>",
    "<actionable tip 5>"
  ],
  "keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"]
}`;

    const text = await chat(prompt);
    return parseJSON(text);
  } catch (error) {
    console.error('AI analysis error:', error.message);
    throw new Error('Failed to analyze resume');
  }
};

/* ═══════════════════════════════════════════════════════
   2. OPTIMIZE RESUME FOR JOB
═══════════════════════════════════════════════════════ */
const optimizeResumeForJob = async (resumeText, jobDescription) => {
  try {
    const prompt = `You are an expert ATS resume optimizer. Compare the resume to the job description and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

Resume:
"""
${resumeText.slice(0, 3000)}
"""

Job Description:
"""
${jobDescription.slice(0, 2000)}
"""

Return exactly this JSON structure:
{
  "matchScore": <number 0-100>,
  "summary": "<2-3 sentence match assessment>",
  "missingKeywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>", "<kw6>", "<kw7>", "<kw8>"],
  "sectionsToModify": ["<change 1>", "<change 2>", "<change 3>"],
  "tailoredBullets": [
    "<rewritten bullet 1 tailored to this job>",
    "<rewritten bullet 2>",
    "<rewritten bullet 3>",
    "<rewritten bullet 4>"
  ],
  "skillsToEmphasize": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>"]
}`;

    const text = await chat(prompt);
    return parseJSON(text);
  } catch (error) {
    console.error('AI optimization error:', error.message);
    throw new Error('Failed to optimize resume');
  }
};

/* ═══════════════════════════════════════════════════════
   3. GENERATE INTERVIEW TIPS
═══════════════════════════════════════════════════════ */
const generateInterviewTips = async (jobDescription, resumeText = null) => {
  try {
    const resumeSection = resumeText
      ? `\nCandidate Resume:\n"""\n${resumeText.slice(0, 2000)}\n"""`
      : '';

    const prompt = `You are an expert interview coach. Based on the job description${resumeText ? ' and candidate resume' : ''} below, generate interview prep content and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

Job Description:
"""
${jobDescription.slice(0, 2000)}
"""
${resumeSection}

Return exactly this JSON structure:
{
  "questions": [
    { "question": "<question 1>", "suggestedAnswer": "<answer approach 1>" },
    { "question": "<question 2>", "suggestedAnswer": "<answer approach 2>" },
    { "question": "<question 3>", "suggestedAnswer": "<answer approach 3>" },
    { "question": "<question 4>", "suggestedAnswer": "<answer approach 4>" },
    { "question": "<question 5>", "suggestedAnswer": "<answer approach 5>" },
    { "question": "<behavioral question>", "suggestedAnswer": "<STAR method approach>" },
    { "question": "<technical question>", "suggestedAnswer": "<technical answer approach>" },
    { "question": "<situational question>", "suggestedAnswer": "<situational answer approach>" }
  ],
  "keyTalkingPoints": ["<point 1>", "<point 2>", "<point 3>", "<point 4>"],
  "companyResearchTips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "skillsToHighlight": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>"],
  "generalTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`;

    const text = await chat(prompt);
    return parseJSON(text);
  } catch (error) {
    console.error('AI interview tips error:', error.message);
    throw new Error('Failed to generate interview tips');
  }
};

module.exports = {
  analyzeResume,
  optimizeResumeForJob,
  generateInterviewTips,
};