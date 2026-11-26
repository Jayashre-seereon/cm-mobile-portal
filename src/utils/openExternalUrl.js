import { Alert, Linking } from 'react-native';

/**
 * Safely opens a link that came from the server / admin content (website, newsletter,
 * exam site, search result). Only http(s), mailto and tel links are allowed; a value
 * without a scheme ("www.example.com") gets https://. Failures show a short alert
 * instead of being silently swallowed.
 *
 * @param {string} rawUrl
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<boolean>} true when the link was opened
 */
export function normalizeExternalUrl(rawUrl) {
  const value = String(rawUrl ?? '').trim();
  if (!value) return null;
  if (/^(mailto:|tel:)/i.test(value)) return value;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  if (!/^https?:\/\//i.test(withScheme)) return null;
  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function openExternalUrl(rawUrl, { silent = false } = {}) {
  const url = normalizeExternalUrl(rawUrl);
  if (!url) {
    if (!silent) Alert.alert('Link unavailable', 'This link is not available right now.');
    return false;
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    if (!silent) Alert.alert('Could not open link', 'Please try again later.');
    return false;
  }
}
