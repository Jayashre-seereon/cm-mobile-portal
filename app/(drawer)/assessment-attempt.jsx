import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { FALLBACK_SECTIONS } from '../../src/features/assessment/data/fallbackQuestions';

const APTITUDE_TIME_LIMIT_SECONDS = 30 * 60;

const timerMemoryStore = {};
function getTimerStartedAt(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val) return Number(val);
    }
  } catch (_e) {}
  return timerMemoryStore[key] || null;
}

function setTimerStartedAt(key, val) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, String(val));
    }
  } catch (_e) {}
  timerMemoryStore[key] = val;
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

export default function AssessmentAttemptScreen() {
  const { attemptId } = useLocalSearchParams();
  const { preferences } = useAppState();
  const darkMode = preferences.darkMode;

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Map of answers: { [questionId]: { likertValue?: number, selectedOptionId?: string, optionKey?: string } }
  const [answers, setAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved'

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

  const pendingSavesRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const scrollViewRef = useRef(null);
  const aptitudeTimerKey = `assessment:${attemptId}:aptitude-started-at`;

  const loadTestQuestions = useCallback(async () => {
    setLoading(true);
    try {
      let loadedSections = [];
      let initialAnswers = {};

      const data = await getAttemptQuestions(attemptId);

      if (data && Array.isArray(data.sections) && data.sections.length > 0) {
        loadedSections = data.sections;
      } else if (Array.isArray(data) && data.length > 0) {
        loadedSections = data;
      } else {
        loadedSections = FALLBACK_SECTIONS;
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
      setSections(FALLBACK_SECTIONS);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadTestQuestions();
  }, [loadTestQuestions]);

  useEffect(() => {
    if (loading || !sections.some((sec, idx) => isAptitudeSection(sec, idx))) return;

    let startedAt = getTimerStartedAt(aptitudeTimerKey);
    if (!startedAt) {
      startedAt = Date.now();
      setTimerStartedAt(aptitudeTimerKey, startedAt);
    }
    setAptitudeStarted(true);

    const updateTime = () => {
      const remaining = Math.max(0, APTITUDE_TIME_LIMIT_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setAptitudeTimeLeft(remaining);
      if (remaining === 0) {
        setAptitudeExpired((prev) => {
          if (!prev) setShowAptitudeExpiredModal(true);
          return true;
        });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [sections, aptitudeTimerKey, loading]);

  // Active section
  const activeSection = useMemo(() => {
    if (!sections || sections.length === 0) return null;
    return sections[currentSectionIndex] || sections[0];
  }, [sections, currentSectionIndex]);

  const activeDomainMeta = useMemo(() => {
    return getDomainMeta(activeSection, currentSectionIndex);
  }, [activeSection, currentSectionIndex]);

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

  // Answer selection with debounced auto-save
  function handleSelectAnswer(questionId, { likertValue, selectedOptionId, optionKey }) {
    if (isAptitudeSection(activeSection, currentSectionIndex) && aptitudeExpired) return;

    setSaveStatus('saving');

    const updatedAnswers = {
      ...answers,
      [questionId]: {
        ...(likertValue !== undefined ? { likertValue } : {}),
        ...(selectedOptionId !== undefined ? { selectedOptionId } : {}),
        ...(optionKey !== undefined ? { optionKey } : {}),
      },
    };
    setAnswers(updatedAnswers);

    pendingSavesRef.current[questionId] = {
      questionId,
      likertValue,
      selectedOptionId,
      optionKey,
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveAttemptAnswer(attemptId, {
          questionId,
          likertValue,
          selectedOptionId,
          optionKey,
        });
        setSaveStatus('saved');
      } catch (_e) {
        setSaveStatus('saved');
      }
    }, 350);
  }

  // Section switch with background batch-save
  function handleSwitchSection(newIndex) {
    if (newIndex < 0 || newIndex >= sections.length) return;

    const batchList = Object.entries(answers).map(([qId, ans]) => ({
      questionId: qId,
      ...(ans.likertValue !== undefined && ans.likertValue !== null ? { likertValue: ans.likertValue } : {}),
      ...(ans.selectedOptionId !== undefined && ans.selectedOptionId !== null ? { selectedOptionId: ans.selectedOptionId } : {}),
      ...(ans.optionKey !== undefined && ans.optionKey !== null ? { optionKey: ans.optionKey } : {}),
    }));

    if (batchList.length > 0) {
      saveBatchAttemptAnswers(attemptId, batchList).catch(() => {});
    }

    setCurrentSectionIndex(newIndex);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  // Unanswered questions
  const unansweredQuestions = useMemo(() => {
    const list = [];
    sections.forEach((sec, sIdx) => {
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

  // Final submission
  async function handleSubmitTest() {
    setIsSubmitModalVisible(false);
    setSubmitting(true);

    try {
      setSubmitStepText('Saving all responses...');
      const batchList = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        ...(ans.likertValue !== undefined && ans.likertValue !== null ? { likertValue: ans.likertValue } : {}),
        ...(ans.selectedOptionId !== undefined && ans.selectedOptionId !== null ? { selectedOptionId: ans.selectedOptionId } : {}),
        ...(ans.optionKey !== undefined && ans.optionKey !== null ? { optionKey: ans.optionKey } : {}),
      }));
      await saveBatchAttemptAnswers(attemptId, batchList).catch(() => {});

      setSubmitStepText('Evaluating Personal Profiling & Career Planning Track...');
      await new Promise((r) => setTimeout(r, 500));

      setSubmitStepText('Evaluating RIASEC, OCEAN, VARK & Cognitive Reasoning...');
      await new Promise((r) => setTimeout(r, 500));

      setSubmitStepText('Calculating Career Clusters & Readiness Score...');
      await submitAssessmentAttempt(attemptId).catch(() => {});

      setSubmitStepText('Generating your Career Compass Report...');
      await new Promise((r) => setTimeout(r, 500));

      router.replace({
        pathname: '/(drawer)/assessment-report',
        params: { attemptId: String(attemptId) },
      });
    } catch (err) {
      console.warn('Submit test note:', err?.message);
      router.replace({
        pathname: '/(drawer)/assessment-report',
        params: { attemptId: String(attemptId) },
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleExit() {
    try {
      const batchList = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        ...(ans.likertValue !== undefined && ans.likertValue !== null ? { likertValue: ans.likertValue } : {}),
        ...(ans.selectedOptionId !== undefined && ans.selectedOptionId !== null ? { selectedOptionId: ans.selectedOptionId } : {}),
        ...(ans.optionKey !== undefined && ans.optionKey !== null ? { optionKey: ans.optionKey } : {}),
      }));
      if (batchList.length > 0) {
        saveBatchAttemptAnswers(attemptId, batchList).catch(() => {});
      }
    } catch (_e) {}

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drawer)/(tabs)/assessment');
    }
  }

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
  const isAptitudeActive = isAptitudeSection(activeSection, currentSectionIndex);
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
                    : aptitudeTimeLeft <= 300
                    ? 'Warning: < 5 Minutes Left'
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
                    : 'This section has a strict 30-minute time limit. Solve as many questions as you can.'}
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

            // Determine if question belongs specifically to Section 1 (Personal Profiling / CRI)
            const isProfilingQuestion =
              activeSection?.code === 'profiling' ||
              activeSection?.id === 'profiling' ||
              activeSection?.key === 'profiling' ||
              activeDomainMeta?.id === 'profiling' ||
              ['SA', 'CE', 'DC', 'PP', 'CO', 'SP'].includes(question.facet) ||
              (typeof question.code === 'string' && /^(SA|CE|DC|PP|CO|SP)\d*/i.test(question.code));

            // Section 1 Question 16 is single choice SP
            const isSP =
              question.code === 'SP' ||
              question.facet === 'SP' ||
              (isProfilingQuestion && (questionNumber === 16 || question.type === 'single_choice'));

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
            activeOpacity={0.85}
            onPress={() => setIsSubmitModalVisible(true)}
            style={{
              backgroundColor: '#10b981',
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
  onPress={handleSubmitTest}
  activeOpacity={0.85}
  style={{
    backgroundColor: '#9a2119',
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
                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 8 }}>
                  All {totalQuestionsCount} Questions Answered!
                </Text>
                <Text style={{ color: subtextColor, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Your responses are complete. Click confirm to calculate your Career Compass profile.
                </Text>

                <TouchableOpacity
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
