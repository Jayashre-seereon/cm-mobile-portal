import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '../src/api/forgotPasswordApi';
import { getApiErrorMessage } from '../src/api/authApi';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { isValidEmail } from '../src/utils/auth';

export default function ForgotPasswordScreen() {
  const { preferences } = useAppState();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({
    type: 'idle',
    message: '',
  });

  const handleContinue = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus({
        type: 'error',
        message: 'Enter your email address.',
      });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setStatus({
        type: 'error',
        message: 'Enter a valid email address.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus({ type: 'idle', message: '' });

      const response = await forgotPassword(trimmedEmail);
      setStatus({
        type: 'success',
        message: response?.message || 'If the email exists, a reset link has been sent.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to send password reset email.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <AnimatedBackground />
      <View className="flex-1 gap-4 px-6 py-6">
        <AnimatedPressable
          className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#312636]' : 'bg-surface'}`}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
        </AnimatedPressable>
        <View className="mb-2 mt-6 items-center gap-2">
          <View className="h-[68px] w-[68px] items-center justify-center rounded-[22px]" style={{ backgroundColor: `${palette.primary}12` }}>
            <Ionicons name="key" size={30} color={palette.primary} />
          </View>
          <Text className={`text-center text-[28px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Forgot Password</Text>
          <Text className={`max-w-[260px] text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
            Enter your email address and we&apos;ll send a reset link to your inbox.
          </Text>
        </View>

        <View className="gap-3">
          <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setStatus({ type: 'idle', message: '' });
            }}
            placeholder="Enter your email"
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            className={`h-14 rounded-[18px] border px-4 text-[15px] ${preferences.darkMode ? 'border-[#2d2430] bg-[#211927] text-white' : 'border-line bg-card text-ink'}`}
          />
          <AnimatedPressable className="mt-2 items-center rounded-[18px] bg-brand py-4" onPress={handleContinue} disabled={isSubmitting}>
            <Text className="text-[15px] font-extrabold text-white">{isSubmitting ? 'Sending Link...' : 'Send Reset Link'}</Text>
          </AnimatedPressable>

          {status.type !== 'idle' ? (
            <Text className={`text-center text-[12px] font-bold ${status.type === 'error' ? 'text-danger' : 'text-success'}`}>
              {status.message}
            </Text>
          ) : null}
        </View>

        <View className="mt-auto items-center gap-2 pb-2.5">
          <Text className={`text-center text-[12px] leading-[18px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
            Open the reset link from your email. If you tap the mobile link, the app will open the password reset screen directly.
          </Text>

          <AnimatedPressable onPress={() => router.push({ pathname: '/login', params: { userType: 'existing', mode: 'email' } })}>
            <Text className="text-[13px] font-bold text-brand">Back to login</Text>
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
