import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
import { decodeReturnTarget } from '../src/subscription-flow';

const HOME_ROUTE = '/(drawer)/(tabs)/';

export default function PaymentSuccessScreen() {
  const { apiPlanId, transactionId, returnTo } = useLocalSearchParams();
  const { refreshSubscriptionData, preferences } = useAppState();
  const celebration = useRef(new Animated.Value(0)).current;
  // 'verifying' -> 'confirmed' | 'not-found' | 'error'. Success is shown only for a subscription the
  // backend reports as active for this plan, never just because the route was opened (deep links).
  const [status, setStatus] = useState('verifying');
  const [record, setRecord] = useState(null);
  const [attempt, setAttempt] = useState(0);

  // decodeReturnTarget only accepts in-app '/(drawer)/...' screens.
  const returnTarget = useMemo(() => decodeReturnTarget(returnTo), [returnTo]);
  const wantedPlanId = typeof apiPlanId === 'string' ? apiPlanId.trim() : '';
  const paymentRef = typeof transactionId === 'string' ? transactionId : '';
  const themed = {
    pageOverlay: preferences.darkMode ? 'rgba(5, 5, 5, 0.86)' : 'rgba(251, 247, 243, 0.82)',
    card: preferences.darkMode ? 'rgba(8, 8, 8, 0.94)' : 'rgba(255, 255, 255, 0.9)',
    border: preferences.darkMode ? '#1a1a1a' : palette.border,
    text: preferences.darkMode ? '#fff' : palette.text,
    muted: preferences.darkMode ? '#aaa' : palette.muted,
    successSurface: preferences.darkMode ? 'rgba(47, 147, 103, 0.16)' : `${palette.green}16`,
    heroSurface: preferences.darkMode ? 'rgba(8, 8, 8, 0.94)' : 'rgba(246, 239, 235, 0.9)',
  };

  // Runs once per attempt (refreshSubscriptionData has a stable identity), so no refetch loop.
  useEffect(() => {
    let active = true;
    setStatus('verifying');
    (async () => {
      try {
        const items = wantedPlanId ? await refreshSubscriptionData() : [];
        if (!active) return;
        const match = (items || []).find((item) => String(item?.backendPlanId || '') === wantedPlanId
          && String(item?.status || '').toLowerCase() === 'active') || null;
        setRecord(match);
        setStatus(match ? 'confirmed' : 'not-found');
      }
      catch {
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, refreshSubscriptionData, wantedPlanId]);

  // animation
  useEffect(() => {
    if (status !== 'confirmed') return;
    Animated.spring(celebration, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [celebration, status]);

  // auto redirect, only after the subscription is confirmed active
  useEffect(() => {
    if (status !== 'confirmed') return undefined;
    const timer = setTimeout(() => {
      router.replace(returnTarget || HOME_ROUTE);
    }, 3000);

    return () => clearTimeout(timer);
  }, [returnTarget, status]);

  const handleContinue = () => {
    router.replace(returnTarget || HOME_ROUTE);
  };

  if (status !== 'confirmed') {
    const title = status === 'verifying'
      ? 'Verifying your payment...'
      : status === 'error'
        ? 'Could not check your subscription'
        : 'We could not confirm a payment';
    const body = status === 'verifying'
      ? 'Please wait while we confirm your subscription.'
      : status === 'error'
        ? 'We could not reach the server to confirm your subscription. Please check your connection and try again.'
        : `No active subscription was found for this payment. If you were charged, please check Profile > Subscription in a few minutes or contact support@careermap.in${paymentRef ? ` with payment id ${paymentRef}` : ''}.`;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <AnimatedBackground />
        <View className="flex-1 justify-center gap-4 px-4 py-4">
          <View className="items-center gap-3 rounded-[22px] border p-6" style={{ backgroundColor: themed.card, borderColor: themed.border }}>
            {status === 'verifying' ? <ActivityIndicator size="large" color={palette.primary} /> : <Ionicons name="alert-circle-outline" size={36} color={palette.primary} />}
            <Text className="text-center text-[20px] font-extrabold" style={{ color: themed.text }}>{title}</Text>
            <Text className="text-center text-[13px] leading-5" style={{ color: themed.muted }}>{body}</Text>
            {status !== 'verifying' ? (
              <View className="w-full gap-2">
                <AnimatedPressable className="rounded-[12px] bg-brand py-3" onPress={() => setAttempt((value) => value + 1)}>
                  <Text className="text-center text-[14px] font-bold text-white">Check again</Text>
                </AnimatedPressable>
                <AnimatedPressable className="py-2" onPress={() => router.replace(HOME_ROUTE)}>
                  <Text className="text-center text-[13px] font-bold text-brand">Go to home</Text>
                </AnimatedPressable>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const planName = record?.subscriptionName || record?.planName || 'Subscription Plan';
  const accessUntil = record?.expiryDate && record.expiryDate !== 'Expiry date not available' ? record.expiryDate : '';
  const detailRows = [
    ['Plan', planName],
    ['Amount', record?.price && record.price !== 'Subscription active' ? record.price : ''],
    ['Transaction ID', paymentRef],
    ['Validity', [record?.validity, accessUntil ? `until ${accessUntil}` : ''].filter(Boolean).join(' ')],
  ].filter(([, value]) => value);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <AnimatedBackground />
      <View className="flex-1">
      <View className="flex-1 justify-center gap-4 px-4 py-4">
        <View
          className="items-center justify-center rounded-[28px] px-6 py-8"
         
        >
          <Animated.View
            style={{
              transform: [
                {
                  scale: celebration.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
              opacity: celebration,
            }}
          >
            <View
              className="items-center justify-center"
              style={{
                height: 92,
                width: 92,
                borderRadius: 46,
                backgroundColor: themed.successSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={42} color={palette.green} />
            </View>
          </Animated.View>

          <Text
            className="mt-[18px] text-center text-[26px] font-extrabold"
            style={{
              color: themed.text,
            }}
          >
            Payment Successful!
          </Text>

          <Text
            className="mt-2 text-center text-[14px] leading-[21px]"
            style={{
              color: themed.muted,
            }}
          >
            Your subscription is now active and ready to use.
          </Text>

          <Text
            className="mt-[10px] text-center text-[16px] font-bold"
            style={{
              color: palette.primary,
            }}
          >
            {planName}
          </Text>
        </View>

        <View
          className="rounded-[14px] border p-4"
          style={{
            backgroundColor: themed.card,
            borderColor: themed.border,
          }}
        >
          {detailRows.map(([label, value], i) => (
            <View
              key={label}
              className="flex-row justify-between py-[6px]"
              style={{
                borderBottomWidth: i !== detailRows.length - 1 ? 1 : 0,
                borderColor: themed.border,
              }}
            >
              <Text className="text-[12px]" style={{ color: themed.muted }}>
                {label}
              </Text>
              <Text
                className="max-w-[60%] text-right text-[12px] font-bold"
                style={{
                  color:
                    label === 'Validity'
                      ? palette.green
                      : themed.text,
                }}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>

        <AnimatedPressable onPress={handleContinue}>
          <LinearGradient
            colors={[palette.primary, '#a30f2d']}
            className="mt-2 rounded-[12px] py-[14px]"
            style={{
              borderRadius: 12,
            }}
          >
            <Text className="text-center text-[15px] font-bold text-white">
              Continue
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
      </View>
    </SafeAreaView>
  );
}
