import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useAppState } from '../../src/app-state';
import { API_BASE_URL } from '../../src/api/axios';
import { palette } from '../../src/careermap-data';

export default function AssessmentPreviewScreen() {
  const { preferences } = useAppState();
  const assessmentApiBaseUrl = API_BASE_URL || 'http://localhost:5000/api';
  const htmlContent = useMemo(() => require('../../assets/assessment/phycometrichalftest.html'), []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('API_BASE_URL', assessmentApiBaseUrl);

      const handleAssessmentMessage = (event) => {
        if (event.origin === window.location.origin && event.data === 'GO_DASHBOARD') {
          router.replace('/(drawer)/(tabs)');
        }
      };

      window.addEventListener('message', handleAssessmentMessage);
      return () => window.removeEventListener('message', handleAssessmentMessage);
    }
  }, [assessmentApiBaseUrl]);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: preferences.darkMode ? '#050505' : palette.background }}>
        <View style={{ flex: 1 }}>
          <iframe
            title="Psychometric Assessment"
            src="/assessment/phycometrichalftest.html"
            style={{ border: 0, width: '100%', height: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: preferences.darkMode ? '#050505' : palette.background }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://careermap.local/' }}
        injectedJavaScriptBeforeContentLoaded={`
          (function () {
            try {
              window.__CAREERMAP_API_BASE_URL__ = ${JSON.stringify(assessmentApiBaseUrl)};
              localStorage.setItem("API_BASE_URL", ${JSON.stringify(assessmentApiBaseUrl)});
            } catch (error) {}
          })();
          true;
        `}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'GO_DASHBOARD') {
            router.replace('/(drawer)/(tabs)');
          }
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={palette.primary} />
            <Text style={{ marginTop: 12, color: preferences.darkMode ? '#ffffff' : palette.text, fontWeight: '700' }}>
              Loading psychometric test...
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
