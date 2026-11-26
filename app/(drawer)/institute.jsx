import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { getCategories, getInstituteById, getInstituteFilters, getInstitutes } from '../../src/api/instituteApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { AnimatedPressable, Screen, SectionHeader, UnlockBottomSheet } from '../../src/careermap-ui';
import { useSearchDeepLink, VERIFY_FAILED_HEADING, VERIFY_FAILED_MESSAGE } from '../../src/utils/searchNavigation';
import { openExternalUrl } from '../../src/utils/openExternalUrl';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { buildFreeKeys, isPreviewFree, loadPreviewFreeKeys, PREVIEW_MODULES } from '../../src/utils/previewAccess';

const getInstituteInitials = (name) => {
    const source = String(name || 'Institute').trim();
    const initials = source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'I';
};

const INDIA_STATES = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Chandigarh',
    'Puducherry',
    'Andaman and Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Lakshadweep',
];

const normalizeFilterValue = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const getInstituteOwnershipLabel = (value) => {
    const normalized = normalizeFilterValue(value);
    if (/\b(government|govt|gov|public)\b/.test(normalized)) return 'Government';
    if (/\b(private|pvt)\b/.test(normalized)) return 'Private';
    return '';
};
const getInstituteTypeLabel = (value) => {
    return getInstituteOwnershipLabel(value) || String(value || '');
};

const renderInstituteLogo = (item, size = 52) => {
    if (item?.logo) {
        return (<Image source={{ uri: item.logo }} resizeMode="cover" style={{
                width: size,
                height: size,
                borderRadius: 16,
            }}/>);
    }

    return (<View className="items-center justify-center" style={{
            width: size,
            height: size,
            borderRadius: 16,
            backgroundColor: `${palette.blue}14`,
            borderWidth: 1,
            borderColor: `${palette.blue}18`,
        }}>
      <Text className="text-[16px] font-black" style={{ color: palette.blue, lineHeight: 20 }}>
        {getInstituteInitials(item?.name)}
      </Text>
    </View>);
};

