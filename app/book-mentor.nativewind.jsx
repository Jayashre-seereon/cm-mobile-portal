import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { mentors, palette } from '../src/careermap-data';
import { checkModuleAccess, getModules } from '../src/api/moduleAccessApi';
import { AnimatedPressable, Pill, Screen, SectionHeader, UnlockBottomSheet } from '../src/careermap-ui';
export default function BookMentorScreen() {
    const params = useLocalSearchParams();
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');
    const [upiId, setUpiId] = useState('');
    const [booked, setBooked] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [moduleAccessResolved, setModuleAccessResolved] = useState(false);
    const [showUnlockSheet, setShowUnlockSheet] = useState(false);
    const resolvedModuleId = useMemo(() => {
        const parsed = Number(params.moduleId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [params.moduleId]);
    const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => {
        const current = new Date();
        current.setDate(current.getDate() + index);
        return {
            key: current.toISOString().split('T')[0],
            day: current.toLocaleDateString('en-IN', { weekday: 'short' }),
            date: current.getDate().toString(),
            month: current.toLocaleDateString('en-IN', { month: 'short' }),
            available: index % 4 !== 1,
        };
    }), []);
    const slots = ['9:00 AM', '10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM', '6:30 PM'];
    useEffect(() => {
        let isMounted = true;
        const resolveModuleAccess = async () => {
            try {
                let moduleId = resolvedModuleId;
                if (!Number.isFinite(moduleId)) {
                    const modules = await getModules();
                    const matched = modules.find((module) => String(module?.title || '').trim().toLowerCase().includes('mentor'));
                    moduleId = Number(matched?.id);
                }
                if (!Number.isFinite(moduleId)) {
                    if (isMounted) {
                        setHasFullAccess(false);
                        setModuleAccessResolved(true);
                    }
                    return;
                }
                const response = await checkModuleAccess(moduleId);
                if (!isMounted) return;
                setHasFullAccess(String(response?.mode || '').toLowerCase() === 'full');
                setModuleAccessResolved(true);
            }
            catch {
                if (isMounted) {
                    setHasFullAccess(false);
                    setModuleAccessResolved(true);
                }
            }
        };
        resolveModuleAccess();
        return () => {
            isMounted = false;
        };
    }, [resolvedModuleId]);
    useEffect(() => {
        if (!processing)
            return;
        const timer = setTimeout(() => {
            setProcessing(false);
            setBooked(true);
        }, 1600);
        return () => clearTimeout(timer);
    }, [processing]);
    const resetMentorFlow = () => {
        setSelectedIndex(null);
        setSelectedDate('');
        setSelectedSlot('');
        setShowPayment(false);
        setSelectedPayment('');
        setUpiId('');
        setBooked(false);
        setProcessing(false);
    };
    if (processing) {
        return (<Screen>
        <SectionHeader title="Processing" subtitle="Confirming your mentor booking." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => setProcessing(false)}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>
        <View className="min-h-[280px] items-center justify-center gap-[14px] rounded-[26px] border border-line bg-card p-7">
          <View className="h-[54px] w-[54px] rounded-full border-4 border-[#eadfd6] border-t-brand"/>
          <Text className="text-center text-[22px] font-black text-ink">Processing Payment</Text>
          <Text className="text-center text-[14px] leading-[22px] text-muted">Please wait while we confirm your mentor booking.</Text>
        </View>
      </Screen>);
    }
    if (booked && selectedIndex !== null) {
        const mentor = mentors[selectedIndex];
        return (<Screen>
        <SectionHeader title="Booking Confirmed" subtitle="The mentor booking flow now mirrors the prototype much more closely." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={resetMentorFlow}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>
        <View className="items-center gap-[14px] rounded-[26px] border border-line bg-card p-[22px]">
          <Text className="text-center text-[22px] font-black text-ink">Session booked successfully</Text>
          <Text className="text-center text-[14px] leading-[22px] text-muted">Your session with {mentor.name} is confirmed for {selectedDate} at {selectedSlot}.</Text>
          <View className="w-full gap-2.5 rounded-[22px] border border-line bg-card p-[18px]">
            <Text className="text-[13px] text-muted">Mentor: {mentor.name}</Text>
            <Text className="text-[13px] text-muted">Date: {selectedDate}</Text>
            <Text className="text-[13px] text-muted">Time: {selectedSlot}</Text>
            <Text className="text-[13px] text-muted">Price: {mentor.price}</Text>
          </View>
          <AnimatedPressable className="w-full rounded-[16px] bg-brand py-[14px]" onPress={resetMentorFlow}>
            <Text className="text-center text-[14px] font-extrabold text-white">Back to Mentor List</Text>
          </AnimatedPressable>
        </View>
      </Screen>);
    }
    if (selectedIndex !== null && showPayment) {
        const mentor = mentors[selectedIndex];
        const canPay = selectedPayment !== '' && (selectedPayment !== 'upi' || upiId.includes('@'));
        return (<Screen>
        <SectionHeader title="Payment" subtitle="Booking summary and payment choices adapted from the prototype flow." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => setShowPayment(false)}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>

        <View className="gap-2.5 rounded-[22px] border border-line bg-card p-[18px]">
          <Text className="text-[15px] font-extrabold text-ink">Booking Summary</Text>
          <Text className="text-[13px] text-muted">Mentor: {mentor.name}</Text>
          <Text className="text-[13px] text-muted">Date: {selectedDate}</Text>
          <Text className="text-[13px] text-muted">Time: {selectedSlot}</Text>
          <Text className="text-[13px] text-muted">Duration: 45 mins</Text>
          <Text className="text-[13px] font-extrabold text-brand">Total: {mentor.price}</Text>
        </View>

        <View className="gap-3">
          {[
                { id: 'upi', title: 'UPI', subtitle: 'Google Pay, PhonePe, Paytm' },
                { id: 'card', title: 'Credit / Debit Card', subtitle: 'Visa, Mastercard, RuPay' },
                { id: 'netbanking', title: 'Net Banking', subtitle: 'All major banks supported' },
            ].map((method) => (<Pressable key={method.id} className="flex-row items-center gap-3 rounded-[22px] border p-4" onPress={() => setSelectedPayment(method.id)} style={{
                    borderColor: selectedPayment === method.id ? palette.primary : palette.border,
                    backgroundColor: selectedPayment === method.id ? `${palette.primary}08` : palette.card,
                }}>
              <View className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]">
                <Ionicons name={method.id === 'upi' ? 'phone-portrait-outline' : method.id === 'card' ? 'card-outline' : 'business-outline'} size={18} color={selectedPayment === method.id ? palette.primary : palette.muted}/>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-[15px] font-extrabold text-ink">{method.title}</Text>
                <Text className="text-[12px] text-muted">{method.subtitle}</Text>
              </View>
              <View className="h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: selectedPayment === method.id ? palette.primary : '#d2c7bf' }}>
                {selectedPayment === method.id ? <View className="h-2 w-2 rounded-full bg-brand"/> : null}
              </View>
            </Pressable>))}
        </View>

        {selectedPayment === 'upi' ? (<TextInput value={upiId} onChangeText={setUpiId} placeholder="yourname@upi" placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-card px-4 py-[14px] text-[14px] text-ink"/>) : null}

        {selectedPayment === 'netbanking' ? (<View className="flex-row flex-wrap gap-2.5">
            {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((bank) => (<View key={bank} className="min-w-[47%] items-center rounded-[14px] border border-line bg-card py-3">
                <Text className="text-[12px] font-extrabold text-ink">{bank}</Text>
              </View>))}
          </View>) : null}

        <View className="flex-row items-center gap-2 rounded-[14px] px-3 py-2.5" style={{ backgroundColor: `${palette.green}10` }}>
          <Ionicons name="shield-checkmark-outline" size={16} color={palette.green}/>
          <Text className="flex-1 text-[11px] font-bold text-success">Your payment is secured with 256-bit SSL encryption</Text>
        </View>

        <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" disabled={!canPay} onPress={() => {
                const bookingId = `booking-${mentor.name}-${selectedDate}-${selectedSlot}`;
                setReviewBookingId(bookingId);
                setReviewRating(0);
                setReviewText('');
                setReviewSubmitted(false);
                setReviewError('');
                setProcessing(true);
            }}>
          <Text className="text-center text-[14px] font-extrabold text-white">Pay & Confirm</Text>
        </AnimatedPressable>
      </Screen>);
    }
    if (selectedIndex !== null) {
        const mentor = mentors[selectedIndex];
        return (<Screen>
        <SectionHeader title="Mentor Profile" subtitle="Profile, schedule selection, and booking flow aligned with the reference prototype." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => setSelectedIndex(null)}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>

        <View className="items-center gap-2">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px]" style={{ backgroundColor: `${mentor.accent}15` }}>
            <Text className="text-[20px] font-black" style={{ color: mentor.accent }}>{mentor.avatar}</Text>
          </View>
          <Text className="text-center text-[22px] font-black text-ink">{mentor.name}</Text>
          <Text className="text-[12px] font-bold text-brand">{mentor.specialty}</Text>
          <View className="flex-row flex-wrap justify-center gap-2.5">
            <Text className="text-[11px] text-muted">{mentor.rating} ranking</Text>
            <Text className="text-[11px] text-muted">{mentor.experience}</Text>
            <Text className="text-[11px] font-extrabold text-brand">{mentor.price}</Text>
          </View>
          <View className="flex-row flex-wrap justify-center gap-2">
            {mentor.tags.map((tag) => (<Pill key={tag} label={tag} tone={mentor.accent}/>))}
          </View>
        </View>

        <View className="gap-2 rounded-[24px] border border-line bg-card p-5">
          <Text className="text-[20px] font-black text-ink">About</Text>
          <Text className="text-[14px] leading-[21px] text-muted">{mentor.bio}</Text>
        </View>

        <View className="gap-2 rounded-[24px] border border-line bg-card p-5">
          <Text className="text-[20px] font-black text-ink">Select Date</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {dates.map((date) => (<Pressable key={date.key} disabled={!date.available} onPress={() => setSelectedDate(date.key)} className="w-[62px] items-center gap-0.5 rounded-[16px] py-2.5" style={{
                    backgroundColor: selectedDate === date.key ? palette.primary : '#f2ebe6',
                    opacity: date.available ? 1 : 0.35,
                }}>
                <Text className="text-[10px] font-bold" style={{ color: selectedDate === date.key ? '#fff' : palette.muted }}>{date.day}</Text>
                <Text className="text-[17px] font-black" style={{ color: selectedDate === date.key ? '#fff' : palette.text }}>{date.date}</Text>
                <Text className="text-[10px] font-bold" style={{ color: selectedDate === date.key ? '#fff' : palette.muted }}>{date.month}</Text>
              </Pressable>))}
          </View>
        </View>

        {selectedDate ? (<View className="gap-2 rounded-[24px] border border-line bg-card p-5">
            <Text className="text-[20px] font-black text-ink">Select Time</Text>
            <View className="flex-row flex-wrap gap-2.5">
              {slots.map((slot) => (<Pressable key={slot} className="rounded-[12px] px-[14px] py-2.5" onPress={() => setSelectedSlot(slot)} style={{ backgroundColor: selectedSlot === slot ? palette.primary : '#f2ebe6' }}>
                  <Text className="text-[12px] font-extrabold" style={{ color: selectedSlot === slot ? '#fff' : palette.text }}>{slot}</Text>
                </Pressable>))}
            </View>
          </View>) : null}

        <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" disabled={!selectedDate || !selectedSlot} onPress={() => setShowPayment(true)}>
          <Text className="text-center text-[14px] font-extrabold text-white">Book & Pay</Text>
        </AnimatedPressable>
      </Screen>);
    }
    return (<Screen>
      <SectionHeader title="Book Your Mentor" subtitle="Mentor list and booking flow adapted closely from the prototype."/>
      {!moduleAccessResolved ? (<Text className="text-[13px] text-muted">Checking access...</Text>) : null}
      <View className="gap-2 rounded-[24px] border border-line bg-card p-5">
        <Text className="text-[20px] font-black text-ink">Expert Guidance for the Next Big Decision</Text>
        <Text className="text-[14px] leading-[21px] text-muted">Explore counsellors across engineering, design, and career planning, then reserve a 1-on-1 slot.</Text>
      </View>
      <View className="gap-3">
        {mentors.map((mentor, index) => {
            const cardUnlocked = hasFullAccess || index < 4;
            return (<Pressable key={mentor.name} className="flex-row items-center gap-3 rounded-[22px] border border-line bg-card p-4" onPress={() => {
                    if (!cardUnlocked) {
                        setShowUnlockSheet(true);
                        return;
                    }
                    setSelectedIndex(index);
                }}>
            <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px]" style={{ backgroundColor: `${mentor.accent}15` }}>
              <Text className="text-[20px] font-black" style={{ color: mentor.accent }}>{mentor.avatar}</Text>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-[15px] font-extrabold text-ink">{mentor.name}</Text>
              <Text className="text-[12px] font-bold text-brand">{mentor.specialty}</Text>
              <View className="flex-row gap-2.5">
                <Text className="text-[11px] text-muted">{mentor.rating} ranking</Text>
                <Text className="text-[11px] text-muted">{mentor.experience}</Text>
                <Text className="text-[11px] font-extrabold text-brand">{mentor.price}</Text>
              </View>
            </View>
            <Pill label={cardUnlocked ? 'FREE' : 'LOCK'} tone={cardUnlocked ? palette.green : palette.blue}/>
          </Pressable>);
        })}
      </View>
      {showUnlockSheet ? (<UnlockBottomSheet title="Unlock Mentor Access" subtitle="Preview mode allows the first 4 mentor cards only. Purchase to unlock the full mentor list." onClose={() => setShowUnlockSheet(false)} onPress={() => setShowUnlockSheet(false)}/>) : null}
    </Screen>);
}
