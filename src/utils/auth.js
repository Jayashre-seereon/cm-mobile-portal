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
