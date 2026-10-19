import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiErrorMessage, sendSignupOtp } from '../src/api/authApi';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { useAuthStore } from '../src/store/auth-store';
import { formatOtpMobile, getEmailError, getPasswordError, isValidEmail, isValidPassword, normalizeMobile } from '../src/utils/auth';
export default function SignupScreen() {
    const { preferences } = useAppState();
    const setSignupForm = useAuthStore((state) => state.setSignupForm);
    const [form, setForm] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
        city: '',
        state: '',
    });
    const [showPassword, setShowPassword] = useState({
        password: false,
        confirmPassword: false,
    });
    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({
        type: 'idle',
        message: '',
    });
    const validateSignupField = (key, value, nextForm = form) => {
        switch (key) {
            case 'email':
                return getEmailError(value);
            case 'mobile':
                return value && normalizeMobile(value).length !== 10 ? 'Enter a valid 10 digit mobile number.' : '';
            case 'password':
                return getPasswordError(value);
            case 'confirmPassword':
                return value && value !== nextForm.password ? 'Password and confirm password must match.' : '';
            default:
                return '';
        }
    };
    const update = (key, value) => {
        setStatus({ type: 'idle', message: '' });
        setForm((current) => {
            const nextForm = { ...current, [key]: value };
            setFieldErrors((currentErrors) => ({
                ...currentErrors,
                [key]: validateSignupField(key, value, nextForm),
                ...(key === 'password' ? { confirmPassword: validateSignupField('confirmPassword', nextForm.confirmPassword, nextForm) } : {}),
            }));
            return nextForm;
        });
    };
    const canRegister = Boolean(
        form.name.trim() &&
        isValidEmail(form.email) &&
        normalizeMobile(form.mobile).length === 10 &&
        isValidPassword(form.password) &&
        form.password === form.confirmPassword &&
        form.city.trim() &&
        form.state.trim(),
    );
    const handleRegister = async () => {
        const nextErrors = {
            email: getEmailError(form.email),
            mobile: form.mobile && normalizeMobile(form.mobile).length !== 10 ? 'Enter a valid 10 digit mobile number.' : '',
            password: getPasswordError(form.password),
            confirmPassword: form.password !== form.confirmPassword ? 'Password and confirm password must match.' : '',
        };
        setFieldErrors(nextErrors);

        if (!form.name.trim() || !form.city.trim() || !form.state.trim()) {
            setStatus({ type: 'error', message: 'Please fill all required fields.' });
            return;
        }
        if (nextErrors.email) {
            setStatus({ type: 'error', message: 'Enter a valid email address.' });
            return;
        }
        if (nextErrors.password) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }
        if (nextErrors.mobile) {
            setStatus({ type: 'error', message: 'Enter a valid 10 digit mobile number.' });
            return;
        }
        if (nextErrors.confirmPassword) {
            setStatus({ type: 'error', message: 'Password and confirm password must match.' });
            return;
        }
        const otpMobile = formatOtpMobile(form.mobile);
        try {
            setIsSubmitting(true);
            setStatus({ type: 'idle', message: '' });
            await sendSignupOtp(otpMobile);
            setSignupForm({
                ...form,
                mobile: normalizeMobile(form.mobile),
            });
            router.push({
                pathname: '/otp-verify',
                params: {
                    next: '/profile-setup',
                    identifier: otpMobile,
                },
            });
        }
        catch (error) {
            setStatus({
                type: 'error',
                message: getApiErrorMessage(error, 'Failed to send OTP.'),
            });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<SafeAreaView className="flex-1 bg-transparent">
      <AnimatedBackground />
      <ScrollView className="flex-1" contentContainerClassName="gap-[14px] px-6 py-6" showsVerticalScrollIndicator={false}>
        <AnimatedPressable onPress={() => router.back()}>
          <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Back</Text>
        </AnimatedPressable>
        <Text className={`text-[30px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Create Account</Text>
        <Text className={`mb-1.5 text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Join Career Map today</Text>

        {[
            ['name', 'Full Name', 'Enter your full name'],
            ['email', 'Email Address', 'Enter email'],
            ['mobile', 'Mobile Number', '+91 XXXXX XXXXX'],
            ['password', 'Password', 'Create password'],
            ['confirmPassword', 'Confirm Password', 'Re-enter password'],
            ['city', 'City', 'Enter city'],
            ['state', 'State', 'Enter state'],
        ].map(([key, label, placeholder]) => (<View key={key} className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
            {key.toLowerCase().includes('password') ? (<View className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${fieldErrors[key] ? 'border-danger' : preferences.darkMode ? 'border-[#2d2430] bg-[#211927]' : 'border-line bg-card'}`}>
                <TextInput value={form[key]} onChangeText={(value) => update(key, value)} placeholder={placeholder} placeholderTextColor={palette.muted} className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`} secureTextEntry={!showPassword[key]}/>
                <AnimatedPressable onPress={() => setShowPassword((current) => ({ ...current, [key]: !current[key] }))}>
                  <Ionicons name={showPassword[key] ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted}/>
                </AnimatedPressable>
              </View>) : (<TextInput value={form[key]} onChangeText={(value) => {
                    if (key === 'mobile') {
                        update(key, normalizeMobile(value));
                        setStatus({ type: 'idle', message: '' });
                        return;
                    }
                    update(key, value);
                    setStatus({ type: 'idle', message: '' });
                }} placeholder={placeholder} placeholderTextColor={palette.muted} autoCapitalize={key === 'email' ? 'none' : 'sentences'} keyboardType={key === 'email' ? 'email-address' : key === 'mobile' ? 'number-pad' : 'default'} className={`h-14 rounded-[18px] border px-4 text-[15px] ${fieldErrors[key] ? 'border-danger' : preferences.darkMode ? 'border-[#2d2430] bg-[#211927] text-white' : 'border-line bg-card text-ink'}`}/>)}
            {fieldErrors[key] ? (<Text className="mt-0.5 text-[11px] font-semibold text-danger">{fieldErrors[key]}</Text>) : null}
          </View>))}

        <AnimatedPressable className="mt-3 items-center rounded-[18px] bg-brand py-4" disabled={!canRegister || isSubmitting} onPress={handleRegister}>
          <Text className="text-[15px] font-extrabold text-white">{isSubmitting ? 'Sending OTP...' : 'Register'}</Text>
        </AnimatedPressable>
        {status.type !== 'idle' ? (<Text className={`text-center text-[12px] font-bold ${status.type === 'error' ? 'text-danger' : 'text-success'}`}>{status.message}</Text>) : null}
      </ScrollView>
    </SafeAreaView>);
}
