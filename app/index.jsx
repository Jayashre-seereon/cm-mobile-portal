import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { ensureAccessToken } from '../src/api/axios';
import { useAuthStore } from '../src/store/auth-store';

const beeImage = require('../assets/images/bee.png');

function RippleRing({ progress, endScale, borderWidth, baseOpacity }) {
    const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, endScale],
    });
    const opacity = progress.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [baseOpacity, 0, 0],
    });
    return (
        <Animated.View
            style={{
                pointerEvents: 'none',
                position: 'absolute',
                width: 116,
                height: 116,
                borderRadius: 58,
                borderWidth,
                borderColor: 'rgba(255,255,255,0.28)',
                opacity,
                transform: [{ scale }],
            }}
        />
    );
}

export default function SplashRoute() {
    // ── core animation refs ──────────────────────────────────────────────
    const auroraRotate        = useRef(new Animated.Value(0)).current;
    const orbAOpacity         = useRef(new Animated.Value(0.45)).current;
    const orbBOpacity         = useRef(new Animated.Value(0.6)).current;
    const circleTopScale      = useRef(new Animated.Value(1)).current;
    const circleTopOpacity    = useRef(new Animated.Value(0.04)).current;
    const circleBottomScale   = useRef(new Animated.Value(1)).current;
    const circleBottomOpacity = useRef(new Animated.Value(0.04)).current;
    const boxScale            = useRef(new Animated.Value(0)).current;
    const boxRotate           = useRef(new Animated.Value(-180)).current;
    const beeEntranceOpacity  = useRef(new Animated.Value(0)).current;
    const beeEntranceTranslate= useRef(new Animated.Value(18)).current;
    const beeEntranceScale    = useRef(new Animated.Value(0.72)).current;
    const beeFloat            = useRef(new Animated.Value(0)).current;
    const beeRotate           = useRef(new Animated.Value(0)).current;
    const beeScale            = useRef(new Animated.Value(1)).current;
    const glowOpacity         = useRef(new Animated.Value(0.3)).current;
    const titleOpacity        = useRef(new Animated.Value(0)).current;
    const titleTranslate      = useRef(new Animated.Value(40)).current;
    const subtitleOpacity     = useRef(new Animated.Value(0)).current;
    const subtitleTranslate   = useRef(new Animated.Value(40)).current;
    const progress            = useRef(new Animated.Value(0)).current;
    const shimmer             = useRef(new Animated.Value(0)).current;
    const dotA                = useRef(new Animated.Value(0)).current;
    const dotB                = useRef(new Animated.Value(0)).current;
    const dotC                = useRef(new Animated.Value(0)).current;
    const ringA               = useRef(new Animated.Value(0)).current;
    const ringB               = useRef(new Animated.Value(0)).current;
    const ringC               = useRef(new Animated.Value(0)).current;
    const exitOpacity         = useRef(new Animated.Value(1)).current;
    const exitScale           = useRef(new Animated.Value(1)).current;
    const exitTranslate       = useRef(new Animated.Value(0)).current;

    // ── orb A: entrance from top-right + float ───────────────────────────
    const orbAEntrance   = useRef(new Animated.ValueXY({ x: 280, y: -80 })).current;
    const orbAEnterAlpha = useRef(new Animated.Value(0)).current;
    const orbAFloat      = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // ── orb B: entrance from bottom-left + float ─────────────────────────
    const orbBEntrance   = useRef(new Animated.ValueXY({ x: -240, y: 80 })).current;
    const orbBEnterAlpha = useRef(new Animated.Value(0)).current;
    const orbBFloat      = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // ── circleTop: entrance from top-right + float ───────────────────────
    const circTopEntrance   = useRef(new Animated.ValueXY({ x: 120, y: -140 })).current;
    const circTopEnterAlpha = useRef(new Animated.Value(0)).current;
    const circTopFloat      = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // ── circleBottom: entrance from bottom-left + float ──────────────────
    const circBotEntrance   = useRef(new Animated.ValueXY({ x: -130, y: 120 })).current;
    const circBotEnterAlpha = useRef(new Animated.Value(0)).current;
    const circBotFloat      = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // ── aurora: entrance ─────────────────────────────────────────────────
    const auroraEnterAlpha = useRef(new Animated.Value(0)).current;
    const auroraEntranceXY = useRef(new Animated.ValueXY({ x: -160, y: -100 })).current;

    // ── 3 side-entry blobs ────────────────────────────────────────────────
    const blobAXY      = useRef(new Animated.ValueXY({ x: -280, y: 0 })).current;
    const blobBXY      = useRef(new Animated.ValueXY({ x: 280, y: 0 })).current;
    const blobCXY      = useRef(new Animated.ValueXY({ x: 0, y: -220 })).current;
    const blobAOpacity = useRef(new Animated.Value(0)).current;
    const blobBOpacity = useRef(new Animated.Value(0)).current;
    const blobCOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loops = [];
        const startLoop = (animation) => { loops.push(animation); animation.start(); };

        // ── aurora: slide in then spin ────────────────────────────────────
        Animated.parallel([
            Animated.spring(auroraEntranceXY, {
                toValue: { x: 0, y: 0 }, delay: 0, stiffness: 55, damping: 14, useNativeDriver: true,
            }),
            Animated.timing(auroraEnterAlpha, {
                toValue: 1, delay: 0, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.timing(auroraRotate, {
                toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true,
            })));
        });

        // ── orbA: slide in from top-right → pulse + float ─────────────────
        Animated.parallel([
            Animated.spring(orbAEntrance, {
                toValue: { x: 0, y: 0 }, delay: 120, stiffness: 65, damping: 15, useNativeDriver: true,
            }),
            Animated.timing(orbAEnterAlpha, {
                toValue: 1, delay: 120, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(orbAOpacity, { toValue: 0.72, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(orbAOpacity, { toValue: 0.45, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(orbAFloat, { toValue: { x: -12, y: 14 }, duration: 3800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(orbAFloat, { toValue: { x: 8,   y: -8 }, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(orbAFloat, { toValue: { x: 0,   y: 0  }, duration: 3600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        // ── orbB: slide in from bottom-left → pulse + float ───────────────
        Animated.parallel([
            Animated.spring(orbBEntrance, {
                toValue: { x: 0, y: 0 }, delay: 300, stiffness: 60, damping: 15, useNativeDriver: true,
            }),
            Animated.timing(orbBEnterAlpha, {
                toValue: 1, delay: 300, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(orbBOpacity, { toValue: 0.9,  duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(orbBOpacity, { toValue: 0.55, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(orbBFloat, { toValue: { x: 14, y: -12 }, duration: 4600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(orbBFloat, { toValue: { x: -8, y: 10  }, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(orbBFloat, { toValue: { x: 0,  y: 0   }, duration: 3800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        // ── circleTop: slide in from top-right → scale-pulse + float ──────
        Animated.parallel([
            Animated.spring(circTopEntrance, {
                toValue: { x: 0, y: 0 }, delay: 180, stiffness: 70, damping: 14, useNativeDriver: true,
            }),
            Animated.timing(circTopEnterAlpha, {
                toValue: 1, delay: 180, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.parallel([
                Animated.sequence([
                    Animated.timing(circleTopScale, { toValue: 1.4, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(circleTopScale, { toValue: 1,   duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(circleTopOpacity, { toValue: 0.1,  duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(circleTopOpacity, { toValue: 0.04, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
            ])));
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(circTopFloat, { toValue: { x: 10, y: -18 }, duration: 5200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(circTopFloat, { toValue: { x: -8, y: 10  }, duration: 4800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(circTopFloat, { toValue: { x: 0,  y: 0   }, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        // ── circleBottom: slide in from bottom-left → scale-pulse + float ─
        Animated.parallel([
            Animated.spring(circBotEntrance, {
                toValue: { x: 0, y: 0 }, delay: 420, stiffness: 65, damping: 14, useNativeDriver: true,
            }),
            Animated.timing(circBotEnterAlpha, {
                toValue: 1, delay: 420, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true,
            }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.parallel([
                Animated.sequence([
                    Animated.timing(circleBottomScale, { toValue: 1.4, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(circleBottomScale, { toValue: 1,   duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(circleBottomOpacity, { toValue: 0.1,  duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(circleBottomOpacity, { toValue: 0.04, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
            ])));
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(circBotFloat, { toValue: { x: -14, y: 16 }, duration: 5600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(circBotFloat, { toValue: { x: 10,  y: -8 }, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(circBotFloat, { toValue: { x: 0,   y: 0  }, duration: 4400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        // ── center card ───────────────────────────────────────────────────
        Animated.parallel([
            Animated.timing(progress, { toValue: 1, duration: 3000, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.spring(boxScale,  { toValue: 1, delay: 180, stiffness: 140, damping: 11, mass: 0.85, useNativeDriver: true }),
            Animated.timing(boxRotate, { toValue: 0, delay: 180, duration: 720,  easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
        ]).start();

        const beeEntranceTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(beeEntranceOpacity,    { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.spring(beeEntranceTranslate,  { toValue: 0, stiffness: 170, damping: 16, mass: 0.8,  useNativeDriver: true }),
                Animated.spring(beeEntranceScale,      { toValue: 1, stiffness: 180, damping: 15, mass: 0.82, useNativeDriver: true }),
            ]).start();
        }, 420);

        startLoop(Animated.loop(Animated.timing(shimmer, {
            toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true,
        })));

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

        const titleTimer = setTimeout(() => {
            Animated.parallel([
                Animated.spring(titleTranslate, { toValue: 0, stiffness: 150, damping: 16, mass: 0.9, useNativeDriver: true }),
                Animated.timing(titleOpacity,   { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 560);

        const subtitleTimer = setTimeout(() => {
            Animated.parallel([
                Animated.spring(subtitleTranslate, { toValue: 0, stiffness: 140, damping: 16, mass: 0.9, useNativeDriver: true }),
                Animated.timing(subtitleOpacity,   { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 760);

        let beeLoop;
        let glowLoop;
        const beeTimer = setTimeout(() => {
            beeLoop = Animated.loop(Animated.parallel([
                Animated.sequence([
                    Animated.timing(beeFloat, { toValue: -8, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeFloat, { toValue: 0,  duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(beeRotate, { toValue: 8,  duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeRotate, { toValue: -8, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeRotate, { toValue: 0,  duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeRotate, { toValue: 0,  duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(beeScale, { toValue: 1.05, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(beeScale, { toValue: 1,    duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
            ]));
            glowLoop = Animated.loop(Animated.sequence([
                Animated.timing(glowOpacity, { toValue: 0.6, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(glowOpacity, { toValue: 0.3, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]));
            beeLoop.start();
            glowLoop.start();
        }, 1200);

        const exitTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(exitOpacity,   { toValue: 0,   duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(exitScale,     { toValue: 0.8, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(exitTranslate, { toValue: -30, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]).start();
        }, 2850);

        const navTimer = setTimeout(() => {
            const { accessToken: storedAccessToken, refreshToken: storedRefreshToken, pendingInstituteOnboarding } = useAuthStore.getState();
            const hasStoredSession = Boolean(storedAccessToken || storedRefreshToken);

            if (!hasStoredSession) {
                router.replace('/auth-entry');
                return;
            }

            if (storedRefreshToken && !storedAccessToken) {
                ensureAccessToken()
                    .then(() => {
                        router.replace(pendingInstituteOnboarding ? '/onboarding' : '/(drawer)/(tabs)');
                    })
                    .catch(() => {
                        router.replace('/auth-entry');
                    });
                return;
            }

            router.replace(pendingInstituteOnboarding ? '/onboarding' : '/(drawer)/(tabs)');
        }, 3350);

        // ── 3 side-entry blobs: enter → 3-point float loop ────────────────
        Animated.parallel([
            Animated.spring(blobAXY, { toValue: { x: 0, y: 0 }, delay: 100, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.timing(blobAOpacity, { toValue: 1, delay: 100, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(blobAXY, { toValue: { x: 10,  y: -14 }, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(blobAXY, { toValue: { x: -8,  y: 8   }, duration: 3600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(blobAXY, { toValue: { x: 0,   y: 0   }, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        Animated.parallel([
            Animated.spring(blobBXY, { toValue: { x: 0, y: 0 }, delay: 380, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.timing(blobBOpacity, { toValue: 1, delay: 380, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(blobBXY, { toValue: { x: -12, y: 12  }, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(blobBXY, { toValue: { x: 10,  y: -10 }, duration: 4400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(blobBXY, { toValue: { x: 0,   y: 0   }, duration: 3800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        Animated.parallel([
            Animated.spring(blobCXY, { toValue: { x: 0, y: 0 }, delay: 660, stiffness: 70, damping: 16, useNativeDriver: true }),
            Animated.timing(blobCOpacity, { toValue: 1, delay: 660, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start(() => {
            startLoop(Animated.loop(Animated.sequence([
                Animated.timing(blobCXY, { toValue: { x: 8,  y: -10 }, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(blobCXY, { toValue: { x: -6, y: 8   }, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(blobCXY, { toValue: { x: 0,  y: 0   }, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])));
        });

        return () => {
            loops.forEach((loop) => loop.stop());
            beeLoop?.stop();
            glowLoop?.stop();
            clearTimeout(titleTimer);
            clearTimeout(subtitleTimer);
            clearTimeout(beeEntranceTimer);
            clearTimeout(beeTimer);
            clearTimeout(exitTimer);
            clearTimeout(navTimer);
        };
        // This splash sequence is intentionally initialized once on mount with stable Animated refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── interpolations ────────────────────────────────────────────────────
    const auroraSpin       = auroraRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const boxSpin          = boxRotate.interpolate({ inputRange: [-180, 0], outputRange: ['-180deg', '0deg'] });
    const beeTilt          = beeRotate.interpolate({ inputRange: [-8, 8], outputRange: ['-8deg', '8deg'] });
    const progressWidth    = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 180] });
    const dotStyle = (value) => ({
        opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
    });

    return (
        <View className="flex-1 items-center justify-center overflow-hidden bg-brand px-6">

            {/* ── Aurora — slides in from top-left then spins ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 420, height: 420, borderRadius: 210,
                    backgroundColor: 'rgba(255,255,255,0.05)', top: -140, left: -120,
                    opacity: auroraEnterAlpha,
                    transform: [
                        { translateX: auroraEntranceXY.x },
                        { translateY: auroraEntranceXY.y },
                        { rotate: auroraSpin },
                    ],
                }}
            />

            {/* ── Orb A — slides in from top-right then floats ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 340, height: 340, borderRadius: 160,
                    backgroundColor: 'rgba(255,255,255,0.14)', top: 6, right: -76,
                    opacity: Animated.multiply(orbAEnterAlpha, orbAOpacity),
                    transform: [
                        { translateX: Animated.add(orbAEntrance.x, orbAFloat.x) },
                        { translateY: Animated.add(orbAEntrance.y, orbAFloat.y) },
                    ],
                }}
            />

            {/* ── Orb B — slides in from bottom-left then floats ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 300, height: 300, borderRadius: 140,
                    backgroundColor: 'rgba(255,255,255,0.10)', bottom: 8, left: -68,
                    opacity: Animated.multiply(orbBEnterAlpha, orbBOpacity),
                    transform: [
                        { translateX: Animated.add(orbBEntrance.x, orbBFloat.x) },
                        { translateY: Animated.add(orbBEntrance.y, orbBFloat.y) },
                    ],
                }}
            />

            {/* ── Circle Top — slides in from top-right then scale-pulses + floats ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 250, height: 250, borderRadius: 110,
                    backgroundColor: 'rgba(255,255,255,0.12)', top: -22, right: -30,
                    opacity: Animated.multiply(circTopEnterAlpha, circleTopOpacity),
                    transform: [
                        { translateX: Animated.add(circTopEntrance.x, circTopFloat.x) },
                        { translateY: Animated.add(circTopEntrance.y, circTopFloat.y) },
                        { scale: circleTopScale },
                    ],
                }}
            />

            {/* ── Circle Bottom — slides in from bottom-left then scale-pulses + floats ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 280, height: 280, borderRadius: 130,
                    backgroundColor: 'rgba(255,255,255,0.11)', bottom: -58, left: -72,
                    opacity: Animated.multiply(circBotEnterAlpha, circleBottomOpacity),
                    transform: [
                        { translateX: Animated.add(circBotEntrance.x, circBotFloat.x) },
                        { translateY: Animated.add(circBotEntrance.y, circBotFloat.y) },
                        { scale: circleBottomScale },
                    ],
                }}
            />

            {/* ── Blob A — enters from left, 3-point float ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 200, height: 200, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.13)',
                    top: '15%', left: -30,
                    opacity: blobAOpacity,
                    transform: [{ translateX: blobAXY.x }, { translateY: blobAXY.y }],
                }}
            />

            {/* ── Blob B — enters from right, 3-point float ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 170, height: 170, borderRadius: 85,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    bottom: '18%', right: -30,
                    opacity: blobBOpacity,
                    transform: [{ translateX: blobBXY.x }, { translateY: blobBXY.y }],
                }}
            />

            {/* ── Blob C — enters from top, 3-point float ── */}
            <Animated.View
                style={{
                    pointerEvents: 'none',
                    position: 'absolute', width: 150, height: 150, borderRadius: 75,
                    backgroundColor: 'rgba(255,255,255,0.09)',
                    top: -20, left: '35%',
                    opacity: blobCOpacity,
                    transform: [{ translateX: blobCXY.x }, { translateY: blobCXY.y }],
                }}
            />

            {/* ── Center card ── */}
            <Animated.View style={{
                alignItems: 'center', justifyContent: 'center',
                opacity: exitOpacity,
                transform: [{ scale: exitScale }, { translateY: exitTranslate }],
            }}>
                <Animated.View
                    className="mb-6 h-[108px] w-[108px] items-center justify-center rounded-[32px] bg-white"
                    style={{ transform: [{ scale: boxScale }, { rotate: boxSpin }] }}
                >
                    <View className="absolute items-center justify-center">
                        <RippleRing progress={ringA} endScale={1.5}  borderWidth={2}   baseOpacity={0.2}/>
                        <RippleRing progress={ringB} endScale={1.72} borderWidth={2}   baseOpacity={0.15}/>
                        <RippleRing progress={ringC} endScale={1.9}  borderWidth={1.5} baseOpacity={0.1}/>
                    </View>
                    <Animated.View style={{
                        pointerEvents: 'none',
                        position: 'absolute', width: 84, height: 84, borderRadius: 26, backgroundColor: '#ffffff',
                    }}/>
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
                        <Image source={beeImage} style={{ width: 76, height: 76 }} resizeMode="contain"/>
                    </Animated.View>
                </Animated.View>

                <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }}>
                    <Text className="text-center text-[38px] font-black text-white">Career Map</Text>
                </Animated.View>
                <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslate }] }}>
                    <Text className="mt-2 text-[16px] text-white/75">Discover Your Future</Text>
                </Animated.View>

                <View className="mt-7 h-[6px] w-32 overflow-hidden rounded-full bg-white/20">
                    <Animated.View style={{ height: '100%', width: progressWidth }} className="rounded-full bg-white/70"/>
                    <Animated.View style={{
                        pointerEvents: 'none',
                        position: 'absolute', top: 0, left: 0, width: 44, height: 6,
                        borderRadius: 999, backgroundColor: 'rgb(255, 255, 255)',
                        transform: [{ translateX: shimmerTranslate }],
                    }}/>
                </View>

                <View className="mt-4 flex-row items-center justify-center gap-2">
                    <Animated.View className="h-2 w-2 rounded-full bg-white/80" style={dotStyle(dotA)}/>
                    <Animated.View className="h-2 w-2 rounded-full bg-white/80" style={dotStyle(dotB)}/>
                    <Animated.View className="h-2 w-2 rounded-full bg-white/80" style={dotStyle(dotC)}/>
                </View>
            </Animated.View>
        </View>
    );
}
