import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { getEntranceExamById } from '../../src/api/entranceExamApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { AnimatedPressable, Screen, UnlockBottomSheet } from '../../src/careermap-ui';
import { useAuthStore } from '../../src/store/auth-store';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { openExternalUrl } from '../../src/utils/openExternalUrl';
import { PREVIEW_MODULES, isPreviewFree, loadPreviewFreeKeys } from '../../src/utils/previewAccess';
import { VERIFY_FAILED_HEADING, VERIFY_FAILED_MESSAGE } from '../../src/utils/searchNavigation';

// Exams opened recently (the full record is loaded only when an exam is opened). Entries belong
// to the signed-in user and expire, so a logout / account switch or an admin edit is picked up.
const EXAM_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const examDetailCache = new Map();
let examDetailCacheOwner = null;

function readCachedExam(ownerKey, id) {
    if (examDetailCacheOwner !== ownerKey) {
        examDetailCache.clear();
        examDetailCacheOwner = ownerKey;
        return null;
    }
    const hit = examDetailCache.get(id);
    if (!hit) return null;
    if (Date.now() - hit.at > EXAM_DETAIL_CACHE_TTL_MS) {
        examDetailCache.delete(id);
        return null;
    }
    return hit.exam;
}

function writeCachedExam(ownerKey, id, exam) {
    if (examDetailCacheOwner !== ownerKey) {
        examDetailCache.clear();
        examDetailCacheOwner = ownerKey;
    }
    examDetailCache.set(id, { exam, at: Date.now() });
}

/*
 * The detail route can be opened directly (deep link careermap://entrance-exam-detail?examId=N,
 * search, router.push), so it checks access itself instead of trusting the list screen:
 * "full" opens every exam, "preview" only the free ones (first 4 of the full list), "locked" none.
 * A failed check keeps the exam closed. Resolves to 'allowed' | 'locked' | 'failed'.
 */
async function resolveExamAccess(examId, moduleIdParam) {
    try {
        let moduleId = Number(moduleIdParam);
        if (!moduleIdParam || !Number.isFinite(moduleId)) {
            const modules = await getModules();
            const matched = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes('entrance exam'));
            moduleId = Number(matched?.id);
        }
        if (!Number.isFinite(moduleId)) return 'failed';
        const response = await checkModuleAccess(moduleId);
        const mode = String(response?.mode || '').toLowerCase();
        if (response?.allowed === false || mode === 'locked') return 'locked';
        if (mode === 'full' || mode === 'unlocked') return 'allowed';
        const freeKeys = await loadPreviewFreeKeys(PREVIEW_MODULES.entranceExam);
        return isPreviewFree(freeKeys, { id: examId }) ? 'allowed' : 'locked';
    } catch {
        return 'failed';
    }
}

function DetailCard({ title, children }) {
    const { preferences } = useAppState();

    return (
        <View
            className={`rounded-[24px] border px-4 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'bg-card'}`}
            style={{
                borderColor: preferences.darkMode ? '#1a1a1a' : '#e8dfda',
                shadowColor: '#7c5f54',
                shadowOpacity: preferences.darkMode ? 0 : 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: preferences.darkMode ? 0 : 3,
            }}
        >
            <Text className="mb-3 text-[17px] font-extrabold text-brand">{title}</Text>
            {children}
        </View>
    );
}

