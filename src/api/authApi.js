import api, { API_BASE_URL } from './axios';
import { Platform } from 'react-native';

function getBrowserName() {
  if (Platform.OS !== 'web') {
    return 'App';
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

  if (/chrome|crios/i.test(userAgent)) {
    return 'Chrome';
  }

  if (/firefox|fxios/i.test(userAgent)) {
    return 'Firefox';
  }

  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) {
    return 'Safari';
  }

  if (/edg/i.test(userAgent)) {
    return 'Edge';
  }

  return 'Browser';
}

function getOperatingSystem() {
  if (Platform.OS !== 'web') {
    return Platform.OS === 'ios' ? 'iOS' : 'Android';
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';

  if (/windows/i.test(userAgent) || /win/i.test(platform)) {
    return 'Windows';
  }

  if (/mac/i.test(userAgent) || /mac/i.test(platform)) {
    return 'macOS';
  }

  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'iOS';
  }

  if (/linux/i.test(userAgent) || /linux/i.test(platform)) {
    return 'Linux';
  }

  return 'Unknown';
}

function getDeviceType() {
  if (Platform.OS === 'web') {
    return 'Desktop';
  }

  return 'Mobile';
}

export async function sendOtp(mobile, type = 'signup') {
  const response = await api.post('/auth/send-otp', {
    mobile,
    type,
  });

  return response.data;
}

export async function verifyOtp(mobile, code, type = 'signup') {
  const response = await api.post('/auth/verify-otp', {
    mobile,
    type,
    code,
  });

  return response.data;
}

export async function loginWithPassword(email, password) {
  const response = await api.post('/auth/login/password', {
    email,
    password,
  });

  return response.data;
}

async function fetchPublicIpAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data?.ip || '';
  } catch {
    return '';
  }
}

async function fetchApproxLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    const parts = [data?.city, data?.country_name].filter(Boolean);
    return parts.join(', ');
  } catch {
    return '';
  }
}

export async function createUserHistoryEntry(payload = {}) {
  const [ipAddress, location] = await Promise.all([
    payload.ipAddress ? Promise.resolve(payload.ipAddress) : fetchPublicIpAddress(),
    payload.location ? Promise.resolve(payload.location) : fetchApproxLocation(),
  ]);

  const response = await api.post('/userhistory/', {
    device: payload.device || getDeviceType(),
    browser: payload.browser || getBrowserName(),
    os: payload.os || getOperatingSystem(),
    ipAddress,
    location,
  });
  return response.data;
}

export async function sendSignupOtp(mobile) {
  return sendOtp(mobile, 'signup');
}

export async function verifySignupOtp(mobile, code) {
  return verifyOtp(mobile, code, 'signup');
}

export async function signupUser(payload, tempToken) {
  if (!tempToken) {
    throw new Error('Missing signup temp token. Please verify OTP again before creating your account.');
  }

  const response = await api.post('/user/signup', payload, {
    headers: {
      Authorization: `Bearer ${tempToken}`,
    },
  });

  return response.data;
}

export async function getUserDashboard() {
  const response = await api.get('/user/dashboard');
  return response.data;
}

export function getProfileUpdatePayload(payload = {}, currentUser = {}) {
  return {
    firstName: payload.firstName ?? currentUser.firstName ?? '',
    lastName: payload.lastName ?? currentUser.lastName ?? '',
    username: payload.username ?? currentUser.username ?? '',
    country: payload.country ?? currentUser.country ?? 'India',
    state: payload.state ?? currentUser.state ?? '',
    city: payload.city ?? currentUser.city ?? '',
    district: payload.district ?? currentUser.district ?? '',
    gender: payload.gender ?? currentUser.gender ?? '',
    address: payload.address ?? currentUser.address ?? '',
    dataOfBirth: payload.dataOfBirth ?? currentUser.dataOfBirth ?? null,
    image: payload.image ?? currentUser.image ?? '',
    status: payload.status ?? currentUser.status ?? 'Active',
  };
}

export async function updateUserProfile(payload = {}) {
  const response = await api.put('/user/profile', payload);
  return response.data;
}

export async function changePassword(payload = {}) {
  const response = await api.put('/user/change-password', payload);
  return response.data;
}

export async function createHelpCenterRequest(payload = {}) {
  const response = await api.post('/helpandsupport/', payload);
  return response.data;
}

export async function logoutUser(accessToken = '') {
  const response = await api.post(
    '/auth/logout',
    {},
    accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined
  );
  return response.data;
}

export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong') {
  if (error?.message === 'Network Error') {
    if (__DEV__) {
      return `Network error. Check backend & URL: ${API_BASE_URL}`;
    }

    return 'Network error. Please try again.';
  }

  return error?.response?.data?.message || error?.message || fallbackMessage;
}
