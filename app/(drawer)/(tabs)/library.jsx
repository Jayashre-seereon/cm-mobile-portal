import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCareerLibraryCategoriesByStream, getCareerLibraryDetails, getCareerLibraryNext, getCareerLibraryStreams, startCareerLibraryPreview } from '../../../src/api/careerLibraryApi';
import { getCareerLibraryInstitutions, getInstituteFilters } from '../../../src/api/instituteApi';
import { checkModuleAccess, getModules } from '../../../src/api/moduleAccessApi';
import { useAppState } from '../../../src/app-state';
import { Screen, UnlockBottomSheet, mobileAssistantScrollProps } from '../../../src/careermap-ui';
import { palette } from '../../../src/careermap-data';
import { StaggerFadeUpItem } from '../../../src/page-transition';
import { openSubscriptionPrompt } from '../../../src/subscription-flow';
import { useSearchDeepLink } from '../../../src/utils/searchNavigation';
import { openExternalUrl } from '../../../src/utils/openExternalUrl';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'react-native';

const fallbackStreams = [
   ];


function normalizeInstituteItems(value) {
    return toList(value).map((item, index) => {
        if (typeof item === 'string') {
            return {
                id: `institution-${index}`,
                name: item,
                state: '',
                city: '',
                country: '',
                location: item,
                type: '',
                logo: null,
                isTop: false,
                 url: null,   
            };
        }
        const city = typeof item?.city === 'string' ? item.city : item?.city?.name || '';
        const state = typeof item?.state === 'string' ? item.state : item?.state?.name || '';
        const country = item?.countruy || (typeof item?.country === 'string' ? item.country : item?.country?.name) || '';
        const location = [city, state, country].filter(Boolean).join(', ') || item?.location || 'Location not available';
        return {
            id: item?.id ?? `institution-${index}`,
            name: item?.name || 'Institution',
            state,
            city,
            country,
            location,
            type: String(item?.institute_type || item?.type || '').trim(),
            logo: item?.logo || item?.image || null,
            isTop: Boolean(item?.is_top ?? item?.isTop),
            url: getWebsiteUrl(item?.url || item?.website || item?.raw?.url),
            raw: item?.raw || item,
            admissionProcess: stripHtml(item?.admissionProcess || item?.admission_process || item?.raw?.admission_process || ''),
            tentativeDate: item?.tentativeDate || item?.tentative_date || item?.raw?.tentative_date || null,
        };
    });
}
// Website from the field the institute list provides (`url`); null when missing or a '#' placeholder.
function getWebsiteUrl(value) {
    const website = String(value || '').trim();
    if (!website || website === '#') return null;
    return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}
const INDIA_STATE_OPTIONS = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
    'Puducherry', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
];
const normalizeLocationFilter = (value) => String(value || '').trim().toLowerCase();

function InstituteLogo({ uri, color }) {
    const [failed, setFailed] = useState(false);
    if (uri && !failed) {
        return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" onError={() => setFailed(true)}/>;
    }
    return <Ionicons name="business-outline" size={22} color={color}/>;
}

