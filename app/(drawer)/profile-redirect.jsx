import { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { palette } from '../../src/careermap-data';

export default function DrawerProfileRedirect() {
  useEffect(() => {
    router.replace('/(drawer)/(tabs)/profile');
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-paper">
      <ActivityIndicator color={palette.primary} />
    </View>
  );
}
