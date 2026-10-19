import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import RenderHTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Modal, Pressable, ScrollView, Text, TextInput, View, Linking } from 'react-native';
import { createMentorOrder, getBookedMentorSlots, getMentors, verifyMentorPayment,getCategories} from '../../src/api/mentorApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { useAppState } from '../../src/app-state';
import { mentors, palette } from '../../src/careermap-data';
import { AnimatedPressable, HierarchyFilterPanel, Pill, Screen, SectionHeader, UnlockBottomSheet } from '../../src/careermap-ui';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';

import { openRazorpayCheckout } from '../../src/utils/razorpay';
const getMentorInitials = (mentor) => {
    const source = String(mentor?.name || mentor?.avatar || 'M').trim();
    const initials = source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'M';
};
const renderMentorAvatar = (mentor, size = 52) => {
    if (mentor?.image) {
        return (<Image source={{ uri: mentor.image }} resizeMode="cover" style={{
            width: size,
            height: size,
            borderRadius: 18,
        }} />);
    }

    return (<View className="items-center justify-center" style={{
        width: size,
        height: size,
        borderRadius: 18,
        backgroundColor: `${mentor?.accent || palette.primary}14`,
        borderWidth: 1,
        borderColor: `${mentor?.accent || palette.primary}18`,
    }}>
        <Text className="text-[18px] font-black" style={{ color: mentor?.accent || palette.primary, lineHeight: 22 }}>
            {getMentorInitials(mentor)}
        </Text>
    </View>);
};
const normalizeSlotKey = (value = '') => String(value).toLowerCase().replace(/\s+/g, '').replace(/\./g, '').replace(/(am|pm)$/i, '');
const normalizeModuleTitle = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');
const formatDisplayDate = (value) => {
    if (!value) {
        return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return String(value);
    }

    return parsed.toLocaleDateString('en-GB');
};
const parseDateKey = (value) => {
    if (!value) {
        return null;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};
const parseTimeToken = (token) => {
    const normalized = String(token || '').trim();
    if (!normalized) {
        return null;
    }

    const meridiemMatch = normalized.match(/(AM|PM)$/i);
    const timeOnly = normalized.replace(/\s*(AM|PM)$/i, '').trim();
    const [hoursValue = '0', minutesValue = '0'] = timeOnly.split(':');
    let hours = Number(hoursValue);
    const minutes = Number(minutesValue || 0);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }

    if (meridiemMatch) {
        const meridiem = meridiemMatch[1].toUpperCase();
        if (hours === 12) {
            hours = 0;
        }
        if (meridiem === 'PM') {
            hours += 12;
        }
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }

    return { hours, minutes };
};
const getSlotEndDate = (dateKey, slot) => {
    const baseDate = parseDateKey(dateKey);
    if (!baseDate || !slot) {
        return null;
    }

    const tokens = String(slot).split(/[-–—]/).map((value) => value.trim()).filter(Boolean);
    const endToken = tokens[tokens.length - 1];
    const time = parseTimeToken(endToken);
    if (!time) {
        return null;
    }

    const slotEnd = new Date(baseDate);
    slotEnd.setHours(time.hours, time.minutes, 0, 0);
    if (slotEnd < baseDate) {
        slotEnd.setDate(slotEnd.getDate() + 1);
    }

    return slotEnd;
};
const isSlotExpired = (slot, dateKey) => {
    const slotEndDate = getSlotEndDate(dateKey, slot);
    if (!slotEndDate) {
        return false;
    }

    return slotEndDate.getTime() <= Date.now();
};
const getFutureSlots = (dateKey, slotList) => {
    if (!Array.isArray(slotList)) {
        return [];
    }

    return slotList.filter((slot) => !isSlotExpired(slot, dateKey));
};
export default function BookMentorScreen() {
    const params = useLocalSearchParams();
    const { width: screenWidth } = useWindowDimensions();
    const { addBooking, canAccessFreeDetail, isUnlocked, preferences, registerFreeDetailAccess, userProfile } = useAppState();
    const [mentorList, setMentorList] = useState(mentors);
    const [showFilters, setShowFilters] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [categories, setCategories] = useState([]);
const [categoryLoading, setCategoryLoading] = useState(false);
const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
const [categorySearchQuery, setCategorySearchQuery] = useState('');


const [resolvedModuleId, setResolvedModuleId] = useState(() => {
        const parsed = Number(params.moduleId);
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [moduleAccessResolved, setModuleAccessResolved] = useState(false);
    const [moduleAccessAllowed, setModuleAccessAllowed] = useState(true);
    const [moduleAccessPreview, setModuleAccessPreview] = useState(false);
    const [moduleAccessMode, setModuleAccessMode] = useState('');
    const [moduleAccessMessage, setModuleAccessMessage] = useState('');
    const [selectedMentorId, setSelectedMentorId] = useState(null);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [isMentorLoading, setIsMentorLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [showBookingPanel, setShowBookingPanel] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');
    const [upiId, setUpiId] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [booked, setBooked] = useState(false);
    const [paymentReference, setPaymentReference] = useState('');
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [mentorsLoaded, setMentorsLoaded] = useState(false);
    const celebration = useRef(new Animated.Value(0)).current;
    const fallbackMentor = selectedMentorId ? mentorList.find((item) => String(item.id) === String(selectedMentorId)) || null : null;
    const activeMentor = selectedMentor || fallbackMentor;
    const detailUnlocked = activeMentor ? canAccessFreeDetail('book-mentor', activeMentor.name) : true;
    const hasFullAccess = moduleAccessMode === 'full';
    const modulePreviewBanner = !isUnlocked('book-mentor') && moduleAccessPreview;
    const selectedDateDisplay = formatDisplayDate(selectedDate);
    const selectedTimeDisplay = selectedSlot || 'Not selected';
    const formatCardNumber = (value) => value.replace(/\D/g, '').slice(0, 16);
    const formatExpiry = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits.length < 3)
            return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    };
    const isValidExpiry = (value) => {
        if (!/^\d{2}\/\d{2}$/.test(value))
            return false;
        const [month] = value.split('/').map(Number);
        return month >= 1 && month <= 12;
    };
    const resetMentorFlow = () => {
        setBooked(false);
        setSelectedMentorId(null);
        setSelectedMentor(null);
        setIsMentorLoading(false);
        setSelectedDate('');
        setSelectedSlot('');
        setShowBookingPanel(false);
        setShowPayment(false);
        setSelectedPayment('');
        setUpiId('');
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setSelectedBank('');
        setPaymentReference('');
    };
    const animationKey = booked && activeMentor
        ? `booked-${selectedMentorId || activeMentor.id || activeMentor.name}`
        : activeMentor && showPayment
            ? `payment-${selectedMentorId || activeMentor.id || activeMentor.name}-${selectedDate || 'date'}-${selectedSlot || 'slot'}`
            : activeMentor
                ? `mentor-${selectedMentorId || activeMentor.id || activeMentor.name}`
                : 'mentor-list';
    const dates = useMemo(() => {
        if (activeMentor?.availability?.length) {
            return activeMentor.availability
                .map((item) => ({
                    key: item.key,
                    day: item.day,
                    date: item.date,
                    month: item.month,
                    slots: Array.isArray(item.slots) ? item.slots : [],
                    available: getFutureSlots(item.key, item.slots).length > 0,
                }))
                .filter((item) => item.available);
        }

        return Array.from({ length: 14 }, (_, index) => {
            const current = new Date();
            current.setDate(current.getDate() + index);
            return {
                key: current.toISOString().split('T')[0],
                day: current.toLocaleDateString('en-IN', { weekday: 'short' }),
                date: current.getDate().toString(),
                month: current.toLocaleDateString('en-IN', { month: 'short' }),
                available: index % 4 !== 1,
            };
        });
    }, [activeMentor]);
    const slots = useMemo(() => {
        if (!activeMentor?.availability?.length) {
            return ['9:00 AM', '10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM', '6:30 PM'];
        }

        const availabilityForSelectedDate = activeMentor.availability.find((item) => item.key === selectedDate);
        const futureSlotsForSelectedDate = availabilityForSelectedDate ? getFutureSlots(selectedDate, availabilityForSelectedDate.slots) : [];
        if (futureSlotsForSelectedDate.length) {
            return futureSlotsForSelectedDate;
        }

        const firstAvailableDate = dates[0];
        return firstAvailableDate ? getFutureSlots(firstAvailableDate.key, firstAvailableDate.slots) : [];
    }, [activeMentor, selectedDate, dates]);
    const bookedSlotKeys = useMemo(() => bookedSlots.map((slot) => normalizeSlotKey(slot)).filter(Boolean), [bookedSlots]);
    const isSlotBooked = (slot) => bookedSlotKeys.includes(normalizeSlotKey(slot));
    const openBookingPanel = () => {
        if (!selectedDate && dates.length) {
            const firstAvailableDate = dates.find((date) => date.available) || dates[0];
            setSelectedDate(firstAvailableDate?.key || '');
        }

        setSelectedSlot('');
        setShowBookingPanel(true);
    };
    const closeBookingPanel = () => setShowBookingPanel(false);
   const categoryOptions = useMemo(() => {
    return categories.map((category) => ({
        label: category.name || category.category_name || category.title,
        value: String(
            category.id ||
            category._id ||
            category.name
        ),
    }));
}, [categories]);
   

function getOptionValue(option) {
    return String(option?.value ?? option?.id ?? option?.label ?? option ?? '');
}
function getOptionLabel(option) {
    return String(option?.label ?? option?.title ?? option?.name ?? option ?? '');
}

const searchableCategoryOptions = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return categoryOptions;
    return categoryOptions.filter((opt) => getOptionLabel(opt).toLowerCase().includes(query));
}, [categoryOptions, categorySearchQuery]);

