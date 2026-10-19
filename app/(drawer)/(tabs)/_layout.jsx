import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../../../src/app-state';
import { UnlockBottomSheet } from '../../../src/careermap-ui';
import { checkModuleAccess, getModules } from '../../../src/api/moduleAccessApi';
import { openSubscriptionPrompt } from '../../../src/subscription-flow';
import { palette } from '../../../src/careermap-data';
export default function TabsLayout() {
    const { preferences } = useAppState();
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

    useEffect(() => {
        let isMounted = true;

        async function loadTabAccess() {
            try {
                const modules = await getModules();
                const nextState = {
                    library: { status: 'locked' },
                    learn: { status: 'locked' },
                };

                for (const [tabName, matcher] of Object.entries(moduleTitleMatchers)) {
                    const matchedModule = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes(matcher.match));
                    const moduleId = Number(matchedModule?.id);

                    if (!Number.isFinite(moduleId)) {
                        continue;
                    }

                    const response = await checkModuleAccess(moduleId).catch(() => null);
                    const mode = String(response?.mode || '').toLowerCase();
                    nextState[tabName] = {
                        status: mode || (response?.allowed === false ? 'locked' : 'locked'),
                        moduleId,
                        title: matcher.title,
                    };
                }

                if (isMounted) {
                    setTabAccess(nextState);
                }
            }
            catch {
                if (isMounted) {
                    setTabAccess({
                        library: { status: 'locked' },
                        learn: { status: 'locked' },
                    });
                }
            }
        }

        void loadTabAccess();
        return () => {
            isMounted = false;
        };
    }, [moduleTitleMatchers]);

    const isTabUnlocked = (tabName) => {
        const status = tabAccess[tabName]?.status;
        return status === 'full' || status === 'preview';
    };

    const handleBlockedTabPress = (tabName, event) => {
        if (isTabUnlocked(tabName)) {
            return;
        }

        event.preventDefault();
        const config = tabAccess[tabName];
        setLockedTab({
            title: config?.title || 'Locked',
            subtitle: tabName === 'library'
                ? 'Unlock the career archive to browse streams, roles, and college paths.'
                : 'Unlock career & personality videos before opening this tab.',
            route: tabName === 'library'
                ? '/(drawer)/(tabs)/library'
                : '/(drawer)/(tabs)/learn',
        });
    };

    const lockedTabIcon = (tabName, unlockedIcon, lockedIcon = 'lock-closed') => ({ color, size }) => (
        <Ionicons name={isTabUnlocked(tabName) ? unlockedIcon : lockedIcon} size={size} color={color} />
    );

    return (<>
      <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: palette.primary,
            tabBarInactiveTintColor: preferences.darkMode ? '#b7aeb9' : palette.muted,
            tabBarStyle: {
                backgroundColor: preferences.darkMode ? '#050505' : palette.surface,
                borderTopColor: preferences.darkMode ? '#1a1a1a' : palette.border,
                height: 58 + Math.max(insets.bottom, 8),
                paddingBottom: Math.max(insets.bottom, 8),
                paddingTop: 8,
            },
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '700',
            },
        }}>
      <Tabs.Screen name="index" options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color}/>,
        }}/>
      <Tabs.Screen name="library" options={{
            title: 'Library',
            tabBarIcon: lockedTabIcon('library', 'book', 'lock-closed'),
        }} listeners={{
            tabPress: (event) => handleBlockedTabPress('library', event),
        }}/>
      <Tabs.Screen name="learn" options={{
            title: 'Learn',
            tabBarIcon: lockedTabIcon('learn', 'school', 'lock-closed'),
        }} listeners={{
            tabPress: (event) => handleBlockedTabPress('learn', event),
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
