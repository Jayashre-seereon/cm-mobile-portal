import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { getCategories, getInstituteById, getInstitutes } from '../../src/api/instituteApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { AnimatedPressable, Screen, SectionHeader, UnlockBottomSheet } from '../../src/careermap-ui';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';

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
    const [moduleAccessResolved, setModuleAccessResolved] = useState(false);
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
    useEffect(() => {
        let isMounted = true;
        const resolveModuleAccess = async () => {
            try {
                let moduleId = resolvedModuleId;
                if (!Number.isFinite(moduleId)) {
                    const modules = await getModules();
                    const matched = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes('institute'));
                    moduleId = Number(matched?.id);
                }
                if (!Number.isFinite(moduleId)) {
                    if (isMounted) {
                        setHasFullAccess(true);
                        setModuleAccessResolved(true);
                    }
                    return;
                }
                const response = await checkModuleAccess(moduleId);
                if (!isMounted) return;
                setHasFullAccess(String(response?.mode || '').toLowerCase() === 'full');
                setModuleAccessResolved(true);
            }
            catch {
                if (isMounted) {
                    setHasFullAccess(true);
                    setModuleAccessResolved(true);
                }
            }
        };
        resolveModuleAccess();
        return () => {
            isMounted = false;
        };
    }, [resolvedModuleId]);
    const countryOptions = useMemo(() => {
        return ['All', 'India', 'Other'];
    }, []);
    const typeOptions = useMemo(
        () => ['All', ...Array.from(new Set(institutes.map((item) => item.type).filter(Boolean)))],
        [institutes]
    );
    const stateOptions = useMemo(() => {
        const selectedCountry = normalizeFilterValue(countryFilter);
        const source = selectedCountry === 'india'
            ? INDIA_STATES
            : Array.from(new Set(institutes
                .filter((item) => selectedCountry === 'other'
                    ? normalizeFilterValue(item.country) !== 'india'
                    : countryFilter !== 'All' && normalizeFilterValue(item.country) === selectedCountry)
                .map((item) => String(item.state || '').replace(/\s+/g, ' ').trim())
                .filter(Boolean)));

        return ['All', ...source];
    }, [countryFilter, institutes]);
    const categoryOptions = useMemo(() => categories.map((item) => ({
        value: String(item?.title || item?.name || item?.id || ''),
        label: String(item?.title || item?.name || item?.id || ''),
    })).filter((item) => item.value), [categories]);

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
    return source.filter((o) => String(o).toLowerCase().includes(query));
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

useEffect(() => {
    setStateFilter('All');
    setStateSearchQuery('');
    setPage(1);
}, [countryFilter]);

useEffect(() => {
    setPage(1);
}, [categoryFilter, stateFilter, typeFilter]);

const searchableCategoryOptions = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return categoryOptions;
    return categoryOptions.filter((opt) => getOptionLabel(opt).toLowerCase().includes(query));
}, [categoryOptions, categorySearchQuery]);

