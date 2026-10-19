import { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';

export default function PsychometricTestScreen() {
  const { preferences } = useAppState();

  useEffect(() => {
    router.replace('/(drawer)/(tabs)/assessment');
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: preferences.darkMode ? '#070709' : palette.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 12, color: preferences.darkMode ? '#ffffff' : palette.text, fontWeight: '700' }}>
          Loading Psychometric Assessment...
        </Text>
      </View>
    </SafeAreaView>
  );
}
