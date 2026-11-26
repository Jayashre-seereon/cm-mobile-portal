import { create } from 'zustand';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const initialSignupForm = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  city: '',
  state: '',
};

const initialOnboardingData = {
  userType: '',
  name: '',
  childName: '',
  selectedClass: '',
  selectedStream: '',
  selectedInterests: [],
  selectedClarity: '',
  selectedStrengths: [],
  selectedPriorities: [],
  selectedGuidance: '',
};

const AUTH_STORAGE_KEY = 'careermap-auth-store';
const NATIVE_AUTH_FILE = 'careermap-auth-session.json';
const USER_DATA_STORAGE_KEYS = [
  AUTH_STORAGE_KEY,
  'careermap-app-state',
  'careermap-userportal-state',
  'careermap-reviewed-mentor-bookings',
  'userPortalData',
  'token',
  'user',
  'accessToken',
  'refreshToken',
];

// Tokens on a phone live in the Keychain (iOS) / Keystore (Android) through expo-secure-store; only the
// non-secret parts (user, flags) stay in the JSON file. expo-secure-store is a NATIVE module: an APK/IPA
// built before it was added does not contain it and an over-the-air update cannot add it, so it is loaded
// lazily and, when missing or failing, the tokens stay in the file exactly as before (nobody is logged out).
// One secure item holding both tokens, always written with the synchronous setItem (no async delete that
// could land after a newer write and wipe a fresh token).
const SECURE_TOKENS_KEY = 'careermap.authTokens';
const SecureStore = (() => {
  if (Platform.OS === 'web') return null;
  try {
    const secureStoreModule = require('expo-secure-store');
    return typeof secureStoreModule?.getItem === 'function' && typeof secureStoreModule?.setItem === 'function' ? secureStoreModule : null;
  } catch {
    return null;
  }
})();
const secureWriteOptions = SecureStore?.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY !== undefined
  ? { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
  : undefined;

function readSecureTokens() {
  if (!SecureStore) return null;
  try {
    const raw = SecureStore.getItem(SECURE_TOKENS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      accessToken: typeof parsed?.accessToken === 'string' ? parsed.accessToken : '',
      refreshToken: typeof parsed?.refreshToken === 'string' ? parsed.refreshToken : '',
    };
  } catch {
    return null;
  }
}

// Returns true when the tokens are now held by secure storage.
function writeSecureTokens(accessToken, refreshToken) {
  if (!SecureStore) return false;
  try {
    SecureStore.setItem(
      SECURE_TOKENS_KEY,
      JSON.stringify({ accessToken: accessToken || '', refreshToken: refreshToken || '' }),
      secureWriteOptions
    );
    return true;
  } catch {
    return false;
  }
}

function clearPersistedUserData() {
  if (Platform.OS !== 'web') {
    writeSecureTokens('', '');
    try {
      const authFile = new File(Paths.document, NATIVE_AUTH_FILE);
      if (authFile.exists) authFile.delete();
    } catch {
      // Continue the in-memory logout if native storage is unavailable.
    }
    return;
  }

  if (typeof window === 'undefined') return;
  try {
    for (const key of USER_DATA_STORAGE_KEYS) window.localStorage?.removeItem(key);
    window.sessionStorage?.clear();
  } catch {
    // Continue the in-memory logout if browser storage is unavailable.
  }
}

function readPersistedAuth() {
  try {
    let raw = '';
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) return {};
      raw = window.localStorage.getItem(AUTH_STORAGE_KEY) || '';
    } else {
      const authFile = new File(Paths.document, NATIVE_AUTH_FILE);
      if (!authFile.exists) return {};
      raw = authFile.textSync();
    }

    const parsed = raw ? JSON.parse(raw) : {};
    let accessToken = parsed?.state?.accessToken || '';
    let refreshToken = parsed?.state?.refreshToken || '';

    if (Platform.OS !== 'web') {
      const fileHasTokens = Boolean(accessToken || refreshToken);
      if (fileHasTokens) {
        // Tokens still in the file: an older app version wrote them (or the last secure write failed),
        // so they are the newest copy. Move them into secure storage and drop them from the file.
        if (writeSecureTokens(accessToken, refreshToken)) {
          try {
            const authFile = new File(Paths.document, NATIVE_AUTH_FILE);
            authFile.write(JSON.stringify({ state: { ...parsed.state, accessToken: '', refreshToken: '' } }));
          } catch {
            // The tokens are in secure storage; a leftover file copy is cleaned up on the next save.
          }
        }
      } else {
        const secureTokens = readSecureTokens();
        accessToken = secureTokens?.accessToken || '';
        refreshToken = secureTokens?.refreshToken || '';
      }
    }

    if (!raw && !accessToken && !refreshToken) {
      return {};
    }

    return {
      accessToken,
      refreshToken,
      user: parsed?.state?.user || null,
      profileIncomplete: Boolean(parsed?.state?.profileIncomplete),
      pendingInstituteOnboarding: Boolean(parsed?.state?.pendingInstituteOnboarding),
    };
  } catch {
    return {};
  }
}

