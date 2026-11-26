import { create as createAxios } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth-store';

// Keep production/preview APKs functional when the EAS environment does not
// define these public URL variables. Expo Go still uses the local .env values.
const DEFAULT_API_BASE_URL = 'https://careermap-backend-ca6s.onrender.com/api';
const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const WEB_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL_WEB || DEFAULT_API_BASE_URL;
const ENV_AUTH_REFRESH_ENDPOINT = process.env.EXPO_PUBLIC_AUTH_REFRESH_ENDPOINT;

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  return hostUri.split(':')[0] || null;
}

function cleanBaseUrl(baseUrl) {
  return baseUrl?.replace(/\/$/, '');
}

function resolveNativeApiBaseUrl(baseUrl) {
  if (!baseUrl) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    if (__DEV__) {
      const expoHost = getExpoHost();

      if (expoHost && isLocalhost) {
        url.hostname = expoHost;
        return cleanBaseUrl(url.toString());
      }
    }

    if (Platform.OS === 'android' && isLocalhost) {
      url.hostname = '10.0.2.2';
    }

    return cleanBaseUrl(url.toString());
  } catch {
    return cleanBaseUrl(baseUrl);
  }
}

function resolveApiBaseUrl() {
  if (Platform.OS === 'web' && WEB_API_BASE_URL) {
    return cleanBaseUrl(WEB_API_BASE_URL);
  }

  return resolveNativeApiBaseUrl(ENV_API_BASE_URL);
}

export const API_BASE_URL = resolveApiBaseUrl();
const AUTH_REFRESH_ENDPOINT = (() => {
  const endpoint = ENV_AUTH_REFRESH_ENDPOINT || '/auth/refresh-token';
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
})();

