import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, DeviceEventEmitter, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askChatbot, flowChatbot, getChatbotConfig } from './api/chatbotApi';
import { useAppState } from './app-state';
import { BeeMascot } from './bee-mascot';
import { palette } from './careermap-data';
import { UnlockBottomSheet } from './careermap-ui';
import { useAuthStore } from './store/auth-store';
import { openSubscriptionPrompt } from './subscription-flow';
import { getPreviewAccessKind, loadPreviewFreeKeys, resolvePreviewAccess } from './utils/previewAccess';
import { getResultSubtitle } from './utils/searchResultSubtitle';
import {
    ALWAYS_FREE_PREVIEW_MODULES,
    ROUTE_PREVIEW_MODULE,
    loadDashboardModulesByRoute,
    normalizeAccessStatus,
    openTarget,
    resolvePageTarget,
    resolveSearchTarget,
} from './utils/searchNavigation';

// Fallbacks used until (or if) GET /api/chatbot/config answers.
const DEFAULT_GREETING = "Hey! I'm Career Bee. Ask me anything about careers, exams, streams, scholarships, or support.";
const DEFAULT_MAX_LENGTH = 1000;
const DEFAULT_MENU_PROMPT = "Alright, let's get started! What do you want to know more about?";
// Guided-flow entry points (same as the server's MAIN_MENU_OPTIONS), used until /config answers.
const DEFAULT_MENU = [
    { label: 'Entrance Exam', step: 'browse', params: { m: 'exam' } },
    { label: 'Institutes', step: 'browse', params: { m: 'institute' } },
    { label: 'Scholarship', step: 'browse', params: { m: 'scholarship' } },
    { label: 'Quiz', step: 'browse', params: { m: 'quiz' } },
    { label: 'Career Archive', step: 'career.streams', params: {} },
    { label: 'Career Psychometric Assessment', step: 'psychometric', params: {} },
    { label: 'Book Your Mentor', step: 'browse', params: { m: 'mentor' } },
    { label: 'Career & Personality Videos', step: 'browse', params: { m: 'video' } },
    { label: 'Study Abroad', step: 'browse', params: { m: 'abroad' } },
    { label: 'Career Insights', step: 'browse', params: { m: 'newsletter' } },
    { label: 'Subscriptions', step: 'plans', params: {} },
    { label: 'Help & Support', step: 'help', params: {} },
];
// Navigation / extra actions shown as small pills under the choices.
const NAV_OPTION = /^(main menu|back|show more|other help topics|change filters|narrow down\b.*|about\b.*)$/i;
const COUNT_LABEL = /^(.*\S)\s*\((\d[\d,]*)\)$/;
const ALL_LABEL = /^(all\b|both\b)/i;

function splitCount(label) {
    const match = label.match(COUNT_LABEL);
    return match ? { text: match[1], count: Number(match[2].replace(/,/g, '')).toLocaleString('en-IN') } : { text: label, count: null };
}

function navIconName(label) {
    if (/^back$/i.test(label)) return 'arrow-back';
    if (/^main menu$/i.test(label)) return 'home-outline';
    if (/^show more$/i.test(label)) return 'chevron-down';
    if (/^(change filters|narrow down)/i.test(label)) return 'options-outline';
    if (/^about\b/i.test(label)) return 'information-circle-outline';
    return null;
}

/**
 * The answer choices for a question: a 2-column grid for a few short choices, a tidy
 * list with counts (and a search box when long) for domains / states / categories,
 * and small Back / Show more / Main menu pills underneath.
 */
