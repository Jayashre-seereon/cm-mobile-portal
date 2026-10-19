import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiErrorMessage, signupUser } from '../src/api/authApi';
import { useAppState } from '../src/app-state';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { AnimatedBackground } from '../src/animated-background';
import { ZoomInPage } from '../src/page-transition';
import { useAuthStore } from '../src/store/auth-store';
import { buildLandingData, buildUsername, formatDateForApi, formatDateForDisplay, formatOtpMobile, getDateError, getEmailError, getPasswordError, isValidDateInput, isValidEmail, isValidPassword, normalizeMobile, splitFullName } from '../src/utils/auth';
const selectionMeta = [
    { key: 'selectedClass', label: 'Class', icon: 'school-outline', color: palette.blue },
    { key: 'selectedStream', label: 'Stream', icon: 'layers-outline', color: palette.purple },
    { key: 'selectedClarity', label: 'Career Clarity', icon: 'compass-outline', color: palette.orange },
    { key: 'selectedGuidance', label: 'Guidance', icon: 'chatbubble-ellipses-outline', color: palette.green },
];
export default function ProfileSetupScreen() {
    const { onboarding, preferences, saveOnboarding, saveUserProfile, showPromoMessage, userProfile } = useAppState();
    const signupForm = useAuthStore((state) => state.signupForm);
    const onboardingData = useAuthStore((state) => state.onboardingData);
    const tempToken = useAuthStore((state) => state.tempToken);
    const setAccessToken = useAuthStore((state) => state.setAccessToken);
    const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
    const setUser = useAuthStore((state) => state.setUser);
    const markAuthenticatedSession = useAuthStore((state) => state.markAuthenticatedSession);
    const clearAuthFlow = useAuthStore((state) => state.clearAuthFlow);
    const setOnboardingData = useAuthStore((state) => state.setOnboardingData);
    const mergedOnboarding = useMemo(() => ({
        ...onboarding,
        ...onboardingData,
        selectedInterests: onboardingData.selectedInterests?.length ? onboardingData.selectedInterests : onboarding.selectedInterests,
        selectedStrengths: onboardingData.selectedStrengths?.length ? onboardingData.selectedStrengths : onboarding.selectedStrengths,
        selectedPriorities: onboardingData.selectedPriorities?.length ? onboardingData.selectedPriorities : onboarding.selectedPriorities,
    }), [onboarding, onboardingData]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: signupForm.name || mergedOnboarding.name || userProfile.name || '',
        username: buildUsername(signupForm.name || mergedOnboarding.name, signupForm.email || userProfile.email),
        email: signupForm.email || userProfile.email || '',
        mobile: signupForm.mobile || normalizeMobile(userProfile.mobile),
        password: signupForm.password || userProfile.password || '',
        address: userProfile.address,
        gender: userProfile.gender,
        dob: formatDateForDisplay(userProfile.dob),
        city: signupForm.city || userProfile.city || '',
        stateName: signupForm.state || userProfile.stateName || '',
        district: userProfile.district || '',
        country: userProfile.country || 'India',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        mobile: '',
        password: '',
        dob: '',
    });
    const [status, setStatus] = useState({
        type: 'idle',
        message: '',
    });
    useEffect(() => {
        if (status.type === 'idle') {
            return undefined;
        }
        const timer = setTimeout(() => {
            setStatus({ type: 'idle', message: '' });
        }, 2600);
        return () => clearTimeout(timer);
    }, [status]);
    useEffect(() => {
        const hasStoreSelections = Boolean(onboardingData.selectedClass ||
            onboardingData.selectedStream ||
            onboardingData.selectedClarity ||
            onboardingData.selectedInterests?.length ||
            onboardingData.selectedStrengths?.length ||
            onboardingData.selectedPriorities?.length);
        const hasContextSelections = Boolean(onboarding.selectedClass ||
            onboarding.selectedStream ||
            onboarding.selectedClarity ||
            onboarding.selectedInterests?.length ||
            onboarding.selectedStrengths?.length ||
            onboarding.selectedPriorities?.length);
        if (!hasStoreSelections && hasContextSelections) {
            setOnboardingData(onboarding);
        }
    }, [onboarding, onboardingData, setOnboardingData]);
    useEffect(() => {
        setForm((current) => ({
            ...current,
            name: current.name || signupForm.name || mergedOnboarding.name || '',
            username: current.username || buildUsername(signupForm.name || mergedOnboarding.name, signupForm.email || userProfile.email),
            email: current.email || signupForm.email || '',
            mobile: current.mobile || signupForm.mobile || '',
            city: current.city || signupForm.city || '',
            stateName: current.stateName || signupForm.state || '',
        }));
    }, [mergedOnboarding.name, signupForm, userProfile.email]);
    const validateField = (key, value) => {
        switch (key) {
            case 'email':
                return getEmailError(value);
            case 'mobile':
                return value && normalizeMobile(value).length !== 10 ? 'Enter a valid 10 digit mobile number.' : '';
            case 'password':
                return getPasswordError(value);
            case 'dob':
                return getDateError(value);
            default:
                return '';
        }
    };
    const update = (key, value) => {
        setStatus({ type: 'idle', message: '' });
        setForm((current) => ({ ...current, [key]: value }));
        if (['email', 'mobile', 'password', 'dob'].includes(key)) {
            setFieldErrors((current) => ({
                ...current,
                [key]: validateField(key, value),
            }));
        }
    };
    const isValid = form.name &&
        form.username &&
        isValidEmail(form.email) &&
        normalizeMobile(form.mobile).length === 10 &&
        isValidPassword(form.password) &&
        form.gender &&
        form.dob &&
        isValidDateInput(form.dob);
    const onboardingChips = useMemo(() => [
        ...selectionMeta
            .map((item) => ({
            ...item,
            value: mergedOnboarding[item.key],
        }))
            .filter((item) => Boolean(item.value)),
        ...mergedOnboarding.selectedInterests.map((item) => ({ label: item, icon: 'sparkles-outline', color: palette.primary })),
        ...mergedOnboarding.selectedStrengths.map((item) => ({ label: item, icon: 'flash-outline', color: palette.teal })),
        ...mergedOnboarding.selectedPriorities.map((item) => ({ label: item, icon: 'flag-outline', color: palette.secondary })),
    ], [mergedOnboarding]);
    const hasOnboardingSelections = mergedOnboarding.selectedClass ||
        mergedOnboarding.selectedStream ||
        mergedOnboarding.selectedClarity ||
        mergedOnboarding.selectedGuidance ||
        mergedOnboarding.selectedInterests.length > 0 ||
        mergedOnboarding.selectedStrengths.length > 0 ||
        mergedOnboarding.selectedPriorities.length > 0;
    const handleSubmit = async () => {
        const nextErrors = {
            email: getEmailError(form.email),
            mobile: form.mobile && normalizeMobile(form.mobile).length !== 10 ? 'Enter a valid 10 digit mobile number.' : '',
            password: getPasswordError(form.password),
            dob: getDateError(form.dob),
        };
        setFieldErrors(nextErrors);

        if (!tempToken) {
            setStatus({ type: 'error', message: 'Please verify OTP first.' });
            return;
        }
        if (normalizeMobile(form.mobile).length !== 10) {
            setStatus({ type: 'error', message: 'Enter a valid 10 digit mobile number.' });
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
        if (nextErrors.dob) {
            setStatus({ type: 'error', message: 'Date of birth must be in DD-MM-YYYY format.' });
            return;
        }

        const { firstName, lastName } = splitFullName(form.name);
        const payload = {
            firstName,
            lastName,
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            country: form.country.trim() || 'India',
            state: form.stateName.trim(),
            city: form.city.trim(),
            district: form.district.trim(),
            gender: form.gender,
            address: form.address.trim(),
            dataOfBirth: formatDateForApi(form.dob),
            image: 'image_url.png',
            mobile: formatOtpMobile(form.mobile),
            status: 'Active',
            landingData: buildLandingData(mergedOnboarding),
        };
        try {
            setIsSubmitting(true);
            setStatus({ type: 'idle', message: '' });
            const response = await signupUser(payload, tempToken);
            setAccessToken(response.accessToken || '');
            setRefreshToken(response.refreshToken || '');
            setUser(response.user || null);
            markAuthenticatedSession();
            clearAuthFlow();
            saveOnboarding({ ...mergedOnboarding, name: form.name });
            saveUserProfile({
                ...userProfile,
                ...form,
                mobile: formatOtpMobile(form.mobile),
                childName: mergedOnboarding.childName,
            });
            showPromoMessage(response.message || 'Profile created successfully.');
            router.replace('/promo');
        }
        catch (error) {
            setStatus({
                type: 'error',
                message: getApiErrorMessage(error, 'Failed to create profile.'),
            });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}> 
          <AnimatedBackground />  
            <ZoomInPage style={{ flex: 1 }}>
            {status.type !== 'idle' ? (<View className="absolute left-4 right-4 top-5 z-20 items-center">
                <View className={`min-h-12 w-full max-w-[360px] flex-row items-center gap-3 rounded-[22px] px-4 py-3 ${status.type === 'error' ? 'bg-[#fff4f6]' : 'bg-[#eefaf2]'}`} style={{
                shadowColor: status.type === 'error' ? '#d94b68' : '#2f9367',
                shadowOpacity: 0.14,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
            }}>
                  <View className={`h-8 w-8 items-center justify-center rounded-full ${status.type === 'error' ? 'bg-[#ffd8e1]' : 'bg-[#d7f1e0]'}`}>
                    <Ionicons name={status.type === 'error' ? 'alert-outline' : 'checkmark'} size={17} color={status.type === 'error' ? '#c1274a' : '#237a4d'}/>
                  </View>
                  <Text className={`flex-1 text-[13px] font-bold ${status.type === 'error' ? 'text-[#8f1d37]' : 'text-[#1f5135]'}`} numberOfLines={2}>{status.message}</Text>
                </View>
              </View>) : null}
            <ScrollView className="flex-1" contentContainerClassName="gap-[14px] px-6 py-6" showsVerticalScrollIndicator={false}>
        <AnimatedPressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
        </AnimatedPressable>
        <View className="mb-2 items-center gap-2">
          <View className="h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-brand">
            <Ionicons name="person-circle-outline" size={34} color="#fff"/>
          </View>
          <Text className={`text-center text-[28px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Complete Your Profile</Text>
          <Text className={`text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Help us serve you better</Text>
        </View>

        {hasOnboardingSelections ? (<View className={`gap-[14px] rounded-[22px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <View className="flex-row items-center gap-3">
              <View className="h-[38px] w-[38px] items-center justify-center rounded-[14px]" style={{ backgroundColor: `${palette.primary}10` }}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color={palette.primary}/>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className={`text-[15px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Your Onboarding Selections</Text>
                <Text className={`text-[12px] leading-[18px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>We carried these choices over from onboarding.</Text>
              </View>
            </View>

            {mergedOnboarding.userType ? (<View className="flex-row flex-wrap gap-2.5">
                <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-paper'}`}>
                  <Ionicons name={mergedOnboarding.userType === 'parent' ? 'people-outline' : 'person-outline'} size={14} color={palette.primary}/>
                  <Text className="text-[12px] font-extrabold text-brand">{mergedOnboarding.userType === 'parent' ? 'Parent Journey' : 'Student Journey'}</Text>
                </View>
                {mergedOnboarding.childName ? (<View className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-paper'}`}>
                    <Ionicons name="heart-outline" size={14} color={palette.orange}/>
                    <Text className="text-[12px] font-extrabold" style={{ color: palette.orange }}>{mergedOnboarding.childName}</Text>
                  </View>) : null}
              </View>) : null}

            <View className="flex-row flex-wrap gap-2.5">
              {onboardingChips.map((item) => (<View key={`${item.label}-${item.icon}`} className={`flex-row items-center gap-[7px] rounded-full px-3 py-[9px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-paper'}`}>
                  <Ionicons name={item.icon} size={14} color={item.color}/>
                  <Text className={`text-[12px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.label}</Text>
                </View>))}
            </View>
          </View>) : null}

        {[
            ['name', mergedOnboarding.userType === 'parent' ? 'Parent Name' : 'Full Name', 'Enter your full name', 'person-outline'],
            ['username', 'Username', 'Choose a username', 'at-outline'],
            ['email', 'Email Address', 'Enter email', 'mail-outline'],
            ['mobile', 'Mobile Number', '+91 XXXXX XXXXX', 'call-outline'],
            ['password', 'Password', 'Create password', 'lock-closed-outline'],
            ['address', 'Address', 'Enter your address', 'location-outline'],
            ['district', 'District', 'Enter district', 'business-outline'],
            ['city', 'City', 'Enter city', 'business-outline'],
            ['stateName', 'State', 'Enter state', 'map-outline'],
            ['country', 'Country', 'Enter country', 'flag-outline'],
        ].map(([key, label, placeholder, icon]) => (<View key={key} className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
            <View className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${fieldErrors[key] ? 'border-danger' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
              <Ionicons name={icon} size={18} color={palette.muted}/>
              <TextInput value={form[key]} onChangeText={(value) => {
                if (key === 'mobile') {
                    update(key, normalizeMobile(value));
                }
                else {
                    update(key, value);
                }
            }} placeholder={placeholder} placeholderTextColor={palette.muted} secureTextEntry={key === 'password' ? !showPassword : false} autoCapitalize={key === 'email' ? 'none' : 'sentences'} className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}/>
              {key === 'password' ? (<AnimatedPressable onPress={() => setShowPassword((value) => !value)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted}/>
                </AnimatedPressable>) : null}
            </View>
            {fieldErrors[key] ? (<Text className="mt-0.5 text-[11px] font-semibold text-danger">{fieldErrors[key]}</Text>) : null}
          </View>))}

        <View className="gap-1.5">
          <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Gender</Text>
          <View className="flex-row gap-2.5">
            {[
            { label: 'Male', icon: 'male-outline' },
            { label: 'Female', icon: 'female-outline' },
            { label: 'Other', icon: 'transgender-outline' },
        ].map((gender) => (<AnimatedPressable key={gender.label} onPress={() => update('gender', gender.label)} className={`h-12 flex-1 px-3 py-2 flex-row items-center justify-center gap-1.5 rounded-[16px] border ${form.gender === gender.label ? 'border-brand bg-brand' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <Ionicons name={gender.icon} size={16} color={form.gender === gender.label ? '#fff' : palette.muted}/>
                <Text className={`text-[13px] font-extrabold ${form.gender === gender.label ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{gender.label}</Text>
              </AnimatedPressable>))}
          </View>
        </View>

        <View className="gap-1.5">
          <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Date of Birth</Text>
          <View className={`h-14 flex-row items-center gap-2.5 rounded-[18px] border px-4 ${fieldErrors.dob ? 'border-danger' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
            <Ionicons name="calendar-outline" size={18} color={palette.muted}/>
            <TextInput value={form.dob} onChangeText={(value) => {
            update('dob', value);
        }} placeholder="DD-MM-YYYY" placeholderTextColor={palette.muted} className={`flex-1 text-[15px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}/>
          </View>
          {fieldErrors.dob ? (<Text className="mt-0.5 text-[11px] font-semibold text-danger">{fieldErrors.dob}</Text>) : null}
        </View>

        <AnimatedPressable className="mt-3 items-center rounded-[18px] bg-brand py-4" disabled={!isValid || isSubmitting} onPress={handleSubmit}>
          <Text className="text-[15px] font-extrabold text-white">{isSubmitting ? 'Creating Profile...' : 'Complete Profile'}</Text>
        </AnimatedPressable>
      </ScrollView>
      </ZoomInPage>
    </SafeAreaView>);
}
