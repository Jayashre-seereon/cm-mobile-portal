import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { removePushToken, savePushToken } from '../api/notificationApi';

// Push notifications (Firebase Cloud Messaging, delivered through Expo).
//
// expo-notifications and expo-device are NATIVE modules. A phone that still runs an APK built before
// they were added does not contain them, and an over-the-air update cannot add native code. So they are
// loaded lazily inside try/catch: on such a phone push simply stays off, instead of the whole app
// crashing at start-up. New APKs (built after Firebase was added) get push normally.
function loadNativeModules() {
    try {
        const Notifications = require('expo-notifications');
        const Device = require('expo-device');
        return { Notifications, Device };
    }
    catch {
        return null;
    }
}

let handlerInstalled = false;

/**
 * Asks for notification permission and returns this phone's Expo push token, or null when push is not
 * available (old APK, emulator, web, permission refused, offline ...). Never throws.
 */
export async function registerForPushNotifications() {
    if (Platform.OS === 'web') {
        return null;
    }
    const modules = loadNativeModules();
    if (!modules) {
        return null;
    }
    const { Notifications, Device } = modules;
    try {
        if (!Device.isDevice) {
            return null; // push tokens only exist on a real phone
        }
        if (!handlerInstalled) {
            // How a notification looks while the app is open. On Android the banner only shows with sound on.
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowBanner: true,
                    shouldShowList: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });
            handlerInstalled = true;
        }
        if (Platform.OS === 'android') {
            // Android 8+ needs a channel before any notification can be shown.
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
            });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== 'granted') {
            return null;
        }
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
            return null;
        }
        const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
        return data || null;
    }
    catch (error) {
        console.log('Push registration skipped:', error?.message || error);
        return null;
    }
}

// The token this phone has saved on the backend in this app session (needed to remove it on logout).
let savedToken = '';

/**
 * Gets this phone's push token and saves it on the backend for the logged-in user, so the backend can
 * send phone notifications. Call it once the user is logged in. Never throws.
 */
export async function syncPushTokenWithBackend() {
    const token = await registerForPushNotifications();
    if (!token) {
        return null;
    }
    try {
        await savePushToken(token);
        savedToken = token;
        return token;
    }
    catch (error) {
        console.log('Could not save push token:', error?.response?.data?.message || error?.message || error);
        return null;
    }
}

/**
 * Removes this phone's push token from the backend. Call it on logout, BEFORE the session is cleared, so the
 * next person using this phone does not get this user's notifications. Never throws.
 */
export async function removePushTokenFromBackend() {
    const token = savedToken;
    if (!token) {
        return;
    }
    savedToken = '';
    try {
        await removePushToken(token);
    }
    catch (error) {
        console.log('Could not remove push token:', error?.response?.data?.message || error?.message || error);
    }
}