export default function EntranceExamDetailScreen() {
    const { preferences } = useAppState();
    const { examId, moduleId: moduleIdParam } = useLocalSearchParams();
    const { width: screenWidth } = useWindowDimensions();
    const authUserId = useAuthStore((state) => state.user?.id ?? state.user?._id ?? '');
    const accessToken = useAuthStore((state) => state.accessToken);
    const cacheOwner = `${String(authUserId)}|${accessToken ? 'signed-in' : 'signed-out'}`;
    const id = String(examId ?? '');
    const [exam, setExam] = useState(null);
    const [detailError, setDetailError] = useState('');
    // 'checking' | 'allowed' | 'locked' | 'failed'
    const [access, setAccess] = useState('checking');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isMounted = true;
        setDetailError('');
        setExam(null);
        setAccess('checking');
        if (!id) {
            setAccess('allowed');
            setDetailError('Could not load the exam details.');
            return undefined;
        }

        async function loadExam() {
            try {
                const accessResult = await resolveExamAccess(id, moduleIdParam);
                if (!isMounted) return;
                setAccess(accessResult);
                if (accessResult !== 'allowed') return;

                const cached = readCachedExam(cacheOwner, id);
                if (cached) {
                    setExam(cached);
                    return;
                }
                const full = await getEntranceExamById(id);
                writeCachedExam(cacheOwner, id, full);
                if (isMounted) setExam(full);
            } catch (loadError) {
                if (isMounted) {
                    setDetailError(
                        loadError?.response?.data?.message ||
                        loadError?.message ||
                        'Could not load the exam details.'
                    );
                }
            }
        }

        loadExam();

        return () => {
            isMounted = false;
        };
    }, [id, moduleIdParam, cacheOwner, reloadKey]);

    const goBackToList = () => (router.canGoBack() ? router.back() : router.replace('/(drawer)/entrance-exam'));

    if (access === 'locked') {
        return (
            <Screen>
                <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>This exam is locked.</Text>
                <UnlockBottomSheet
                    title="Unlock Entrance Exams"
                    subtitle="Subscribe to view more exam cards and open locked website links."
                    onClose={goBackToList}
                    onPress={() => openSubscriptionPrompt({ pathname: '/(drawer)/entrance-exam' })}
                />
            </Screen>
        );
    }

    if (access === 'failed') {
        return (
            <Screen>
                <View className="gap-2">
                    <Text className={`text-[16px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{VERIFY_FAILED_HEADING}</Text>
                    <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{VERIFY_FAILED_MESSAGE}</Text>
                    <View className="flex-row gap-3">
                        <AnimatedPressable onPress={() => setReloadKey((value) => value + 1)} className="rounded-[10px] border border-brand px-3 py-1">
                            <Text className="text-[12px] font-bold text-brand">Try again</Text>
                        </AnimatedPressable>
                        <AnimatedPressable onPress={goBackToList} className="rounded-[10px] border border-brand px-3 py-1">
                            <Text className="text-[12px] font-bold text-brand">Back to exams</Text>
                        </AnimatedPressable>
                    </View>
                </View>
            </Screen>
        );
    }

    if (!exam) {
        return (
            <Screen>
                {detailError ? (
                    <View className="flex-row flex-wrap items-center gap-3">
                        <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{detailError}</Text>
                        <AnimatedPressable onPress={() => setReloadKey((value) => value + 1)} className="rounded-[10px] border border-brand px-3 py-1">
                            <Text className="text-[12px] font-bold text-brand">Try again</Text>
                        </AnimatedPressable>
                    </View>
                ) : (
                    <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading exam details...</Text>
                )}
            </Screen>
        );
    }

    return (
        <Screen contentContainerClassName="gap-[18px] px-5 py-5 pb-8">
            <View className="mb-7 flex-row items-center gap-3">
                <AnimatedPressable
                    onPress={() => (router.canGoBack() ? router.back() : router.push('/(drawer)/entrance-exam'))}
                    className={`h-10 w-10 items-center justify-center rounded-full ${preferences.darkMode ? 'bg-[#111111]' : 'bg-white'}`}
                    style={{
                        shadowColor: '#967c75',
                        shadowOpacity: preferences.darkMode ? 0 : 0.12,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: preferences.darkMode ? 0 : 2,
                    }}
                >
                    <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
                </AnimatedPressable>
                <Text className={`text-[22px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{exam.name}</Text>
            </View>

            <View className="items-center pb-4">
                <View className={`mb-4 h-[84px] w-[84px] items-center justify-center rounded-[26px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#ffecef]'}`}>
                    <Ionicons name="document-text-outline" size={34} color={palette.primary}/>
                </View>
                <Text className={`text-center text-[32px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{exam.name}</Text>
                <Text className={`mt-1 text-[18px] font-medium ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{exam.mode}</Text>

                <View className="mt-4 flex-row gap-2">
                    <View className="rounded-full bg-[#fff1e8] px-3 py-1.5">
                        <Text className="text-[11px] font-bold text-[#ea872e]">Issue: {exam.issueDate}</Text>
                    </View>
                    <View className="rounded-full bg-[#e4f7ed] px-3 py-1.5">
                        <Text className="text-[11px] font-bold text-[#2f9367]">Last: {exam.lastDate}</Text>
                    </View>
                </View>
            </View>

            <View className="gap-4">
                <DetailCard title="">
                    {exam.aboutHtml ? (
                        <RenderHTML
                            contentWidth={Math.max(220, screenWidth - 80)}
                            source={{ html: exam.aboutHtml }}
                            baseStyle={{
                                color: preferences.darkMode ? '#b7aeb9' : palette.muted,
                                fontSize: 14,
                                lineHeight: 22,
                                textAlign: 'left',
                            }}
                            tagsStyles={{
                                h1: { fontSize: 20, fontWeight: '900', color: palette.primary, marginVertical: 8 },
                                h2: { fontSize: 18, fontWeight: '900', color: palette.primary, marginVertical: 8 },
                                h3: { fontSize: 16, fontWeight: '800', color: palette.primary, marginVertical: 6 },
                                h4: { fontSize: 15, fontWeight: '800', color: palette.primary, marginVertical: 6 },
                                h5: { fontSize: 14, fontWeight: '800', color: palette.primary, marginVertical: 5 },
                                h6: { fontSize: 13, fontWeight: '800', color: palette.primary, marginVertical: 5 },
                                p: { marginVertical: 4, textAlign: 'left' },
                                li: { marginVertical: 3, textAlign: 'left' },
                                ul: { marginVertical: 6, paddingLeft: 18 },
                                ol: { marginVertical: 6, paddingLeft: 18 },
                                table: { marginVertical: 8 },
                                th: { padding: 6, borderWidth: 1, borderColor: preferences.darkMode ? '#1a1a1a' : '#e8dfda', backgroundColor: preferences.darkMode ? '#111111' : '#f7f1ed' },
                                td: { padding: 6, borderWidth: 1, borderColor: preferences.darkMode ? '#1a1a1a' : '#e8dfda' },
                                strong: { fontWeight: '800' },
                                a: { color: palette.primary },
                            }}
                        />
                    ) : (
                        <Text className={`text-left text-[14px] leading-6 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                            {exam.about || 'Description not available.'}
                        </Text>
                    )}
                </DetailCard>




                {exam.website && exam.website !== '#' ? (
                <AnimatedPressable
                    onPress={() => {
                        void openExternalUrl(exam.website);
                    }}
                    className="mt-1 rounded-[18px] px-5 py-4"
                    style={{
                        backgroundColor: palette.primary,
                        shadowColor: '#711628',
                        shadowOpacity: 0.22,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: 4,
                    }}
                >
                    <View className="flex-row items-center justify-center gap-2">
                        <Ionicons name="open-outline" size={18} color="#ffffff"/>
                        <Text className="text-[18px] font-extrabold text-white">Visit Official Website</Text>
                    </View>
                </AnimatedPressable>
                ) : null}
            </View>
        </Screen>
    );
}
