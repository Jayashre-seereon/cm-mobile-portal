import api from './axios';

function mapQuizOption(option) {
  return {
    id: option?.id,
    text: option?.text || '',
  };
}

function mapQuizQuestion(question) {
  return {
    id: question?.id,
    question: question?.question || '',
    quizId: question?.quizId,
    options: Array.isArray(question?.options) ? question.options.map(mapQuizOption) : [],
  };
}

function mapQuizItem(quiz) {
  return {
    id: quiz?.id,
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

export async function submitQuiz(payload) {
  const response = await api.post('/quiz/submit-quiz', payload);
  return response?.data?.data || null;
}
