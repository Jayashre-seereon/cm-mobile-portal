import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import { useAppState } from '../../src/app-state';
import {
  getAttemptQuestions,
  saveAttemptAnswer,
  saveBatchAttemptAnswers,
  submitAssessmentAttempt,
} from '../../src/api/psychometricAssessmentApi';
import {
  ASSESSMENT_DOMAINS,
  LIKERT_OPTIONS,
  PROFILING_LIKERT_OPTIONS,
  PROFILING_SP_OPTIONS,
  TOTAL_ASSESSMENT_QUESTIONS,
  getDomainMeta,
} from '../../src/features/assessment/data/assessmentConstants';

const APTITUDE_TIME_LIMIT_SECONDS = 30 * 60;

// Aptitude timer start times are persisted so the countdown survives an app restart
// (localStorage on web, a small JSON file in the document directory on native).
const NATIVE_TIMER_FILE = 'careermap-aptitude-timers.json';
const timerMemoryStore = {};

function readNativeTimers() {
  try {
    const file = new File(Paths.document, NATIVE_TIMER_FILE);
    if (!file.exists) return {};
    const parsed = JSON.parse(file.textSync() || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_e) {
    return {};
  }
}

function getTimerStartedAt(key) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) return Number(val);
      }
    } else {
      const val = readNativeTimers()[key];
      if (val) return Number(val);
    }
  } catch (_e) {}
  return timerMemoryStore[key] || null;
}

function setTimerStartedAt(key, val) {
  timerMemoryStore[key] = val;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(val));
      }
      return;
    }
    const timers = { ...readNativeTimers(), [key]: val };
    const file = new File(Paths.document, NATIVE_TIMER_FILE);
    if (!file.exists) file.create();
    file.write(JSON.stringify(timers));
  } catch (_e) {}
}

function isAptitudeSection(section, index) {
  const key = String(
    section?.code ||
    section?.domainKey ||
    section?.id ||
    section?.title ||
    section?.key ||
    section?.domain ||
    ''
  ).toLowerCase();
  return key.includes('apt') || key.includes('cognit') || getDomainMeta(section, index)?.id === 'aptitude';
}

function hasAnswerValue(ans) {
  return Boolean(
    ans &&
    ((ans.likertValue !== undefined && ans.likertValue !== null) ||
      (ans.selectedOptionId !== undefined && ans.selectedOptionId !== null) ||
      (ans.optionKey !== undefined && ans.optionKey !== null))
  );
}

function toSavePayload(questionId, ans) {
  return {
    questionId,
    ...(ans.likertValue !== undefined && ans.likertValue !== null ? { likertValue: ans.likertValue } : {}),
    ...(ans.selectedOptionId !== undefined && ans.selectedOptionId !== null ? { selectedOptionId: ans.selectedOptionId } : {}),
    ...(ans.optionKey !== undefined && ans.optionKey !== null ? { optionKey: ans.optionKey } : {}),
  };
}

