import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPlans } from '../src/api/planApi';
import { palette, subscriptions } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
const paymentMethods = [
    { id: 'upi', label: 'UPI', description: 'Google Pay, PhonePe, Paytm' },
    { id: 'card', label: 'Card', description: 'Visa, Mastercard, RuPay' },
    { id: 'netbanking', label: 'Net Banking', description: 'All major banks supported' },
];
const popularBanks = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak', 'Bank of Baroda'];
const quickUpiApps = ['GPay', 'PhonePe', 'Paytm'];
function formatCardNumber(value) {
    return value.replace(/\D/g, '').slice(0, 16);
}
function formatExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3)
        return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
function isValidExpiry(value) {
    if (!/^\d{2}\/\d{2}$/.test(value))
        return false;
    const [month] = value.split('/').map(Number);
    return month >= 1 && month <= 12;
}
function normalizeCardName(value) {
    return value.replace(/\s+/g, ' ').trimStart();
}
export default function CheckoutScreen() {
    const { planId } = useLocalSearchParams();
    const [plans, setPlans] = useState(subscriptions);
    useEffect(() => {
        let isMounted = true;
        const loadPlans = async () => {
            try {
                const response = await getPlans();
                if (isMounted && response.length > 0) {
                    setPlans(response);
                }
            }
            catch (error) {
                console.log('Plans fetch failed', error?.response?.data || error?.message || error);
            }
        };
        loadPlans();
        return () => {
            isMounted = false;
        };
    }, []);
    const plan = plans.find((item) => String(item.id) === String(planId)) ?? plans[0];
    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [upiId, setUpiId] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const transactionId = useMemo(() => `TXN${Date.now().toString().slice(-8)}`, []);
    const canPay = (() => {
        if (selectedMethod === 'upi')
            return upiId.includes('@');
        if (selectedMethod === 'card') {
            return cardName.trim().length > 0 && cardNumber.length === 16 && isValidExpiry(cardExpiry) && cardCvv.length >= 3;
        }
        return selectedBank.length > 0;
    })();
    const handlePay = () => {
        if (!canPay || isProcessing)
            return;
        setIsProcessing(true);
        setTimeout(() => {
            router.replace({
                pathname: '/payment-success',
                params: {
                    planId: plan.id,
                    transactionId,
                    method: selectedMethod,
                },
            });
        }, 1800);
    };
    return (<SafeAreaView className="flex-1 bg-transparent">
      <View className="flex-1 px-5 pt-2.5">
        <View className="mb-[14px] flex-row items-start gap-3">
          <Pressable className="rounded-[14px] border border-line bg-card px-[14px] py-[11px]" onPress={() => router.back()}>
            <Text className="text-[13px] font-extrabold text-ink">Back</Text>
          </Pressable>
          <View className="flex-1 gap-1 pt-0.5">
            <Text className="text-[28px] font-black text-ink">{isProcessing ? 'Processing' : 'Payment'}</Text>
            <Text className="text-[13px] leading-5 text-muted">
              {isProcessing ? 'We are confirming your payment.' : 'Choose a payment method to unlock premium access.'}
            </Text>
          </View>
        </View>

        {isProcessing ? (<View className="flex-1 items-center justify-center gap-3 px-8">
            <View className="h-[88px] w-[88px] items-center justify-center rounded-[28px] border border-line bg-card">
              <ActivityIndicator size="large" color={palette.primary}/>
            </View>
            <Text className="text-[24px] font-black text-ink">Processing payment</Text>
            <Text className="text-center text-[14px] leading-[22px] text-muted">
              Please wait while we verify your {selectedMethod === 'upi' ? 'UPI' : selectedMethod === 'card' ? 'card' : 'bank'} payment.
            </Text>
          </View>) : (<>
            <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-7" showsVerticalScrollIndicator={false}>
              <View className="gap-[14px] rounded-[24px] border border-line bg-card p-[18px]">
                <Text className="text-[16px] font-black text-ink">Order Summary</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] text-muted">{plan.name}</Text>
                  <Text className="text-[14px] font-bold text-ink">{plan.price}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] text-muted">GST</Text>
                  <Text className="text-[14px] font-bold text-ink">Included</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] text-muted">Validity</Text>
                  <Text className="text-[14px] font-bold text-ink">1 Year</Text>
                </View>
                <View className="mt-0.5 flex-row items-center justify-between border-t border-line pt-3">
                  <Text className="text-[15px] font-black text-ink">Total Payable</Text>
                  <Text className="text-[22px] font-black text-brand">{plan.price}</Text>
                </View>
              </View>

              <View className="gap-[14px] rounded-[24px] border border-line bg-card p-[18px]">
                <Text className="text-[16px] font-black text-ink">Choose Payment Method</Text>
                <View className="gap-2.5">
                  {paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id;
                return (<Pressable key={method.id} className="flex-row items-center gap-3 rounded-[18px] border p-[14px]" onPress={() => setSelectedMethod(method.id)} style={{
                        borderColor: isSelected ? palette.primary : palette.border,
                        backgroundColor: isSelected ? `${palette.primary}08` : palette.surface,
                    }}>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[14px] font-extrabold" style={{ color: isSelected ? palette.primary : palette.text }}>{method.label}</Text>
                          <Text className="text-[12px] text-muted">{method.description}</Text>
                        </View>
                        <View className="h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: isSelected ? palette.primary : palette.border }}>
                          {isSelected ? <View className="h-2 w-2 rounded-full bg-brand"/> : null}
                        </View>
                      </Pressable>);
            })}
                </View>

                {selectedMethod === 'upi' ? (<View className="mt-1 gap-2.5">
                    <Text className="text-[12px] font-extrabold text-muted">Choose UPI App</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {quickUpiApps.map((app) => (<View key={app} className="rounded-[14px] px-3 py-2" style={{ backgroundColor: `${palette.blue}12` }}>
                          <Text className="text-[12px] font-extrabold" style={{ color: palette.blue }}>{app}</Text>
                        </View>))}
                    </View>
                    <Text className="text-[12px] font-extrabold text-muted">Add UPI ID</Text>
                    <TextInput value={upiId} onChangeText={setUpiId} autoCapitalize="none" placeholder="yourname@upi" placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-surface px-[14px] py-[14px] text-[14px] text-ink"/>
                  </View>) : null}

                {selectedMethod === 'card' ? (<View className="mt-1 gap-2.5">
                    <Text className="text-[12px] font-extrabold text-muted">Cardholder Name</Text>
                    <TextInput value={cardName} onChangeText={(value) => setCardName(normalizeCardName(value))} autoCapitalize="words" placeholder="Name on card" placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-surface px-[14px] py-[14px] text-[14px] text-ink"/>
                    <Text className="text-[12px] font-extrabold text-muted">Card Number</Text>
                    <TextInput value={cardNumber} onChangeText={(value) => setCardNumber(formatCardNumber(value))} keyboardType="number-pad" placeholder="1234567890123456" placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-surface px-[14px] py-[14px] text-[14px] text-ink"/>
                    <View className="flex-row gap-2.5">
                      <View className="flex-1 gap-2.5">
                        <Text className="text-[12px] font-extrabold text-muted">Expiry</Text>
                        <TextInput value={cardExpiry} onChangeText={(value) => setCardExpiry(formatExpiry(value))} keyboardType="number-pad" placeholder="MM/YY" placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-surface px-[14px] py-[14px] text-[14px] text-ink"/>
                      </View>
                      <View className="flex-1 gap-2.5">
                        <Text className="text-[12px] font-extrabold text-muted">CVV</Text>
                        <TextInput value={cardCvv} onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="123" placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-surface px-[14px] py-[14px] text-[14px] text-ink"/>
                      </View>
                    </View>
                  </View>) : null}

                {selectedMethod === 'netbanking' ? (<View className="mt-1 gap-2.5">
                    <Text className="text-[12px] font-extrabold text-muted">Select Bank</Text>
                    <View className="flex-row flex-wrap gap-2.5">
                      {popularBanks.map((bank) => {
                    const isSelected = selectedBank === bank;
                    return (<Pressable key={bank} className="min-w-[47%] items-center rounded-[16px] border px-3 py-[14px]" onPress={() => setSelectedBank(bank)} style={{
                            borderColor: isSelected ? palette.primary : palette.border,
                            backgroundColor: isSelected ? `${palette.primary}08` : palette.surface,
                        }}>
                            <Text className="text-[13px] font-extrabold" style={{ color: isSelected ? palette.primary : palette.text }}>{bank}</Text>
                          </Pressable>);
                })}
                    </View>
                  </View>) : null}
              </View>

              <View className="gap-1 rounded-[20px] px-4 py-[14px]" style={{ backgroundColor: `${palette.green}12` }}>
                <Text className="text-[14px] font-extrabold text-success">Secure Payment</Text>
                <Text className="text-[12px] leading-[18px] text-success">Your checkout is protected with encrypted verification.</Text>
              </View>
            </ScrollView>

            <View className="pb-4 pt-2.5">
              <AnimatedPressable className={`items-center rounded-[18px] py-4 ${canPay ? 'bg-brand' : ''}`} disabled={!canPay} onPress={handlePay} style={canPay ? undefined : { backgroundColor: '#d8aab3' }}>
                <Text className="text-[15px] font-extrabold text-white">Pay {plan.price}</Text>
              </AnimatedPressable>
            </View>
          </>)}
      </View>
    </SafeAreaView>);
}
