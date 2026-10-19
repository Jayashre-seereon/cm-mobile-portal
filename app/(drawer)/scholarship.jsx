import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View, TextInput, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { getScholarships, startScholarshipPreview ,getCategories} from '../../src/api/scholarshipApi';
import { checkModuleAccess } from '../../src/api/moduleAccessApi';
import { AnimatedPressable, HierarchyFilterPanel, Pill, Screen, SectionHeader, UnlockBottomSheet } from '../../src/careermap-ui';
import { buildHierarchyOptions, filterByHierarchy } from '../../src/utils/hierarchy';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';

export default function ScholarshipScreen() {
    const params = useLocalSearchParams();
    const { width: screenWidth } = useWindowDimensions();
    const { canAccessFreeDetail, isUnlocked, preferences, registerFreeDetailAccess } = useAppState();
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [scholarships, setScholarships] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeStatus, setActiveStatus] = useState('All');
    const [sortBy, setSortBy] = useState('Default');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [selectedId, setSelectedId] = useState(null);
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const [previewSecondsLeft, setPreviewSecondsLeft] = useState(0);
    const [lockSheetDismissible, setLockSheetDismissible] = useState(true);
    const [expiredPreviewIds, setExpiredPreviewIds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [moduleAccessChecked, setModuleAccessChecked] = useState(false);
 const [typeFilter, setTypeFilter] = useState('All');
const [eligibilityFilter, setEligibilityFilter] = useState('All');
const [eligibilitySearchQuery, setEligibilitySearchQuery] = useState('');
const [showEligibilityDropdown, setShowEligibilityDropdown] = useState(false);
const [categorySearchQuery, setCategorySearchQuery] = useState('');
const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
const [typeSearchQuery, setTypeSearchQuery] = useState('');
const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const previewTimeoutRef = useRef(null);
    const previewIntervalRef = useRef(null);
    const eligibilityOptions = [
    'Class 1 to 5',
    'Class 6 to 8',
    'Class 9 to 10',
    'Class 11 to 12',
    'UG',
    'PG',
];
    const resolvedModuleId = useMemo(() => {
        const parsed = Number(params.moduleId);
        return Number.isFinite(parsed) ? parsed : 71;
    }, [params.moduleId]);
    const animationKey = selectedId !== null
        ? `scholarship-${selectedId}`
        : `scholarship-list-${activeStatus}-${sortBy}-${categoryFilter}-${eligibilityFilter}-${showFilters ? 'filters' : 'plain'}`;

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
        if (!id) {
            return;
        }
        setExpiredPreviewIds((current) => (current.includes(id) ? current : [...current, id]));
    }, []);

    const resetToList = useCallback(() => {
        clearPreviewTimers();
        setShowUnlockSheet(false);
        setLockSheetDismissible(true);
        setSelectedId(null);
    }, [clearPreviewTimers]);

    const beginPreviewLock = useCallback((seconds = 15, scholarshipId = null) => {
        clearPreviewTimers();
        const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        if (totalSeconds <= 0) {
            setLockSheetDismissible(false);
            markPreviewExpired(scholarshipId);
            setShowUnlockSheet(true);
            return;
        }
        setPreviewSecondsLeft(totalSeconds);
        previewIntervalRef.current = setInterval(() => {
            setPreviewSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);
        previewTimeoutRef.current = setTimeout(() => {
            markPreviewExpired(scholarshipId);
            clearPreviewTimers();
            setLockSheetDismissible(false);
            setShowUnlockSheet(true);
        }, totalSeconds * 1000);
    }, [clearPreviewTimers, markPreviewExpired]);
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

        async function loadScholarships() {
            try {
                setIsLoading(true);
                setLoadError('');
                const items = await getScholarships();

                if (isMounted) {
                    setScholarships(items);
                }
            } catch (_error) {
                if (isMounted) {
                    setScholarships([]);
                    setLoadError('Failed to load scholarships.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadScholarships();

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
            finally {
                if (isMounted) {
                    setModuleAccessChecked(true);
                }
            }
        }
        loadModuleAccess();
        return () => {
            isMounted = false;
        };
    }, [resolvedModuleId]);
    useEffect(() => () => {
        clearPreviewTimers();
    }, [clearPreviewTimers]);
 function getOptionValue(option) {
    return String(option?.value ?? option?.id ?? option?.label ?? option ?? '');
}
function getOptionLabel(option) {
    return String(option?.label ?? option?.title ?? option?.name ?? option ?? '');
}
const categoryOptions = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
}, [categories]);
   
   
const typeOptions = useMemo(
    () => Array.from(new Set(scholarships.map((item) => item.tag).filter(Boolean))),
    [scholarships]
);
const searchableCategoryOptions = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return categoryOptions;
    return categoryOptions.filter((opt) => getOptionLabel(opt).toLowerCase().includes(query));
}, [categoryOptions, categorySearchQuery]);