const filteredMentors = useMemo(() => {
    if (categoryFilter === 'All') return mentorList;

    const selectedOption = categoryOptions.find(
        (opt) => String(opt.value) === String(categoryFilter)
    );

    return mentorList.filter((mentor) => {
        const mentorCategoryId =
            mentor?.category?.id ?? mentor?.category?._id ?? mentor?.category_id ?? mentor?.categoryId;
        const mentorCategoryName =
            mentor?.category?.name ?? (typeof mentor?.category === 'string' ? mentor.category : null);

        return (
            String(mentorCategoryId) === String(categoryFilter) ||
            (selectedOption && mentorCategoryName &&
                mentorCategoryName.toLowerCase() === selectedOption.label.toLowerCase())
        );
    });
}, [mentorList, categoryFilter, categoryOptions]);
    useEffect(() => {
        if (mentorList.length === 0) {
            setMentorList(mentors);
        }
    }, [mentorList.length]);
    useEffect(() => {
        if (categoryFilter !== 'All' && !categoryOptions.some((option) => String(option?.value ?? option?.id ?? option?.label ?? option) === String(categoryFilter))) {
            setCategoryFilter('All');
        }
    }, [categoryFilter, categoryOptions]);
   
    useEffect(() => {
        let isMounted = true;

        const loadMentors = async () => {
            try {
                const response = await getMentors();
                if (isMounted && response.length > 0) {
                    setMentorList(response);
                }
            }
            catch (error) {
                console.log('Mentor fetch failed', error?.response?.data || error?.message || error);
            }
            finally {
                if (isMounted) {
                    setMentorsLoaded(true);
                }
            }
        };

        loadMentors();

        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        if (!activeMentor) {
            return;
        }

        if (dates.length && !dates.some((item) => item.key === selectedDate)) {
            setSelectedDate(dates[0]?.key || '');
            setSelectedSlot('');
            return;
        }

        if (!selectedDate && dates.length) {
            setSelectedDate(dates[0]?.key || '');
        }
    }, [activeMentor, dates, selectedDate]);
    useEffect(() => {
        let isMounted = true;

        const loadBookedSlots = async () => {
            if (!activeMentor?.id || !selectedDate) {
                setBookedSlots([]);
                return;
            }

            try {
                const response = await getBookedMentorSlots(activeMentor.id, selectedDate);
                if (isMounted) {
                    setBookedSlots(response);
                }
            }
            catch (error) {
                console.log('Booked slots fetch failed', error?.response?.data || error?.message || error);
                if (isMounted) {
                    setBookedSlots([]);
                }
            }
        };

        loadBookedSlots();

        return () => {
            isMounted = false;
        };
    }, [activeMentor?.id, selectedDate]);
    useEffect(() => {
        if (selectedSlot && bookedSlotKeys.includes(normalizeSlotKey(selectedSlot))) {
            setSelectedSlot('');
        }
    }, [bookedSlotKeys, selectedSlot]);
    useEffect(() => {
        if (typeof params.selected === 'string' || typeof params.id === 'string') {
            setSelectedMentorId(String(params.selected || params.id));
        }
    }, [params.id, params.selected]);
    // Global search / Career Bee: open the mentor's profile with the same rule as the list
    // (full access, or one of the first four free cards); otherwise show the unlock sheet.
    useSearchDeepLink(params.searchKey, moduleAccessResolved && mentorsLoaded, () => {
        const mentorId = typeof params.mentorId === 'string' ? params.mentorId : '';
        const index = mentorList.findIndex((mentor) => String(mentor.id) === mentorId);
        if (!mentorId || !moduleAccessAllowed || index === -1) {
            return;
        }
        if (!(hasFullAccess || index < 4)) {
            setShowUnlockSheet(true);
            return;
        }
        setSelectedMentorId(String(mentorList[index].id));
        setShowBookingPanel(false);
    });
    useEffect(() => {
        let isMounted = true;

        const resolveModuleAccess = async () => {
            const explicitStatus = String(params.accessStatus || '').toLowerCase();

            if (explicitStatus === 'locked') {
                if (isMounted) {
                    setModuleAccessAllowed(false);
                    setModuleAccessPreview(false);
                    setModuleAccessMessage('Please purchase a subscription to continue accessing this module.');
                    setModuleAccessMode('locked');
                    setModuleAccessResolved(true);
                }
                return;
            }

            if (explicitStatus === 'unlocked' || explicitStatus === 'preview') {
                if (isMounted) {
                    setModuleAccessAllowed(true);
                    setModuleAccessPreview(explicitStatus === 'preview');
                    setModuleAccessMessage('');
                    setModuleAccessMode(explicitStatus === 'unlocked' ? 'full' : 'preview');
                    setModuleAccessResolved(true);
                }
                return;
            }

            try {
                let moduleId = Number(params.moduleId);

                if (!Number.isFinite(moduleId)) {
                    const modules = await getModules();
                    const matchedModule = modules.find((module) => normalizeModuleTitle(module?.title) === 'book your mentor')
                        || modules.find((module) => normalizeModuleTitle(module?.title).includes('book your mentor'));

                    moduleId = Number(matchedModule?.id);
                    if (isMounted && Number.isFinite(moduleId)) {
                        setResolvedModuleId(moduleId);
                    }
                }

                if (!Number.isFinite(moduleId)) {
                    if (isMounted) {
                        setModuleAccessAllowed(true);
                        setModuleAccessPreview(false);
                        setModuleAccessMessage('');
                        setModuleAccessResolved(true);
                    }
                    return;
                }

                const response = await checkModuleAccess(moduleId);
                if (!isMounted) {
                    return;
                }

                setResolvedModuleId(moduleId);
                setModuleAccessAllowed(Boolean(response?.allowed));
                setModuleAccessPreview(Boolean(response?.freePreview));
                setModuleAccessMessage(response?.message || '');
                setModuleAccessMode(String(response?.mode || '').toLowerCase());
                setModuleAccessResolved(true);
            } catch (error) {
                console.log('Module access check failed', error?.response?.data || error?.message || error);
                if (isMounted) {
                    setModuleAccessAllowed(true);
                    setModuleAccessPreview(false);
                    setModuleAccessMessage('');
                    setModuleAccessResolved(true);
                }
            }
        };

        resolveModuleAccess();

        return () => {
            isMounted = false;
        };
    }, [params.accessStatus, params.moduleId]);
    useEffect(() => {
    const fetchCategories = async () => {
        try {
            setCategoryLoading(true);

            const response = await getCategories();

            console.log('Categories API Response:', response);

            const categoryData =
                response?.data?.results ||
                response?.data ||
                response?.results ||
                [];

            setCategories(
                Array.isArray(categoryData) ? categoryData : []
            );

        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategories([]);
        } finally {
            setCategoryLoading(false);
        }
    };

    fetchCategories();
}, []);
    useEffect(() => {
        let isMounted = true;

        const resolveModuleAccess = async () => {
            const explicitStatus = String(params.accessStatus || '').toLowerCase();

            if (explicitStatus === 'locked') {
                if (isMounted) {
                    setModuleAccessAllowed(false);
                    setModuleAccessPreview(false);
                    setModuleAccessMessage('Please purchase a subscription to continue accessing this module.');
                    setModuleAccessMode('locked');
                    setModuleAccessResolved(true);
                }
                return;
            }

            try {
                let moduleId = Number(params.moduleId);

                if (!Number.isFinite(moduleId)) {
                    const modules = await getModules();
                    const matchedModule = modules.find((module) => normalizeModuleTitle(module?.title) === 'book your mentor')
                        || modules.find((module) => normalizeModuleTitle(module?.title).includes('book your mentor'));

                    moduleId = Number(matchedModule?.id);
                    if (isMounted && Number.isFinite(moduleId)) {
                        setResolvedModuleId(moduleId);
                    }
                }

                if (!Number.isFinite(moduleId)) {
                    if (isMounted) {
                        setModuleAccessAllowed(true);
                        setModuleAccessPreview(false);
                        setModuleAccessMessage('');
                        setModuleAccessResolved(true);
                    }
                    return;
                }

                const response = await checkModuleAccess(moduleId);
                if (!isMounted) {
                    return;
                }

                setResolvedModuleId(moduleId);
                setModuleAccessAllowed(Boolean(response?.allowed));
                setModuleAccessPreview(Boolean(response?.freePreview));
                setModuleAccessMessage(response?.message || '');
                setModuleAccessMode(String(response?.mode || '').toLowerCase());
                setModuleAccessResolved(true);
            } catch (error) {
                console.log('Module access check failed', error?.response?.data || error?.message || error);
                if (isMounted) {
                    setModuleAccessAllowed(true);
                    setModuleAccessPreview(false);
                    setModuleAccessMessage('');
                    setModuleAccessResolved(true);
                }
            }
        };

        resolveModuleAccess();

        return () => {
            isMounted = false;
        };
    }, [params.accessStatus, params.moduleId]);
    useEffect(() => {
        if (!booked) {
            celebration.setValue(0);
            return;
        }
        Animated.spring(celebration, {
            toValue: 1,
            useNativeDriver: true,
            speed: 11,
            bounciness: 10,
        }).start();
    }, [booked, celebration]);
    const handlePayment = async () => {
        if (!activeMentor || !selectedDate || !selectedSlot) {
            return;
        }

        try {
            const orderResponse = await createMentorOrder({
                mentorId: activeMentor.id,
                date: selectedDate,
                timeSlot: selectedSlot,
            });

            const order = orderResponse?.order;
            const key = orderResponse?.key;

            if (!order?.id || !key) {
                throw new Error('Failed to initiate Razorpay checkout.');
            }

            const paymentResponse = await openRazorpayCheckout({
                key,
                amount: Number(order.amount),
                currency: order.currency,
                order_id: order.id,
                name: 'CareerMap',
                description: `Mentor booking with ${activeMentor.name}`,
                prefill: {
                    name: userProfile?.name || '',
                    email: userProfile?.email || '',
                    contact: userProfile?.mobile || '',
                },
                theme: {
                    color: palette.primary,
                },
            });

            await verifyMentorPayment({
                mentorId: activeMentor.id,
                date: selectedDate,
                timeSlot: selectedSlot,
                razorpay_order_id: paymentResponse?.razorpay_order_id || order.id,
                razorpay_payment_id: paymentResponse?.razorpay_payment_id,
                razorpay_signature: paymentResponse?.razorpay_signature,
            });

            const finalPaymentReference = paymentResponse?.razorpay_payment_id || order.id;
            setPaymentReference(finalPaymentReference);
            addBooking({
                id: `booking-${activeMentor.name}-${selectedDate}-${selectedSlot}`,
                mentorName: activeMentor.name,
                date: selectedDate,
                time: selectedSlot,
                status: 'Confirmed',
                transactionId: finalPaymentReference,
            });
            setBooked(true);
        }
        catch (error) {
            const message = error?.message || error?.response?.data?.message || 'Booking payment failed. Please try again.';
            if (!/cancelled/i.test(message)) {
                Alert.alert('Payment issue', message);
            }
        }
    };

    if (!moduleAccessResolved) {
        return (<Screen animationKey="book-mentor-access-loading">
            <SectionHeader title="Book Your Mentor" subtitle="Checking your subscription access." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                setSelectedMentorId(null);
                setSelectedMentor(null);
            }}>
                <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>} />
            <View className={`flex-1 items-center justify-center gap-3 rounded-[24px] border p-6 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text className={`text-[16px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Checking access...</Text>
                <Text className={`text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>We are confirming whether your subscription can open the mentor module.</Text>
            </View>
        </Screen>);
    }
    if (!moduleAccessAllowed) {
        return (<Screen animationKey="book-mentor-locked">
            <SectionHeader title="Book Your Mentor Locked" subtitle="This module needs an active subscription." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                setSelectedMentorId(null);
                setSelectedMentor(null);
            }}>
                <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>} />
            <View className={`gap-3 rounded-[26px] border p-6 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <View className="h-12 w-12 items-center justify-center rounded-[16px]" style={{ backgroundColor: `${palette.primary}14` }}>
                    <Ionicons name="lock-closed" size={22} color={palette.primary} />
                </View>
                <Text className={`text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Book Your Mentor is locked</Text>
                <Text className={`text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{moduleAccessMessage || 'Please purchase a subscription to unlock mentor booking and profile access.'}</Text>
                <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => openSubscriptionPrompt({
                    pathname: '/(drawer)/book-mentor',
                    params: resolvedModuleId ? { moduleId: String(resolvedModuleId) } : undefined,
                })}>
                    <Text className="text-center text-[14px] font-extrabold text-white">View Plans</Text>
                </AnimatedPressable>
            </View>
        </Screen>);
    }
    if (booked && activeMentor) {
        const mentor = activeMentor;
        const confetti = [
            { top: 16, left: 22, color: palette.secondary, rotate: '-20deg' },
            { top: 34, right: 24, color: palette.orange, rotate: '24deg' },
            { top: 86, left: 10, color: palette.blue, rotate: '-32deg' },
            { top: 100, right: 12, color: palette.pink, rotate: '18deg' },
            { bottom: 132, left: 28, color: palette.green, rotate: '-12deg' },
            { bottom: 118, right: 26, color: palette.primary, rotate: '16deg' },
        ];
        return (<Screen animationKey={animationKey}>
            <SectionHeader title="Booking Confirmed" subtitle="The mentor booking flow now mirrors the prototype much more closely." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={resetMentorFlow}>
                <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>} />
            <View className={`overflow-hidden rounded-[26px] border p-[22px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                {confetti.map((piece, index) => (<Animated.View key={index} className="absolute h-4 w-4 rounded-[4px]" style={[
                    piece,
                    {
                        backgroundColor: piece.color,
                        opacity: celebration.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                        transform: [
                            { translateY: celebration.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
                            { scale: celebration.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                            { rotate: piece.rotate },
                        ],
                    },
                ]} />))}
                <View className="items-center gap-[14px]">
                    <Animated.View style={{
                        transform: [{ scale: celebration.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
                        opacity: celebration,
                    }}>
                        <View className="h-[90px] w-[90px] items-center justify-center rounded-[30px]" style={{ backgroundColor: `${palette.green}14` }}>
                            <Ionicons name="checkmark-circle" size={52} color={palette.green} />
                        </View>
                    </Animated.View>
                    <Text className={`text-center text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Session booked successfully</Text>
                    <Text className={`text-center text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Payment successful. Your session with {mentor.name} is confirmed for {selectedDateDisplay || selectedDate} at {selectedTimeDisplay}.</Text>
                    <View className={`w-full gap-2.5 rounded-[22px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-card'}`}>
                        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Mentor: {mentor.name}</Text>
                        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Date: {selectedDateDisplay || selectedDate}</Text>
                        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Time: {selectedTimeDisplay}</Text>
                        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Price: {mentor.price}</Text>
                        <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Payment Method: Razorpay Checkout</Text>
                        {paymentReference ? (
                            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Payment Ref: {paymentReference}</Text>
                        ) : null}
                    </View>
                    <AnimatedPressable className="w-full rounded-[16px] bg-brand py-[14px] px-[14px]" onPress={resetMentorFlow}>
                        <Text className="text-center text-[14px] font-extrabold text-white">Back to Mentor List</Text>
                    </AnimatedPressable>
                </View>
            </View>
        </Screen>);
    }
    if (activeMentor && showPayment) {
        const mentor = activeMentor;
        const canPay = selectedPayment === 'upi'
            ? upiId.includes('@')
            : selectedPayment === 'card'
                ? cardName.trim().length > 0 && cardNumber.length === 16 && isValidExpiry(cardExpiry) && cardCvv.length >= 3
                : selectedPayment === 'netbanking'
                    ? selectedBank.length > 0
                    : false;
        return (<Screen animationKey={animationKey}>
            <SectionHeader title="Payment" subtitle="Booking summary and payment choices adapted from the prototype flow." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setShowPayment(false)}>
                <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>} />

            <View className={`gap-2.5 rounded-[22px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Booking Summary</Text>
                <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Mentor: {mentor.name}</Text>
                <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Date: {selectedDateDisplay || selectedDate}</Text>
                <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Time: {selectedTimeDisplay}</Text>
                <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Duration: 45 mins</Text>
                <Text className="text-[13px] font-extrabold text-brand">Total: {mentor.price}</Text>
            </View>

            <View className="gap-3">
                {[
                    { id: 'upi', title: 'UPI', subtitle: 'Google Pay, PhonePe, Paytm' },
                    { id: 'card', title: 'Credit / Debit Card', subtitle: 'Visa, Mastercard, RuPay' },
                    { id: 'netbanking', title: 'Net Banking', subtitle: 'All major banks supported' },
                ].map((method) => (<Pressable key={method.id} className="flex-row items-center gap-3 rounded-[22px] border p-4" onPress={() => setSelectedPayment(method.id)} style={{
                    borderColor: selectedPayment === method.id ? palette.primary : preferences.darkMode ? '#1a1a1a' : palette.border,
                    backgroundColor: selectedPayment === method.id ? `${palette.primary}08` : preferences.darkMode ? '#080808' : palette.card,
                }}>
                    <View className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`}>
                        <Ionicons name={method.id === 'upi' ? 'phone-portrait-outline' : method.id === 'card' ? 'card-outline' : 'business-outline'} size={18} color={selectedPayment === method.id ? palette.primary : preferences.darkMode ? '#b7aeb9' : palette.muted} />
                    </View>
                    <View className="flex-1 gap-1">
                        <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{method.title}</Text>
                        <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{method.subtitle}</Text>
                    </View>
                    <View className="h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: selectedPayment === method.id ? palette.primary : '#d2c7bf' }}>
                        {selectedPayment === method.id ? <View className="h-2 w-2 rounded-full bg-brand" /> : null}
                    </View>
                </Pressable>))}
            </View>

            {selectedPayment === 'upi' ? (<TextInput value={upiId} onChangeText={setUpiId} placeholder="yourname@upi" placeholderTextColor={preferences.darkMode ? '#7f7481' : palette.muted} className={`rounded-[16px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`} />) : null}

            {selectedPayment === 'card' ? (<View className="gap-2.5">
                <TextInput value={cardName} onChangeText={setCardName} placeholder="Name on card" placeholderTextColor={preferences.darkMode ? '#7f7481' : palette.muted} className={`rounded-[16px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`} />
                <TextInput value={cardNumber} onChangeText={(value) => setCardNumber(formatCardNumber(value))} keyboardType="number-pad" placeholder="1234567890123456" placeholderTextColor={preferences.darkMode ? '#7f7481' : palette.muted} className={`rounded-[16px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`} />
                <View className="flex-row gap-2.5">
                    <TextInput value={cardExpiry} onChangeText={(value) => setCardExpiry(formatExpiry(value))} keyboardType="number-pad" placeholder="MM/YY" placeholderTextColor={preferences.darkMode ? '#7f7481' : palette.muted} className={`flex-1 rounded-[16px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`} />
                    <TextInput value={cardCvv} onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="CVV" placeholderTextColor={preferences.darkMode ? '#7f7481' : palette.muted} className={`flex-1 rounded-[16px] border px-4 py-[14px] text-[14px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`} />
                </View>
            </View>) : null}

            {selectedPayment === 'netbanking' ? (<View className="flex-row flex-wrap gap-2.5">
                {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((bank) => {
                    const active = selectedBank === bank;
                    return (<Pressable key={bank} className="min-w-[47%] items-center rounded-[14px] border py-3" onPress={() => setSelectedBank(bank)} style={{
                        borderColor: active ? palette.primary : preferences.darkMode ? '#1a1a1a' : palette.border,
                        backgroundColor: active ? `${palette.primary}08` : preferences.darkMode ? '#080808' : palette.card,
                    }}>
                        <Text className="text-[12px] font-extrabold" style={{ color: active ? palette.primary : preferences.darkMode ? '#ffffff' : palette.text }}>{bank}</Text>
                    </Pressable>);
                })}
            </View>) : null}

            <View className="flex-row items-center gap-2 rounded-[14px] px-3 py-2.5" style={{ backgroundColor: `${palette.green}10` }}>
                <Ionicons name="shield-checkmark-outline" size={16} color={palette.green} />
                <Text className="flex-1 text-[11px] font-bold text-success">Your payment is secured with 256-bit SSL encryption</Text>
            </View>

            <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" disabled={!canPay} onPress={handlePayment}>
                <Text className="text-center text-[14px] font-extrabold text-white">Pay {mentor.price} & Confirm</Text>
            </AnimatedPressable>
        </Screen>);
    }
    if (isMentorLoading && selectedMentorId) {
        return (<Screen animationKey={animationKey}>
            <SectionHeader title="Mentor Profile" subtitle="Loading mentor details from the server." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                setSelectedMentorId(null);
                setSelectedMentor(null);
                setIsMentorLoading(false);
                setSelectedDate('');
                setSelectedSlot('');
                setShowPayment(false);
                setPaymentReference('');
            }}>
                <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>} />
            <View className={`items-center gap-3 rounded-[24px] border p-6 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <Text className={`text-[16px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Loading mentor details...</Text>
                <Text className={`text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Please wait while we fetch the selected mentor from the backend.</Text>
            </View>
        </Screen>);
    }
    if (selectedMentorId !== null && activeMentor) {
        const mentor = activeMentor;
        const experienceMatch = String(mentor.experience || '').match(/^(\d+)\s*(.*)$/);
        const experienceValue = experienceMatch?.[1] || mentor.experience || '0';
        const experienceSuffix = experienceMatch?.[2] || 'yrs';
        return (<Screen animationKey={animationKey}>
            <SectionHeader title="Mentor Profile" subtitle="Profile, schedule selection, and booking flow aligned with the reference prototype." action={<Pressable className={`h-[38px] w-[38px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => {
                setSelectedMentorId(null);
                setSelectedMentor(null);
                setIsMentorLoading(false);
                setSelectedDate('');
                setSelectedSlot('');
                setShowPayment(false);
                setPaymentReference('');
            }}>
                <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>} />
            {!isUnlocked('book-mentor') ? (<View className="self-start rounded-full px-3 py-2" style={{ backgroundColor: `${detailUnlocked || modulePreviewBanner ? palette.green : palette.orange}14` }}>
                <Text className="text-[12px] font-extrabold" style={{ color: detailUnlocked || modulePreviewBanner ? palette.green : palette.orange }}>
                    {detailUnlocked || modulePreviewBanner ? '1 free mentor detail unlocked' : 'Subscribe to unlock more mentor profiles'}
                </Text>
            </View>) : null}

            <View className={`relative rounded-[28px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
               <View className="absolute top-4 left-4 right-4 z-10 flex-row justify-between">
  
  {/* Resume Button (Left) */}
  {mentor.resume && (
    <AnimatedPressable
      className="rounded-full bg-brand px-4 py-2"
      onPress={() => Linking.openURL(mentor.resume)}
    >
      <Text className="text-[12px] font-extrabold text-white">
        Expert Profile
      </Text>
    </AnimatedPressable>
  )}

  {/* Book Now Button (Right) */}
  <AnimatedPressable
    className="rounded-full bg-brand px-4 py-2"
    onPress={openBookingPanel}
  >
    <Text className="text-[12px] font-extrabold text-white">
      Book Now
    </Text>
  </AnimatedPressable>

</View>
                <View className="items-center gap-2 pt-6">
                    <View className="h-[52px] w-[52px] overflow-hidden rounded-[18px]" style={{ backgroundColor: `${mentor.accent}15` }}>
                        {renderMentorAvatar(mentor)}
                    </View>
                    <Text className={`text-center text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.name}</Text>
                    <Text className="text-center text-[12px] font-bold text-brand">{mentor.designation || mentor.specialty}</Text>
                    <View className="flex-row flex-wrap justify-center gap-2.5">
                        
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="star" size={12} color={palette.secondary} />
                            <Text className={`text-[11px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.averageRating ? mentor.averageRating.toFixed(1) : 'New'}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="briefcase-outline" size={12} color={palette.blue} />
                            <Text className={`text-[11px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.experience}</Text>
                        </View>
                        <Text className="text-[11px] font-extrabold text-brand">{mentor.price}</Text>
                    </View>
                    <View className="flex-row flex-wrap justify-center gap-2">
                        {mentor.tags.map((tag) => (<Pill key={tag} label={tag} tone={mentor.accent} />))}
                    </View>
                </View>
            </View>
<View className={`rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                        <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>About</Text>
                        {mentor.bioHtml ? (
                            <RenderHTML
                                contentWidth={screenWidth - 80}
                                source={{ html: mentor.bioHtml }}
                                baseStyle={{
                                    color: preferences.darkMode ? '#ffffff' : palette.text,
                                    fontSize: 13,
                                    lineHeight: 20,
                                    marginTop: 4,
                                }}
                                tagsStyles={{
                                    h1: { fontSize: 20, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 6 },
                                    h2: { fontSize: 18, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 6 },
                                    h3: { fontSize: 16, fontWeight: '800', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
                                    p: { marginVertical: 4 },
                                    li: { marginVertical: 2 },
                                    strong: { fontWeight: '800' },
                                    a: { color: palette.primary },
                                }}
                            />
                        ) : (
                            <Text className={`mt-1 text-[13px] font-medium leading-[20px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                {mentor.bio || mentor.description || 'Mentor description is not available right now.'}
                            </Text>
                        )}
                    </View>
            <View className={` gap-3 rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Profile Details</Text>
                <View className="flex-row flex-wrap gap-2.5">
                    <View className={`w-full rounded-[18px] border p-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-[#fcf8f5]'}`}>
                        <Text className={`text-[11px] font-extrabold uppercase ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Designation</Text>
                        <Text className={`mt-1 text-[13px] font-semibold leading-[19px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.designation || mentor.specialty}</Text>
                    </View>
                  
                    <View className={`w-full rounded-[18px] border p-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-[#fcf8f5]'}`}>
                        <Text className={`text-[11px] font-extrabold uppercase ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Place of Work</Text>
                        <Text className={`mt-1 text-[13px] font-semibold leading-[19px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.placeOfWork || 'Not available'}</Text>
                    </View>
                      <View className={`w-full rounded-[18px] border p-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-[#fcf8f5]'}`}>
                        <Text className={`text-[11px] font-extrabold uppercase ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Experience</Text>
                        <Text className={`mt-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.experience}</Text>
                    </View>
                    <View className={`w-full rounded-[18px] border p-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-[#fcf8f5]'}`}>
                        <Text className={`text-[11px] font-extrabold uppercase ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Area of Expertise</Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                            {(mentor.skills?.length ? mentor.skills : String(mentor.skill || '').split(/\r?\n|,/)).filter(Boolean).map((skill) => (<View key={skill} className="rounded-full px-3 py-1.5" style={{ backgroundColor: `${mentor.accent}14` }}>
                                    <Text className="text-[12px] font-bold" style={{ color: mentor.accent }}>{skill}</Text>
                                </View>))}
                        </View>
                    </View>
                   
                </View>
            </View>

            <Modal visible={showBookingPanel} transparent animationType="fade" onRequestClose={closeBookingPanel}>
                <View className="flex-1 items-center justify-center bg-black/50 px-4">
                    <View className={`w-full max-w-[360px] max-h-[88%] gap-4 rounded-[28px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                        <View className="flex-row items-center justify-between">
                            <Text className={`text-[20px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Book Session</Text>
                            <Pressable className={`h-9 w-9 items-center justify-center rounded-full ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={closeBookingPanel}>
                                <Ionicons name="close" size={18} color={preferences.darkMode ? '#ffffff' : palette.text} />
                            </Pressable>
                        </View>

                        <View className={`gap-2 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-[#fcf8f5]'}`}>
                            <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Select Date</Text>
                            <View className="flex-row flex-wrap gap-2.5">
                                {dates.map((date) => (<Pressable key={date.key} disabled={!date.available} onPress={() => {
                                        setSelectedDate(date.key);
                                        setSelectedSlot('');
                                    }} className="w-[62px] items-center gap-0.5 rounded-[16px] py-2.5" style={{
                                        backgroundColor: selectedDate === date.key ? palette.primary : preferences.darkMode ? '#111111' : '#f2ebe6',
                                        opacity: date.available ? 1 : 0.35,
                                    }}>
                                        <Text className="text-[10px] font-bold" style={{ color: selectedDate === date.key ? '#fff' : palette.muted }}>{date.day}</Text>
                                        <Text className="text-[17px] font-black" style={{ color: selectedDate === date.key ? '#fff' : palette.text }}>{date.date}</Text>
                                        <Text className="text-[10px] font-bold" style={{ color: selectedDate === date.key ? '#fff' : palette.muted }}>{date.month}</Text>
                                    </Pressable>))}
                            </View>
                        </View>

                        {selectedDate ? (<View className={`gap-2 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-line bg-[#fcf8f5]'}`}>
                                <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Select Time</Text>
                                <View className="flex-row flex-wrap gap-2.5">
                                    {slots.map((slot) => {
                                        const slotDisabled = isSlotBooked(slot);
                                        return (<Pressable key={slot} disabled={slotDisabled} className="rounded-[12px] px-[14px] py-2.5" onPress={() => setSelectedSlot(slot)} style={{ backgroundColor: selectedSlot === slot ? palette.primary : preferences.darkMode ? '#111111' : '#f2ebe6', opacity: slotDisabled ? 0.35 : 1 }}>
                                                <Text className="text-[12px] font-extrabold" style={{ color: selectedSlot === slot ? '#fff' : palette.text }}>{slot}</Text>
                                                {slotDisabled ? (<Text className="mt-0.5 text-[10px] font-bold" style={{ color: selectedSlot === slot ? '#fff' : palette.muted }}>
                                                        Booked
                                                    </Text>) : null}
                                            </Pressable>);
                                    })}
                                </View>
                            </View>) : null}

                        <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" disabled={!selectedDate || !selectedSlot} onPress={handlePayment}>
                            <Text className="text-center text-[14px] font-extrabold text-white">Book & Pay</Text>
                        </AnimatedPressable>
                    </View>
                </View>
            </Modal>
        </Screen>);
    }
    return (
        <Screen animationKey={animationKey}>
            <SectionHeader title="Book Your Mentor" subtitle="Mentor list and booking flow adapted closely from the prototype." action={<AnimatedPressable className={`h-[40px] w-[40px] items-center justify-center rounded-[12px] ${showFilters ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#f2ebe6]'}`} onPress={() => setShowFilters((value) => !value)}>
                <Ionicons name={showFilters ? 'options' : 'options-outline'} size={18} color={showFilters ? '#ffffff' : preferences.darkMode ? '#ffffff' : palette.text} />
            </AnimatedPressable>} />

      {showFilters && (
    <View className="gap-3">
        <View className="relative z-10">
            <Pressable
                onPress={() => setShowCategoryDropdown((value) => !value)}
                className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
                <Text numberOfLines={1} className={`flex-1 text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                    {categoryFilter !== 'All'
                        ? getOptionLabel(categoryOptions.find((opt) => getOptionValue(opt) === String(categoryFilter))) || 'All Domains'
                        : 'All Domains'}
                </Text>
                <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={preferences.darkMode ? '#ffffff' : palette.text} />
            </Pressable>

            {showCategoryDropdown ? (
                <View className={`mt-2 max-h-[280px] rounded-[14px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-white'}`}>
                    <View className="p-2">
                        <TextInput
                            value={categorySearchQuery}
                            onChangeText={setCategorySearchQuery}
                            placeholder="Type to search..."
                            placeholderTextColor={preferences.darkMode ? '#666666' : '#a89a94'}
                            autoFocus
                            className={`rounded-[10px] border px-3 py-2 text-[13px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111] text-white' : 'border-line bg-[#f2ebe6] text-ink'}`}
                        />
                    </View>
                    <ScrollView className="max-h-[220px]" keyboardShouldPersistTaps="handled">
                        {categoryFilter !== 'All' ? (
                            <Pressable
                               onPress={() => {
    setCategoryFilter('All');
    setCategorySearchQuery('');
    setShowCategoryDropdown(false);
}}
                                className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                            >
                                <Text className="text-[13px] font-bold text-brand">All Domains</Text>
                            </Pressable>
                        ) : null}
                        {searchableCategoryOptions.length === 0 ? (
                            <Text className={`px-4 py-4 text-center text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No domains found</Text>
                        ) : (
                            searchableCategoryOptions.map((opt) => {
                                const value = getOptionValue(opt);
                                return (
                                    <Pressable
                                        key={value}
                                        onPress={() => {
                                            setCategoryFilter(value);
                    
                                            setCategorySearchQuery('');
                                            setShowCategoryDropdown(false);
                                        }}
                                        className={`border-b px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-line'}`}
                                    >
                                        <Text numberOfLines={1} className={`text-[13px] font-semibold ${value === String(categoryFilter) ? 'text-brand' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                            {getOptionLabel(opt)}
                                        </Text>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>

     

      

        {(categoryFilter !== 'All') ? (
            <Pressable
                onPress={() => {
                    setCategoryFilter('All');
                     setCategorySearchQuery('');
                    setShowCategoryDropdown(false);
                  
                }}
                className={`items-center rounded-[14px] border px-4 py-3 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-[#fdf0ee]'}`}
            >
                <Text className="text-[13px] font-bold text-brand">Clear All Filters</Text>
            </Pressable>
        ) : null}
    </View>
)}
            <View className="gap-3">
                {filteredMentors.map((mentor, index) => {
                    const cardUnlocked = hasFullAccess || index < 4;
                    return (
                        <Pressable key={mentor.id || mentor.name} className={`flex-row items-center gap-3 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => {
                            if (!cardUnlocked) {
                                setShowUnlockSheet(true);
                                return;
                            }
                            setSelectedMentorId(String(mentor.id || index));
                            setShowBookingPanel(false);
                        }}>
                            <View className="h-[52px] w-[52px] overflow-hidden rounded-[18px]" style={{ backgroundColor: `${mentor.accent}15` }}>
                                {renderMentorAvatar(mentor)}
                            </View>
                            <View className="flex-1 gap-0.5">
                                <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{mentor.name}</Text>
                                <Text className="text-[12px] font-bold text-brand">{mentor.specialty}</Text>
                            </View>
                            <View className="items-end gap-1">
                                <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: `${cardUnlocked ? palette.green : '#e53935'}18` }}>
                                    <Ionicons name={cardUnlocked ? 'lock-open' : 'lock-closed'} size={13} color={cardUnlocked ? palette.green : '#e53935'} />
                                </View>
                                <Text className="text-[13px] font-black text-brand">{mentor.price}</Text>
                                <View className="flex-row items-center gap-1">
                                    <Ionicons name="star" size={11} color={palette.secondary} />
                                    <Text className={`text-[10px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                        {mentor.averageRating ? mentor.averageRating.toFixed(1) : 'New'}
                                    </Text>

                                </View>
                                <Text className={`text-[10px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{mentor.experience}</Text>

                            </View>
                        </Pressable>
                    );
                })}
            </View>
            {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Mentor Access" subtitle="Subscribe to more mentor profiles and booking access." onClose={() => setShowUnlockSheet(false)} onPress={() => {
                setShowUnlockSheet(false);
                openSubscriptionPrompt({ pathname: '/(drawer)/book-mentor' });
            }} />) : null}
        </Screen>);
}
