import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View ,Linking, useWindowDimensions} from 'react-native';
import RenderHTML from 'react-native-render-html';import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCareerLibraryCategoriesByStream, getCareerLibraryDetails, getCareerLibraryNext, getCareerLibraryStreams, startCareerLibraryPreview } from '../../../src/api/careerLibraryApi';
import { checkModuleAccess } from '../../../src/api/moduleAccessApi';
import { useAppState } from '../../../src/app-state';
import { Screen, UnlockBottomSheet, mobileAssistantScrollProps } from '../../../src/careermap-ui';
import { palette } from '../../../src/careermap-data';
import { StaggerFadeUpItem } from '../../../src/page-transition';
import { openSubscriptionPrompt } from '../../../src/subscription-flow';
import { useSearchDeepLink } from '../../../src/utils/searchNavigation';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'react-native';

const fallbackStreams = [
   ];


const sortTopFirst = (a, b) => Number(b.isTop) - Number(a.isTop);
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
        const city = item?.city || '';
        const state = item?.state || '';
        const country = item?.countruy || item?.country || '';
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
             url: item?.url || null,  
        };
    });
}
function normalizeCountry(value) {
    return String(value || '').trim().toLowerCase();
}
function normalizeState(value) {
    return String(value || '').trim().toLowerCase();
}
function groupInstitutesByTopStatus(value) {
    const institutes = normalizeInstituteItems(value);

    const referenceState = 'Odisha';

    const topInstitutes = institutes.filter(
        (item) =>
            normalizeState(item.state) === normalizeState(referenceState)
    );

    const outsideInstitutes = institutes.filter(
        (item) =>
            normalizeState(item.state) !== normalizeState(referenceState)
    );

    return {
        institutes,
        topInstitutes,
        outsideInstitutes,
        referenceState,
    };
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
    const [selectedInstituteType, setSelectedInstituteType] = useState('All');
    const [selectedInstituteCountry, setSelectedInstituteCountry] = useState('All');
    const [selectedInstituteState, setSelectedInstituteState] = useState('All');
    const [showInstituteCountryDropdown, setShowInstituteCountryDropdown] = useState(false);
    const [showInstituteStateDropdown, setShowInstituteStateDropdown] = useState(false);
    const [detailReturnLevel, setDetailReturnLevel] = useState('subcategory');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const [hasFullAccess, setHasFullAccess] = useState(false);
   const [moduleStatus, setModuleStatus] = useState('locked');
    const [lockSheetDismissible, setLockSheetDismissible] = useState(true);
    const [isCategoryFree, setIsCategoryFree] = useState(false);
    const [previewSessionId, setPreviewSessionId] = useState(null);
    const [previewRemaining, setPreviewRemaining] = useState(0);
    const [previewExpired, setPreviewExpired] = useState(false);
    const [moduleAccessReady, setModuleAccessReady] = useState(false);
    const previewIntervalRef = useRef(null);
    const resolvedModuleId = useMemo(() => {
        const parsed = Number(params.moduleId);
        return Number.isFinite(parsed) ? parsed : 60;
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
   useEffect(() => {
    let isMounted = true;
    const loadModuleAccess = async () => {
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
    const createPreviewSession = async (pageType, pageId, item) => {
        if (moduleStatus !== 'preview') {
            return null;
        }

        try {
            const preview = await startCareerLibraryPreview({
                moduleId: resolvedModuleId,
                pageType,
                pageId,
            });

            setPreviewSessionId(preview?.previewSessionId || preview?.access?.previewSessionId || preview?.access?.sessionId || null);
            setPreviewRemaining(preview?.remainingSeconds ?? preview?.access?.remainingSeconds ?? preview?.previewDurationSeconds ?? preview?.access?.previewDurationSeconds ?? 15);

            return preview?.previewSessionId || preview?.access?.previewSessionId || preview?.access?.sessionId || null;
        } catch (err) {
            if (err?.response?.status === 403) {
                setLockSheetDismissible(true);
                setShowUnlockSheet(true);
                return null;
            }
            throw err;
        }
    };
    const loadDetailItemsWithPreview = async ({ type, id, item, nextItems }) => {
        let previewId = null;

        if (moduleStatus === 'preview') {
            previewId = await createPreviewSession(type, id, item);
            if (!previewId) {
                return null;
            }
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
    const handleClick = async (type, id, item) => {
        setLoading(true);
        setError('');
        setSelectedDetailSource(null);
        if (type === 'stream') {
            setSelectedStream(item);
            setSelectedCategory(null);
            setSelectedSecondCategory(null);
            setSelectedSubCategory(null);
            setDetails([]);
            setCurrentLevel('categories');
            setDetailReturnLevel('streams');
            try {
                const response = await getCareerLibraryCategoriesByStream(id, resolvedModuleId);
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                setCategories(nextItems);
                setSecondCategories([]);
                setSubCategories([]);
                setDetails([]);
                setCurrentLevel('categories');
            }
            catch (_fetchError) {
                setError('Unable to load categories. Please try again.');
            }
            finally {
                setLoading(false);
            }
            return;
        }
        else if (type === 'category') {
            setSelectedCategory(item);
            setDetailReturnLevel('categories');
            const accessTier = String(item?.accessTier || '').toLowerCase();
            setIsCategoryFree(hasFullAccess || accessTier === 'preview');
            try {
                const response = await getCareerLibraryNext(type, id);
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                if (data.type === 'secondcategory') {
                    setSecondCategories(nextItems);
                    setSubCategories([]);
                    setDetails([]);
                    setCurrentLevel('secondcategory');
                }
                else if (data.type === 'details') {
                    const detailItems = await loadDetailItemsWithPreview({ type, id, item, nextItems });
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
                setError('Unable to load the next step. Please try again.');
            }
            finally {
                setLoading(false);
            }
            return;
        }
        else if (type === 'second') {
            setSelectedSecondCategory(item);
            setDetailReturnLevel('secondcategory');
            try {
                const response = await getCareerLibraryNext(type, id);
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                if (data.type === 'subcategory') {
                    setSubCategories(nextItems);
                    setDetails([]);
                    setCurrentLevel('subcategory');
                }
                else if (data.type === 'details') {
                    const detailItems = await loadDetailItemsWithPreview({ type, id, item, nextItems });
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
                setError('Unable to load the next step. Please try again.');
            }
            finally {
                setLoading(false);
            }
            return;
        }
        else if (type === 'sub') {
            setSelectedSubCategory(item);
            setDetailReturnLevel('subcategory');
            try {
                const response = await getCareerLibraryNext(type, id);
                const data = response ?? {};
                const nextItems = Array.isArray(data?.data) ? data.data : [];
                if (data.type === 'details') {
                    const detailItems = await loadDetailItemsWithPreview({ type, id, item, nextItems });
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
                else if (nextItems.length > 0) {
                    setSelectedDetailSource(item);
                    setDetails(nextItems);
                    setCurrentLevel('details');
                    if (item?.id != null) {
                        registerFreeDetailAccess('career-library', String(item.id));
                    }
                }
                else {
                    setSelectedDetailSource(item);
                    setDetails([]);
                    setCurrentLevel('details');
                    if (item?.id != null) {
                        registerFreeDetailAccess('career-library', String(item.id));
                    }
                }
            }
            catch (_fetchError) {
                setError('Unable to load the next step. Please try again.');
            }
            finally {
                setLoading(false);
            }
            return;
        }
        setLoading(false);
    };
    // Global search / Career Bee: open the stream, category, subfield or specialization that was
    // picked, walking the same steps (and the same preview / lock checks) as tapping through the list.
    const openFromSearch = async () => {
        const type = String(params.searchType || '').toLowerCase();
        const title = typeof params.searchTitle === 'string' ? params.searchTitle : '';
        const sameId = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);
        const listOf = (response) => (Array.isArray(response?.data) ? response.data : []);
        const findCategory = async (categoryId, streamIdHint) => {
            const streamIds = [streamIdHint, ...streamItems.map((stream) => stream?.id)]
                .filter((value, index, all) => value !== undefined && value !== null && value !== '' && all.findIndex((other) => String(other) === String(value)) === index);
            for (const streamId of streamIds) {
                try {
                    const items = listOf(await getCareerLibraryCategoriesByStream(streamId, resolvedModuleId));
                    const category = items.find((item) => sameId(item?.id, categoryId));
                    if (category) {
                        const stream = streamItems.find((item) => sameId(item?.id, streamId)) || { id: Number(streamId), name: '' };
                        setSelectedStream(stream);
                        setCategories(items);
                        return category;
                    }
                }
                catch {
                    // try the next stream
                }
            }
            return null;
        };
        const categoryIsFree = (category) => hasFullAccess || String(category?.accessTier || '').toLowerCase() === 'preview';
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
        const stepUnlocked = (item, category) => hasFullAccess || isUnlocked('career-library') || canAccessFreeDetail('career-library', getCareerAccessKey(item)) || categoryIsFree(category);
        if (type === 'stream') {
            const stream = streamItems.find((item) => sameId(item?.id, params.streamId || params.searchId)) || { id: Number(params.streamId || params.searchId), name: title };
            await handleClick('stream', stream.id, stream);
            return;
        }
        if (type === 'category') {
            const categoryId = params.categoryId || params.searchId;
            const category = await findCategory(categoryId, params.streamId);
            if (!categoryIsFree(category)) {
                showLocked(category ? 'categories' : 'streams');
                return;
            }
            await handleClick('category', categoryId, category || { id: Number(categoryId), title, name: title });
            return;
        }
        const category = params.categoryId ? await findCategory(params.categoryId, params.streamId) : null;
        if (category) {
            selectCategory(category);
        }
        let secondItem = null;
        if (params.categoryId && params.secondCategoryId) {
            try {
                const next = await getCareerLibraryNext('category', params.categoryId);
                if (next?.type === 'secondcategory') {
                    setSecondCategories(listOf(next));
                    secondItem = listOf(next).find((item) => sameId(item?.id, params.secondCategoryId)) || null;
                }
            }
            catch {
                secondItem = null;
            }
        }
        if (type === 'secondcategory') {
            const secondId = params.secondCategoryId || params.searchId;
            const second = secondItem || { id: Number(secondId), name: title, title };
            if (!stepUnlocked(second, category)) {
                showLocked(secondItem ? 'secondcategory' : 'streams');
                return;
            }
            await handleClick('second', secondId, second);
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
            try {
                const next = await getCareerLibraryNext('second', params.secondCategoryId);
                if (next?.type === 'subcategory') {
                    setSubCategories(listOf(next));
                    subItem = listOf(next).find((item) => sameId(item?.id, subId)) || null;
                }
            }
            catch {
                subItem = null;
            }
        }
        const sub = subItem || { id: Number(subId), title, name: title };
        if (!stepUnlocked(sub, category)) {
            showLocked(subItem ? 'subcategory' : 'streams');
            return;
        }
        await handleClick('sub', subId, sub);
    };
    useSearchDeepLink(params.searchKey, moduleAccessReady && !loading, () => {
        void openFromSearch();
    });
    const handleBack = () => {
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
            const accessTier = String(item?.accessTier || '').toLowerCase();
            const unlockedItem = hasFullAccess || accessTier === 'preview';
            return (<StaggerFadeUpItem key={`category-${item?.id ?? index}`} index={index}>
          <Pressable onPress={() => {
                    if (!hasFullAccess && accessTier !== 'preview') {
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
              <View className="rounded-full px-2 py-1" style={{ backgroundColor: unlockedItem ? `${palette.green}14` : '#f8e8d8' }}>
                  <Text className="text-[10px] font-black" style={{ color: unlockedItem ? palette.green : palette.primary }}>{unlockedItem ? 'FREE' : 'LOCK'}</Text>
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
        const instituteGroups = groupInstitutesByTopStatus(detail?.institutions);
        const salaryBullets = toList(detail?.salaryRanges).flatMap((salary) => getSalaryBullets(salary));
        const instituteTypeFilter = String(selectedInstituteType || 'All').trim().toLowerCase();
        const descriptions = toList(detail?.descriptions);
        const careerPaths = toList(detail?.careerpaths);
        const entranceExams = toList(detail?.entranceexams);
      const specializations = extractListItems(detail?.specialization);
        const specializationHtml = detail?.specialization || '';
        const jobScopes = toList(detail?.jobScope);
        const importantFacts = extractListItems(detail?.important_factor || detail?.importantFacts || detail?.importantfacts || detail?.facts || detail?.keyFacts);
        const importantFactorHtml = detail?.important_factor || detail?.importantFacts || detail?.importantfacts || detail?.facts || detail?.keyFacts || ''; const countryOptions = ['All', 'India', 'Other'];
        const outsideInstitutes = instituteGroups.outsideInstitutes;
        const stateOptions = selectedInstituteCountry === 'India'
            ? ['All', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep']
            : selectedInstituteCountry === 'Other'
                ? ['All', ...Array.from(new Set(outsideInstitutes.filter((institution) => normalizeCountry(institution?.country || institution?.countruy) === 'other').map((institution) => institution?.state).filter(Boolean)))]
                : ['All', ...Array.from(new Set(outsideInstitutes.map((institution) => institution?.state).filter(Boolean)))];
      const filteredTopInstitutes = instituteGroups.topInstitutes.filter((institution) => {
    if (!instituteTypeFilter || instituteTypeFilter === 'all') {
        return true;
    }
    return String(institution?.type || '').trim().toLowerCase().includes(instituteTypeFilter);
}).sort(sortTopFirst);
      const filteredOutsideInstitutes = outsideInstitutes.filter((institution) => {
    const country = normalizeCountry(institution?.country || institution?.countruy);
    if (selectedInstituteCountry === 'India' && country !== 'india') {
        return false;
    }
    if (selectedInstituteCountry === 'Other' && country !== 'other') {
        return false;
    }
    if (selectedInstituteState !== 'All' && normalizeState(institution?.state) !== normalizeState(selectedInstituteState)) {
        return false;
    }
    if (!instituteTypeFilter || instituteTypeFilter === 'all') {
        return true;
    }
    if (!String(institution?.type || '').trim().toLowerCase().includes(instituteTypeFilter)) {
        return false;
    }
    return true;
}).sort(sortTopFirst);
        const hasFilteredOutsideInstitutes = filteredOutsideInstitutes.length > 0;
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
          {pathItem?.path?.pathtype || pathItem?.pathName || `Path ${pathIdx + 1}`}
        </Text>
      </View>

      {/* Details grid */}
      <View className="px-3 py-2.5">
        {[
          { label: 'Stream', value: detail?.stream?.name },
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
      {exam?.url ? (<Pressable onPress={() => Linking.openURL(exam.url)} className="h-9 w-9 items-center justify-center rounded-full ml-2" style={{ borderWidth: 1, borderColor: '#f0e4e2' }}>
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
{instituteGroups.topInstitutes.length > 0 || instituteGroups.outsideInstitutes.length > 0 ? (
            <View className={`mb-4 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
              <View className="mb-3 flex-row items-center gap-2">
                <Ionicons name="school-outline" size={16} color={palette.primary}/>
                <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Top Institutes</Text>
              </View>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {['All', 'Government', 'Private'].map((type) => {
                  const active = selectedInstituteType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setSelectedInstituteType(type)}
                      className={`rounded-full px-3 py-1.5 ${active ? 'bg-brand' : preferences.darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f2ebe6]'}`}
                    >
                      <Text className={`text-[11px] font-bold ${active ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View className="gap-4">
                  {filteredOutsideInstitutes.length > 0 ? (<View>
    <View className="mb-3 gap-2">
      <View className="relative z-20">
        <Pressable
          onPress={() => setShowInstituteCountryDropdown((value) => !value)}
          className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
        >
          <Text className={`text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
            {selectedInstituteCountry === 'All' ? 'All Countries' : selectedInstituteCountry}
          </Text>
          <Ionicons name={showInstituteCountryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text}/>
        </Pressable>
        {showInstituteCountryDropdown ? (
          <View className={`mt-2 overflow-hidden rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
            {countryOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setSelectedInstituteCountry(option);
                  setSelectedInstituteState('All');
                  setShowInstituteCountryDropdown(false);
                }}
                className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
              >
          <Text className={`text-[13px] font-semibold ${normalizeCountry(selectedInstituteCountry) === normalizeCountry(option) ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{option}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <View className="relative z-10">
        <Pressable
          onPress={() => setShowInstituteStateDropdown((value) => !value)}
          className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
        >
          <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
            {selectedInstituteState === 'All' ? 'All States' : selectedInstituteState}
          </Text>
          <Ionicons name={showInstituteStateDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text}/>
        </Pressable>
        {showInstituteStateDropdown ? (
          <View className={`mt-2 max-h-[220px] overflow-hidden rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {stateOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSelectedInstituteState(option);
                    setShowInstituteStateDropdown(false);
                  }}
                  className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                >
                  <Text className={`text-[13px] font-semibold ${normalizeState(selectedInstituteState) === normalizeState(option) ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{option}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
    <Text className={`mb-2 text-[12px] font-black uppercase tracking-[1px] ${preferences.darkMode ? 'text-[#f0b0aa]' : 'text-brand'}`}>
      {instituteGroups.referenceState ? `Institutes In INDIA` : 'Top Institutes Outside State'}
    </Text>
    {filteredOutsideInstitutes.map((institution) => (<View key={institution?.id} className="mb-3 flex-row items-center gap-3 rounded-[14px] border border-[#f0e4e2] bg-white px-3 py-3">
        <View className="h-[48px] w-[48px] overflow-hidden rounded-[12px]" style={{ backgroundColor: `${palette.primary}12` }}>
          {institution?.logo ? (<Image source={{ uri: institution.logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover"/>) : (<View className="flex-1 items-center justify-center">
              <Ionicons name="business-outline" size={20} color={palette.primary}/>
            </View>)}
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={`shrink text-[14px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{institution?.name || 'Institution'}</Text>
            {institution?.type ? (<View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${palette.primary}12` }}>
                <Text className="text-[10px] font-bold" style={{ color: palette.primary }}>{institution.type}</Text>
              </View>) : null}
          </View>
          <Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{institution?.location || 'Location not available'}</Text>
        </View>
        {institution?.url ? (<Pressable onPress={() => Linking.openURL(institution.url)} className="h-9 w-9 items-center justify-center rounded-full" style={{ borderWidth: 1, borderColor: '#f0e4e2' }}>
            <Ionicons name="arrow-forward" size={16} color={palette.primary}/>
          </Pressable>) : null}
      </View>))}
  </View>) : null}
            {filteredTopInstitutes.length > 0 ? (<View>
    <Text className={`mb-2 text-[12px] font-black uppercase tracking-[1px] ${preferences.darkMode ? 'text-[#f0b0aa]' : 'text-brand'}`}>
      {instituteGroups.referenceState ? `Institutes in ${instituteGroups.referenceState}` : 'Top Institutes'}
    </Text>
    {filteredTopInstitutes.map((institution) => (<View key={institution?.id} className="mb-3 flex-row items-center gap-3 rounded-[14px] border border-[#f0e4e2] bg-[#fdf9f9] px-3 py-3">
        <View className="h-[48px] w-[48px] overflow-hidden rounded-[12px]" style={{ backgroundColor: `${palette.primary}12` }}>
          {institution?.logo ? (<Image source={{ uri: institution.logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover"/>) : (<View className="flex-1 items-center justify-center">
              <Ionicons name="business-outline" size={20} color={palette.primary}/>
            </View>)}
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={`shrink text-[14px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{institution?.name || 'Institution'}</Text>
            {institution?.type ? (<View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${palette.primary}12` }}>
                <Text className="text-[10px] font-bold" style={{ color: palette.primary }}>{institution.type}</Text>
              </View>) : null}
          </View>
          <Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{institution?.location || 'Location not available'}</Text>
        </View>
        {institution?.url ? (<Pressable onPress={() => Linking.openURL(institution.url)} className="h-9 w-9 items-center justify-center rounded-full" style={{ borderWidth: 1, borderColor: '#f0e4e2' }}>
            <Ionicons name="arrow-forward" size={16} color={palette.primary}/>
          </Pressable>) : null}
      </View>))}
  </View>) : null}
           
            {!hasFilteredOutsideInstitutes ? (<View className="items-center gap-2 rounded-[16px] border border-dashed border-[#f0e4e2] bg-[#fffaf8] px-4 py-5">
                <Ionicons name="alert-circle-outline" size={22} color={palette.primary}/>
                <Text className={`text-center text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                  No institutes found for the selected state.
                </Text>
                <Pressable
                  onPress={() => setSelectedInstituteState('All')}
                  className="flex-row items-center gap-1 rounded-full px-3 py-2"
                  style={{ backgroundColor: `${palette.primary}12` }}
                >
                  <Ionicons name="close-circle-outline" size={16} color={palette.primary}/>
                  <Text className="text-[12px] font-bold" style={{ color: palette.primary }}>
                    Clear state filter
                  </Text>
                </Pressable>
              </View>) : null}
                {!filteredTopInstitutes.length && !filteredOutsideInstitutes.length ? (<Text className={`text-[13px] ${preferences.darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Institution details not available.</Text>) : null}
              </View>
            </View>
) : null}
        
            
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
          {error ? (<Text className="mt-4 text-[13px] font-semibold text-red-500">{error}</Text>) : null}
          {renderCategoryGrid(categories)}
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
