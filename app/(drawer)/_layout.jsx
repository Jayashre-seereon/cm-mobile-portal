import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Text, View } from 'react-native';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { AppHeader } from '../../src/app-header';
import FloatingContactActions from '../../src/components/FloatingContactActions';
import { UnlockBottomSheet } from '../../src/careermap-ui';
import { openSubscriptionPrompt } from '../../src/subscription-flow';

const drawerModuleAccess = {
    library: { title: 'Career Archive', match: ['career archive', 'career library'], path: '/(drawer)/(tabs)/library' },
    learn: { title: 'Career & Personality Videos', match: ['career & personality videos', 'masterclass'], path: '/(drawer)/(tabs)/learn' },
    'entrance-exam': { title: 'Entrance Exam', match: ['entrance exam'], path: '/(drawer)/entrance-exam' },
    'book-mentor': { title: 'Book Your Mentor', match: ['book your mentor', 'book mentor', 'mentor'], path: '/(drawer)/book-mentor' },
    scholarship: { title: 'Scholarships', match: ['scholarship'], path: '/(drawer)/scholarship' },
    institute: { title: 'Institutes', match: ['institute'], path: '/(drawer)/institute' },
    newsletter: { title: 'Career Insights', match: ['career insights', 'career newsletter', 'newsletter'], path: '/(drawer)/newsletter' },
    abroad: { title: 'Study Abroad', match: ['study abroad', 'abroad'], path: '/(drawer)/abroad' },
    quiz: { title: 'Quiz', match: ['quiz'], path: '/(drawer)/quiz' },
};

