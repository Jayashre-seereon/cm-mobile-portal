import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
export default function DrawerRoot() {
    const { preferences, unreadNotificationsCount } = useAppState();
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
    return (<GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer screenOptions={{
            headerStyle: { backgroundColor: preferences.darkMode ? '#050505' : palette.surface },
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
            drawerLabel: 'Dashboard',
            drawerIcon: renderDrawerIcon('grid'),
            headerShown: false,
        }}/>
        <Drawer.Screen name="notifications" options={{
            title: 'Notifications',
            drawerIcon: renderDrawerIcon('notifications-outline'),
        }}/>
        <Drawer.Screen name="scholarship" options={{
            title: 'Scholarships',
            drawerIcon: renderDrawerIcon('ribbon-outline'),
        }}/>
        <Drawer.Screen name="institute" options={{
            title: 'Institutes',
            drawerIcon: renderDrawerIcon('business-outline'),
        }}/>
        <Drawer.Screen name="entrance-exam" options={{
            title: 'Entrance Exam',
            drawerIcon: renderDrawerIcon('clipboard-outline'),
        }}/>
        <Drawer.Screen name="subscription" options={{
            title: 'Subscription',
            drawerIcon: renderDrawerIcon('card-outline'),
        }}/>
        <Drawer.Screen name="library" options={{
            title: 'Library',
            drawerIcon: renderDrawerIcon('book-outline'),
        }}/>
        <Drawer.Screen name="learn" options={{
            title: 'Career & Personality Videos',
            drawerIcon: renderDrawerIcon('school-outline'),
        }}/>
        <Drawer.Screen name="newsletter" options={{
            title: 'Career Insights',
            drawerIcon: renderDrawerIcon('newspaper-outline'),
        }}/>
         <Drawer.Screen name="book-mentor" options={{
            title: 'Book Your Mentor',
            drawerIcon: renderDrawerIcon('people-outline'),
        }}/>
        <Drawer.Screen name="settings" options={{
            title: 'Settings',
            drawerIcon: renderDrawerIcon('settings-outline'),
        }}/>
       
        <Drawer.Screen name="psychometric-test" options={{
            drawerItemStyle: { display: 'none' },
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
        <Drawer.Screen name="quiz" options={{
            drawerItemStyle: { display: 'none' },
        }}/>
        <Drawer.Screen name="abroad" options={{
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
    </GestureHandlerRootView>);
}