const animationKey = `institute-list-${typeFilter}-${stateFilter}-${showFilters ? 'filters' : 'plain'}`;
   
    const filtered = useMemo(() => {
        let source = [...institutes];

        if (countryFilter !== 'All') {
            source = source.filter((item) => normalizeFilterValue(countryFilter) === 'other'
                ? normalizeFilterValue(item.country) !== 'india'
                : normalizeFilterValue(item.country) === normalizeFilterValue(countryFilter));
        }

        if (typeFilter !== 'All') {
            source = source.filter((item) => normalizeFilterValue(item.type) === normalizeFilterValue(typeFilter));
        }

        if (stateFilter !== 'All') {
            source = source.filter((item) => normalizeFilterValue(item.state) === normalizeFilterValue(stateFilter));
        }

        if (categoryFilter !== 'All') {
            source = source.filter((item) => {
                const category = item.categoryObj || item.category;
                const categoryId = item.categoryId ?? category?.id ?? category;
                const categoryName = item.categoryName || category?.title || category?.name || category;
                return String(categoryId) === String(categoryFilter) || normalizeFilterValue(categoryName) === normalizeFilterValue(categoryFilter);
            });
        }

        return source;
    }, [categoryFilter, institutes, countryFilter, stateFilter, typeFilter]);

    // Global search / Career Bee: show the picked institute first. Its lock still follows its
    // position in the normal list (or stays locked if it is not on this page).
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

        {/* Type */}
        <View className="relative z-30">
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
                            <Pressable onPress={() => { setTypeFilter('All'); setTypeSearchQuery(''); setShowTypeDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All Types</Text>
                            </Pressable>
                        ) : null}
                        {searchableTypeOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No results found</Text>
                        ) : (
                            searchableTypeOptions.map((opt) => (
                                <Pressable key={opt} onPress={() => { setTypeFilter(opt); setTypeSearchQuery(''); setShowTypeDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                    <Text numberOfLines={1} className={`text-[13px] font-semibold ${opt === typeFilter ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{opt}</Text>
                                </Pressable>
                            ))
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
                            <Pressable onPress={() => { setCountryFilter('All'); setCountrySearchQuery(''); setShowCountryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All Countries</Text>
                            </Pressable>
                        ) : null}
                        {searchableCountryOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No results found</Text>
                        ) : (
                            searchableCountryOptions.map((opt) => (
                                <Pressable key={opt} onPress={() => { setCountryFilter(opt); setCountrySearchQuery(''); setShowCountryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
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
                            <Pressable onPress={() => { setStateFilter('All'); setStateSearchQuery(''); setShowStateDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All States</Text>
                            </Pressable>
                        ) : null}
                        {searchableStateOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No results found</Text>
                        ) : (
                            searchableStateOptions.map((opt) => (
                                <Pressable key={opt} onPress={() => { setStateFilter(opt); setStateSearchQuery(''); setShowStateDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                    <Text numberOfLines={1} className={`text-[13px] font-semibold ${opt === stateFilter ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{opt}</Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

       

        {/* Category */}
        <View className="relative z-10">
            <Pressable
                onPress={() => setShowCategoryDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {categoryFilter !== 'All'
                        ? getOptionLabel(categoryOptions.find((opt) => getOptionValue(opt) === String(categoryFilter))) || 'All Categories'
                        : 'All Categories'}
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
                            <Pressable onPress={() => { setCategoryFilter('All'); setCategorySearchQuery(''); setShowCategoryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                <Text className="text-[13px] font-bold text-brand">All Categories</Text>
                            </Pressable>
                        ) : null}
                        {searchableCategoryOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No categories found</Text>
                        ) : (
                            searchableCategoryOptions.map((opt) => {
                                const value = getOptionValue(opt);
                                return (
                                    <Pressable key={value} onPress={() => { setCategoryFilter(value); setCategorySearchQuery(''); setShowCategoryDropdown(false); }} className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}>
                                        <Text numberOfLines={1} className={`text-[13px] font-semibold ${value === String(categoryFilter) ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{getOptionLabel(opt)}</Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

        {(typeFilter !== 'All' || stateFilter !== 'All' || countryFilter !== 'All' || categoryFilter !== 'All') ? (
            <Pressable
                onPress={() => {
                    setTypeFilter('All');
                    setStateFilter('All');
                    setCountryFilter('All');
                    setCategoryFilter('All');
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
                {isLoading ? <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading institutes...</Text> : null}
                {!isLoading && loadError ? <Text className="text-[13px] text-brand">{loadError}</Text> : null}
                {!isLoading && !loadError && displayedInstitutes.length === 0 ? (
                    <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No institutes available right now.</Text>
                ) : null}

             {displayedInstitutes.map((item) => {
    const index = filtered.findIndex((entry) => String(entry.id) === String(item.id));
    const cardUnlocked = hasFullAccess || (index !== -1 && index < 4);
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
                Linking.openURL(item.website);
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
            
            <AnimatedPressable
                onPress={(e) => {
                    e.stopPropagation();
                    if (!cardUnlocked) {
                        setShowUnlockSheet(true);
                        return;
                    }
                    if (item.website && item.website !== '#') {
                        Linking.openURL(item.website);
                    }
                }}
                className="px-3 py-1.5  mt-4"
            >
                <Text className="text-[10px] font-bold text-brand">
                    Visit Website
                </Text>
            </AnimatedPressable>
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
                        <Text className="text-[12px] font-bold text-white">Previous</Text>
                    </Pressable>
                    <Text className={`text-[12px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                        Page {pagination.page} of {pagination.totalPages}
                    </Text>
                    <Pressable
                        disabled={!pagination.hasNextPage || isLoading}
                        onPress={() => setPage((value) => value + 1)}
                        className={`rounded-full px-4 py-2 ${!pagination.hasNextPage || isLoading ? 'bg-[#e8e1de]' : 'bg-brand'}`}
                    >
                        <Text className="text-[12px] font-bold text-white">Next</Text>
                    </Pressable>
                </View>
            ) : null}
            {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Institutes" subtitle="Subscribe to more institute cards and links." onClose={() => setShowUnlockSheet(false)} onPress={() => setShowUnlockSheet(false)}/>) : null}
        </Screen>
    );
}
