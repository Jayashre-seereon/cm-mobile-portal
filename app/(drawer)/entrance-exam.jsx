import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, Linking, TextInput, Pressable } from 'react-native';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { getEntranceExams ,getCategories} from '../../src/api/entranceExamApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { AnimatedPressable, Screen, SectionHeader, UnlockBottomSheet } from '../../src/careermap-ui';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';
import { getDeadlineStatus, isComingSoonDeadline } from '../../src/utils/deadlineStatus';
import { buildFreeKeys, isPreviewFree } from '../../src/utils/previewAccess';
const normalizeExamName = (value = '') => String(value).toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const getExamFamily = (value = '') => {
    const normalized = normalizeExamName(value);
    const family = normalized.match(/^(cuet(?:pg|ug)|neet(?:pg|ug)|jee(?:main|advanced)|gate|cat|clat|upsc|ssc|ibps|nda|nata|bitsat|cet)/);
    return family?.[1] || normalized;
};
export default function EntranceExamScreen() {
    const params = useLocalSearchParams();
    const { preferences } = useAppState();
    const [entranceExams, setEntranceExams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    // Server access mode: "full" / "unlocked" = everything open, "preview" = first 4 free,
    // "locked" = everything locked.
    const [accessMode, setAccessMode] = useState('preview');
    const [moduleAccessResolved, setModuleAccessResolved] = useState(false);
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
  const [modeFilter, setModeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
   const [categoryFilter, setCategoryFilter] = useState('All');
    const [categories, setCategories] = useState([]);
    const [showModeDropdown, setShowModeDropdown] = useState(false);
const [showFilters, setShowFilters] = useState(false);
const [examSearchQuery, setExamSearchQuery] = useState('');
const [showExamDropdown, setShowExamDropdown] = useState(false);
const [selectedExamId, setSelectedExamId] = useState('');
const [categorySearchQuery, setCategorySearchQuery] = useState('');
const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    useEffect(() => {
        let isMounted = true;

        async function loadEntranceExams() {
            try {
                setIsLoading(true);
                setLoadError('');
                const items = await getEntranceExams();
                if (isMounted) setEntranceExams(items);
            } catch (_error) {
                if (isMounted) {
                    setEntranceExams([]);
                    setLoadError('Failed to load entrance exams.');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadEntranceExams();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
        try {
            const response = await getCategories();

            if (!isMounted) return;

            const categoryData = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];

            setCategories(categoryData);
        } catch (error) {
            if (isMounted) {
                setCategories([]);
            }
        }
    }

    loadCategories();

    return () => {
        isMounted = false;
    };
}, []);
    useEffect(() => {
        let isMounted = true;

        async function loadModuleAccess() {
            try {
                let moduleId = null;
                const modules = await getModules();
                const matchedModule = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes('entrance exam'));
                moduleId = Number(matchedModule?.id);

                if (!Number.isFinite(moduleId)) {
                    if (isMounted) {
                        setAccessMode('full');
                        setModuleAccessResolved(true);
                    }
                    return;
                }

                const response = await checkModuleAccess(moduleId);
                if (!isMounted) {
                    return;
                }

                const mode = String(response?.mode || '').toLowerCase();
                if (mode === 'full' || mode === 'unlocked') {
                    setAccessMode(response?.allowed === false ? 'locked' : 'full');
                } else {
                    setAccessMode(mode === 'locked' ? 'locked' : 'preview');
                }
                setModuleAccessResolved(true);
            } catch (_error) {
                if (isMounted) {
                    setAccessMode('full');
                    setModuleAccessResolved(true);
                }
            }
        }

        loadModuleAccess();

        return () => {
            isMounted = false;
        };
    }, []);

    const hasFullAccess = accessMode === 'full';
    // The free exams in preview are the first 4 of the FULL list in API order, not of whatever
    // the filters currently show, so filtering never unlocks an exam.
    const previewFreeKeys = useMemo(() => buildFreeKeys(entranceExams), [entranceExams]);
    const isExamUnlocked = (exam) =>
        hasFullAccess || (accessMode === 'preview' && isPreviewFree(previewFreeKeys, exam));

    // Global search / Career Bee: pre-select the exam with the screen's own "Search Exam" filter.
    useSearchDeepLink(params.searchKey, !isLoading && moduleAccessResolved, () => {
        const examId = typeof params.examId === 'string' ? params.examId : '';
        if (!examId || !entranceExams.some((exam) => String(exam.id) === examId)) {
            return;
        }
        if (params.fromGlobalSearch === '1') {
            // A deep link respects the same lock as the list.
            const target = entranceExams.find((exam) => String(exam.id) === examId);
            if (!isExamUnlocked(target)) {
                setShowUnlockSheet(true);
                return;
            }
            router.replace({
                pathname: '/(drawer)/entrance-exam-detail',
                params: { examId, fromGlobalSearch: '1' },
            });
            return;
        }
        setModeFilter('All');
        setStatusFilter('All');
        setCategoryFilter('All');
        const selected = entranceExams.find((exam) => String(exam.id) === examId);
        setSelectedExamId(String(selected.id));
        setShowFilters(true);
    });

  // Faceted filtering (same as the user portal): every dropdown only offers values that still have
  // results once the OTHER filters are applied, so no combination ends in "no exams".
  const matchesExamFilters = (exam, f) => {
    if (f.mode !== 'All' && normalizeExamName(exam.mode) !== normalizeExamName(f.mode)) return false;
    if (f.category !== 'All') {
        const inCategory = [exam.categoryObj?.id ?? exam.categoryId, exam.secondcategoryObj?.id ?? exam.secondcategoryId, exam.subcategoryObj?.id ?? exam.subcategoryId]
            .some((id) => id != null && String(id) === String(f.category));
        if (!inCategory) return false;
    }
    if (f.status !== 'All') {
        const closed = getDeadlineStatus(exam.lastDateRaw) === 'Expired';
        if ((f.status === 'closed') !== closed) return false;
    }
    if (f.examId && String(exam.id) !== String(f.examId)) return false;
    return true;
  };
  const currentExamFilters = { mode: modeFilter, category: categoryFilter, status: statusFilter, examId: selectedExamId };

  const modeOptions = useMemo(() => {
    const available = entranceExams.filter((exam) => matchesExamFilters(exam, { ...currentExamFilters, mode: 'All' }));
    const unique = new Map();
    available.forEach((exam) => {
        const value = String(exam.mode || '').trim();
        if (value && value !== 'Mode not available' && !unique.has(value.toLowerCase())) unique.set(value.toLowerCase(), value);
    });
    return ['All', ...unique.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entranceExams, categoryFilter, statusFilter, selectedExamId]);

  const statusOptions = useMemo(() => {
    const available = entranceExams.filter((exam) => matchesExamFilters(exam, { ...currentExamFilters, status: 'All' }));
    const options = ['All'];
    if (available.some((exam) => getDeadlineStatus(exam.lastDateRaw) !== 'Expired')) options.push('upcoming');
    if (available.some((exam) => getDeadlineStatus(exam.lastDateRaw) === 'Expired')) options.push('closed');
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entranceExams, categoryFilter, modeFilter, selectedExamId]);

function getOptionValue(option) {
    return String(option?.value ?? option?.id ?? option?.label ?? option ?? '');
}
function getOptionLabel(option) {
    return String(option?.label ?? option?.title ?? option?.name ?? option ?? '');
}
const categoryOptions = useMemo(() => {
    const all = Array.isArray(categories) ? categories : [];
    const available = entranceExams.filter((exam) => matchesExamFilters(exam, { ...currentExamFilters, category: 'All' }));
    const ids = new Set(available.flatMap((exam) =>
        [exam.categoryObj?.id ?? exam.categoryId, exam.secondcategoryObj?.id ?? exam.secondcategoryId, exam.subcategoryObj?.id ?? exam.subcategoryId]
            .filter((id) => id != null)
            .map(String)
    ));
    // Keep the current selection listed even if it is the only thing narrowing the list.
    return all.filter((option) => ids.has(getOptionValue(option)) || getOptionValue(option) === String(categoryFilter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [categories, entranceExams, modeFilter, statusFilter, selectedExamId, categoryFilter]);
   const searchableExams = useMemo(() => {
    const query = normalizeExamName(examSearchQuery.trim());
    if (!query) return entranceExams;
    return entranceExams.filter((exam) => normalizeExamName(exam.name).includes(query));
}, [entranceExams, examSearchQuery]);
const searchableCategoryOptions = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();

    if (!query) return categoryOptions;

    return categoryOptions.filter((opt) =>
        getOptionLabel(opt).toLowerCase().includes(query)
    );
}, [categoryOptions, categorySearchQuery]);


const filtered = useMemo(
    () => entranceExams.filter((exam) => matchesExamFilters(exam, currentExamFilters)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entranceExams, modeFilter, categoryFilter, statusFilter, selectedExamId]
);
   useEffect(() => {
    if (
        categoryFilter !== 'All' &&
        !categoryOptions.some(
            (option) =>
                getOptionValue(option) ===
                String(categoryFilter)
        )
    ) {
        setCategoryFilter('All');
    }
}, [categoryFilter, categoryOptions]);

    return (
        <Screen>
            <SectionHeader
                title="Entrance Exams"
                subtitle="Practice tests and exam preparation guides."
                action={
                    <AnimatedPressable className={`h-[40px] w-[40px] items-center justify-center rounded-[12px] ${showFilters ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setShowFilters((value) => !value)}>
                        <Ionicons name={showFilters ? 'options' : 'options-outline'} size={18} color={showFilters ? '#ffffff' : preferences.darkMode ? '#ffffff' : palette.text}/>
                    </AnimatedPressable>
                }
            />

         {showFilters && (
    <View className="gap-3">
        <View className="relative z-10">
            <Pressable
                onPress={() => setShowExamDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text
                    numberOfLines={1}
                    className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}
                >
                    {selectedExamId
                        ? entranceExams.find((exam) => String(exam.id) === String(selectedExamId))?.name || 'Search Exam'
                        : 'Search Exam'}
                </Text>
                <Ionicons
                    name={showExamDropdown ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={preferences.darkMode ? '#ffffff' : palette.text}
                />
            </Pressable>

            {showExamDropdown ? (
                <View
                    className={`mt-2 max-h-[280px] rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}
                >
                    <View className="p-2">
                        <TextInput
                            value={examSearchQuery}
                            onChangeText={setExamSearchQuery}
                            placeholder="Type to search..."
                            placeholderTextColor={preferences.darkMode ? '#666666' : '#a89a94'}
                            autoFocus
                            className={`rounded-[10px] border px-3 py-2 text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-[#f2ebe6] text-ink'}`}
                        />
                    </View>

                    <ScrollView className="max-h-[220px]" keyboardShouldPersistTaps="handled">
                        {selectedExamId ? (
                            <Pressable
                                onPress={() => {
                                    setSelectedExamId('');
                                    setExamSearchQuery('');
                                    setShowExamDropdown(false);
                                }}
                                className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                            >
                                <Text className="text-[13px] font-bold text-brand">Clear Selection</Text>
                            </Pressable>
                        ) : null}

                        {searchableExams.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                                No exams found
                            </Text>
                        ) : (
                            searchableExams.map((exam) => (
                                <Pressable
                                    key={exam.id}
                                    onPress={() => {
                                        setSelectedExamId(String(exam.id));
                                        setExamSearchQuery('');
                                        setShowExamDropdown(false);
                                    }}
                                    className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                                >
                                    <Text
                                        numberOfLines={1}
                                        className={`text-[13px] font-semibold ${
                                            String(exam.id) === String(selectedExamId)
                                                ? 'text-brand'
                                                : preferences.darkMode
                                                ? 'text-white'
                                                : 'text-ink'
                                        }`}
                                    >
                                        {exam.name}
                                    </Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

       <View className="relative z-10">
    <Pressable
        onPress={() => setShowCategoryDropdown((value) => !value)}
        className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
    >
        <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
            {categoryFilter !== 'All'
                ? getOptionLabel(
    categoryOptions.find(
        (opt) =>
            getOptionValue(opt) === String(categoryFilter)
    )
)
                : 'All Domains'}
        </Text>
        <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text} />
    </Pressable>

    {showCategoryDropdown ? (
        <View className={`mt-2 max-h-[280px] rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
            <View className="p-2">
                <TextInput
                    value={categorySearchQuery}
                    onChangeText={setCategorySearchQuery}
                    placeholder="Type to search..."
                    placeholderTextColor={preferences.darkMode ? '#666666' : '#a89a94'}
                    autoFocus
                    className={`rounded-[10px] border px-3 py-2 text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-[#f2ebe6] text-ink'}`}
                />
            </View>
            <ScrollView className="max-h-[220px]" keyboardShouldPersistTaps="handled">
                {categoryFilter !== 'All' ? (
                    <Pressable
                        onPress={() => {
                           setCategoryFilter('All');
setCategorySearchQuery('');
setShowCategoryDropdown(false);
                        }}
                        className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                    >
                        <Text className="text-[13px] font-bold text-brand">All Domains</Text>
                    </Pressable>
                ) : null}
                {searchableCategoryOptions.length === 0 ? (
                    <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No domains found</Text>
                ) : (
                    searchableCategoryOptions.map((opt) => {
                        const value = getOptionValue(opt);
                        return (
                            <Pressable
                                key={value}
                                onPress={() => {
                                   setCategoryFilter(value);
setCategorySearchQuery('');
setShowCategoryDropdown(false);
                                }}
                                className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                            >
                                <Text numberOfLines={1} className={`text-[13px] font-semibold ${value === String(categoryFilter) ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                    {getOptionLabel(opt)}
                                </Text>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </View>
    ) : null}
</View>

<View className="relative z-10">

    <Pressable
        onPress={() => setShowModeDropdown((value) => !value)}
        className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${
            preferences.darkMode
                ? 'border-[#1a1a1a] bg-[#080808]'
                : 'border-line bg-card'
        }`}
    >

        <Text
            numberOfLines={1}
            className={`flex-1 text-[13px] font-semibold ${
                preferences.darkMode
                    ? 'text-white'
                    : 'text-ink'
            }`}
        >
            {modeFilter !== 'All'
                ? modeFilter
                : 'All Types'}
        </Text>

        <Ionicons
            name={
                showModeDropdown
                    ? 'chevron-up'
                    : 'chevron-down'
            }
            size={16}
            color={
                preferences.darkMode
                    ? '#ffffff'
                    : palette.text
            }
        />

    </Pressable>


    {showModeDropdown ? (

        <View
            className={`mt-2 rounded-[14px] border ${
                preferences.darkMode
                    ? 'border-[#1a1a1a] bg-[#080808]'
                    : 'border-line bg-white'
            }`}
        >

            {modeOptions.map((mode) => (

                <Pressable
                    key={mode}
                    onPress={() => {
                        setModeFilter(mode);
                        setShowModeDropdown(false);
                    }}
                    className={`border-b px-4 py-3 ${
                        preferences.darkMode
                            ? 'border-[#1a1a1a]'
                            : 'border-line'
                    }`}
                >

                    <Text
                        className={`text-[13px] font-semibold ${
                            mode === modeFilter
                                ? 'text-brand'
                                : preferences.darkMode
                                    ? 'text-white'
                                    : 'text-ink'
                        }`}
                    >
                        {mode === 'All'
                            ? 'All Types'
                            : mode}
                    </Text>

                </Pressable>

            ))}

        </View>

    ) : null}

</View>

{/* Upcoming / Closed (same as the user portal "All Status" filter) */}
<View className="flex-row gap-2">
    {statusOptions.map((status) => (
        <Pressable
            key={status}
            onPress={() => setStatusFilter(status)}
            className={`flex-1 items-center rounded-[14px] border px-3 py-3 ${
                status === statusFilter
                    ? 'border-brand bg-[#fdf0ee]'
                    : preferences.darkMode
                        ? 'border-[#1a1a1a] bg-[#080808]'
                        : 'border-line bg-card'
            }`}
        >
            <Text
                className={`text-[13px] font-semibold ${
                    status === statusFilter
                        ? 'text-brand'
                        : preferences.darkMode
                            ? 'text-white'
                            : 'text-ink'
                }`}
            >
                {status === 'All' ? 'All Status' : status === 'upcoming' ? 'Upcoming' : 'Closed'}
            </Text>
        </Pressable>
    ))}
</View>
{(modeFilter !== 'All' ||
    categoryFilter !== 'All' ||
    statusFilter !== 'All' ||
    selectedExamId) ? (    <Pressable
        onPress={() => {
            setModeFilter('All');
            setStatusFilter('All');
            setCategoryFilter('All');
            setSelectedExamId('');
            setExamSearchQuery('');
            setCategorySearchQuery('');
             setShowExamDropdown(false);
            setShowCategoryDropdown(false);
            setShowModeDropdown(false);
           
        }}
        className={`items-center rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fdf0ee]'}`}
    >
        <Text className="text-[13px] font-bold text-brand">Clear All Filters</Text>
    </Pressable>
) : null}
    </View>
)}

            <View className="gap-3">
                {isLoading ? <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading entrance exams...</Text> : null}
                {!isLoading && loadError ? <Text className="text-[14px] text-brand">{loadError}</Text> : null}

                {!moduleAccessResolved ? <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Checking access...</Text> : null}

                {filtered.map((exam) => {
                    const cardUnlocked = isExamUnlocked(exam);
                    return (
                    <AnimatedPressable
                        key={exam.id}
                        className={`mb-3 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card shadow-card'}`}
                        onPress={() => {
                            if (!cardUnlocked) {
                                setShowUnlockSheet(true);
                                return;
                            }
                        }}
                    >
                       <View className="flex-row items-center gap-3">

                            {/* Document Icon */}
                           <View className="h-10 w-10 items-center justify-center rounded-[10px] shrink-0 mt-1" style={{ backgroundColor: `${palette.primary}15` }}>
                                <Ionicons name="document-text-outline" size={20} color={palette.primary}/>
                            </View>

                            {/* Title + Dates + Button in column */}
                            <View className="flex-1 gap-2">

                                <View className="flex-row items-start justify-between gap-3">
                                    <Text className={`flex-1 text-[15px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                        {exam.name}
                                    </Text>
                                    {!cardUnlocked ? (
                                        <View className="h-6 w-6 items-center justify-center rounded-full bg-[#fdecea]">
                                            <Ionicons name="lock-closed" size={13} color="#e53935"/>
                                        </View>
                                    ) : (
                                        <View className="h-6 w-6 items-center justify-center rounded-full bg-[#e4f7ed]">
                                            <Ionicons name="lock-open" size={13} color="#2f9367"/>
                                        </View>
                                    )}
                                </View>
                                <View className="flex-row flex-wrap items-center gap-2">
                                    <View className="rounded-[10px] px-2 py-1" style={{ backgroundColor: `${palette.orange}20` }}>
                                        <Text className="text-[9px] font-bold uppercase" style={{ color: palette.orange }}>
                                            Issue: {exam.issueDate}
                                        </Text>
                                    </View>
                                    <View className="rounded-[10px] px-2 py-1" style={{ backgroundColor: `${palette.green}20` }}>
                                        <Text className="text-[9px] font-bold uppercase" style={{ color: palette.green }}>
                                            Last: {exam.lastDate}
                                        </Text>
                                    </View>
                                    {isComingSoonDeadline(exam.lastDateRaw) ? <View className="rounded-[10px] bg-[#fff1c2] px-2 py-1"><Text className="text-[9px] font-extrabold uppercase text-[#9a4a00]">Coming soon</Text></View> : null}
                                </View>
                                <View className="flex-row justify-end gap-3 border-t border-line pt-1">
                                    <AnimatedPressable
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            if (!cardUnlocked) {
                                                setShowUnlockSheet(true);
                                                return;
                                            }
                                            if (exam.website && exam.website !== '#') Linking.openURL(exam.website);
                                        }}
                                        className="rounded-full px-2 py-1.5"
                                    >
                                        <Text className="text-[10px] font-bold text-brand">
                                            Visit Website
                                        </Text>
                                    </AnimatedPressable>
                                    <Pressable
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            if (!cardUnlocked) {
                                                setShowUnlockSheet(true);
                                                return;
                                            }
                                            router.push({
                                                pathname: '/(drawer)/entrance-exam-detail',
                                                params: { examId: String(exam.id) },
                                            });
                                        }}
                                        className="rounded-full px-2 py-1.5"
                                    >
                                        <Text className="text-[10px] font-bold text-brand">
                                            View
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                        </View>
                    </AnimatedPressable>
                );})}

                {!isLoading && !loadError && filtered.length === 0 ? (
                    <View className="items-center justify-center py-12">
                        <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No exams match your filters</Text>
                    </View>
                ) : null}
            </View>
            {showUnlockSheet ? (
                <UnlockBottomSheet
                    title="Unlock Entrance Exams"
                    subtitle="Subscribe to view more exam cards and open locked website links."
                    onClose={() => setShowUnlockSheet(false)}
                    onPress={() => {
                        setShowUnlockSheet(false);
                        openSubscriptionPrompt({ pathname: '/(drawer)/entrance-exam' });
                    }}
                />
            ) : null}
        </Screen>
    );
}
