import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '../src/api/forgotPasswordApi';
import { getApiErrorMessage } from '../src/api/authApi';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { isValidPassword } from '../src/utils/auth';

export default function ResetPasswordScreen() {
  const { preferences } = useAppState();
  const params = useLocalSearchParams();
  const token = useMemo(() => String(params.token || params.resetToken || '').trim(), [params.resetToken, params.token]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({
    type: 'idle',
    message: '',
  });

  const canSubmit = token && isValidPassword(newPassword) && newPassword === confirmPassword;

  const handleResetPassword = async () => {
    if (!token) {
      setStatus({
        type: 'error',
        message: 'Reset token is missing. Open the link from your email again.',
      });
      return;
    }

    if (!isValidPassword(newPassword)) {
      setStatus({
        type: 'error',
        message: 'Password must be at least 6 characters.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({
        type: 'error',
        message: 'Passwords do not match.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus({ type: 'idle', message: '' });

      const response = await resetPassword(token, newPassword, confirmPassword);
      router.replace({
        pathname: '/login',
        params: {
          userType: 'existing',
          mode: 'email',
          resetSuccess: response?.message || 'Password reset successful.',
        },
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to reset password.'),
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
          <Text className={`text-center text-[28px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Reset Password</Text>
          <Text className={`max-w-[280px] text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
            Create a new password for your Career Map account.
          </Text>
        </View>

        {!token ? (
          <View className={`rounded-[18px] border px-4 py-4 ${preferences.darkMode ? 'border-[#2d2430] bg-[#211927]' : 'border-line bg-card'}`}>
            <Text className={`text-[13px] font-semibold ${preferences.darkMode ? 'text-[#f0d8d4]' : 'text-ink'}`}>
              Missing reset token. Please open the password reset link from your email again.
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>New Password</Text>
          <View className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <TextInput
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setStatus({ type: 'idle', message: '' });
              }}
              secureTextEntry={!showPassword}
              placeholder="Enter new password"
              placeholderTextColor={palette.muted}
              className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}
            />
            <AnimatedPressable onPress={() => setShowPassword((value) => !value)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted} />
            </AnimatedPressable>
          </View>

          <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Confirm Password</Text>
          <View className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <TextInput
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setStatus({ type: 'idle', message: '' });
              }}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={palette.muted}
              className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}
            />
            <AnimatedPressable onPress={() => setShowConfirmPassword((value) => !value)}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted} />
            </AnimatedPressable>
          </View>

          <AnimatedPressable className="mt-2 items-center rounded-[18px] bg-brand py-4" onPress={handleResetPassword} disabled={!canSubmit || isSubmitting}>
            <Text className="text-[15px] font-extrabold text-white">{isSubmitting ? 'Resetting...' : 'Reset Password'}</Text>
          </AnimatedPressable>

          {status.type !== 'idle' ? (
            <Text className={`text-center text-[12px] font-bold ${status.type === 'error' ? 'text-danger' : 'text-success'}`}>
              {status.message}
            </Text>
          ) : null}
        </View>

        <View className="mt-auto items-center gap-2 pb-2.5">
          <AnimatedPressable onPress={() => router.replace({ pathname: '/login', params: { userType: 'existing', mode: 'email' } })}>
            <Text className="text-[13px] font-bold text-brand">Back to login</Text>
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
