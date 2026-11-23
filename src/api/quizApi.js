import api from './axios';

function mapQuizOption(option) {
  return {
    // Option ids are strings, as on the user portal; the server converts them back to integers.
    id: String(option?.id ?? ''),
    text: option?.text || '',
  };
}

function mapQuizQuestion(question) {
  return {
    id: String(question?.id ?? ''),
    question: question?.question || '',
    quizId: question?.quizId ?? null,
    options: Array.isArray(question?.options) ? question.options.map(mapQuizOption) : [],
  };
}

function mapQuizItem(quiz) {
  return {
    id: String(quiz?.id ?? ''),
    title: quiz?.title || 'Untitled Quiz',
    type: quiz?.type || 'Quiz',
    duration: quiz?.duration ?? 0,
    from: quiz?.from || null,
    to: quiz?.to || null,
    questions: Array.isArray(quiz?.questions) ? quiz.questions.map(mapQuizQuestion) : [],
  };
}

export async function getQuizzes() {
  const response = await api.get('/quiz/');
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return items.map(mapQuizItem);
}

export async function getQuizById(quizId) {
  const response = await api.get(`/quiz/user/${quizId}`);
  const quiz = response?.data?.data || null;

  return quiz ? mapQuizItem(quiz) : null;
}

// Returns { attemptId, resultAvailable, ...(total, correct, wrong, score when resultAvailable) }.
// The server withholds the score unless the user has Quiz access.
export async function submitQuiz(payload) {
  const response = await api.post('/quiz/submit-quiz', payload);
  return response?.data?.data || null;
}

// The server-confirmed result of an attempt ({ resultAvailable: false, message } without Quiz access).
export async function getQuizAttemptResult(attemptId) {
  const response = await api.get(`/quiz/attempt/${attemptId}/result`);
  return response?.data?.data || null;
}
