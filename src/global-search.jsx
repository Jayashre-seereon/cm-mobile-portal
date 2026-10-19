import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { globalSearch } from './api/searchApi';
import { useAppState } from './app-state';
import { palette } from './careermap-data';
import { UnlockBottomSheet } from './careermap-ui';
import { openSubscriptionPrompt } from './subscription-flow';
import { openTarget, resolveSearchTarget } from './utils/searchNavigation';

// Same groups, labels and badges as the web portal's GlobalSearchBar.
const CATEGORY_TABS = [
    { key: 'all', label: 'All' },
    { key: 'careers', label: 'Careers', groupKeys: ['careers', 'careerPaths'], types: ['stream', 'category', 'secondcategory', 'subcategory', 'careerpath'] },
    { key: 'institutions', label: 'Colleges', groupKeys: ['institutions'], types: ['institution', 'college'] },
    { key: 'entranceExams', label: 'Exams', groupKeys: ['entranceExams'], types: ['entranceexam', 'exam'] },
    { key: 'mentors', label: 'Mentors', groupKeys: ['mentors'], types: ['mentor'] },
    { key: 'scholarships', label: 'Scholarships', groupKeys: ['scholarships'], types: ['scholarship'] },
    { key: 'studyAbroad', label: 'Abroad', groupKeys: ['studyAbroad'], types: ['studyabroad'] },
    { key: 'masterclasses', label: 'Videos', groupKeys: ['masterclasses'], types: ['masterclass'] },
    { key: 'quizzes', label: 'Quizzes', groupKeys: ['quizzes'], types: ['quiz'] },
    { key: 'newsletters', label: 'Career Insights', groupKeys: ['newsletters'], types: ['newsletter'] },
];

const RESULT_GROUPS = [
    { key: 'careers', label: 'Careers' },
    { key: 'careerPaths', label: 'Career Paths' },
    { key: 'institutions', label: 'Colleges' },
    { key: 'entranceExams', label: 'Exams' },
    { key: 'mentors', label: 'Mentors' },
    { key: 'scholarships', label: 'Scholarships' },
    { key: 'studyAbroad', label: 'Abroad' },
    { key: 'masterclasses', label: 'Videos' },
    { key: 'quizzes', label: 'Quizzes' },
    { key: 'newsletters', label: 'Career Insights' },
];

const POPULAR_SHORTCUTS = [
    { label: 'Engineering Careers', query: 'Engineering' },
    { label: 'Top Colleges', query: 'Institute' },
    { label: 'Entrance Exams', query: 'Exam' },
    { label: '1-on-1 Mentorship', query: 'Mentor' },
    { label: 'Scholarships', query: 'Scholarship' },
];

const EMPTY_DATA = { total: 0, results: [], grouped: {} };

function getTypeConfig(item = {}) {
    const type = String(item.type || '').toLowerCase();
    const group = String(item.group || '').toLowerCase();

    if (['stream', 'category', 'secondcategory', 'subcategory', 'careerpath'].includes(type) || group === 'careers' || group === 'careerpaths') {
        return { label: item.badge || (type === 'secondcategory' ? 'Subfield' : type === 'stream' ? 'Stream' : type === 'careerpath' ? 'Path' : 'Career'), color: palette.purple };
    }
    if (type === 'institution' || group === 'institutions' || group === 'colleges') {
        return { label: item.badge || 'College', color: palette.blue };
    }
    if (type === 'entranceexam' || group === 'entranceexams' || group === 'exams') {
        return { label: item.badge || 'Exam', color: palette.orange };
    }
    if (type === 'mentor' || group === 'mentors') {
        return { label: item.badge || 'Mentor', color: palette.green };
    }
    if (type === 'scholarship' || group === 'scholarships') {
        return { label: item.badge || 'Scholarship', color: palette.pink };
    }
    if (type === 'studyabroad' || group === 'studyabroad') {
        return { label: item.badge || 'Study Abroad', color: palette.teal };
    }
    if (type === 'masterclass' || group === 'masterclasses') {
        return { label: item.badge || 'Video', color: '#c026d3' };
    }
    if (type === 'quiz' || group === 'quizzes') {
        return { label: item.badge || 'Quiz', color: palette.secondary };
    }
    if (type === 'newsletter' || group === 'newsletters') {
        return { label: item.badge || 'Career Insights', color: '#9a2119' };
    }
    return { label: item.badge || item.type || 'Explore', color: palette.primary };
}

