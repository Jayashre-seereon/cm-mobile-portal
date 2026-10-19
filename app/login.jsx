import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserHistoryEntry, getApiErrorMessage, loginWithPassword, sendOtp } from '../src/api/authApi';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { BeeMascot } from '../src/bee-mascot';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { ZoomInPage } from '../src/page-transition';
import { useAuthStore } from '../src/store/auth-store';
import { formatOtpMobile, getEmailError, getPasswordError, isValidEmail, isValidPassword, mapApiUserToProfile, normalizeMobile } from '../src/utils/auth';

export default function LoginScreen() {
  const { onboarding, preferences, saveUserProfile } = useAppState();
  const { userType } = useLocalSearchParams();
  const setSignupForm = useAuthStore((state) => state.setSignupForm);
  const setOnboardingData = useAuthStore((state) => state.setOnboardingData);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfileIncomplete = useAuthStore((state) => state.setProfileIncomplete);
  const setPendingInstituteOnboarding = useAuthStore((state) => state.setPendingInstituteOnboarding);
  const markAuthenticatedSession = useAuthStore((state) => state.markAuthenticatedSession);
  const clearAuthFlow = useAuthStore((state) => state.clearAuthFlow);

  const isExistingUser = userType === 'existing';
  const [loginMode, setLoginMode] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
  });
  const [status, setStatus] = useState({
    type: 'idle',
    message: '',
  });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const canSubmitEmail = isValidEmail(email) && isValidPassword(password);
  const validateEmailField = (value) => getEmailError(value);
  const validatePasswordField = (value) => getPasswordError(value);

  const completeLogin = (response) => {
    const profileIncomplete = Boolean(response?.profileIncomplete);
    const requiresInstituteOnboarding = Boolean(response?.user?.isInstituteStudent) && !profileIncomplete;

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
    router.replace(requiresInstituteOnboarding ? '/onboarding' : '/(drawer)/(tabs)');
  };

  const handleSendOtp = async () => {
    const normalizedMobile = normalizeMobile(mobile);

    if (normalizedMobile.length !== 10) {
      setStatus({ type: 'error', message: 'Enter a valid 10 digit mobile number.' });
      return;
    }

    const formattedMobile = formatOtpMobile(normalizedMobile);

    try {
      setIsSendingOtp(true);
      setStatus({ type: 'idle', message: '' });

      // if (isExistingUser) {
      //   await sendOtp(formattedMobile, 'login');
      //   router.push({
      //     pathname: '/otp-verify',
      //     params: {
      //       next: '/(drawer)/(tabs)',
      //       identifier: formattedMobile,
      //       otpType: 'login',
      //     },
      //   });
      //   return;
      // }

      // await sendOtp(formattedMobile, 'signup');
      // setOnboardingData(onboarding);
      // setSignupForm({ mobile: normalizedMobile });
      // router.push({
      //   pathname: '/otp-verify',
      //   params: {
      //     next: '/profile-setup',
      //     identifier: formattedMobile,
      //     otpType: 'signup',
      //   },
      // });
            if (isExistingUser) {
        const loginOtpResponse = await sendOtp(formattedMobile, 'login');
        // TEMP-DEBUG: remove before production
        const devOtp = loginOtpResponse?.otp || loginOtpResponse?.data?.otp;
        router.push({
          pathname: '/otp-verify',
          params: {
            next: '/(drawer)/(tabs)',
            identifier: formattedMobile,
            otpType: 'login',
            devOtp: devOtp || '',
          },
        });
        return;
      }

      const signupOtpResponse = await sendOtp(formattedMobile, 'signup');
      // TEMP-DEBUG: remove before production
      const devOtpSignup = signupOtpResponse?.otp || signupOtpResponse?.data?.otp;
      setOnboardingData(onboarding);
      setSignupForm({ mobile: normalizedMobile });
      router.push({
        pathname: '/otp-verify',
        params: {
          next: '/profile-setup',
          identifier: formattedMobile,
          otpType: 'signup',
          devOtp: devOtpSignup || '',
        },
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to send OTP.'),
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleEmailLogin = async () => {
    const nextErrors = {
      email: validateEmailField(email),
      password: validatePasswordField(password),
    };
    setFieldErrors(nextErrors);

    if (nextErrors.email) {
      setStatus({ type: 'error', message: 'Enter a valid email address.' });
      return;
    }

    if (nextErrors.password) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setIsSubmittingEmail(true);
      setStatus({ type: 'idle', message: '' });
      const response = await loginWithPassword(email.trim(), password);
      completeLogin(response);
    } catch (error) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to login with email and password.'),
      });
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <AnimatedBackground />
      <ZoomInPage style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-6 py-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AnimatedPressable
            className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
          </AnimatedPressable>

          <View className="items-center gap-2.5 pt-2">
            <View className="h-[96px] w-[96px] items-center justify-center ">
              <BeeMascot size={100} draggable={false} />
            </View>
            <Text className={`text-center text-[28px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
              {isExistingUser ? 'Welcome Back' : 'Continue Your Journey'}
            </Text>
            <Text className={`text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              {isExistingUser ? "Choose how you'd like to log in" : 'Use OTP to continue'}
            </Text>
          </View>

          <View className={`flex-row rounded-[18px] p-1 ${preferences.darkMode ? 'bg-[#080808]' : 'bg-[#e8e2de]'}`}>
            <View className="flex-1 px-[2px]">
              <AnimatedPressable
                className={`items-center rounded-[14px] px-2 py-3 ${loginMode === 'mobile' ? 'bg-brand' : ''}`}
                onPress={() => setLoginMode('mobile')}
              >
                <Text
                  className={`text-center text-[12px] font-extrabold ${loginMode === 'mobile' ? 'text-white' : preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}
                >
                  Mobile OTP
                </Text>
              </AnimatedPressable>
            </View>
            {isExistingUser ? (
              <View className="flex-1 px-[2px]">
                <AnimatedPressable
                  className={`items-center rounded-[14px] px-2 py-3 ${loginMode === 'email' ? 'bg-brand' : ''}`}
                  onPress={() => setLoginMode('email')}
                >
                  <Text
                    className={`text-center text-[12px] font-extrabold ${loginMode === 'email' ? 'text-white' : preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}
                  >
                    Email
                  </Text>
                </AnimatedPressable>
              </View>
            ) : null}
          </View>

          {loginMode === 'mobile' ? (
            <View className="gap-[14px]">
              <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Mobile Number</Text>
              <View
                className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
              >
                <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>+91</Text>
                <TextInput
                  value={mobile}
                  onChangeText={(value) => {
                    setMobile(normalizeMobile(value));
                    setStatus({ type: 'idle', message: '' });
                  }}
                  keyboardType="number-pad"
                  placeholder="Enter mobile number"
                  placeholderTextColor={palette.muted}
                  className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}
                />
              </View>
              <AnimatedPressable
                className="mt-1.5 items-center rounded-[18px] bg-brand py-4"
                disabled={normalizeMobile(mobile).length !== 10 || isSendingOtp}
                onPress={handleSendOtp}
              >
                <Text className="text-[15px] font-extrabold text-white">{isSendingOtp ? 'Sending OTP...' : 'Send OTP'}</Text>
              </AnimatedPressable>
            </View>
          ) : null}

          {isExistingUser && loginMode === 'email' ? (
            <View className="gap-[14px]">
              <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setFieldErrors((current) => ({
                    ...current,
                    email: validateEmailField(value),
                  }));
                  setStatus({ type: 'idle', message: '' });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Enter email"
                placeholderTextColor={palette.muted}
                className={`h-14 rounded-[18px] border px-4 text-[15px] ${fieldErrors.email ? 'border-danger' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`}
              />
              {fieldErrors.email ? (<Text className="text-[11px] font-semibold text-danger">{fieldErrors.email}</Text>) : null}
              <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Password</Text>
              <View
                className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${fieldErrors.password ? 'border-danger' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
              >
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setFieldErrors((current) => ({
                      ...current,
                      password: validatePasswordField(value),
                    }));
                    setStatus({ type: 'idle', message: '' });
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="Enter password"
                  placeholderTextColor={palette.muted}
                  className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}
                />
                <AnimatedPressable onPress={() => setShowPassword((value) => !value)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted} />
                </AnimatedPressable>
              </View>
              {fieldErrors.password ? (<Text className="text-[11px] font-semibold text-danger">{fieldErrors.password}</Text>) : null}
              <AnimatedPressable
                className="mt-1.5 items-center rounded-[18px] bg-brand py-4"
                disabled={!canSubmitEmail || isSubmittingEmail}
                onPress={handleEmailLogin}
              >
                <Text className="text-[15px] font-extrabold text-white">
                  {isSubmittingEmail ? 'Logging in...' : 'Login with Email'}
                </Text>
              </AnimatedPressable>
            </View>
          ) : null}

          {status.type !== 'idle' ? (
            <Text className={`text-center text-[12px] font-bold ${status.type === 'error' ? 'text-danger' : 'text-success'}`}>
              {status.message}
            </Text>
          ) : null}

          <View className="mt-auto items-center gap-3 pb-2.5">
            {isExistingUser && loginMode === 'email' ? (
              <AnimatedPressable onPress={() => router.push('/forgot-password')}>
                <Text className={`text-[13px] font-bold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Forgot Password?</Text>
              </AnimatedPressable>
            ) : null}

            <AnimatedPressable onPress={() => router.replace(isExistingUser ? '/onboarding' : '/auth-entry')}>
              <Text className="text-[13px] font-bold text-brand">
                {isExistingUser ? 'New user? Start onboarding' : 'Existing user? Go to login options'}
              </Text>
            </AnimatedPressable>

            <Text className={`text-center text-[11px] leading-[17px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              By continuing, you agree to Career Map&apos;s Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </ZoomInPage>
    </SafeAreaView>
  );
}
