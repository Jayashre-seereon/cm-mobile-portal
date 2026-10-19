import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAppState } from '../../src/app-state';
import { changePassword, createHelpCenterRequest, getApiErrorMessage, logoutUser } from '../../src/api/authApi';
import { palette } from '../../src/careermap-data';
import { AnimatedPressable, Screen } from '../../src/careermap-ui';
import { StaggerFadeUpItem } from '../../src/page-transition';
import { useAuthStore } from '../../src/store/auth-store';
export default function SettingsScreen() {
    const { preferences, requestProfileEdit, toggleDarkMode, userProfile } = useAppState();
    const { view: initialView } = useLocalSearchParams();
    const authUser = useAuthStore((state) => state.user);
    const accessToken = useAuthStore((state) => state.accessToken);
    const clearAuthFlow = useAuthStore((state) => state.clearAuthFlow);
    const logout = useAuthStore((state) => state.logout);
    const [view, setView] = useState(initialView === 'help' ? 'help' : 'menu');
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });
    const [passwordErrors, setPasswordErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [helpForm, setHelpForm] = useState({
        email: '',
        subject: '',
        message: '',
    });
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
    useEffect(() => {
        if (!feedback.message)
            return;
        const timer = setTimeout(() => setFeedback({ type: 'idle', message: '' }), 2600);
        return () => clearTimeout(timer);
    }, [feedback]);
    useEffect(() => {
        setHelpForm((current) => ({
            ...current,
            email: current.email || authUser?.email || userProfile.email || '',
        }));
    }, [authUser?.email, userProfile.email]);
    const validatePasswordField = (key, value, nextForm = passwordForm) => {
        switch (key) {
            case 'currentPassword':
                return value ? '' : 'Current password is required.';
            case 'newPassword':
                if (!value) {
                    return 'New password is required.';
                }
                if (value.length < 6) {
                    return 'New password must be at least 6 characters.';
                }
                return '';
            case 'confirmPassword':
                if (!value) {
                    return 'Please confirm your new password.';
                }
                if (value !== nextForm.newPassword) {
                    return 'Confirm password must match new password.';
                }
                return '';
            default:
                return '';
        }
    };
    const settingsItems = useMemo(() => [
        { label: 'Edit Profile', icon: 'person-outline', color: palette.blue, action: () => {
                requestProfileEdit();
                router.navigate('/(drawer)/(tabs)/profile');
            } },
        { label: 'Change Password', icon: 'lock-closed-outline', color: palette.purple, action: () => setView('password') },
        { label: preferences.darkMode ? 'Light Mode' : 'Dark Mode', icon: preferences.darkMode ? 'sunny-outline' : 'moon-outline', color: palette.secondary, action: toggleDarkMode },
        { label: 'Help Centre', icon: 'help-circle-outline', color: palette.teal, action: () => setView('help') },
    ], [preferences.darkMode, requestProfileEdit, toggleDarkMode]);
    if (view === 'password') {
        const canSave = passwordForm.currentPassword.length > 0 &&
            passwordForm.newPassword.length >= 6 &&
            passwordForm.newPassword === passwordForm.confirmPassword;
        const handlePasswordChange = (key, value) => {
            setPasswordForm((current) => {
                const nextForm = { ...current, [key]: value };
                setPasswordErrors((currentErrors) => ({
                    ...currentErrors,
                    [key]: validatePasswordField(key, value, nextForm),
                    ...(key === 'newPassword' ? { confirmPassword: validatePasswordField('confirmPassword', nextForm.confirmPassword, nextForm) } : {}),
                }));
                return nextForm;
            });
        };
        const handleSavePassword = async () => {
            const nextErrors = {
                currentPassword: validatePasswordField('currentPassword', passwordForm.currentPassword),
                newPassword: validatePasswordField('newPassword', passwordForm.newPassword),
                confirmPassword: validatePasswordField('confirmPassword', passwordForm.confirmPassword, passwordForm),
            };
            setPasswordErrors(nextErrors);

            if (nextErrors.currentPassword || nextErrors.newPassword || nextErrors.confirmPassword) {
                setFeedback({
                    type: 'error',
                    message: 'Please fix the password errors before saving.',
                });
                return;
            }

            try {
                const response = await changePassword(passwordForm);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setShowPassword({ currentPassword: false, newPassword: false, confirmPassword: false });
                setFeedback({
                    type: 'success',
                    message: response?.message || 'Password changed successfully.',
                });
            }
            catch (error) {
                setFeedback({
                    type: 'error',
                    message: getApiErrorMessage(error, 'Failed to change password.'),
                });
            }
        };
        return (<Screen>
        <View className="flex-row items-center gap-3">
          <AnimatedPressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => setView('menu')}>
            <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
          </AnimatedPressable>
          <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Change Password</Text>
        </View>

        <View className={`gap-3 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          {[
                ['currentPassword', 'Current Password'],
                ['newPassword', 'New Password'],
                ['confirmPassword', 'Confirm Password'],
            ].map(([key, label]) => (<View key={key} className="gap-1.5">
              <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
              <View className={`flex-row items-center gap-3 rounded-[18px] border px-4 py-[14px] ${passwordErrors[key] ? 'border-danger' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
                <Ionicons name="lock-closed-outline" size={18} color={palette.muted}/>
                <TextInput value={passwordForm[key]} onChangeText={(value) => handlePasswordChange(key, value)} secureTextEntry={!showPassword[key]} placeholder={label} placeholderTextColor={palette.muted} className={`flex-1 text-[14px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}/>
                <AnimatedPressable onPress={() => setShowPassword((current) => ({ ...current, [key]: !current[key] }))}>
                  <Ionicons name={showPassword[key] ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted}/>
                </AnimatedPressable>
              </View>
              {passwordErrors[key] ? (<Text className="text-[11px] font-semibold text-danger">{passwordErrors[key]}</Text>) : null}
            </View>))}
              <AnimatedPressable className="rounded-[18px] bg-brand py-4" disabled={!canSave} onPress={() => { void handleSavePassword(); }}>
            <Text className="text-center text-[15px] font-extrabold text-white">Save Password</Text>
          </AnimatedPressable>
          {feedback.message ? (<View className={`rounded-[18px] border px-4 py-3 ${feedback.type === 'error'
                ? preferences.darkMode
                    ? 'border-[#5a2630] bg-[#2b151b]'
                    : 'border-[#efc8c0] bg-[#fff4f2]'
                : preferences.darkMode
                    ? 'border-[#22462f] bg-[#102016]'
                    : 'border-[#cde7d4] bg-[#edf8f0]'}`}>
              <Text className={`text-[13px] font-extrabold ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>{feedback.message}</Text>
            </View>) : null}
        </View>
      </Screen>);
    }
    if (view === 'help') {
        return (<Screen>
        <View className="flex-row items-center gap-3">
          <AnimatedPressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => setView('menu')}>
            <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
          </AnimatedPressable>
          <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Help Centre</Text>
        </View>

        <View className={`gap-3 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Your Email</Text>
            <TextInput value={helpForm.email} onChangeText={(value) => setHelpForm((current) => ({ ...current, email: value }))} keyboardType="email-address" autoCapitalize="none" placeholder="Enter your email" placeholderTextColor={palette.muted} className={`rounded-[18px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-surface text-ink'}`}/>
          </View>
          <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Subject</Text>
            <TextInput value={helpForm.subject} onChangeText={(value) => setHelpForm((current) => ({ ...current, subject: value }))} placeholder="Enter subject" placeholderTextColor={palette.muted} className={`rounded-[18px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-surface text-ink'}`}/>
          </View>
          <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Message</Text>
            <TextInput value={helpForm.message} onChangeText={(value) => setHelpForm((current) => ({ ...current, message: value }))} multiline textAlignVertical="top" placeholder="Describe your issue" placeholderTextColor={palette.muted} className={`min-h-[130px] rounded-[18px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-surface text-ink'}`}/>
          </View>
          <AnimatedPressable className="rounded-[18px] bg-brand py-4" onPress={() => {
                void (async () => {
                    try {
                        const response = await createHelpCenterRequest({
                            email: helpForm.email.trim(),
                            subject: helpForm.subject.trim(),
                            message: helpForm.message.trim(),
                        });
                        setHelpForm({
                            email: authUser?.email || userProfile.email || '',
                            subject: '',
                            message: '',
                        });
                        setFeedback({
                            type: 'success',
                            message: response?.message || 'Help request sent successfully.',
                        });
                    }
                    catch (error) {
                        setFeedback({
                            type: 'error',
                            message: getApiErrorMessage(error, 'Failed to send help request.'),
                        });
                    }
                })();
            }}>
            <Text className="text-center text-[15px] font-extrabold text-white">Send to Email Support</Text>
          </AnimatedPressable>
          {feedback.message ? (<View className={`rounded-[18px] border px-4 py-3 ${feedback.type === 'error'
                ? preferences.darkMode
                    ? 'border-[#5a2630] bg-[#2b151b]'
                    : 'border-[#efc8c0] bg-[#fff4f2]'
                : preferences.darkMode
                    ? 'border-[#22462f] bg-[#102016]'
                    : 'border-[#cde7d4] bg-[#edf8f0]'}`}>
              <Text className={`text-[13px] font-extrabold ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>{feedback.message}</Text>
            </View>) : null}
        </View>
      </Screen>);
    }
    return (<Screen>
      <View className="flex-row items-center gap-3">
        <AnimatedPressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
        </AnimatedPressable>
        <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Settings</Text>
      </View>

      {feedback.message && view === 'menu' ? (<View className={`rounded-[18px] border px-4 py-3 ${feedback.type === 'error'
                ? preferences.darkMode
                    ? 'border-[#5a2630] bg-[#2b151b]'
                    : 'border-[#efc8c0] bg-[#fff4f2]'
                : preferences.darkMode
                    ? 'border-[#22462f] bg-[#102016]'
                    : 'border-[#cde7d4] bg-[#edf8f0]'}`}>
          <Text className={`text-[13px] font-extrabold ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>{feedback.message}</Text>
        </View>) : null}

      <View className={`overflow-hidden rounded-[24px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
        {settingsItems.map((item, index) => (<StaggerFadeUpItem key={item.label} index={index}>
          <AnimatedPressable className={`flex-row items-center justify-between px-4 py-4 ${index < settingsItems.length - 1 ? 'border-b border-line' : ''}`} onPress={item.action}>
            <View className="flex-row items-center gap-3">
              <View className={`h-9 w-9 items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`}>
                <Ionicons name={item.icon} size={18} color={item.color}/>
              </View>
              <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted}/>
          </AnimatedPressable>
          </StaggerFadeUpItem>))}
      </View>

      <AnimatedPressable className="flex-row items-center justify-center gap-2 rounded-[18px] border border-[#efc8c0] bg-[#fff4f2] py-4" onPress={() => {
            void (async () => {
                if (isLoggingOut) {
                    return;
                }
                try {
                    setIsLoggingOut(true);
                    await logoutUser(accessToken);
                }
                catch (_error) {
                    setFeedback({
                        type: 'error',
                        message: 'Logout API did not respond. Signed out locally.',
                    });
                }
                finally {
                    clearAuthFlow();
                    logout();
                    setIsLoggingOut(false);
                    router.replace('/auth-entry');
                }
            })();
        }}>
        <Ionicons name="log-out-outline" size={18} color={palette.danger}/>
        <Text className="text-[14px] font-extrabold text-danger">{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
      </AnimatedPressable>
    </Screen>);
}
