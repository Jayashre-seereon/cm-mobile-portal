import '../global.css';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { AppStateProvider, useAppState } from '../src/app-state';
import { CareerBeeAssistant } from '../src/career-bee-assistant';
function RootNavigator() {
    const { preferences } = useAppState();
    const segments = useSegments();
    const showAssistant = segments[0] === '(drawer)';
    return (<>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'}/>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index"/>
        <Stack.Screen name="auth-entry"/>
        <Stack.Screen name="onboarding"/>
        <Stack.Screen name="login"/>
        <Stack.Screen name="signup"/>
        <Stack.Screen name="otp-verify"/>
        <Stack.Screen name="profile-setup"/>
        <Stack.Screen name="promo"/>
        <Stack.Screen name="forgot-password"/>
        <Stack.Screen name="reset-password"/>
        <Stack.Screen name="checkout"/>
        <Stack.Screen name="payment-success"/>
        <Stack.Screen name="(drawer)"/>
      </Stack>
      <CareerBeeAssistant hidden={!showAssistant}/>
    </>);
}
export default function RootLayout() {
    const [fontsLoaded] = useFonts({
      Poppins_400Regular,
      Poppins_500Medium,
      Poppins_600SemiBold,
      Poppins_700Bold,
      Poppins_800ExtraBold,
      Poppins_900Black,
    });
    if (!fontsLoaded) return null;
    return (<AppStateProvider>
      <RootNavigator />
    </AppStateProvider>);
}