const searchableEligibilityOptions = useMemo(() => {
    const query = eligibilitySearchQuery.trim().toLowerCase();

    if (!query) {
        return eligibilityOptions;
    }

    return eligibilityOptions.filter((item) =>
        item.toLowerCase().includes(query)
    );
}, [eligibilitySearchQuery]);
const searchableTypeOptions = useMemo(() => {
    const query = typeSearchQuery.trim().toLowerCase();
    if (!query) return typeOptions;
    return typeOptions.filter((opt) => String(opt).toLowerCase().includes(query));
}, [typeOptions, typeSearchQuery]);
   
const filtered = useMemo(() => {
    let source = [...scholarships];

    // Category filter
    if (categoryFilter !== 'All') {
        source = source.filter(
            (item) => String(item.categoryId) === String(categoryFilter)
        );
    }

    // Eligibility filter
    if (eligibilityFilter !== 'All') {
        source = source.filter((item) => {
            const eligibility = String(item.eligibility || '').toLowerCase();
            const selected = eligibilityFilter.toLowerCase();

            if (selected === 'class 1 to 5') {
                return /class\s*1\s*(to|-)\s*5/.test(eligibility);
            }

            if (selected === 'class 6 to 8') {
                return /class\s*6\s*(to|-)\s*8/.test(eligibility);
            }

            if (selected === 'class 9 to 10') {
                return /class\s*9\s*(to|-)\s*10/.test(eligibility);
            }

            if (selected === 'class 11 to 12') {
                return /class\s*11\s*(to|-)\s*12/.test(eligibility);
            }

            if (selected === 'ug') {
                return /\bug\b|undergraduate|graduation|bachelor/.test(eligibility);
            }

            if (selected === 'pg') {
                return /\bpg\b|postgraduate|post-graduation|master/.test(eligibility);
            }
// Type filter
if (typeFilter !== 'All') {
    source = source.filter(
        (item) => String(item.tag) === String(typeFilter)
    );
}
            return true;
        });
    }

    // Status filter
    source =
        activeStatus === 'All'
            ? source
            : source.filter((item) => item.status === activeStatus);

    // Sorting
    if (sortBy === 'A-Z') {
        source.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Z-A') {
        source.sort((a, b) => b.name.localeCompare(a.name));
    }

    return source;
}, [
    scholarships,
    categoryFilter,
    eligibilityFilter,
    typeFilter,
    activeStatus,
    sortBy,
]);  useEffect(() => {
        if (categoryFilter !== 'All' && !categoryOptions.some((option) => String(option?.value ?? option?.id ?? option?.label ?? option) === String(categoryFilter))) {
            setCategoryFilter('All');
        }
    }, [categoryFilter, categoryOptions]);
   
    useEffect(() => {
        if (typeof params.selected === 'string') {
            const selectedItem = scholarships[Number(params.selected)];

            if (selectedItem) {
                setSelectedId(selectedItem.id);
            }
        }
    }, [params.selected, scholarships]);

    const openScholarship = (item) => {
                            if (!hasFullAccess && !item.isFree) {
                                setShowUnlockSheet(true);
                                return;
                            }

                            if (hasFullAccess) {
                                setSelectedId(item.id);
                                return;
                            }

                            const scholarshipId = String(item.id);
                            if (expiredPreviewIds.includes(scholarshipId)) {
                                setLockSheetDismissible(false);
                                setShowUnlockSheet(true);
                                return;
                            }

                            registerFreeDetailAccess('scholarship', scholarshipId);
                            setSelectedId(item.id);
                            startScholarshipPreview({
                                moduleId: resolvedModuleId,
                                pageType: 'scholarship',
                                pageId: scholarshipId,
                            }).then((response) => {
                                if (response?.mode === 'preview') {
                                    beginPreviewLock(response?.remainingSeconds ?? response?.previewDurationSeconds ?? 15, scholarshipId);
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
    };
    // Global search / Career Bee: open the scholarship exactly as tapping its card does.
    useSearchDeepLink(params.searchKey, !isLoading && moduleAccessChecked, () => {
        const scholarshipId = typeof params.scholarshipId === 'string' ? params.scholarshipId : '';
        const item = scholarships.find((entry) => String(entry.id) === scholarshipId);
        if (item) {
            openScholarship(item);
        }
    });

    const selectedScholarship = selectedId !== null
        ? scholarships.find((item) => item.id === selectedId) || null
        : null;
    const detailUnlocked = selectedScholarship ? canAccessFreeDetail('scholarship', selectedScholarship.id) : true;
    const detailPreviewExpired = selectedScholarship ? expiredPreviewIds.includes(selectedScholarship.id) : false;

    if (selectedScholarship) {
        const item = selectedScholarship;

        return (
            <Screen animationKey={animationKey}>
                <SectionHeader
                    title={item.name}
                    subtitle="Scholarship detail page closely matching the reference structure."
                    action={
                        <AnimatedPressable
                            className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`}
                            onPress={() => {
                                resetToList();
                            }}
                        >
                            <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
                        </AnimatedPressable>
                    }
                />

                {!hasFullAccess ? (
                    <View className="self-start rounded-full px-3 py-2" style={{ backgroundColor: `${detailUnlocked ? palette.green : palette.orange}14` }}>
                        <Text className="text-[12px] font-extrabold" style={{ color: detailUnlocked ? palette.green : palette.orange }}>
                            {detailUnlocked ? '1 free scholarship detail unlocked' : 'Subscribe to unlock more scholarship details'}
                        </Text>
                    </View>
                ) : null}
                {!hasFullAccess && !detailUnlocked ? null : previewSecondsLeft > 0 ? (
                    <View className="self-start rounded-full bg-[#f2ebe6] px-3 py-2">
                        <Text className="text-[12px] font-extrabold text-brand">{previewSecondsLeft}s preview</Text>
                    </View>
                ) : null}

                <View className="relative">
                    <View className="items-center gap-2 py-2">
                        <View className="h-[68px] w-[68px] items-center justify-center rounded-[22px]" style={{ backgroundColor: `${palette.green}14` }}>
                            <Ionicons name="ribbon-outline" size={28} color={palette.green}/>
                        </View>
                        <Text className={`text-center text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.name}</Text>
                        <Text className={`text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>by {item.provider}</Text>
                        <View className="flex-row flex-wrap justify-center gap-2">
                            <Pill label={item.status} tone={item.status === 'Active' ? palette.green : item.status === 'Expired' ? palette.danger : palette.orange}/>
                            <Pill label={item.tag} tone={palette.primary}/>
                        </View>
                    </View>

                    <View className={`gap-3 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                        <View className="flex-row items-center justify-between gap-3">
                            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Amount</Text>
                            <Text className="text-[13px] font-black text-success">{item.amount}</Text>
                        </View>
                        <View className="flex-row items-center justify-between gap-3">
                            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Deadline</Text>
                            <Text className={`text-[13px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.deadline}</Text>
                        </View>
                    </View>
                     

                    {detailPreviewExpired ? (
                        <View className="mt-3 items-center gap-3 rounded-[24px] border border-line bg-card p-6">
                            <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-brand">
                                <Ionicons name="lock-closed-outline" size={28} color="#fff"/>
                            </View>
                            <Text className="text-center text-[20px] font-black text-ink">Preview Time Expired</Text>
                            <Text className="text-center text-[14px] leading-[22px] text-muted">Subscribe to access full scholarship details, requirements, and application links.</Text>
                            <Pressable className="w-full rounded-[16px] bg-brand py-[14px]" onPress={() => openSubscriptionPrompt({ pathname: '/(drawer)/scholarship' })}>
                                <Text className="text-center text-[14px] font-extrabold text-white">View Plans</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                         <View className={`mt-3 gap-3 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                                {item.sections && item.sections.length > 0 ? (
                                    item.sections.map((section) => (
                                        <View key={section.id} className="gap-1.5">
                                            <Text className="text-[14px] font-extrabold text-brand">{section.title}</Text>
                                            {section.descriptionHtml ? (
                                                <RenderHTML
                                                    contentWidth={screenWidth - 64}
                                                    source={{ html: section.descriptionHtml }}
                                                    baseStyle={{
                                                        color: preferences.darkMode ? '#b7aeb9' : palette.muted,
                                                        fontSize: 13,
                                                        lineHeight: 21,
                                                    }}
                                                    tagsStyles={{
                                                        h1: { fontSize: 18, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 6 },
                                                        h2: { fontSize: 16, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 6 },
                                                        h3: { fontSize: 15, fontWeight: '800', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
                                                        p: { marginVertical: 4 },
                                                        li: { marginVertical: 2 },
                                                        strong: { fontWeight: '800' },
                                                        a: { color: palette.primary },
                                                    }}
                                                />
                                            ) : (
                                                <Text className={`text-[13px] leading-[21px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                                                    {section.description}
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <>
                                        <Text className="text-[14px] font-extrabold text-brand">About This Scholarship</Text>
                                        {item.descriptionHtml ? (
                                            <RenderHTML
                                                contentWidth={screenWidth - 64}
                                                source={{ html: item.descriptionHtml }}
                                                baseStyle={{
                                                    color: preferences.darkMode ? '#b7aeb9' : palette.muted,
                                                    fontSize: 13,
                                                    lineHeight: 21,
                                                }}
                                                tagsStyles={{
                                                    h1: { fontSize: 18, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 6 },
                                                    h2: { fontSize: 16, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 6 },
                                                    h3: { fontSize: 15, fontWeight: '800', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
                                                    p: { marginVertical: 4 },
                                                    li: { marginVertical: 2 },
                                                    strong: { fontWeight: '800' },
                                                    a: { color: palette.primary },
                                                }}
                                            />
                                        ) : (
                                            <Text className={`text-[13px] leading-[21px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                                                {item.description || 'No details available.'}
                                            </Text>
                                        )}
                                    </>
                                )}
                            </View>

                          
                            {/* <View className={`mt-3 gap-2.5 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                                <Text className="text-[14px] font-extrabold text-brand">Eligibility</Text>
                                {item.eligibility.map((eligibility, idx) => (
                                    <View key={`${eligibility}-${idx}`} className="flex-row items-center gap-2.5">
                                        <View className="h-2 w-2 rounded-full bg-brand"/>
                                        <Text className={`flex-1 text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{eligibility}</Text>
                                    </View>
                                ))}
                            </View> */}

                            <AnimatedPressable
                                className="mt-3 rounded-[16px] bg-brand py-[14px]"
                                onPress={() => {
                                    if (item.link && item.link !== '#') {
                                        Linking.openURL(item.link);
                                    }
                                }}
                            >
                                <Text className="text-center text-[14px] font-extrabold text-white">Apply Now</Text>
                            </AnimatedPressable>
                        </>
                    )}
                </View>
            </Screen>
        );
    }

    return (
        <Screen animationKey={animationKey}>
            <SectionHeader
                title="Scholarships"
                subtitle="Scholarship directory with filters and drill-down cards adapted from the prototype."
                action={
                    <AnimatedPressable className={`h-[40px] w-[40px] items-center justify-center rounded-[12px] ${showFilters ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setShowFilters((value) => !value)}>
                        <Ionicons name={showFilters ? 'options' : 'options-outline'} size={18} color={showFilters ? '#ffffff' : preferences.darkMode ? '#ffffff' : palette.text}/>
                    </AnimatedPressable>
                }
            />

         {showFilters ? (
    <View className="gap-3">
        <View className="relative z-10">
            <Pressable
                onPress={() => setShowCategoryDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                  {categoryFilter !== 'All'
    ? getOptionLabel(
        categoryOptions.find(
            (opt) => getOptionValue(opt) === String(categoryFilter)
        )
    ) || 'All Domains'
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
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No categories found</Text>
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
        onPress={() =>
            setShowEligibilityDropdown((value) => !value)
        }
        className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${
            preferences.darkMode
                ? 'border-[#1a1a1a] bg-[#080808]'
                : 'border-line bg-card'
        }`}
    >
        <Text
            numberOfLines={1}
            className={`flex-1 text-[13px] font-semibold ${
                preferences.darkMode ? 'text-white' : 'text-ink'
            }`}
        >
            {eligibilityFilter !== 'All'
                ? eligibilityFilter
                : 'All Ranges'}
        </Text>

        <Ionicons
            name={
                showEligibilityDropdown
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

    {showEligibilityDropdown ? (
        <View
            className={`mt-2 max-h-[280px] rounded-[14px] border ${
                preferences.darkMode
                    ? 'border-[#1a1a1a] bg-[#080808]'
                    : 'border-line bg-white'
            }`}
        >
            <View className="p-2">
                <TextInput
                    value={eligibilitySearchQuery}
                    onChangeText={setEligibilitySearchQuery}
                    placeholder="Search eligibility..."
                    placeholderTextColor={
                        preferences.darkMode
                            ? '#666666'
                            : '#a89a94'
                    }
                    autoFocus
                    className={`rounded-[10px] border px-3 py-2 text-[13px] ${
                        preferences.darkMode
                            ? 'border-[#1a1a1a] bg-[#111111] text-white'
                            : 'border-line bg-[#f2ebe6] text-ink'
                    }`}
                />
            </View>

            <ScrollView
                className="max-h-[220px]"
                keyboardShouldPersistTaps="handled"
            >
                {eligibilityFilter !== 'All' ? (
                    <Pressable
                        onPress={() => {
                            setEligibilityFilter('All');
                            setEligibilitySearchQuery('');
                            setShowEligibilityDropdown(false);
                        }}
                        className={`border-b px-4 py-3 ${
                            preferences.darkMode
                                ? 'border-[#1a1a1a]'
                                : 'border-line'
                        }`}
                    >
                        <Text className="text-[13px] font-bold text-brand">
                            All Eligibility
                        </Text>
                    </Pressable>
                ) : null}

                {searchableEligibilityOptions.length === 0 ? (
                    <Text
                        className={`px-4 py-4 text-center text-[13px] ${
                            preferences.darkMode
                                ? 'text-[#b7aeb9]'
                                : 'text-muted'
                        }`}
                    >
                        No eligibility found
                    </Text>
                ) : (
                    searchableEligibilityOptions.map((item) => (
                        <Pressable
                            key={item}
                            onPress={() => {
                                setEligibilityFilter(item);
                                setEligibilitySearchQuery('');
                                setShowEligibilityDropdown(false);
                            }}
                            className={`border-b px-4 py-3 ${
                                preferences.darkMode
                                    ? 'border-[#1a1a1a]'
                                    : 'border-line'
                            }`}
                        >
                            <Text
                                className={`text-[13px] font-semibold ${
                                    item === eligibilityFilter
                                        ? 'text-brand'
                                        : preferences.darkMode
                                            ? 'text-white'
                                            : 'text-ink'
                                }`}
                            >
                                {item}
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
                onPress={() => setShowTypeDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {typeFilter !== 'All' ? typeFilter : 'All Types'}
                </Text>
                <Ionicons name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>

            {showTypeDropdown ? (
                <View className={`mt-2 max-h-[280px] rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
                    <View className="p-2">
                        <TextInput
                            value={typeSearchQuery}
                            onChangeText={setTypeSearchQuery}
                            placeholder="Type to search..."
                            placeholderTextColor={preferences.darkMode ? '#666666' : '#a89a94'}
                            autoFocus
                            className={`rounded-[10px] border px-3 py-2 text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-[#f2ebe6] text-ink'}`}
                        />
                    </View>
                    <ScrollView className="max-h-[220px]" keyboardShouldPersistTaps="handled">
                        {typeFilter !== 'All' ? (
                            <Pressable
                                onPress={() => {
                                    setTypeFilter('All');
                                    setTypeSearchQuery('');
                                    setShowTypeDropdown(false);
                                }}
                                className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                            >
                                <Text className="text-[13px] font-bold text-brand">All Types</Text>
                            </Pressable>
                        ) : null}
                        {searchableTypeOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No types found</Text>
                        ) : (
                            searchableTypeOptions.map((t) => (
                                <Pressable
                                    key={t}
                                    onPress={() => {
                                        setTypeFilter(t);
                                        setTypeSearchQuery('');
                                        setShowTypeDropdown(false);
                                    }}
                                    className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                                >
                                    <Text numberOfLines={1} className={`text-[13px] font-semibold ${t === typeFilter ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                        {t}
                                    </Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

      {(categoryFilter !== 'All' || eligibilityFilter !== 'All') ? (      <Pressable
               onPress={() => {
    setCategoryFilter('All');
    setEligibilityFilter('All');

    setCategorySearchQuery('');
    setEligibilitySearchQuery('');

    setShowCategoryDropdown(false);
    setShowEligibilityDropdown(false);
}}
                className={`items-center rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fdf0ee]'}`}
            >
                <Text className="text-[13px] font-bold text-brand">Clear All Filters</Text>
            </Pressable>
        ) : null}
    </View>
) : null}

            <View className="gap-3">
                {isLoading ? <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading scholarships...</Text> : null}
                {!isLoading && loadError ? <Text className="text-[13px] text-brand">{loadError}</Text> : null}
                {!isLoading && !loadError && filtered.length === 0 ? (
                    <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No scholarships available right now.</Text>
                ) : null}

                {filtered.slice(0, hasFullAccess ? filtered.length : 6).map((item) => {
                    const detailOpen = hasFullAccess || item.isFree;

                    return (
                    <AnimatedPressable
                        key={item.id}
                        className={`relative min-h-[138px] gap-3 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
                        onPress={() => openScholarship(item)}
                    >
                       <View className={`absolute right-4 top-4 h-8 w-8 items-center justify-center rounded-full ${detailOpen ? 'bg-[#ecf8ef]' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f8e8d8]'}`}>
                            <Ionicons name={detailOpen ? 'lock-open-outline' : 'lock-closed'} size={15} color={detailOpen ? palette.green : palette.primary}/>
                        </View>
                        <View className="absolute bottom-4 right-4 items-end gap-2">
                            <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item.deadline}</Text>
                            <Pill label={item.status} tone={item.status === 'Active' ? palette.green : item.status === 'Expired' ? palette.danger : palette.orange}/>
                        </View>
                        <View className="flex-row gap-3">
                            <View className="h-[50px] w-[50px] items-center justify-center rounded-[16px]" style={{ backgroundColor: `${palette.green}14` }}>
                                <Ionicons name="ribbon-outline" size={20} color={palette.green}/>
                            </View>
                            <View className="flex-1 gap-1 pr-[110px]">
                                <Text numberOfLines={2} className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.name}</Text>
                                <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item.provider}</Text>
                                <Text className="text-[15px] font-black text-success">{item.amount}</Text>
                            </View>
                        </View>
                    </AnimatedPressable>
                    );
                })}
            </View>

            {showUnlockSheet ? (
                <UnlockBottomSheet
                    title="Unlock Scholarships"
                    subtitle="Subscribe to more scholarship details, requirements, and application links."
                    dismissible={lockSheetDismissible}
                    onClose={resetToList}
                    onPress={() => {
                        resetToList();
                        openSubscriptionPrompt({ pathname: '/(drawer)/scholarship' });
                    }}
                />
            ) : null}
        </Screen>
    );
}
