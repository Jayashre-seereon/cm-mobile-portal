import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppState } from '../../../src/app-state';
import {
  getAssessmentAccessStatus,
  getMyAttempts,
  getPublishedAssessments,
  startAssessmentAttempt,
} from '../../../src/api/psychometricAssessmentApi';
import {
  ASSESSMENT_DOMAINS,
  ESTIMATED_DURATION_MINS,
  TOTAL_ASSESSMENT_QUESTIONS,
} from '../../../src/features/assessment/data/assessmentConstants';

export default function AssessmentLandingScreen() {
  const { preferences } = useAppState();
  const darkMode = preferences.darkMode;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [accessStatus, setAccessStatus] = useState(null);
  const [publishedAssessments, setPublishedAssessments] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [latestCompletedAttempt, setLatestCompletedAttempt] = useState(null);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [showPlanRequiredModal, setShowPlanRequiredModal] = useState(false);
  const [planRequiredMessage, setPlanRequiredMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [accessRes, assessmentsRes, attemptsRes] = await Promise.allSettled([
        getAssessmentAccessStatus(),
        getPublishedAssessments(),
        getMyAttempts(),
      ]);

      if (accessRes.status === 'fulfilled' && accessRes.value) {
        setAccessStatus(accessRes.value);
      } else {
        setAccessStatus(null);
      }

      const assessments =
        assessmentsRes.status === 'fulfilled' && Array.isArray(assessmentsRes.value)
          ? assessmentsRes.value
          : [];
      setPublishedAssessments(assessments);

      const attempts =
        attemptsRes.status === 'fulfilled' && Array.isArray(attemptsRes.value)
          ? attemptsRes.value
          : [];
      setMyAttempts(attempts);

      // Find in-progress attempt if any
      const inProgress = attempts.find(
        (a) =>
          a.status === 'in_progress' ||
          a.status === 'IN_PROGRESS' ||
          a.isCompleted === false
      );
      setActiveAttempt(inProgress || null);

      // Find latest completed attempt
      const completed = attempts.filter(
        (a) =>
          a.status === 'completed' ||
          a.status === 'COMPLETED' ||
          a.isCompleted === true ||
          a.report
      );
      if (completed.length > 0) {
        setLatestCompletedAttempt(completed[0]);
      } else {
        setLatestCompletedAttempt(null);
      }
    } catch (err) {
      console.warn('Error loading assessment landing data:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function triggerPlanRequiredModal(customMessage) {
    const msg =
      customMessage ||
      'You have already completed your Psychometric Assessment and generated your 32-page Career Compass Report under your current plan. To retake the assessment and track your new score, please subscribe to an assessment plan.';
    setPlanRequiredMessage(msg);
    setShowPlanRequiredModal(true);
  }

  async function handleStartTest(forceNew = false) {
    // If in-progress test exists and not forcing new: resume directly
    if (activeAttempt && !forceNew) {
      const attemptId =
        activeAttempt.id || activeAttempt.attemptId || activeAttempt._id;
      router.push({
        pathname: '/(drawer)/assessment-attempt',
        params: { attemptId: String(attemptId) },
      });
      return;
    }

    // If accessStatus specifically marks user as blocked:
    if (accessStatus && accessStatus.allowed === false) {
      if (accessStatus.reason === 'ALREADY_COMPLETED') {
        triggerPlanRequiredModal(
          accessStatus.message ||
            'You have already completed your assessment under your current plan. Please subscribe to a new assessment plan to retake the test.'
        );
      } else {
        triggerPlanRequiredModal(
          accessStatus.message ||
            'Assessment is locked. Please purchase an assessment plan to unlock access.'
        );
      }
      return;
    }

    try {
      setStarting(true);
      const defaultAssessment = publishedAssessments[0] || {};
      const assessmentId =
        defaultAssessment.id ||
        defaultAssessment._id ||
        defaultAssessment.assessmentId ||
        '1';

      const res = await startAssessmentAttempt(assessmentId);
      const attemptId =
        res?.attemptId ||
        res?.id ||
        res?.data?.attemptId ||
        res?.data?.id ||
        `att_${Date.now()}`;

      router.push({
        pathname: '/(drawer)/assessment-attempt',
        params: { attemptId: String(attemptId) },
      });
    } catch (err) {
      console.warn('Start assessment error:', err?.message);
      const data = err.response?.data;
      if (
        data?.requiresNewPlan ||
        err.response?.status === 403 ||
        data?.reason === 'ALREADY_COMPLETED' ||
        data?.reason === 'NO_ACTIVE_PLAN'
      ) {
        triggerPlanRequiredModal(
          data?.message || 'Please purchase an assessment plan to take or retake the assessment.'
        );
        loadData();
      } else {
        Alert.alert(
          'Assessment Error',
          data?.message || err?.message || 'Could not start assessment. Please try again.'
        );
      }
    } finally {
      setStarting(false);
    }
  }

  function handleRetakeConfirm() {
    if (accessStatus && accessStatus.allowed === false) {
      triggerPlanRequiredModal(
        accessStatus.reason === 'ALREADY_COMPLETED'
          ? 'You have already completed your Psychometric Assessment and generated your 32-page Career Compass Report. To retake the assessment and track your new score, please subscribe to an assessment plan.'
          : (accessStatus.message || 'Please purchase a plan to retake the assessment.')
      );
      return;
    }

    if (Platform.OS === 'web') {
      setShowRetakeModal(true);
    } else {
      Alert.alert(
        'Start a New Assessment Attempt?',
        'Starting a new attempt will begin a fresh assessment session. Your past reports will remain preserved in your history.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Start Fresh Test',
            style: 'default',
            onPress: () => handleStartTest(true),
          },
        ]
      );
    }
  }

  // Determine current access and completion state matching user portal
  const isAllowed = accessStatus
    ? accessStatus.allowed === true
    : !latestCompletedAttempt || !!activeAttempt;

  const isAlreadyCompleted = accessStatus
    ? accessStatus.allowed === false &&
      (accessStatus.reason === 'ALREADY_COMPLETED' || !!accessStatus.completedAttemptId)
    : Boolean(latestCompletedAttempt) && !activeAttempt;

  const isNoActivePlan = accessStatus
    ? accessStatus.allowed === false && accessStatus.reason === 'NO_ACTIVE_PLAN'
    : false;

  const completedAttemptId =
    accessStatus?.completedAttemptId ||
    latestCompletedAttempt?.id ||
    latestCompletedAttempt?.attemptId ||
    latestCompletedAttempt?._id ||
    'latest';

  const formattedCompletedDate =
    accessStatus?.completedAt || latestCompletedAttempt?.completedAt
      ? new Date(
          accessStatus?.completedAt || latestCompletedAttempt?.completedAt
        ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Recently';


  const cardBg = darkMode ? '#121214' : '#ffffff';
  const borderColor = darkMode ? '#222226' : '#e8dfda';
  const textColor = darkMode ? '#ffffff' : '#211b19';
  const subtextColor = darkMode ? '#a09895' : '#655753';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#070709' : '#faf6f3', fontFamily: 'Poppins_400Regular' }}>
      <ScrollView
        style={{ flex: 1, fontFamily: 'Poppins_400Regular' }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            colors={['#9a2119']}
            tintColor="#9a2119"
          />
        }
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#801812', '#9a2119', '#b32b21']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#801812',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              marginBottom: 10,
              gap: 6,
            }}
          >
            <Ionicons name="shield-checkmark" size={14} color="#fde047" />
            <Text style={{ color: '#fef08a', fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', letterSpacing: 0.5 }}>
              7-DOMAIN EVALUATION • 1-PLAN = 1-ATTEMPT
            </Text>
          </View>

          <Text style={{ color: '#ffffff', fontSize: 24, fontFamily: 'Poppins_900Black', fontWeight: '900', lineHeight: 30 }}>
            Psychometric Career Assessment
          </Text>

          <Text style={{ color: '#ffe4e6', fontSize: 13, lineHeight: 19, marginTop: 8 }}>
            Discover your career readiness profiling, interests, personality strengths, learning style, work values, and cognitive aptitudes in a comprehensive 32-page Career Compass Report.
          </Text>

          {/* Badges */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                gap: 5,
              }}
            >
              <Ionicons name="document-text-outline" size={13} color="#fde047" />
              <Text style={{ color: '#ffffff', fontSize: 11, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                {TOTAL_ASSESSMENT_QUESTIONS} Questions
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                gap: 5,
              }}
            >
              <Ionicons name="time-outline" size={13} color="#fde047" />
              <Text style={{ color: '#ffffff', fontSize: 11, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                ~{ESTIMATED_DURATION_MINS} Mins
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                gap: 5,
              }}
            >
              <Ionicons name="trophy-outline" size={13} color="#fde047" />
              <Text style={{ color: '#ffffff', fontSize: 11, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                6 Domains · 18 Clusters
              </Text>
            </View>
          </View>

          {/* Quick Action Box / Dynamic 3-State Quick Status Box */}
          <View
            style={{
              marginTop: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            {loading ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <ActivityIndicator color="#ffffff" />
                <Text style={{ color: '#ffe4e6', fontSize: 12, marginTop: 8 }}>
                  Checking assessment access...
                </Text>
              </View>
            ) : activeAttempt ? (
              /* STATE 1A: In-Progress Attempt Found */
              <View>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(251,191,36,0.25)',
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#fef08a', fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                    In-Progress Test Found
                  </Text>
                </View>
                <Text style={{ color: '#ffffff', fontSize: 17, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 6 }}>
                  Continue Your Assessment
                </Text>
                <Text style={{ color: '#ffe4e6', fontSize: 12, marginTop: 2 }}>
                  Your answers are saved. Pick up right where you left off.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleStartTest(false)}
                  disabled={starting}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginTop: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  {starting ? (
                    <ActivityIndicator color="#9a2119" size="small" />
                  ) : (
                    <Text style={{ color: '#1e293b', fontSize: 14, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                      ▶ Resume Assessment
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRetakeConfirm}
                  style={{ alignItems: 'center', marginTop: 10 }}
                >
                  <Text style={{ color: '#ffe4e6', fontSize: 11, textDecorationLine: 'underline' }}>
                    Or start a fresh attempt
                  </Text>
                </TouchableOpacity>
              </View>
            ) : isAlreadyCompleted ? (
              /* STATE 2: Test Completed (Locked for Retake under 1-Plan = 1-Attempt Rule) */
              <View>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(52,211,153,0.25)',
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={12} color="#34d399" />
                  <Text style={{ color: '#a7f3d0', fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                    Assessment Completed
                  </Text>
                </View>

                <Text style={{ color: '#ffffff', fontSize: 17, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 6 }}>
                  Career Compass Ready
                </Text>
                <Text style={{ color: '#ffe4e6', fontSize: 12, marginTop: 2 }}>
                  Completed on:{' '}
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: '#ffffff' }}>
                    {formattedCompletedDate}
                  </Text>
                </Text>

                <View style={{ marginTop: 12, gap: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      router.push({
                        pathname: '/(drawer)/assessment-report',
                        params: { attemptId: String(completedAttemptId) },
                      });
                    }}
                    style={{
                      backgroundColor: '#34d399',
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#064e3b', fontSize: 13, fontFamily: 'Poppins_900Black', fontWeight: '900' }}>
                      📄 View Career Compass Report
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleRetakeConfirm}
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: '#fde047',
                      borderRadius: 14,
                      paddingVertical: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="lock-closed" size={13} color="#fde047" />
                    <Text style={{ color: '#fde047', fontSize: 12, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                      Retake Test 
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isNoActivePlan ? (
              /* STATE 3: No Active Plan (Locked) */
              <View>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(239,68,68,0.25)',
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="lock-closed" size={12} color="#fca5a5" />
                  <Text style={{ color: '#fca5a5', fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                    Assessment Locked
                  </Text>
                </View>

                <Text style={{ color: '#ffffff', fontSize: 17, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 6 }}>
                  Assessment Plan Required
                </Text>
                <Text style={{ color: '#ffe4e6', fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                  {accessStatus?.message ||
                    'Subscribe to an assessment plan to unlock your evaluation and 32-page report.'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    router.push({
                      pathname: '/(drawer)/subscription',
                      params: { returnTo: '/(drawer)/(tabs)/assessment' },
                    });
                  }}
                  style={{
                    backgroundColor: '#facc15',
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginTop: 14,
                  }}
                >
                  <Text style={{ color: '#1e293b', fontSize: 14, fontFamily: 'Poppins_900Black', fontWeight: '900' }}>
                    🔒 Unlock Assessment (View Plans)
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* STATE 1B: Allowed & Ready for New Attempt */
              <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 32 }}>🚀</Text>
                <View
                  style={{
                    backgroundColor: 'rgba(52,211,153,0.25)',
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <Ionicons name="lock-open" size={12} color="#34d399" />
                  <Text style={{ color: '#a7f3d0', fontSize: 11, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                    {accessStatus?.planTitle || 'Assessment Unlocked'}
                  </Text>
                </View>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                >
                  Ready to Discover Your Future?
                </Text>
                <Text
                  style={{
                    color: '#ffe4e6',
                    fontSize: 12,
                    marginTop: 3,
                    textAlign: 'center',
                  }}
                >
                  Takes ~35-45 mins. Your answers auto-save at every step.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleStartTest(false)}
                  disabled={starting}
                  style={{
                    backgroundColor: '#facc15',
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    width: '100%',
                    alignItems: 'center',
                    marginTop: 14,
                  }}
                >
                  {starting ? (
                    <ActivityIndicator color="#1e293b" size="small" />
                  ) : (
                    <Text style={{ color: '#1e293b', fontSize: 14, fontFamily: 'Poppins_900Black', fontWeight: '900' }}>
                      🚀 Start Assessment Now
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* 6 Dimensions Grid */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                color: '#9a2119',
                fontSize: 11,
                fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              STRUCTURED CURRICULUM
            </Text>
            <Text style={{ color: textColor, fontSize: 19, fontFamily: 'Poppins_900Black', fontWeight: '900', marginTop: 2 }}>
              The 7 Dimensions of Career Compass
            </Text>
            <Text style={{ color: subtextColor, fontSize: 12, marginTop: 2 }}>
              Total: <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: textColor }}>{TOTAL_ASSESSMENT_QUESTIONS} Questions</Text> across 7 Sections
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {ASSESSMENT_DOMAINS.map((domain, index) => (
              <View
                key={domain.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: darkMode ? 0 : 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 26 }}>{domain.icon}</Text>
                  <View
                    style={{
                      backgroundColor: darkMode ? '#1c1c20' : '#f1f5f9',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: darkMode ? '#cbd5e1' : '#475569', fontSize: 10, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                      Section {index + 1} / 6
                    </Text>
                  </View>
                </View>

                <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 10 }}>
                  {domain.title}
                </Text>
              

                <Text style={{ color: subtextColor, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
                  {domain.description}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    borderTopWidth: 1,
                    borderTopColor: borderColor,
                    marginTop: 12,
                    paddingTop: 10,
                  }}
                >
                  <Text style={{ color: textColor, fontSize: 11, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                    {domain.questionCount} Questions
                  </Text>
                  <Text style={{ color: subtextColor, fontSize: 11, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' }}>
                    {domain.type === 'mcq' ? 'MCQ (Aptitude)' : '1-5 Likert Scale'}
                  </Text>
                  <Text style={{ color: textColor, fontSize: 11, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                    ~{domain.estimatedMinutes} mins
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Guidelines */}
        <View
          style={{
            backgroundColor: darkMode ? '#181514' : '#fdf6ed',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: darkMode ? '#2e2520' : '#fde68a',
            marginBottom: 24,
          }}
        >
          <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
            💡 Important Guidelines for Best Results
          </Text>

          <View style={{ marginTop: 12, gap: 10 }}>
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ color: textColor, fontSize: 13, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                1. Answer Honestly
              </Text>
              <Text style={{ color: subtextColor, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                There are no right or wrong answers in the personality and interest sections. Choose what truly represents you.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ color: textColor, fontSize: 13, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                2. Auto-Saved Progress
              </Text>
              <Text style={{ color: subtextColor, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                Every response is automatically saved. You can safely close or pause and resume anytime.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ color: textColor, fontSize: 13, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                3. Aptitude Reasoning
              </Text>
              <Text style={{ color: subtextColor, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                Section 7 features 39 multiple choice questions with a 15-minute time limit. Keep scrap paper handy for quick calculations.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ color: textColor, fontSize: 13, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                4. Comprehensive Report
              </Text>
              <Text style={{ color: subtextColor, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                Receive instant career matches, Holland code radar, and personalized study & stream recommendations.
              </Text>
            </View>
          </View>
        </View>

        {/* History Section */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  backgroundColor: '#fee2e2',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="time" size={18} color="#9a2119" />
              </View>
              <View>
                <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                  My Assessment History
                </Text>
                <Text style={{ color: subtextColor, fontSize: 11 }}>
                  Past test results and reports
                </Text>
              </View>
            </View>

            {myAttempts.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRetakeConfirm}
                style={{
                  backgroundColor: isAllowed ? '#9a2119' : 'transparent',
                  borderWidth: isAllowed ? 0 : 1,
                  borderColor: '#d97706',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {!isAllowed && <Ionicons name="lock-closed" size={12} color="#d97706" />}
                <Text
                  style={{
                    color: isAllowed ? '#ffffff' : '#d97706',
                    fontSize: 11,
                    fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
                  }}
                >
                  {isAllowed ? '+ New Test' : 'Retake Test'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color="#9a2119" />
              <Text style={{ color: subtextColor, fontSize: 12, marginTop: 8 }}>
                Loading your history...
              </Text>
            </View>
          ) : myAttempts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 32 }}>📋</Text>
              <Text
                style={{
                  color: textColor,
                  fontSize: 14,
                  fontFamily: 'Poppins_700Bold', fontWeight: '700',
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                No past assessment attempts yet.
              </Text>
              <Text
                style={{
                  color: subtextColor,
                  fontSize: 11,
                  marginTop: 2,
                  textAlign: 'center',
                  maxWidth: 240,
                }}
              >
                Start your first evaluation to generate your Career Compass Report.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (isNoActivePlan) {
                    router.push({
                      pathname: '/(drawer)/subscription',
                      params: { returnTo: '/(drawer)/(tabs)/assessment' },
                    });
                  } else {
                    handleStartTest(false);
                  }
                }}
                style={{
                  backgroundColor: '#9a2119',
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  marginTop: 14,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                  {isNoActivePlan ? '🔒 Unlock Assessment Plan' : '🚀 Start Your First Assessment'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {myAttempts.map((attempt, index) => {
                const attemptId =
                  attempt.id || attempt.attemptId || attempt._id || `att_${index}`;
                const isDone =
                  attempt.status === 'completed' ||
                  attempt.status === 'COMPLETED' ||
                  attempt.isCompleted;
                const dateStr =
                  attempt.completedAt || attempt.createdAt || attempt.updatedAt;
                const formattedDate = dateStr
                  ? new Date(dateStr).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : `Attempt #${index + 1}`;

                return (
                  <View
                    key={attemptId}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: darkMode ? '#18181c' : '#f8fafc',
                      borderRadius: 14,
                      padding: 12,
                      borderWidth: 1,
                      borderColor,
                    }}
                  >
                    <View>
                      <Text style={{ color: textColor, fontSize: 13, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                        {formattedDate}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Ionicons
                          name={isDone ? 'checkmark-circle' : 'time-outline'}
                          size={13}
                          color={isDone ? '#10b981' : '#f59e0b'}
                        />
                        <Text
                          style={{
                            color: isDone ? '#10b981' : '#f59e0b',
                            fontSize: 11,
                            fontFamily: 'Poppins_700Bold', fontWeight: '700',
                          }}
                        >
                          {isDone ? 'Completed' : 'In Progress'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isDone) {
                          router.push({
                            pathname: '/(drawer)/assessment-report',
                            params: { attemptId: String(attemptId) },
                          });
                        } else {
                          router.push({
                            pathname: '/(drawer)/assessment-attempt',
                            params: { attemptId: String(attemptId) },
                          });
                        }
                      }}
                      style={{
                        backgroundColor: isDone ? '#9a2119' : 'transparent',
                        borderWidth: isDone ? 0 : 1,
                        borderColor: '#f59e0b',
                        borderRadius: 10,
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: isDone ? '#ffffff' : '#f59e0b',
                          fontSize: 12,
                          fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
                        }}
                      >
                        {isDone ? 'View Report' : 'Resume'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Assessment Plan Required Modal */}
      <Modal
        visible={showPlanRequiredModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlanRequiredModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 24,
              padding: 22,
              width: '100%',
              maxWidth: 380,
              borderWidth: 1,
              borderColor,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View
                style={{
                  backgroundColor: '#fee2e2',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="lock-closed" size={22} color="#8C1814" />
              </View>
              <Text style={{ color: textColor, fontSize: 18, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', flex: 1 }}>
                Assessment Plan Required
              </Text>
            </View>

            {/* Modal Content */}
            <Text style={{ color: textColor, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
              {planRequiredMessage ||
                'You have already completed your Psychometric Assessment and generated your 32-page Career Compass Report under your current plan. To retake the assessment and track your new score, please subscribe to an assessment plan.'}
            </Text>

            <Text style={{ color: subtextColor, fontSize: 11, lineHeight: 16, marginTop: 10, fontFamily: 'Poppins_500Medium', fontWeight: '500' }}>
              Each subscription plan unlocks a fresh comprehensive evaluation and an updated Career Compass Report.
            </Text>

            {/* Buttons */}
            <View style={{ marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowPlanRequiredModal(false);
                  router.push({
                    pathname: '/(drawer)/subscription',
                    params: { returnTo: '/(drawer)/(tabs)/assessment' },
                  });
                }}
                style={{
                  backgroundColor: '#8C1814',
                  borderRadius: 14,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
                  View Plans & Pricing
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowPlanRequiredModal(false)}
                style={{
                  backgroundColor: darkMode ? '#1c1c20' : '#f1f5f9',
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: subtextColor, fontSize: 13, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Web fallback modal for confirmation */}
      <Modal visible={showRetakeModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 20,
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor,
            }}
          >
            <Text style={{ color: textColor, fontSize: 17, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
              Start a New Assessment Attempt?
            </Text>
            <Text style={{ color: subtextColor, fontSize: 13, lineHeight: 18, marginTop: 8 }}>
              Starting a new attempt will begin a fresh assessment session. Your past reports will remain preserved in your history.
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setShowRetakeModal(false)}
                style={{ paddingVertical: 8, paddingHorizontal: 14 }}
              >
                <Text style={{ color: subtextColor, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowRetakeModal(false);
                  handleStartTest(true);
                }}
                style={{
                  backgroundColor: '#9a2119',
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>Yes, Start Fresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
