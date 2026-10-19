import api from "./axios";

/**
 * Normalizes backend responses whether wrapped in { data: ... } or returned directly.
 */
function extractData(response) {
  if (!response) return null;
  const resData = response.data !== undefined ? response.data : response;
  if (resData && typeof resData === "object" && "data" in resData && resData.data !== undefined) {
    return resData.data;
  }
  return resData;
}

/**
 * 1. Get Published Assessments
 * GET /api/psychometric-assessment/assessments
 */
export async function getPublishedAssessments() {
  try {
    const response = await api.get("/psychometric-assessment/assessments");
    const data = extractData(response);
    if (Array.isArray(data)) return data;
    if (data?.assessments && Array.isArray(data.assessments)) return data.assessments;
    if (data && typeof data === "object") return [data];
    return [];
  } catch (error) {
    console.warn("getPublishedAssessments error, falling back:", error?.message);
    return [];
  }
}

/**
 * 2. Start New Test Attempt
 * POST /api/psychometric-assessment/assessment/:assessmentId/start
 */
export async function startAssessmentAttempt(assessmentId) {
  const targetId = assessmentId || "default";
  const response = await api.post(`/psychometric-assessment/assessment/${targetId}/start`, {});
  const data = extractData(response);
  return data;
}

/**
 * 3. Get Questions & Answers for Attempt
 * GET /api/psychometric-assessment/assessment/attempt/:attemptId/questions
 */
export async function getAttemptQuestions(attemptId) {
  if (!attemptId) throw new Error("Attempt ID is required");
  const response = await api.get(`/psychometric-assessment/assessment/attempt/${attemptId}/questions`);
  return extractData(response);
}

/**
 * 4. Get Attempt Status / Progress
 * GET /api/psychometric-assessment/assessment/attempt/:attemptId/status
 */
export async function getAttemptStatus(attemptId) {
  if (!attemptId) throw new Error("Attempt ID is required");
  const response = await api.get(`/psychometric-assessment/assessment/attempt/${attemptId}/status`);
  return extractData(response);
}

/**
 * 5. Save Single Answer (Auto-save)
 * POST /api/psychometric-assessment/assessment/attempt/:attemptId/answer
 * Payload: { questionId, likertValue?, selectedOptionId? }
 */
export async function saveAttemptAnswer(attemptId, { questionId, likertValue, selectedOptionId }) {
  if (!attemptId) throw new Error("Attempt ID is required");
  const payload = {
    questionId,
    ...(likertValue !== undefined && likertValue !== null ? { likertValue: Number(likertValue) } : {}),
    ...(selectedOptionId !== undefined && selectedOptionId !== null ? { selectedOptionId } : {}),
  };
  const response = await api.post(`/psychometric-assessment/assessment/attempt/${attemptId}/answer`, payload);
  return extractData(response);
}

/**
 * 6. Save Batch Answers (On Section Change)
 * POST /api/psychometric-assessment/assessment/attempt/:attemptId/batch-answers
 * Payload: [{ questionId, likertValue?, selectedOptionId? }]
 */
export async function saveBatchAttemptAnswers(attemptId, answers = []) {
  if (!attemptId) throw new Error("Attempt ID is required");
  const payload = Array.isArray(answers) ? answers : answers?.answers || [];
  const response = await api.post(
    `/psychometric-assessment/assessment/attempt/${attemptId}/batch-answers`,
    Array.isArray(answers) ? payload : { answers: payload }
  );
  return extractData(response);
}

/**
 * 7. Submit Attempt
 * POST /api/psychometric-assessment/assessment/attempt/:attemptId/submit
 */
export async function submitAssessmentAttempt(attemptId) {
  if (!attemptId) throw new Error("Attempt ID is required");
  const response = await api.post(`/psychometric-assessment/assessment/attempt/${attemptId}/submit`, {});
  return extractData(response);
}

/**
 * 8. Get Test Result / Report
 * GET /api/psychometric-assessment/assessment/attempt/:attemptId/result
 */
export async function getAttemptResult(attemptId) {
  if (!attemptId) throw new Error("Attempt ID is required");
  const response = await api.get(`/psychometric-assessment/assessment/attempt/${attemptId}/result`);
  return extractData(response);
}

/**
 * 9. Get My Past Attempts
 * GET /api/psychometric-assessment/assessment/my-attempts
 */
export async function getMyAttempts() {
  try {
    const response = await api.get("/psychometric-assessment/assessment/my-attempts");
    const data = extractData(response);
    if (Array.isArray(data)) return data;
    if (data?.attempts && Array.isArray(data.attempts)) return data.attempts;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (error) {
    console.warn("getMyAttempts error:", error?.message);
    return [];
  }
}

/**
 * 10. Get User Assessment Access Status
 * GET /api/psychometric-assessment/assessment/user/access-status
 * Responses:
 * - Allowed: { allowed: true, subscriptionId, planTitle }
 * - Already Completed (1-Plan = 1-Attempt Lock): { allowed: false, reason: "ALREADY_COMPLETED", requiresNewPlan: true, completedAttemptId, completedAt, message }
 * - No Active Plan: { allowed: false, reason: "NO_ACTIVE_PLAN", requiresNewPlan: true, message }
 */
export async function getAssessmentAccessStatus() {
  try {
    const response = await api.get("/psychometric-assessment/assessment/user/access-status");
    return extractData(response);
  } catch (error) {
    console.warn("getAssessmentAccessStatus error:", error?.message);
    const data = error.response?.data;
    if (data) return extractData(data);
    throw error;
  }
}

export const getUserAssessmentAccessStatus = getAssessmentAccessStatus;

