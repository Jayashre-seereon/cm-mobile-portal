import { Ionicons } from '@expo/vector-icons';
import TableRenderer, { tableModel } from '@native-html/table-plugin';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import WebView from 'react-native-webview';
import { useAppState } from '../../src/app-state';
import { createStudyAbroadConsultation, getStudyAbroadCountries } from '../../src/api/studyabroadApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { palette } from '../../src/careermap-data';
import { AnimatedPressable, Screen, SectionHeader, UnlockBottomSheet } from '../../src/careermap-ui';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';
import { buildFreeKeys, isPreviewFree } from '../../src/utils/previewAccess';
import { useAuthStore } from '../../src/store/auth-store';

const INITIAL_CONSULT_FORM = {
    fullName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    mobileNumber: '',
    whatsappNumber: '',
    currentCityState: '',
    countryOfCitizenship: '',
    parentGuardianName: '',
    parentRelationship: '',
    parentMobileNumber: '',
    parentEmail: '',
    parentOccupation: '',
    primaryFundingSource: [],
    highestQualification: '',
    schoolCollegeUniversity: '',
    boardUniversity: '',
    passingYear: '',
    class10PercentageCGPA: '',
    class12PercentageCGPA: '',
    intendedStudyLevel: '',
    preferredIntake: '',
    preferredCountries: [],
    preferredCourseProgramme: '',
    preferredSpecialization: '',
    preferredUniversities: '',
    openToAlternativeUniversities: '',
    englishTest: '',
    englishTestScoreDate: '',
    otherEntranceExams: [],
    entranceExamScoreDate: '',
    preferredCareerDomain: '',
    reasonToStudyAbroad: '',
    topPriorities: [],
    annualTuitionBudget: '',
    totalEducationBudget: '',
    scholarshipRequired: '',
    educationLoanRequired: '',
    passportStatus: '',
    passportExpiryDate: '',
    documentsAvailable: [],
    servicesRequired: [],
    message: '',
};

function SelectionGroup({ label, options, value, multiple = false, onChange, darkMode }) {
    const selectedValues = multiple ? (Array.isArray(value) ? value : []) : [];
    return (<View className="gap-2">
      <Text className={`text-[12px] font-extrabold ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = multiple ? selectedValues.includes(option) : value === option;
          return (<Pressable key={option} accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} onPress={() => onChange(option)} className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${selected ? 'border-brand bg-[#fff1ee]' : darkMode ? 'border-[#303030] bg-[#111111]' : 'border-line bg-surface'}`}>
            <Ionicons name={multiple ? (selected ? 'checkbox' : 'square-outline') : (selected ? 'radio-button-on' : 'radio-button-off')} size={16} color={selected ? palette.primary : darkMode ? '#b7aeb9' : palette.muted}/>
            <Text className={`text-[12px] font-bold ${selected ? 'text-brand' : darkMode ? 'text-[#e5dfe6]' : 'text-ink'}`}>{option}</Text>
          </Pressable>);
        })}
      </View>
    </View>);
}

function FormField({ label, value, onChangeText, placeholder, darkMode, keyboardType = 'default', maxLength, multiline = false }) {
    return (
        <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={darkMode ? '#7f7481' : palette.muted}
                keyboardType={keyboardType}
                maxLength={maxLength}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                className={`rounded-[16px] border px-4 py-[14px] text-[13px] ${multiline ? 'min-h-[96px]' : ''} ${darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-surface text-ink'}`}
            />
        </View>
    );
}