export default function DrawerRoot() {
    const { preferences, unreadNotificationsCount } = useAppState();
    const [lockedModule, setLockedModule] = useState(null);
    const renderDrawerIcon = (name) => {
        const DrawerIcon = ({ color, size }) => (<View className="items-center justify-center">
        <Ionicons name={name} color={color} size={size}/>
        {name === 'notifications-outline' && unreadNotificationsCount > 0 ? (<View className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-brand px-1 py-[1px]">
            <Text className="text-center text-[10px] font-extrabold text-white">{unreadNotificationsCount}</Text>
          </View>) : null}
      </View>);
        DrawerIcon.displayName = `${name.replace(/[^a-z0-9]/gi, '')}DrawerIcon`;
        return DrawerIcon;
    };
    const handleModuleDrawerPress = async (event, routeKey) => {
        event.preventDefault();
        const config = drawerModuleAccess[routeKey];
        if (!config) return;

        try {
            const modules = await getModules();
            const matched = modules.find((module) => {
                const title = String(module?.title || '').trim().toLowerCase();
                return config.match.some((fragment) => title.includes(fragment));
            });
            const moduleId = Number(matched?.id);
            if (!Number.isFinite(moduleId)) {
                router.push(config.path);
                return;
            }

            const access = await checkModuleAccess(moduleId);
            if (!access?.allowed) {
                setLockedModule({
                    title: `${config.title} Access Locked`,
                    message: access?.message || `Subscribe to unlock ${config.title.toLowerCase()}.`,
                    returnTarget: { pathname: config.path, params: { moduleId: String(moduleId) } },
                });
                return;
            }

            router.push({
                pathname: config.path,
                params: {
                    moduleId: String(moduleId),
                    accessStatus: access.freePreview ? 'preview' : 'unlocked',
                },
            });
        } catch (error) {
            console.log('Drawer module access check failed', error?.response?.data || error?.message || error);
            router.push(config.path);
        }
    };
    const moduleDrawerListeners = (routeKey) => ({
        drawerItemPress: (event) => { void handleModuleDrawerPress(event, routeKey); },
    });
    return (<GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer screenOptions={{
            header: () => <AppHeader />,
            headerStyle: { backgroundColor: preferences.darkMode ? '#050505' : palette.background },
            headerTintColor: preferences.darkMode ? '#ffffff' : palette.text,
            headerTitleStyle: { fontWeight: '800' },
            drawerActiveTintColor: palette.primary,
            drawerInactiveTintColor: preferences.darkMode ? '#b7aeb9' : palette.muted,
            drawerStyle: { backgroundColor: preferences.darkMode ? '#050505' : palette.surface, width: 280 },
            drawerContentStyle: { paddingBottom: 120 },
            sceneStyle: { backgroundColor: preferences.darkMode ? '#050505' : palette.background },
        }}>
        <Drawer.Screen name="(tabs)" options={{
            title: 'CareerMap',
            drawerLabel: 'Home',
            drawerIcon: renderDrawerIcon('grid'),
            headerShown: false,
        }}/>
        <Drawer.Screen name="library" options={{
            title: 'Career Archive',
            drawerIcon: renderDrawerIcon('book-outline'),
        }} listeners={moduleDrawerListeners('library')}/>
        <Drawer.Screen name="psychometric-test" options={{
            title: 'Career Psychometric Assessment',
            drawerLabel: 'Career Psychometric Assessment',
            drawerIcon: renderDrawerIcon('analytics-outline'),
        }}/>
        <Drawer.Screen name="learn" options={{
            title: 'Career & Personality Videos',
            drawerLabel: 'Career & Personality Videos',
            drawerIcon: renderDrawerIcon('school-outline'),
        }} listeners={moduleDrawerListeners('learn')}/>
        <Drawer.Screen name="entrance-exam" options={{
            title: 'Entrance Exam',
            drawerIcon: renderDrawerIcon('clipboard-outline'),
        }} listeners={moduleDrawerListeners('entrance-exam')}/>
        <Drawer.Screen name="book-mentor" options={{
            title: 'Book Your Mentor',
            drawerIcon: renderDrawerIcon('people-outline'),
        }} listeners={moduleDrawerListeners('book-mentor')}/>
        <Drawer.Screen name="scholarship" options={{
            title: 'Scholarships',
            drawerIcon: renderDrawerIcon('ribbon-outline'),
        }} listeners={moduleDrawerListeners('scholarship')}/>
        <Drawer.Screen name="institute" options={{
            title: 'Institutes',
            drawerIcon: renderDrawerIcon('business-outline'),
        }} listeners={moduleDrawerListeners('institute')}/>
        <Drawer.Screen name="newsletter" options={{
            title: 'Career Insights',
            drawerIcon: renderDrawerIcon('newspaper-outline'),
        }} listeners={moduleDrawerListeners('newsletter')}/>
        <Drawer.Screen name="abroad" options={{
            title: 'Study Abroad',
            drawerIcon: renderDrawerIcon('globe-outline'),
        }} listeners={moduleDrawerListeners('abroad')}/>
        <Drawer.Screen name="subscription" options={{
            title: 'Subscription',
            drawerIcon: renderDrawerIcon('card-outline'),
        }}/>
        <Drawer.Screen name="quiz" options={{
            title: 'Quiz',
            drawerIcon: renderDrawerIcon('help-circle-outline'),
        }} listeners={moduleDrawerListeners('quiz')}/>
        <Drawer.Screen name="notifications" options={{
            title: 'Notifications',
            drawerIcon: renderDrawerIcon('notifications-outline'),
        }}/>
        <Drawer.Screen name="profile-redirect" options={{
            title: 'Profile',
            drawerLabel: 'Profile',
            drawerIcon: renderDrawerIcon('person-outline'),
            headerShown: false,
        }}/>
        <Drawer.Screen name="settings" options={{
            title: 'Settings',
            drawerIcon: renderDrawerIcon('settings-outline'),
        }}/>
       
        <Drawer.Screen name="assessment-preview" options={{
            drawerItemStyle: { display: 'none' },
        }}/>
        <Drawer.Screen name="assessment-attempt" options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false,
        }}/>
        <Drawer.Screen name="assessment-report" options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false,
        }}/>
        <Drawer.Screen name="entrance-exam-detail" options={{
            drawerItemStyle: { display: 'none' },
        }}/>
        <Drawer.Screen name="about" options={{
            drawerItemStyle: { display: 'none' },
        }}/>
        <Drawer.Screen name="index" options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false,
        }}/>
      </Drawer>
      {lockedModule ? <UnlockBottomSheet
        title={lockedModule.title}
        subtitle={lockedModule.message}
        onClose={() => setLockedModule(null)}
        onPress={() => {
            const returnTarget = lockedModule.returnTarget;
            setLockedModule(null);
            openSubscriptionPrompt(returnTarget);
        }}
      /> : null}
      <FloatingContactActions />
    </GestureHandlerRootView>);
}
