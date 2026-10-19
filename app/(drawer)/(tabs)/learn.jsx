import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {Image, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAppState } from '../../../src/app-state';
import { palette } from '../../../src/careermap-data';
import { checkModuleAccess } from '../../../src/api/moduleAccessApi';
import { getMasterClasses, startMasterClassPreview } from '../../../src/api/masterclassApi';
import { AnimatedPressable, Pill, Screen, SectionHeader, UnlockBottomSheet, mobileAssistantScrollProps } from '../../../src/careermap-ui';
import { openSubscriptionPrompt } from '../../../src/subscription-flow';
import { useSearchDeepLink } from '../../../src/utils/searchNavigation';

function formatViews(views) {
    if (!views) {
        return 'New class';
    }
    if (views < 1000) {
        return `${views} views`;
    }
    return `${(views / 1000).toFixed(1)}k views`;
}

export default function LearnScreen() {
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { preferences, registerFreeDetailAccess } = useAppState();
    const [masterClasses, setMasterClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeVideoType, setActiveVideoType] = useState('All');
    const [activeCareer, setActiveCareer] = useState('All');
    const [sortBy, setSortBy] = useState('popular');
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [previewSecondsLeft, setPreviewSecondsLeft] = useState(0);
    const [lockSheetDismissible, setLockSheetDismissible] = useState(true);
    const [expiredPreviewIds, setExpiredPreviewIds] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const previewTimeoutRef = useRef(null);
    const previewIntervalRef = useRef(null);
    const resolvedModuleId = useMemo(() => {
        const parsed = Number(params.moduleId);
        return Number.isFinite(parsed) ? parsed : 60;
    }, [params.moduleId]);

    const clearPreviewTimers = useCallback(() => {
        if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
            previewTimeoutRef.current = null;
        }
        if (previewIntervalRef.current) {
            clearInterval(previewIntervalRef.current);
            previewIntervalRef.current = null;
        }
        setPreviewSecondsLeft(0);
    }, []);

    const markPreviewExpired = useCallback((id) => {
        if (!id) return;
        setExpiredPreviewIds((current) => (current.includes(id) ? current : [...current, id]));
    }, []);

    const resetToList = useCallback(() => {
        clearPreviewTimers();
        setShowUnlockSheet(false);
        setLockSheetDismissible(true);
        setSelectedVideo(null);
    }, [clearPreviewTimers]);

    const beginPreviewLock = useCallback((seconds = 15, classId = null) => {
        clearPreviewTimers();
        const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        if (totalSeconds <= 0) {
            setLockSheetDismissible(false);
            markPreviewExpired(classId);
            setShowUnlockSheet(true);
            return;
        }
        setPreviewSecondsLeft(totalSeconds);
        previewIntervalRef.current = setInterval(() => {
            setPreviewSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);
        previewTimeoutRef.current = setTimeout(() => {
            markPreviewExpired(classId);
            clearPreviewTimers();
            setLockSheetDismissible(false);
            setShowUnlockSheet(true);
        }, totalSeconds * 1000);
    }, [clearPreviewTimers, markPreviewExpired]);

    useEffect(() => () => {
        clearPreviewTimers();
    }, [clearPreviewTimers]);
    useEffect(() => {
        let isMounted = true;
        async function loadMasterClasses() {
            try {
                setIsLoading(true);
                setLoadError('');
                const items = await getMasterClasses();
                if (isMounted) {
                    setMasterClasses(items);
                }
            } catch (_error) {
                if (isMounted) {
                    setMasterClasses([]);
                    setLoadError('Failed to load Career & Personality Videos.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }
        loadMasterClasses();
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        let isMounted = true;
        async function loadModuleAccess() {
            try {
                const response = await checkModuleAccess(resolvedModuleId);
                if (isMounted) {
                    setHasFullAccess(String(response?.mode || '').toLowerCase() === 'full' && response?.allowed !== false);
                }
            }
            catch {
                if (isMounted) {
                    setHasFullAccess(false);
                }
            }
        }
        loadModuleAccess();
        return () => {
            isMounted = false;
        };
    }, [resolvedModuleId]);
    const careerOptions = useMemo(() => ['All', ...Array.from(new Set(masterClasses.map((item) => item.career)))], [masterClasses]);
    const videoTypeOptions = useMemo(() => ['All', ...Array.from(new Set(masterClasses.map((item) => item.videoType)))], [masterClasses]);
    let filtered = [...masterClasses];
    if (activeVideoType !== 'All') {
        filtered = filtered.filter((item) => item.videoType === activeVideoType);
    }
    if (activeCareer !== 'All') {
        filtered = filtered.filter((item) => item.career === activeCareer);
    }
    if (sortBy === 'popular' || sortBy === 'views')
        filtered.sort((a, b) => b.views - a.views);
    else if (sortBy === 'az')
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    else
        filtered.sort((a, b) => b.title.localeCompare(a.title));
    // Global search / Career Bee: show the picked video first (its lock is per video, unchanged).
    const searchFocusActive = useSearchDeepLink(params.searchKey, !isLoading, () => {
        if (typeof params.videoId === 'string' && params.videoId) {
            setActiveVideoType('All');
            setActiveCareer('All');
        }
    });
    if (searchFocusActive && typeof params.videoId === 'string') {
        const focusedIndex = filtered.findIndex((item) => String(item.id) === params.videoId);
        if (focusedIndex > 0) {
            filtered.unshift(filtered.splice(focusedIndex, 1)[0]);
        }
    }
    const subscriptionTarget = useMemo(() => ({
        pathname: '/(drawer)/(tabs)/learn',
    }), []);
    const hasSeparateCareerOptions = careerOptions.length > 2 && careerOptions.some((option) => !videoTypeOptions.includes(option));
    const currentClass = selectedVideo ? masterClasses.find((item) => item.id === selectedVideo) || null : null;
    const detailPreviewExpired = currentClass ? expiredPreviewIds.includes(currentClass.id) : false;
    return (<Screen scroll={true}>
      <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-[18px]  pt-2 " contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 72, 88) }} showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
      <SectionHeader title="Career & Personality Videos" subtitle="Learning videos and sorting adapted closely from the prototype career & personality videos screen." action={<AnimatedPressable className={`h-[40px] w-[40px] items-center justify-center rounded-[12px] ${showFilters ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setShowFilters((value) => !value)}>
            <Ionicons name={showFilters ? 'options' : 'options-outline'} size={18} color={showFilters ? '#ffffff' : preferences.darkMode ? '#ffffff' : palette.text}/>
          </AnimatedPressable>}/>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-1">
            {videoTypeOptions.map((label) => (<AnimatedPressable key={label} className={`rounded-full px-[13px] py-2 ${activeVideoType === label ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setActiveVideoType(label)}>
                <Text className={`text-[12px] font-extrabold ${activeVideoType === label ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{label}</Text>
              </AnimatedPressable>))}
          </ScrollView>
      {showFilters ? 
      (
      <View className="gap-3">
         {hasSeparateCareerOptions ? (<>
            <Text className={` text-[12px] font-bold uppercase ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>career</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-1">
              {careerOptions.map((label) => (<AnimatedPressable key={label} className={`rounded-full px-3 py-2 ${activeCareer === label ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setActiveCareer(label)}>
                  <Text className={`text-[11px] font-extrabold ${activeCareer === label ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{label}</Text>
                </AnimatedPressable>))}
            </ScrollView>
          </>) : null}

        
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-1">
            {[
                // { id: 'views', label: 'Most Viewed' },
                { id: 'az', label: 'A-Z' },
                { id: 'za', label: 'Z-A' },
            ].map((item) => (<AnimatedPressable key={item.id} className={`rounded-full px-3 py-2 ${sortBy === item.id ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setSortBy(item.id)}>
              <Text className={`text-[11px] font-extrabold ${sortBy === item.id ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.label}</Text>
            </AnimatedPressable>))}
          </ScrollView>
        </View>) : null}

      <View className="gap-3">
        {isLoading ? (<Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading career & personality videos...</Text>) : null}
        {!isLoading && loadError ? (<Text className="text-[13px] text-brand">{loadError}</Text>) : null}
        {!isLoading && !loadError && filtered.length === 0 ? (<Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No Career & Personality Videos available right now.</Text>) : null}
        {filtered.map((item) => {
                const detailUnlocked = hasFullAccess || item.isFree;
                const cardUnlocked = hasFullAccess || item.isFree;
                return (<View key={item.id} className={`relative gap-[14px] rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} style={{ opacity: cardUnlocked ? 1 : 0.96 }}>
          <View className={`absolute right-4 top-4 h-8 w-8 items-center justify-center rounded-full ${cardUnlocked ? 'bg-[#ecf8ef]' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f8e8d8]'}`}>
                <Ionicons name={cardUnlocked ? 'lock-open-outline' : 'lock-closed'} size={15} color={cardUnlocked ? palette.green : palette.primary}/>
              </View>
         {/* Master Class Image */}
<View className="overflow-hidden rounded-[16px]">
  {item.image ? (
    <Image
      source={{ uri: item.image }}
      className="h-[180px] w-full"
      resizeMode="cover"
    />
  ) : (
    <View
      className={`h-[180px] w-full items-center justify-center ${
        preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'
      }`}
    >
      <Ionicons
        name="image-outline"
        size={32}
        color={preferences.darkMode ? '#777777' : '#b7aeb9'}
      />
      <Text
        className={`mt-2 text-[12px] ${
          preferences.darkMode ? 'text-[#777777]' : 'text-muted'
        }`}
      >
        No image available
      </Text>
    </View>
  )}
</View>

<View className="flex-row items-start gap-3">
  <View className="flex-1 gap-1">
                <Text className={`text-[15px] font-extrabold leading-[21px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.title}</Text>
                 <View className="flex-row items-center justify-between gap-2.5">
                 
                  <Pill label={item.career} tone={palette.primary}/>
                </View>
              </View>
            </View>
            {!hasFullAccess && !cardUnlocked ? (<Text className={`text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                {detailUnlocked ? 'Your first locked video is available for free.' : ''}
              </Text>) : null}
            <AnimatedPressable onPress={() => {
                    if (!hasFullAccess && !item.isFree && !detailUnlocked) {
                        setShowUnlockSheet(true);
                        return;
                    }
                    if (hasFullAccess) {
                        setSelectedVideo(item.id);
                        if (item.url !== '#') {
                            Linking.openURL(item.url);
                        }
                        return;
                    }
                    const classId = String(item.id);
                    if (expiredPreviewIds.includes(classId)) {
                        setLockSheetDismissible(false);
                        setShowUnlockSheet(true);
                        return;
                    }
                    registerFreeDetailAccess('master-class', classId);
                    setSelectedVideo(item.id);
                    if (item.url !== '#') {
                        Linking.openURL(item.url);
                    }
                    startMasterClassPreview({
                        moduleId: resolvedModuleId,
                        pageType: 'master-class',
                        pageId: classId,
                    }).then((response) => {
                        if (response?.mode === 'preview') {
                            beginPreviewLock(response?.remainingSeconds ?? response?.previewDurationSeconds ?? 15, classId);
                        }
                        else if (response?.mode === 'full') {
                            clearPreviewTimers();
                        }
                        else if (response?.allowed === false) {
                            setLockSheetDismissible(true);
                            setShowUnlockSheet(true);
                        }
                    }).catch(() => {
                        setShowUnlockSheet(true);
                    });
                }} className={`rounded-[14px] py-[11px] ${cardUnlocked ? 'bg-brand' : ''}`} gradient={cardUnlocked} style={cardUnlocked ? undefined : { backgroundColor: `${palette.primary}12` }}>
              <Text className="text-center text-[13px] font-extrabold" style={{ color: cardUnlocked ? '#ffffff' : palette.primary }}>
                {cardUnlocked ? 'Watch Video' : detailUnlocked ? 'Watch 1 Free Class' : 'Unlock More Classes'}
              </Text>
            </AnimatedPressable>
          </View>);
            })}
      </View>
      </ScrollView>
      {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Career & Personality Videos" subtitle={detailPreviewExpired ? 'Your preview time has ended for this career & personality video.' : 'Subscribe to more videos and keep learning without limits.'} dismissible={lockSheetDismissible} onClose={resetToList} onPress={() => {
                resetToList();
                openSubscriptionPrompt(subscriptionTarget);
            }}/>) : null}
      </View>
    </Screen>);
}