function buildBatchList(answerMap) {
  return Object.entries(answerMap)
    .filter(([, ans]) => hasAnswerValue(ans))
    .map(([qId, ans]) => toSavePayload(qId, ans));
}

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export default function AssessmentAttemptScreen() {
  const { attemptId } = useLocalSearchParams();
  const { preferences } = useAppState();
  const darkMode = preferences.darkMode;
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loadError, setLoadError] = useState('');

  // Map of answers: { [questionId]: { likertValue?: number, selectedOptionId?: string, optionKey?: string } }
  const [answers, setAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'

  // Submission state & modal
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStepText, setSubmitStepText] = useState('');
  const [accessBlockedInfo, setAccessBlockedInfo] = useState({
    visible: false,
    reason: '',
    message: '',
  });

  const [aptitudeTimeLeft, setAptitudeTimeLeft] = useState(APTITUDE_TIME_LIMIT_SECONDS);
  const [aptitudeExpired, setAptitudeExpired] = useState(false);
  const [aptitudeStarted, setAptitudeStarted] = useState(false);
  const [showAptitudeExpiredModal, setShowAptitudeExpiredModal] = useState(false);

  // Answers changed locally but not yet confirmed by the server: { [questionId]: entry }
  const pendingSavesRef = useRef({});
  const saveTimeoutRef = useRef(null);
  // Saves run one after another so an older request can never overwrite a newer answer.
  const saveChainRef = useRef(Promise.resolve());
  const submittingRef = useRef(false);
  const loadRequestRef = useRef(0);
  // Set after a submit or a redirect to the report; the next focus re-checks the attempt status
  // so a completed attempt kept mounted by the drawer never shows editable questions again.
  const needsReloadRef = useRef(false);
  const scrollViewRef = useRef(null);
  const aptitudeTimerKey = `assessment:${attemptId}:aptitude-started-at`;

  const loadTestQuestions = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    // This drawer screen stays mounted between attempts, so reset every per-attempt value.
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingSavesRef.current = {};
    submittingRef.current = false;
    setLoading(true);
    setLoadError('');
    setSections([]);
    setAnswers({});
    setCurrentSectionIndex(0);
    setSaveStatus('saved');
    setIsSubmitModalVisible(false);
    setSubmitting(false);
    setAccessBlockedInfo({ visible: false, reason: '', message: '' });
    setAptitudeStarted(false);
    setAptitudeExpired(false);
    setAptitudeTimeLeft(APTITUDE_TIME_LIMIT_SECONDS);
    setShowAptitudeExpiredModal(false);

    let redirecting = false;
    try {
      if (!attemptId) {
        throw new Error('No assessment attempt was selected. Please start the assessment again.');
      }

      let loadedSections = [];
      let initialAnswers = {};

      const data = await getAttemptQuestions(attemptId);
      if (loadRequestRef.current !== requestId) return;

      const attemptStatus = String(data?.status || '').toLowerCase();
      if (attemptStatus === 'completed') {
        // A finished attempt must never be editable again: open its report instead.
        redirecting = true;
        needsReloadRef.current = true;
        router.replace({
          pathname: '/(drawer)/assessment-report',
          params: { attemptId: String(attemptId) },
        });
        return;
      }
      if (attemptStatus && attemptStatus !== 'in_progress') {
        throw new Error(
          'This assessment attempt is no longer active and cannot be continued. Please start a new attempt from the Assessment tab.'
        );
      }

      if (data && Array.isArray(data.sections) && data.sections.length > 0) {
        loadedSections = data.sections;
      } else if (Array.isArray(data) && data.length > 0) {
        loadedSections = data;
      } else {
        throw new Error('No questions are available for this assessment attempt.');
      }

      // Merge pre-saved answers if any
      loadedSections.forEach((sec) => {
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach((q) => {
            if (q.userAnswer) {
              initialAnswers[q.id] = {
                likertValue: q.userAnswer.likertValue ?? q.userAnswer.value ?? null,
                selectedOptionId: q.userAnswer.selectedOptionId ?? q.userAnswer.optionId ?? null,
                optionKey: q.userAnswer.optionKey ?? q.userAnswer.key ?? null,
              };
            } else if (q.answer !== undefined && q.answer !== null) {
              if (typeof q.answer === 'number') {
                initialAnswers[q.id] = { likertValue: q.answer };
              } else if (typeof q.answer === 'string') {
                initialAnswers[q.id] = { selectedOptionId: q.answer, optionKey: q.answer };
              }
            }
          });
        }
      });

      setSections(loadedSections);
      setAnswers(initialAnswers);
    } catch (err) {
      if (loadRequestRef.current !== requestId) return;
      console.warn('Could not fetch remote questions:', err?.message);
      const data = err.response?.data;
      if (
        data?.requiresNewPlan ||
        err.response?.status === 403 ||
        data?.reason === 'ALREADY_COMPLETED' ||
        data?.reason === 'NO_ACTIVE_PLAN'
      ) {
        setAccessBlockedInfo({
          visible: true,
          reason: data?.reason || '',
          message:
            data?.message ||
            'You have already completed your assessment under your current plan or need a subscription.',
        });
        return;
      }
      // Same as the user portal: show the real error with Retry / Back instead of a local copy of the test.
      setSections([]);
      setLoadError(getErrorMessage(err, 'Could not load the assessment questions.'));
    } finally {
      // Keep the loading view while redirecting to the report so the old questions never flash.
      if (loadRequestRef.current === requestId && !redirecting) setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    needsReloadRef.current = false;
    loadTestQuestions();
  }, [loadTestQuestions]);

  useFocusEffect(
    useCallback(() => {
      if (needsReloadRef.current) {
        needsReloadRef.current = false;
        loadTestQuestions();
      }
    }, [loadTestQuestions])
  );

  // Active section
  const activeSection = useMemo(() => {
    if (!sections || sections.length === 0) return null;
    return sections[currentSectionIndex] || sections[0];
  }, [sections, currentSectionIndex]);

  const activeDomainMeta = useMemo(() => {
    return getDomainMeta(activeSection, currentSectionIndex);
  }, [activeSection, currentSectionIndex]);

  const isAptitudeActive = Boolean(activeSection) && isAptitudeSection(activeSection, currentSectionIndex);

  // The aptitude countdown starts the first time the aptitude section is opened (not when the
  // test loads) and only ticks while this screen is focused and the aptitude section is shown.
  useEffect(() => {
    if (loading || !attemptId || !isFocused || !isAptitudeActive) return;

    let startedAt = getTimerStartedAt(aptitudeTimerKey);
    if (!startedAt) {
      startedAt = Date.now();
      setTimerStartedAt(aptitudeTimerKey, startedAt);
    }
    setAptitudeStarted(true);

    const updateTime = () => {
      const remaining = Math.max(0, APTITUDE_TIME_LIMIT_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setAptitudeTimeLeft(remaining);
      // Same as the user portal: the 30-minute aptitude timer is temporarily NOT enforced, so a
      // user can keep answering after it reaches 0 (no lock-out, no "time expired" popup).
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [aptitudeTimerKey, loading, attemptId, isFocused, isAptitudeActive]);

  // Overall statistics
  const totalQuestionsCount = useMemo(() => {
    if (!sections || sections.length === 0) return TOTAL_ASSESSMENT_QUESTIONS;
    return (
      sections.reduce(
        (sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : 0),
        0
      ) || TOTAL_ASSESSMENT_QUESTIONS
    );
  }, [sections]);

  const totalAnsweredCount = useMemo(() => {
    return Object.values(answers).filter(
      (a) =>
        (a && a.likertValue !== undefined && a.likertValue !== null) ||
        (a && a.selectedOptionId !== undefined && a.selectedOptionId !== null) ||
        (a && a.optionKey !== undefined && a.optionKey !== null)
    ).length;
  }, [answers]);

  const overallPercent = Math.min(
    100,
    Math.round((totalAnsweredCount / totalQuestionsCount) * 100)
  );

  // Section-wise statistics
  const sectionStats = useMemo(() => {
    return sections.map((sec, idx) => {
      const qList = Array.isArray(sec.questions) ? sec.questions : [];
      const totalInSec = qList.length;
      const answeredInSec = qList.filter(
        (q) =>
          (answers[q.id]?.likertValue !== undefined && answers[q.id]?.likertValue !== null) ||
          (answers[q.id]?.selectedOptionId !== undefined && answers[q.id]?.selectedOptionId !== null) ||
          (answers[q.id]?.optionKey !== undefined && answers[q.id]?.optionKey !== null)
      ).length;
      const isComplete = totalInSec > 0 && answeredInSec === totalInSec;
      return {
        index: idx,
        title: sec.title || ASSESSMENT_DOMAINS[idx]?.title || `Section ${idx + 1}`,
        total: totalInSec,
        answered: answeredInSec,
        isComplete,
      };
    });
  }, [sections, answers]);

  // Queue a save task behind any save already in flight.
  function runSaveTask(task) {
    const run = saveChainRef.current.then(task, task);
    saveChainRef.current = run.catch(() => {});
    return run;
  }

  // Save every queued answer (not just the last tapped one). Entries that fail stay queued and
  // are retried on the next answer, section switch, app foreground or the "tap to retry" button.
  function flushPendingSaves() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const targetAttemptId = attemptId;
    return runSaveTask(async () => {
      const entries = Object.values(pendingSavesRef.current);
      if (entries.length === 0) return true;
      pendingSavesRef.current = {};
      setSaveStatus('saving');
      try {
        if (entries.length === 1) {
          await saveAttemptAnswer(targetAttemptId, entries[0]);
        } else {
          await saveBatchAttemptAnswers(
            targetAttemptId,
            entries.map((entry) => toSavePayload(entry.questionId, entry))
          );
        }
        if (Object.keys(pendingSavesRef.current).length === 0) setSaveStatus('saved');
        return true;
      } catch (e) {
        console.warn('Auto-save failed:', e?.message);
        // Re-queue (newer answers for the same question win)
        entries.forEach((entry) => {
          if (!pendingSavesRef.current[entry.questionId]) pendingSavesRef.current[entry.questionId] = entry;
        });
        setSaveStatus('error');
        return false;
      }
    });
  }

  // Full re-sync of every answer (used on section switch and exit).
  function syncAllAnswers(answerMap) {
    const batchList = buildBatchList(answerMap);
    if (batchList.length === 0) return Promise.resolve(true);
    const included = { ...pendingSavesRef.current };
    const targetAttemptId = attemptId;
    return runSaveTask(async () => {
      try {
        await saveBatchAttemptAnswers(targetAttemptId, batchList);
        Object.keys(included).forEach((key) => {
          if (pendingSavesRef.current[key] === included[key]) delete pendingSavesRef.current[key];
        });
        if (Object.keys(pendingSavesRef.current).length === 0) setSaveStatus('saved');
        return true;
      } catch (err) {
        console.warn('Batch save sync:', err?.message);
        setSaveStatus('error');
        return false;
      }
    });
  }

  const flushRef = useRef(flushPendingSaves);
  flushRef.current = flushPendingSaves;

  // Flush unsent answers when the app goes to the background, retry them when it comes back,
  // and flush once more if the screen unmounts.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (Object.keys(pendingSavesRef.current).length === 0) return;
      if (nextState === 'background' || nextState === 'inactive' || nextState === 'active') {
        flushRef.current?.();
      }
    });
    return () => {
      subscription.remove();
      if (Object.keys(pendingSavesRef.current).length > 0) flushRef.current?.();
    };
  }, []);

  // Answer selection with debounced auto-save
  function handleSelectAnswer(questionId, { likertValue, selectedOptionId, optionKey }) {
    if (submittingRef.current) return;
    if (isAptitudeSection(activeSection, currentSectionIndex) && aptitudeExpired) return;

    setSaveStatus('saving');

    const nextAnswer = {
      ...(likertValue !== undefined ? { likertValue } : {}),
      ...(selectedOptionId !== undefined ? { selectedOptionId } : {}),
      ...(optionKey !== undefined ? { optionKey } : {}),
    };
    setAnswers((prev) => ({ ...prev, [questionId]: nextAnswer }));

    pendingSavesRef.current[questionId] = {
      questionId,
      likertValue,
      selectedOptionId,
      optionKey,
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      flushPendingSaves();
    }, 350);
  }

  // Section switch with background batch-save
  function handleSwitchSection(newIndex) {
    if (newIndex < 0 || newIndex >= sections.length) return;

    syncAllAnswers(answers);

    setCurrentSectionIndex(newIndex);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  // Unanswered questions
  const unansweredQuestions = useMemo(() => {
    const list = [];
    sections.forEach((sec, sIdx) => {
      // Aptitude questions are optional (skipped ones score 0); every other module is required.
      if (isAptitudeSection(sec, sIdx)) return;
      const qList = Array.isArray(sec.questions) ? sec.questions : [];
      qList.forEach((q, qIdx) => {
        const isAnswered =
          (answers[q.id]?.likertValue !== undefined && answers[q.id]?.likertValue !== null) ||
          (answers[q.id]?.selectedOptionId !== undefined && answers[q.id]?.selectedOptionId !== null) ||
          (answers[q.id]?.optionKey !== undefined && answers[q.id]?.optionKey !== null);
        if (!isAnswered) {
          list.push({
            sectionIndex: sIdx,
            sectionTitle: sec.title || ASSESSMENT_DOMAINS[sIdx]?.title || `Section ${sIdx + 1}`,
            questionNumber: qIdx + 1,
            questionId: q.id,
            questionText: q.text || q.question || '',
          });
        }
      });
    });
    return list;
  }, [sections, answers]);

  // Optional aptitude questions left blank (they score 0), shown on the submit sheet.
  const skippedAptitude = useMemo(() => {
    let count = 0;
    let firstSectionIndex = -1;
    sections.forEach((sec, sIdx) => {
      if (!isAptitudeSection(sec, sIdx)) return;
      const qList = Array.isArray(sec.questions) ? sec.questions : [];
      qList.forEach((q) => {
        if (!hasAnswerValue(answers[q.id])) {
          count += 1;
          if (firstSectionIndex === -1) firstSectionIndex = sIdx;
        }
      });
    });
    return { count, firstSectionIndex };
  }, [sections, answers]);

  // Final submission: only a confirmed save + successful submit opens the report.
  async function handleSubmitTest() {
    if (submittingRef.current) return;
    if (unansweredQuestions.length > 0) return;
    submittingRef.current = true;
    setIsSubmitModalVisible(false);
    setSubmitting(true);

    try {
      setSubmitStepText('Saving all responses...');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Let any autosave already in flight finish first.
      await saveChainRef.current;

      const batchList = buildBatchList(answers);
      if (batchList.length > 0) {
        const saveResult = await saveBatchAttemptAnswers(attemptId, batchList);
        const savedCount = Number(saveResult?.savedCount);
        if (Number.isFinite(savedCount) && savedCount < batchList.length) {
          throw new Error(
            `Only ${savedCount} of ${batchList.length} answers could be saved. Please check your connection and try again.`
          );
        }
      }
      pendingSavesRef.current = {};
      setSaveStatus('saved');

      setSubmitStepText('Evaluating Personal Profiling & Career Planning Track...');
      await new Promise((r) => setTimeout(r, 500));

      setSubmitStepText('Evaluating RIASEC, OCEAN, VARK & Cognitive Reasoning...');
      await new Promise((r) => setTimeout(r, 500));

      setSubmitStepText('Calculating Career Clusters & Readiness Score...');
      const result = await submitAssessmentAttempt(attemptId);
      if (!result) {
        throw new Error('The server did not return your assessment result. Please try again.');
      }

      setSubmitStepText('Generating your Career Compass Report...');
      await new Promise((r) => setTimeout(r, 500));

      needsReloadRef.current = true;
      router.replace({
        pathname: '/(drawer)/assessment-report',
        params: { attemptId: String(attemptId) },
      });
    } catch (err) {
      console.warn('Submit test failed:', err?.message);
      // Stay on the test with all answers kept; only a successful submit navigates to the report.
      Alert.alert(
        'Could not submit your assessment',
        getErrorMessage(err, 'Could not submit your assessment. Please try again.'),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSubmitRef.current?.() },
        ]
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  const handleSubmitRef = useRef(handleSubmitTest);
  handleSubmitRef.current = handleSubmitTest;

  function leaveAssessment() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drawer)/(tabs)/assessment');
    }
  }

  // Attempts cannot be resumed, so confirm before leaving once anything has been answered.
  function handleExit() {
    if (submittingRef.current) return;
    if (loading || loadError || accessBlockedInfo.visible || totalAnsweredCount === 0) {
      leaveAssessment();
      return;
    }
    Alert.alert(
      'Exit assessment?',
      'Your progress in this attempt cannot be resumed. If you exit now you will have to start a new attempt from question 1. Exit anyway?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            // Best-effort final save; the attempt cannot be resumed so do not block leaving on it.
            syncAllAnswers(answers);
            leaveAssessment();
          },
        },
      ]
    );
  }
  const handleExitRef = useRef(handleExit);
  handleExitRef.current = handleExit;

  // Android hardware back / back gesture goes through the same confirmation as the Exit button.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleExitRef.current?.();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  const cardBg = darkMode ? '#121214' : '#ffffff';
  const borderColor = darkMode ? '#222226' : '#e8dfda';
  const textColor = darkMode ? '#ffffff' : '#211b19';
  const subtextColor = darkMode ? '#a09895' : '#655753';

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#070709' : '#faf6f3', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9a2119" />
        <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 14 }}>
          Loading Assessment Engine...
        </Text>
        <Text style={{ color: subtextColor, fontSize: 12, marginTop: 4 }}>
          Preparing questions and pre-saved responses
        </Text>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#070709' : '#faf6f3', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 380,
            borderWidth: 1,
            borderColor,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: '#fef3c7',
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="warning-outline" size={24} color="#b45309" />
            </View>
            <Text style={{ color: textColor, fontSize: 18, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', flex: 1 }}>
              Could not load the assessment
            </Text>
          </View>

          <Text style={{ color: textColor, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
            {loadError}
          </Text>

          <View style={{ marginTop: 22, gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={loadTestQuestions}
              style={{ backgroundColor: '#8C1814', borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                Retry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/(drawer)/(tabs)/assessment')}
              style={{
                backgroundColor: darkMode ? '#1c1c20' : '#f1f5f9',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: subtextColor, fontSize: 13, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                Back to Assessment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (accessBlockedInfo.visible) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#070709' : '#faf6f3', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 380,
            borderWidth: 1,
            borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: '#fee2e2',
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="lock-closed" size={24} color="#8C1814" />
            </View>
            <Text style={{ color: textColor, fontSize: 18, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', flex: 1 }}>
              Assessment Plan Required
            </Text>
          </View>

          <Text style={{ color: textColor, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
            {accessBlockedInfo.message ||
              'You have already completed your assessment under your current plan or need a subscription.'}
          </Text>

          <Text style={{ color: subtextColor, fontSize: 11, lineHeight: 16, marginTop: 10, fontFamily: 'Poppins_500Medium', fontWeight: '500' }}>
            Each subscription plan unlocks a fresh comprehensive evaluation and an updated Career Compass Report.
          </Text>

          <View style={{ marginTop: 22, gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (accessBlockedInfo.reason === 'ALREADY_COMPLETED') {
                  router.replace({
                    pathname: '/(drawer)/assessment-report',
                    params: { attemptId: String(attemptId) },
                  });
                } else {
                  router.replace({
                    pathname: '/(drawer)/subscription',
                    params: { returnTo: '/(drawer)/(tabs)/assessment' },
                  });
                }
              }}
              style={{
                backgroundColor: '#8C1814',
                borderRadius: 14,
                paddingVertical: 13,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                {accessBlockedInfo.reason === 'ALREADY_COMPLETED' ? 'View Report' : 'View Plans'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/(drawer)/(tabs)/assessment')}
              style={{
                backgroundColor: darkMode ? '#1c1c20' : '#f1f5f9',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: subtextColor, fontSize: 13, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                Back to Assessment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (submitting) {
    return (
      <LinearGradient
        colors={['#801812', '#9a2119', '#6c160f']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            width: '100%',
            maxWidth: 340,
          }}
        >
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={{ color: '#ffffff', fontSize: 20, fontFamily: 'Poppins_900Black', fontWeight: '900', marginTop: 16 }}>
            Scoring Assessment
          </Text>
          <Text style={{ color: '#ffe4e6', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {submitStepText}
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 10,
              marginTop: 20,
              width: '100%',
            }}
          >
            <Text style={{ color: '#fecdd3', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
              Evaluating Career Planning Track (CRI), Holland RIASEC, Big Five Traits, VARK Modalities, and Cognitive Aptitudes...
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  const isLastSection = currentSectionIndex === sections.length - 1;
  const currentSectionQuestions = activeSection?.questions || [];
  const aptitudeTimerLabel = `${String(Math.floor(aptitudeTimeLeft / 60)).padStart(2, '0')}:${String(aptitudeTimeLeft % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#070709' : '#faf6f3', fontFamily: 'Poppins_400Regular' }}>
      {/* Top Header */}
      <View
        style={{
          backgroundColor: cardBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleExit}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: darkMode ? '#1c1c20' : '#f1f5f9',
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 10,
              gap: 4,
            }}
          >
            <Ionicons name="arrow-back" size={15} color={textColor} />
            <Text style={{ color: textColor, fontSize: 12, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>Exit</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Aptitude 30-Minute Countdown Timer Pill */}
            {isAptitudeActive && aptitudeStarted && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#fee2e2' : '#ecfeff',
                  borderWidth: 1,
                  borderColor: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#fca5a5' : '#a5f3fc',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={aptitudeExpired || aptitudeTimeLeft <= 300 ? '#b91c1c' : '#0891b2'}
                />
                <Text
                  style={{
                    color: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#b91c1c' : '#0891b2',
                    fontSize: 11,
                    fontFamily: 'Poppins_800ExtraBold',
                    fontWeight: '800',
                  }}
                >
                  {aptitudeExpired ? 'Time expired' : aptitudeTimerLabel}
                </Text>
              </View>
            )}

            {/* Auto-save Status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {saveStatus === 'saving' ? (
                <>
                  <ActivityIndicator size="small" color="#f59e0b" />
                  <Text style={{ color: '#f59e0b', fontSize: 10, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>Saving...</Text>
                </>
              ) : saveStatus === 'error' ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  onPress={() => flushPendingSaves()}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="alert-circle" size={13} color="#dc2626" />
                  <Text style={{ color: '#dc2626', fontSize: 10, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                    Not saved - tap to retry
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                  <Text style={{ color: '#10b981', fontSize: 10, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>Saved</Text>
                </>
              )}
            </View>

            {/* Total count badge */}
            <View
              style={{
                backgroundColor: darkMode ? '#222226' : '#f8fafc',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ color: textColor, fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                {totalAnsweredCount}/{totalQuestionsCount} ({overallPercent}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Section Switcher Pills: includes 🎯 PROFILING 0/16 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 10, paddingBottom: 6 }}
        >
          {sections.map((sec, idx) => {
            const stat = sectionStats[idx] || { answered: 0, total: 0, isComplete: false };
            const isCurrent = idx === currentSectionIndex;
            const domainMeta = getDomainMeta(sec, idx);

            return (
              <TouchableOpacity
                key={sec.id || idx}
                activeOpacity={0.8}
                onPress={() => handleSwitchSection(idx)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isCurrent
                    ? '#9a2119'
                    : stat.isComplete
                    ? (darkMode ? '#064e3b' : '#ecfdf5')
                    : (darkMode ? '#1a1a1e' : '#f1f5f9'),
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 12 }}>{domainMeta?.icon || '📝'}</Text>
                <Text
                  style={{
                    color: isCurrent
                      ? '#ffffff'
                      : stat.isComplete
                      ? (darkMode ? '#a7f3d0' : '#047857')
                      : subtextColor,
                    fontSize: 11,
                    fontFamily: 'Poppins_800ExtraBold',
                    fontWeight: '800',
                  }}
                >
                  {domainMeta?.shortCode || `Sec ${idx + 1}`}
                </Text>
                <View
                  style={{
                    backgroundColor: isCurrent
                      ? 'rgba(255,255,255,0.25)'
                      : stat.isComplete
                      ? (darkMode ? 'rgba(52,211,153,0.25)' : '#a7f3d0')
                      : (darkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: isCurrent ? '#ffffff' : stat.isComplete ? '#047857' : subtextColor,
                      fontSize: 9,
                      fontFamily: 'Poppins_800ExtraBold',
                      fontWeight: '800',
                    }}
                  >
                    {stat.answered}/{stat.total}
                  </Text>
                </View>

                {/* Aptitude timer badge */}
                {isAptitudeSection(sec, idx) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isCurrent
                        ? 'rgba(255,255,255,0.3)'
                        : (darkMode ? '#083344' : '#cffafe'),
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 6,
                      gap: 2,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={9}
                      color={isCurrent ? '#ffffff' : (darkMode ? '#67e8f9' : '#0891b2')}
                    />
                    <Text
                      style={{
                        color: isCurrent ? '#ffffff' : (darkMode ? '#67e8f9' : '#0891b2'),
                        fontSize: 8.5,
                        fontFamily: 'Poppins_800ExtraBold',
                        fontWeight: '800',
                      }}
                    >
                    {isCurrent ? '' : '30m'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Linear Progress Bar */}
        <View
          style={{
            height: 4,
            backgroundColor: darkMode ? '#222226' : '#e2e8f0',
            borderRadius: 2,
            marginTop: 4,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${overallPercent}%`,
              backgroundColor: '#9a2119',
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      {/* Questions ScrollView */}
      <ScrollView
        style={{ flex: 1, fontFamily: 'Poppins_400Regular' }}
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
      >
        {/* Section Banner Card */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
              <Text style={{ fontSize: 28, marginTop: 2 }}>{activeDomainMeta.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#9a2119', fontSize: 10, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {activeDomainMeta.subtitle}
                </Text>
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Poppins_900Black', fontWeight: '900' }}>
                  {activeSection?.title || activeDomainMeta.title}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#fee2e2',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                alignSelf: 'flex-start',
                flexShrink: 0,
              }}
            >
              <Text style={{ color: '#9a2119', fontSize: 10, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                {currentSectionQuestions.length} Questions
              </Text>
            </View>
          </View>

          <Text style={{ color: subtextColor, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
            {activeSection?.description || activeDomainMeta.description}
          </Text>
        </View>

        {/* Dedicated Aptitude 30-Minute Countdown Banner */}
        {isAptitudeActive && aptitudeStarted && (
          <View
            style={{
              backgroundColor: aptitudeExpired || aptitudeTimeLeft <= 300
                ? (darkMode ? '#3b1212' : '#fef2f2')
                : (darkMode ? '#082f38' : '#ecfeff'),
              borderRadius: 16,
              padding: 14,
              borderWidth: 1.5,
              borderColor: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#fca5a5' : '#67e8f9',
              marginBottom: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#fee2e2' : '#cffafe',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={aptitudeExpired ? 'alert-circle' : 'stopwatch-outline'}
                  size={22}
                  color={aptitudeExpired || aptitudeTimeLeft <= 300 ? '#b91c1c' : '#0891b2'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#b91c1c' : '#0e7490',
                    fontSize: 12.5,
                    fontFamily: 'Poppins_800ExtraBold',
                    fontWeight: '800',
                  }}
                >
                  {aptitudeExpired
                    ? 'Aptitude Time Expired'
                    : aptitudeTimeLeft === 0
                    ? 'Suggested Time Is Up'
                    : aptitudeTimeLeft <= 300
                    ? 'Less Than 5 Minutes Suggested Time Left'
                    : '30-Minute Timed Section'}
                </Text>
                <Text
                  style={{
                    color: subtextColor,
                    fontSize: 10.5,
                    fontFamily: 'Poppins_500Medium',
                    lineHeight: 15,
                    marginTop: 2,
                  }}
                >
                  {aptitudeExpired
                    ? 'The 30-minute time limit for this section has ended. Responses are locked and auto-saved.'
                    : 'Aim to finish this section in about 30 minutes. The timer started when you opened this section and is a guide only - you can keep answering after it reaches zero.'}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: aptitudeExpired || aptitudeTimeLeft <= 300 ? '#b91c1c' : '#0891b2',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                alignItems: 'center',
                minWidth: 70,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 14,
                  fontFamily: 'Poppins_900Black',
                  fontWeight: '900',
                  letterSpacing: 0.5,
                }}
              >
                {aptitudeExpired ? '00:00' : aptitudeTimerLabel}
              </Text>
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 8.5,
                  fontFamily: 'Poppins_700Bold',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  opacity: 0.9,
                }}
              >
                {aptitudeExpired ? 'Expired' : 'Remaining'}
              </Text>
            </View>
          </View>
        )}

        {/* Questions */}
        <View style={{ gap: 14 }}>
          {currentSectionQuestions.map((question, qIdx) => {
            const questionNumber = qIdx + 1;
            const currentAnswer = answers[question.id] || {};

            // Decide by section only: facet codes are shared across domains (e.g. Work Values
            // "CO" = Conservation vs profiling "CO" = Confidence), so they must not be used here.
            const isProfilingQuestion =
              activeSection?.code === 'profiling' ||
              activeSection?.id === 'profiling' ||
              activeSection?.key === 'profiling' ||
              activeDomainMeta?.id === 'profiling';

            // Section 1 Question 16 is single choice SP
            const isSP =
              isProfilingQuestion &&
              (question.code === 'SP' ||
                question.facet === 'SP' ||
                questionNumber === 16 ||
                question.type === 'single_choice');

            const isSingleChoice =
              isSP ||
              question.type === 'single_choice' ||
              question.type === 'mcq' ||
              (Array.isArray(question.options) &&
                question.options.length > 0 &&
                question.type !== 'likert' &&
                question.type !== 'likert5');

            // ONLY Section 1 Likert items use "Not true at all" -> "Very true"
            // Sections 2 to 6 (RIASEC, OCEAN, VARK, Values, Goals) use "Strongly Disagree" -> "Strongly Agree"
            const isProfilingLikert = !isSingleChoice && isProfilingQuestion;
            const currentLikertOptions = isProfilingLikert ? PROFILING_LIKERT_OPTIONS : LIKERT_OPTIONS;

            const questionOptions =
              Array.isArray(question.options) && question.options.length > 0
                ? question.options
                : isSP
                ? PROFILING_SP_OPTIONS
                : [];

            const isAnswered =
              (currentAnswer.likertValue !== undefined && currentAnswer.likertValue !== null) ||
              (currentAnswer.selectedOptionId !== undefined && currentAnswer.selectedOptionId !== null) ||
              (currentAnswer.optionKey !== undefined && currentAnswer.optionKey !== null);

            return (
              <View
                key={question.id || qIdx}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isAnswered ? '#10b981' : borderColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: darkMode ? 0 : 0.03,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                {/* Question Text */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      backgroundColor: isAnswered ? '#10b981' : (darkMode ? '#222226' : '#f1f5f9'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: isAnswered ? '#ffffff' : subtextColor,
                        fontSize: 11,
                        fontFamily: 'Poppins_800ExtraBold',
                        fontWeight: '800',
                      }}
                    >
                      {questionNumber}
                    </Text>
                  </View>

                  <Text
                    style={{
                      flex: 1,
                      color: textColor,
                      fontSize: 14,
                      fontFamily: 'Poppins_700Bold',
                      fontWeight: '700',
                      lineHeight: 20,
                    }}
                  >
                    {question.text || question.question || question.statement || question.title}
                  </Text>
                </View>

                {/* Question Diagram / Image if present (Aptitude MCQs) */}
                {(question.imageUrl || question.image || question.diagram) && (
                  <View
                    style={{
                      marginTop: 12,
                      alignItems: 'center',
                      backgroundColor: darkMode ? '#18181c' : '#f8fafc',
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor,
                    }}
                  >
                    <Image
                      source={{ uri: question.imageUrl || question.image || question.diagram }}
                      style={{ width: '100%', height: 180, resizeMode: 'contain' }}
                    />
                  </View>
                )}

                {/* Option Selector */}
                <View style={{ marginTop: 14 }}>
                  {!isSingleChoice ? (
                    // 5-point Likert Scale
                    <View style={{ gap: 8 }}>
                      {currentLikertOptions.map((opt) => {
                        const isSelected = currentAnswer.likertValue === opt.value;

                        return (
                          <TouchableOpacity
                            key={opt.value}
                            activeOpacity={0.8}
                            disabled={isAptitudeActive && aptitudeExpired}
                            onPress={() =>
                              handleSelectAnswer(question.id, { likertValue: opt.value })
                            }
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: isSelected
                                ? (darkMode ? `${opt.color}25` : `${opt.color}15`)
                                : (darkMode ? '#18181c' : '#f8fafc'),
                              borderRadius: 12,
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderWidth: 1,
                              borderColor: isSelected ? opt.color : borderColor,
                              gap: 10,
                              opacity: isAptitudeActive && aptitudeExpired ? 0.6 : 1,
                            }}
                          >
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: isSelected ? opt.color : (darkMode ? '#2a2a30' : '#e2e8f0'),
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isSelected ? (
                                <Ionicons name="checkmark" size={13} color="#ffffff" />
                              ) : (
                                <Text style={{ color: subtextColor, fontSize: 10, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                                  {opt.value}
                                </Text>
                              )}
                            </View>

                            <Text
                              style={{
                                color: isSelected ? (darkMode ? '#ffffff' : opt.color) : textColor,
                                fontSize: 13,
                                fontFamily: isSelected ? 'Poppins_800ExtraBold' : 'Poppins_600SemiBold',
                                fontWeight: isSelected ? '800' : '600',
                              }}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : isSP ? (
                    // Section 1 Question 16 (SP) Single Choice - Vertical Cards
                    <View style={{ gap: 8 }}>
                      {questionOptions.map((opt, optIndex) => {
                        const optionLetter =
                          opt.optionKey || opt.key || String.fromCharCode(65 + optIndex);
                        const isSelected =
                          currentAnswer.selectedOptionId === opt.id ||
                          currentAnswer.selectedOptionId === opt.key ||
                          currentAnswer.selectedOptionId === optionLetter ||
                          currentAnswer.optionKey === optionLetter;

                        return (
                          <TouchableOpacity
                            key={opt.id || opt.key || optIndex}
                            activeOpacity={0.8}
                            disabled={isAptitudeActive && aptitudeExpired}
                            onPress={() =>
                              handleSelectAnswer(question.id, {
                                selectedOptionId: opt.id || optionLetter,
                                optionKey: optionLetter,
                              })
                            }
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: isSelected
                                ? (darkMode ? '#0f766e25' : '#f0fdfa')
                                : (darkMode ? '#18181c' : '#f8fafc'),
                              borderRadius: 12,
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#0d9488' : borderColor,
                              gap: 10,
                              opacity: isAptitudeActive && aptitudeExpired ? 0.6 : 1,
                            }}
                          >
                            <View
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 8,
                                backgroundColor: isSelected ? '#0d9488' : (darkMode ? '#2a2a30' : '#e2e8f0'),
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: isSelected ? '#ffffff' : subtextColor,
                                  fontSize: 12,
                                  fontFamily: 'Poppins_800ExtraBold',
                                  fontWeight: '800',
                                }}
                              >
                                {optionLetter}
                              </Text>
                            </View>

                            <Text
                              style={{
                                flex: 1,
                                color: isSelected ? '#0f766e' : textColor,
                                fontSize: 13,
                                fontFamily: isSelected ? 'Poppins_800ExtraBold' : 'Poppins_600SemiBold',
                                fontWeight: isSelected ? '800' : '600',
                                lineHeight: 18,
                              }}
                            >
                              {opt.text || opt.optionText || opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    // MCQ Options (Aptitude & general MCQs)
                    <View style={{ gap: 8 }}>
                      {questionOptions.map((opt, optIndex) => {
                        const optionLetter = String.fromCharCode(65 + optIndex);
                        const isSelected =
                          currentAnswer.selectedOptionId === opt.id ||
                          currentAnswer.selectedOptionId === opt.key ||
                          currentAnswer.optionKey === optionLetter;
                        const optionImage =
                          opt.image ||
                          (typeof opt.optionText === 'string' &&
                          /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(opt.optionText)
                            ? opt.optionText
                            : null);

                        return (
                          <TouchableOpacity
                            key={opt.id || optIndex}
                            activeOpacity={0.8}
                            disabled={isAptitudeActive && aptitudeExpired}
                            onPress={() =>
                              handleSelectAnswer(question.id, {
                                selectedOptionId: opt.id || optionLetter,
                                optionKey: optionLetter,
                              })
                            }
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: isSelected
                                ? (darkMode ? '#0891b225' : '#ecfeff')
                                : (darkMode ? '#18181c' : '#f8fafc'),
                              borderRadius: 12,
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderWidth: 1,
                              borderColor: isSelected ? '#0891b2' : borderColor,
                              gap: 10,
                              opacity: isAptitudeActive && aptitudeExpired ? 0.6 : 1,
                            }}
                          >
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 8,
                                backgroundColor: isSelected ? '#0891b2' : (darkMode ? '#2a2a30' : '#e2e8f0'),
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: isSelected ? '#ffffff' : subtextColor,
                                  fontSize: 11,
                                  fontFamily: 'Poppins_800ExtraBold',
                                  fontWeight: '800',
                                }}
                              >
                                {optionLetter}
                              </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              {optionImage ? (
                                <Image
                                  source={{ uri: optionImage }}
                                  style={{ width: '100%', height: 70, resizeMode: 'contain' }}
                                />
                              ) : (
                                <Text
                                  style={{
                                    color: isSelected ? '#0e7490' : textColor,
                                    fontSize: 13,
                                    fontWeight: isSelected ? '800' : '600',
                                    lineHeight: 18,
                                  }}
                                >
                                  {opt.text || opt.optionText || opt.label}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Bottom Navigation Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: cardBg,
          borderTopWidth: 1,
          borderTopColor: borderColor,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: darkMode ? 0 : 0.06,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={currentSectionIndex === 0}
          onPress={() => handleSwitchSection(currentSectionIndex - 1)}
          style={{
            backgroundColor: currentSectionIndex === 0 ? (darkMode ? '#1c1c20' : '#f1f5f9') : (darkMode ? '#2a2a30' : '#e2e8f0'),
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 12,
            opacity: currentSectionIndex === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ color: textColor, fontSize: 12, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
            ← Prev
          </Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: subtextColor, fontSize: 11, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' }}>
            {sectionStats[currentSectionIndex]?.answered} of {sectionStats[currentSectionIndex]?.total} answered
          </Text>
        </View>

        {isLastSection ? (
          <TouchableOpacity
            disabled={unansweredQuestions.length > 0}
            activeOpacity={0.85}
            onPress={() => setIsSubmitModalVisible(true)}
            style={{
              backgroundColor: unansweredQuestions.length > 0 ? '#9ca3af' : '#10b981',
              opacity: unansweredQuestions.length > 0 ? 0.65 : 1,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
              Submit 🎉
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleSwitchSection(currentSectionIndex + 1)}
            style={{
              backgroundColor: '#9a2119',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
              Next Section →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Aptitude Time Expired Modal */}
      <Modal visible={showAptitudeExpiredModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 22, maxWidth: 360, width: '100%', borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ backgroundColor: '#fee2e2', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="time" size={22} color="#dc2626" />
              </View>
              <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', flex: 1 }}>
                Aptitude Time Expired
              </Text>
            </View>
            <Text style={{ color: subtextColor, fontSize: 13, lineHeight: 19 }}>
              The 30-minute time limit for the Aptitude & Cognitive Reasoning section has ended. Your answered questions have been saved automatically.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowAptitudeExpiredModal(false)}
              style={{
                backgroundColor: '#9a2119',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                marginTop: 18,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                Understood
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pre-submission Verification Modal */}
      <Modal visible={isSubmitModalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '80%',
              borderWidth: 1,
              borderColor,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: textColor, fontSize: 17, fontFamily: 'Poppins_900Black', fontWeight: '900' }}>
                {unansweredQuestions.length > 0
                  ? '⚠️ Unanswered Questions Detected'
                  : '🎉 Ready for Submission'}
              </Text>
              <TouchableOpacity onPress={() => setIsSubmitModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={subtextColor} />
              </TouchableOpacity>
            </View>

            {unansweredQuestions.length > 0 ? (
              <View>
                <Text style={{ color: subtextColor, fontSize: 13, lineHeight: 18 }}>
                  You have{' '}
                  <Text style={{ color: '#f59e0b', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                    {unansweredQuestions.length} unanswered questions
                  </Text>{' '}
                  out of {totalQuestionsCount}. Answering all questions ensures highest accuracy.
                </Text>

                <ScrollView style={{ maxHeight: 220, marginVertical: 12 }}>
                  <View style={{ gap: 6 }}>
                    {unansweredQuestions.slice(0, 20).map((u, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: darkMode ? '#18181c' : '#f8fafc',
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor,
                        }}
                      >
                        <Text style={{ color: textColor, fontSize: 12, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', flex: 1 }}>
                          {u.sectionTitle} — Q{u.questionNumber}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setIsSubmitModalVisible(false);
                            handleSwitchSection(u.sectionIndex);
                          }}
                          style={{ paddingLeft: 10 }}
                        >
                          <Text style={{ color: '#9a2119', fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                            Jump →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {unansweredQuestions.length > 20 && (
                      <Text style={{ color: subtextColor, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                        ...and {unansweredQuestions.length - 20} more unanswered.
                      </Text>
                    )}
                  </View>
                </ScrollView>

                <View style={{ gap: 8, marginTop: 6 }}>
                 <TouchableOpacity
  disabled={unansweredQuestions.length > 0 || submitting}
  onPress={handleSubmitTest}
  activeOpacity={0.85}
  style={{
    backgroundColor: unansweredQuestions.length > 0 ? '#9ca3af' : '#9a2119',
    opacity: unansweredQuestions.length > 0 ? 0.65 : 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  }}
>
                  <Text
  style={{
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  }}
>
  Submit
</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsSubmitModalVisible(false)}
                    style={{
                      backgroundColor: darkMode ? '#1c1c20' : '#f1f5f9',
                      borderRadius: 14,
                      paddingVertical: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: textColor, fontSize: 12, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                      Review
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 36 }}>🌟</Text>
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 8, textAlign: 'center' }}>
                  {skippedAptitude.count > 0
                    ? `${totalAnsweredCount} of ${totalQuestionsCount} Questions Answered`
                    : `All ${totalQuestionsCount} Questions Answered!`}
                </Text>
                {skippedAptitude.count > 0 ? (
                  <View
                    style={{
                      backgroundColor: darkMode ? '#3b2a0a' : '#fffbeb',
                      borderWidth: 1,
                      borderColor: '#fcd34d',
                      borderRadius: 12,
                      padding: 10,
                      marginTop: 10,
                      width: '100%',
                    }}
                  >
                    <Text style={{ color: darkMode ? '#fde68a' : '#92400e', fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
                      {skippedAptitude.count} aptitude {skippedAptitude.count === 1 ? 'question is' : 'questions are'} unanswered. Skipped aptitude questions score 0.
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setIsSubmitModalVisible(false);
                        handleSwitchSection(skippedAptitude.firstSectionIndex);
                      }}
                      style={{ alignSelf: 'center', marginTop: 6, paddingVertical: 4, paddingHorizontal: 10 }}
                    >
                      <Text style={{ color: '#9a2119', fontSize: 12, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                        Review Aptitude →
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ color: subtextColor, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                    Your responses are complete. Click confirm to calculate your Career Compass profile.
                  </Text>
                )}

                <TouchableOpacity
                  disabled={submitting}
                  onPress={handleSubmitTest}
                  style={{
                    backgroundColor: '#10b981',
                    borderRadius: 14,
                    paddingVertical: 12,
                    width: '100%',
                    alignItems: 'center',
                    marginTop: 16,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                    Confirm & View Career Report
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