function InstituteResultsSection({ title, scope, region, badge, emptyText, showLocationFilters = true }) {
    const { preferences } = useAppState();
    const darkMode = preferences.darkMode;
    const [filter, setFilter] = useState('all');
    const [country, setCountry] = useState('India');
    const [state, setState] = useState('');
    const [showStateOptions, setShowStateOptions] = useState(false);
    const [institutes, setInstitutes] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retryToken, setRetryToken] = useState(0);
    const requestIdRef = useRef(0);
    const pageSize = 12;

    const [otherStates, setOtherStates] = useState(null);
    // Same as the user portal: states for institutes outside India come from the filters API
    // (every page of the selection), not only from the 12 cards on the current page.
    const otherCountryStates = useMemo(() => {
        if (otherStates) return otherStates;
        return Array.from(new Set(
            institutes
                .filter((item) => normalizeLocationFilter(item.country) !== 'india')
                .map((item) => item.state)
                .filter(Boolean)
        ));
    }, [institutes, otherStates]);

    useEffect(() => {
        if (!showLocationFilters || country !== 'Other') {
            setOtherStates(null);
            return undefined;
        }
        let active = true;
        getInstituteFilters({
            country: 'Other',
            categoryId: scope.categoryId,
            secondcategoryId: scope.secondcategoryId,
            subcategoryId: scope.subcategoryId,
            type: filter === 'govt' ? 'Govt' : filter === 'private' ? 'Pvt' : '',
        })
            .then((result) => {
                if (active) setOtherStates(result.states.map((entry) => entry.state).filter(Boolean));
            })
            .catch(() => {
                if (active) setOtherStates(null);
            });
        return () => { active = false; };
    }, [scope.categoryId, scope.secondcategoryId, scope.subcategoryId, country, filter, showLocationFilters]);

    useEffect(() => {
        let active = true;
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError('');
        getCareerLibraryInstitutions({
            ...scope,
            page,
            limit: pageSize,
            region,
            // India / Other is sent to the server (country=india or excludeCountry=india) so the
            // pages and the page count only cover the chosen side.
            country: showLocationFilters ? country : '',
            state,
            type: filter === 'govt' ? 'Govt' : filter === 'private' ? 'Pvt' : '',
        })
            .then((result) => {
                if (!active || requestId !== requestIdRef.current) return;
                setInstitutes(normalizeInstituteItems(result?.items));
                setPagination(result?.pagination || null);
            })
            .catch((fetchError) => {
                if (!active || requestId !== requestIdRef.current) return;
                setInstitutes([]);
                setPagination(null);
                const serverMessage = fetchError?.response?.data?.message || fetchError?.response?.data?.error;
                const status = fetchError?.response?.status;
                setError(serverMessage || (status ? `Unable to load institutes (error ${status}).` : 'Unable to connect to the institute service. Check your connection and retry.'));
            })
            .finally(() => {
                if (active && requestId === requestIdRef.current) setLoading(false);
            });
        return () => { active = false; };
    }, [scope.categoryId, scope.secondcategoryId, scope.subcategoryId, region, state, filter, country, page, retryToken, showLocationFilters]);

    const totalItems = Number(pagination?.total ?? pagination?.totalCount ?? 0);
    const totalPages = Math.max(1, Number(pagination?.totalPages || Math.ceil(totalItems / pageSize) || 1));
    const formatTentativeDate = (value) => {
        if (!value) return '';
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    // The server already filtered by country, so the page is shown as returned.
    const filtered = institutes;
    const stateOptions = country === 'India' ? INDIA_STATE_OPTIONS : otherCountryStates;
    const controlClass = `flex-row items-center justify-between rounded-[12px] border px-3 py-2.5 ${darkMode ? 'border-[#302a30] bg-[#080808]' : 'border-[#d7c3bc] bg-white'}`;
    const controlTextClass = `text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-ink'}`;

    return (
        <View className={`mb-4 rounded-[20px] border p-4 ${darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
            <View className="mb-3 flex-row items-center gap-2">
                <Ionicons name="school-outline" size={16} color={palette.primary}/>
                <Text className={`flex-1 text-[14px] font-bold ${darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
                {loading ? <Text className="text-[11px] font-semibold" style={{ color: palette.primary }}>Loading…</Text> : null}
            </View>
            {showLocationFilters ? <View className="mb-3 gap-2">
                <View className="flex-row gap-2">
                    <Pressable onPress={() => { setCountry((current) => current === 'India' ? 'Other' : 'India'); setState(''); setPage(1); }} className={`${controlClass} flex-1`}>
                        <Text className={controlTextClass}>{country}</Text><Ionicons name="chevron-down" size={15} color={darkMode ? '#ffffff' : palette.text}/>
                    </Pressable>
                    <Pressable onPress={() => setShowStateOptions((value) => !value)} className={`${controlClass} flex-[2]`}>
                        <Text numberOfLines={1} className={`flex-1 ${controlTextClass}`}>{state || 'All States'}</Text><Ionicons name="chevron-down" size={15} color={darkMode ? '#ffffff' : palette.text}/>
                    </Pressable>
                </View>
                {showStateOptions ? (
                    <View className={`max-h-[220px] rounded-[12px] border ${darkMode ? 'border-[#302a30] bg-[#080808]' : 'border-[#d7c3bc] bg-white'}`}>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            <Pressable onPress={() => { setState(''); setPage(1); setShowStateOptions(false); }} className="border-b px-3 py-2.5" style={{ borderColor: darkMode ? '#302a30' : '#eee2dd' }}>
                                <Text className={`text-[12px] font-semibold ${!state ? 'text-brand' : darkMode ? 'text-white' : 'text-ink'}`}>All States</Text>
                            </Pressable>
                            {stateOptions.map((option) => (
                                <Pressable key={option} onPress={() => { setState(option); setPage(1); setShowStateOptions(false); }} className="border-b px-3 py-2.5" style={{ borderColor: darkMode ? '#302a30' : '#eee2dd' }}>
                                    <Text className={`text-[12px] font-semibold ${normalizeLocationFilter(state) === normalizeLocationFilter(option) ? 'text-brand' : darkMode ? 'text-white' : 'text-ink'}`}>{option}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'govt', label: 'Government' },
                        { key: 'private', label: 'Private' },
                    ].map((option) => {
                        const active = filter === option.key;
                        return <Pressable key={option.key} onPress={() => { setFilter(option.key); setPage(1); }} className={`rounded-full px-3 py-2 ${active ? 'bg-brand' : darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f2ebe6]'}`} style={active ? { backgroundColor: palette.primary } : undefined}><Text className={`text-[11px] font-bold ${active ? 'text-white' : darkMode ? 'text-white' : 'text-ink'}`}>{option.label}</Text></Pressable>;
                    })}
                </View>
            </View> : (
                <View className="mb-3 flex-row flex-wrap gap-2">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'govt', label: 'Government' },
                        { key: 'private', label: 'Private' },
                    ].map((option) => {
                        const active = filter === option.key;
                        return <Pressable key={option.key} onPress={() => { setFilter(option.key); setPage(1); }} className={`rounded-full px-3 py-2 ${active ? 'bg-brand' : darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f2ebe6]'}`} style={active ? { backgroundColor: palette.primary } : undefined}><Text className={`text-[11px] font-bold ${active ? 'text-white' : darkMode ? 'text-white' : 'text-ink'}`}>{option.label}</Text></Pressable>;
                    })}
                </View>
            )}
            {filtered.map((institution, index) => {
                const isGovernment = String(institution.type || '').toLowerCase().includes('gov');
                const tentativeDate = formatTentativeDate(institution.tentativeDate);
                return (
                    <View key={`${institution.id}-${index}`} className={`mb-3 overflow-hidden rounded-[20px] border ${darkMode ? 'border-[#292329] bg-[#0b0b0b]' : 'border-[#f0e4e2] bg-white'}`}>
                        <View className={`flex-row items-center justify-between border-b px-4 py-3 ${darkMode ? 'border-[#292329]' : 'border-[#f7eeec]'}`}>
                            <View className="flex-row items-center gap-2">
                                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isGovernment ? '#2f9367' : '#c9a11d' }}/>
                                <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: darkMode ? '#b7aeb9' : '#a5847c' }}>{isGovernment ? 'Government' : 'Private'}</Text>
                            </View>
                            {badge ? <Text className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: isGovernment ? '#eaf7ef' : '#fdf0ee', color: isGovernment ? '#2f9367' : palette.primary }}>{badge}</Text> : null}
                        </View>
                        <View className="flex-row items-start gap-3 px-4 py-4" style={institution.url ? { paddingRight: 48 } : undefined}>
                            <View className={`h-[56px] w-[56px] items-center justify-center overflow-hidden rounded-[16px] border ${darkMode ? 'border-[#292329] bg-[#111111]' : 'border-[#f0e4e2] bg-[#fffaf8]'}`}>
                                <InstituteLogo uri={institution.logo} color={palette.primary}/>
                            </View>
                            <View className="flex-1">
                                <Text className={`text-[15px] font-black leading-5 ${darkMode ? 'text-white' : 'text-ink'}`}>{institution.name}</Text>
                                <View className="mt-2 flex-row flex-wrap gap-2">
                                    {institution.state ? <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: darkMode ? '#12302d' : '#e9f5f3' }}><Text className="text-[11px] font-semibold" style={{ color: '#0f8a7c' }}>{institution.state}</Text></View> : null}
                                    {institution.city ? <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: darkMode ? '#301b1d' : '#fdf0ee' }}><Text className="text-[11px] font-semibold" style={{ color: palette.primary }}>{institution.city}</Text></View> : null}
                                </View>
                            </View>
                        </View>
                        {institution.admissionProcess || tentativeDate ? <View className={`flex-row flex-wrap gap-2 border-t px-4 py-3 ${darkMode ? 'border-[#292329]' : 'border-[#f7eeec]'}`} style={institution.url ? { paddingRight: 48 } : undefined}>
                            {institution.admissionProcess ? <View className={`min-w-[45%] flex-1 rounded-[12px] px-3 py-2 ${darkMode ? 'bg-[#171313]' : 'bg-[#fff8f4]'}`}><Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#b8837e' }}>Admission Via</Text><Text className={`mt-1 text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-ink'}`}>{institution.admissionProcess}</Text></View> : null}
                            {tentativeDate ? <View className={`min-w-[45%] flex-1 rounded-[12px] px-3 py-2 ${darkMode ? 'bg-[#111923]' : 'bg-[#f7fbff]'}`}><Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6c88a8' }}>Tentative Date</Text><Text className={`mt-1 text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-ink'}`}>{tentativeDate}</Text></View> : null}
                        </View> : null}
                        {institution.url ? (
                            <Pressable
                                onPress={() => { void openExternalUrl(institution.url); }}
                                accessibilityRole="link"
                                accessibilityLabel={`Open ${institution.name} website`}
                                hitSlop={8}
                                className="h-8 w-8 items-center justify-center rounded-full"
                                style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: darkMode ? '#301b1d' : '#fdf0ee' }}
                            >
                                <Ionicons name="arrow-forward" size={15} color={palette.primary}/>
                            </Pressable>
                        ) : null}
                    </View>
                );
            })}
            {!loading && !filtered.length && !error ? <Text className={`py-2 text-[13px] ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{emptyText}</Text> : null}
            {error ? (
                <View className="flex-row items-center justify-between gap-3 py-2">
                    <Text className="flex-1 text-[12px] text-red-500">{error}</Text>
                    <Pressable onPress={() => setRetryToken((value) => value + 1)} className="rounded-full px-3 py-2" style={{ backgroundColor: `${palette.primary}12` }}><Text className="text-[12px] font-bold" style={{ color: palette.primary }}>Retry</Text></Pressable>
                </View>
            ) : null}
            {totalPages > 1 ? (
                <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
                    <Pressable disabled={loading || page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} accessibilityLabel="Previous page" className={`h-9 w-9 items-center justify-center rounded-full border ${darkMode ? 'border-[#3a3037]' : 'border-[#d7c3bc]'}`}>
                        <Ionicons name="chevron-back" size={17} color={loading || page <= 1 ? '#aaa' : palette.primary}/>
                    </Pressable>
                    <Text className={`px-1 text-[11px] font-semibold ${darkMode ? 'text-white' : 'text-ink'}`}>Page {page} of {totalPages}</Text>
                    <Pressable disabled={loading || page >= totalPages} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} accessibilityLabel="Next page" className={`h-9 w-9 items-center justify-center rounded-full border ${darkMode ? 'border-[#3a3037]' : 'border-[#d7c3bc]'}`}>
                        <Ionicons name="chevron-forward" size={17} color={loading || page >= totalPages ? '#aaa' : palette.primary}/>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

const defaultDetail = (name) => ({
    title: name,
    overview: `${name} is a specialized field offering excellent career prospects.`,
    path: ['Step 1', 'Step 2', 'Step 3', 'Career Position'],
    education: 'Relevant degrees required',
    exams: ['Relevant Entrance Exams'],
    jobs: ['Career Options'],
    salary: '₹3-20 LPA',
    institutes: ['Leading Institutes'],
});
const stripHtml = (value) => {
    if (!value) {
        return '';
    }
    return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};
const toList = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    if (!value) {
        return [];
    }
    return [value];
};
const formatCurrencyAmount = (value, currency = 'INR') => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return String(value);
    }

    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(amount);
    }
    catch {
        return `${currency} ${amount.toLocaleString('en-IN')}`;
    }
};
const getMediaType = (url) => {
    if (!url) return null;
    const clean = String(url).split('?')[0].toLowerCase();
    if (/\.(mp4|webm|mov|ogg)$/.test(clean)) return 'video';
    if (/\.(gif)$/.test(clean)) return 'gif';
    if (/\.(jpg|jpeg|png|webp|svg)$/.test(clean)) return 'image';
    return 'image';
};
const formatSalaryRange = (salary) => {
    const currency = salary?.currency || 'INR';
    const minSalary = formatCurrencyAmount(salary?.minSalary, currency);
    const maxSalary = formatCurrencyAmount(salary?.maxSalary, currency);
    const profession = salary?.profession ? `${salary.profession}: ` : '';

    if (minSalary && maxSalary) {
        return `${profession}${minSalary}L to ${maxSalary}L/annum`;
    }

    return `${profession}${minSalary || maxSalary || 'Salary not available'}`;
};
const getSalaryBullets = (salary) => {
    if (!salary) {
        return [];
    }

    return [
        salary?.profession ? `Profession: ${salary.profession}` : '',
        salary?.minSalary ? `Minimum: ${formatCurrencyAmount(salary.minSalary, salary?.currency || 'INR')}` : '',
        salary?.maxSalary ? `Maximum: ${formatCurrencyAmount(salary.maxSalary, salary?.currency || 'INR')}` : '',
        salary?.scope ? `Scope: ${salary.scope}` : '',
        salary?.note || salary?.description || '',
    ].filter(Boolean);
};
const formatDate = (value) => {
    if (!value) {
        return 'Not available';
    }
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return String(value);
    }
    return parsedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};
