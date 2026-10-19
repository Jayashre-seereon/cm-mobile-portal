import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View,useWindowDimensions } from 'react-native';
import { useAppState } from '../../src/app-state';
import { createOrder, getPlans, verifyPayment } from '../../src/api/planApi';
import { getAssessmentAccessStatus } from '../../src/api/psychometricAssessmentApi';
import { palette, subscriptions as fallbackSubscriptions } from '../../src/careermap-data';
import { AnimatedPressable, Pill, Screen, SectionHeader } from '../../src/careermap-ui';
import { openRazorpayCheckout } from '../../src/utils/razorpay';
import RenderHTML from 'react-native-render-html';
export default function SubscriptionScreen() {
    const { activeSubscriptionPlanIds, preferences, userProfile } = useAppState();
    const { width: screenWidth } = useWindowDimensions();
    const { returnTo } = useLocalSearchParams();
    const [plans, setPlans] = useState(fallbackSubscriptions);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingPlan, setIsProcessingPlan] = useState('');
    const [isAssessmentLockedOrCompleted, setIsAssessmentLockedOrCompleted] = useState(false);

    const hasAssessmentModule = (plan) => {
        const modules = Array.isArray(plan?.modules) ? plan.modules : Array.isArray(plan?.raw?.modules) ? plan.raw.modules : [];
        const text = [plan?.name, plan?.description, ...modules.map((module) => typeof module === 'string' ? module : module?.title)]
            .filter(Boolean).join(' ').toLowerCase();
        return /assessment|psychometric|\btest\b/.test(text);
    };

    const isCurrentPlan = (plan) => {
        const planIds = (activeSubscriptionPlanIds || []).map((id) => String(id).trim().toLowerCase());
        const candidateIds = [plan?.apiId, plan?.raw?.id, plan?.raw?.planId, plan?.id]
            .filter((id) => id !== null && id !== undefined && id !== '')
            .map((id) => String(id).trim().toLowerCase());
        const candidateNames = [plan?.name, plan?.raw?.name]
            .filter(Boolean).map((name) => String(name).trim().toLowerCase());
        return candidateIds.some((id) => planIds.includes(id)) || candidateNames.some((name) => planIds.includes(name));
    };

    const comparePlans = [
        {
            label: 'Basic',
            price: '₹1,500',
            note: '',
            features: [true, false, false, false, false, false, false, false, false],
        },
        {
            label: 'Standard',
            price: '₹3,000',
            note: '',
            features: [true, true, true, true, false, false, false, false, false],
        },
        {
            label: 'Most Popular',
            price: '₹5,000',
            note: '',
            features: [true, true, true, true, true, true, true, false, false],
        },
        {
            label: 'Premium',
            price: '₹7,500',
            note: '(₹5,000 + ₹2,500)',
            features: [true, true, true, true, true, true, true, true, true],
        },
    ];

    const compareFeatures = [
        { label: 'Initial Career Guidance', notes: [null, null, null, null] },
        { label: 'Detailed Psychometric Assessment', notes: [null, null, null, null] },
        { label: 'Personalized Career Recommendations', notes: [null, null, null, null] },
        { label: 'Comprehensive Career Counselling', notes: [null, null, '(Unlimited for 1 Year)', '(Unlimited for 1 Year)'] },
        { label: 'Personalized Career Roadmap', notes: [null, null, null, null] },
        { label: 'End-to-End Career Planning', notes: [null, null, null, null] },
        { label: 'Annual Career Mentorship & Follow-up Support', notes: [null, null, null, null] },
        { label: 'Study Abroad Guidance & Counselling', notes: [null, null, null, null] },
        { label: 'Abroad Consultancy Support', notes: [null, null, null, null] },
    ];

    const compareBestFor = [
        'Students looking for initial career guidance',
        'Students seeking a detailed assessment and personalized counselling',
        'Students requiring complete career planning with year-long mentorship',
        'Students planning both their career and higher education abroad',
    ];
    useEffect(() => {
        let isMounted = true;
        void getAssessmentAccessStatus().then((status) => {
            if (isMounted) {
                setIsAssessmentLockedOrCompleted(status?.allowed === false || Boolean(status?.requiresNewPlan));
            }
        }).catch(() => {
            if (isMounted) setIsAssessmentLockedOrCompleted(false);
        });
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
            finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        loadPlans();
        return () => {
            isMounted = false;
        };
    }, []);
    const handleSelectPlan = async (plan) => {
        if (!plan?.id || isProcessingPlan) {
            return;
        }

        try {
            setIsProcessingPlan(plan.id);
            const backendPlanId = plan.apiId || plan.raw?.id || plan.id;
            const orderResponse = await createOrder(plan);
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
                description: `${plan.name} subscription`,
                prefill: {
                    name: userProfile?.name || '',
                    email: userProfile?.email || '',
                    contact: userProfile?.mobile || '',
                },
                theme: {
                    color: palette.primary,
                },
            });

            await verifyPayment({
                planId: backendPlanId,
                planKey: plan.id,
                razorpay_order_id: paymentResponse?.razorpay_order_id || order.id,
                razorpay_payment_id: paymentResponse?.razorpay_payment_id,
                razorpay_signature: paymentResponse?.razorpay_signature,
            });

            router.replace({
                pathname: '/payment-success',
                params: {
                    planId: plan.id,
                    transactionId: paymentResponse?.razorpay_payment_id || order.id,
                    ...(returnTo ? { returnTo } : {}),
                },
            });
        }
        catch (error) {
            const message = error?.message || error?.response?.data?.message || 'Payment failed. Please try again.';
            if (!/cancelled/i.test(message)) {
                Alert.alert('Payment issue', message);
            }
        }
        finally {
            setIsProcessingPlan('');
        }
    };
    return (<Screen>
      <SectionHeader title="Subscription Plans" subtitle="Key plans from the Vercel prototype, adapted here as mobile cards."/>

      <View className={`mb-4 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
        <Text className={`text-[14px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Unsure About Your Next Step?</Text>
        <Text className={`mt-1 text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Take the test, then speak to our counsellor for guided support.</Text>
        <AnimatedPressable
          className="mt-3 rounded-[16px] bg-brand px-4 py-3"
          onPress={() => router.push({ pathname: '/(drawer)/settings', params: { view: 'help' } })}
        >
          <Text className="text-center text-[14px] font-extrabold text-white">Speak to our Counsellor</Text>
        </AnimatedPressable>
      </View>

      {isLoading ? (<View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={palette.primary}/>
          <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading plans...</Text>
        </View>) : (<View className="gap-[14px] ">
        {plans.map((plan) => {
          const currentPlan = isCurrentPlan(plan);
          const allowRetake = currentPlan && hasAssessmentModule(plan);
          const buttonDisabled = Boolean(isProcessingPlan);
          const buttonLabel = currentPlan
            ? (allowRetake ? 'Buy Retake / Subscribe Again' : 'Renew / Subscribe Again')
            : 'Choose Plan';
          const statusLabel = !currentPlan ? '' : allowRetake && isAssessmentLockedOrCompleted ? 'Assessment Completed' : 'Active Plan';
          const statusTone = statusLabel === 'Assessment Completed' ? '#ea872e' : palette.green;
          return (<View key={plan.id} className={`gap-3 rounded-[24px] border p-[18px] ${plan.recommended || plan.highestseller
  ? preferences.darkMode
      ? 'border-[#3a2028] bg-[#080808]'
      : 'border-[#dcb3a3] bg-card shadow-card'
  : preferences.darkMode
      ? 'border-[#1a1a1a] bg-[#080808]'
      : 'border-line bg-card'}`}>
            <View className="flex-row items-start justify-between gap-3 ">
             <View className="flex-1 gap-1.5">
              
                <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{plan.name}</Text>
                  <View className="gap-1">
              <Text className="text-[28px] font-black text-brand">{plan.price}</Text>
              {plan.validity ? <Text className={`text-[12px] font-bold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{plan.validity}/month</Text> : null}
            </View>
                {plan.descriptionHtml ? (
                    <RenderHTML
                        contentWidth={screenWidth - 76}
                        source={{ html: plan.descriptionHtml }}
                        baseStyle={{
                            color: preferences.darkMode ? '#b7aeb9' : palette.muted,
                            fontSize: 13,
                            lineHeight: 20,
                        }}
                        tagsStyles={{
                            h1: { fontSize: 16, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
                            h2: { fontSize: 15, fontWeight: '900', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 4 },
                            h3: { fontSize: 14, fontWeight: '800', color: preferences.darkMode ? '#ffffff' : palette.text, marginVertical: 3 },
                            p: { marginVertical: 2 },
                            li: { marginVertical: 1 },
                            strong: { fontWeight: '800' },
                            a: { color: palette.primary },
                        }}
                    />
                ) : (
                    <Text className={`text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{plan.description}</Text>
                )}
              </View>
              
              <View className="flex-row gap-2 ">
                {plan.recommended ? <Pill label="Recommended" tone={palette.primary} /> : null}
                {plan.highestseller ? <Pill label="Highest Seller" tone="#f59e0b" /> : null}
                {statusLabel ? <Pill label={statusLabel} tone={statusTone} /> : null}
              </View>
            </View>
          
            <View className="gap-2.5 ">
              {plan.features.map((feature) => (<View key={feature} className="flex-row items-center gap-2.5">
                  <Ionicons name="checkmark-circle" size={18} color={palette.green}/>
                  <Text className={`text-[14px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{feature}</Text>
                </View>))}
            </View>
            <AnimatedPressable
              className="mt-1 rounded-[14px] py-3"
              onPress={() => void handleSelectPlan(plan)}
              disabled={buttonDisabled}
              style={{ backgroundColor: palette.primary }}
            >
              <Text className="text-center text-[14px] font-extrabold" style={{ color: '#fff' }}>
                {isProcessingPlan === plan.id ? 'Processing...' : buttonLabel}
              </Text>
            </AnimatedPressable>
          </View>);
        })}

        <View className={`mt-2 gap-4 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <View className="gap-1">
            <Text className={`text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Compare features</Text>
            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Find the best option by comparing key features.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="pr-2">
            <View style={{ minWidth: 820 }} className={`overflow-hidden rounded-[20px] border ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-[#e8dfda]'}`}>
              <View className={`flex-row flex-nowrap border-b ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-[#f0e8e2] bg-[#faf7f5]'}`}>
                <View className="w-[255px] shrink-0 px-5 py-4">
                  <Text className={`text-[16px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Features</Text>
                </View>
                {comparePlans.map((plan) => (
                  <View
                    key={plan.label}
                    className={`w-[141px] shrink-0 border-l px-3 py-4 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-[#f0e8e2]'}`}
                    style={plan.featured ? { backgroundColor: preferences.darkMode ? '#141015' : '#fff7f3' } : null}
                  >
                    <View className="items-center gap-0.5">
                      {plan.featured ? (
                        <Text className="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-black text-white">Most Popular</Text>
                      ) : null}
                      <Text className={`w-full text-center text-[10px] font-black uppercase tracking-[1px] leading-3 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{plan.label}</Text>
                      <Text className="text-[14px] font-black text-brand">{plan.price}</Text>
                      {plan.note ? <Text className={`text-center text-[9px] italic leading-3 ${preferences.darkMode ? 'text-[#8f8f8f]' : 'text-muted'}`}>{plan.note}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>

            {compareFeatures.map((feature, featureIndex) => (
                <View key={feature.label} className={`flex-row flex-nowrap ${preferences.darkMode ? 'border-b border-[#1a1a1a]' : 'border-b border-[#f0e8e2]'}`}>
                  <View className="w-[255px] shrink-0 justify-center px-5 py-4">
                    <Text className={`text-[11px] leading-4 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{feature.label}</Text>
                  </View>
                  {comparePlans.map((plan, planIndex) => {
                    const available = plan.features[featureIndex];
                    const note = feature.notes?.[planIndex];
                    return (
                      <View
                        key={`${plan.label}-${feature.label}`}
                        className={`w-[141px] shrink-0 items-center justify-center border-l px-3 py-4 ${preferences.darkMode ? 'border-[#1a1a1a]' : 'border-[#f0e8e2]'}`}
                        style={plan.featured ? { backgroundColor: preferences.darkMode ? 'rgba(255,255,255,0.02)' : '#fffdfb' } : null}
                      >
                        {available ? (
                          <View className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: palette.primary }}>
                            <Ionicons name="checkmark" size={12} color="#ffffff"/>
                          </View>
                        ) : (
                          <Ionicons name="close" size={15} color={preferences.darkMode ? '#6d6d6d' : '#c7b8b1'}/>
                        )}
                        {note ? (
                          <Text
                            className={`mt-1 text-center text-[9px] italic leading-3 ${preferences.darkMode ? 'text-[#8f8f8f]' : 'text-muted'}`}
                          >
                            {note}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
            ))}

              <View className="flex-row flex-nowrap">
                <View className={`w-[255px] shrink-0 justify-center px-5 py-4 ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#faf7f5]'}`}>
                  <Text className={`text-[12px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Best For</Text>
                </View>
                {compareBestFor.map((text, i) => (
                  <View
                    key={i}
                    className={`w-[141px] shrink-0 justify-center border-l px-3 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-[#f0e8e2] bg-[#faf7f5]'}`}
                  >
                    <Text className={`text-center text-[10px] leading-4 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>)}
    </Screen>);
}