const persistedAuth = readPersistedAuth();
const hasPersistedAuthSession = Boolean(persistedAuth.accessToken || persistedAuth.refreshToken);

function persistAuthState(state) {
  try {
    // On a phone the tokens go to secure storage; the file keeps them only if that is unavailable.
    const tokensInSecureStore =
      Platform.OS !== 'web' && writeSecureTokens(state.accessToken || '', state.refreshToken || '');
    const serialized = JSON.stringify({
      state: {
        accessToken: tokensInSecureStore ? '' : state.accessToken || '',
        refreshToken: tokensInSecureStore ? '' : state.refreshToken || '',
        user: state.user || null,
        profileIncomplete: Boolean(state.profileIncomplete),
        pendingInstituteOnboarding: Boolean(state.pendingInstituteOnboarding),
      },
    });

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      }
      return;
    }

    const authFile = new File(Paths.document, NATIVE_AUTH_FILE);
    if (!authFile.exists) authFile.create();
    authFile.write(serialized);
  } catch {
    // Ignore storage failures in private mode or restricted environments.
  }
}

export const useAuthStore = create((set) => ({
  signupForm: initialSignupForm,
  onboardingData: initialOnboardingData,
  tempToken: '',
  hasAuthenticatedSession: hasPersistedAuthSession,
  accessToken: persistedAuth.accessToken || '',
  refreshToken: persistedAuth.refreshToken || '',
  user: persistedAuth.user || null,
  profileIncomplete: Boolean(persistedAuth.profileIncomplete),
  pendingInstituteOnboarding: Boolean(persistedAuth.pendingInstituteOnboarding),

  setSignupForm: (data) =>
    set((state) => ({
      signupForm: {
        ...state.signupForm,
        ...data,
      },
    })),

  setOnboardingData: (data) =>
    set(() => ({
      onboardingData: data,
    })),

  setTempToken: (tempToken) =>
    set(() => ({ tempToken })),

  markAuthenticatedSession: () =>
    set(() => ({ hasAuthenticatedSession: true })),

  setAccessToken: (accessToken) =>
    set((state) => {
      const nextState = { ...state, accessToken };
      persistAuthState(nextState);
      return { accessToken, hasAuthenticatedSession: Boolean(accessToken || state.refreshToken) };
    }),

  setRefreshToken: (refreshToken) =>
    set((state) => {
      const nextState = { ...state, refreshToken };
      persistAuthState(nextState);
      return { refreshToken, hasAuthenticatedSession: Boolean(state.accessToken || refreshToken) };
    }),

  setUser: (user) =>
    set((state) => {
      const nextState = { ...state, user };
      persistAuthState(nextState);
      return { user };
    }),

  setProfileIncomplete: (profileIncomplete) =>
    set((state) => {
      const nextState = { ...state, profileIncomplete };
      persistAuthState(nextState);
      return { profileIncomplete: Boolean(profileIncomplete) };
    }),

  setPendingInstituteOnboarding: (pendingInstituteOnboarding) =>
    set((state) => {
      const nextState = { ...state, pendingInstituteOnboarding };
      persistAuthState(nextState);
      return { pendingInstituteOnboarding: Boolean(pendingInstituteOnboarding) };
    }),

  clearAuthFlow: () =>
    set(() => ({
      signupForm: initialSignupForm,
      tempToken: '',
    })),

  logout: () => {
    clearPersistedUserData();
    set(() => ({
        signupForm: initialSignupForm,
        onboardingData: initialOnboardingData,
        tempToken: '',
        accessToken: '',
        refreshToken: '',
        user: null,
        profileIncomplete: false,
        pendingInstituteOnboarding: false,
        hasAuthenticatedSession: false,
      }));
  },
}));
