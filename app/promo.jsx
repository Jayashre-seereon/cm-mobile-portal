import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../src/app-state';
import { AnimatedBackground } from '../src/animated-background';
import { AnimatedPressable } from '../src/careermap-ui';
import { StaggerFadeUpItem, ZoomInPage } from '../src/page-transition';
const beeImage = require('../assets/images/bee.png');
const features = [
    { title: 'Psychometric Tests ⭐', desc: 'Discover strengths and ideal fit ' },
    { title: 'Career Archive', desc: '500+ career options across streams' },
     { title: 'Expert Mentors', desc: 'Guidance from counsellors and experts' },
    { title: 'Scholarships & Exams', desc: 'Stay updated on opportunities' },
    { title: 'Study Abroad', desc: 'Explore international education paths' },
];

function RippleRing({ progress, endScale, borderWidth, baseOpacity }) {
    const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, endScale],
    });
    const opacity = progress.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [baseOpacity, 0, 0],
    });
    return (<Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 116,
            height: 116,
            borderRadius: 58,
            borderWidth,
            borderColor: 'rgba(255,255,255,0.28)',
            opacity,
            transform: [{ scale }],
        }}/>);
}

function PromoSplashIntro() {
    const auroraRotate = useRef(new Animated.Value(0)).current;
    const boxScale = useRef(new Animated.Value(0)).current;
    const boxRotate = useRef(new Animated.Value(-180)).current;
    const beeEntranceOpacity = useRef(new Animated.Value(0)).current;
    const beeEntranceTranslate = useRef(new Animated.Value(18)).current;
    const beeEntranceScale = useRef(new Animated.Value(0.72)).current;
    const beeFloat = useRef(new Animated.Value(0)).current;
    const beeRotate = useRef(new Animated.Value(0)).current;
    const beeScale = useRef(new Animated.Value(1)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslate = useRef(new Animated.Value(40)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleTranslate = useRef(new Animated.Value(40)).current;
    const descriptionOpacity = useRef(new Animated.Value(0)).current;
    const descriptionTranslate = useRef(new Animated.Value(28)).current;
    const progress = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const dotA = useRef(new Animated.Value(0)).current;
    const dotB = useRef(new Animated.Value(0)).current;
    const dotC = useRef(new Animated.Value(0)).current;
    const ringA = useRef(new Animated.Value(0)).current;
    const ringB = useRef(new Animated.Value(0)).current;
    const ringC = useRef(new Animated.Value(0)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;
    const exitScale = useRef(new Animated.Value(1)).current;
    const exitTranslate = useRef(new Animated.Value(0)).current;
    const auroraOpacity = useRef(new Animated.Value(0)).current;
    const auroraX = useRef(new Animated.Value(-160)).current;
    const auroraY = useRef(new Animated.Value(-100)).current;
    const orbAX = useRef(new Animated.Value(280)).current;
    const orbAY = useRef(new Animated.Value(-80)).current;
    const orbAOpacity = useRef(new Animated.Value(0)).current;
    const orbBX = useRef(new Animated.Value(-240)).current;
    const orbBY = useRef(new Animated.Value(80)).current;
    const orbBOpacity = useRef(new Animated.Value(0)).current;
    const blobAX = useRef(new Animated.Value(-280)).current;
    const blobAY = useRef(new Animated.Value(0)).current;
    const blobAOpacity = useRef(new Animated.Value(0)).current;
    const blobBX = useRef(new Animated.Value(280)).current;
    const blobBY = useRef(new Animated.Value(0)).current;
    const blobBOpacity = useRef(new Animated.Value(0)).current;
    const blobCX = useRef(new Animated.Value(0)).current;
    const blobCY = useRef(new Animated.Value(-220)).current;
    const blobCOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loops = [];
        const timers = [];
        const startLoop = (animation) => {
            loops.push(animation);
            animation.start();
        };
        const addTimer = (callback, delay) => {
            const timer = setTimeout(callback, delay);
            timers.push(timer);
        };

        Animated.parallel([
            Animated.timing(auroraOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.spring(auroraX, { toValue: 0, stiffness: 55, damping: 14, useNativeDriver: true }),
            Animated.spring(auroraY, { toValue: 0, stiffness: 55, damping: 14, useNativeDriver: true }),
            Animated.spring(boxScale, { toValue: 1, delay: 180, stiffness: 140, damping: 11, mass: 0.85, useNativeDriver: true }),
            Animated.timing(boxRotate, { toValue: 0, delay: 180, duration: 720, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
            Animated.timing(progress, { toValue: 1, duration: 3000, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        ]).start();

        startLoop(Animated.loop(Animated.timing(auroraRotate, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })));
        startLoop(Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })));

        const createDotLoop = (value, delay) => Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(value, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(value, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.delay(600),
        ]));
        startLoop(createDotLoop(dotA, 0));
        startLoop(createDotLoop(dotB, 300));
        startLoop(createDotLoop(dotC, 600));

        const createRingLoop = (value, delay) => Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(value, { toValue: 1, duration: 1450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]));
        startLoop(createRingLoop(ringA, 0));
        startLoop(createRingLoop(ringB, 400));
        startLoop(createRingLoop(ringC, 800));

        Animated.parallel([
            Animated.spring(orbAX, { toValue: 0, delay: 120, stiffness: 65, damping: 15, useNativeDriver: true }),
            Animated.spring(orbAY, { toValue: 0, delay: 120, stiffness: 65, damping: 15, useNativeDriver: true }),
            Animated.timing(orbAOpacity, { toValue: 0.45, delay: 120, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.spring(orbBX, { toValue: 0, delay: 300, stiffness: 60, damping: 15, useNativeDriver: true }),
            Animated.spring(orbBY, { toValue: 0, delay: 300, stiffness: 60, damping: 15, useNativeDriver: true }),
            Animated.timing(orbBOpacity, { toValue: 0.6, delay: 300, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.spring(blobAX, { toValue: 0, delay: 100, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.spring(blobAY, { toValue: 0, delay: 100, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.timing(blobAOpacity, { toValue: 1, delay: 100, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.spring(blobBX, { toValue: 0, delay: 380, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.spring(blobBY, { toValue: 0, delay: 380, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.timing(blobBOpacity, { toValue: 1, delay: 380, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.spring(blobCX, { toValue: 0, delay: 660, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.spring(blobCY, { toValue: 0, delay: 660, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.timing(blobCOpacity, { toValue: 1, delay: 660, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start();

        addTimer(() => {
            Animated.parallel([
                Animated.timing(beeEntranceOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.spring(beeEntranceTranslate, { toValue: 0, stiffness: 170, damping: 16, mass: 0.8, useNativeDriver: true }),
                Animated.spring(beeEntranceScale, { toValue: 1, stiffness: 180, damping: 15, mass: 0.82, useNativeDriver: true }),
            ]).start();
        }, 420);

        addTimer(() => {
            Animated.parallel([
                Animated.spring(titleTranslate, { toValue: 0, stiffness: 150, damping: 16, mass: 0.9, useNativeDriver: true }),
                Animated.timing(titleOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 560);

        addTimer(() => {
            Animated.parallel([
                Animated.spring(subtitleTranslate, { toValue: 0, stiffness: 140, damping: 16, mass: 0.9, useNativeDriver: true }),
                Animated.timing(subtitleOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 760);

        addTimer(() => {
            Animated.parallel([
                Animated.spring(descriptionTranslate, { toValue: 0, stiffness: 135, damping: 15, mass: 0.92, useNativeDriver: true }),
                Animated.timing(descriptionOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 940);

        let beeLoop;
        addTimer(() => {
            beeLoop = Animated.loop(Animated.parallel([
                Animated.sequence([
                    Animated.timing(beeFloat, { toValue: -8, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeFloat, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(beeRotate, { toValue: 8, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeRotate, { toValue: -8, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeRotate, { toValue: 0, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeRotate, { toValue: 0, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(beeScale, { toValue: 1.05, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeScale, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
            ]));
            beeLoop.start();
        }, 1200);

        addTimer(() => {
            Animated.parallel([
                Animated.timing(exitOpacity, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(exitScale, { toValue: 0.8, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(exitTranslate, { toValue: -30, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 2850);

        return () => {
            loops.forEach((loop) => loop.stop());
            beeLoop?.stop();
            timers.forEach(clearTimeout);
        };
    }, [auroraOpacity, auroraRotate, auroraX, auroraY, beeEntranceOpacity, beeEntranceScale, beeEntranceTranslate, beeFloat, beeRotate, beeScale, blobAOpacity, blobAX, blobAY, blobBOpacity, blobBX, blobBY, blobCOpacity, blobCX, blobCY, boxRotate, boxScale, descriptionOpacity, descriptionTranslate, dotA, dotB, dotC, exitOpacity, exitScale, exitTranslate, orbAOpacity, orbAX, orbAY, orbBOpacity, orbBX, orbBY, progress, ringA, ringB, ringC, shimmer, subtitleOpacity, subtitleTranslate, titleOpacity, titleTranslate]);

    const auroraSpin = auroraRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const boxSpin = boxRotate.interpolate({ inputRange: [-180, 0], outputRange: ['-180deg', '0deg'] });
    const beeTilt = beeRotate.interpolate({ inputRange: [-8, 8], outputRange: ['-8deg', '8deg'] });
    const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 180] });
    const dotStyle = (value) => ({
        opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
    });

    return (<View className="flex-1 items-center justify-center overflow-hidden bg-brand px-6">
        <Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: 210,
            backgroundColor: 'rgba(255,255,255,0.05)',
            top: -140,
            left: -120,
            opacity: auroraOpacity,
            transform: [{ translateX: auroraX }, { translateY: auroraY }, { rotate: auroraSpin }],
        }}/>
        <Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 340,
            height: 340,
            borderRadius: 160,
            backgroundColor: 'rgba(255,255,255,0.14)',
            top: 6,
            right: -76,
            opacity: orbAOpacity,
            transform: [{ translateX: orbAX }, { translateY: orbAY }],
        }}/>
        <Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: 140,
            backgroundColor: 'rgba(255,255,255,0.10)',
            bottom: 8,
            left: -68,
            opacity: orbBOpacity,
            transform: [{ translateX: orbBX }, { translateY: orbBY }],
        }}/>
        <Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.13)',
            top: '15%',
            left: -30,
            opacity: blobAOpacity,
            transform: [{ translateX: blobAX }, { translateY: blobAY }],
        }}/>
        <Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: 'rgba(255,255,255,0.10)',
            bottom: '18%',
            right: -30,
            opacity: blobBOpacity,
            transform: [{ translateX: blobBX }, { translateY: blobBY }],
        }}/>
        <Animated.View style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: 'rgba(255,255,255,0.09)',
            top: -20,
            left: '35%',
            opacity: blobCOpacity,
            transform: [{ translateX: blobCX }, { translateY: blobCY }],
        }}/>
        <Animated.View style={{
            alignItems: 'center',
            justifyContent: 'center',
            opacity: exitOpacity,
            transform: [{ scale: exitScale }, { translateY: exitTranslate }],
        }}>
            <Animated.View className="mb-6 h-[108px] w-[108px] items-center justify-center rounded-[32px] bg-white" style={{ transform: [{ scale: boxScale }, { rotate: boxSpin }] }}>
                <View className="absolute items-center justify-center">
                    <RippleRing progress={ringA} endScale={1.5} borderWidth={2} baseOpacity={0.2} />
                    <RippleRing progress={ringB} endScale={1.72} borderWidth={2} baseOpacity={0.15} />
                    <RippleRing progress={ringC} endScale={1.9} borderWidth={1.5} baseOpacity={0.1} />
                </View>
                <Animated.View style={{
                    opacity: beeEntranceOpacity,
                    transform: [
                        { translateY: beeEntranceTranslate },
                        { scale: beeEntranceScale },
                        { translateY: beeFloat },
                        { rotate: beeTilt },
                        { scale: beeScale },
                    ],
                }}>
                    <Image source={beeImage} style={{ width: 76, height: 76 }} resizeMode="contain" />
                </Animated.View>
            </Animated.View>
            <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }}>
                <Text className="text-center text-[38px] font-black text-white">Career Map</Text>
            </Animated.View>
            <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslate }] }}>
                <Text className="mt-2 text-[16px] text-white/75">Discover Your Future</Text>
            </Animated.View>
            <Animated.View style={{ opacity: descriptionOpacity, transform: [{ translateY: descriptionTranslate }] }}>
                <Text className="mt-3 max-w-[280px] text-center text-[14px] leading-[22px] text-white/65">
                    India&apos;s most comprehensive career guidance platform for students and parents.
                </Text>
            </Animated.View>
            <View className="mt-7 h-[6px] w-32 overflow-hidden rounded-full bg-white/20">
                <Animated.View style={{ height: '100%', width: progressWidth }} className="rounded-full bg-white/70"/>
                <Animated.View style={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 44,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgb(255, 255, 255)',
                    transform: [{ translateX: shimmerTranslate }],
                }}/>
            </View>
            <View className="mt-4 flex-row items-center justify-center gap-2">
                <Animated.View className="h-2 w-2 rounded-full bg-white/80" style={dotStyle(dotA)} />
                <Animated.View className="h-2 w-2 rounded-full bg-white/80" style={dotStyle(dotB)} />
                <Animated.View className="h-2 w-2 rounded-full bg-white/80" style={dotStyle(dotC)} />
            </View>
        </Animated.View>
    </View>);
}

export default function PromoScreen() {
    const { clearPromoMessage, preferences, promoMessage } = useAppState();
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (!promoMessage) {
            return undefined;
        }
        const timer = setTimeout(() => clearPromoMessage(), 2600);
        return () => clearTimeout(timer);
    }, [clearPromoMessage, promoMessage]);
    useEffect(() => {
        if (page === 0) {
            const timer = setTimeout(() => setPage(1), 3000);
            return () => clearTimeout(timer);
        }
    }, [page]);

    if (page === 0) {
        return (<SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
            <AnimatedBackground />
            <View style={{ flex: 1 }}>
          {promoMessage ? (<View className="absolute left-6 right-6 top-6 z-20 flex-row items-center gap-3 rounded-[20px] border border-[#d7ecd9] bg-white px-4 py-3" style={{
                shadowColor: '#2f9367',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 4,
            }}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#e7f7ec]">
                <Ionicons name="checkmark" size={20} color="#2f9367"/>
              </View>
              <Text className="flex-1 text-[13px] font-extrabold text-[#1f5135]">{promoMessage}</Text>
            </View>) : null}
          <PromoSplashIntro />
        </View>
      </SafeAreaView>);
    }
    return (
     <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}> 
            <AnimatedBackground /> 
         <ZoomInPage style={{ flex: 1 }}>
         <View className="flex-1 justify-center gap-[18px] px-6">
        <Text className={`text-center text-[30px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>What You Can Explore</Text>
        <Text className={`mb-1.5 text-center text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Everything you need for career guidance</Text>
        <View className="gap-3">
          {features.map((feature, index) => (<StaggerFadeUpItem key={feature.title} index={index}>
            <View className={`gap-1 rounded-[20px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
              <Text className={`text-[15px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{feature.title}</Text>
              <Text className={`text-[12px] leading-[18px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{feature.desc}</Text>
            </View>
          </StaggerFadeUpItem>))}
        </View>
        <View className="mt-1 flex-row gap-2 self-center">
          <View className={`h-2 w-2 rounded-full ${preferences.darkMode ? 'bg-white/20' : 'bg-black/20'}`}/>
          <View className="h-2 w-7 rounded-full bg-brand"/>
        </View>
        <AnimatedPressable className="rounded-[18px] bg-brand py-4" onPress={() => router.replace('/(drawer)')}>
          <Text className="text-center text-[15px] font-extrabold text-white">Next</Text>
        </AnimatedPressable>
      </View>
      </ZoomInPage>
    </SafeAreaView>);
}