function ChatOptions({ options, onChoose, themed }) {
    const [query, setQuery] = useState('');
    const choices = options.filter((option) => !NAV_OPTION.test(option.label));
    const navs = options.filter((option) => NAV_OPTION.test(option.label));
    const grid = choices.length <= 12 && choices.every((option) => option.label.length <= 26 && !COUNT_LABEL.test(option.label));
    const needle = query.trim().toLowerCase();
    const shown = needle ? choices.filter((option) => option.label.toLowerCase().includes(needle)) : choices;

    return (
        <View style={{ marginTop: 10, gap: 8, alignSelf: 'stretch' }}>
            {choices.length && grid ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 }}>
                    {choices.map((option, index) => (
                        <Pressable
                            key={`opt-${option.step}-${index}`}
                            onPress={() => onChoose(option)}
                            style={({ pressed }) => ({ width: '49%', minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: pressed ? palette.primary : themed.chipBorder, backgroundColor: pressed ? themed.chipBg : themed.sheet, paddingHorizontal: 10, paddingVertical: 8 })}
                        >
                            <Text style={{ flex: 1, color: themed.text, fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{option.label}</Text>
                            <Ionicons name="chevron-forward" size={12} color={themed.muted} />
                        </Pressable>
                    ))}
                </View>
            ) : null}
            {choices.length && !grid ? (
                <View style={{ borderRadius: 12, borderWidth: 1, borderColor: themed.sheetBorder, backgroundColor: themed.sheet, overflow: 'hidden' }}>
                    {choices.length > 8 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: themed.sheetBorder, backgroundColor: themed.sheetSubtle, paddingHorizontal: 10 }}>
                            <Ionicons name="search" size={13} color={themed.muted} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder={`Search ${choices.length} options`}
                                placeholderTextColor={themed.muted}
                                style={{ flex: 1, color: themed.text, fontSize: 12.5, paddingVertical: Platform.OS === 'ios' ? 8 : 5 }}
                            />
                        </View>
                    ) : null}
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
                        {shown.map((option, index) => {
                            const { text, count } = splitCount(option.label);
                            const all = ALL_LABEL.test(text);
                            return (
                                <Pressable
                                    key={`opt-${option.step}-${index}`}
                                    onPress={() => onChoose(option)}
                                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderTopColor: themed.sheetBorder, backgroundColor: pressed || all ? themed.chipBg : 'transparent' })}
                                >
                                    <Text style={{ flex: 1, color: all ? palette.primary : themed.text, fontSize: 12.5, fontWeight: all ? '800' : '600' }}>{text}</Text>
                                    {count ? (
                                        <View style={{ borderRadius: 999, backgroundColor: themed.inputBg, paddingHorizontal: 8, paddingVertical: 2 }}>
                                            <Text style={{ color: themed.muted, fontSize: 10.5, fontWeight: '700' }}>{count}</Text>
                                        </View>
                                    ) : null}
                                    <Ionicons name="chevron-forward" size={12} color={themed.muted} />
                                </Pressable>
                            );
                        })}
                        {!shown.length ? <Text style={{ color: themed.muted, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>{`No option matches "${query}".`}</Text> : null}
                    </ScrollView>
                </View>
            ) : null}
            {navs.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {navs.map((option, index) => {
                        const icon = navIconName(option.label);
                        return (
                            <Pressable
                                key={`nav-${option.step}-${index}`}
                                onPress={() => onChoose(option)}
                                style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: themed.sheetBorder, backgroundColor: themed.sheet, paddingHorizontal: 10, paddingVertical: 5 }}
                            >
                                {icon ? <Ionicons name={icon} size={11} color={themed.muted} /> : null}
                                <Text style={{ color: themed.muted, fontSize: 11, fontWeight: '700' }}>{option.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
}

// Result-card badge, same groups as the web chat (Career / College / Exam ...).
function getLinkBadge(item = {}) {
    const type = String(item.type || '').toLowerCase();
    const group = String(item.group || '').toLowerCase();
    const has = (types, groups) => types.includes(type) || groups.includes(group);
    if (has(['stream', 'category', 'secondcategory', 'subcategory', 'careerpath', 'career'], ['careers'])) return { label: item.badge || 'Career', color: '#7e22ce', bg: '#faf5ff' };
    if (has(['institution', 'college', 'institute'], ['institutions', 'colleges'])) return { label: item.badge || 'College', color: '#1d4ed8', bg: '#eff6ff' };
    if (has(['entranceexam', 'exam'], ['entranceexams', 'exams'])) return { label: item.badge || 'Exam', color: '#b45309', bg: '#fffbeb' };
    if (has(['mentor'], ['mentors'])) return { label: item.badge || 'Mentor', color: '#047857', bg: '#ecfdf5' };
    if (has(['scholarship'], ['scholarships'])) return { label: item.badge || 'Scholarship', color: '#be123c', bg: '#fff1f2' };
    if (has(['studyabroad'], ['studyabroad'])) return { label: item.badge || 'Study Abroad', color: '#0e7490', bg: '#ecfeff' };
    if (has(['masterclass'], ['masterclasses'])) return { label: item.badge || 'Video', color: '#a21caf', bg: '#fdf4ff' };
    if (has(['quiz'], ['quizzes'])) return { label: item.badge || 'Quiz', color: '#854d0e', bg: '#fefce8' };
    if (has(['newsletter'], ['newsletters'])) return { label: item.badge || 'Career Insights', color: palette.primary, bg: '#fef2f2' };
    return { label: item.badge || item.type || 'Explore', color: palette.primary, bg: '#fdf0ee' };
}

/** Keeps only well-formed option chips: { label, step, params }. */
function normalizeOptions(options) {
    if (!Array.isArray(options)) {
        return [];
    }
    return options
        .filter((option) => option && typeof option.label === 'string' && option.label.trim() && typeof option.step === 'string')
        .slice(0, 40)
        .map((option) => ({ label: option.label.trim(), step: option.step, params: option.params && typeof option.params === 'object' ? option.params : {} }));
}

const welcomeMessage = (greeting, menuPrompt = DEFAULT_MENU_PROMPT, menu = DEFAULT_MENU) => ({
    id: 'welcome',
    role: 'assistant',
    text: `${greeting}\n\n${menuPrompt}`,
    greeting,
    options: menu,
});

// Light formatting for replies: paragraphs, "- " bullets, "1. " numbered lines and **bold**.
function renderInline(line, keyPrefix) {
    return String(line).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => (/^\*\*[^*]+\*\*$/.test(part)
        ? <Text key={`${keyPrefix}-${index}`} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>
        : part));
}

function FormattedReply({ text, color }) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    lines.forEach((rawLine, index) => {
        const line = rawLine.trimEnd();
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (!line.trim()) {
            blocks.push(<View key={`gap-${index}`} style={{ height: 6 }}/>);
        }
        else if (bullet || numbered) {
            blocks.push(<View key={`li-${index}`} style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ color, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{bullet ? '•' : `${numbered[1]}.`}</Text>
                <Text style={{ flex: 1, color, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{renderInline(bullet ? bullet[1] : numbered[2], `li-${index}`)}</Text>
              </View>);
        }
        else {
            blocks.push(<Text key={`p-${index}`} style={{ color, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{renderInline(line, `p-${index}`)}</Text>);
        }
    });
    return <View>{blocks}</View>;
}

function toHistory(messages) {
    return messages
        .filter((message) => (message.role === 'user' || message.role === 'assistant') && message.id !== 'welcome' && !message.notice && message.text)
        .map((message) => ({ role: message.role, content: String(message.text).slice(0, 2000) }))
        .slice(-20);
}

export function CareerBeeAssistant({ hidden = false }) {
    const { preferences } = useAppState();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [open, setOpen] = useState(false);
    const [scrollHidden, setScrollHidden] = useState(false);
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState([welcomeMessage(DEFAULT_GREETING)]);
    const [maxLength, setMaxLength] = useState(DEFAULT_MAX_LENGTH);
    const [enabled, setEnabled] = useState(true);
    const [sending, setSending] = useState(false);
    const [lockedInfo, setLockedInfo] = useState(null);
    // Dashboard module access by route, and preview modules' free items: cards show Locked / Free like search.
    const [moduleAccess, setModuleAccess] = useState(null);
    const [freeKeys, setFreeKeys] = useState({});
    const configRequestedRef = useRef(false);
    const scrollRef = useRef(null);
    const sessionKey = useAuthStore((state) => (state.hasAuthenticatedSession ? String(state.user?.id ?? state.user?.email ?? 'user') : 'guest'));
    const bubbleScale = useRef(new Animated.Value(1)).current;
   
    const sheetAnim = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    const themed = useMemo(() => ({
        launcherShadow: preferences.darkMode ? '#000000' : '#6e1730',
        sheet: preferences.darkMode ? '#090909' : '#ffffff',
        sheetBorder: preferences.darkMode ? '#2d0f18' : '#eadadf',
        sheetHeader: preferences.darkMode ? '#2a0613' : '#b41d36',
        sheetSubtle: preferences.darkMode ? '#101010' : '#fff7f9',
        text: preferences.darkMode ? '#ffffff' : palette.text,
        muted: preferences.darkMode ? '#b8a9b0' : palette.muted,
        inputBg: preferences.darkMode ? '#141414' : '#f5eff1',
        chipBg: preferences.darkMode ? '#140c0f' : '#fff7f9',
        chipBorder: preferences.darkMode ? '#5c1b30' : '#efb9c9',
    }), [preferences.darkMode]);

    const animateBubble = (value) => {
        Animated.spring(bubbleScale, {
            toValue: value,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
    };

    // The conversation lives for the app session and is cleared when the user logs out or changes.
    useEffect(() => {
        setMessages((current) => [current[0]?.id === 'welcome' ? current[0] : welcomeMessage(DEFAULT_GREETING)]);
        setDraft('');
        setModuleAccess(null);
        setFreeKeys({});
    }, [sessionKey]);

    const loadConfig = async () => {
        if (configRequestedRef.current) {
            return;
        }
        configRequestedRef.current = true;
        try {
            const config = await getChatbotConfig();
            const menu = normalizeOptions(config?.menu);
            if (config?.greeting || menu.length) {
                const welcome = welcomeMessage(
                    config?.greeting || DEFAULT_GREETING,
                    typeof config?.menuPrompt === 'string' && config.menuPrompt.trim() ? config.menuPrompt : DEFAULT_MENU_PROMPT,
                    menu.length ? menu : DEFAULT_MENU,
                );
                setMessages((current) => (current[0]?.id === 'welcome' ? [welcome, ...current.slice(1)] : current));
            }
            if (Number(config?.maxMessageLength) > 0) {
                setMaxLength(Number(config.maxMessageLength));
            }
            setEnabled(config?.enabled !== false);
        }
        catch {
            // keep the built-in greeting and menu
        }
    };

    // The main menu for this user (live module list, lock on locked modules) and module access.
    const refreshMenu = async () => {
        try {
            const data = await flowChatbot({ step: 'menu' });
            const menu = normalizeOptions(data?.options);
            if (menu.length) {
                setMessages((current) => (current[0]?.id === 'welcome'
                    ? [{ ...current[0], options: menu }, ...current.slice(1)]
                    : current));
            }
        }
        catch {
            // keep the current menu
        }
        if (sessionKeyRef.current !== 'guest') {
            loadDashboardModulesByRoute().then(setModuleAccess).catch(() => setModuleAccess(null));
        }
    };

    const openSheet = () => {
        void loadConfig().then(refreshMenu);
        setOpen(true);
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setOpen(false);
            }
        });
    };

    // Tracks the account the open conversation belongs to, so a reply that
    // arrives after logout / account switch is dropped instead of shown to the next user.
    const sessionKeyRef = useRef(sessionKey);
    sessionKeyRef.current = sessionKey;

    // A typed question goes to /ask; a tapped option chip runs its guided-flow step.
    const ask = async (message, history, option = null) => {
        const askedFor = sessionKeyRef.current;
        setSending(true);
        try {
            const data = option
                ? await flowChatbot({ step: option.step, params: option.params })
                : await askChatbot({ message, history });
            if (sessionKeyRef.current !== askedFor) {
                return;
            }
            setMessages((current) => [...current, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                text: String(data?.reply || 'Sorry, I could not find an answer to that. Please try asking in a different way.'),
                links: Array.isArray(data?.links) ? data.links.slice(0, 8) : [],
                pages: Array.isArray(data?.pages) ? data.pages.slice(0, 4) : [],
                options: normalizeOptions(data?.options),
            }]);
        }
        catch (error) {
            if (sessionKeyRef.current !== askedFor) {
                return;
            }
            const status = error?.response?.status;
            const serverMessage = error?.response?.data?.message;
            if (status === 429 || status === 400) {
                setMessages((current) => [...current, {
                    id: `notice-${Date.now()}`,
                    role: 'assistant',
                    notice: true,
                    text: serverMessage || (status === 429 ? 'You are sending messages too quickly. Please wait a moment and try again.' : 'Please check your message and try again.'),
                }]);
            }
            else if (error?.response) {
                setMessages((current) => [...current, {
                    id: `notice-${Date.now()}`,
                    role: 'assistant',
                    notice: true,
                    text: serverMessage || 'Career Bee is unavailable right now. Please try again.',
                    retry: { message, history, option },
                }]);
            }
            else {
                setMessages((current) => [...current, {
                    id: `notice-${Date.now()}`,
                    role: 'assistant',
                    notice: true,
                    text: 'Could not reach Career Bee. Check your connection and try again.',
                    retry: { message, history, option },
                }]);
            }
        }
        finally {
            setSending(false);
        }
    };

    const sendMessage = (text) => {
        const message = text.trim().slice(0, maxLength);
        if (!message || sending || !enabled) {
            return;
        }
        const history = toHistory(messages);
        const userEntry = { id: `user-${Date.now()}`, role: 'user', text: message };
        setMessages((current) => [...current, userEntry]);
        setDraft('');
        void ask(message, history);
    };

    const chooseOption = (option) => {
        if (!option || sending) {
            return;
        }
        setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: option.label }]);
        void ask(option.label, [], option);
    };

    // Start over: keep only the welcome message (with the menu).
    const newChat = () => {
        if (sending) {
            return;
        }
        setMessages((current) => [current[0]?.id === 'welcome' ? current[0] : welcomeMessage(DEFAULT_GREETING)]);
        setDraft('');
    };

    const retryMessage = (entry) => {
        if (sending || !entry?.retry) {
            return;
        }
        setMessages((current) => current.filter((item) => item.id !== entry.id));
        void ask(entry.retry.message, entry.retry.history, entry.retry.option || null);
    };

    // Only the newest answer's chips are live: older ones would branch an earlier step.
    const lastMessage = messages[messages.length - 1];
    const optionsMessageId = lastMessage && lastMessage.role === 'assistant' && !lastMessage.notice && lastMessage.options?.length ? lastMessage.id : null;

    const openFromChat = async (target, searchItem) => {
        if (!target) {
            return;
        }
        // Passing the tapped card applies the same preview / lock rules as global search.
        const result = await openTarget(target, { onLocked: setLockedInfo, searchItem });
        // Keep the chat open when the link was locked, cancelled or could not be opened.
        if (result === 'opened' || result === 'external') {
            closeSheet();
        }
    };
    const linkAccess = (link) => {
        if (!moduleAccess) {
            return null;
        }
        const route = resolveSearchTarget(link)?.pathname;
        const status = normalizeAccessStatus(moduleAccess.get(route)?.accessStatus);
        if (!status || status === 'unlocked') {
            return null;
        }
        if (status === 'locked') {
            return 'locked';
        }
        const moduleKey = ROUTE_PREVIEW_MODULE[route];
        if (!moduleKey || ALWAYS_FREE_PREVIEW_MODULES.has(moduleKey)) {
            return null;
        }
        const keys = getPreviewAccessKind(moduleKey) === 'list' ? freeKeys[moduleKey] : undefined;
        const access = resolvePreviewAccess(link, moduleKey, { freeKeys: keys || undefined });
        if (access === 'pending') {
            return keys === false ? null : 'pending';
        }
        return access === 'locked' || access === 'free' ? access : null;
    };

    // Load the free items of preview modules that appear in the visible cards.
    useEffect(() => {
        if (!moduleAccess) {
            return undefined;
        }
        let active = true;
        const keysNeeded = new Set();
        messages.slice(-12).forEach((message) => (message.links || []).forEach((link) => {
            const route = resolveSearchTarget(link)?.pathname;
            const moduleKey = ROUTE_PREVIEW_MODULE[route];
            if (moduleKey && normalizeAccessStatus(moduleAccess.get(route)?.accessStatus) === 'preview'
                && getPreviewAccessKind(moduleKey) === 'list' && freeKeys[moduleKey] === undefined) {
                keysNeeded.add(moduleKey);
            }
        }));
        keysNeeded.forEach((moduleKey) => {
            loadPreviewFreeKeys(moduleKey)
                .then((keys) => active && setFreeKeys((prev) => ({ ...prev, [moduleKey]: keys })))
                .catch(() => active && setFreeKeys((prev) => ({ ...prev, [moduleKey]: false })));
        });
        return () => {
            active = false;
        };
    }, [messages, moduleAccess, freeKeys]);

    const compactLauncher = width < 420;
    const launcherSize = compactLauncher ? 74 : 100;

    useEffect(() => {
        if (!compactLauncher) {
            setScrollHidden(false);
            return undefined;
        }
        let idleTimer;
        const showLater = () => {
            if (idleTimer) {
                clearTimeout(idleTimer);
            }
            idleTimer = setTimeout(() => setScrollHidden(false), 180);
        };
        const activeSub = DeviceEventEmitter.addListener('careermap:scroll-active', () => {
            if (idleTimer) {
                clearTimeout(idleTimer);
            }
            setScrollHidden(true);
        });
        const idleSub = DeviceEventEmitter.addListener('careermap:scroll-idle', showLater);
        return () => {
            if (idleTimer) {
                clearTimeout(idleTimer);
            }
            activeSub.remove();
            idleSub.remove();
        };
    }, [compactLauncher]);

    if (hidden) {
        return null;
    }

    const translateY = sheetAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 0],
    });
    const rootOverlayProps = Platform.OS === 'web'
        ? { style: { pointerEvents: 'box-none', position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999, elevation: 9999 } }
        : { pointerEvents: 'box-none', style: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999, elevation: 9999 } };
    const openOverlayProps = Platform.OS === 'web'
        ? { style: { pointerEvents: 'box-none', flex: 1, opacity: overlayOpacity } }
        : { pointerEvents: 'box-none', style: { flex: 1, opacity: overlayOpacity } };
    const launcherProps = Platform.OS === 'web'
        ? {
            style: {
                pointerEvents: 'box-none',
                position: 'absolute',
                right: compactLauncher ? 10 : 18,
                bottom: compactLauncher ? Math.max(insets.bottom + 48, 58) : Math.max(insets.bottom + 62, 74),
                transform: [{ scale: bubbleScale }],
                zIndex: 9999,
                elevation: 9999,
            },
        }
        : {
            pointerEvents: 'box-none',
            style: {
                position: 'absolute',
                right: compactLauncher ? 10 : 18,
                bottom: compactLauncher ? Math.max(insets.bottom + 48, 58) : Math.max(insets.bottom + 62, 74),
                transform: [{ scale: bubbleScale }],
                zIndex: 9999,
                elevation: 9999,
            },
        };

    return (
        <>
            {open ? (
                <View {...rootOverlayProps}>
                    <Animated.View {...openOverlayProps}>
                        <Pressable onPress={closeSheet} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
                            <Animated.View
                                style={{
                                    marginHorizontal: 18,
                                    marginBottom: Math.max(insets.bottom + 14, 20),
                                    borderRadius: 28,
                                    backgroundColor: themed.sheet,
                                    borderWidth: 1,
                                    borderColor: themed.sheetBorder,
                                    overflow: 'hidden',
                                    transform: [{ translateY }],
                                    shadowColor: '#000',
                                    shadowOpacity: 0.28,
                                    shadowRadius: 24,
                                    shadowOffset: { width: 0, height: 14 },
                                    elevation: 18,
                                    maxHeight: '82%',
                                }}
                            >
                                <View style={{ backgroundColor: themed.sheetHeader, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                          <BeeMascot size={50} draggable={false} />
                                
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Career Bee</Text>
                                        <Text style={{ color: '#f7c6d5', fontSize: 11, fontWeight: '700' }}>Always here for you</Text>
                                    </View>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Start a new chat"
                                        onPress={newChat}
                                        disabled={sending || messages.length <= 1}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, borderRadius: 15, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.15)', opacity: sending || messages.length <= 1 ? 0.5 : 1 }}
                                    >
                                        <Ionicons name="add" size={14} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>New chat</Text>
                                    </Pressable>
                                    <Pressable accessibilityRole="button" accessibilityLabel="Close Career Bee" onPress={closeSheet} style={{ height: 34, width: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="close" size={18} color="#fff" />
                                    </Pressable>
                                </View>

                                <ScrollView
                                    ref={scrollRef}
                                    contentContainerStyle={{ padding: 16, gap: 12, backgroundColor: themed.sheet }}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                                >
                                    {messages.map((message) => {
                                        const isUser = message.role === 'user';
                                        return (
                                            <View
                                                key={message.id}
                                                style={{
                                                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                                                    maxWidth: '88%',
                                                    // A bubble with choices uses the full width so the grid / list lines up.
                                                    width: !isUser && message.id === optionsMessageId && !sending ? '88%' : undefined,
                                                    backgroundColor: isUser ? palette.primary : themed.sheetSubtle,
                                                    borderRadius: 18,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 12,
                                                    borderWidth: isUser ? 0 : 1,
                                                    borderColor: isUser ? 'transparent' : themed.sheetBorder,
                                                }}
                                            >
                                                {isUser ? (
                                                <Text style={{ color: isUser ? '#fff' : themed.text, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>
                                                    {message.text}
                                                </Text>
                                                ) : (
                                                    <FormattedReply text={message.text} color={message.notice ? palette.primary : themed.text}/>
                                                )}
                                                {message.retry ? (
                                                    <Pressable
                                                        onPress={() => retryMessage(message)}
                                                        disabled={sending}
                                                        style={{ alignSelf: 'flex-start', marginTop: 8, borderRadius: 999, borderWidth: 1, borderColor: themed.chipBorder, backgroundColor: themed.chipBg, paddingHorizontal: 12, paddingVertical: 6, opacity: sending ? 0.45 : 1 }}
                                                    >
                                                        <Text style={{ color: palette.primary, fontSize: 11, fontWeight: '700' }}>Retry</Text>
                                                    </Pressable>
                                                ) : null}
                                                {message.links?.length ? (
                                                    <View style={{ gap: 6, marginTop: 10 }}>
                                                        {message.links.map((link, index) => {
                                                            const badge = getLinkBadge(link);
                                                            const subtitle = getResultSubtitle(link);
                                                            const access = linkAccess(link);
                                                            return (
                                                            <Pressable
                                                                key={`link-${link?.type}-${link?.id ?? index}`}
                                                                onPress={() => openFromChat(resolveSearchTarget(link), link)}
                                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: themed.chipBorder, backgroundColor: themed.sheet, paddingHorizontal: 10, paddingVertical: 8 }}
                                                            >
                                                                <View style={{ flex: 1 }}>
                                                                    <Text numberOfLines={2} style={{ color: themed.text, fontSize: 12, fontWeight: '800' }}>{link?.title || 'Open'}</Text>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                                                        <View style={{ borderRadius: 999, backgroundColor: badge.bg, paddingHorizontal: 6, paddingVertical: 1 }}>
                                                                            <Text style={{ color: badge.color, fontSize: 9, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>{badge.label}</Text>
                                                                        </View>
                                                                        {subtitle ? (<Text numberOfLines={1} style={{ flex: 1, color: themed.muted, fontSize: 11, fontWeight: '600' }}>{subtitle}</Text>) : null}
                                                                    </View>
                                                                </View>
                                                                {access === 'pending' ? (
                                                                    <ActivityIndicator size="small" color={themed.muted} />
                                                                ) : access === 'locked' ? (
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', paddingHorizontal: 7, paddingVertical: 2 }}>
                                                                        <Ionicons name="lock-closed" size={10} color="#b91c1c" />
                                                                        <Text style={{ color: '#b91c1c', fontSize: 10, fontWeight: '800' }}>Locked</Text>
                                                                    </View>
                                                                ) : (
                                                                    <>
                                                                        <Text style={{ color: palette.primary, fontSize: 11, fontWeight: '800' }}>{access === 'free' ? 'Free · View' : 'View details'}</Text>
                                                                        <Ionicons name="chevron-forward" size={12} color={palette.primary} />
                                                                    </>
                                                                )}
                                                            </Pressable>
                                                            );
                                                        })}
                                                    </View>
                                                ) : null}
                                                {message.pages?.length ? (
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                                        {(message.pages || []).map((page, index) => {
                                                            const target = resolvePageTarget(page);
                                                            if (!target) {
                                                                return null;
                                                            }
                                                            return (
                                                                <Pressable
                                                                    key={`page-${page?.key ?? index}`}
                                                                    onPress={() => openFromChat(target)}
                                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: palette.primary, paddingHorizontal: 10, paddingVertical: 6 }}
                                                                >
                                                                    <Text numberOfLines={1} style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{page?.label || 'Open'}</Text>
                                                                    <Ionicons name="arrow-forward" size={11} color="#fff" />
                                                                </Pressable>
                                                            );
                                                        })}
                                                    </View>
                                                ) : null}
                                                {message.id === optionsMessageId && !sending ? (
                                                    <ChatOptions options={message.options} onChoose={chooseOption} themed={themed} />
                                                ) : null}
                                            </View>
                                        );
                                    })}

                                    {!enabled ? (
                                        <View style={{ alignSelf: 'flex-start', maxWidth: '88%', borderRadius: 18, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', paddingHorizontal: 14, paddingVertical: 10 }}>
                                            <Text style={{ color: '#92400e', fontSize: 12.5, fontWeight: '600' }}>Career Bee is not available right now. Please try again later.</Text>
                                        </View>
                                    ) : null}

                                    {sending ? (
                                        <View
                                            style={{
                                                alignSelf: 'flex-start',
                                                maxWidth: '88%',
                                                backgroundColor: themed.sheetSubtle,
                                                borderRadius: 18,
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                                borderWidth: 1,
                                                borderColor: themed.sheetBorder,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <ActivityIndicator size="small" color={palette.primary} />
                                            <Text style={{ color: themed.muted, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>Career Bee is typing...</Text>
                                        </View>
                                    ) : null}

                                </ScrollView>

                                <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, backgroundColor: themed.sheet }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: themed.inputBg, borderRadius: 22, paddingLeft: 14, paddingRight: 8, paddingVertical: 6 }}>
                                        <TextInput
                                            value={draft}
                                            onChangeText={setDraft}
                                            placeholder="Choose an option or type your question..."
                                            placeholderTextColor={themed.muted}
                                            maxLength={maxLength}
                                            editable={enabled}
                                            returnKeyType="send"
                                            onSubmitEditing={() => sendMessage(draft)}
                                            style={{ flex: 1, color: themed.text, fontSize: 13, paddingVertical: 10 }}
                                        />
                                        <Pressable
                                            onPress={() => sendMessage(draft)}
                                            style={{
                                                height: 38,
                                                width: 38,
                                                borderRadius: 19,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: palette.primary,
                                                opacity: draft.trim() && !sending && enabled ? 1 : 0.45,
                                            }}
                                            disabled={!draft.trim() || sending || !enabled}
                                        >
                                            <Ionicons name="send" size={16} color="#fff" />
                                        </Pressable>
                                    </View>
                                    {draft.length >= maxLength - 200 ? (
                                        <Text style={{ alignSelf: 'flex-end', marginTop: 4, marginRight: 6, color: draft.length >= maxLength ? palette.primary : themed.muted, fontSize: 10.5, fontWeight: '700' }}>
                                            {draft.length}/{maxLength}
                                        </Text>
                                    ) : null}
                                </View>
                            </Animated.View>
                        </KeyboardAvoidingView>
                    </Animated.View>
                </View>
            ) : null}

            {lockedInfo ? (
                <UnlockBottomSheet
                    title={lockedInfo.title}
                    subtitle={lockedInfo.message}
                    onClose={() => setLockedInfo(null)}
                    onPress={() => {
                        const returnTarget = lockedInfo.returnTarget;
                        setLockedInfo(null);
                        closeSheet();
                        openSubscriptionPrompt(returnTarget);
                    }}
                />
            ) : null}

            {!open && !scrollHidden ? (
                <Animated.View {...launcherProps}>
                    <Pressable
                        onPress={openSheet}
                        onPressIn={() => animateBubble(0.94)}
                        onPressOut={() => animateBubble(1)}
                    >
                        <BeeMascot size={launcherSize} draggable={false} />
                    </Pressable>
                </Animated.View>
            ) : null}
        </>
    );
}
