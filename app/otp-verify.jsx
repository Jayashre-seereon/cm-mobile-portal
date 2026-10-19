import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserHistoryEntry, getApiErrorMessage, sendOtp, verifyOtp } from '../src/api/authApi';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { ZoomInPage } from '../src/page-transition';
import { useAuthStore } from '../src/store/auth-store';
import { formatOtpMobile, mapApiUserToProfile } from '../src/utils/auth';

export default function OtpVerifyScreen() {
  const { preferences, saveUserProfile } = useAppState();
  const { next, identifier, otpType, devOtp } = useLocalSearchParams();  const signupForm = useAuthStore((state) => state.signupForm);
  const setTempToken = useAuthStore((state) => state.setTempToken);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfileIncomplete = useAuthStore((state) => state.setProfileIncomplete);
  const setPendingInstituteOnboarding = useAuthStore((state) => state.setPendingInstituteOnboarding);
  const markAuthenticatedSession = useAuthStore((state) => state.markAuthenticatedSession);
  const clearAuthFlow = useAuthStore((state) => state.clearAuthFlow);

  const flowType = otpType === 'login' ? 'login' : 'signup';
  const mobileNumber = formatOtpMobile(typeof identifier === 'string' && identifier ? identifier : signupForm.mobile);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState({
    type: 'idle',
    message: '',
  });

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setStatus({ type: 'error', message: 'Enter the 6 digit OTP.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus({ type: 'idle', message: '' });

      const response = await verifyOtp(mobileNumber, otp, flowType);

      if (flowType === 'login') {
        const profileIncomplete = Boolean(response?.profileIncomplete);
        const requiresInstituteOnboarding = Boolean(response?.user?.isInstituteStudent) && !profileIncomplete;

        setTempToken('');
        setAccessToken(response.accessToken || '');
        setRefreshToken(response.refreshToken || '');
        setUser(response.user || null);
        setProfileIncomplete(profileIncomplete);
        setPendingInstituteOnboarding(requiresInstituteOnboarding);
        markAuthenticatedSession();

        void createUserHistoryEntry().catch((error) => {
          console.log('User history log failed', error?.response?.data || error?.message || error);
        });

        const profile = mapApiUserToProfile(response.user);
        if (profile) {
          saveUserProfile(profile);
        }

        clearAuthFlow();
        router.replace(requiresInstituteOnboarding ? '/onboarding' : (next || '/(drawer)/(tabs)'));
        return;
      }

      if (!response.tempToken) {
        throw new Error('OTP verified, but no signup token was returned. Please request a new OTP and try again.');
      }

      setTempToken(response.tempToken);
      setStatus({ type: 'success', message: response.message });
      router.replace(next || '/profile-setup');
    } catch (error) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to verify OTP.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsResending(true);
      setStatus({ type: 'idle', message: '' });
      // const response = await sendOtp(mobileNumber, flowType);
      // setStatus({ type: 'success', message: response.message });
            const response = await sendOtp(mobileNumber, flowType);
      // TEMP-DEBUG: remove before production
      const resendOtp = response?.otp || response?.data?.otp;
      setStatus({
        type: 'success',
        message: resendOtp ? `${response.message} (DEV OTP: ${resendOtp})` : response.message,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to resend OTP.'),
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <AnimatedBackground />
      <ZoomInPage style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-[14px] px-6">
          <AnimatedPressable
            className={`absolute left-6 top-6 h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
          </AnimatedPressable>
          <Text className={`text-[28px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Verify OTP</Text>
          <Text className={`max-w-[260px] text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
            Enter the 6-digit code sent to {mobileNumber || 'your phone'}.
          </Text>
                    {/* TEMP-DEBUG: remove before production */}
          {devOtp ? (
            <Text className="text-[13px] font-extrabold text-brand">DEV OTP: {devOtp}</Text>
          ) : null}
          <TextInput
            value={otp}
            onChangeText={(value) => {
              setOtp(value.replace(/\D/g, '').slice(0, 6));
              setStatus({ type: 'idle', message: '' });
            }}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor={palette.muted}
            className={`h-[60px] w-full max-w-[220px] rounded-[18px] border px-4 text-center text-[22px] font-extrabold tracking-[8px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`}
          />
          <AnimatedPressable
            className="mt-2 w-full max-w-[260px] items-center rounded-[18px] bg-brand px-4 py-4"
            disabled={otp.length !== 6 || isSubmitting}
            onPress={handleVerifyOtp}
          >
            <Text className="text-[15px] font-extrabold text-white">{isSubmitting ? 'Verifying...' : 'Verify and Continue'}</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={handleResendOtp} disabled={isResending || !mobileNumber}>
            <Text className="text-[13px] font-bold text-brand">{isResending ? 'Resending OTP...' : 'Resend OTP'}</Text>
          </AnimatedPressable>
          {status.type !== 'idle' ? (
            <Text className={`max-w-[260px] text-center text-[12px] font-bold ${status.type === 'error' ? 'text-danger' : 'text-success'}`}>
              {status.message}
            </Text>
          ) : null}
        </View>
      </ZoomInPage>
    </SafeAreaView>
  );
}