function matchesTab(item, tab) {
    const itemGroup = String(item?.group || '').toLowerCase();
    const itemType = String(item?.type || '').toLowerCase();
    return (tab.groupKeys || []).some((key) => key.toLowerCase() === itemGroup) || (tab.types || []).includes(itemType);
}

function itemsForTab(data, tab) {
    const grouped = data.grouped || {};
    const fromGroups = (tab.groupKeys || []).flatMap((key) => (Array.isArray(grouped[key]) ? grouped[key] : []));
    if (fromGroups.length > 0) {
        return fromGroups;
    }
    return (data.results || []).filter((item) => matchesTab(item, tab));
}

function ResultThumb({ item, color }) {
    const [imageError, setImageError] = useState(false);
    const initial = String(item?.title || '').trim().charAt(0).toUpperCase() || 'C';

    if (item?.image && !imageError) {
        return (<Image source={{ uri: item.image }} onError={() => setImageError(true)} resizeMode="cover" style={{ width: 40, height: 40, borderRadius: 12 }}/>);
    }

    return (<View className="h-10 w-10 items-center justify-center rounded-[12px]" style={{ backgroundColor: color }}>
      <Text className="text-[14px] font-bold text-white">{initial}</Text>
    </View>);
}

export function GlobalSearch({ visible, onClose }) {
    const { preferences } = useAppState();
    const dark = preferences.darkMode;
    const inputRef = useRef(null);
    const requestIdRef = useRef(0);
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [retryNonce, setRetryNonce] = useState(0);
    const [data, setData] = useState(EMPTY_DATA);
    const [openingKey, setOpeningKey] = useState('');
    const [lockedInfo, setLockedInfo] = useState(null);

    // Debounced (300 ms) search. Every new keystroke aborts the previous request and
    // a request id guard drops any response that is not the latest one.
    useEffect(() => {
        const trimmed = query.trim();
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        if (!visible || !trimmed) {
            setIsLoading(false);
            setError('');
            setData(EMPTY_DATA);
            return undefined;
        }

        setIsLoading(true);
        setError('');
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await globalSearch({ query: trimmed, type: 'all', limit: 25, signal: controller.signal });
                if (requestIdRef.current !== requestId) {
                    return;
                }
                if (!response || response.success === false) {
                    setData(EMPTY_DATA);
                    setError(response?.message || 'Search is unavailable right now.');
                } else {
                    const results = Array.isArray(response.results) ? response.results : [];
                    setData({
                        total: typeof response.total === 'number' ? response.total : results.length,
                        results,
                        grouped: response.grouped || {},
                    });
                }
            }
            catch (err) {
                if (controller.signal.aborted || err?.name === 'CanceledError' || err?.name === 'AbortError' || requestIdRef.current !== requestId) {
                    return;
                }
                setData(EMPTY_DATA);
                setError(err?.response?.data?.message || (err?.response ? 'Search is unavailable right now.' : 'Could not reach CareerMap. Check your connection.'));
            }
            finally {
                if (requestIdRef.current === requestId) {
                    setIsLoading(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, visible, retryNonce]);

    useEffect(() => {
        if (!visible) {
            setQuery('');
            setActiveTab('all');
            setOpeningKey('');
        }
    }, [visible]);

    const tabCounts = useMemo(() => {
        const counts = { all: data.results.length };
        CATEGORY_TABS.forEach((tab) => {
            if (tab.key !== 'all') {
                counts[tab.key] = itemsForTab(data, tab).length;
            }
        });
        return counts;
    }, [data]);

    const hasQuery = Boolean(query.trim());
    const visibleTabs = useMemo(() => {
        if (!hasQuery || data.results.length === 0) {
            return CATEGORY_TABS.slice(0, 6);
        }
        return CATEGORY_TABS.filter((tab) => tab.key === 'all' || tabCounts[tab.key] > 0);
    }, [data.results.length, hasQuery, tabCounts]);

    const sections = useMemo(() => {
        if (activeTab === 'all') {
            const grouped = data.grouped || {};
            const fromGroups = RESULT_GROUPS
                .map((group) => ({ ...group, items: Array.isArray(grouped[group.key]) ? grouped[group.key] : [] }))
                .filter((group) => group.items.length > 0);
            if (fromGroups.length > 0 || data.results.length === 0) {
                return fromGroups;
            }
            return [{ key: 'top', label: 'Top Matches', items: data.results }];
        }
        const tab = CATEGORY_TABS.find((entry) => entry.key === activeTab);
        return tab ? [{ key: tab.key, label: tab.label, items: itemsForTab(data, tab) }] : [];
    }, [activeTab, data]);

    useEffect(() => {
        if (activeTab !== 'all' && !visibleTabs.some((tab) => tab.key === activeTab)) {
            setActiveTab('all');
        }
    }, [activeTab, visibleTabs]);

    const resultCount = sections.reduce((sum, section) => sum + section.items.length, 0);

    const handleSelect = async (item, rowKey) => {
        if (openingKey) {
            return;
        }
        setOpeningKey(rowKey);
        try {
            const result = await openTarget(resolveSearchTarget(item), { onLocked: setLockedInfo });
            if (result !== 'locked') {
                onClose?.();
            }
        }
        finally {
            setOpeningKey('');
        }
    };

    const handleClear = () => {
        setQuery('');
        setActiveTab('all');
        inputRef.current?.focus();
    };

    const muted = dark ? 'text-[#b7aeb9]' : 'text-muted';
    const strong = dark ? 'text-white' : 'text-ink';

    const renderRow = (item, index, sectionKey) => {
        const config = getTypeConfig(item);
        const rowKey = `${sectionKey}-${item?.type}-${item?.id ?? item?.title}-${index}`;
        return (<Pressable key={rowKey} accessibilityRole="button" onPress={() => handleSelect(item, rowKey)} className={`flex-row items-center gap-3 rounded-[18px] border p-3 ${dark ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <ResultThumb item={item} color={config.color}/>
        <View className="flex-1 gap-1">
          <Text numberOfLines={1} className={`text-[14px] font-bold ${strong}`}>{item?.title}</Text>
          <View className="flex-row items-center gap-2">
            <View className="rounded-full px-2 py-[2px]" style={{ backgroundColor: `${config.color}18` }}>
              <Text numberOfLines={1} className="text-[10px] font-bold uppercase" style={{ color: config.color }}>{config.label}</Text>
            </View>
            {item?.subtitle || item?.description ? (<Text numberOfLines={1} className={`flex-1 text-[12px] ${muted}`}>{item.subtitle || item.description}</Text>) : null}
          </View>
        </View>
        {openingKey === rowKey ? <ActivityIndicator size="small" color={palette.primary}/> : <Ionicons name="chevron-forward" size={18} color={palette.muted}/>}
      </Pressable>);
    };

    return (<Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView className={`flex-1 ${dark ? 'bg-[#050505]' : 'bg-paper'}`} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View className="flex-row items-center gap-3 px-5 pb-3 pt-3">
            <Pressable accessibilityLabel="Close search" onPress={onClose} className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${dark ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`}>
              <Ionicons name="arrow-back" size={18} color={dark ? '#ffffff' : palette.text}/>
            </Pressable>
            <View className={`h-[42px] flex-1 flex-row items-center gap-2 rounded-[14px] border px-3 ${dark ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
              {isLoading ? <ActivityIndicator size="small" color={palette.primary}/> : <Ionicons name="search" size={16} color={dark ? '#b7aeb9' : palette.muted}/>}
              <TextInput ref={inputRef} value={query} onChangeText={setQuery} autoFocus placeholder="Search careers, colleges, exams, mentors..." placeholderTextColor={dark ? '#666666' : '#a89a94'} returnKeyType="search" autoCorrect={false} autoCapitalize="none" className={`flex-1 text-[13px] ${dark ? 'text-white' : 'text-ink'}`} style={{ paddingVertical: 8 }}/>
              {hasQuery ? (<Pressable accessibilityLabel="Clear search" onPress={handleClear} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={dark ? '#b7aeb9' : palette.muted}/>
                </Pressable>) : null}
            </View>
          </View>

          {hasQuery ? (<View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-2 px-5 pb-3">
                {visibleTabs.map((tab) => {
                    const active = activeTab === tab.key;
                    const count = tabCounts[tab.key] ?? 0;
                    return (<Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} className={`flex-row items-center gap-1.5 rounded-full px-[13px] py-2 ${active ? 'bg-brand' : dark ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`}>
                      <Text className={`text-[12px] font-extrabold ${active ? 'text-white' : strong}`}>{tab.label}</Text>
                      {count > 0 ? <Text className={`text-[10px] font-bold ${active ? 'text-white' : muted}`}>{count}</Text> : null}
                    </Pressable>);
                })}
              </ScrollView>
            </View>) : null}

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="gap-3 px-5 pb-10" showsVerticalScrollIndicator={false}>
            {!hasQuery ? (<View className="gap-2">
                <Text className={`text-[11px] font-extrabold uppercase tracking-[0.8px] ${muted}`}>Popular Categories & Quick Links</Text>
                {POPULAR_SHORTCUTS.map((shortcut) => (<Pressable key={shortcut.label} onPress={() => setQuery(shortcut.query)} className={`flex-row items-center gap-3 rounded-[16px] border p-3 ${dark ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                    <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-brand">
                      <Ionicons name="search" size={14} color="#ffffff"/>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-[13px] font-bold ${strong}`}>{shortcut.label}</Text>
                      <Text className={`text-[11px] ${muted}`}>Search “{shortcut.query}”</Text>
                    </View>
                  </Pressable>))}
              </View>) : null}

            {hasQuery && isLoading && resultCount === 0 && !error ? (<View className="items-center justify-center gap-3 py-10">
                <ActivityIndicator size="large" color={palette.primary}/>
                <Text className={`text-[13px] font-semibold ${muted}`}>Searching the career universe...</Text>
              </View>) : null}

            {hasQuery && !isLoading && error ? (<View className="items-center gap-3 py-10">
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.primary}14` }}>
                  <Ionicons name="cloud-offline-outline" size={22} color={palette.primary}/>
                </View>
                <Text className={`text-center text-[14px] font-bold ${strong}`}>{error}</Text>
                <Pressable onPress={() => setRetryNonce((value) => value + 1)} className="rounded-full bg-brand px-5 py-2.5">
                  <Text className="text-[13px] font-extrabold text-white">Try again</Text>
                </Pressable>
              </View>) : null}

            {hasQuery && !isLoading && !error && resultCount === 0 ? (<View className="items-center gap-2 py-10">
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.primary}14` }}>
                  <Ionicons name="search" size={22} color={palette.primary}/>
                </View>
                <Text className={`text-center text-[14px] font-bold ${strong}`}>No results found for “{query.trim()}”</Text>
                <Text className={`text-center text-[12px] ${muted}`}>Try searching with different keywords like “Engineering”, “Medical”, or “Scholarship”.</Text>
              </View>) : null}

            {hasQuery && !error && resultCount > 0 ? sections.map((section) => (<View key={section.key} className="gap-2">
                <View className="flex-row items-center justify-between pt-1">
                  <Text className={`text-[11px] font-extrabold uppercase tracking-[0.8px] ${muted}`}>{section.label}</Text>
                  <Text className={`text-[11px] font-bold ${muted}`}>{section.items.length} {section.items.length === 1 ? 'result' : 'results'}</Text>
                </View>
                {section.items.map((item, index) => renderRow(item, index, section.key))}
              </View>)) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {lockedInfo ? (<UnlockBottomSheet title={lockedInfo.title} subtitle={lockedInfo.message} onClose={() => setLockedInfo(null)} onPress={() => {
            const returnTarget = lockedInfo.returnTarget;
            setLockedInfo(null);
            onClose?.();
            openSubscriptionPrompt(returnTarget);
        }}/>) : null}
    </Modal>);
}
