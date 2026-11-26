import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, View,useWindowDimensions } from 'react-native';
import { useAppState } from '../../src/app-state';
import { createOrder, getPlans } from '../../src/api/planApi';
import { getAssessmentAccessStatus } from '../../src/api/psychometricAssessmentApi';
import { palette, subscriptions as fallbackSubscriptions } from '../../src/careermap-data';
import { AnimatedPressable, Pill, Screen, SectionHeader } from '../../src/careermap-ui';
import { openRazorpayCheckout } from '../../src/utils/razorpay';
import { flushPendingPayments, getPendingPayments, savePendingPayment, verifyPendingPayment } from '../../src/subscription-flow-pending';
import { useAuthStore } from '../../src/store/auth-store';
import RenderHTML from 'react-native-render-html';

const SUPPORT_EMAIL = 'support@careermap.in';

// react-native-razorpay rejects with { code, description } (description is often a JSON string);
// the web shim rejects with Error('Payment was cancelled.'). Android code 0 / iOS code 2 = user cancelled.
function getCheckoutErrorInfo(error) {
    let details = null;
    if (typeof error?.description === 'string') {
        try {
            details = JSON.parse(error.description)?.error || null;
        }
        catch {
            details = null;
        }
    }
    else if (error?.error && typeof error.error === 'object') {
        details = error.error;
    }
    const rawDescription = details?.description || (typeof error?.description === 'string' ? error.description : '') || error?.message || '';
    const nativeCancelCode = typeof error?.code === 'number'
        && ((Platform.OS === 'android' && error.code === 0) || (Platform.OS === 'ios' && error.code === 2));
    const cancelled = nativeCancelCode
        || error?.code === 'PAYMENT_CANCELLED'
        || details?.reason === 'payment_cancelled'
        || /cancel/i.test(rawDescription);
    return {
        cancelled,
        message: rawDescription && !/^\s*\{/.test(rawDescription)
            ? rawDescription
            : 'Payment failed. Please try again or use a different payment method.',
    };
}

// Server explanation first ('Plan not found', ...); axios' generic 'Request failed with status code 400' last.
function getApiErrorText(error, fallback) {
    return error?.response?.data?.message || error?.message || fallback;
}

function findComparePlanMatch(plans, label) {
    const wanted = String(label || '').trim().toLowerCase();
    if (!wanted) return null;
    return plans.find((plan) => String(plan?.name || '').trim().toLowerCase() === wanted)
        || plans.find((plan) => String(plan?.name || '').toLowerCase().includes(wanted))
        || null;
}

export default function SubscriptionScreen() {
    const { activeSubscriptionPlanIds, preferences, userProfile, subscriptionRecords } = useAppState();
    const { width: screenWidth } = useWindowDimensions();
    const { returnTo } = useLocalSearchParams();
    const [plans, setPlans] = useState(fallbackSubscriptions);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isProcessingPlan, setIsProcessingPlan] = useState('');
    const [processingStage, setProcessingStage] = useState('');
    const processingRef = useRef(false);
    const [isAssessmentLockedOrCompleted, setIsAssessmentLockedOrCompleted] = useState(false);

    const getCurrentUserId = () => {
        const user = useAuthStore.getState().user;
        return String(user?.id ?? user?._id ?? '');
    };

    const getPlanBackendIds = (plan) => [plan?.apiId, plan?.raw?.id, plan?.raw?.planId]
        .filter((id) => id !== null && id !== undefined && id !== '')
        .map((id) => String(id).trim());

    // Expiry of the user's active subscription for this plan (from /my-subscriptions).
    const getCurrentPlanExpiry = (plan) => {
        const ids = getPlanBackendIds(plan);
        const record = (subscriptionRecords || []).find((item) => String(item?.status || '').toLowerCase() === 'active'
            && ids.includes(String(item?.backendPlanId || '')));
        return record?.expiryDate && record.expiryDate !== 'Expiry date not available' ? record.expiryDate : '';
    };

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

    // Prices shown in the comparison come from the fetched plans (matched by name), so they always
    // agree with the plan cards and the Razorpay order; an unmatched column shows no price.
    const comparePlans = [
        {
            label: 'Basic',
            features: [true, false, false, false, false, false, false, false, false, false],
        },
        {
            label: 'Standard',
            features: [true, true, true, true, false, false, false, false, false, false],
        },
        {
            label: 'Most Popular',
            features: [true, true, true, true, true, true, true, true, false, false],
        },
        {
            label: 'Premium',
            features: [true, true, true, true, true, true, true, true, true, true],
        },
    ].map((column) => {
        const match = findComparePlanMatch(plans, column.label);
        return { ...column, price: match?.price || '', note: '' };
    });

    const compareFeatures = [
        { label: 'Initial Career Guidance', notes: [null, null, null, null] },
        { label: 'Detailed Psychometric Assessment', notes: [null, null, null, null] },
        { label: 'Personalized Career Recommendations', notes: [null, null, null, null] },
        { label: 'Comprehensive Career Counselling', notes: [null, null, '(Unlimited for 1 Year)', '(Unlimited for 1 Year)'] },
        { label: 'Infocentre', notes: [null, null, null, null] },
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
    const loadPlans = useCallback(async (isActive = () => true) => {
        setIsLoading(true);
        setLoadError('');
        try {
            const response = await getPlans();
            if (!isActive()) return;
            if (response.length > 0) {
                setPlans(response);
            }
            else {
                setPlans([]);
                setLoadError('No subscription plans are available right now. Please try again in a little while.');
            }
        }
        catch (error) {
            console.log('Plans fetch failed', error?.response?.data || error?.message || error);
            if (isActive()) {
                setLoadError(getApiErrorText(error, 'We could not load the subscription plans.') + ' Please check your connection and try again.');
            }
        }
        finally {
            if (isActive()) {
                setIsLoading(false);
            }
        }
    }, []);
    useEffect(() => {
        let isMounted = true;
        void getAssessmentAccessStatus().then((status) => {
            if (isMounted) {
                setIsAssessmentLockedOrCompleted(status?.allowed === false || Boolean(status?.requiresNewPlan));
            }
        }).catch(() => {
            if (isMounted) setIsAssessmentLockedOrCompleted(false);
        });
        void loadPlans(() => isMounted);
        return () => {
            isMounted = false;
        };
    }, [loadPlans]);
    const goToPaymentSuccess = (plan, backendPlanId, orderId, paymentId) => {
        router.replace({
            pathname: '/payment-success',
            params: {
                planId: plan.id,
                apiPlanId: String(backendPlanId),
                orderId,
                transactionId: paymentId || orderId,
                ...(returnTo ? { returnTo } : {}),
            },
        });
    };

    const confirmRepurchase = (plan, expiry) => new Promise((resolve) => {
        Alert.alert(
            'You already have this plan',
            `${plan.name} is active${expiry ? ` until ${expiry}` : ''}. Buying it again is charged in full and starts a new period from today; the remaining days of the current period are not added to it. Continue only if you need another assessment attempt.`,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Buy again', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
        );
    });

    const handleSelectPlan = async (plan) => {
        // Ref guard: two taps delivered before React re-renders must not start two orders.
        if (!plan?.id || processingRef.current) {
            return;
        }
        processingRef.current = true;

        try {
            setIsProcessingPlan(plan.id);
            setProcessingStage('order');
            const userId = getCurrentUserId();

            // A previous payment that was charged but not yet activated: finish it instead of charging again.
            if (getPendingPayments(userId).length > 0) {
                setProcessingStage('verifying');
                const { stillPending } = await flushPendingPayments(userId);
                if (stillPending > 0) {
                    Alert.alert('Payment still being activated', `We received an earlier payment that is still being activated, so we have not started a new one. Please try again in a few minutes, or contact ${SUPPORT_EMAIL}.`);
                    return;
                }
                setProcessingStage('order');
            }

            if (isCurrentPlan(plan)) {
                const confirmed = await confirmRepurchase(plan, getCurrentPlanExpiry(plan));
                if (!confirmed) return;
            }

            const backendPlanId = plan.apiId || plan.raw?.id || plan.id;
            let orderResponse;
            try {
                orderResponse = await createOrder(plan);
            }
            catch (orderError) {
                Alert.alert('Payment issue', getApiErrorText(orderError, 'Failed to initiate payment. Please try again.'));
                return;
            }
            const order = orderResponse?.order;
            const key = orderResponse?.key;

            if (!order?.id || !key) {
                Alert.alert('Payment issue', orderResponse?.message || 'Failed to initiate payment. Please try again.');
                return;
            }

            let paymentResponse;
            try {
                paymentResponse = await openRazorpayCheckout({
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
            }
            catch (checkoutError) {
                // Closing the sheet is a cancel, not a failure; gateway failures show Razorpay's own reason.
                const { cancelled, message } = getCheckoutErrorInfo(checkoutError);
                if (!cancelled) {
                    Alert.alert('Payment issue', message);
                }
                return;
            }

            // Money is captured now: keep the proof on the device before calling the server.
            const pending = {
                userId,
                planId: backendPlanId,
                planKey: plan.id,
                razorpay_order_id: paymentResponse?.razorpay_order_id || order.id,
                razorpay_payment_id: paymentResponse?.razorpay_payment_id,
                razorpay_signature: paymentResponse?.razorpay_signature,
            };
            savePendingPayment(pending);
            setProcessingStage('verifying');

            const result = await verifyPendingPayment(pending);
            if (result.ok) {
                goToPaymentSuccess(plan, backendPlanId, pending.razorpay_order_id, pending.razorpay_payment_id);
                return;
            }

            const paymentRef = pending.razorpay_payment_id || pending.razorpay_order_id;
            if (result.permanent) {
                Alert.alert('Payment issue', `${getApiErrorText(result.error, 'Payment verification failed.')} If you were charged, please contact ${SUPPORT_EMAIL} with payment id ${paymentRef}.`);
            }
            else {
                Alert.alert('Payment received', `Your payment was received but your plan could not be activated yet (the server did not respond). We will keep trying automatically, so please reopen the app in a few minutes. If it is still not active, contact ${SUPPORT_EMAIL} with payment id ${paymentRef}. Do not pay again.`);
            }
        }
        catch (error) {
            Alert.alert('Payment issue', getApiErrorText(error, 'Payment failed. Please try again.'));
        }
        finally {
            processingRef.current = false;
            setIsProcessingPlan('');
            setProcessingStage('');
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
        </View>) : loadError ? (<View className={`items-center gap-3 rounded-[22px] border p-6 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
          <Ionicons name="cloud-offline-outline" size={28} color={palette.primary}/>
          <Text className={`text-center text-[14px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{loadError}</Text>
          <AnimatedPressable className="rounded-[14px] bg-brand px-6 py-3" onPress={() => void loadPlans()}>
            <Text className="text-center text-[14px] font-extrabold text-white">Retry</Text>
          </AnimatedPressable>
        </View>) : (<View className="gap-[14px] ">
        {plans.map((plan) => {
          const currentPlan = isCurrentPlan(plan);
          const allowRetake = currentPlan && hasAssessmentModule(plan);
          // Renewing an active non-assessment plan early would charge in full and start a new period from
          // today (remaining days lost), so it is offered again only once the current period has ended.
          const renewBlocked = currentPlan && !allowRetake;
          const currentExpiry = currentPlan ? getCurrentPlanExpiry(plan) : '';
          const buttonDisabled = Boolean(isProcessingPlan) || renewBlocked;
          const buttonLabel = currentPlan
            ? (allowRetake ? 'Buy Retake / Subscribe Again' : (currentExpiry ? `Current Plan - active until ${currentExpiry}` : 'Current Plan'))
            : 'Choose Plan';
          const statusLabel = currentPlan && allowRetake && isAssessmentLockedOrCompleted ? 'Assessment Completed' : '';
          const statusTone = '#ea872e';
          return (<View key={plan.id} className={`gap-3 rounded-[24px] border p-[18px] ${plan.recommended || plan.highestseller
  ? preferences.darkMode
      ? 'border-[#3a2028] bg-[#080808]'
      : 'border-[#dcb3a3] bg-card shadow-card'
  : preferences.darkMode
      ? 'border-[#1a1a1a] bg-[#080808]'
      : 'border-line bg-card'}`}>
            <View className="gap-2">
             <View className="flex-row items-start justify-between gap-3">
               <Text className={`min-w-0 flex-1 text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{plan.name}</Text>
             </View>
             <View className="flex-1 gap-1.5">
                  <View className="gap-1">
              <Text className="text-[28px] font-black text-brand">{plan.price}</Text>
              {plan.validity ? <Text className={`text-[12px] font-bold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Valid for {plan.validity}</Text> : null}
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
              
            </View>
              <View className="flex-row flex-wrap gap-2">
                {plan.recommended ? <Pill label="Recommended" tone={palette.primary} /> : null}
                {plan.highestseller ? <Pill label="Highest Seller" tone="#f59e0b" /> : null}
                {statusLabel ? <Pill label={statusLabel} tone={statusTone} /> : null}
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
              style={{ backgroundColor: palette.primary, opacity: renewBlocked ? 0.6 : 1 }}
            >
              <Text className="text-center text-[14px] font-extrabold" style={{ color: '#fff' }}>
                {isProcessingPlan === plan.id ? (processingStage === 'verifying' ? 'Payment received, activating...' : 'Processing...') : buttonLabel}
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
                      {plan.price ? <Text className="text-[14px] font-black text-brand">{plan.price}</Text> : null}
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
