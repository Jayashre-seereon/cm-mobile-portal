import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';

// Extra room kept between the form and the keyboard. Some Android phones report the keyboard a
// little lower than it really is (the navigation bar height), which left the button half hidden.
const SAFETY = 28;
// A field that has to move is placed this far from the top edge, so the fields/button below it show.
const TOP_PEEK = 100;
const TOP_MARGIN = 16;

/**
 * Drop-in ScrollView for forms. When the keyboard opens it:
 *   1. adds blank scroll space equal to the part of the screen the keyboard covers, so the last
 *      field and the button can always be scrolled above the keyboard, and
 *   2. scrolls by itself so the field you tapped, and the button under it, are on screen.
 *
 * It never trusts the phone to resize the window. Android 15+ (and some phones before that) draw
 * the keyboard over an edge-to-edge app instead of pushing the app up, which hid the OTP / Register
 * buttons. Phones that do resize the window are handled too: the covered area is measured, so a
 * resized window needs no extra space.
 *
 * Plain JavaScript, so it ships through the OTA update.
 */
export default function KeyboardAwareScroll({
    children,
    onScroll,
    onContentSizeChange,
    onLayout,
    onTouchEnd,
    ...props
}) {
    const scrollRef = useRef(null);
    const scrollYRef = useRef(0);
    const contentHeightRef = useRef(0);
    const keyboardTopRef = useRef(null); // window y of the keyboard's top edge, null while hidden
    const handledInputRef = useRef(null);
    const timersRef = useRef([]);
    const [pad, setPad] = useState(0);

    const later = useCallback((fn, ms) => {
        const id = setTimeout(fn, ms);
        timersRef.current.push(id);
    }, []);

    const measureScroll = useCallback((done) => {
        const node = scrollRef.current;
        const target = node?.getNativeScrollRef?.() ?? node;
        if (!target?.measureInWindow) {
            return;
        }
        target.measureInWindow((_x, y, _width, height) => done({ top: y, height }));
    }, []);

    // How much of the scroll area the keyboard covers (0 when the phone already resized the window).
    const updatePad = useCallback(() => {
        const keyboardTop = keyboardTopRef.current;
        if (keyboardTop === null) {
            setPad(0);
            return;
        }
        measureScroll(({ top, height }) => {
            const overlap = Math.max(0, Math.round(top + height - keyboardTop));
            setPad(overlap > 0 ? overlap + SAFETY : 0);
        });
    }, [measureScroll]);

    // Moves the focused field (and what is under it) above the keyboard.
    const revealFocusedField = useCallback(() => {
        const keyboardTop = keyboardTopRef.current;
        const input = TextInput.State?.currentlyFocusedInput?.();
        if (keyboardTop === null || !input?.measureInWindow) {
            return;
        }
        handledInputRef.current = input;
        measureScroll(({ top: scrollTop, height: scrollHeight }) => {
            input.measureInWindow((_x, inputWindowTop, _width, inputHeight) => {
                const visibleHeight = Math.min(scrollTop + scrollHeight, keyboardTop - SAFETY) - scrollTop;
                const currentY = scrollYRef.current;
                const inputTop = inputWindowTop - scrollTop + currentY; // position inside the scroll content
                const inputBottom = inputTop + inputHeight;
                const maxY = Math.max(0, contentHeightRef.current - scrollHeight);
                const fitsAt = (y) => inputTop - y >= TOP_MARGIN && inputBottom - y <= visibleHeight;

                let targetY = null;
                if (fitsAt(maxY)) {
                    // Scrolling to the bottom still keeps the field on screen: show the whole end of the form (field + button).
                    targetY = maxY;
                }
                else if (!fitsAt(currentY)) {
                    targetY = Math.min(maxY, Math.max(0, inputTop - TOP_PEEK));
                }
                if (targetY !== null && Math.abs(targetY - currentY) > 1) {
                    scrollRef.current?.scrollTo?.({ y: targetY, animated: true });
                }
            });
        });
    }, [measureScroll]);

    useEffect(() => {
        const timers = timersRef.current;
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (event) => {
            const end = event?.endCoordinates;
            const windowHeight = Dimensions.get('window').height;
            const estimated = windowHeight - (end?.height ?? 0);
            const reported = Number.isFinite(end?.screenY) ? end.screenY : estimated;
            // When the two disagree, assume the keyboard is the taller one so the button is never left underneath it.
            keyboardTopRef.current = Math.min(reported, estimated);
            handledInputRef.current = null;
            updatePad();
            // Wait for the extra space to be laid out, then scroll. Once more later in case the keyboard finished animating late.
            later(revealFocusedField, 160);
            later(revealFocusedField, 420);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            keyboardTopRef.current = null;
            handledInputRef.current = null;
            setPad(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
            timers.forEach(clearTimeout);
        };
    }, [later, revealFocusedField, updatePad]);

    return (
        <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            {...props}
            onScroll={(event) => {
                scrollYRef.current = event.nativeEvent.contentOffset.y;
                onScroll?.(event);
            }}
            onContentSizeChange={(width, height) => {
                contentHeightRef.current = height;
                onContentSizeChange?.(width, height);
            }}
            onLayout={(event) => {
                // The phone resized the window (some do): measure again so we don't keep stale blank space.
                if (keyboardTopRef.current !== null) {
                    updatePad();
                }
                onLayout?.(event);
            }}
            onTouchEnd={(event) => {
                // Tapping a different field while the keyboard is already open: bring that one into view too.
                if (keyboardTopRef.current !== null) {
                    later(() => {
                        const focused = TextInput.State?.currentlyFocusedInput?.();
                        if (focused && focused !== handledInputRef.current) {
                            revealFocusedField();
                        }
                    }, 150);
                }
                onTouchEnd?.(event);
            }}
        >
            {children}
            {pad > 0 ? <View style={{ height: pad }} /> : null}
        </ScrollView>
    );
}
