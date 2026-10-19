import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useAppState } from './app-state';
const { width, height } = Dimensions.get('window');
const PARTICLES = [
    { x: 0.08, y: 0.12, size: 18, opacity: 0.1, duration: 4000, delay: 0 },
    { x: 0.85, y: 0.08, size: 12, opacity: 0.1, duration: 5500, delay: 500 },
    { x: 0.15, y: 0.45, size: 22, opacity: 0.1, duration: 6000, delay: 1000 },
    { x: 0.75, y: 0.35, size: 16, opacity: 0.1, duration: 4800, delay: 300 },
    { x: 0.45, y: 0.20, size: 10, opacity: 0.1, duration: 5200, delay: 800 },
    { x: 0.90, y: 0.60, size: 20, opacity: 0.1, duration: 7000, delay: 200 },
    { x: 0.25, y: 0.75, size: 14, opacity: 0.1, duration: 4500, delay: 1200 },
    { x: 0.60, y: 0.80, size: 18, opacity: 0.1, duration: 6500, delay: 600 },
    { x: 0.35, y: 0.55, size: 8, opacity: 0.1, duration: 5000, delay: 400 },
    { x: 0.70, y: 0.15, size: 24, opacity: 0.1, duration: 8000, delay: 900 },
];
const PENCILS = [
    { x: 0.05, y: 0.22, size: 20, opacity: 0.1, duration: 2800, delay: 0, rotate: '35deg' },
    { x: 0.78, y: 0.52, size: 20, opacity: 0.1, duration: 2400, delay: 400, rotate: '-25deg' },
    { x: 0.42, y: 0.82, size: 20, opacity: 0.1, duration: 3000, delay: 800, rotate: '50deg' },
];
const BOOKS = [
    { x: 0.82, y: 0.22, size: 20, opacity: 0.1, duration: 2600, delay: 200 },
    { x: 0.08, y: 0.62, size: 20, opacity: 0.1, duration: 3000, delay: 600 },
    { x: 0.50, y: 0.52, size: 20, opacity: 0.1, duration: 2800, delay: 1000 },
    { x: 0.30, y: 0.88, size: 20, opacity: 0.1, duration: 3200, delay: 400 },
    { x: 0.3, y: 0.10, size: 20, opacity: 0.1, duration: 2400, delay: 800 },
];
function Particle({ x, y, size, opacity, duration, delay, color }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [anim, delay, duration]);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
    const animatedOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [opacity, opacity * 1.6, opacity] });
    return (<Animated.View style={{
            position: 'absolute',
            left: x * width,
            top: y * height,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: animatedOpacity,
            transform: [{ translateY }],
        }}/>);
}
function PencilParticle({ x, y, size, opacity, duration, delay, rotate, color, eraserColor, bandColor, tipColor }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [anim, delay, duration]);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
    const animatedOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [opacity, opacity * 1.5, opacity] });
    const bodyW = size * 2.8;
    const bodyH = size * 0.65;
    return (<Animated.View style={{
            position: 'absolute',
            left: x * width,
            top: y * height,
            opacity: animatedOpacity,
            transform: [{ translateY }, { rotate }],
            flexDirection: 'row',
            alignItems: 'center',
        }}>
      {/* Eraser */}
      <View style={{ width: size * 0.45, height: bodyH, backgroundColor: eraserColor, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }}/>
      {/* Band */}
      <View style={{ width: 3, height: bodyH, backgroundColor: bandColor }}/>
      {/* Body */}
      <View style={{ width: bodyW, height: bodyH, backgroundColor: color }}/>
      {/* Tip */}
      <View style={{
            width: 0, height: 0,
            borderTopWidth: bodyH / 2, borderBottomWidth: bodyH / 2, borderLeftWidth: size * 0.55,
            borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: tipColor,
            opacity: 0.7,
        }}/>
    </Animated.View>);
}
function BookParticle({ x, y, size, opacity, duration, delay, color, lineColor }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [anim, delay, duration]);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
    const animatedOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [opacity, opacity * 1.5, opacity] });
    const pageW = size * 1.2;
    const pageH = size * 1.4;
    const spineW = size * 0.08;
    const cx = pageW + spineW / 2; 
    const totalW = pageW * 2 + spineW + 4;
    const totalH = pageH + size * 0.3;
    // left page path
    const leftPage = `M${cx},0 Q${spineW},${pageH * 0.1} 2,${pageH * 0.15} L2,${pageH} Q${spineW},${pageH * 0.95} ${cx},${pageH} Z`;
    // right page path
    const rightPage = `M${cx},0 Q${pageW * 2},${pageH * 0.1} ${pageW * 2 + spineW},${pageH * 0.15} L${pageW * 2 + spineW},${pageH} Q${pageW * 2},${pageH * 0.95} ${cx},${pageH} Z`;
    // bottom open-spine arc
    const bottomArc = `M2,${pageH} Q${pageW / 2},${pageH + size * 0.25} ${cx},${pageH + size * 0.2} Q${pageW + pageW / 2 + spineW},${pageH + size * 0.25} ${pageW * 2 + spineW},${pageH}`;
    const lineRows = [0.28, 0.45, 0.62];
    return (<Animated.View style={{
            position: 'absolute',
            left: x * width,
            top: y * height,
            opacity: animatedOpacity,
            transform: [{ translateY }],
            alignItems: 'center',
        }}>
      <Svg width={totalW} height={totalH}>
        {/* Left page */}
        <Path d={leftPage} fill={color} opacity={0.55}/>
        {/* Right page */}
        <Path d={rightPage} fill={color} opacity={0.45}/>
        {/* Spine */}
        <Line x1={cx} y1={0} x2={cx} y2={pageH} stroke={color} strokeWidth={spineW} opacity={0.9}/>
        {/* Left page ruled lines */}
        {lineRows.map((frac, i) => (<Line key={`ll${i}`} x1={size * 0.15} y1={pageH * frac} x2={pageW * 0.85} y2={pageH * frac - size * 0.05} stroke={lineColor} strokeWidth={1.2} opacity={0.3}/>))}
        {/* Right page ruled lines */}
        {lineRows.map((frac, i) => (<Line key={`rl${i}`} x1={pageW + spineW + size * 0.15} y1={pageH * frac - size * 0.05} x2={pageW * 2} y2={pageH * frac} stroke={lineColor} strokeWidth={1.2} opacity={0.3}/>))}
        {/* Open-spine bottom arc */}
        <Path d={bottomArc} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6}/>
      </Svg>
    </Animated.View>);
}
export function AnimatedBackground() {
    const { preferences } = useAppState();
    const containerProps = Platform.OS === 'web'
        ? { style: [StyleSheet.absoluteFill, { pointerEvents: 'none' }] }
        : { style: StyleSheet.absoluteFill, pointerEvents: 'none' };
    const theme = useMemo(() => preferences.darkMode
        ? {
            particle: '#8d1738',
            book: '#78102f',
            line: '#ffffff',
            pencil: '#a01944',
            eraser: '#de8ea9',
            band: '#732239',
            tip: '#a01944',
        }
        : {
            particle: '#c0392b',
            book: '#c0392b',
            line: '#ffffff',
            pencil: '#c0392b',
            eraser: '#e8a0a0',
            band: '#b07070',
            tip: '#c0392b',
        }, [preferences.darkMode]);
    return (<View {...containerProps}>
      {preferences.darkMode ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050505' }]} /> : null}
       {/* Circular particles */}
      {PARTICLES.map((p, i) => (<Particle key={i} {...p} color={theme.particle}/>))}
      {/* Pencils */}
      {PENCILS.map((p, i) => (<PencilParticle key={i} {...p} color={theme.pencil} eraserColor={theme.eraser} bandColor={theme.band} tipColor={theme.tip}/>))}
      {/* Open books */}
      {BOOKS.map((p, i) => (<BookParticle key={i} {...p} color={theme.book} lineColor={theme.line}/>))}
    </View>);
}

