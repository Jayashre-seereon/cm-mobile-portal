import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAppState } from '../../src/app-state';
import { getNotifications } from '../../src/api/notificationApi';
import { palette } from '../../src/careermap-data';
import { AnimatedPressable, Screen, SectionHeader } from '../../src/careermap-ui';
import { useAuthStore } from '../../src/store/auth-store';

export default function NotificationsScreen() {
    const { preferences, notifications: appNotifications } = useAppState();
    const accessToken = useAuthStore((state) => state.accessToken);
    const hasAuthenticatedSession = useAuthStore((state) => state.hasAuthenticatedSession);
    const [notifications, setNotifications] = useState(appNotifications);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (!accessToken || !hasAuthenticatedSession) {
            setNotifications([]);
            setLoadError('');
            setIsLoading(false);
            return;
        }

        setNotifications(appNotifications);
    }, [accessToken, hasAuthenticatedSession, appNotifications]);

    return (<Screen>
      <SectionHeader title="Notifications" subtitle="Recent updates from mentors, scholarships, and learning content."/>

      {!accessToken || !hasAuthenticatedSession ? (
        <View className={`gap-2 rounded-[22px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Login required</Text>
          <Text className={`text-[13px] leading-[21px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Notifications will load only after you log in.</Text>
        </View>
      ) : null}

      {isLoading ? (
        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading notifications...</Text>
      ) : null}

      {!isLoading && loadError ? (
        <Text className="text-[13px] text-brand">{loadError}</Text>
      ) : null}

      {!isLoading && notifications.length === 0 ? (
        <View className={`gap-2 rounded-[22px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>No notifications yet</Text>
          <Text className={`text-[13px] leading-[21px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>When the backend sends updates, they will appear here automatically.</Text>
        </View>
      ) : null}

      <View className="gap-3">
        {notifications.map((item) => {
            const isPending = String(item.status).toLowerCase() === 'pending';

            return (
              <View key={item.id} className={`gap-3 rounded-[22px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className={`text-[16px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.title}</Text>
                    <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item.target}</Text>
                  </View>
                  {isPending ? (
                    <View className="mt-1 h-[10px] w-[10px] rounded-full bg-brand"/>
                  ) : null}
                </View>

                <Text className={`text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#d6ced8]' : 'text-muted'}`}>{item.message}</Text>

                <View className="items-end gap-2">
                  {item.createdAt ? (
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${palette.primary}14` }}>
                      <Text className="text-[11px] font-extrabold" style={{ color: palette.primary }}>
                        {item.createdAt}
                      </Text>
                    </View>
                  ) : null}
                  {item.updatedAt && item.updatedAt !== item.createdAt ? (
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${palette.blue}14` }}>
                      <Text className="text-[11px] font-extrabold" style={{ color: palette.blue }}>
                        Updated {item.updatedAt}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
        })}
      </View>

      <AnimatedPressable className="mt-2 flex-row items-center justify-center gap-2 rounded-[16px] bg-brand py-[14px]" disabled={!accessToken || !hasAuthenticatedSession || isLoading} onPress={async () => {
        if (!accessToken || !hasAuthenticatedSession) {
          setLoadError('Please log in to refresh notifications.');
          return;
        }
        setIsLoading(true);
        try {
          const items = await getNotifications();
          setNotifications(items);
          setLoadError('');
        } catch (_error) {
          setLoadError('Failed to refresh notifications.');
        } finally {
          setIsLoading(false);
        }
      }}>
        <Ionicons name="refresh-outline" size={18} color="#ffffff"/>
        <Text className="text-[14px] font-extrabold text-white">Refresh</Text>
      </AnimatedPressable>
    </Screen>);
}
