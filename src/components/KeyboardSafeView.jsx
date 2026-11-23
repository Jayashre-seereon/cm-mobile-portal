import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/**
 * Keeps the bottom of a screen above the on-screen keyboard.
 *
 * The app runs edge-to-edge, and on many Android phones (Android 15+ always, some makers' keyboards
 * earlier) the OS no longer resizes the window when the keyboard opens. The keyboard then sits on top
 * of the form and hides the "Send OTP" / "Continue" button. Phones that still resize the window
 * looked fine, which is why it only happened on some devices.
 *
 * This measures how far the keyboard really overlaps this view and pads exactly that much. When the OS
 * already made room, the overlap is 0 and nothing changes, so there is no double adjustment.
 * It is JS only, so it ships through an OTA update.
 */
export default function KeyboardSafeView({ children, style }) {
    const outerRef = useRef(null);
    const keyboardTopRef = useRef(null);
    const [inset, setInset] = useState(0);

    const recompute = useCallback(() => {
        const keyboardTop = keyboardTopRef.current;
        if (keyboardTop === null) {
            setInset(0);
            return;
        }
        outerRef.current?.measureInWindow((_x, y, _width, height) => {
            // The outer view is never padded, so its bottom edge is stable and this cannot feed back on itself.
            setInset(Math.max(0, Math.round(y + height - keyboardTop)));
        });
    }, []);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (event) => {
            const keyboardTop = event?.endCoordinates?.screenY;
            if (!Number.isFinite(keyboardTop)) {
                return;
            }
            keyboardTopRef.current = keyboardTop;
            recompute();
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            keyboardTopRef.current = null;
            setInset(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [recompute]);

    return (
        <View
            ref={outerRef}
            collapsable={false}
            // If the OS resizes the window after the keyboard event, re-measure instead of keeping stale padding.
            onLayout={() => {
                if (keyboardTopRef.current !== null) {
                    recompute();
                }
            }}
            style={[{ flex: 1 }, style]}
        >
            <View style={{ flex: 1, paddingBottom: inset }}>{children}</View>
        </View>
    );
}
