import { create } from 'zustand';

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

function clearPersistedUserData() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of USER_DATA_STORAGE_KEYS) window.localStorage?.removeItem(key);
    window.sessionStorage?.clear();
  } catch {
    // Continue the in-memory logout if browser storage is unavailable.
  }
}

function readPersistedAuth() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.state?.accessToken || '',
      refreshToken: parsed?.state?.refreshToken || '',
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
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        state: {
          accessToken: state.accessToken || '',
          refreshToken: state.refreshToken || '',
          user: state.user || null,
          profileIncomplete: Boolean(state.profileIncomplete),
          pendingInstituteOnboarding: Boolean(state.pendingInstituteOnboarding),
        },
      })
    );
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
