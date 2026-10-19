import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import api from '../../../src/api/axios';
import { createMentorReview } from '../../../src/api/mentorApi';
import { checkModuleAccess, getModules } from '../../../src/api/moduleAccessApi';
import { useAppState } from '../../../src/app-state';
import { featuredInstitutes, featuredScholarships, moduleCards, palette, studentProfile } from '../../../src/careermap-data';
import { AnimatedPressable, Pill, Screen, SectionHeader, UnlockBottomSheet } from '../../../src/careermap-ui';
import { GlobalSearch } from '../../../src/global-search';
import { useAuthStore } from '../../../src/store/auth-store';
import { openSubscriptionPrompt } from '../../../src/subscription-flow';
const parseReviewDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};
const parseReviewTimeToken = (token) => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return null;
  }

  const meridiemMatch = normalizedToken.match(/(AM|PM)$/i);
  const timeOnly = normalizedToken.replace(/\s*(AM|PM)$/i, '').trim();
  const [hoursValue = '0', minutesValue = '0'] = timeOnly.split(':');
  let hours = Number(hoursValue);
  const minutes = Number(minutesValue || 0);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiemMatch) {
    const meridiem = meridiemMatch[1].toUpperCase();
    if (hours === 12) {
      hours = 0;
    }
    if (meridiem === 'PM') {
      hours += 12;
    }
  }

  return { hours, minutes };
};
const getReviewEligibilityTime = (item) => {
  const explicitEligibilityTime = item?.reviewEligibleAt || item?.canReviewAt || item?.eligibleAt || item?.reviewAt || item?.reviewDate;
  if (explicitEligibilityTime) {
    const parsedTime = parseReviewDateValue(explicitEligibilityTime);
    if (parsedTime) {
      return parsedTime;
    }
  }

  const timeSlotValue = item?.timeSlot || item?.slot || item?.time || '';
  if (!timeSlotValue) {
    return null;
  }

  const timeTokens = String(timeSlotValue).trim().match(/\d{1,2}(?::\d{2})?(?:\s*(?:AM|PM))?/gi) || [];
  const endToken = timeTokens[timeTokens.length - 1];
  const endTime = parseReviewTimeToken(endToken);
  if (!endTime) {
    return null;
  }

  const baseDateValue = item?.bookingDate || item?.date || item?.scheduledAt || item?.appointmentDate || item?.slotDate || item?.createdAt;
  const baseDate = parseReviewDateValue(baseDateValue);
  if (!baseDate) {
    return null;
  }

  const reviewDate = new Date(baseDate);
  reviewDate.setHours(endTime.hours, endTime.minutes, 0, 0);
  return reviewDate;
};
const isReviewEligible = (item, now = new Date()) => {
  const eligibilityTime = getReviewEligibilityTime(item);
  if (!eligibilityTime) {
    return Boolean(item?.canReview);
  }

  return eligibilityTime <= now;
};
const getMentorInitials = (mentor) => {
  const source = String(mentor?.name || 'M').trim();
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'M';
};
const renderMentorAvatar = (mentor, size = 52) => {
  if (mentor?.image) {
    return (<Image source={{ uri: mentor.image }} resizeMode="cover" style={{
      width: size,
      height: size,
      borderRadius: 18,
    }} />);
  }

  return (<View className="items-center justify-center" style={{
    width: size,
    height: size,
    borderRadius: 18,
    backgroundColor: `${mentor?.accent || palette.primary}14`,
    borderWidth: 1,
    borderColor: `${mentor?.accent || palette.primary}18`,
  }}>
    <Text className="text-[18px] font-black" style={{ color: mentor?.accent || palette.primary, lineHeight: 22 }}>
      {getMentorInitials(mentor)}
    </Text>
  </View>);
};
const personalityQuestions = [
  { q: 'When faced with a problem, I prefer to:', options: ['Analyze data systematically', 'Brainstorm creative solutions', 'Discuss with others', 'Act quickly on instinct'] },
  { q: 'In my free time, I enjoy:', options: ['Reading or researching', 'Creating art or music', 'Socializing with friends', 'Physical activities or sports'] },
  { q: 'I work best when:', options: ['I have a clear plan', 'I can be spontaneous', 'I collaborate with a team', 'I work independently'] },
  { q: 'I am most motivated by:', options: ['Achieving goals', 'Expressing myself', 'Helping others', 'Learning new skills'] },
  { q: 'My ideal workspace is:', options: ['Organized and quiet', 'Colorful and inspiring', 'Open and collaborative', 'Flexible and mobile'] },
  { q: 'When making decisions, I rely on:', options: ['Logic and facts', 'Intuition and feelings', 'Advice from others', 'Past experiences'] },
];
const personalityTypes = [
  { type: 'The Analytical Thinker', desc: 'You thrive in structured environments and enjoy solving complex problems with logic and clarity.', careers: ['Engineering', 'Data Science', 'Finance', 'Research'] },
  { type: 'The Creative Visionary', desc: 'You bring imagination, originality, and expressive thinking to everything you work on.', careers: ['Design', 'Architecture', 'Media', 'Marketing'] },
  { type: 'The Empathetic Helper', desc: 'You naturally connect with people and do well in roles built around support, care, and communication.', careers: ['Psychology', 'Teaching', 'Medicine', 'HR'] },
  { type: 'The Dynamic Explorer', desc: 'You enjoy variety, energy, and fast-moving environments where action leads the way.', careers: ['Business', 'Travel', 'Sports', 'Entrepreneurship'] },
];
export default function HomeScreen() {
  const { preferences, requestProfileEdit } = useAppState();
  const profileIncomplete = useAuthStore((state) => state.profileIncomplete);
  const [showPersonalityTest, setShowPersonalityTest] = useState(false);
  const [completedPersonality, setCompletedPersonality] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(Array(personalityQuestions.length).fill(null));
  const [dashboardData, setDashboardData] = useState(null);
  const [lockedModule, setLockedModule] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewedMentorBookings, setReviewedMentorBookings] = useState([]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [showProfilePrompt, setShowProfilePrompt] = useState(Boolean(profileIncomplete));
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);
  const [sectionAccess, setSectionAccess] = useState({
    mentors: { status: 'locked' },
    entranceExam: { status: 'locked' },
    scholarships: { status: 'locked' },
    institutes: { status: 'locked' },
  });
  const { isUnlocked, onboarding, unreadNotificationsCount, userProfile } = useAppState();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const moduleCardWidth = useMemo(() => {
    if (isLargeScreen) {
      return '31%';
    }
    const numColumns = width < 340 ? 2 : 3;
    const cardGap = 10;
    const availableWidth = width - 40 - (numColumns - 1) * cardGap;
    return Math.floor(availableWidth / numColumns);
  }, [width, isLargeScreen]);
  const featureByTitle = {
    'Career Archive': 'career-archive',
    'Career & Personality Videos': 'master-class',
    'Book Your Mentor': 'book-mentor',
    'Scholarships': 'scholarship',
    'Study Abroad': 'abroad-consultancy',
    'Career Insights': 'career-news-letter',
  };
  const moduleOrder = [
    'Career Archive',
    'Entrance Exam',
    'Institutes',
    'Scholarship',
    'Career Psychometric Assessment',
    'Book Your Mentor',
    'Career & Personality Videos',
    'Study Abroad',
    'Quiz',
    'Career Insights',
  ];
  const sectionTargets = useMemo(() => ({
    mentors: {
      title: 'Mentor Access Locked',
      matchers: ['book your mentor', 'book mentor', 'mentor'],
      route: '/(drawer)/book-mentor',
      subtitle: 'Unlock mentor sessions to browse and book the full guidance list.',
    },
    entranceExam: {
      title: 'Entrance Exam Access Locked',
      matchers: ['entrance exam', 'exam'],
      route: '/(drawer)/entrance-exam',
      subtitle: 'Unlock entrance exam content to browse the full preparation list.',
    },
    scholarships: {
      title: 'Scholarship Access Locked',
      matchers: ['scholarship'],
      route: '/(drawer)/scholarship',
      subtitle: 'Unlock scholarship listings to view all opportunities and details.',
    },
    institutes: {
      title: 'Institute Access Locked',
      matchers: ['institute'],
      route: '/(drawer)/institute',
      subtitle: 'Unlock institute listings to browse the full college catalog.',
    },
    newsletter: {
      title: 'Career Insights Access Locked',
      matchers: ['career insights', 'career Insights', 'career newsletter', 'newsletter'],
      route: '/(drawer)/newsletter',
      subtitle: 'Unlock career insights to read the latest updates and articles.',
    },
  }), []);
  const normalizeModuleTitle = (value) => value?.trim().toLowerCase().replace(/\s+/g, ' ');
  const resolveModuleLookupKey = (value) => {
    const normalized = normalizeModuleTitle(value);
    if (normalized === 'assessment' || normalized === 'career psychometric assessment') {
      return 'career psychometric assessment';
    }
    if (normalized === 'scholarship') {
      return 'scholarships';
    }
    if (normalized === 'masterclass' || normalized === 'masterclasses') {
      return 'career & personality videos';
    }
    return normalized;
  };
  const isCareerPsychometricAssessmentModule = (card) => {
    const normalizedTitle = normalizeModuleTitle(card?.lockTitle || card?.title || '');
    return normalizedTitle === 'career psychometric assessment' || normalizedTitle === 'assessment';
  };
  useEffect(() => {
    let isMounted = true;

    async function loadSectionAccess() {
      try {
        const modules = await getModules();
        const nextState = {
          mentors: { status: 'locked' },
          entranceExam: { status: 'locked' },
          scholarships: { status: 'locked' },
          institutes: { status: 'locked' },
          newsletter: { status: 'locked' },
        };

        for (const [sectionName, config] of Object.entries(sectionTargets)) {
          const matchedModule = modules.find((module) => {
            const title = String(module?.title || '').trim().toLowerCase();
            return config.matchers.some((matcher) => title.includes(matcher));
          });
          const moduleId = Number(matchedModule?.id);

          if (!Number.isFinite(moduleId)) {
            continue;
          }

          const response = await checkModuleAccess(moduleId).catch(() => null);
          const mode = String(response?.mode || '').toLowerCase();
          nextState[sectionName] = {
            status: mode || (response?.allowed === false ? 'locked' : 'locked'),
            moduleId,
            title: config.title,
            route: config.route,
            subtitle: config.subtitle,
          };
        }

        if (isMounted) {
          setSectionAccess(nextState);
        }
      } catch {
        if (isMounted) {
          setSectionAccess({
            mentors: { status: 'locked' },
            entranceExam: { status: 'locked' },
            scholarships: { status: 'locked' },
            institutes: { status: 'locked' },
            newsletter: { status: 'locked' },
          });
        }
      }
    }

    void loadSectionAccess();
    return () => {
      isMounted = false;
    };
  }, [sectionTargets]);
  const loadDashboard = async (isMountedRef) => {
    try {
      const response = await api.get('/user/dashboard');
      if ((!isMountedRef || isMountedRef.current) && response?.data?.success) {
        setDashboardData(response.data.data);
      }
    }
    catch (error) {
      console.log('Dashboard fetch failed', error?.response?.data || error?.message || error);
    }
  };
  useEffect(() => {
    const isMountedRef = { current: true };
    loadDashboard(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  useFocusEffect(useCallback(() => {
    loadDashboard();
  }, []));
  const dashboardUserName = useMemo(() => {
    const firstName = dashboardData?.user?.firstName?.trim();
    const lastName = dashboardData?.user?.lastName?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || userProfile.name || onboarding.name || studentProfile.name;
  }, [dashboardData?.user?.firstName, dashboardData?.user?.lastName, onboarding.name, userProfile.name]);
  const dashboardModules = useMemo(() => {
    if (!dashboardData?.modules?.length) {
      return moduleCards.map((card) => ({
        ...card,
        id: card.title,
        lockTitle: card.title,
        accessStatus: 'unlocked',
      }));
    }
    const moduleCardMap = new Map(moduleCards.map((card) => [resolveModuleLookupKey(card.title), card]));
    return dashboardData.modules
      .map((module) => {
        const matchedCard = moduleCardMap.get(resolveModuleLookupKey(module.title));
        if (!matchedCard) {
          return null;
        }
        return {
          ...matchedCard,
          id: module.id,
          lockTitle: matchedCard.title,
          title: module.title || matchedCard.title,
          accessStatus: String(module.accessStatus || '').toLowerCase(),
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftIndex = moduleOrder.indexOf(left.title);
        const rightIndex = moduleOrder.indexOf(right.title);

        if (leftIndex === -1 && rightIndex === -1) {
          return 0;
        }

        if (leftIndex === -1) {
          return 1;
        }

        if (rightIndex === -1) {
          return -1;
        }

        return leftIndex - rightIndex;
      });
  }, [dashboardData?.modules]);
  const mentorAccentPalette = [palette.primary, palette.blue, palette.orange, palette.secondary, palette.green];

  const dashboardMentors = useMemo(() => {
    if (!dashboardData?.mentors?.length) {
      return [];
    }
    return dashboardData.mentors.map((mentor, index) => ({
      id: mentor.id,
      name: mentor.name || 'Unknown Mentor',
      specialty: mentor.designation || 'Career Guidance',
      rating: mentor.rank || '0',
      averageRating: Number.isFinite(Number(mentor.averageRating)) ? Number(mentor.averageRating) : 0,
      experience: mentor.experience ? `${mentor.experience} yrs` : 'Experience not available',
      image: mentor.image || null,
      accent: mentorAccentPalette[index % mentorAccentPalette.length],
    }));
  }, [dashboardData?.mentors]);
  const dashboardEntranceExams = useMemo(() => {
    if (!dashboardData?.entranceExams?.length) {
      return [];
    }

    return dashboardData.entranceExams.map((exam, index) => ({
      id: exam.id,
      name: exam.examname || 'Entrance Exam',
      date: exam.issuedate || '',
      lastDate: exam.lastdate || '',
      image: exam.image || null,
      accent: mentorAccentPalette[index % mentorAccentPalette.length],
    }));
  }, [dashboardData?.entranceExams]);
  const dashboardScholarships = useMemo(() => {
    if (!dashboardData?.scholarships?.length) {
      return featuredScholarships;
    }
    return dashboardData.scholarships.map((item) => ({
      id: item.id,
      name: item.name || '',
      amount: item.price ? `Rs ${item.price} / year` : '',
      deadline: item.deadline ? new Date(item.deadline).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) : '',
      tag: item.type || '',
    }));
  }, [dashboardData?.scholarships]);
  const dashboardInstitutes = useMemo(() => {
    if (!dashboardData?.institutions?.length) {
      return featuredInstitutes;
    }
    return dashboardData.institutions.map((item) => ({
      id: item.id,
      name: item.name || '',
      location: item.state || '',
      type: item.institute_type || '',
      logo: item.logo || null,
    }));
  }, [dashboardData?.institutions]);
  const pendingMentorReviews = useMemo(() => {
    const items = dashboardData?.pendingMentorReviews || [];
    return items.filter((item) => {
      const bookingId = String(item?.bookingId ?? '');
      if (!item?.canReview || reviewedMentorBookings.includes(bookingId)) {
        return false;
      }
      return isReviewEligible(item, new Date());
    });
  }, [dashboardData?.pendingMentorReviews, reviewedMentorBookings]);
  const activeReview = pendingMentorReviews[0] || null;
  useEffect(() => {
    if (activeReview) {
      setReviewOpen(true);
      setReviewError('');
      setReviewRating(5);
      setReviewText('');
    } else {
      setReviewOpen(false);
    }
  }, [activeReview?.bookingId, activeReview?.timeSlot, reviewRefreshKey]);
  useEffect(() => {
    const pendingItems = (dashboardData?.pendingMentorReviews || []).filter((item) => {
      const bookingId = String(item?.bookingId ?? '');
      if (!item?.canReview || reviewedMentorBookings.includes(bookingId)) {
        return false;
      }
      return !isReviewEligible(item, new Date());
    });

    const nextEligibleReview = pendingItems
      .map((item) => ({ item, eligibleAt: getReviewEligibilityTime(item) }))
      .filter(({ eligibleAt }) => Boolean(eligibleAt))
      .sort((left, right) => left.eligibleAt - right.eligibleAt)[0];

    if (!nextEligibleReview) {
      return;
    }

    const delay = nextEligibleReview.eligibleAt.getTime() - Date.now();
    if (delay <= 0) {
      setReviewRefreshKey((current) => current + 1);
      return;
    }

    const timer = setTimeout(() => {
      setReviewRefreshKey((current) => current + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [dashboardData?.pendingMentorReviews, reviewedMentorBookings]);
  useEffect(() => {
    if (profileIncomplete && !profilePromptDismissed) {
      setShowProfilePrompt(true);
    } else {
      setShowProfilePrompt(false);
    }
  }, [profileIncomplete, profilePromptDismissed]);
  const handleCompleteProfile = () => {
    setShowProfilePrompt(false);
    requestProfileEdit();
    router.push('/(drawer)/(tabs)/profile');
  };
  const dismissProfilePrompt = () => {
    setProfilePromptDismissed(true);
    setShowProfilePrompt(false);
  };
  const submitReview = async () => {
    if (!activeReview) {
      return;
    }
    if (!reviewRating) {
      setReviewError('Please select a star rating.');
      return;
    }
    if (!reviewText.trim()) {
      setReviewError('Please write a short review.');
      return;
    }
    try {
      setReviewSubmitting(true);
      setReviewError('');
      await createMentorReview({
        bookingId: activeReview.bookingId,
        rating: reviewRating,
        review: reviewText.trim(),
      });
      setReviewedMentorBookings((current) => [...current, String(activeReview.bookingId)]);
      Alert.alert('Mentor review submitted');
      setReviewOpen(false);
    } catch (error) {
      setReviewError(error?.response?.data?.message || error?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };
  const handleModulePress = async (card) => {
    const moduleId = Number(card?.id);
    const isAssessmentModule = isCareerPsychometricAssessmentModule(card);

    if (!Number.isFinite(moduleId)) {
      const fallbackFeature = featureByTitle[card?.lockTitle || card?.title || ''];

      if (fallbackFeature && !isUnlocked(fallbackFeature)) {
        setLockedModule({
          title: card.title,
          route: card.route,
          moduleId: null,
          message: 'Please purchase a subscription to continue accessing this module.',
        });
        return;
      }

      router.push(card.route);
      return;
    }

    if (isAssessmentModule) {
      const explicitStatus = String(card?.accessStatus || '').toLowerCase();

      if (explicitStatus === 'locked') {
        setLockedModule({
          title: card.title,
          route: card.route,
          moduleId,
          message: 'This module is locked. Please purchase a subscription to continue accessing this module.',
        });
        return;
      }

      router.push({
        pathname: card.route,
        params: {
          moduleId: String(moduleId),
          accessStatus: explicitStatus || 'unlocked',
        },
      });
      return;
    }

    try {
      const response = await checkModuleAccess(moduleId);

      if (!response?.allowed) {
        setLockedModule({
          title: card.title,
          route: card.route,
          moduleId,
          message: response?.message || 'Free preview already used. Please purchase a subscription to continue accessing this module.',
        });
        return;
      }

      router.push({
        pathname: card.route,
        params: {
          moduleId: String(moduleId),
          accessStatus: response?.freePreview ? 'preview' : 'unlocked',
        },
      });
    } catch (error) {
      console.log('Module access check failed', error?.response?.data || error?.message || error);
      router.push(card.route);
    }
  };
  const handleSectionPress = (sectionName) => {
    const config = sectionAccess[sectionName];
    const unlocked = config?.status === 'full' || config?.status === 'preview';

    if (unlocked) {
      router.push(config.moduleId
        ? {
          pathname: config.route,
          params: {
            moduleId: String(config.moduleId),
          },
        }
        : config.route);
      return;
    }

    setLockedModule({
      title: config?.title || 'Locked',
      route: config?.route,
      moduleId: config?.moduleId ?? null,
      message: config?.subtitle || 'Please purchase a subscription to continue accessing this section.',
    });
  };
  const handleSectionSeeAll = (sectionName) => {
    const config = sectionAccess[sectionName];
    const unlocked = config?.status === 'full' || config?.status === 'preview';

    if (unlocked) {
      router.push(config.moduleId
        ? {
          pathname: config.route,
          params: {
            moduleId: String(config.moduleId),
          },
        }
        : config.route);
      return;
    }

    setLockedModule({
      title: config?.title || 'Locked',
      route: config?.route,
      moduleId: config?.moduleId ?? null,
      message: config?.subtitle || 'Please purchase a subscription to continue accessing this section.',
    });
  };
  const personalityResult = useMemo(() => {
    const counts = [0, 0, 0, 0];
    answers.forEach((answer) => {
      if (answer !== null)
        counts[answer] += 1;
    });

    return personalityTypes[counts.indexOf(Math.max(...counts))];
  }, [answers]);
  const resetPersonality = () => {
    setShowPersonalityTest(false);
    setCompletedPersonality(false);
    setCurrentQuestion(0);
  };
  if (showPersonalityTest && !completedPersonality) {
    const current = personalityQuestions[currentQuestion];
    return (<Screen>
      <View className="flex-row items-center gap-3">
        <AnimatedPressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={resetPersonality}>
          <Ionicons name="chevron-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
        </AnimatedPressable>
        <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}> Personality</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <View className={`h-2 flex-1 overflow-hidden rounded-full ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#e8e2de]'}`}>
          <View className="h-full rounded-full bg-brand" style={{ width: `${((currentQuestion + 1) / personalityQuestions.length) * 100}%` }} />
        </View>
        <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{currentQuestion + 1}/{personalityQuestions.length}</Text>
      </View>

      <View className={`gap-2 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
        <Text className={`text-[11px] font-extrabold uppercase tracking-[0.8px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Question {currentQuestion + 1}</Text>
        <Text className={`text-[18px] font-extrabold leading-[26px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{current.q}</Text>
      </View>

      <View className="gap-3">
        {current.options.map((option, index) => {
          const active = answers[currentQuestion] === index;
          return (<AnimatedPressable key={option} className={`rounded-[18px] border p-4 ${active ? 'border-brand bg-brand' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => {
            const next = [...answers];
            next[currentQuestion] = index;
            setAnswers(next);
          }}>
            <Text className={`text-[14px] font-bold ${active ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{String.fromCharCode(65 + index)}. {option}</Text>
          </AnimatedPressable>);
        })}
      </View>

      <View className="flex-row gap-3">
        <AnimatedPressable className={`min-w-[112px] flex-1 items-center rounded-[16px] border px-5 py-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} disabled={currentQuestion === 0} onPress={() => setCurrentQuestion((value) => value - 1)}>
          <Text className={`text-[14px] font-extrabold ${currentQuestion === 0 ? preferences.darkMode ? 'text-[#6d6270]' : 'text-muted' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>Previous</Text>
        </AnimatedPressable>
        <AnimatedPressable className="min-w-[112px] flex-1 items-center rounded-[16px] bg-brand px-5 py-[14px]" disabled={answers[currentQuestion] === null} onPress={() => currentQuestion < personalityQuestions.length - 1 ? setCurrentQuestion((value) => value + 1) : setCompletedPersonality(true)}>
          <Text className="text-[14px] font-extrabold text-white">{currentQuestion < personalityQuestions.length - 1 ? 'Next' : 'See Results'}</Text>
        </AnimatedPressable>
      </View>
    </Screen>);
  }
  if (showPersonalityTest && completedPersonality) {
    return (<Screen>
      <View className="items-center gap-[14px]">
        <Text className="text-[28px] font-black text-brand">Spark</Text>
        <Text className={`text-center text-[28px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Your Personality</Text>
        <View className="rounded-[18px] px-[18px] py-[10px]" style={{ backgroundColor: `${palette.primary}12` }}>
          <Text className="text-[18px] font-black text-brand">{personalityResult.type}</Text>
        </View>
        <Text className={`text-center text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{personalityResult.desc}</Text>

        <View className={`w-full gap-2.5 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[16px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Recommended Careers</Text>
          <View className="flex-row flex-wrap gap-2">
            {personalityResult.careers.map((career) => (<Pill key={career} label={career} tone={palette.primary} />))}
          </View>
        </View>

        <View className={`w-full gap-2.5 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[16px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Get a Full Psychometric Analysis</Text>
          <Text className={`text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Take the deeper assessment to unlock a richer career report with stronger recommendations.</Text>
          <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => router.push('/(drawer)/(tabs)/assessment')}>
            <Text className="text-center text-[14px] font-extrabold text-white">Take The Free Personality Test</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable className={`w-full items-center rounded-[16px] border px-[14px] py-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={resetPersonality}>
          <Text className={`text-[14px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Back to Dashboard</Text>
        </AnimatedPressable>
      </View>
    </Screen>);
  }
  return (<Screen>
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.primary}12` }}>
          <Text className="text-[20px] font-black text-brand">{dashboardUserName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{dashboardUserName}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
      <AnimatedPressable className={`h-[42px] w-[42px] items-center justify-center rounded-[16px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => setSearchOpen(true)}>
        <Ionicons name="search" size={20} color={preferences.darkMode ? '#ffffff' : palette.text} />
      </AnimatedPressable>
      <AnimatedPressable className={`h-[42px] w-[42px] items-center justify-center rounded-[16px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => router.push('/(drawer)/notifications')}>
        <View className="items-center justify-center">
          <Ionicons name="notifications-outline" size={20} color={preferences.darkMode ? '#ffffff' : palette.text} />
          {unreadNotificationsCount > 0 ? (<View className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-brand px-1 py-[1px]">
            <Text className="text-center text-[10px] font-extrabold text-white">{unreadNotificationsCount}</Text>
          </View>) : null}
        </View>
      </AnimatedPressable>
      </View>
    </View>

    <View className="overflow-hidden rounded-[28px] bg-brand p-[22px]" style={{ marginTop: 18, marginBottom: 12 }}>
      <View className="absolute bottom-[-34px] right-[-28px] h-[148px] w-[148px] rounded-full bg-white/10" />

      <View className="gap-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="sparkles" size={14} color="#f6ce63" />
          <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-[#f6ce63]">Recommended</Text>
        </View>
        <Text className="text-[28px] font-black text-white">Know Your Personality</Text>
        <Text className="max-w-[80%] text-[13px] leading-5 text-white/80">
          {isUnlocked('psychometric-test')
            ? 'Take the comprehensive psychometric test to get detailed career insights and recommendations.'
            : 'Answer quick questions to discover your personality type and ideal career direction.'}
        </Text>
        <AnimatedPressable className="mt-1 self-start rounded-full bg-white px-4 py-2.5" onPress={() => router.push('/(drawer)/assessment-preview')}>
          <Text className="text-[13px] font-extrabold text-brand">Take The Free Personality Test</Text>
        </AnimatedPressable>
      </View>
    </View>

    <SectionHeader title="Explore Modules" />
    <View className="flex-row flex-wrap mt-4 mb-2" style={{ gap: isLargeScreen ? 12 : 10 }}>
      {dashboardModules.map((card) => {
        const statusIcon = card.accessStatus === 'locked'
          ? 'lock-closed'
          : card.accessStatus === 'preview'
            ? 'time-outline'
            : card.accessStatus === 'unlocked'
              ? 'lock-open'
              : null;
        const statusColor = card.accessStatus === 'locked'
          ? '#e53935'
          : card.accessStatus === 'preview'
            ? palette.orange
            : palette.green;
        return (<AnimatedPressable key={card.id || card.title} style={{ width: moduleCardWidth }} onPress={() => handleModulePress(card)}>
          <View
            className={`relative items-center justify-center rounded-[20px] border pt-3 pb-2.5 px-1.5 ${preferences.darkMode ? 'bg-[#080808]' : 'bg-card'}`}
            style={{
              borderColor: preferences.darkMode ? '#1a1a1a' : `${card.tone}30`,
              minHeight: isLargeScreen ? undefined : 118,
              aspectRatio: isLargeScreen ? 1 : undefined,
            }}
          >
            {statusIcon ? (
              <View style={{ position: 'absolute', top: 7, right: 7 }}>
                <Ionicons name={statusIcon} size={13} color={statusColor} />
              </View>
            ) : null}
            <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px]" style={{ backgroundColor: `${card.tone}14` }}>
              <Ionicons name={card.icon} size={20} color={card.tone} />
            </View>
            <View className="h-[36px] w-full items-center justify-center mt-1">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{
                  fontSize: 12.5,
                  lineHeight: 16,
                  textAlign: 'center',
                }}
                className={`w-full font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}
              >
                {card.title}
              </Text>
            </View>
          </View>
        </AnimatedPressable>);
      })}
    </View>

    <SectionHeader title="Explore Your Mentors" action={<AnimatedPressable onPress={() => router.push('/(drawer)/book-mentor')}><Text className="text-[12px] font-extrabold text-brand mt-4 ">See all</Text></AnimatedPressable>} />
    {dashboardMentors.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2">
        {dashboardMentors.map((mentor) => {
          const mentorUnlocked = sectionAccess.mentors.status === 'full' || sectionAccess.mentors.status === 'preview';
          return (<AnimatedPressable key={mentor.id || mentor.name} className={`relative min-h-[168px] w-[164px] items-center gap-1.5 rounded-[22px] border p-4 mb-4 mt-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => handleSectionPress('mentors')}>
          <View className="h-[52px] w-[52px] overflow-hidden rounded-[18px] " style={{ backgroundColor: `${mentor.accent}15` }}>
            {renderMentorAvatar(mentor)}
          </View>
          <View className="min-h-[38px] w-full justify-center">
            <Text numberOfLines={2} ellipsizeMode="tail" className={`w-full text-center text-[13px] leading-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.name}</Text>
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" className="w-full text-center text-[11px] font-bold text-brand">{mentor.specialty}</Text>
          <View className="w-full flex-row items-center justify-center gap-1">
            <Ionicons name="star" size={11} color="#f4c200" />
            <Text numberOfLines={1} ellipsizeMode="tail" className={`text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              {mentor.averageRating ? mentor.averageRating.toFixed(1) : 'New'} | {mentor.experience}
            </Text>
          </View>
          <View className="absolute right-2 top-2 rounded-full px-2 py-1" style={{ backgroundColor: mentorUnlocked ? `${palette.green}14` : `${palette.primary}14` }}>
           
          </View>
          </AnimatedPressable>);
        })}
      </ScrollView>
    ) : (
      <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No mentors available right now.</Text>
    )}

    <SectionHeader title="Explore Scholarships" action={<AnimatedPressable onPress={() => handleSectionSeeAll('scholarships')}><Text className="text-[12px] font-extrabold text-brand">See all</Text></AnimatedPressable>} />
    <View className="gap-3 mb-4 mt-4">
      {dashboardScholarships.map((item) => {
        const scholarshipUnlocked = sectionAccess.scholarships.status === 'full' || sectionAccess.scholarships.status === 'preview';
        return (<AnimatedPressable key={item.id || item.name} className={`relative flex-row items-center gap-3 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => handleSectionPress('scholarships')}>
        <View className={`h-[42px] w-[42px] items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#163126]' : 'bg-[#edf9f1]'}`}>
          <Ionicons name="ribbon-outline" size={20} color={palette.green} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} ellipsizeMode="tail" className={`text-[14px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.name}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" className="text-[12px] font-bold text-success">{item.amount}</Text>
        </View>
        <View className="items-end gap-1">
          <Pill label={item.tag} tone={palette.primary} />
          <Text numberOfLines={1} ellipsizeMode="tail" className={`text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item.deadline}</Text>
        </View>
       
        </AnimatedPressable>);
      })}
    </View>

    <SectionHeader title="Explore Entrance Exam" action={<AnimatedPressable onPress={() => handleSectionSeeAll('entranceExam')}><Text className="text-[12px] font-extrabold text-brand">See all</Text></AnimatedPressable>} />
    {dashboardEntranceExams.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2">
        {dashboardEntranceExams.map((exam) => {
          const entranceExamUnlocked = sectionAccess.entranceExam.status === 'full' || sectionAccess.entranceExam.status === 'preview';
          return (<AnimatedPressable key={exam.id || exam.name} className={`relative min-h-[168px] w-[164px] items-center gap-2 rounded-[22px] border p-4 mb-4 mt-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => handleSectionPress('entranceExam')}>
          <View className="h-[52px] w-[52px] overflow-hidden rounded-[18px]" style={{ backgroundColor: `${exam.accent}15` }}>
            {exam.image ? (
              <Image source={{ uri: exam.image }} resizeMode="cover" style={{ width: 52, height: 52, borderRadius: 18 }} />
            ) : (
              <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px]" style={{ backgroundColor: `${exam.accent}15`, borderWidth: 1, borderColor: `${exam.accent}18` }}>
                <Text className="text-[16px] font-black" style={{ color: exam.accent, lineHeight: 20 }}>
                  {(exam.name || 'E').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'E'}
                </Text>
              </View>
            )}
          </View>
          <View className="w-full flex-1 justify-start">
            <Text numberOfLines={3} ellipsizeMode="tail" className={`w-full text-center text-[13px] leading-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{exam.name}</Text>
          </View>
        
          </AnimatedPressable>);
        })}
      </ScrollView>
    ) : (
      <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No entrance exams available right now.</Text>
    )}

    <SectionHeader title="Explore Institutes" action={<AnimatedPressable onPress={() => handleSectionSeeAll('institutes')}><Text className="text-[12px] font-extrabold text-brand">See all</Text></AnimatedPressable>} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2">
      {dashboardInstitutes.map((item) => {
        const instituteUnlocked = sectionAccess.institutes.status === 'full' || sectionAccess.institutes.status === 'preview';
        return (<AnimatedPressable key={item.id || item.name} className={`relative h-[196px] w-[164px] items-center gap-1.5 rounded-[22px] border p-4 mb-4 mt-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => handleSectionPress('institutes')}>
        <View className="h-[52px] w-[52px] overflow-hidden rounded-[18px]" style={{ backgroundColor: `${palette.blue}14` }}>
          {item.logo ? (<Image source={{ uri: item.logo }} resizeMode="cover" style={{ width: 52, height: 52, borderRadius: 18 }} />) : (<View className="h-[52px] w-[52px] items-center justify-center rounded-[18px]" style={{ backgroundColor: `${palette.blue}14`, borderWidth: 1, borderColor: `${palette.blue}18` }}>
            <Text className="text-[16px] font-black" style={{ color: palette.blue, lineHeight: 20 }}>
              {(item.name || 'I').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'I'}
            </Text>
          </View>)}
        </View>
        <View className="min-h-[58px] justify-center">
          <Text numberOfLines={2} ellipsizeMode="tail" className={`text-center text-[13px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.name}</Text>
        </View>
        <Text numberOfLines={1} ellipsizeMode="tail" className="w-full text-center text-[11px] font-bold text-brand">{item.location}</Text>
        <Text numberOfLines={1} ellipsizeMode="tail" className={`w-full text-center text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item.type}</Text>
      
        </AnimatedPressable>);
      })}
    </ScrollView>

    <View className={`gap-2 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
      <Text className={`text-[14px] font-black uppercase tracking-[0.5px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Quick Actions</Text>
      {[
        { label: 'View Subscription Plans', path: '/(drawer)/subscription', icon: 'sparkles-outline', iconTone: palette.secondary },
        { label: 'Your Test History', path: '/(drawer)/(tabs)/profile', icon: 'time-outline', iconTone: palette.blue },
      ].map((item) => (<AnimatedPressable key={item.label} className="flex-row items-center justify-between py-2" onPress={() => router.push(item.path)}>
        <View className="flex-1 flex-row items-center gap-3">
          <View className={`h-[34px] w-[34px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f4eeea]'}`}>
            <Ionicons name={item.icon} size={17} color={item.iconTone} />
          </View>
          <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </AnimatedPressable>))}
    </View>
    <GlobalSearch visible={searchOpen} onClose={() => setSearchOpen(false)} />
    {lockedModule ? (<UnlockBottomSheet title={`Unlock ${lockedModule.title}`} subtitle={lockedModule.message} onClose={() => setLockedModule(null)} onPress={() => {
      const returnTarget = lockedModule.moduleId
        ? {
          pathname: lockedModule.route,
          params: {
            moduleId: String(lockedModule.moduleId),
          },
        }
        : {
          pathname: lockedModule.route,
        };
      setLockedModule(null);
      openSubscriptionPrompt(returnTarget);
    }} />) : null}
    <Modal visible={reviewOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setReviewOpen(false)}>
      <View className="flex-1 items-center justify-center bg-black/50 px-5">
        <View className={`w-full max-w-[320px] rounded-[24px] p-4 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-white'}`}>
          <View className="items-center gap-1">
            <Text className={`text-center text-[19px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>How was your session?</Text>
            <Text className={`text-[12px] pt-2 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>with {activeReview?.mentorName || 'your mentor'}</Text>
          </View>
          <View className="mt-3 flex-row justify-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const filled = value <= reviewRating;
              return (
                <Pressable key={value} onPress={() => setReviewRating(value)} hitSlop={8}>
                  <Ionicons name={filled ? 'star' : 'star-outline'} size={26} color={filled ? '#f4c200' : palette.muted} />
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={reviewText}
            onChangeText={(value) => {
              setReviewText(value);
              setReviewError('');
            }}
            placeholder="Write your review..."
            placeholderTextColor={preferences.darkMode ? '#7f7481' : palette.muted}
            multiline
            textAlignVertical="top"

            className={`mt-3 min-h-[92px] rounded-[14px] border px-4 py-[12px] text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`}
          />
          {reviewError ? (
            <Text className="mt-2 text-center text-[11px] font-semibold text-danger">{reviewError}</Text>
          ) : null}
          <AnimatedPressable className="mt-3 rounded-[14px] bg-brand py-[12px]" disabled={reviewSubmitting || !reviewRating || !reviewText.trim()} onPress={submitReview}>
            <Text className="text-center text-[13px] font-extrabold text-white">{reviewSubmitting ? 'Submitting...' : 'Submit Review'}</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
    <Modal visible={showProfilePrompt} transparent animationType="fade" statusBarTranslucent onRequestClose={dismissProfilePrompt}>
      <View className="flex-1 items-center justify-center bg-black/55 px-5">
        <View
          className={`relative w-full max-w-[340px] rounded-[26px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-white'}`}
          style={{ overflow: 'visible' }}
        >
          <Pressable
            className={`absolute right-3 top-3 z-10 h-9 w-9 items-center justify-center rounded-full ${preferences.darkMode ? 'bg-[#1d1d1d]' : 'bg-[#f3efec]'}`}
            style={{ elevation: 4 }}
            onPress={dismissProfilePrompt}
            hitSlop={10}
          >
            <Ionicons name="close" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
          </Pressable>
          <View className="items-center gap-3">
            <View className="mt-2 h-[54px] w-[54px] items-center justify-center rounded-full" style={{ backgroundColor: `${palette.secondary}18` }}>
              <Ionicons name="person-circle-outline" size={28} color={palette.secondary} />
            </View>
            <Text className={`text-center text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Complete your profile</Text>
            <Text className={`text-center text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              Login successful. A few profile details are still missing.
              Please complete your profile to continue.
            </Text>
          </View>
          <View className="mt-5 flex-row justify-between">
            <AnimatedPressable
              className={`flex-1 items-center rounded-[16px] border px-4 py-3 mr-2 ${preferences.darkMode
                  ? 'border-[#2b2b2b] bg-[#1a1a1a]'
                  : 'border-line bg-[#f5f1ee]'
                }`}
              onPress={dismissProfilePrompt}
            >
              <Text className={`text-[14px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                Later
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              className="flex-1 items-center rounded-[16px] bg-brand px-4 py-3 ml-2"
              onPress={handleCompleteProfile}
            >
              <Text className="text-[14px] font-extrabold text-white">
                Complete Profile
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  </Screen>);
}