export default function InstituteScreen() {
    const params = useLocalSearchParams();
    const { preferences } = useAppState();
    const [institutes, setInstitutes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [accessMode, setAccessMode] = useState('preview');
    const [directoryFreeKeys, setDirectoryFreeKeys] = useState(null);
    const [moduleAccessResolved, setModuleAccessResolved] = useState(false);
    const [accessCheckFailed, setAccessCheckFailed] = useState(false);
    const [accessRetryToken, setAccessRetryToken] = useState(0);
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
      const [showFilters, setShowFilters] = useState(false);
const [typeFilter, setTypeFilter] = useState('All');
const [countryFilter, setCountryFilter] = useState('All');
const [stateFilter, setStateFilter] = useState('All');
const [categoryFilter, setCategoryFilter] = useState('All');
const [categories, setCategories] = useState([]);

const [showTypeDropdown, setShowTypeDropdown] = useState(false);
const [typeSearchQuery, setTypeSearchQuery] = useState('');
const [showCountryDropdown, setShowCountryDropdown] = useState(false);
const [countrySearchQuery, setCountrySearchQuery] = useState('');
const [showStateDropdown, setShowStateDropdown] = useState(false);
const [stateSearchQuery, setStateSearchQuery] = useState('');
const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
const [categorySearchQuery, setCategorySearchQuery] = useState('');
    const [searchInstitute, setSearchInstitute] = useState(null);
    const resolvedModuleId = useMemo(() => {
        const parsed = Number(params.moduleId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [params.moduleId]);

    const clearSearchFocus = () => {
        setSearchInstitute(null);
        const moduleParams = params.moduleId ? { moduleId: String(params.moduleId) } : {};
        router.replace({ pathname: '/(drawer)/institute', params: moduleParams });
    };

    useEffect(() => {
        let isMounted = true;

        async function loadInstitutes() {
            try {
                setIsLoading(true);
                setLoadError('');
                const response = await getInstitutes({
                    page,
                    limit: 30,
                    category: categoryFilter,
                    country: countryFilter,
                    state: stateFilter,
                    type: typeFilter,
                });

                if (isMounted) {
                    setInstitutes(response?.items || []);
                    setPagination(response?.pagination || null);
                }
            } catch (_error) {
                if (isMounted) {
                    setInstitutes([]);
                    setLoadError('Failed to load institutes.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadInstitutes();

        return () => {
            isMounted = false;
        };
    }, [categoryFilter, countryFilter, page, stateFilter, typeFilter]);
    useEffect(() => {
        let isMounted = true;

        getCategories()
            .then((response) => {
                if (!isMounted) return;
                const items = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];
                setCategories(items);
            })
            .catch(() => {
                if (isMounted) setCategories([]);
            });

        return () => {
            isMounted = false;
        };
    }, []);
    // Fail closed (same as the user portal and global search): full access only when the server
    // explicitly answers "full". A missing module or a failed check keeps the preview rules
    // (first free institutes only) and offers a retry.
    useEffect(() => {
        let isMounted = true;
        const failClosed = () => {
            if (!isMounted) return;
            setHasFullAccess(false);
            setAccessMode('preview');
            setAccessCheckFailed(true);
            setModuleAccessResolved(true);
        };
        const resolveModuleAccess = async () => {
            try {
                setAccessCheckFailed(false);
                let moduleId = resolvedModuleId;
                if (!Number.isFinite(moduleId)) {
                    const modules = await getModules();
                    const matched = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes('institute'));
                    moduleId = Number(matched?.id);
                }
                if (!Number.isFinite(moduleId)) {
                    failClosed();
                    return;
                }
                const response = await checkModuleAccess(moduleId);
                if (!isMounted) return;
                const mode = String(response?.mode || '').toLowerCase();
                const isFull = response?.allowed !== false && (mode === 'full' || mode === 'unlocked');
                setHasFullAccess(isFull);
                setAccessMode(isFull ? 'full' : (mode === 'locked' || response?.allowed === false) ? 'locked' : 'preview');
                setModuleAccessResolved(true);
            }
            catch {
                failClosed();
            }
        };
        resolveModuleAccess();
        return () => {
            isMounted = false;
        };
    }, [resolvedModuleId, accessRetryToken]);
    // In preview the free institutes are the first ones of the FULL directory (page 1, no
    // filters) - never the first ones of the filtered view - so filtering or pinning a
    // search hit can't unlock an institute.
    useEffect(() => {
        if (accessMode !== 'preview') return undefined;
        let active = true;
        loadPreviewFreeKeys(PREVIEW_MODULES.institutes)
            .then((keys) => {
                if (active) setDirectoryFreeKeys(keys);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [accessMode]);
    const isDefaultDirectoryView = page === 1 && typeFilter === 'All' && countryFilter === 'All' && stateFilter === 'All' && categoryFilter === 'All';
    // Until the directory's first page is known, the unfiltered first page is a safe stand-in.
    const previewFreeKeys = useMemo(
        () => directoryFreeKeys || (isDefaultDirectoryView ? buildFreeKeys(institutes) : null),
        [directoryFreeKeys, isDefaultDirectoryView, institutes]
    );
    // Filter options that narrow each other (same as the user portal): every list only offers
    // values that still have institutes for the OTHER selected filters, in any order.
    const [facets, setFacets] = useState(null);
    useEffect(() => {
        let active = true;
        getInstituteFilters({ category: categoryFilter, country: countryFilter, state: stateFilter, type: typeFilter })
            .then((result) => { if (active) setFacets(result); })
            .catch(() => { if (active) setFacets(null); });
        return () => { active = false; };
    }, [categoryFilter, countryFilter, stateFilter, typeFilter]);
    const countryOptions = useMemo(() => {
        if (!facets) return ['All', 'India', 'Other'];
        const names = facets.countries.map((entry) => normalizeFilterValue(entry.country));
        const options = ['All'];
        if (names.includes('india') || countryFilter === 'India') options.push('India');
        if (names.some((name) => name !== 'india') || countryFilter === 'Other') options.push('Other');
        return options;
    }, [facets, countryFilter]);
    const typeOptions = useMemo(
        () => {
            const all = Array.from(new Map(
                ['Govt', 'Pvt', ...institutes.map((item) => item.type).filter(Boolean)]
                    .map((value) => [normalizeFilterValue(value), value])
            ).values());
            if (!facets) {
                // Keep the common ownership types available even when the current API
                // response is already filtered to one type (for example, Pvt only).
                return ['All', ...all];
            }
            const available = new Set(facets.types.map((entry) => normalizeFilterValue(entry.type)));
            const keep = all.filter((value) =>
                available.has(normalizeFilterValue(value))
                || available.has(normalizeFilterValue(getInstituteTypeLabel(value)))
                || normalizeFilterValue(value) === normalizeFilterValue(typeFilter));
            return ['All', ...keep];
        },
        [institutes, facets, typeFilter]
    );
    const stateOptions = useMemo(() => {
        const selectedCountry = normalizeFilterValue(countryFilter);
        if (facets && selectedCountry !== 'all') {
            const available = new Set(facets.states.map((entry) => normalizeFilterValue(entry.state)));
            const list = selectedCountry === 'india'
                ? INDIA_STATES.filter((name) => available.has(normalizeFilterValue(name)) || normalizeFilterValue(name) === normalizeFilterValue(stateFilter))
                : facets.states.map((entry) => entry.state);
            return ['All', ...list];
        }
        const source = selectedCountry === 'india'
            ? INDIA_STATES
            : Array.from(new Set(institutes
                .filter((item) => selectedCountry === 'other'
                    ? normalizeFilterValue(item.country) !== 'india'
                    : countryFilter !== 'All' && normalizeFilterValue(item.country) === selectedCountry)
                .map((item) => String(item.state || '').replace(/\s+/g, ' ').trim())
                .filter(Boolean)));

        return ['All', ...source];
    }, [countryFilter, institutes, facets, stateFilter]);
    const categoryOptions = useMemo(() => {
        const all = categories.map((item) => ({
            value: String(item?.title || item?.name || item?.id || ''),
            label: String(item?.title || item?.name || item?.id || ''),
        })).filter((item) => item.value);
        if (!facets) return all;
        const available = new Set(facets.categories.map((entry) => normalizeFilterValue(entry.title)));
        return all.filter((item) => available.has(normalizeFilterValue(item.value)) || normalizeFilterValue(item.value) === normalizeFilterValue(categoryFilter));
    }, [categories, facets, categoryFilter]);

function getOptionValue(option) {
    return String(option?.value ?? option?.id ?? option?.label ?? option ?? '');
}
function getOptionLabel(option) {
    return String(option?.label ?? option?.title ?? option?.name ?? option ?? '');
}

const searchableTypeOptions = useMemo(() => {
    const query = typeSearchQuery.trim().toLowerCase();
    const source = typeOptions.filter((o) => o !== 'All');
    if (!query) return source;
    return source.filter((o) => String(o).toLowerCase().includes(query) || getInstituteTypeLabel(o).toLowerCase().includes(query));
}, [typeOptions, typeSearchQuery]);

const searchableCountryOptions = useMemo(() => {
    const query = countrySearchQuery.trim().toLowerCase();
    const source = countryOptions.filter((o) => o !== 'All');
    if (!query) return source;
    return source.filter((o) => String(o).toLowerCase().includes(query));
}, [countryOptions, countrySearchQuery]);

const searchableStateOptions = useMemo(() => {
    const query = stateSearchQuery.trim().toLowerCase();
    const source = stateOptions.filter((o) => o !== 'All');
    if (!query) return source;
    return source.filter((o) => String(o).toLowerCase().includes(query));
}, [stateOptions, stateSearchQuery]);

// A filter change and its page / state reset happen in the same handler, so one tap sends one
// request (resetting from an effect fetched the old page first, then again).
const selectCountry = (value) => {
    setCountryFilter(value);
    setStateFilter('All');
    setStateSearchQuery('');
    setPage(1);
};

const searchableCategoryOptions = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return categoryOptions;
    return categoryOptions.filter((opt) => getOptionLabel(opt).toLowerCase().includes(query));
}, [categoryOptions, categorySearchQuery]);

const animationKey = `institute-list-${typeFilter}-${stateFilter}-${showFilters ? 'filters' : 'plain'}`;
   
    // The server already applies category / country / state / type (with its Govt/Pvt aliases and
    // state spelling variants), so the page is shown as returned - re-filtering it here dropped
    // valid rows and broke the page counts.
    const filtered = institutes;

    // Global search / Career Bee: show the picked institute first. Its lock still follows the
    // full directory's free items, so pinning it to the top never unlocks it.
    const searchFocusActive = useSearchDeepLink(params.searchKey, !isLoading && moduleAccessResolved, () => {
        const instituteId = typeof params.instituteId === 'string'
            ? params.instituteId
            : Array.isArray(params.instituteId) ? String(params.instituteId[0] || '') : '';
        if (!instituteId) {
            return;
        }
        const found = institutes.find((item) => String(item.id) === instituteId);
        if (found) {
            setSearchInstitute(found);
            return;
        }
        getInstituteById(instituteId)
            .then((item) => setSearchInstitute(item || null))
            .catch(() => setSearchInstitute(null));
    });
    const displayedInstitutes = useMemo(() => {
        if (!searchFocusActive || !searchInstitute) {
            return filtered;
        }
        return [searchInstitute, ...filtered.filter((item) => String(item.id) !== String(searchInstitute.id))];
    }, [filtered, searchFocusActive, searchInstitute]);

    useEffect(() => {
        if (categoryFilter !== 'All' && !categoryOptions.some((option) => String(option.value) === String(categoryFilter))) {
            setCategoryFilter('All');
            setPage(1);
        }
    }, [categoryFilter, categoryOptions]);

    return (
        <Screen animationKey={animationKey}>
            <SectionHeader
                title="Institutes"
                subtitle="Institute directory with filters and detail cards based on the reference prototype."
                action={
                    <View className="flex-row gap-2">
                        <AnimatedPressable
                            className={`h-[40px] w-[40px] items-center justify-center rounded-[12px] ${showFilters ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`}
                            onPress={() => setShowFilters((value) => !value)}
                        >
                            <Ionicons name={showFilters ? 'options' : 'options-outline'} size={18} color={showFilters ? '#ffffff' : preferences.darkMode ? '#ffffff' : palette.text}/>
                        </AnimatedPressable>
                      
                    </View>
                }
            />

          {showFilters ? (
    <View className="gap-3">
        {[
            { key: 'type', label: 'All Types', value: typeFilter, show: showTypeDropdown, setShow: setShowTypeDropdown, query: typeSearchQuery, setQuery: setTypeSearchQuery, options: searchableTypeOptions, onSelect: (v) => { setTypeFilter(v); setTypeSearchQuery(''); setShowTypeDropdown(false); }, onClear: () => { setTypeFilter('All'); setTypeSearchQuery(''); setShowTypeDropdown(false); } },
        ].map(() => null)}

        {/* Category */}
        <View className="relative z-10">
            <Pressable
                onPress={() => setShowCategoryDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {categoryFilter !== 'All'
                        ? getOptionLabel(categoryOptions.find((opt) => getOptionValue(opt) === String(categoryFilter))) || 'All Domains'
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
                            <Pressable onPress={() => { clearSearchFocus(); setCategoryFilter('All'); setPage(1); setCategorySearchQuery(''); setShowCategoryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All Domains</Text>
                            </Pressable>
                        ) : null}
                        {searchableCategoryOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No domains found</Text>
                        ) : (
                            searchableCategoryOptions.map((opt) => {
                                const value = getOptionValue(opt);
                                return (
                                    <Pressable key={value} onPress={() => { clearSearchFocus(); setCategoryFilter(value); setPage(1); setCategorySearchQuery(''); setShowCategoryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                        <Text numberOfLines={1} className={`text-[13px] font-semibold ${value === String(categoryFilter) ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{getOptionLabel(opt)}</Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>
 {/* Country */}
        <View className="relative z-10">
            <Pressable
                onPress={() => setShowCountryDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {countryFilter !== 'All' ? countryFilter : 'All Countries'}
                </Text>
                <Ionicons name={showCountryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>
            {showCountryDropdown ? (
                <View className={`mt-2 max-h-[280px] rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
                    <View className="p-2">
                        <TextInput
                            value={countrySearchQuery}
                            onChangeText={setCountrySearchQuery}
                            placeholder="Type to search..."
                            placeholderTextColor={preferences.darkMode ? '#666666' : '#a89a94'}
                            autoFocus
                            className={`rounded-[10px] border px-3 py-2 text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-[#f2ebe6] text-ink'}`}
                        />
                    </View>
                    <ScrollView className="max-h-[220px]" keyboardShouldPersistTaps="handled">
                        {countryFilter !== 'All' ? (
                            <Pressable onPress={() => { clearSearchFocus(); selectCountry('All'); setCountrySearchQuery(''); setShowCountryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All Countries</Text>
                            </Pressable>
                        ) : null}
                        {searchableCountryOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No results found</Text>
                        ) : (
                            searchableCountryOptions.map((opt) => (
                                <Pressable key={opt} onPress={() => { clearSearchFocus(); selectCountry(opt); setCountrySearchQuery(''); setShowCountryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                    <Text numberOfLines={1} className={`text-[13px] font-semibold ${opt === countryFilter ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{opt}</Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>
        {/* State */}
        <View className="relative z-20">
            <Pressable
                disabled={countryFilter === 'All'}
                onPress={() => setShowStateDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${countryFilter === 'All' ? preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] opacity-50' : 'border-line bg-[#f2ebe6] opacity-60' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {stateFilter !== 'All' ? stateFilter : 'All States'}
                </Text>
                <Ionicons name={showStateDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>
            {showStateDropdown && countryFilter !== 'All' ? (
                <View className={`mt-2 max-h-[280px] rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
                    <View className="p-2">
                        <TextInput
                            value={stateSearchQuery}
                            onChangeText={setStateSearchQuery}
                            placeholder="Type to search..."
                            placeholderTextColor={preferences.darkMode ? '#666666' : '#a89a94'}
                            autoFocus
                            className={`rounded-[10px] border px-3 py-2 text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-[#f2ebe6] text-ink'}`}
                        />
                    </View>
                    <ScrollView className="max-h-[220px]" keyboardShouldPersistTaps="handled">
                        {stateFilter !== 'All' ? (
                            <Pressable onPress={() => { clearSearchFocus(); setStateFilter('All'); setPage(1); setStateSearchQuery(''); setShowStateDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All States</Text>
                            </Pressable>
                        ) : null}
                        {searchableStateOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No results found</Text>
                        ) : (
                            searchableStateOptions.map((opt) => (
                                <Pressable key={opt} onPress={() => { clearSearchFocus(); setStateFilter(opt); setPage(1); setStateSearchQuery(''); setShowStateDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                    <Text numberOfLines={1} className={`text-[13px] font-semibold ${opt === stateFilter ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{opt}</Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

       

        {/* Type */}
        <View className="relative z-30">
            <Pressable
                onPress={() => setShowTypeDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {typeFilter !== 'All' ? getInstituteTypeLabel(typeFilter) : 'All Types'}
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
                            <Pressable onPress={() => { clearSearchFocus(); setTypeFilter('All'); setPage(1); setTypeSearchQuery(''); setShowTypeDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All Types</Text>
                            </Pressable>
                        ) : null}
                        {searchableTypeOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No results found</Text>
                        ) : (
                            searchableTypeOptions.map((opt) => (
                                <Pressable key={opt} onPress={() => { clearSearchFocus(); setTypeFilter(opt); setPage(1); setTypeSearchQuery(''); setShowTypeDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                    <Text numberOfLines={1} className={`text-[13px] font-semibold ${opt === typeFilter ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{getInstituteTypeLabel(opt)}</Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

        {(typeFilter !== 'All' || stateFilter !== 'All' || countryFilter !== 'All' || categoryFilter !== 'All') ? (
            <Pressable
                onPress={() => {
                    clearSearchFocus();
                    setTypeFilter('All');
                    setStateFilter('All');
                    setCountryFilter('All');
                    setCategoryFilter('All');
                    setPage(1);
                    setTypeSearchQuery('');
                    setStateSearchQuery('');
                    setCountrySearchQuery('');
                    setCategorySearchQuery('');
                    setShowTypeDropdown(false);
                    setShowStateDropdown(false);
                    setShowCountryDropdown(false);
                    setShowCategoryDropdown(false);
                }}
                className={`items-center rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fdf0ee]'}`}
            >
                <Text className="text-[13px] font-bold text-brand">Clear All Filters</Text>
            </Pressable>
        ) : null}
    </View>
) : null}

            <View className="gap-3">
                {!moduleAccessResolved ? <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Checking access...</Text> : null}
                {moduleAccessResolved && accessCheckFailed ? (
                    <View className={`flex-row items-center justify-between gap-3 rounded-[14px] border px-3 py-3 ${preferences.darkMode ? 'border-red-900 bg-[#241414]' : 'border-red-200 bg-red-50'}`}>
                        <View className="flex-1">
                            <Text className="text-[13px] font-bold text-red-600">{VERIFY_FAILED_HEADING}</Text>
                            <Text className={`mt-0.5 text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{VERIFY_FAILED_MESSAGE}</Text>
                        </View>
                        <Pressable onPress={() => { setModuleAccessResolved(false); setAccessRetryToken((value) => value + 1); }} className="rounded-full bg-brand px-3 py-2">
                            <Text className="text-[12px] font-bold text-white">Retry</Text>
                        </Pressable>
                    </View>
                ) : null}
                {isLoading ? <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading institutes...</Text> : null}
                {!isLoading && loadError ? <Text className="text-[13px] text-brand">{loadError}</Text> : null}
                {!isLoading && !loadError && displayedInstitutes.length === 0 ? (
                    <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No institutes available right now.</Text>
                ) : null}

             {displayedInstitutes.map((item) => {
    const cardUnlocked = hasFullAccess || (accessMode === 'preview' && isPreviewFree(previewFreeKeys, item));
    const ownershipLabel = getInstituteOwnershipLabel(item.type);
    const isGovernment = ownershipLabel === 'Government';
    return (
    <AnimatedPressable 
        key={item.id} 
        className={`flex-row justify-between items-start rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
        onPress={() => {
            if (!cardUnlocked) {
                setShowUnlockSheet(true);
                return;
            }
            if (item.website && item.website !== '#') {
                openExternalUrl(item.website);
            }
        }}
    >
        {/* LEFT COLUMN: Logo & Text details */}
        <View className="flex-1 flex-row gap-3 pr-2">
            <View className="h-[50px] w-[50px] overflow-hidden rounded-[16px]" style={{ backgroundColor: `${palette.primary}12` }}>
                {renderInstituteLogo(item, 50)}
            </View>
            <View className="flex-1 gap-1">
                <Text numberOfLines={2} className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {item.name}
                </Text>
                <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                    {item.location}
                </Text>
            </View>
        </View>

        {/* RIGHT COLUMN: Stretched vertically to force button to the absolute bottom */}
        <View className="self-stretch justify-between items-end pl-2 min-h-[64px]">
           <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: `${cardUnlocked ? palette.green : '#e53935'}18` }}>
                <Ionicons name={cardUnlocked ? 'lock-open' : 'lock-closed'} size={13} color={cardUnlocked ? palette.green : '#e53935'}/>
            </View>
            
            <View className="items-end gap-1.5 mt-4">
                {ownershipLabel ? (
                    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: isGovernment ? '#eaf1ff' : '#fff0e6' }}>
                        <Text className="text-[10px] font-extrabold uppercase" style={{ color: isGovernment ? '#3275d9' : '#d46b18' }}>
                            {ownershipLabel}
                        </Text>
                    </View>
                ) : null}
                <AnimatedPressable
                    onPress={(e) => {
                        e.stopPropagation();
                        if (!cardUnlocked) {
                            setShowUnlockSheet(true);
                            return;
                        }
                        if (item.website && item.website !== '#') {
                            openExternalUrl(item.website);
                        }
                    }}
                    className="px-3 py-1.5"
                >
                    <Text className="text-[10px] font-bold text-brand">
                        Visit Website
                    </Text>
                </AnimatedPressable>
            </View>
        </View>

    </AnimatedPressable>
);})}
            </View>
            {pagination && pagination.totalPages > 1 ? (
                <View className="flex-row items-center justify-center gap-3 py-3">
                    <Pressable
                        disabled={!pagination.hasPreviousPage || isLoading}
                        onPress={() => setPage((value) => Math.max(value - 1, 1))}
                        className={`rounded-full px-4 py-2 ${!pagination.hasPreviousPage || isLoading ? 'bg-[#e8e1de]' : 'bg-brand'}`}
                    >
                        <Ionicons name="chevron-back" size={16} color="#ffffff" />
                    </Pressable>
                    <Text className={`text-[12px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                        Page {pagination.page} of {pagination.totalPages}
                    </Text>
                    <Pressable
                        disabled={!pagination.hasNextPage || isLoading}
                        onPress={() => setPage((value) => value + 1)}
                        className={`rounded-full px-4 py-2 ${!pagination.hasNextPage || isLoading ? 'bg-[#e8e1de]' : 'bg-brand'}`}
                    >
                        <Ionicons name="chevron-forward" size={16} color="#ffffff" />
                    </Pressable>
                </View>
            ) : null}
            {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Institutes" subtitle="Subscribe to more institute cards and links." onClose={() => setShowUnlockSheet(false)} onPress={() => {
                setShowUnlockSheet(false);
                openSubscriptionPrompt({ pathname: '/(drawer)/institute', params: params.moduleId ? { moduleId: String(params.moduleId) } : undefined });
            }}/>) : null}
        </Screen>
    );
}
