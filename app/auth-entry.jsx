import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { BeeMascot } from '../src/bee-mascot';
import { AnimatedPressable } from '../src/careermap-ui';
export default function AuthEntryScreen() {
    const { preferences } = useAppState();
    const screenOpacity = useRef(new Animated.Value(0)).current;
    const screenTranslate = useRef(new Animated.Value(24)).current;
    const heroOpacity = useRef(new Animated.Value(0)).current;
    const heroTranslate = useRef(new Animated.Value(18)).current;
    const cardsOpacity = useRef(new Animated.Value(0)).current;
    const cardsTranslate = useRef(new Animated.Value(24)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(screenOpacity, {
                toValue: 1,
                duration: 340,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(screenTranslate, {
                toValue: 0,
                duration: 340,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
        Animated.sequence([
            Animated.delay(120),
            Animated.parallel([
                Animated.timing(heroOpacity, {
                    toValue: 1,
                    duration: 280,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(heroTranslate, {
                    toValue: 0,
                    duration: 280,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(cardsOpacity, {
                    toValue: 1,
                    duration: 320,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(cardsTranslate, {
                    toValue: 0,
                    duration: 320,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, [cardsOpacity, cardsTranslate, heroOpacity, heroTranslate, screenOpacity, screenTranslate]);
    return (<SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}> 
       <AnimatedBackground /> 
    <Animated.View style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: 24, paddingVertical: 24, opacity: screenOpacity, transform: [{ translateY: screenTranslate }] }}>
    
        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-[360px] items-center gap-5 self-center">
          <Animated.View className="items-center gap-5 self-center" style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }}>
          <View className="h-[96px] w-[96px] items-center justify-center self-center ">
            <BeeMascot size={100} draggable={false}/>
          </View>
          <View className="items-center gap-2">
            <Text className={`text-center text-[30px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Welcome to Career Map</Text>
            <Text className={`max-w-[300px] text-center text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              Choose how you want to continue.
            </Text>
          </View>
          </Animated.View>
          <Animated.View className="w-full gap-4 self-center" style={{ opacity: cardsOpacity, transform: [{ translateY: cardsTranslate }] }}>
          <View className="w-full gap-4 self-center">
            <AnimatedPressable className={`rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => router.push('/onboarding')}>
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-brand">
                  <Ionicons name="person-add-outline" size={26} color="#fff"/>
                </View>
                <View className="flex-1">
                  <Text className={`text-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>New User</Text>
                  <Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Start onboarding and create your profile.</Text>
                </View>
              </View>
            </AnimatedPressable>
            <AnimatedPressable className={`rounded-[24px] border p-5 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={() => router.push({ pathname: '/login', params: { userType: 'existing' } })}>
              <View className="flex-row items-center gap-4">
                <View className={`h-14 w-14 items-center justify-center rounded-[18px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`}>
                  <Ionicons name="log-in-outline" size={26} color="#c11e38"/>
                </View>
                <View className="flex-1">
                  <Text className={`text-[18px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Existing User</Text>
                  <Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Login with mobile OTP or email and password.</Text>
                </View>
              </View>
            </AnimatedPressable>
          </View>
          </Animated.View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>);
}
