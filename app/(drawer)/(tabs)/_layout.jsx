import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../../../src/app-state';
import { UnlockBottomSheet } from '../../../src/careermap-ui';
import { checkModuleAccess, getModules } from '../../../src/api/moduleAccessApi';
import { openSubscriptionPrompt } from '../../../src/subscription-flow';
import { palette } from '../../../src/careermap-data';
import { AppHeader } from '../../../src/app-header';
import { useAuthStore } from '../../../src/store/auth-store';

const TAB_ROUTES = {
    library: '/(drawer)/(tabs)/library',
    learn: '/(drawer)/(tabs)/learn',
};

export default function TabsLayout() {
    const { preferences, activeSubscriptionPlanIds } = useAppState();
    const accessToken = useAuthStore((state) => state.accessToken);
    const userId = useAuthStore((state) => String(state.user?.id ?? state.user?._id ?? ''));
    const planKey = Array.isArray(activeSubscriptionPlanIds) ? activeSubscriptionPlanIds.map(String).sort().join(',') : '';
    const requestIdRef = useRef(0);
    const insets = useSafeAreaInsets();
    const [lockedTab, setLockedTab] = useState(null);
    const [tabAccess, setTabAccess] = useState({
        library: { status: 'locked' },
        learn: { status: 'locked' },
    });
    const moduleTitleMatchers = useMemo(() => ({
        library: {
            title: 'Career Archive Locked',
            match: 'career archive',
        },
        learn: {
            title: 'Career & Personality Videos Locked',
            match: 'career & personality videos',
        },
    }), []);

    // Re-checked whenever the session, the user or their plans change, whenever the tabs regain
    // focus (e.g. back from payment-success) and when a locked tab is tapped, so a new plan
    // unlocks the tabs without restarting the app. A failed check is retried on the next of these.
    const loadTabAccess = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const nextState = {
            library: { status: 'locked' },
            learn: { status: 'locked' },
        };
        try {
            const modules = await getModules();

            for (const [tabName, matcher] of Object.entries(moduleTitleMatchers)) {
                const matchedModule = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes(matcher.match));
                const moduleId = Number(matchedModule?.id);

                if (!Number.isFinite(moduleId)) {
                    continue;
                }

                const response = await checkModuleAccess(moduleId).catch(() => null);
                const mode = String(response?.mode || '').toLowerCase();
                nextState[tabName] = {
                    status: response?.allowed === false ? 'locked' : (mode || 'locked'),
                    moduleId,
                    title: matcher.title,
                };
            }
        }
        catch {
            // keep everything locked; the next focus / tab press tries again
        }
        if (requestId === requestIdRef.current) {
            setTabAccess(nextState);
        }
        return nextState;
    }, [moduleTitleMatchers]);

    useEffect(() => {
        void loadTabAccess();
    }, [loadTabAccess, accessToken, userId, planKey]);

    useFocusEffect(useCallback(() => {
        void loadTabAccess();
    }, [loadTabAccess]));

    useEffect(() => () => {
        // Ignore answers that arrive after the layout unmounts.
        requestIdRef.current += 1;
    }, []);

    const isStatusUnlocked = (status) => status === 'full' || status === 'unlocked' || status === 'preview';
    const isTabUnlocked = (tabName) => isStatusUnlocked(tabAccess[tabName]?.status);

    const handleBlockedTabPress = async (tabName, event) => {
        if (isTabUnlocked(tabName)) {
            return;
        }

        event.preventDefault();
        // The stored state may be stale (plan just bought, earlier check failed): ask again.
        const latest = await loadTabAccess();
        if (isStatusUnlocked(latest[tabName]?.status)) {
            router.navigate(TAB_ROUTES[tabName]);
            return;
        }
        const config = latest[tabName];
        setLockedTab({
            title: config?.title || 'Locked',
            subtitle: tabName === 'library'
                ? 'Unlock the career archive to browse streams, roles, and college paths.'
                : 'Unlock career & personality videos before opening this tab.',
            route: TAB_ROUTES[tabName],
        });
    };

    // A tabBarIcon render function, not a component.
    // eslint-disable-next-line react/display-name
    const lockedTabIcon = (tabName, unlockedIcon, lockedIcon = 'lock-closed') => ({ color, size }) => (
        <Ionicons name={isTabUnlocked(tabName) ? unlockedIcon : lockedIcon} size={size} color={color} />
    );

    return (<>
      <Tabs screenOptions={{
            headerShown: true,
            header: () => <AppHeader />,
            tabBarActiveTintColor: palette.primary,
            tabBarInactiveTintColor: preferences.darkMode ? '#b7aeb9' : palette.muted,
            tabBarStyle: {
                backgroundColor: preferences.darkMode ? '#050505' : palette.surface,
                borderTopColor: preferences.darkMode ? '#1a1a1a' : palette.border,
                height: 64 + Math.max(insets.bottom, 8),
                paddingBottom: Math.max(insets.bottom, 8),
                paddingTop: 6,
            },
            tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '700',
            },
        }}>
      <Tabs.Screen name="index" options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color}/>,
        }}/>
      <Tabs.Screen name="library" options={{
            title: 'Career Archive',
            tabBarIcon: lockedTabIcon('library', 'book', 'lock-closed'),
        }} listeners={{
            tabPress: (event) => { void handleBlockedTabPress('library', event); },
        }}/>
      <Tabs.Screen name="learn" options={{
            title: 'Learn',
            tabBarIcon: lockedTabIcon('learn', 'school', 'lock-closed'),
        }} listeners={{
            tabPress: (event) => { void handleBlockedTabPress('learn', event); },
        }}/>
      <Tabs.Screen name="assessment" options={{
            href: null,
        }}/>
      <Tabs.Screen name="profile" options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color}/>,
        }}/>
      </Tabs>
      {lockedTab ? <UnlockBottomSheet title={lockedTab.title} subtitle={lockedTab.subtitle} onClose={() => setLockedTab(null)} onPress={() => {
            const returnTarget = lockedTab.route ? { pathname: lockedTab.route } : undefined;
            setLockedTab(null);
            openSubscriptionPrompt(returnTarget);
        }}/> : null}
    </>);
}
