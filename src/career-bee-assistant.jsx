import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, DeviceEventEmitter, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askChatbot, getChatbotConfig } from './api/chatbotApi';
import { useAppState } from './app-state';
import { BeeMascot } from './bee-mascot';
import { palette } from './careermap-data';
import { UnlockBottomSheet } from './careermap-ui';
import { useAuthStore } from './store/auth-store';
import { openSubscriptionPrompt } from './subscription-flow';
import { openTarget, resolvePageTarget, resolveSearchTarget } from './utils/searchNavigation';

// Fallbacks used until (or if) GET /api/chatbot/config answers.
const DEFAULT_GREETING = "Hey! I'm Career Bee. Ask me anything about careers, exams, streams, scholarships, or support.";
const DEFAULT_MAX_LENGTH = 1000;
const starterPrompts = [
    'What careers suit me?',
    'How to prepare for JEE?',
    'Tell me about scholarships',
    'Help me choose a stream',
    'I need support',
];

const welcomeMessage = (text) => ({ id: 'welcome', role: 'assistant', text });

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
    const [prompts, setPrompts] = useState(starterPrompts);
    const [maxLength, setMaxLength] = useState(DEFAULT_MAX_LENGTH);
    const [sending, setSending] = useState(false);
    const [lockedInfo, setLockedInfo] = useState(null);
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
        setMessages((current) => [welcomeMessage(current[0]?.id === 'welcome' ? current[0].text : DEFAULT_GREETING)]);
        setDraft('');
    }, [sessionKey]);

    const loadConfig = async () => {
        if (configRequestedRef.current) {
            return;
        }
        configRequestedRef.current = true;
        try {
            const config = await getChatbotConfig();
            if (config?.greeting) {
                setMessages((current) => (current[0]?.id === 'welcome' ? [welcomeMessage(config.greeting), ...current.slice(1)] : current));
            }
            if (Array.isArray(config?.starterPrompts) && config.starterPrompts.length > 0) {
                setPrompts(config.starterPrompts.map(String).slice(0, 6));
            }
            if (Number(config?.maxMessageLength) > 0) {
                setMaxLength(Number(config.maxMessageLength));
            }
        }
        catch {
            // keep the built-in greeting and starter prompts
        }
    };

    const openSheet = () => {
        void loadConfig();
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

    const ask = async (message, history) => {
        const askedFor = sessionKeyRef.current;
        setSending(true);
        try {
            const data = await askChatbot({ message, history });
            if (sessionKeyRef.current !== askedFor) {
                return;
            }
            setMessages((current) => [...current, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                text: String(data?.reply || 'Sorry, I could not find an answer to that. Please try asking in a different way.'),
                links: Array.isArray(data?.links) ? data.links.slice(0, 6) : [],
                pages: Array.isArray(data?.pages) ? data.pages.slice(0, 4) : [],
            }]);
        }
        catch (error) {
            if (sessionKeyRef.current !== askedFor) {
                return;
            }
            const status = error?.response?.status;
            const serverMessage = error?.response?.data?.message;
            if (error?.response) {
                setMessages((current) => [...current, {
                    id: `notice-${Date.now()}`,
                    role: 'assistant',
                    notice: true,
                    text: serverMessage || (status === 429 ? 'You are sending messages too quickly. Please wait a moment and try again.' : 'Career Bee could not answer right now. Please try again later.'),
                }]);
            }
            else {
                setMessages((current) => [...current, {
                    id: `notice-${Date.now()}`,
                    role: 'assistant',
                    notice: true,
                    text: 'Could not reach Career Bee. Check your connection and try again.',
                    retry: { message, history },
                }]);
            }
        }
        finally {
            setSending(false);
        }
    };

    const sendMessage = (text) => {
        const message = text.trim().slice(0, maxLength);
        if (!message || sending) {
            return;
        }
        const history = toHistory(messages);
        const userEntry = { id: `user-${Date.now()}`, role: 'user', text: message };
        setMessages((current) => [...current, userEntry]);
        setDraft('');
        void ask(message, history);
    };

    const retryMessage = (entry) => {
        if (sending || !entry?.retry) {
            return;
        }
        setMessages((current) => current.filter((item) => item.id !== entry.id));
        void ask(entry.retry.message, entry.retry.history);
    };

    const openFromChat = async (target) => {
        if (!target) {
            return;
        }
        const result = await openTarget(target, { onLocked: setLockedInfo });
        if (result !== 'locked') {
            closeSheet();
        }
    };
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
                bottom: compactLauncher ? Math.max(insets.bottom + 28, 54) : Math.max(insets.bottom + 34, 67),
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
                bottom: compactLauncher ? Math.max(insets.bottom + 28, 54) : Math.max(insets.bottom + 34, 67),
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
                                    maxHeight: '72%',
                                }}
                            >
                                <View style={{ backgroundColor: themed.sheetHeader, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                          <BeeMascot size={50} draggable={false} />
                                
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Career Bee</Text>
                                        <Text style={{ color: '#f7c6d5', fontSize: 11, fontWeight: '700' }}>Always here for you</Text>
                                    </View>
                                    <Pressable onPress={closeSheet} style={{ height: 34, width: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
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
                                                {(message.links?.length || message.pages?.length) ? (
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                                        {(message.links || []).map((link, index) => (
                                                            <Pressable
                                                                key={`link-${link?.type}-${link?.id ?? index}`}
                                                                onPress={() => openFromChat(resolveSearchTarget(link))}
                                                                style={{ maxWidth: '100%', borderRadius: 999, borderWidth: 1, borderColor: themed.chipBorder, backgroundColor: themed.sheet, paddingHorizontal: 10, paddingVertical: 6 }}
                                                            >
                                                                <Text numberOfLines={1} style={{ color: palette.primary, fontSize: 11, fontWeight: '700' }}>{link?.title || 'Open'}</Text>
                                                            </Pressable>
                                                        ))}
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
                                            </View>
                                        );
                                    })}

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

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {prompts.map((prompt) => (
                                            <Pressable
                                                key={prompt}
                                                onPress={() => sendMessage(prompt)}
                                                disabled={sending}
                                                style={{
                                                    borderRadius: 999,
                                                    borderWidth: 1,
                                                    borderColor: themed.chipBorder,
                                                    backgroundColor: themed.chipBg,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 8,
                                                }}
                                            >
                                                <Text style={{ color: palette.primary, fontSize: 11, fontWeight: '700' }}>{prompt}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>

                                <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, backgroundColor: themed.sheet }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: themed.inputBg, borderRadius: 22, paddingLeft: 14, paddingRight: 8, paddingVertical: 6 }}>
                                        <TextInput
                                            value={draft}
                                            onChangeText={setDraft}
                                            placeholder="Ask Career Bee anything..."
                                            placeholderTextColor={themed.muted}
                                            maxLength={maxLength}
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
                                                opacity: draft.trim() && !sending ? 1 : 0.45,
                                            }}
                                            disabled={!draft.trim() || sending}
                                        >
                                            <Ionicons name="send" size={16} color="#fff" />
                                        </Pressable>
                                    </View>
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