function maskDateInput(raw) {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

function HtmlContent({ html, contentWidth, darkMode }) {
    const sourceHtml = String(html || '').trim();
    if (!sourceHtml) {
        return (
            <Text className={`text-[14px] leading-[24px] ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                Description not available.
            </Text>
        );
    }

    const ink = darkMode ? '#ffffff' : palette.text;
    const muted = darkMode ? '#b7aeb9' : palette.muted;
    const border = darkMode ? '#303030' : '#ead9d5';
    const headerBg = darkMode ? '#111111' : '#fdf4f2';

    const hasTable = /<table/i.test(sourceHtml);
    const content = (
                <RenderHTML
                    contentWidth={contentWidth}
                    source={{ html: `<div>${sourceHtml}</div>` }}
                    WebView={WebView}
                    renderers={{ table: TableRenderer }}
                    customHTMLElementModels={{ table: tableModel }}
                    renderersProps={{
                        table: {
                            tableStyleSpecs: {
                                outerBorderWidthPx: 1,
                                rowsBorderWidthPx: 1,
                                columnsBorderWidthPx: 1,
                                outerBorderColor: border,
                                rowsBorderColor: border,
                                columnsBorderColor: border,
                                thOddBackground: headerBg,
                                thOddColor: ink,
                                tdOddBackground: darkMode ? '#080808' : '#ffffff',
                                tdOddColor: muted,
                                fontSizePx: 13,
                            },
                        },
                    }}
                    baseStyle={{
                        color: muted,
                        fontSize: 14,
                        lineHeight: 24,
                    }}
                    tagsStyles={{
                        h1: { fontSize: 22, fontWeight: '900', color: palette.primary, marginTop: 12, marginBottom: 8 },
                        h2: { fontSize: 20, fontWeight: '900', color: palette.primary, marginTop: 12, marginBottom: 8 },
                        h3: { fontSize: 18, fontWeight: '800', color: palette.primary, marginTop: 10, marginBottom: 6 },
                        h4: { fontSize: 16, fontWeight: '800', color: palette.primary, marginTop: 8, marginBottom: 6 },
                        h5: { fontSize: 15, fontWeight: '800', color: palette.primary, marginTop: 8, marginBottom: 4 },
                        h6: { fontSize: 14, fontWeight: '800', color: palette.primary, marginTop: 8, marginBottom: 4 },
                        p: { marginTop: 4, marginBottom: 10 },
                        strong: { fontWeight: '800', color: ink },
                        b: { fontWeight: '800', color: ink },
                        em: { fontStyle: 'italic' },
                        ul: { marginTop: 4, marginBottom: 12, paddingLeft: 8 },
                        ol: { marginTop: 4, marginBottom: 12, paddingLeft: 8 },
                        li: { marginBottom: 6 },
                        a: { color: palette.primary, textDecorationLine: 'underline' },
                        blockquote: { borderLeftWidth: 3, borderLeftColor: palette.primary, paddingLeft: 10, marginVertical: 8 },
                    }}
                />
    );

    if (!hasTable) {
        return content;
    }

    return (
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
            <View style={{ minWidth: contentWidth }}>{content}</View>
        </ScrollView>
    );
}

function toApiDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const [, year, month, day] = iso;
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
            ? `${year}-${month}-${day}`
            : '';
    }

    const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!dmy) return '';

    const day = pad2(dmy[1]);
    const month = pad2(dmy[2]);
    const year = dmy[3];
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
        ? `${year}-${month}-${day}`
        : '';
}

// Today's local date as YYYY-MM-DD (comparable with toApiDate's output).
function todayApiDate() {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const MIN_BIRTH_DATE = new Date(1900, 0, 1);

/*
 * Consultation form draft kept in memory (never in route params / navigation state) while the
 * user goes through the subscription flow. Owned by one user; restored into the form on return,
 * where the user must tap Submit again.
 */
let consultationDraft = null;

function pickConsultFormFields(source) {
    const picked = {};
    Object.keys(INITIAL_CONSULT_FORM).forEach((key) => {
        const initial = INITIAL_CONSULT_FORM[key];
        const value = source?.[key];
        if (Array.isArray(initial)) {
            if (Array.isArray(value)) picked[key] = value.map(String);
        } else if (typeof value === 'string') {
            picked[key] = value;
        }
    });
    return picked;
}

function parsePickerDate(value) {
    const apiDate = toApiDate(value);
    if (!apiDate) return new Date();
    const [year, month, day] = apiDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function DateField({ label, value, onChangeText, placeholder, darkMode, onOpenPicker }) {
    return (
        <View className="gap-1.5">
            <Text className={`text-[12px] font-extrabold ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
            <View className={`flex-row items-center rounded-[16px] border ${darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
                <TextInput
                    value={value}
                    onChangeText={(text) => onChangeText(maskDateInput(text))}
                    placeholder={placeholder || 'DD/MM/YYYY'}
                    placeholderTextColor={darkMode ? '#7f7481' : palette.muted}
                    keyboardType="number-pad"
                    maxLength={10}
                    className={`min-w-0 flex-1 px-4 py-[14px] text-[13px] ${darkMode ? 'text-white' : 'text-ink'}`}
                />
                <Pressable onPress={onOpenPicker} hitSlop={12} className="px-3 py-[14px]">
                    <Ionicons name="calendar-outline" size={18} color={palette.primary} />
                </Pressable>
            </View>
        </View>
    );
}

export default function AbroadScreen() {
    const params = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const { isUnlocked, preferences } = useAppState();
    // Same as the user portal: the module is "unlocked" with an active plan OR when the server
    // confirms full access (moduleStatus, set below). Only then are the lock badges hidden and
    // consultations allowed; in preview even a free destination still needs a plan to consult.
    const hasPlanAccess = isUnlocked('abroad-consultancy');
    const draftOwnerKey = useAuthStore((state) => String(state.user?.id ?? state.user?._id ?? ''));
    const [countries, setCountries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const [preferredCountry, setPreferredCountry] = useState('');
    const [dateDraft, setDateDraft] = useState('');
    const [datePickerField, setDatePickerField] = useState(null);
    const [consultationDetails, setConsultationDetails] = useState(INITIAL_CONSULT_FORM);
    const updateConsultationDetail = (field, value) => setConsultationDetails((current) => ({ ...current, [field]: value }));
    const toggleConsultationOption = (field, option) => setConsultationDetails((current) => {
        const currentValues = Array.isArray(current[field]) ? current[field] : [];
        return { ...current, [field]: currentValues.includes(option) ? currentValues.filter((item) => item !== option) : [...currentValues, option] };
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [moduleStatus, setModuleStatus] = useState('locked');
    const [moduleAccessResolved, setModuleAccessResolved] = useState(false);
    const selectedCountry = selected !== null ? countries[selected] : null;
    // In preview the free destinations are the first 4 of the FULL list (highest id first);
    // full access opens everything, a locked module opens nothing.
    const previewFreeKeys = useMemo(() => buildFreeKeys(countries), [countries]);
    const unlocked = hasPlanAccess || moduleStatus === 'full' || moduleStatus === 'unlocked';
    const isCountryOpen = (country) => moduleStatus === 'full' || moduleStatus === 'unlocked'
        || (moduleStatus === 'preview' && isPreviewFree(previewFreeKeys, country));
    const UG_PROGRAMS = [
  'BBA', 'B.Com', 'B.Tech / Engineering', 'Computer Science', 'Artificial Intelligence',
  'Data Science', 'Nursing', 'Psychology', 'Architecture', 'Hospitality Management',
  'Media & Communication', 'Biotechnology',
];

const PG_PROGRAMS = [
  'MBA', 'MSc Computer Science', 'MSc Data Science',
  'MSc Engineering', 'MSc Finance', 'MSc Marketing','MSc Artificial Intelligence', 
  'Master of Laws (LLM)','Master of Public Health (MPH)', 'Master of Education (M.Ed.)', 'MSc Cybersecurity', 'MSc Business Analytics',
];
    const selectedStudyAbroadId = selectedCountry?.id ? Number(selectedCountry.id) : null;
    
    const consultationPayload = useMemo(() => {
        if (!selectedStudyAbroadId) {
            return null;
        }

        const preferredCourseProgramme = consultationDetails.preferredCourseProgramme.trim();
        const preferredCountries = Array.isArray(consultationDetails.preferredCountries)
            ? consultationDetails.preferredCountries
            : [];

        return {
            ...consultationDetails,
            dateOfBirth: toApiDate(consultationDetails.dateOfBirth),
            englishTestScoreDate: toApiDate(consultationDetails.englishTestScoreDate) || consultationDetails.englishTestScoreDate.trim(),
            entranceExamScoreDate: toApiDate(consultationDetails.entranceExamScoreDate) || consultationDetails.entranceExamScoreDate.trim(),
            passportExpiryDate: consultationDetails.passportExpiryDate ? toApiDate(consultationDetails.passportExpiryDate) || null : null,
            preferredCountry: preferredCountry.trim(),
            preferredCountries: preferredCountries.length ? preferredCountries : (preferredCountry.trim() ? [preferredCountry.trim()] : []),
            preferredCourseProgramme,
            courseInterest: preferredCourseProgramme,
            preferredIntake: consultationDetails.preferredIntake.trim(),
            message: consultationDetails.message.trim(),
            // Last, so nothing in the form can override the destination currently selected.
            studyAbroadId: selectedStudyAbroadId,
        };
    }, [consultationDetails, preferredCountry, selectedStudyAbroadId]);

    const animationKey = submitted
        ? 'submitted'
        : showForm
            ? `form-${preferredCountry || 'blank'}`
            : selected !== null
                ? `country-${selected}`
                : 'country-list';
    // Return target after subscribing: only which screen to reopen - the form details stay in
    // memory (consultationDraft), not in the route params.
    const formReturnTarget = useMemo(() => ({
        pathname: '/(drawer)/abroad',
        params: {
            selected: selected !== null ? String(selected) : undefined,
            showForm: 'true',
            preferredCountry: preferredCountry || undefined,
            restoreDraft: '1',
        },
    }), [preferredCountry, selected]);
    const openFormSubscriptionPrompt = () => {
        consultationDraft = { ownerKey: draftOwnerKey, details: pickConsultFormFields(consultationDetails), preferredCountry };
        openSubscriptionPrompt(formReturnTarget);
    };

    const handleSubmitConsultation = useCallback(async () => {
        if (!consultationDetails.fullName.trim()) {
            setSubmitError('Please enter your full name.');
            return;
        }
        const birthDate = toApiDate(consultationDetails.dateOfBirth);
        if (!birthDate) {
            setSubmitError('Please enter or select your date of birth in DD/MM/YYYY format.');
            return;
        }
        // Same rule as the user portal: not in the future, not before 1900.
        if (birthDate > todayApiDate() || birthDate < '1900-01-01') {
            setSubmitError('Please enter a valid date of birth.');
            return;
        }
        if (!consultationDetails.gender) {
            setSubmitError('Please select your gender.');
            return;
        }
        if (!consultationDetails.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(consultationDetails.email.trim())) {
            setSubmitError('Please enter a valid email address.');
            return;
        }
        if (consultationDetails.mobileNumber.replace(/\D/g, '').length !== 10) {
            setSubmitError('Please enter a valid 10-digit mobile number.');
            return;
        }
        if (!consultationDetails.currentCityState.trim()) {
            setSubmitError('Please enter your current city / state.');
            return;
        }
        if (!consultationDetails.preferredCourseProgramme.trim()) {
            setSubmitError('Please enter your course / programme.');
            return;
        }
        if (consultationDetails.englishTestScoreDate && !toApiDate(consultationDetails.englishTestScoreDate)) {
            setSubmitError('Enter English test score date in valid DD/MM/YYYY format.');
            return;
        }
        if (consultationDetails.entranceExamScoreDate && !toApiDate(consultationDetails.entranceExamScoreDate)) {
            setSubmitError('Enter entrance exam score date in valid DD/MM/YYYY format.');
            return;
        }
        if (consultationDetails.passportExpiryDate && !toApiDate(consultationDetails.passportExpiryDate)) {
            setSubmitError('Enter passport expiry date in valid DD/MM/YYYY format.');
            return;
        }
        if (consultationDetails.passportExpiryDate && toApiDate(consultationDetails.passportExpiryDate) < todayApiDate()) {
            setSubmitError('Passport expiry date cannot be in the past.');
            return;
        }
        if (!consultationPayload) {
            setSubmitError('Please choose a study destination before submitting.');
            return;
        }

        try {
            setIsSubmitting(true);
            setSubmitError('');
            const createdConsultation = await createStudyAbroadConsultation(consultationPayload);

            if (createdConsultation) {
                setConsultationDetails(INITIAL_CONSULT_FORM);
                setSubmitted(true);
            }
            else {
                setSubmitError('Unable to submit consultation right now. Please try again.');
            }
        }
        catch (_error) {
            setSubmitError('Unable to submit consultation right now. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
    }, [consultationDetails, consultationPayload]);
    useEffect(() => {
        let isMounted = true;

        async function loadCountries() {
            try {
                setIsLoading(true);
                setLoadError('');
                const items = await getStudyAbroadCountries();

                if (isMounted) {
                    // Highest id first (the free destinations are worked out in the same order).
                    setCountries(Array.isArray(items) ? [...items].sort((a, b) => b.id - a.id) : []);
                }
            }
            catch (_error) {
                if (isMounted) {
                    setCountries([]);
                    setLoadError('Failed to load study abroad destinations.');
                }
            }
            finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadCountries();

        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        let isMounted = true;

        async function loadModuleAccess() {
            try {
                const modules = await getModules();
                const matchedModule = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes('study abroad'));
                const moduleId = Number(matchedModule?.id);

                if (!Number.isFinite(moduleId)) {
                    if (isMounted) {
                        setModuleStatus('preview');
                        setModuleAccessResolved(true);
                    }
                    return;
                }

                const response = await checkModuleAccess(moduleId);
                if (!isMounted) {
                    return;
                }

                setModuleStatus(String(response?.mode || 'locked').toLowerCase());
                setModuleAccessResolved(true);
            }
            catch {
                if (isMounted) {
                    setModuleStatus('preview');
                    setModuleAccessResolved(true);
                }
            }
        }

        loadModuleAccess();

        return () => {
            isMounted = false;
        };
    }, []);
    // Return from the subscription flow (params.selected = list index): open that destination only
    // once the list and access are known, with the same lock rule as tapping its card.
    const selectedParamHandledRef = useRef(null);
    useEffect(() => {
        if (typeof params.selected !== 'string' || isLoading || !moduleAccessResolved) {
            return;
        }
        if (selectedParamHandledRef.current === params.selected) {
            return;
        }
        selectedParamHandledRef.current = params.selected;
        const index = Number(params.selected);
        const country = Number.isInteger(index) ? countries[index] : undefined;
        if (!country) {
            return;
        }
        if (!isCountryOpen(country)) {
            setShowUnlockSheet(true);
            return;
        }
        setSelected(index);
    }, [params.selected, isLoading, moduleAccessResolved, countries, moduleStatus]);

    useEffect(() => {
        setShowForm(params.showForm === 'true');
        if (typeof params.preferredCountry === 'string') {
            setPreferredCountry(params.preferredCountry);
        }

        // Back from the subscription flow: pre-fill the form from the in-memory draft (same user
        // only, known fields only). The user reviews it and taps Submit again - no auto-submit.
        if (params.restoreDraft === '1' && consultationDraft) {
            const draft = consultationDraft;
            consultationDraft = null;
            if (draft.ownerKey === draftOwnerKey) {
                setConsultationDetails((current) => ({ ...current, ...pickConsultFormFields(draft.details) }));
                if (typeof draft.preferredCountry === 'string' && draft.preferredCountry) {
                    setPreferredCountry(draft.preferredCountry);
                }
            }
        }
    }, [params.restoreDraft, params.preferredCountry, params.selected, params.showForm, draftOwnerKey]);

    // Global search / Career Bee: open the destination with the same lock rule as its card.
    useSearchDeepLink(params.searchKey, !isLoading && moduleAccessResolved, () => {
        const countryId = typeof params.countryId === 'string' ? params.countryId : '';
        const index = countries.findIndex((country) => String(country.id) === countryId);
        if (index === -1) {
            return;
        }
        const detailOpen = isCountryOpen(countries[index]);
        if (!detailOpen) {
            setShowUnlockSheet(true);
            return;
        }
        setShowForm(false);
        setSelected(index);
    });
const closeDatePicker = () => setDatePickerField(null);

    const openDatePicker = (field) => {
        setDateDraft(consultationDetails[field] || '');
        setDatePickerField(field);
    };

    const handleDateChange = (event, date) => {
        if (Platform.OS === 'android') {
            closeDatePicker();
            if (event?.type === 'dismissed' || !date) {
                return;
            }
        }

        if (!date || Number.isNaN(date.getTime())) {
            return;
        }

        const formattedDate = `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
        setDateDraft(formattedDate);

        if (datePickerField) {
            updateConsultationDetail(datePickerField, formattedDate);
        }
    };

    const datePickerValue = parsePickerDate(dateDraft || (datePickerField ? consultationDetails[datePickerField] : ''));

    const renderDatePicker = () => {
        if (!datePickerField || Platform.OS === 'web') {
            return null;
        }

        const picker = (
            <DateTimePicker
                value={datePickerValue}
                {...(datePickerField === 'dateOfBirth' ? { maximumDate: new Date(), minimumDate: MIN_BIRTH_DATE } : {})}
                {...(datePickerField === 'passportExpiryDate' ? { minimumDate: new Date() } : {})}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
            />
        );

        if (Platform.OS === 'android') {
            return picker;
        }

        return (
            <Modal transparent animationType="fade" onRequestClose={closeDatePicker}>
                <Pressable className="flex-1 justify-end bg-black/40" onPress={closeDatePicker}>
                    <Pressable className={`rounded-t-[24px] px-4 pb-8 pt-4 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-white'}`} onPress={() => {}}>
                        <View className="mb-2 flex-row items-center justify-between">
                            <Pressable onPress={closeDatePicker}><Text className="text-[14px] font-bold text-muted">Cancel</Text></Pressable>
                            <Text className={`text-[14px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Select date</Text>
                            <Pressable onPress={closeDatePicker}><Text className="text-[14px] font-extrabold text-brand">Done</Text></Pressable>
                        </View>
                        {picker}
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };
    if (selected !== null && !selectedCountry) {
        return (<Screen animationKey={animationKey}>
        <SectionHeader title="Study Abroad" subtitle="Loading destination details..." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                    setSelected(null);
                }}>
              <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
            </Pressable>}/>
        <View className={`gap-3 rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Loading study abroad details...</Text>
          <Text className={`text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>We are fetching the latest country data from the API.</Text>
        </View>
      </Screen>);
    }
    if (submitted) {
        return (<Screen animationKey={animationKey}>
        <SectionHeader title="Submitted Successfully" subtitle="Your study abroad consultation request has been completed." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                    setSubmitted(false);
                    setShowForm(false);
                    setConsultationDetails(INITIAL_CONSULT_FORM);
                    setPreferredCountry('');
                    setSubmitError('');
                }}>
              <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
            </Pressable>}/>
        <View className={`items-center gap-4 rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <View
            className="h-[92px] w-[92px] items-center justify-center rounded-full"
            style={{ backgroundColor: `${palette.green}14` }}
          >
            <Ionicons name="checkmark" size={44} color={palette.green} />
          </View>
          <View className="items-center gap-2">
            <Text className={`text-center text-[24px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Submitted successfully</Text>
            <Text className={`text-center text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              Your study abroad consultation request has been recorded. We will help you shortlist countries, courses, and scholarship options.
            </Text>
          </View>
          <AnimatedPressable className="rounded-[16px] bg-brand py-[14px] px-[16px]" onPress={() => {
                setSubmitted(false);
                setShowForm(false);
                setConsultationDetails(INITIAL_CONSULT_FORM);
                setPreferredCountry('');
                setSubmitError('');
            }}>
            <Text className="text-center text-[14px] font-extrabold text-white">Done</Text>
          </AnimatedPressable>
        </View>
        </Screen>);
    }
    if (showForm) {
        const darkMode = preferences.darkMode;
        return (<>
        <Screen animationKey={animationKey}>
        <SectionHeader title="Foreign University Admission" subtitle="Student Registration & Free Counselling Form" action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setShowForm(false)}>
              <Ionicons name="arrow-back" size={18} color={darkMode ? '#ffffff' : palette.text}/>
            </Pressable>}/>
        <View className={`gap-[14px] rounded-[24px] border p-[18px] ${darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Text className={`text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>1. Student Basic Details</Text>
          <FormField label="Full Name *" value={consultationDetails.fullName} onChangeText={(value) => updateConsultationDetail('fullName', value)} placeholder="Full Name" darkMode={darkMode}/>
          <DateField label="Date of Birth *" value={consultationDetails.dateOfBirth} onChangeText={(value) => updateConsultationDetail('dateOfBirth', value)} placeholder="DD/MM/YYYY" darkMode={darkMode} onOpenPicker={() => openDatePicker('dateOfBirth')}/>
          <SelectionGroup label="Gender *" options={['Male', 'Female', 'Other', 'Prefer not to say']} value={consultationDetails.gender} onChange={(value) => updateConsultationDetail('gender', value)} darkMode={darkMode}/>
          <FormField label="Email Address *" value={consultationDetails.email} onChangeText={(value) => updateConsultationDetail('email', value)} placeholder="Email Address" darkMode={darkMode} keyboardType="email-address"/>
          <FormField label="Mobile Number *" value={consultationDetails.mobileNumber} onChangeText={(value) => updateConsultationDetail('mobileNumber', value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" darkMode={darkMode} keyboardType="phone-pad" maxLength={10}/>
          <FormField label="WhatsApp Number" value={consultationDetails.whatsappNumber} onChangeText={(value) => updateConsultationDetail('whatsappNumber', value.replace(/\D/g, '').slice(0, 10))} placeholder="WhatsApp Number" darkMode={darkMode} keyboardType="phone-pad" maxLength={10}/>
          <FormField label="Current City / State *" value={consultationDetails.currentCityState} onChangeText={(value) => updateConsultationDetail('currentCityState', value)} placeholder="Current City / State" darkMode={darkMode}/>
          <FormField label="Country of Citizenship" value={consultationDetails.countryOfCitizenship} onChangeText={(value) => updateConsultationDetail('countryOfCitizenship', value)} placeholder="Country of Citizenship" darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>2. Parent / Guardian Details</Text>
          <FormField label="Parent / Guardian Name" value={consultationDetails.parentGuardianName} onChangeText={(value) => updateConsultationDetail('parentGuardianName', value)} placeholder="Parent / Guardian Name" darkMode={darkMode}/>
          <FormField label="Relationship" value={consultationDetails.parentRelationship} onChangeText={(value) => updateConsultationDetail('parentRelationship', value)} placeholder="Relationship" darkMode={darkMode}/>
          <FormField label="Mobile Number" value={consultationDetails.parentMobileNumber} onChangeText={(value) => updateConsultationDetail('parentMobileNumber', value.replace(/\D/g, '').slice(0, 10))} placeholder="Mobile Number" darkMode={darkMode} keyboardType="phone-pad" maxLength={10}/>
          <FormField label="Email Address" value={consultationDetails.parentEmail} onChangeText={(value) => updateConsultationDetail('parentEmail', value)} placeholder="Email Address" darkMode={darkMode} keyboardType="email-address"/>
          <FormField label="Occupation" value={consultationDetails.parentOccupation} onChangeText={(value) => updateConsultationDetail('parentOccupation', value)} placeholder="Occupation" darkMode={darkMode}/>
          <SelectionGroup label="Primary Funding Source" options={['Parents/Guardian', 'Student', 'Education Loan', 'Scholarship', 'Other']} value={consultationDetails.primaryFundingSource} multiple onChange={(value) => toggleConsultationOption('primaryFundingSource', value)} darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>3. Academic Details</Text>
          <SelectionGroup label="Current / Highest Qualification" options={['Class 10', 'Class 12', 'Diploma', "Bachelor's", "Master's", 'Other']} value={consultationDetails.highestQualification} onChange={(value) => updateConsultationDetail('highestQualification', value)} darkMode={darkMode}/>
          <FormField label="School / College / University" value={consultationDetails.schoolCollegeUniversity} onChangeText={(value) => updateConsultationDetail('schoolCollegeUniversity', value)} placeholder="School / College / University" darkMode={darkMode}/>
          <FormField label="Board / University" value={consultationDetails.boardUniversity} onChangeText={(value) => updateConsultationDetail('boardUniversity', value)} placeholder="Board / University" darkMode={darkMode}/>
          <FormField label="Year of Passing / Expected Graduation" value={consultationDetails.passingYear} onChangeText={(value) => updateConsultationDetail('passingYear', value)} placeholder="Year of Passing / Expected Graduation" darkMode={darkMode}/>
          <FormField label="Class 10 Percentage / CGPA" value={consultationDetails.class10PercentageCGPA} onChangeText={(value) => updateConsultationDetail('class10PercentageCGPA', value)} placeholder="Class 10 Percentage / CGPA" darkMode={darkMode}/>
          <FormField label="Class 12 Percentage / CGPA" value={consultationDetails.class12PercentageCGPA} onChangeText={(value) => updateConsultationDetail('class12PercentageCGPA', value)} placeholder="Class 12 Percentage / CGPA" darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>4. Foreign Education Preferences</Text>
          <SelectionGroup label="Intended Study Level" options={['Undergraduate', 'Postgraduate', 'PhD', 'Diploma/Certificate']} value={consultationDetails.intendedStudyLevel} onChange={(value) => updateConsultationDetail('intendedStudyLevel', value)} darkMode={darkMode}/>
          <SelectionGroup label="Preferred Intake" options={['Jan', 'Feb', 'May', 'Sep', 'Other']} value={consultationDetails.preferredIntake} onChange={(value) => updateConsultationDetail('preferredIntake', value)} darkMode={darkMode}/>
          <SelectionGroup label="Preferred Countries" options={['USA', 'UK', 'Canada', 'Australia', 'NZ', 'Germany', 'Ireland']} value={consultationDetails.preferredCountries} multiple onChange={(value) => toggleConsultationOption('preferredCountries', value)} darkMode={darkMode}/>
          <FormField label="Preferred Course / Programme *" value={consultationDetails.preferredCourseProgramme} onChangeText={(value) => updateConsultationDetail('preferredCourseProgramme', value)} placeholder="Preferred Course / Programme" darkMode={darkMode}/>
          <FormField label="Preferred Specialization" value={consultationDetails.preferredSpecialization} onChangeText={(value) => updateConsultationDetail('preferredSpecialization', value)} placeholder="Preferred Specialization" darkMode={darkMode}/>
          <FormField label="Preferred Universities" value={consultationDetails.preferredUniversities} onChangeText={(value) => updateConsultationDetail('preferredUniversities', value)} placeholder="Preferred Universities" darkMode={darkMode}/>
          <SelectionGroup label="Open to Alternative Universities?" options={['Yes', 'No']} value={consultationDetails.openToAlternativeUniversities} onChange={(value) => updateConsultationDetail('openToAlternativeUniversities', value)} darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>5. English & Entrance Exams</Text>
          <SelectionGroup label="English Test" options={['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'Cambridge', 'Not Yet', 'Other']} value={consultationDetails.englishTest} onChange={(value) => updateConsultationDetail('englishTest', value)} darkMode={darkMode}/>
          <DateField label="English Test Score Date" value={consultationDetails.englishTestScoreDate} onChangeText={(value) => updateConsultationDetail('englishTestScoreDate', value)} placeholder="DD/MM/YYYY" darkMode={darkMode} onOpenPicker={() => openDatePicker('englishTestScoreDate')}/>
          <SelectionGroup label="Other Entrance Exam" options={['SAT', 'ACT', 'GRE', 'GMAT', 'LSAT', 'MCAT', 'Other', 'None']} value={consultationDetails.otherEntranceExams} multiple onChange={(value) => toggleConsultationOption('otherEntranceExams', value)} darkMode={darkMode}/>
          <DateField label="Entrance Exam Score Date" value={consultationDetails.entranceExamScoreDate} onChangeText={(value) => updateConsultationDetail('entranceExamScoreDate', value)} placeholder="DD/MM/YYYY" darkMode={darkMode} onOpenPicker={() => openDatePicker('entranceExamScoreDate')}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>6. Career & Budget Preferences</Text>
          <FormField label="Preferred Career / Domain" value={consultationDetails.preferredCareerDomain} onChangeText={(value) => updateConsultationDetail('preferredCareerDomain', value)} placeholder="Preferred Career / Domain" darkMode={darkMode}/>
          <FormField label="Why do you want to study abroad?" value={consultationDetails.reasonToStudyAbroad} onChangeText={(value) => updateConsultationDetail('reasonToStudyAbroad', value)} placeholder="Why do you want to study abroad?" darkMode={darkMode} multiline/>
          <SelectionGroup label="Top Priorities" options={['Ranking', 'Course Quality', 'Jobs', 'Fees', 'Scholarship', 'Location', 'Research', 'Other']} value={consultationDetails.topPriorities} multiple onChange={(value) => toggleConsultationOption('topPriorities', value)} darkMode={darkMode}/>
          <SelectionGroup label="Annual Tuition Budget" options={['< ₹10L', '₹10–20L', '₹20–30L', '₹30–50L', '₹50L+', 'Not Decided']} value={consultationDetails.annualTuitionBudget} onChange={(value) => updateConsultationDetail('annualTuitionBudget', value)} darkMode={darkMode}/>
          <SelectionGroup label="Total Education Budget" options={['< ₹20L', '₹20–40L', '₹40–60L', '₹60L–1Cr', '> ₹1Cr']} value={consultationDetails.totalEducationBudget} onChange={(value) => updateConsultationDetail('totalEducationBudget', value)} darkMode={darkMode}/>
          <SelectionGroup label="Scholarship Required?" options={['Yes', 'No']} value={consultationDetails.scholarshipRequired} onChange={(value) => updateConsultationDetail('scholarshipRequired', value)} darkMode={darkMode}/>
          <SelectionGroup label="Education Loan Required?" options={['Yes', 'No', 'Maybe']} value={consultationDetails.educationLoanRequired} onChange={(value) => updateConsultationDetail('educationLoanRequired', value)} darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>7. Passport & Documents</Text>
          <SelectionGroup label="Valid Passport" options={['Yes', 'No', 'Applied', 'Renewal in Process']} value={consultationDetails.passportStatus} onChange={(value) => updateConsultationDetail('passportStatus', value)} darkMode={darkMode}/>
          <DateField label="Passport Expiry Date" value={consultationDetails.passportExpiryDate} onChangeText={(value) => updateConsultationDetail('passportExpiryDate', value)} placeholder="DD/MM/YYYY" darkMode={darkMode} onOpenPicker={() => openDatePicker('passportExpiryDate')}/>
          <SelectionGroup label="Documents Available" options={['Passport', '10th', '12th', 'Degree', 'Marksheets', 'English Score', 'CV', 'SOP', 'LOR', 'Financial Docs']} value={consultationDetails.documentsAvailable} multiple onChange={(value) => toggleConsultationOption('documentsAvailable', value)} darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>9. Services Required</Text>
          <SelectionGroup label="Select Required Services" options={['Counselling / University Selection', 'Eligibility Assessment', 'Application Processing', 'SOP', 'LOR', 'CV/Resume', 'Test Guidance', 'Scholarship', 'Loan Guidance', 'Visa Guidance', 'Pre-departure', 'Accommodation', 'Complete Admission Support']} value={consultationDetails.servicesRequired} multiple onChange={(value) => toggleConsultationOption('servicesRequired', value)} darkMode={darkMode}/>

          <Text className={`mt-2 text-[16px] font-black ${darkMode ? 'text-white' : 'text-ink'}`}>Additional Information</Text>
          <FormField label="Tell us anything else about your study plans..." value={consultationDetails.message} onChangeText={(value) => updateConsultationDetail('message', value)} placeholder="Tell us anything else about your study plans..." darkMode={darkMode} multiline/>

          {submitError ? (<Text className="text-[13px] font-semibold text-brand">{submitError}</Text>) : null}
          <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={unlocked ? handleSubmitConsultation : openFormSubscriptionPrompt} disabled={isSubmitting}>
            <Text className="text-center text-[14px] font-extrabold text-white">{isSubmitting ? 'Submitting...' : unlocked ? 'Submit Consultation' : 'Subscribe to Submit'}</Text>
          </AnimatedPressable>
        </View>
      </Screen>
      {renderDatePicker()}
      </>);
    }
    if (selected !== null) {
        const country = selectedCountry;
        return (<Screen animationKey={animationKey}>
        <SectionHeader title={country.title}  action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                    if (params.fromGlobalSearch === '1' && router.canGoBack()) {
                        router.back();
                        return;
                    }
                    setSelected(null);
                }}>
              <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
            </Pressable>}/>
        {!unlocked ? (<View className="self-start rounded-full px-3 py-2" style={{ backgroundColor: `${palette.orange}12` }}>
            <Text className="text-[11px] font-extrabold" style={{ color: palette.orange }}>
              Subscribe to unlock more country details
            </Text>
          </View>) : null}
        <View className="relative">
          <>
            <View className="items-center gap-2 py-1.5">
              <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px]" style={{ backgroundColor: `${palette.primary}10` }}>
               <Ionicons name="globe-outline" size={28} color={palette.primary}/>
        </View>
              </View>

            <View className={`gap-3 rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
              <Text className="text-[15px] font-extrabold text-brand">Description</Text>
              <HtmlContent html={country.description} contentWidth={Math.max(width - 84, 260)} darkMode={preferences.darkMode} /> 
              
            </View>

          

            <AnimatedPressable className="rounded-[16px] bg-brand py-[14px] mt-3" onPress={() => {
                    // Same as the user portal: consulting needs an unlocked module, even for a free preview destination.
                    if (!unlocked) {
                        setShowUnlockSheet(true);
                        return;
                    }
                    setPreferredCountry(country.countryName);
                    setShowForm(true);
                }}>
              <Text className="text-center text-[14px]  font-extrabold text-white">{unlocked ? 'Get Free Consultation' : 'Unlock Consultation'}</Text>
            </AnimatedPressable>
          </>
        </View>
        {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Study Abroad" subtitle="Subscribe to more country details, scholarships, visa guidance, and counselling access." onClose={() => setShowUnlockSheet(false)} onPress={() => {
                    setShowUnlockSheet(false);
                    openFormSubscriptionPrompt();
                }}/>) : null}
      </Screen>);
    }
    return (<Screen animationKey={animationKey}>
      <SectionHeader title="Study Abroad" subtitle="Explore world-class education opportunities in the world's leading study destinations. We help students secure admission to top-ranked universities offering Undergraduate (UG) and Postgraduate (PG) programs across the UK, USA, Canada, Europe, Singapore, and Dubai.
"/>
<View className="gap-3">
  <View className={`gap-3 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
    <View className="flex-row items-center gap-2">
      <View className="h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${palette.primary}12` }}>
        <Ionicons name="school-outline" size={18} color={palette.primary} />
      </View>
      <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
        Popular Undergraduate (UG) Programs
      </Text>
    </View>
    <View className="flex-row flex-wrap gap-2">
      {UG_PROGRAMS.map((program) => (
        <View key={program} className={`rounded-full border px-3 py-2 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
          <Text className={`text-[12px] font-bold ${preferences.darkMode ? 'text-[#e5dfe6]' : 'text-ink'}`}>{program}</Text>
        </View>
      ))}
    </View>
  </View>

  <View className={`gap-3 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
    <View className="flex-row items-center gap-2">
      <View className="h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${palette.teal}12` }}>
        <Ionicons name="ribbon-outline" size={18} color={palette.teal} />
      </View>
      <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
        Popular Postgraduate (PG) Programs
      </Text>
    </View>
    <View className="flex-row flex-wrap gap-2">
      {PG_PROGRAMS.map((program) => (
        <View key={program} className={`rounded-full border px-3 py-2 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-surface'}`}>
          <Text className={`text-[12px] font-bold ${preferences.darkMode ? 'text-[#e5dfe6]' : 'text-ink'}`}>{program}</Text>
        </View>
      ))}
    </View>
  </View>
</View>
      
      {!moduleAccessResolved ? (<Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Checking access...</Text>) : null}
      {isLoading ? (<Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading destinations...</Text>) : null}
      {!isLoading && loadError ? (<Text className="text-[13px] text-brand">{loadError}</Text>) : null}
      <View className="gap-3">
        {countries.map((country, index) => {
            const detailOpen = isCountryOpen(country);
            const cardPadding = width < 420 ? 'p-[16px]' : 'p-[18px]';
            return (<Pressable key={country.id} className={`relative gap-1.5 rounded-[22px] border ${cardPadding} ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} 
             onPress={() => {
  if (!detailOpen) {
    setShowUnlockSheet(true);
    return;
  }
  setSelected(index);
}}>
            {/* Green open lock = open (free / full access), red lock = locked. Always shown, also when the module is free. */}
            <View className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: detailOpen ? '#f0fdf4' : '#fef2f2' }}>
                <Ionicons
                    name={detailOpen ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={16}
                    color={detailOpen ? '#16a34a' : '#ef4444'}
                />
            </View>
            {width < 520 ? (<View className="gap-3 pt-1">
                <View className="flex-row items-start gap-3 pr-10">
                  <View className="h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${palette.teal}10` }}>
                 <Ionicons name="globe-outline" size={28} color={palette.teal}/>
         </View>
                  <View className="min-w-0 flex-1 gap-1 pr-2">
                    <Text numberOfLines={2} className={`text-[15px] font-extrabold leading-5 ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{country.title}</Text>
                   </View>
                </View>
              </View>) : (<View className="flex-row items-start gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${palette.primary}10` }}>
                  <Text className="text-[11px] font-black text-brand">{country.countryName.slice(0, 3).toUpperCase()}</Text>
                </View>
                <View className="min-w-0 flex-1 gap-1 pr-10">
                  <Text numberOfLines={2} className={`text-[16px] font-extrabold leading-5 ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{country.title}</Text>
                    </View>
                <View className="items-end gap-2" />
              </View>)}
          </Pressable>);
        })}
      </View>
      {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Study Abroad" subtitle="Subscribe to more country details, scholarships, visa guidance, and counselling access." onClose={() => setShowUnlockSheet(false)} onPress={() => {
                setShowUnlockSheet(false);
                if (showForm) {
                    openFormSubscriptionPrompt();
                } else {
                    openSubscriptionPrompt({ pathname: '/(drawer)/abroad' });
                }
            }}/>) : null}
    </Screen>);
}
