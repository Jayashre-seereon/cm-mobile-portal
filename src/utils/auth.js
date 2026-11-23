export function normalizeMobile(value = '') {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(-10);
  }

  return digits.slice(0, 10);
}

export function formatOtpMobile(value = '') {
  const mobile = normalizeMobile(value);
  return mobile ? `+91${mobile}` : '';
}

export function splitFullName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

export function buildUsername(name = '', email = '') {
  const emailPrefix = email.split('@')[0]?.trim();

  if (emailPrefix) {
    return emailPrefix.toLowerCase();
  }

  return name.trim().toLowerCase().replace(/\s+/g, '') || 'careermapuser';
}

export function buildLandingData(onboarding) {
  return {
    class: onboarding.selectedClass || '',
    stream: onboarding.selectedStream || '',
    interest: onboarding.selectedInterests || [],
    clarity: onboarding.selectedClarity || '',
    strength: onboarding.selectedStrengths || [],
    priority: onboarding.selectedPriorities || [],
  };
}

export function isValidEmail(value = '') {
  const email = value.trim();
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getEmailError(value = '') {
  const email = value.trim();
  if (!email) {
    return 'Email address is required.';
  }

  if (!isValidEmail(email)) {
    return 'Enter a valid email address.';
  }

  return '';
}

export function isValidPassword(value = '') {
  return value.length >= 6;
}

// Same policy as the user portal and the server, used when SETTING a password
// (signup, reset, change). Login keeps the lenient check above so older passwords still work.
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include a letter and a number.';

export function isStrongPassword(value = '') {
  const v = String(value);
  return v.length >= 8 && v.length <= 128 && /[A-Za-z]/.test(v) && /\d/.test(v);
}

export function getNewPasswordError(value = '') {
  if (!value) {
    return 'Password is required.';
  }
  return isStrongPassword(value) ? '' : PASSWORD_POLICY_MESSAGE;
}

// Indian mobile numbers are 10 digits and start with 6-9 (same as the portal and server).
export function isValidMobileNumber(value = '') {
  return /^[6-9][0-9]{9}$/.test(normalizeMobile(value));
}

export function getMobileError(value = '') {
  return value && !isValidMobileNumber(value) ? 'Enter a valid 10 digit mobile number starting with 6-9.' : '';
}

// "+91 98765 43210" style display, same as the portal's formatPhone.
export function formatPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const national = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (national.length === 10) return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  return String(value).trim();
}

export function getPasswordError(value = '') {
  if (!value) {
    return 'Password is required.';
  }

  if (!isValidPassword(value)) {
    return 'Password must be at least 6 characters.';
  }

  return '';
}

export function parseDateInput(value = '') {
  const dateValue = value.trim();

  if (!dateValue) {
    return null;
  }

  const ddmmyyyyMatch = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    if (
      parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() === Number(month) - 1 &&
      parsedDate.getUTCDate() === Number(day)
    ) {
      return parsedDate;
    }

    return null;
  }

  const yyyymmddMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    if (
      parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() === Number(month) - 1 &&
      parsedDate.getUTCDate() === Number(day)
    ) {
      return parsedDate;
    }
  }

  return null;
}

export function formatDateForDisplay(value = '') {
  const parsedDate = parseDateInput(value);

  if (!parsedDate) {
    return value ? String(value).slice(0, 10) : '';
  }

  const day = String(parsedDate.getUTCDate()).padStart(2, '0');
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
  const year = parsedDate.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

export function formatDateForApi(value = '') {
  const parsedDate = parseDateInput(value);

  if (!parsedDate) {
    return null;
  }

  return parsedDate.toISOString();
}

export function isValidDateInput(value = '') {
  const dateValue = value.trim();
  return Boolean(parseDateInput(dateValue));
}

export function getDateError(value = '') {
  const dateValue = value.trim();
  if (!dateValue) {
    return 'Date of birth is required.';
  }

  if (!isValidDateInput(dateValue)) {
    return 'Use DD-MM-YYYY format with a real date.';
  }

  return '';
}

export function mapApiUserToProfile(user) {
  if (!user) {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

  return {
    name: fullName,
    email: user.email || '',
    mobile: user.mobile || '',
    password: '',
    address: user.address || '',
    city: user.city || '',
    stateName: user.state || '',
    district: user.district || '',
    country: user.country || 'India',
    gender: user.gender || '',
    dob: user.dataOfBirth ? formatDateForDisplay(String(user.dataOfBirth)) : '',
    childName: '',
  };
}

// The saved profile on the server is the source of truth. Its non-empty values (name, email,
// address, ...) replace a stale or empty local copy; fields the server has nothing for keep
// what is local. The password is never taken from the server.
export function mergeServerProfile(localProfile = {}, serverProfile = null) {
  if (!serverProfile) return localProfile;
  const merged = { ...localProfile };
  Object.entries(serverProfile).forEach(([key, value]) => {
    if (key === 'password') return;
    if (value !== '' && value !== null && value !== undefined) merged[key] = value;
  });
  return merged;
}

// The name to show for the signed-in user: the profile name, else the name on the login
// session, else the username or the start of the email - never a made-up placeholder.
export function getDisplayName(profile, authUser) {
  const fromProfile = String(profile?.name || '').trim();
  if (fromProfile) return fromProfile;
  const fromSession = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ').trim();
  return (
    fromSession ||
    String(authUser?.username || '').trim() ||
    String(authUser?.email || '').split('@')[0] ||
    'My account'
  );
}
