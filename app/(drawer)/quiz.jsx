import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Text, View } from 'react-native';
import { useAppState } from '../../src/app-state';
import { getQuizById, getQuizzes, submitQuiz } from '../../src/api/quizApi';
import { palette } from '../../src/careermap-data';
import { AnimatedPressable, Screen, SectionHeader } from '../../src/careermap-ui';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';

function formatQuizCount(value) {
  return `${value} question${value === 1 ? '' : 's'}`;
}

function formatDateRange(from, to) {
  if (!from && !to) {
    return 'Dates not available';
  }

  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;

  if (start && !Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
    return `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  return 'Dates not available';
}

export default function QuizScreen() {
  const params = useLocalSearchParams();
  const { preferences } = useAppState();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [quizError, setQuizError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadQuizzes() {
      try {
        setIsLoadingList(true);
        setListError('');
        const items = await getQuizzes();

        if (isMounted) {
          setQuizzes(items);
        }
      } catch (_error) {
        if (isMounted) {
          setQuizzes([]);
          setListError('Failed to load quizzes.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingList(false);
        }
      }
    }

    loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQuizDetail() {
      if (selectedQuizId === null) {
        return;
      }

      try {
        setIsLoadingQuiz(true);
        setQuizError('');
        setQuizResult(null);
        setCurrentQuestion(0);
        setAnswers([]);
        const quiz = await getQuizById(selectedQuizId);

        if (isMounted) {
          setSelectedQuiz(quiz);
          setAnswers(Array.isArray(quiz?.questions) ? quiz.questions.map(() => null) : []);
        }
      } catch (_error) {
        if (isMounted) {
          setSelectedQuiz(null);
          setQuizError('Failed to load quiz questions.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingQuiz(false);
        }
      }
    }

    loadQuizDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedQuizId]);

  // Global search / Career Bee: open the picked quiz as tapping it in the list does.
  useSearchDeepLink(params.searchKey, !isLoadingList, () => {
    const quizId = typeof params.quizId === 'string' ? params.quizId : '';
    const quiz = quizzes.find((item) => String(item.id) === quizId);
    if (!quiz || isSubmitting) {
      return;
    }
    setSelectedQuizId(quiz.id);
    setSelectedQuiz(quiz);
    setCurrentQuestion(0);
    setAnswers(Array.isArray(quiz.questions) ? quiz.questions.map(() => null) : []);
    setQuizResult(null);
    setQuizError('');
  });

  function resetQuizFlow() {
    setSelectedQuizId(null);
    setSelectedQuiz(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setQuizResult(null);
    setQuizError('');
    setIsSubmitting(false);
  }

  function handleSelectAnswer(optionId) {
    setAnswers((current) => {
      const next = [...current];
      next[currentQuestion] = optionId;
      return next;
    });
  }

  function handlePreviousQuestion() {
    if (currentQuestion === 0) {
      resetQuizFlow();
      return;
    }

    setCurrentQuestion((value) => value - 1);
  }

  async function handleNextQuestion() {
    if (!selectedQuiz || selectedQuiz.questions.length === 0) {
      return;
    }

    if (answers[currentQuestion] === null || answers[currentQuestion] === undefined) {
      Alert.alert('Select an answer', 'Please choose an option before continuing.');
      return;
    }

    if (currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion((value) => value + 1);
      return;
    }

    const payload = {
      quizId: selectedQuiz.id,
      answers: selectedQuiz.questions.map((question, index) => ({
        questionId: question.id,
        selectedOption: answers[index],
      })),
    };

    if (payload.answers.some((item) => item.selectedOption === null || item.selectedOption === undefined)) {
      Alert.alert('Complete the quiz', 'Please answer every question before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await submitQuiz(payload);
      setQuizResult(result);
    } catch (_error) {
      Alert.alert('Submission failed', 'We could not submit the quiz right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedQuestion = selectedQuiz?.questions?.[currentQuestion] || null;
  const selectedAnswer = selectedQuestion ? answers[currentQuestion] : null;
  const totalQuestions = selectedQuiz?.questions?.length || 0;
  const progressValue = totalQuestions > 0 ? Math.round(((currentQuestion + 1) / totalQuestions) * 100) : 0;

  if (quizResult && selectedQuiz) {
    return (
      <Screen animationKey={`quiz-result-${selectedQuiz.id}`}>
        <View className="px-1 pb-8 pt-3">
          <View className="mb-6">
            <Text className="text-[12px] font-bold uppercase tracking-[1px] text-brand">Quiz Result</Text>
            <Text className={`mt-1 text-[22px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{selectedQuiz.title}</Text>
          </View>

          <View className={`items-center gap-3 rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <Text className="text-[13px] font-bold uppercase tracking-[1px] text-brand">Score</Text>
            <Text className="text-[44px] font-black text-brand">{quizResult.score}</Text>
            <Text className={`text-center text-[16px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
              {quizResult.correct} correct out of {quizResult.total}
            </Text>
            <Text className={`text-center text-[13px] leading-6 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              Wrong answers: {quizResult.wrong}
            </Text>
          </View>

          <View className={`mt-4 gap-3 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <Text className={`text-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Result Summary</Text>
            <View className="flex-row items-center justify-between">
              <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Total Questions</Text>
              <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{quizResult.total}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Correct</Text>
              <Text className="text-[14px] font-bold text-success">{quizResult.correct}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Wrong</Text>
              <Text className="text-[14px] font-bold text-brand">{quizResult.wrong}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <AnimatedPressable
              className={`flex-1 items-center rounded-[16px] border px-4 py-4 ${preferences.darkMode ? 'border-[#1f1f1f] bg-[#101013]' : 'border-[#dfd2cc] bg-white'}`}
              onPress={resetQuizFlow}
            >
              <Text className={`text-[14px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Try Another Quiz</Text>
            </AnimatedPressable>
            <AnimatedPressable
              className="flex-1 items-center rounded-[16px] bg-brand px-4 py-4"
              onPress={() => setQuizResult(null)}
            >
              <Text className="text-[14px] font-extrabold text-white">Review Questions</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Screen>
    );
  }

  if (selectedQuiz) {
    if (isLoadingQuiz) {
      return (
      <Screen animationKey="quiz-loading">
          <View className="px-1 pb-8 pt-3">
            <View className="mb-6">
              <Text className="text-[12px] font-bold uppercase tracking-[1px] text-brand">Loading Quiz</Text>
              <Text className={`mt-1 text-[22px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{selectedQuiz.title}</Text>
            </View>

            <View className={`items-center gap-3 rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
              <ActivityIndicator color={palette.primary} />
              <Text className={`text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading quiz questions...</Text>
            </View>
          </View>
        </Screen>
      );
    }

    if (quizError) {
      return (
      <Screen animationKey="quiz-error">
          <View className="px-1 pb-8 pt-3">
            <View className="mb-6">
              <Text className="text-[12px] font-bold uppercase tracking-[1px] text-brand">Quiz Error</Text>
              <Text className={`mt-1 text-[22px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Unable to Continue</Text>
            </View>

            <View className={`items-center gap-3 rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
              <Text className={`text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{quizError}</Text>
              <AnimatedPressable className="mt-1 rounded-[16px] bg-brand px-5 py-3.5" onPress={resetQuizFlow}>
                <Text className="text-[14px] font-extrabold text-white">Back to Quizzes</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Screen>
      );
    }

    if (!selectedQuestion) {
      return null;
    }

    return (
      <Screen animationKey={`quiz-${selectedQuiz.id}-${currentQuestion}`}>
        <View className="px-1 pb-8 pt-3">
          <View className="mb-6">
            <Text className="text-[12px] font-bold uppercase tracking-[1px] text-brand">Quiz</Text>
            <View className="mt-1 flex-row items-end justify-between gap-3">
              <Text className={`flex-1 text-[22px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{selectedQuiz.title}</Text>
              <Text className="text-[12px] font-extrabold text-brand">
                {currentQuestion + 1}/{totalQuestions}
              </Text>
            </View>
          </View>

          <View className={`gap-4 rounded-[26px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[12px] font-bold uppercase tracking-[1px] text-brand">{selectedQuiz.type}</Text>
                <Text className={`mt-1 text-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                  {formatQuizCount(totalQuestions)}
                </Text>
                <Text className={`mt-1 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{formatDateRange(selectedQuiz.from, selectedQuiz.to)}</Text>
              </View>
              <View className="rounded-[18px] bg-[#fff2ef] px-3 py-2">
                <Text className="text-[11px] font-bold text-brand">{selectedQuiz.duration} min</Text>
              </View>
            </View>

            <View className="h-2 overflow-hidden rounded-full bg-line">
              <View className="h-full rounded-full bg-success" style={{ width: `${progressValue}%` }} />
            </View>
          </View>

          <View className={`mt-4 gap-2 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <Text className={`text-[10px] font-extrabold uppercase tracking-[1px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              Question {currentQuestion + 1}
            </Text>
            <Text className={`text-[18px] font-extrabold leading-[28px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
              {selectedQuestion.question}
            </Text>
          </View>

          <View className="mt-4 gap-3">
            {selectedQuestion.options.map((option, index) => {
              const active = selectedAnswer === option.id;

              return (
                <AnimatedPressable
                  key={option.id}
                  className={`rounded-[18px] border px-4 py-4 ${active ? 'border-brand bg-brand' : preferences.darkMode ? 'border-[#1f1f1f] bg-[#101013]' : 'border-[#eadcd6] bg-white'}`}
                  onPress={() => handleSelectAnswer(option.id)}
                >
                  <Text className={`text-[14px] font-bold ${active ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {String.fromCharCode(65 + index)}. {option.text}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <View className="mt-4 flex-row gap-3">
            <AnimatedPressable
              className={`flex-1 items-center rounded-[16px] border px-4 py-4 ${preferences.darkMode ? 'border-[#1f1f1f] bg-[#101013]' : 'border-[#dfd2cc] bg-white'}`}
              onPress={handlePreviousQuestion}
            >
              <Text className={`text-[14px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                {currentQuestion === 0 ? 'Back to Quizzes' : 'Previous'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              className="flex-1 items-center rounded-[16px] bg-brand px-4 py-4"
              onPress={handleNextQuestion}
              disabled={isSubmitting}
            >
              <Text className="text-[14px] font-extrabold text-white">
                {isSubmitting ? 'Submitting...' : currentQuestion === totalQuestions - 1 ? 'Submit Quiz' : 'Next'}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen animationKey="quiz-list">
      <SectionHeader
        title="Quizzes"
        subtitle="Choose a quiz, answer each question, and submit to see your score."
      />

      <View className="gap-3">
        {isLoadingList ? (
          <View className={`items-center gap-3 rounded-[22px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <ActivityIndicator color={palette.primary} />
            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading quizzes...</Text>
          </View>
        ) : null}

        {!isLoadingList && listError ? (
          <Text className="text-[13px] text-brand">{listError}</Text>
        ) : null}

        {!isLoadingList && !listError && quizzes.length === 0 ? (
          <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No quizzes available right now.</Text>
        ) : null}

        {quizzes.map((quiz) => {
          const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
          const quizTypeLabel = quiz.type || 'Quiz';

          return (
            <AnimatedPressable
              key={quiz.id}
              onPress={() => {
                setSelectedQuizId(quiz.id);
                setSelectedQuiz(quiz);
                setCurrentQuestion(0);
                setAnswers(Array.isArray(quiz.questions) ? quiz.questions.map(() => null) : []);
                setQuizResult(null);
                setQuizError('');
              }}
              className={`overflow-hidden rounded-[26px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
              <View className="px-[18px] py-[18px]">
                <View className="flex-row items-start gap-4">
                  <View
                    className="h-[74px] w-[74px] items-center justify-center rounded-[20px]"
                    style={{
                      backgroundColor: `${palette.blue}14`,
                      borderWidth: 1,
                      borderColor: `${palette.blue}16`,
                    }}
                  >
                    <Text className="text-[16px] font-black tracking-[0.5px]" style={{ color: palette.blue }}>
                      QUIZ
                    </Text>
                  </View>

                  <View className="flex-1 gap-1 pt-0.5">
                    <Text className={`text-[18px] font-extrabold leading-6 ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                      {quiz.title}
                    </Text>
                    <Text className={`text-[13px] font-medium ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                      {quizTypeLabel}
                    </Text>
                    <Text className={`mt-2 text-[14px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                      {formatDateRange(quiz.from, quiz.to)}
                    </Text>
                  </View>

                  <View className="items-end gap-2">
                    <View
                      className="rounded-[15px] px-3 py-2"
                      style={{
                        backgroundColor: `${palette.primary}10`,
                        borderWidth: 1,
                        borderColor: `${palette.primary}20`,
                      }}
                    >
                      <Text className="text-[11px] font-black uppercase tracking-[1px]" style={{ color: palette.primary }}>
                        {quiz.duration} min
                      </Text>
                    </View>

                    <Text className={`text-[14px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                      {formatQuizCount(questionCount)}
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          );
        })}

        {isLoadingQuiz ? (
          <View className={`items-center gap-3 rounded-[22px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <ActivityIndicator color={palette.primary} />
            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Opening quiz...</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
