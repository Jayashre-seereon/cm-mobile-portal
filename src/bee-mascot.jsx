import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
const beeImage = require('../assets/images/bee.png');
export function BeeMascot({ size = 100, style, draggable = true }) {
    const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(floatAnim, {
                toValue: -10,
                duration: 1100,
                useNativeDriver: true,
            }),
            Animated.timing(floatAnim, {
                toValue: 0,
                duration: 1100,
                useNativeDriver: true,
            }),
        ])).start();
    }, [floatAnim]);
    const panResponder = useMemo(() => draggable ? PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
            position.setOffset({ x: position.x._value ?? 0, y: position.y._value ?? 0 });
            position.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
            useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
            position.flattenOffset();
            Animated.spring(position, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false,
                bounciness: 8,
                speed: 14,
            }).start();
        },
    }) : null, [draggable, position]);
    return (<Animated.View className="items-center justify-center" style={[
            style,
            {
                width: size,
                height: size,
                transform: [...position.getTranslateTransform(), { translateY: floatAnim }],
            },
        ]} {...(panResponder?.panHandlers ?? {})}>
            <Animated.Image source={beeImage} className="h-full w-full" style={{ width: size, height: size }} resizeMode="contain"/>
        </Animated.View>);
}
