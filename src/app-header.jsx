import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from './app-state';
import { palette } from './careermap-data';
import { GlobalSearch } from './global-search';

export function AppHeader() {
  const { preferences, unreadNotificationsCount } = useAppState();
  const [searchOpen, setSearchOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const dark = preferences.darkMode;
  const backgroundColor = dark ? '#050505' : palette.background;

  return (
    <>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={backgroundColor} />
      <View style={{ paddingTop: insets.top, backgroundColor }}>
      <View className={`h-[56px] flex-row items-center justify-between px-5 ${dark ? 'bg-[#050505]' : 'bg-paper'}`}>
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <Image source={require('../assets/images/logo_white.png')} resizeMode="contain" style={{ width: 64, height: 36 }} />
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable accessibilityLabel="Search" className={`h-[40px] w-[40px] items-center justify-center rounded-[16px] border ${dark ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => setSearchOpen(true)}>
            <Ionicons name="search" size={20} color={dark ? '#ffffff' : palette.text} />
          </Pressable>
          <Pressable accessibilityLabel="Notifications" className={`h-[40px] w-[40px] items-center justify-center rounded-[16px] border ${dark ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => router.push('/(drawer)/notifications')}>
            <View className="items-center justify-center">
              <Ionicons name="notifications-outline" size={20} color={dark ? '#ffffff' : palette.text} />
              {unreadNotificationsCount > 0 ? <View className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-brand px-1 py-[1px]">
                <Text className="text-center text-[10px] font-extrabold text-white">{unreadNotificationsCount}</Text>
              </View> : null}
            </View>
          </Pressable>
        </View>
      </View>
      </View>
      <GlobalSearch visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