const api = createAxios({
  baseURL: API_BASE_URL,
  // Hosted APIs may need extra time to wake before responding to native clients.
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = createAxios({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

// Routes that never use (or refresh) the logged-in user's session. '/user/signup' is authorised by the
// short-lived OTP temp token: when that expires, refreshing the session makes no sense and used to log
// the guest out, wiping the signup form. '/auth/logout' must never trigger a refresh either.
function isPublicAuthRoute(requestUrl) {
  return (
    requestUrl.includes('/auth/login/password') ||
    requestUrl.includes('/auth/send-otp') ||
    requestUrl.includes('/auth/verify-otp') ||
    requestUrl.includes('/auth/logout') ||
    requestUrl.includes('/user/signup') ||
    requestUrl.includes('/user/forgot-password') ||
    requestUrl.includes('/user/reset-password')
  );
}

// Same rule as the user portal: only an explicit rejection of the refresh token (401/403), or having no
// refresh token at all, ends the session. Timeouts, offline, cold starts and 5xx keep the user signed in.
function isRefreshRejected(refreshError) {
  if (refreshError?.sessionChanged) {
    return false;
  }

  const refreshStatus = refreshError?.response?.status;
  if (refreshStatus) {
    return refreshStatus === 401 || refreshStatus === 403;
  }

  return !refreshError?.request;
}

// Tells the server to revoke this session's refresh token (sent in the body: the app has no cookie).
async function revokeServerSession(accessToken, refreshToken) {
  if (!accessToken && !refreshToken) {
    return;
  }

  try {
    await refreshClient.post(
      '/auth/logout',
      refreshToken ? { refreshToken } : {},
      {
        timeout: 8000,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      }
    );
  } catch {
    // Ignore logout failures and continue clearing the local session.
  }
}

// Work to do before a forced logout clears the session (the push-notification module registers removal
// of this phone's push token here, so the signed-out user's notifications stop arriving).
let beforeForcedLogoutHandler = null;
let forcedLogoutInProgress = false;

export function setBeforeForcedLogout(handler) {
  beforeForcedLogoutHandler = typeof handler === 'function' ? handler : null;
}

async function forceLogout() {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (forcedLogoutInProgress || (!accessToken && !refreshToken)) {
    return;
  }

  forcedLogoutInProgress = true;
  try {
    if (beforeForcedLogoutHandler) {
      await Promise.race([
        Promise.resolve().then(beforeForcedLogoutHandler).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ]);
    }
    void revokeServerSession(accessToken, refreshToken);
    // Only clear the session if it is still the one that failed (the user may have logged in again meanwhile).
    if (useAuthStore.getState().refreshToken === refreshToken) {
      useAuthStore.getState().logout();
    }
  } finally {
    forcedLogoutInProgress = false;
  }
}

function extractAuthPayload(data) {
  const payload = data?.data ?? data ?? {};

  return {
    accessToken: payload?.accessToken || payload?.access_token || payload?.token || '',
    refreshToken: payload?.refreshToken || payload?.refresh_token || '',
    user: payload?.user || null,
  };
}

async function refreshAccessToken() {
  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const response = await refreshClient.post(
    AUTH_REFRESH_ENDPOINT,
    {
      refreshToken,
      token: refreshToken,
    },
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );

  // The user logged out (or another account logged in) while this refresh was in flight: drop the
  // result instead of writing a token back to storage and reviving the old session.
  if (useAuthStore.getState().refreshToken !== refreshToken) {
    const changed = new Error('Session changed during token refresh');
    changed.sessionChanged = true;
    throw changed;
  }

  const authPayload = extractAuthPayload(response?.data);
  if (!authPayload.accessToken) {
    throw new Error('Refresh response did not include a new access token');
  }

  const authStore = useAuthStore.getState();
  authStore.setAccessToken(authPayload.accessToken);
  if (authPayload.refreshToken) {
    authStore.setRefreshToken(authPayload.refreshToken);
  }
  if (authPayload.user) {
    authStore.setUser(authPayload.user);
  }

  return authPayload.accessToken;
}

export async function ensureAccessToken() {
  const { accessToken, refreshToken } = useAuthStore.getState();

  if (accessToken) {
    return accessToken;
  }

  if (!refreshToken) {
    return '';
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    return await refreshPromise;
  } catch (error) {
    if (isRefreshRejected(error)) {
      await forceLogout();
    }
    throw error;
  }
}

api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken;
    const requestUrl = String(config.url || '');
    const publicAuthRoute = isPublicAuthRoute(requestUrl);
    const explicitAuthorization =
      config.headers?.Authorization || config.headers?.authorization;

    if (explicitAuthorization) {
      return config;
    }

    if (publicAuthRoute) {
      if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }

      if (config.headers?.authorization) {
        delete config.headers.authorization;
      }

      return config;
    }

    let nextToken = token;
    if (!nextToken) {
      nextToken = await ensureAccessToken();
    }

    if (nextToken) {
      config.headers.Authorization = `Bearer ${nextToken}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    } else if (config.headers?.authorization) {
      delete config.headers.authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const serverMessage = String(error?.response?.data?.message || error?.response?.data?.error || '').toLowerCase();
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || '');

    const looksLikeTokenExpiry =
      status === 401 || (status === 403 && /expired|jwt|token/i.test(serverMessage));

    if (!originalRequest || originalRequest._retry || !looksLikeTokenExpiry) {
      return Promise.reject(error);
    }

    if (isPublicAuthRoute(requestUrl) || requestUrl.includes(AUTH_REFRESH_ENDPOINT)) {
      return Promise.reject(error);
    }

    // Requests made while a forced logout is cleaning up (e.g. removing the push token) must not start
    // another refresh / logout round.
    if (forcedLogoutInProgress) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api.request(originalRequest);
    } catch (refreshError) {
      if (isRefreshRejected(refreshError)) {
        await forceLogout();
        return Promise.reject(refreshError);
      }
      // Temporary problem (offline, timeout, server waking up): keep the session and report the
      // original request's failure so the screen can show its normal error / retry.
      return Promise.reject(refreshError?.sessionChanged ? error : refreshError);
    }
  }
);

export default api;
