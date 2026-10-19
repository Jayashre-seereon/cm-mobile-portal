import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAppState } from '../../../src/app-state';
import { getApiErrorMessage, getProfileUpdatePayload, getUserDashboard, logoutUser, updateUserProfile } from '../../../src/api/authApi';
import { palette } from '../../../src/careermap-data';
import { AnimatedPressable, Pill, Screen } from '../../../src/careermap-ui';
import { StaggerFadeUpItem } from '../../../src/page-transition';
import { formatDateForApi, formatDateForDisplay, getDateError, mapApiUserToProfile, splitFullName } from '../../../src/utils/auth';
import { useAuthStore } from '../../../src/store/auth-store';
export default function ProfileScreen() {
    const { activePlanId, bookings, hasActiveSubscription, onboarding, preferences, profileEditRequestKey, requestProfileEdit, savedCareers, saveUserProfile, subscriptionRecords, testHistory, toggleDarkMode, userProfile, } = useAppState();
    const authUser = useAuthStore((state) => state.user);
    const accessToken = useAuthStore((state) => state.accessToken);
    const setAuthUser = useAuthStore((state) => state.setUser);
    const setProfileIncomplete = useAuthStore((state) => state.setProfileIncomplete);
    const clearAuthFlow = useAuthStore((state) => state.clearAuthFlow);
    const logout = useAuthStore((state) => state.logout);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        ...userProfile,
        dob: formatDateForDisplay(userProfile.dob),
    });
    const [openSection, setOpenSection] = useState(null);
    const [saveStatus, setSaveStatus] = useState({ type: 'idle', message: '' });
    const [fieldErrors, setFieldErrors] = useState({ dob: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const hasLoadedDashboardRef = useRef(false);
    useEffect(() => {
        const combinedName = userProfile.name || [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ').trim();
        setForm({
            ...userProfile,
            dob: formatDateForDisplay(userProfile.dob),
            name: combinedName || userProfile.name || '',
            email: userProfile.email || authUser?.email || '',
            mobile: userProfile.mobile || authUser?.mobile || '',
            password: userProfile.password || '',
        });
    }, [authUser?.email, authUser?.firstName, authUser?.lastName, authUser?.mobile, userProfile]);
    useEffect(() => {
        if (hasLoadedDashboardRef.current) {
            return;
        }
        hasLoadedDashboardRef.current = true;
        let isMounted = true;
        async function loadDashboardProfile() {
            try {
                setIsDashboardLoading(true);
                const response = await getUserDashboard();
                const dashboardUser = response?.data?.data || response?.data?.user || response?.data || null;
                if (!dashboardUser || !isMounted) {
                    return;
                }
                const mappedProfile = mapApiUserToProfile(dashboardUser);
                if (mappedProfile) {
                    const fullName = [dashboardUser?.firstName, dashboardUser?.lastName].filter(Boolean).join(' ').trim();
                    const mergedProfile = {
                        ...userProfile,
                        ...mappedProfile,
                        dob: formatDateForDisplay(mappedProfile.dob),
                        name: fullName || mappedProfile.name || userProfile.name || '',
                        email: dashboardUser?.email || mappedProfile.email || userProfile.email || '',
                        mobile: dashboardUser?.mobile || mappedProfile.mobile || userProfile.mobile || '',
                        password: '',
                    };
                    setForm((current) => ({
                        ...current,
                        ...mergedProfile,
                    }));
                    saveUserProfile(mergedProfile);
                }
                setAuthUser(dashboardUser);
            }
            catch (_error) {
                // Keep the local profile if the dashboard request fails.
            }
            finally {
                if (isMounted) {
                    setIsDashboardLoading(false);
                }
            }
        }
        void loadDashboardProfile();
        return () => {
            isMounted = false;
        };
    }, [saveUserProfile, setAuthUser, userProfile]);
    useEffect(() => {
        if (profileEditRequestKey > 0) {
            setEditMode(true);
        }
    }, [profileEditRequestKey]);
    const displayName = onboarding.userType === 'parent' ? userProfile.name || 'Parent User' : userProfile.name || 'Student User';
    const profileClass = onboarding.selectedClass || 'Class 11';
    const profileStream = onboarding.selectedStream || 'Science';
    const menuItems = useMemo(() => [
        
        {
            label: 'Test History',
            icon: 'time-outline',
            tone: palette.blue,
            action: () => setOpenSection((current) => (current === 'tests' ? null : 'tests')),
            value: `${testHistory.length} tests`,
        },
        {
            label: 'Mentor Bookings',
            icon: 'calendar-outline',
            tone: palette.purple,
            action: () => setOpenSection((current) => (current === 'bookings' ? null : 'bookings')),
            value: `${bookings.length} bookings`,
        },
        {
            label: 'Subscription',
            icon: 'card-outline',
            tone: palette.secondary,
            action: () => setOpenSection((current) => (current === 'subscription' ? null : 'subscription')),
            value: hasActiveSubscription ? 'Active' : 'None',
        },
        { label: 'Settings', icon: 'settings-outline', tone: palette.muted, action: () => router.push('/(drawer)/settings'), value: 'Open' },
    ], [bookings.length, hasActiveSubscription, savedCareers.length, testHistory.length]);
    const updateField = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        if (key === 'dob') {
            setFieldErrors((current) => ({ ...current, dob: getDateError(value) }));
        }
        if (saveStatus.type !== 'idle') {
            setSaveStatus({ type: 'idle', message: '' });
        }
    };
    const handleSaveProfile = async () => {
        const name = form.name.trim();
        const nextDobError = form.dob ? getDateError(form.dob) : '';
        setFieldErrors({ dob: nextDobError });
        if (!name) {
            setSaveStatus({ type: 'error', message: 'Please enter your full name.' });
            return;
        }
        if (nextDobError) {
            setSaveStatus({ type: 'error', message: 'Please enter a valid date of birth.' });
            return;
        }
        const { firstName, lastName } = splitFullName(name);
        const payload = getProfileUpdatePayload({
            firstName,
            lastName,
            username: authUser?.username || authUser?.email?.split('@')[0] || '',
            country: form.country.trim() || 'India',
            state: form.stateName.trim(),
            city: form.city.trim(),
            district: form.district.trim(),
            gender: form.gender,
            address: form.address.trim(),
            dataOfBirth: form.dob ? formatDateForApi(form.dob.trim()) : null,
            image: authUser?.image || 'image_url.png',
            status: authUser?.status || 'Active',
        }, authUser || {});
        try {
            setIsSaving(true);
            setSaveStatus({ type: 'idle', message: '' });
            const response = await updateUserProfile(payload);
            const updatedUser = response?.data || response?.user || response;
            if (updatedUser) {
                setAuthUser(updatedUser);
                setProfileIncomplete(false);
                const mappedProfile = mapApiUserToProfile(updatedUser);
                if (mappedProfile) {
                    saveUserProfile({
                        ...userProfile,
                        ...mappedProfile,
                        name,
                        childName: userProfile.childName || '',
                    });
                }
            }
            else {
                setProfileIncomplete(false);
                saveUserProfile({
                    ...userProfile,
                    ...form,
                    name,
                });
            }
            setSaveStatus({ type: 'success', message: response?.message || 'Profile updated successfully.' });
            setEditMode(false);
        }
        catch (error) {
            setSaveStatus({
                type: 'error',
                message: getApiErrorMessage(error, 'Failed to update profile.'),
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const renderInlineSection = (section) => {
        if (section === 'saved' && savedCareers.length > 0) {
            return (<View className={`gap-3 border-t px-4 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fcf8f5]'}`}>
          {savedCareers.map((career, index) => (<StaggerFadeUpItem key={career} index={index}>
              <AnimatedPressable className={`flex-row items-center justify-between rounded-[18px] px-4 py-3 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => router.push('/(drawer)/(tabs)/library')}>
                <Text className={`text-[13px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{career}</Text>
                <Ionicons name="chevron-forward" size={16} color={palette.muted}/>
              </AnimatedPressable>
            </StaggerFadeUpItem>))}
        </View>);
        }
        if (section === 'tests' && testHistory.length > 0) {
            return (<View className={`gap-3 border-t px-4 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fcf8f5]'}`}>
          {testHistory.map((item) => (<AnimatedPressable key={item.id} className={`flex-row items-center justify-between rounded-[18px] px-4 py-3 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => router.push('/(drawer)/(tabs)/assessment')}>
              <View className="flex-1 pr-3">
                <Text className={`text-[13px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.quizName || item.title}</Text>
                <Text className={`mt-1 text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                  {[item.score ? `Score: ${item.score}` : "", item.attemptedAt ? `Attempted: ${item.attemptedAt}` : item.subtitle].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <Pill label={item.status} tone={item.status === 'Completed' ? palette.green : palette.secondary}/>
            </AnimatedPressable>))}
        </View>);
        }
        if (section === 'bookings' && bookings.length > 0) {
            return (<View className={`gap-3 border-t px-4 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fcf8f5]'}`}>
          {bookings.map((booking) => (<AnimatedPressable key={booking.id} className={`gap-1 rounded-[18px] px-4 py-3 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => router.push('/(drawer)/book-mentor')}>
            <View key={booking.id} className={`flex-row items-center justify-between rounded-[18px] px-4 py-3 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`}>
              <View>
                <Text className={`text-[13px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{booking.mentorName}</Text>
                <Text className={`text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{booking.timeSlot || booking.time} | {booking.mentorFee ? `Fee: Rs ${booking.mentorFee}` : booking.date}</Text>
              </View>
              <Pill label={booking.status} tone={palette.green}/>
            </View>
            </AnimatedPressable>))}
        </View>);
        }
        if (section === 'subscription' && subscriptionRecords.length > 0) {
            return (<View className={`gap-3 border-t px-4 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fcf8f5]'}`}>
          {subscriptionRecords.map((record) => (<AnimatedPressable key={record.id} className={`gap-1 rounded-[18px] px-4 py-3 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => router.push('/(drawer)/subscription')}>
              <View className="flex-row items-center justify-between">
                <Text className={`text-[13px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{record.subscriptionName || record.planName}</Text>
                <Text className="text-[13px] font-extrabold text-brand">{record.amount !== "" && record.amount != null ? `Rs ${record.amount}` : record.price}</Text>
              </View>
              <Text className={`text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Validity: {record.validity || record.expiryDate}</Text>
              <Text className={`text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Status: {record.status || 'Active'}</Text>
            </AnimatedPressable>))}
        </View>);
        }
        return null;
    };
    if (editMode) {
        return (<Screen>
        <View className="flex-row items-center gap-3">
          <AnimatedPressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => setEditMode(false)}>
            <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
          </AnimatedPressable>
          <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Edit Profile</Text>
        </View>

        <View className={`rounded-[20px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[12px] font-bold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
            Your saved profile details are prefilled here. Email, mobile number, and password are locked and cannot be edited.
          </Text>
        </View>

        {saveStatus.message ? (<View className={`rounded-[18px] border px-4 py-3 ${saveStatus.type === 'error'
                ? preferences.darkMode
                    ? 'border-[#5a2630] bg-[#2b151b]'
                    : 'border-[#efc8c0] bg-[#fff4f2]'
                : preferences.darkMode
                    ? 'border-[#22462f] bg-[#102016]'
                    : 'border-[#cde7d4] bg-[#edf8f0]'}`}>
            <Text className={`text-[13px] font-extrabold ${saveStatus.type === 'error' ? 'text-danger' : 'text-success'}`}>{saveStatus.message}</Text>
          </View>) : null}

        {isDashboardLoading ? (<View className={`rounded-[18px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
            <Text className={`text-[13px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Loading profile details...</Text>
          </View>) : null}

        <View className={`gap-3 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Email Address</Text>
            <View className={`rounded-[18px] border px-4 py-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
              <Text className={`text-[14px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{form.email || 'Not set'}</Text>
            </View>
            <Text className={`text-[11px] font-semibold ${preferences.darkMode ? 'text-[#8e8691]' : 'text-muted'}`}>Can&apos;t edit</Text>
          </View>
          <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Mobile Number</Text>
            <View className={`rounded-[18px] border px-4 py-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
              <Text className={`text-[14px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{form.mobile || 'Not set'}</Text>
            </View>
            <Text className={`text-[11px] font-semibold ${preferences.darkMode ? 'text-[#8e8691]' : 'text-muted'}`}>Can&apos;t edit</Text>
          </View>
          {[
                { key: 'name', label: onboarding.userType === 'parent' ? 'Parent Name' : 'Full Name', placeholder: 'Enter full name', keyboardType: 'default' },
                { key: 'address', label: 'Address', placeholder: 'Enter address', keyboardType: 'default' },
                { key: 'district', label: 'District', placeholder: 'Enter district', keyboardType: 'default' },
                { key: 'city', label: 'City', placeholder: 'Enter city', keyboardType: 'default' },
                { key: 'stateName', label: 'State', placeholder: 'Enter state', keyboardType: 'default' },
                { key: 'country', label: 'Country', placeholder: 'Enter country', keyboardType: 'default' },
                { key: 'dob', label: 'Date of Birth', placeholder: 'DD-MM-YYYY', keyboardType: 'numbers-and-punctuation' },
            ].map((field) => (<View key={field.key} className="gap-1.5">
              <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{field.label}</Text>
              <TextInput value={form[field.key]} onChangeText={(value) => updateField(field.key, value)} placeholder={field.placeholder} placeholderTextColor={palette.muted} keyboardType={field.keyboardType} className={`rounded-[18px] border px-4 py-[14px] text-[14px] ${field.key === 'dob' && fieldErrors.dob ? 'border-danger' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-surface text-ink'}`}/>
              {field.key === 'dob' && fieldErrors.dob ? (<Text className="text-[11px] font-semibold text-danger">{fieldErrors.dob}</Text>) : null}
            </View>))}

          {onboarding.userType === 'parent' ? (<View className="gap-1.5">
              <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Child&apos;s Name</Text>
              <TextInput value={form.childName} onChangeText={(value) => updateField('childName', value)} placeholder="Enter child's name" placeholderTextColor={palette.muted} className={`rounded-[18px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-surface text-ink'}`}/>
            </View>) : null}

          <View className="gap-2">
            <Text className={`text-[12px] font-extrabold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Gender</Text>
            <View className="flex-row gap-2.5">
              {['Male', 'Female', 'Other'].map((option) => {
                const active = form.gender === option;
                return (<AnimatedPressable key={option} className={`flex-1 rounded-[16px] border py-2 px-3 ${active ? 'border-brand bg-brand' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => updateField('gender', option)}>
                    <Text className={`text-center text-[13px] font-extrabold ${active ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>{option}</Text>
                  </AnimatedPressable>);
            })}
            </View>
          </View>
        </View>

      

        <AnimatedPressable className="rounded-[18px] bg-brand py-4" disabled={isSaving} onPress={handleSaveProfile}>
          <Text className="text-center text-[15px] font-extrabold text-white">{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </AnimatedPressable>
      </Screen>);
    }
    return (<Screen>
      <View className="flex-row items-center justify-between">
        <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>My Profile</Text>
        <AnimatedPressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={toggleDarkMode}>
          <Ionicons name={preferences.darkMode ? 'sunny-outline' : 'moon-outline'} size={18} color={preferences.darkMode ? palette.secondary : palette.muted}/>
        </AnimatedPressable>
      </View>

      <View className={`items-center rounded-[28px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
        <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.primary}12` }}>
          <Text className="text-[30px] font-black text-brand">{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text className={`mt-3 text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{displayName}</Text>
        {onboarding.userType === 'parent' && userProfile.childName ? (<Text className="mt-1 text-[12px] font-extrabold text-brand">Child: {userProfile.childName}</Text>) : null}
        <Text className={`mt-1 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{userProfile.email || 'Not set'}</Text>
        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{userProfile.mobile || 'Not set'}</Text>
        <View className="mt-3 flex-row gap-2">
          <Pill label={profileClass} tone={palette.primary}/>
          <Pill label={profileStream} tone={palette.purple}/>
        </View>
        {onboarding.userType === 'parent' ? <Pill label="Parent Account" tone={palette.secondary}/> : null}
        <AnimatedPressable className="mt-4 rounded-[16px] bg-brand px-5 py-3" onPress={requestProfileEdit}>
          <Text className="text-[13px] font-extrabold text-white">Edit Profile</Text>
        </AnimatedPressable>
      </View>

      <View className={`overflow-hidden rounded-[24px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
        {menuItems.map((item, index) => {
            const sectionKey = item.label === 'Saved Careers'
                ? 'saved'
                : item.label === 'Test History'
                    ? 'tests'
                    : item.label === 'Mentor Bookings'
                        ? 'bookings'
                        : item.label === 'Subscription'
                            ? 'subscription'
                            : null;
            const isOpen = sectionKey !== null && openSection === sectionKey;
            return (<StaggerFadeUpItem key={item.label} index={index}>
              <View>
              <AnimatedPressable className={`flex-row items-center justify-between px-4 py-4 ${index < menuItems.length - 1 || isOpen ? preferences.darkMode ? 'border-b border-[#1a1a1a]' : 'border-b border-line' : ''}`} onPress={item.action}>
                <View className="flex-row items-center gap-3">
                  <View className={`h-9 w-9 items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`}>
                    <Ionicons name={item.icon} size={18} color={item.tone}/>
                  </View>
                  <Text className={`text-[14px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item.label}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  {item.value ? <Text className={`text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{item.value}</Text> : null}
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-forward'} size={18} color={palette.muted}/>
                </View>
              </AnimatedPressable>
              {isOpen ? renderInlineSection(sectionKey) : null}
            </View>
            </StaggerFadeUpItem>);
        })}
      </View>

      <AnimatedPressable className={`flex-row items-center justify-center gap-2 rounded-[18px] border py-4 ${preferences.darkMode ? 'border-[#5a2630] bg-[#2b151b]' : 'border-[#efc8c0] bg-[#fff4f2]'}`} disabled={isLoggingOut} onPress={() => {
            void (async () => {
                if (isLoggingOut) {
                    return;
                }
                try {
                    setIsLoggingOut(true);
                    await logoutUser(accessToken);
                }
                catch (_error) {
                    // Continue with local sign-out even if the server logout call fails.
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

      <Text className={`text-center text-[11px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
        Current plan: {hasActiveSubscription ? activePlanId : 'No active plan'}
      </Text>
    </Screen>);
}