const getItemTitle = (item) => item?.title || item?.name || item?.subcategory?.title || item?.secondcategory?.name || item?.category?.title || item?.path || item?.examname || item?.pathName || `Item ${item?.id ?? ''}`.trim();
const getDetailTitle = (detail) => detail?.subcategory?.title || detail?.secondcategory?.name || detail?.category?.title || `Career Detail ${detail?.id ?? ''}`.trim();
const getDetailDescription = (detail) => stripHtml(detail?.subcategory?.description || detail?.secondcategory?.description || detail?.category?.description || detail?.subcategory?.specialization || detail?.secondcategory?.specialization || detail?.category?.specialization || '');
const educationIcons = ['school-outline', 'book-outline', 'library-outline', 'document-text-outline', 'ribbon-outline'];
const careerIcons = ['briefcase-outline', 'people-outline', 'albums-outline', 'folder-open-outline', 'sparkles-outline'];
const mixedIcons = [...educationIcons, ...careerIcons];
const hashString = (value) => {
    let hash = 0;
    const input = String(value ?? '');
    for (let index = 0; index < input.length; index += 1) {
        hash = (hash * 31 + input.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
};
const pickIcon = (seed, pool) => pool[hashString(seed) % pool.length];
const getDetailHeaderIcon = (detail) => {
    const seed = detail?.id ?? detail?.subcategory?.id ?? detail?.secondcategory?.id ?? detail?.category?.id ?? detail?.subcategory?.title ?? detail?.secondcategory?.name ?? detail?.category?.title;
    if (detail?.subcategory?.id != null) {
        return pickIcon(seed, educationIcons);
    }
    if (detail?.secondcategory?.id != null) {
        return pickIcon(seed, educationIcons);
    }
    return pickIcon(seed, careerIcons);
};
const getStepIcon = (type, item) => {
    const seed = item?.id ?? item?.title ?? item?.name ?? item?.path ?? `${type}-${item?.id ?? 'x'}`;
    if (type === 'category') {
        return pickIcon(seed, careerIcons);
    }
    if (type === 'second') {
        return pickIcon(seed, educationIcons);
    }
    if (type === 'sub') {
        return pickIcon(seed, mixedIcons);
    }
    if (type === 'preview') {
        return pickIcon(seed, mixedIcons);
    }
    return 'chevron-forward';
};
const getCareerAccessKey = (item) => String(item?.id ?? item?.title ?? item?.name ?? item?.path ?? '');
const getStreamIcon = (streamName) => {
    const normalized = String(streamName || '').toLowerCase();

    if (normalized.includes('science')) {
        return 'flask-outline';
    }
    if (normalized.includes('commerce')) {
        return 'calculator-outline';
    }
    if (normalized.includes('arts')) {
        return 'color-palette-outline';
    }
    if (normalized.includes('vocational')) {
        return 'hammer-outline';
    }
    return 'layers-outline';
};
const getStreamTone = (streamName) => {
    const normalized = String(streamName || '').toLowerCase();

    if (normalized.includes('science')) {
        return palette.blue;
    }
    if (normalized.includes('commerce')) {
        return palette.green;
    }
    if (normalized.includes('arts')) {
        return palette.orange;
    }
    if (normalized.includes('vocational')) {
        return palette.pink;
    }
    return palette.purple;
};

const extractListItems = (html) => {
    if (!html) return [];
    const matches = String(html).match(/<li[^>]*>([\s\S]*?)<\/li>/g) || [];
    if (matches.length > 0) {
        return matches.map((li) => stripHtml(li)).filter(Boolean);
    }
    const plain = stripHtml(html);
    return plain ? [plain] : [];
};

const mapStreamItem = (item, index = 0) => {
    const fallback = fallbackStreams[index % fallbackStreams.length] || fallbackStreams[0];
    const title = item?.name || item?.title || item?.streamName || item?.label || fallback?.name || `Stream ${index + 1}`;
    return {
        id: item?.id ?? item?.streamId ?? index + 1,
        name: title,
        desc: stripHtml(item?.description || item?.desc || item?.about || fallback?.desc || ''),
        icon: getStreamIcon(title),
        tone: getStreamTone(title),
        raw: item,
    };
};
const STREAM_DISPLAY_ORDER = ['Science', 'Commerce', 'Arts & Humanities', 'Neutral', 'Competitive', 'Vocational'];
const normalizeStreamOrderKey = (value) => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/\s+/g, ' ');

    if (normalized === 'arts and humanities') {
        return 'arts and humanities';
    }

    return normalized;
};
const STREAM_ORDER_KEYS = STREAM_DISPLAY_ORDER.map((label) => normalizeStreamOrderKey(label));
const normalizeStreamItems = (items) => {
    const source = Array.isArray(items) && items.length > 0 ? items : fallbackStreams;
    return source
        .map((item, index) => mapStreamItem(item, index))
        .sort((a, b) => {
            const aIndex = STREAM_ORDER_KEYS.indexOf(normalizeStreamOrderKey(a?.name));
            const bIndex = STREAM_ORDER_KEYS.indexOf(normalizeStreamOrderKey(b?.name));
            const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
            const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
            if (safeA !== safeB) {
                return safeA - safeB;
            }
            return String(a?.name || '').localeCompare(String(b?.name || ''));
        });
};
const getCardTitle = (item) => item?.name || item?.title || item?.subcategory?.title || item?.secondcategory?.name || item?.category?.title || item?.path || item?.examname || item?.pathName || `Item ${item?.id ?? ''}`.trim();
const getCardDescription = (item) => stripHtml(item?.desc || item?.description || item?.about || item?.specialization || item?.subcategory?.description || item?.secondcategory?.description || item?.category?.description || item?.path || '');
export default function CareerLibraryScreen() {
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { canAccessFreeDetail, isUnlocked, preferences, registerFreeDetailAccess } = useAppState();
    const [currentLevel, setCurrentLevel] = useState('streams');
    const [selectedStream, setSelectedStream] = useState(null);
    const [streamItems, setStreamItems] = useState(normalizeStreamItems([]));
    const [categories, setCategories] = useState([]);
    const [secondCategories, setSecondCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [details, setDetails] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSecondCategory, setSelectedSecondCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [selectedDetailSource, setSelectedDetailSource] = useState(null);
    const [detailReturnLevel, setDetailReturnLevel] = useState('subcategory');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    // Full access only when the live server check says "full". The accessStatus route param is
    // ignored: anyone can put it in a link, and a tab keeps it after a plan expires.
    const [hasFullAccess, setHasFullAccess] = useState(false);
    // Same default as the user portal: "preview" until the live access check says otherwise. Opened
    // from the menu there are no route params, so starting at "locked" made every category look
    // locked (and skipped the preview session) until the module had been discovered.
    const [moduleStatus, setModuleStatus] = useState('preview');
    const [lockSheetDismissible, setLockSheetDismissible] = useState(true);
    const [isCategoryFree, setIsCategoryFree] = useState(false);
    const [previewSessionId, setPreviewSessionId] = useState(null);
    const [previewRemaining, setPreviewRemaining] = useState(0);
    const [previewExpired, setPreviewExpired] = useState(false);
    const [moduleAccessReady, setModuleAccessReady] = useState(false);
    const [discoveredModuleId, setDiscoveredModuleId] = useState(null);
    const previewIntervalRef = useRef(null);
    const categoryRequestIdRef = useRef(0);
    const resolvedModuleId = useMemo(() => {
        const parsed = Number(params.moduleId);
        return params.moduleId && Number.isFinite(parsed) ? parsed : discoveredModuleId;
    }, [discoveredModuleId, params.moduleId]);
    const instituteScope = useMemo(() => ({
        categoryId: selectedCategory?.id || selectedSecondCategory?.categoryId || selectedSubCategory?.categoryId || selectedDetailSource?.categoryId || '',
        secondcategoryId: selectedSecondCategory?.id || selectedSubCategory?.secondcategoryId || selectedDetailSource?.secondcategoryId || '',
        subcategoryId: selectedSubCategory?.id || selectedDetailSource?.subcategoryId || '',
    }), [selectedCategory?.id, selectedSecondCategory?.id, selectedSecondCategory?.categoryId, selectedSubCategory?.id, selectedSubCategory?.categoryId, selectedSubCategory?.secondcategoryId, selectedDetailSource?.categoryId, selectedDetailSource?.secondcategoryId, selectedDetailSource?.subcategoryId]);

    useEffect(() => {
        if (params.moduleId) return;
        let active = true;
        getModules().then((modules) => {
            const archive = modules.find((module) => {
                const title = String(module?.title || '').trim().toLowerCase();
                return title.includes('career') && (title.includes('archive') || title.includes('library'));
            });
            const id = Number(archive?.id);
            if (active && Number.isFinite(id)) setDiscoveredModuleId(id);
            else if (active) {
                // Module not found: keep the portal's default (preview); the server still decides per page.
                setHasFullAccess(false);
                setModuleAccessReady(true);
            }
        }).catch(() => {
            if (active) {
                setHasFullAccess(false);
                setModuleAccessReady(true);
            }
        });
        return () => { active = false; };
    }, [params.moduleId]);

    const resetToStreams = () => {
        setShowUnlockSheet(false);
        setLockSheetDismissible(true);
        setSelectedStream(null);
        setSelectedCategory(null);
        setSelectedSecondCategory(null);
        setSelectedSubCategory(null);
        setSelectedDetailSource(null);
        setDetails([]);
        setCurrentLevel('streams');
        setDetailReturnLevel('subcategory');
        setIsCategoryFree(false);
        setPreviewSessionId(null);
        setPreviewRemaining(0);
        setPreviewExpired(false);
        if (previewIntervalRef.current) {
            clearInterval(previewIntervalRef.current);
            previewIntervalRef.current = null;
        }
    };
    useEffect(() => {
        let isMounted = true;

        const loadStreams = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await getCareerLibraryStreams();
                const items = Array.isArray(response?.data) ? response.data : [];

                if (isMounted) {
                    setStreamItems(normalizeStreamItems(items));
                }
            }
            catch (_fetchError) {
                if (isMounted) {
                    setError('Unable to load streams right now.');
                    setStreamItems(normalizeStreamItems([]));
                }
            }
            finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadStreams();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!previewRemaining) return;

        previewIntervalRef.current = setInterval(() => {
            setPreviewRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(previewIntervalRef.current);
                    previewIntervalRef.current = null;
                    setPreviewExpired(true);
                    setLockSheetDismissible(false);
                    setShowUnlockSheet(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (previewIntervalRef.current) {
                clearInterval(previewIntervalRef.current);
                previewIntervalRef.current = null;
            }
        };
    }, [previewRemaining]);
    // Leaving a career detail page ends its preview countdown. Otherwise the old timer kept running
    // and ran out while the NEXT detail page was open, locking a page whose own preview had barely
    // started. (A timer that has already expired stays expired: the page is locked as before.)
    const previousLevelRef = useRef(currentLevel);
    useEffect(() => {
        if (previousLevelRef.current === 'details' && currentLevel !== 'details') {
            if (previewIntervalRef.current) {
                clearInterval(previewIntervalRef.current);
                previewIntervalRef.current = null;
            }
            setPreviewRemaining(0);
            setPreviewSessionId(null);
        }
        previousLevelRef.current = currentLevel;
    }, [currentLevel]);
   useEffect(() => {
    let isMounted = true;
    const loadModuleAccess = async () => {
        if (!Number.isFinite(resolvedModuleId)) {
            setModuleAccessReady(false);
            return;
        }
        try {
            const response = await checkModuleAccess(resolvedModuleId);
            if (isMounted && response?.allowed) {
                setModuleStatus(String(response?.mode || 'locked').toLowerCase());
                setHasFullAccess(String(response?.mode || '').toLowerCase() === 'full');
            }
        }
        catch {
            if (isMounted) {
                setHasFullAccess(false);
            }
        }
        finally {
            if (isMounted) {
                setModuleAccessReady(true);
            }
        }
    };
    loadModuleAccess();
    return () => {
        isMounted = false;
    };
}, [resolvedModuleId]);
    useFocusEffect(useCallback(() => {
        if (typeof params.level !== 'string' || !['streams', 'categories', 'secondcategory', 'subcategory', 'details'].includes(params.level)) {
            resetToStreams();
        }
    }, [params.level]));
    useEffect(() => {
        if (typeof params.level === 'string' && ['streams', 'categories', 'secondcategory', 'subcategory', 'details'].includes(params.level)) {
            setCurrentLevel(params.level);
        }
    }, [params.level]);
    const animationKey = `${currentLevel}-${selectedStream?.id ?? 'none'}-${selectedCategory?.id ?? 'none'}-${selectedSecondCategory?.id ?? 'none'}-${selectedSubCategory?.id ?? 'none'}`;
    const detailKey = selectedDetailSource?.id != null ? String(selectedDetailSource.id) : selectedSubCategory?.id != null ? String(selectedSubCategory.id) : null;
    const detailUnlocked = detailKey ? (hasFullAccess || canAccessFreeDetail('career-library', detailKey) || isCategoryFree) : true;
    const returnTarget = useMemo(() => ({
        pathname: '/(drawer)/(tabs)/library',
        params: {
            level: currentLevel,
            streamId: selectedStream?.id,
            categoryId: selectedCategory?.id,
            secondCategoryId: selectedSecondCategory?.id,
            subCategoryId: selectedSubCategory?.id,
        },
    }), [currentLevel, selectedStream, selectedCategory, selectedSecondCategory, selectedSubCategory, isCategoryFree]);
    // Returns { ok, sessionId }. ok:false = the server refused (the unlock sheet is already shown).
    // `force` is for a deep link that has just checked the live access mode itself.
    const createPreviewSession = async (pageType, pageId, item, { force = false } = {}) => {
        if (!force && moduleStatus !== 'preview') {
            return { ok: true, sessionId: null };
        }

        try {
            const preview = await startCareerLibraryPreview({
                moduleId: resolvedModuleId,
                pageType,
                pageId,
            });

            // The server answers HTTP 200 with allowed:false when this content isn't free in preview
            // (its category isn't marked free): show the unlock sheet instead of an empty page.
            if (preview?.allowed === false) {
                setLockSheetDismissible(true);
                setShowUnlockSheet(true);
                return { ok: false, sessionId: null };
            }
            if (String(preview?.mode || '').toLowerCase() === 'full') {
                setModuleStatus('full');
                setHasFullAccess(true);
                return { ok: true, sessionId: null };
            }

            const sessionId = preview?.previewSessionId || preview?.access?.previewSessionId || preview?.access?.sessionId || null;
            if (!sessionId) {
                setLockSheetDismissible(true);
                setShowUnlockSheet(true);
                return { ok: false, sessionId: null };
            }
            setPreviewSessionId(sessionId);
            setPreviewRemaining(preview?.remainingSeconds ?? preview?.access?.remainingSeconds ?? preview?.previewDurationSeconds ?? preview?.access?.previewDurationSeconds ?? 15);
            setPreviewExpired(false);

            return { ok: true, sessionId };
        } catch (err) {
            if (err?.response?.status === 403) {
                setLockSheetDismissible(true);
                setShowUnlockSheet(true);
                return { ok: false, sessionId: null };
            }
            throw err;
        }
    };
    const loadDetailItemsWithPreview = async ({ type, id, item, nextItems, presetPreviewId }) => {
        let previewId = presetPreviewId || null;

        if (!previewId && moduleStatus === 'preview') {
            const gate = await createPreviewSession(type, id, item);
            if (!gate.ok) {
                return null;
            }
            previewId = gate.sessionId;
        }

        let detailItems = nextItems;
        if (detailItems.length === 0) {
            try {
                const detailResponse = await getCareerLibraryDetails(id, resolvedModuleId, previewId);
                const detailData = detailResponse ?? {};
                detailItems = Array.isArray(detailData?.data) ? detailData.data : [];
            } catch (_err) {
                detailItems = [];
            }
        }

        return detailItems;
    };
    const handleClick = async (type, id, item, { previewId: presetPreviewId } = {}) => {
        setLoading(true);
        setError('');
        setSelectedDetailSource(null);
        // Every level shares one request id: a slower answer for an earlier tap is ignored and
        // only the latest tap clears the spinner.
        const requestId = ++categoryRequestIdRef.current;
        const isStale = () => requestId !== categoryRequestIdRef.current;
        if (type === 'stream') {
            setSelectedStream(item);
            setSelectedCategory(null);
            setSelectedSecondCategory(null);
            setSelectedSubCategory(null);
            setDetails([]);
            setCategories([]);
            setCurrentLevel('categories');
            setDetailReturnLevel('streams');
            try {
                let moduleId = resolvedModuleId;
                if (!params.moduleId && !discoveredModuleId) {
                    const modules = await getModules();
                    const archive = modules.find((module) => {
                        const title = String(module?.title || '').trim().toLowerCase();
                        return title.includes('career') && (title.includes('archive') || title.includes('library'));
                    });
                    const discoveredId = Number(archive?.id);
                    if (Number.isFinite(discoveredId)) {
                        moduleId = discoveredId;
                        setDiscoveredModuleId(discoveredId);
                    }
                }
                const response = await getCareerLibraryCategoriesByStream(id, moduleId);
                if (requestId !== categoryRequestIdRef.current) return;
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                setCategories(nextItems);
                setSecondCategories([]);
                setSubCategories([]);
                setDetails([]);
                setCurrentLevel('categories');
            }
            catch (fetchError) {
                if (requestId !== categoryRequestIdRef.current) return;
                const status = fetchError?.response?.status;
                const serverMessage = fetchError?.response?.data?.message || fetchError?.response?.data?.error;
                setCategories([]);
                setError(serverMessage || (status ? `Categories could not be loaded (error ${status}). Tap Retry.` : 'Could not connect to load categories. Check your connection and tap Retry.'));
            }
            finally {
                if (requestId === categoryRequestIdRef.current) setLoading(false);
            }
            return;
        }
        else if (type === 'category') {
            setSelectedCategory(item);
            setDetailReturnLevel('categories');
            const accessTier = String(item?.accessTier || '').toLowerCase();
            setIsCategoryFree(hasFullAccess || accessTier === 'preview' || accessTier === 'full');
            try {
                const response = await getCareerLibraryNext(type, id);
                if (isStale()) return;
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                if (data.type === 'secondcategory') {
                    setSecondCategories(nextItems);
                    setSubCategories([]);
                    setDetails([]);
                    setCurrentLevel('secondcategory');
                }
                else if (data.type === 'details') {
                    const detailItems = await loadDetailItemsWithPreview({ type, id, item, nextItems, presetPreviewId });
                    if (isStale()) return;
                    if (!detailItems) {
                        setLoading(false);
                        return;
                    }
                    setSelectedDetailSource(item);
                    setDetails(detailItems);
                    setCurrentLevel('details');
                    if (item?.id != null) {
                        registerFreeDetailAccess('career-library', String(item.id));
                    }
                }
                else {
                    setSecondCategories(nextItems);
                    setSubCategories([]);
                    setDetails([]);
                    setCurrentLevel('secondcategory');
                }
            }
            catch (_fetchError) {
                if (!isStale()) setError('Unable to load the next step. Please try again.');
            }
            finally {
                if (!isStale()) setLoading(false);
            }
            return;
        }
        else if (type === 'second') {
            setSelectedSecondCategory(item);
            setDetailReturnLevel('secondcategory');
            try {
                const response = await getCareerLibraryNext(type, id);
                if (isStale()) return;
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                if (data.type === 'subcategory') {
                    setSubCategories(nextItems);
                    setDetails([]);
                    setCurrentLevel('subcategory');
                }
                else if (data.type === 'details') {
                    const detailItems = await loadDetailItemsWithPreview({ type, id, item, nextItems, presetPreviewId });
                    if (isStale()) return;
                    if (!detailItems) {
                        setLoading(false);
                        return;
                    }
                    setSelectedDetailSource(item);
                    setDetails(detailItems);
                    setCurrentLevel('details');
                    if (item?.id != null) {
                        registerFreeDetailAccess('career-library', String(item.id));
                    }
                }
                else {
                    setSubCategories(nextItems);
                    setDetails([]);
                    setCurrentLevel('subcategory');
                }
            }
            catch (_fetchError) {
                if (!isStale()) setError('Unable to load the next step. Please try again.');
            }
            finally {
                if (!isStale()) setLoading(false);
            }
            return;
        }
        else if (type === 'sub') {
            setSelectedSubCategory(item);
            setDetailReturnLevel('subcategory');
            try {
                const response = await getCareerLibraryNext(type, id);
                if (isStale()) return;
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                // A specialization always opens its details, whatever type label the API sends, so
                // every answer goes through the same preview gate (session + lock) as 'details'.
                const detailItems = await loadDetailItemsWithPreview({ type, id, item, nextItems, presetPreviewId });
                if (isStale()) return;
                if (!detailItems) {
                    setLoading(false);
                    return;
                }
                setSelectedDetailSource(item);
                setDetails(detailItems);
                setCurrentLevel('details');
                if (item?.id != null) {
                    registerFreeDetailAccess('career-library', String(item.id));
                }
            }
            catch (_fetchError) {
                if (!isStale()) setError('Unable to load the next step. Please try again.');
            }
            finally {
                if (!isStale()) setLoading(false);
            }
            return;
        }
        setLoading(false);
    };
    // Global search / Career Bee: open the stream, category, subfield or specialization that was
    // picked, walking the same steps (and the same preview / lock checks) as tapping through the list.
    const openFromSearch = async () => {
        const searchedType = String(params.searchType || '').toLowerCase();
        // A career-path hit's id is the career path's own id; its details live under its parent.
        // Without a specialization it used to open nothing ("No details available"), so fall back to
        // its second category, then its category (the same parent order the user portal uses).
        const type = searchedType === 'careerpath' && !params.subCategoryId
            ? (params.secondCategoryId ? 'secondcategory' : params.categoryId ? 'category' : searchedType)
            : searchedType;
        const title = typeof params.searchTitle === 'string' ? params.searchTitle : '';
        // A link must pass the same check as a tap, against the live access mode. Locked module ->
        // unlock sheet. In preview the server only starts a preview for categories marked free, so
        // anything under a locked category (2nd category, specialization, career detail) opens the
        // unlock sheet instead of a page.
        // openTarget (global search) checked access just before navigating and passed the result,
        // so reuse it instead of a second round trip (the server still enforces every request).
        const passedStatus = String(params.accessStatus || '').toLowerCase();
        // searchKey is the navigation time, so only a check made moments ago is reused.
        const searchAge = Date.now() - Number(params.searchKey);
        const freshSearchAccess = params.fromGlobalSearch === '1'
            && Number.isFinite(searchAge) && searchAge >= 0 && searchAge < 30000
            && ['unlocked', 'preview'].includes(passedStatus)
            && Number.isFinite(resolvedModuleId)
            && String(params.moduleId) === String(resolvedModuleId);
        const access = freshSearchAccess
            ? { allowed: true, mode: passedStatus === 'unlocked' ? 'full' : 'preview' }
            : Number.isFinite(resolvedModuleId) ? await checkModuleAccess(resolvedModuleId).catch(() => null) : null;
        if (access && access.allowed === false) {
            setModuleStatus('locked');
            setHasFullAccess(false);
            setCurrentLevel('streams');
            setLockSheetDismissible(true);
            setShowUnlockSheet(true);
            return;
        }
        const liveMode = access?.allowed ? String(access.mode || '').toLowerCase() : '';
        if (liveMode) {
            setModuleStatus(liveMode);
            setHasFullAccess(liveMode === 'full');
        }
        const full = liveMode === 'full' || (!liveMode && hasFullAccess);
        const inPreview = !full && (liveMode ? liveMode === 'preview' : moduleStatus === 'preview');
        // The server decides in preview; ok:false means the unlock sheet is already shown.
        const previewGate = async (pageType, pageId, item) => {
            if (!inPreview) return { ok: true, sessionId: null };
            return createPreviewSession(pageType, pageId, item, { force: true });
        };
        const sameId = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);
        const listOf = (response) => (Array.isArray(response?.data) ? response.data : []);
        const findInStream = async (streamId, categoryId) => {
            try {
                const items = listOf(await getCareerLibraryCategoriesByStream(streamId, resolvedModuleId));
                const category = items.find((item) => sameId(item?.id, categoryId));
                return category ? { streamId, items, category } : null;
            }
            catch {
                return null;
            }
        };
        const findCategory = async (categoryId, streamIdHint) => {
            const hasHint = streamIdHint !== undefined && streamIdHint !== null && streamIdHint !== '';
            let hit = hasHint ? await findInStream(streamIdHint, categoryId) : null;
            if (!hit) {
                // No (or wrong) hint: ask every stream at once instead of one after another.
                const others = streamItems.map((stream) => stream?.id)
                    .filter((value) => value !== undefined && value !== null && value !== '' && !sameId(value, streamIdHint));
                hit = (await Promise.all(others.map((streamId) => findInStream(streamId, categoryId)))).find(Boolean) || null;
            }
            if (!hit) return null;
            const stream = streamItems.find((item) => sameId(item?.id, hit.streamId)) || { id: Number(hit.streamId), name: '' };
            setSelectedStream(stream);
            setCategories(hit.items);
            return hit.category;
        };
        const categoryIsFree = (category) => full || ['preview', 'full'].includes(String(category?.accessTier || '').toLowerCase());
        const selectCategory = (category) => {
            setSelectedCategory(category);
            setIsCategoryFree(categoryIsFree(category));
        };
        // Same checks as the category card / step list taps: show the unlock sheet on the list level.
        const showLocked = (level) => {
            setCurrentLevel(level);
            setLockSheetDismissible(true);
            setShowUnlockSheet(true);
        };
        // In preview the server gate below decides; otherwise the same client checks as the list taps.
        const stepUnlocked = (item, category) => full || inPreview || isUnlocked('career-library') || canAccessFreeDetail('career-library', getCareerAccessKey(item)) || categoryIsFree(category);
        if (type === 'stream') {
            const stream = streamItems.find((item) => sameId(item?.id, params.streamId || params.searchId)) || { id: Number(params.streamId || params.searchId), name: title };
            await handleClick('stream', stream.id, stream);
            return;
        }
        if (type === 'category') {
            const categoryId = params.categoryId || params.searchId;
            const category = await findCategory(categoryId, params.streamId);
            const categoryItem = category || { id: Number(categoryId), title, name: title };
            if (category ? !categoryIsFree(category) : !(full || inPreview)) {
                showLocked(category ? 'categories' : 'streams');
                return;
            }
            const gated = await previewGate('category', categoryId, categoryItem);
            if (!gated.ok) {
                setCurrentLevel(category ? 'categories' : 'streams');
                return;
            }
            await handleClick('category', categoryId, categoryItem, { previewId: gated.sessionId });
            if (inPreview) setIsCategoryFree(true);
            return;
        }
        // These lookups don't depend on each other, so run them at the same time.
        const subIdEarly = params.subCategoryId || (type === 'subcategory' ? params.searchId : '');
        const [category, secondNext, subNext] = await Promise.all([
            params.categoryId ? findCategory(params.categoryId, params.streamId) : null,
            params.categoryId && params.secondCategoryId ? getCareerLibraryNext('category', params.categoryId).catch(() => null) : null,
            type !== 'secondcategory' && subIdEarly && params.secondCategoryId ? getCareerLibraryNext('second', params.secondCategoryId).catch(() => null) : null,
        ]);
        if (category) {
            selectCategory(category);
        }
        let secondItem = null;
        if (secondNext?.type === 'secondcategory') {
            setSecondCategories(listOf(secondNext));
            secondItem = listOf(secondNext).find((item) => sameId(item?.id, params.secondCategoryId)) || null;
        }
        if (type === 'secondcategory') {
            const secondId = params.secondCategoryId || params.searchId;
            const second = secondItem || { id: Number(secondId), name: title, title };
            if ((category && !categoryIsFree(category)) || !stepUnlocked(second, category)) {
                showLocked(secondItem ? 'secondcategory' : 'streams');
                return;
            }
            const gated = await previewGate('second', secondId, second);
            if (!gated.ok) {
                setCurrentLevel(secondItem ? 'secondcategory' : 'streams');
                return;
            }
            await handleClick('second', secondId, second, { previewId: gated.sessionId });
            if (inPreview) setIsCategoryFree(true);
            return;
        }
        const subId = params.subCategoryId || (type === 'subcategory' ? params.searchId : '');
        if (!subId) {
            return;
        }
        let subItem = null;
        if (params.secondCategoryId) {
            if (secondItem) {
                setSelectedSecondCategory(secondItem);
            }
            if (subNext?.type === 'subcategory') {
                setSubCategories(listOf(subNext));
                subItem = listOf(subNext).find((item) => sameId(item?.id, subId)) || null;
            }
        }
        const sub = subItem || { id: Number(subId), title, name: title };
        if ((category && !categoryIsFree(category)) || !stepUnlocked(sub, category)) {
            showLocked(subItem ? 'subcategory' : 'streams');
            return;
        }
        const gated = await previewGate('sub', subId, sub);
        if (!gated.ok) {
            setCurrentLevel(subItem ? 'subcategory' : 'streams');
            return;
        }
        await handleClick('sub', subId, sub, { previewId: gated.sessionId });
        if (inPreview) setIsCategoryFree(true);
    };
    // A search result opens its page directly: until openFromSearch finishes, a loader is shown
    // instead of the stream list (which used to flash first, then jump to the details).
    const [searchDoneKey, setSearchDoneKey] = useState(null);
    const pendingSearchKey = typeof params.searchKey === 'string' ? params.searchKey : '';
    const searchPending = Boolean(pendingSearchKey) && pendingSearchKey !== searchDoneKey;
    useEffect(() => {
        if (!searchPending) return undefined;
        // Never hide the archive forever if the search can't be applied (e.g. access never resolves).
        const fallback = setTimeout(() => setSearchDoneKey(pendingSearchKey), 15000);
        return () => clearTimeout(fallback);
    }, [searchPending, pendingSearchKey]);
    useSearchDeepLink(params.searchKey, moduleAccessReady && !loading, () => {
        const key = pendingSearchKey;
        openFromSearch()
            .catch(() => {})
            .finally(() => setSearchDoneKey(key));
    });
    const handleBack = () => {
        if (params.fromGlobalSearch === '1' && router.canGoBack()) {
            router.back();
            return;
        }
        if (currentLevel === 'details') {
            setCurrentLevel(detailReturnLevel);
        }
        else if (currentLevel === 'subcategory') {
            setCurrentLevel('secondcategory');
        }
        else if (currentLevel === 'categories') {
            setCurrentLevel('streams');
        }
        else {
            setCurrentLevel('streams');
        }
    };
    const renderStreamGrid = (items) => (<View className="flex-row flex-wrap gap-3">
      {items.map((item, index) => (<StaggerFadeUpItem key={`stream-${item?.id ?? index}`} index={index} style={{ width: '48%', flexGrow: 0, flexShrink: 0 }}>
          <Pressable onPress={() => {
                handleClick('stream', item?.id, item);
            }} className={`w-full gap-3 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <View className="flex-row items-start justify-between gap-2">
              <View className="h-[44px] w-[44px] items-center justify-center rounded-[16px]" style={{ backgroundColor: `${(item?.tone || getStreamTone(item?.name))}15` }}>
                <Ionicons name={item?.icon || getStreamIcon(item?.name)} size={22} color={item?.tone || getStreamTone(item?.name)}/>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.primary}/>
            </View>
            <View className="gap-1">
              <Text numberOfLines={1} className={`text-[15px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item?.name}</Text>
              <Text numberOfLines={2} className={`text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item?.desc || 'Explore this stream.'}</Text>
            </View>
          </Pressable>
        </StaggerFadeUpItem>))}
    </View>);
    const renderCategoryGrid = (items) => (<View className="gap-3">
      {items.map((item, index) => {
            // Same rule as the user portal: a category is free unless the server marks it "locked"
            // (the server sends "full", "preview" or "locked").
            const accessTier = String(item?.accessTier || '').toLowerCase();
            const unlockedItem = hasFullAccess || accessTier !== 'locked';
            return (<StaggerFadeUpItem key={`category-${item?.id ?? index}`} index={index}>
          <Pressable onPress={() => {
                    if (!hasFullAccess && accessTier === 'locked') {
                        setLockSheetDismissible(true);
                        setShowUnlockSheet(true);
                        return;
                    }
                    handleClick('category', item?.id, item);
                }} className={`w-full flex-row items-center gap-3 rounded-[18px] border px-3 py-3.5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <View className="h-[40px] w-[40px] items-center justify-center rounded-[14px]" style={{ backgroundColor: `${palette.primary}12` }}>
              <Ionicons name={getStepIcon('category', item)} size={20} color={palette.primary}/>
            </View>
            <View className="flex-1">
              <Text className={`text-[14px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{getCardTitle(item)}</Text>
              {getCardDescription(item) ? (<Text numberOfLines={1} className={`mt-0.5 text-[12px] leading-4 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{getCardDescription(item)}</Text>) : null}
            </View>
            <View className="items-end gap-2">
              {/* Same badge as the user portal's category cards: green open lock = open, red lock = locked. */}
              <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: unlockedItem ? '#dcfce7' : '#fee2e2' }}>
                  <Ionicons name={unlockedItem ? 'lock-open-outline' : 'lock-closed-outline'} size={16} color={unlockedItem ? '#15803d' : '#b91c1c'}/>
                </View>
              <Ionicons name="chevron-forward" size={18} color={palette.primary}/>
            </View>
          </Pressable>
        </StaggerFadeUpItem>);
        })}
    </View>);
    const renderStepList = (items, type) => (<View className="gap-3">
      {items.map((item, index) => {
            const accessKey = getCareerAccessKey(item);
            const unlockedItem = hasFullAccess || isUnlocked('career-library') || canAccessFreeDetail('career-library', accessKey) || isCategoryFree;
            return (<StaggerFadeUpItem key={`${type}-${item?.id ?? index}`} index={index}>
          <Pressable onPress={() => {
                    if (!unlockedItem) {
                        setLockSheetDismissible(true);
                        setShowUnlockSheet(true);
                        return;
                    }
                    handleClick(type, item?.id, item);
                }} className={`flex-row items-center rounded-[14px] border p-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <View className={`mr-3 h-10 w-10 items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#fff0e8]'}`}>
              <Ionicons name={getStepIcon(type, item)} size={18} color={palette.primary}/>
            </View>
            <View className="flex-1">
              <Text className={`text-[15px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{getCardTitle(item)}</Text>
              {getCardDescription(item) ? (<Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{getCardDescription(item)}</Text>) : null}
            </View>
            <View className="mr-2 rounded-full px-2 py-1" style={{ backgroundColor: unlockedItem ? `${palette.green}14` : '#f8e8d8' }}>
                <Text className="text-[10px] font-black" style={{ color: unlockedItem ? palette.green : palette.primary }}>{unlockedItem ? 'FREE' : 'LOCK'}</Text>
              </View>
            <Ionicons name="chevron-forward" size={18} color={palette.primary}/>
          </Pressable>
        </StaggerFadeUpItem>);
        })}
    </View>);
    const htmlTagStyles = {
        h1: { fontSize: 16, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
        h2: { fontSize: 15, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
        h3: { fontSize: 14, fontWeight: '800', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 3 },
        p: { marginVertical: 2 },
        li: { marginVertical: 1 },
        strong: { fontWeight: '800' },
        a: { color: palette.primary },
    };
    const renderDetailItem = (detail, index) => {
        const title = getDetailTitle(detail);
        const normalizeArchiveName = (value) => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
        const normalizedStreamName = normalizeArchiveName(selectedStream?.name);
        const hideInstituteSections = normalizedStreamName === 'careerclusters' || (
            normalizedStreamName === 'competitive' && [
                'governmentjobsafter10th',
                'governmentjobsafter12th',
                'governmentjobsaftergraduation',
                'governmentjobsafterpostgraduation',
            ].includes(normalizeArchiveName(title))
        );
        const salaryBullets = toList(detail?.salaryRanges).flatMap((salary) => getSalaryBullets(salary));
        const descriptions = toList(detail?.descriptions);
        const careerPaths = toList(detail?.careerpaths);
        const entranceExams = toList(detail?.entranceexams);
      const specializations = extractListItems(detail?.specialization);
        const specializationHtml = detail?.specialization || '';
        const jobScopes = toList(detail?.jobScope);
        const importantFacts = extractListItems(detail?.important_factor || detail?.importantFacts || detail?.importantfacts || detail?.facts || detail?.keyFacts);
        const importantFactorHtml = detail?.important_factor || detail?.importantFacts || detail?.importantfacts || detail?.facts || detail?.keyFacts || '';
        return (<StaggerFadeUpItem key={`detail-${detail?.id ?? index}`} index={index}>
          <View className="mb-4">
     {detail?.media ? (
  <View className="mb-3 overflow-hidden rounded-[20px]" style={{ height: 180 }}>
  {getMediaType(detail.media) === 'video' ? (
  <Video
    source={{ uri: detail.media }}
    style={{ width: '100%', height: '100%' }}
    resizeMode={ResizeMode.COVER}
    isLooping
    isMuted
    shouldPlay
  />
) : (
      <Image
        source={{ uri: detail.media }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    )}
    <View
      className="absolute inset-x-0 bottom-0 px-4 py-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <Text className="text-[18px] font-black text-white">{title}</Text>
      {getDetailDescription(detail) ? (
        <Text className="mt-0.5 text-[12px] text-white/85" numberOfLines={1}>
          {getDetailDescription(detail)}
        </Text>
      ) : null}
    </View>
  </View>
) : (
  
  <View className="mb-3 flex-row items-start gap-3">
    <View className={`h-[56px] w-[56px] items-center justify-center rounded-[18px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#ffecef]'}`}>
      <Ionicons name={getDetailHeaderIcon(detail)} size={26} color={palette.primary}/>
    </View>
    <View className="flex-1">
      <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      {getDetailDescription(detail) ? (
        <Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
          {getDetailDescription(detail)}
        </Text>
      ) : null}
    </View>
  </View>
)}

{previewRemaining > 0 ? (<View className="mb-3 rounded-[12px] px-3 py-3" style={{ backgroundColor: `${palette.primary}14` }}>
              <Text className="text-[12px] font-semibold" style={{ color: palette.primary }}>
              <Ionicons name="time-outline" size={14} color={palette.primary} className="mr-1"/> Preview active for {previewRemaining}s
              </Text>
            </View>) : null}
{descriptions.length > 0 ? (
  <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
    {descriptions
      .slice()
      .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
      .map((section, sectionIdx, arr) => (
        <View
          key={section?.id ?? sectionIdx}
          className={sectionIdx < arr.length - 1 ? `mb-3 pb-3 border-b ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}` : ''}
        >
          <View className="mb-2 flex-row items-center gap-2">
             <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{section?.title || 'About'}</Text>
          </View>
          {section?.description ? (
        
<RenderHTML
    contentWidth={screenWidth - 64}
    source={{ html: section.description }}
    baseStyle={{
        color: preferences.darkMode ? '#d1d5db' : '#111827',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'justify',
    }}
    tagsStyles={htmlTagStyles}
/>

          ) : null}
        </View>
      ))}
  </View>
) : null}
{careerPaths.length > 0 ? (
 <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
  <View className="mb-3 flex-row items-center gap-2">
    <Ionicons name="map-outline" size={16} color={palette.primary}/>
    <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
      Career Paths{careerPaths.length > 1 ? ` (${careerPaths.length})` : ''}
    </Text>
  </View>

  {careerPaths.map((pathItem, pathIdx) => (
    <View
      key={pathItem?.id ?? pathIdx}
      className={`mb-3 overflow-hidden rounded-[16px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#0b0b0b]' : 'border-[#f0e4e2] bg-[#fdf9f9]'}`}
    >
      {/* Path header */}
      <View className={`flex-row items-center gap-2 border-b px-3 py-2.5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#141414]' : 'border-[#f0e4e2] bg-[#fff0ee]'}`}>
        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: palette.primary }}>
          <Text className="text-[11px] font-black text-white">{pathIdx + 1}</Text>
        </View>
        <Text className={`text-[13px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
          {`Path ${pathIdx + 1}`}
        </Text>
      </View>

      {/* Details grid */}
      <View className="px-3 py-2.5">
        {[
          { label: 'Stream', value: pathItem?.stream || detail?.stream?.name },
          { label: 'Graduation', value: pathItem?.graduation },
          { label: 'After Graduation', value: pathItem?.aftergraduation },
          { label: 'After Post Graduation', value: pathItem?.afterpostgraduation },
          { label: 'Any Other', value: pathItem?.anyother },
        ]
          .filter((row) => row.value)
          .map((row) => (
            <View key={row.label} className="mb-1.5 flex-row items-start gap-3">
              <Text className={`w-[130px] text-[11px] font-semibold ${preferences.darkMode ? 'text-[#f0b0aa]' : 'text-brand'}`}>{row.label}</Text>
              <Text className={`flex-1 text-[12px] leading-4 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{row.value}</Text>
            </View>
          ))}
      </View>
    </View>
  ))}
</View>
) : null}
{entranceExams.length > 0 ? (
<View className={`rounded-[20px] mb-4 border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
  <View className="mb-3 flex-row items-center gap-2">
    <Ionicons name="reader-outline" size={16} color={palette.primary}/>
    <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Entrance Exams</Text>
  </View>
  {entranceExams.map((exam) => (<View key={exam?.id} className="mb-3 flex-row items-center justify-between">
      <View className="flex-1">
        <Text className={`text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{exam?.examname || 'Exam'}</Text>
        <Text className={`text-[12px] ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{[exam?.mode, exam?.duration, formatDate(exam?.exam_date)].filter(Boolean).join(' • ')}</Text>
      </View>
      {exam?.url ? (<Pressable onPress={() => { void openExternalUrl(exam.url); }} className="h-9 w-9 items-center justify-center rounded-full ml-2" style={{ borderWidth: 1, borderColor: '#f0e4e2' }}>
          <Ionicons name="arrow-forward" size={16} color={palette.primary}/>
        </Pressable>) : null}
    </View>))}
</View>
) : null}
           
{specializationHtml ? (
  <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name="star-outline" size={16} color={palette.primary}/>
      <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Specialization</Text>
    </View>
    <RenderHTML
        contentWidth={screenWidth - 64}
        source={{ html: specializationHtml }}
        baseStyle={{ color: preferences.darkMode ? '#d1d5db' : '#111827', fontSize: 13, lineHeight: 20 }}
        tagsStyles={htmlTagStyles}
    />
  </View>
) : null}

{importantFactorHtml ? (
  <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name="checkmark-circle-outline" size={16} color={palette.primary}/>
      <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Important Factors</Text>
    </View>
    <RenderHTML
        contentWidth={screenWidth - 64}
        source={{ html: importantFactorHtml }}
        baseStyle={{ color: preferences.darkMode ? '#b7aeb9' : palette.muted, fontSize: 13, lineHeight: 20 }}
        tagsStyles={htmlTagStyles}
    />
  </View>
) : null}

{jobScopes.length > 0 ? (
  <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name="briefcase-outline" size={16} color={palette.primary}/>
      <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Job Scope</Text>
    </View>
    {jobScopes.map((scope) => (
      <View key={scope} className="mb-2 flex-row items-start">
        <Ionicons name="ellipse" size={6} color={palette.secondary} style={{ marginRight: 8, marginTop: 7 }}/>
        <Text className={`flex-1 text-[13px] leading-5 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{scope}</Text>
      </View>
    ))}
  </View>
) : null}

{toList(detail?.salaryRanges).length > 0 ? (
  <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
    <View className="mb-3 flex-row items-center gap-2">
      <Ionicons name="cash-outline" size={16} color={palette.primary}/>
      <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Salary Range</Text>
    </View>
    <View className="gap-2">
      {toList(detail?.salaryRanges).map((salary, salaryIndex) => (
        <View key={salary?.id ?? salaryIndex} className="flex-row items-start gap-2">
          <Ionicons name="ellipse" size={6} color={palette.primary} style={{ marginTop: 7 }} />
          <Text className="flex-1 text-[15px] font-bold text-brand">
            {formatSalaryRange(salary)}
          </Text>
        </View>
      ))}
    </View>
  </View>
) : null}

{!hideInstituteSections ? <InstituteResultsSection
  title="Institutes outside Odisha"
  scope={instituteScope}
  region="outside"
  badge="Outside Odisha"
  emptyText="No institutes found outside Odisha."
/> : null}
{!hideInstituteSections ? <InstituteResultsSection
  title="Institutes in Odisha"
  scope={instituteScope}
  region="inside"
  badge="Odisha"
  emptyText="No Odisha institutes found for this selection."
  showLocationFilters={false}
/> : null}

        
            
          </View>
        </StaggerFadeUpItem>);
    };
    const getTitle = () => {
        if (currentLevel === 'streams') {
            return 'Career Archive';
        }
        if (currentLevel === 'categories') {
            return selectedStream?.name || 'Career Archive';
        }
        if (currentLevel === 'secondcategory') {
            return getItemTitle(selectedCategory);
        }
        if (currentLevel === 'subcategory') {
            return getItemTitle(selectedSecondCategory);
        }
        if (currentLevel === 'details') {
            return getItemTitle(selectedDetailSource || selectedSubCategory || selectedSecondCategory || selectedCategory);
        }
        return 'Career Archive';
    };
    if (searchPending && !showUnlockSheet) {
        return (<Screen scroll={true} animationKey="search-pending">
          <View className="flex-row items-center">
            <Text className={`text-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{typeof params.searchTitle === 'string' && params.searchTitle ? params.searchTitle : 'Career Archive'}</Text>
          </View>
          <View className="items-center justify-center py-16 gap-3">
            <ActivityIndicator size="large" color={palette.primary}/>
            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading details...</Text>
          </View>
        </Screen>);
    }
    return (<Screen scroll={true} animationKey={animationKey}>
      <View className="flex-row items-center">
        {currentLevel !== 'streams' && (<Pressable onPress={handleBack} className="mr-3 h-10 w-10 items-center justify-center rounded-full">
            <Ionicons name="chevron-back" size={24} color={preferences.darkMode ? '#ffffff' : palette.text}/>
          </Pressable>)}
        <Text className={`text-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{getTitle()}</Text>
      </View>

      {currentLevel === 'streams' ? (<ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-2" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 72, 88) }} showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
          {loading ? (<Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading streams...</Text>) : null}
          {error ? (<Text className="mt-4 text-[13px] font-semibold text-red-500">{error}</Text>) : null}
          {renderStreamGrid(streamItems)}
        </ScrollView>) : currentLevel === 'categories' ? (<ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-2" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 72, 88) }} showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
          {loading ? (<Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading categories...</Text>) : null}
          {error ? (<View className={`mt-4 flex-row items-center justify-between gap-3 rounded-[14px] border px-3 py-3 ${preferences.darkMode ? 'border-red-900 bg-[#241414]' : 'border-red-200 bg-red-50'}`}><Text className="flex-1 text-[13px] font-semibold text-red-600">{error}</Text>{selectedStream ? <Pressable onPress={() => handleClick('stream', selectedStream.id, selectedStream)} className="rounded-full bg-brand px-3 py-2"><Text className="text-[12px] font-bold text-white">Retry</Text></Pressable> : null}</View>) : null}
          {renderCategoryGrid(categories)}
          {!loading && !error && categories.length === 0 ? <Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No categories are available for this stream yet.</Text> : null}
        </ScrollView>) : currentLevel === 'details' ? (<ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-2" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 72, 88) }} showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
          {loading ? (<Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading details...</Text>) : null}
          {error ? (<Text className="mt-4 text-[13px] font-semibold text-red-500">{error}</Text>) : null}
         
          {details.length > 0 ? details.map((detail, index) => renderDetailItem(detail, index)) : !loading ? (<Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No details available for this selection.</Text>) : null}
        </ScrollView>) : (
            <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-2" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 72, 88) }} showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
          {loading ? (<Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading...</Text>) : null}
          {error ? (<Text className="mt-4 text-[13px] font-semibold text-red-500">{error}</Text>) : null}
          {currentLevel === 'secondcategory' && renderStepList(secondCategories, 'second')}
          {currentLevel === 'subcategory' && renderStepList(subCategories, 'sub')}
        </ScrollView>)}
      {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Career Archive" subtitle={previewExpired ? 'Your preview time has ended for this career detail.' : 'Subscribe to more careers, salary insights, education paths, and institute details.'} dismissible={lockSheetDismissible} onClose={resetToStreams} onPress={() => {
                setShowUnlockSheet(false);
                openSubscriptionPrompt(returnTarget);
            }}/>) : null}
    </Screen>);
}
