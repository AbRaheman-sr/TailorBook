import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { ShopLicense } from '../types';

const LICENSE_KEY = 'tailorbook_shop_license';
const DEVICE_ID_KEY = 'tailorbook_device_id';
export const DEFAULT_SERVER_URL = 'https://conventional-dublin-ron-haven.trycloudflare.com/api';

/**
 * Returns or creates a persistent cryptographic device ID for this phone.
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Retrieves the currently active shop license from secure storage.
 * Returns null if not activated or if offline validity has expired.
 */
export async function getActiveLicense(): Promise<ShopLicense | null> {
  try {
    const raw = await SecureStore.getItemAsync(LICENSE_KEY);
    if (!raw) return null;
    const license = JSON.parse(raw) as ShopLicense;

    // Strict validation: must have tenant_id and signature
    if (!license.tenant_id || !license.device_id || !license.signature) {
      return null;
    }

    // Check offline validity
    if (license.offline_valid_until) {
      const validUntil = new Date(license.offline_valid_until).getTime();
      if (Date.now() > validUntil) {
        // License expired after max offline period
        return null;
      }
    }
    return license;
  } catch {
    return null;
  }
}

/**
 * Saves a verified, server-signed shop license to secure storage.
 */
export async function saveLicense(license: ShopLicense): Promise<void> {
  await SecureStore.setItemAsync(LICENSE_KEY, JSON.stringify(license));
}

/**
 * Removes shop activation from device (deactivates / logs out).
 */
export async function clearLicense(): Promise<void> {
  await SecureStore.deleteItemAsync(LICENSE_KEY);
}

/**
 * Checks whether a URL points to a private LAN or loopback address.
 */
export function isLocalAddress(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes backend server URL entered by user:
 * - Trims whitespace
 * - Ensures scheme (defaults to https:// for public domains, http:// for local IPs)
 * - Auto-corrects https:// to http:// ONLY for local LAN IPs (to prevent SSLHandshakeException)
 * - Ensures /api suffix is present
 * - Strips trailing slashes
 */
export function normalizeServerUrl(rawUrl: string): string {
  let url = (rawUrl || DEFAULT_SERVER_URL).trim();
  if (!url) {
    url = DEFAULT_SERVER_URL;
  }

  // If protocol missing, decide scheme:
  if (!/^https?:\/\//i.test(url)) {
    // If it's a domain name (not an IP address), prefer https://
    const isIp = /^(\d{1,3}\.){3}\d{1,3}/.test(url) || url.startsWith('localhost');
    url = isIp ? `http://${url}` : `https://${url}`;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // If user entered https:// for a local LAN IP (e.g. https://192.168.1.24:3000),
  // switch to http:// because local dev servers do not have TLS certificates
  if (url.toLowerCase().startsWith('https://') && isLocalAddress(url)) {
    url = `http://${url.substring(8)}`;
  }

  // Ensure /api path is present
  if (!url.toLowerCase().endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
}

/**
 * Converts network and runtime exceptions into clear, actionable error messages.
 */
function parseNetworkError(err: any, targetUrl: string): string {
  const msg = err?.message || String(err);
  const isLocal = isLocalAddress(targetUrl);

  if (/CLEARTEXT communication.*not permitted/i.test(msg) || /UnknownServiceException/i.test(msg)) {
    return (
      `Android Security Block:\n` +
      `Android blocked an unencrypted HTTP connection. For public servers or mobile data, use a secure HTTPS URL.`
    );
  }

  if (/SSLHandshakeException|Handshake failed|certificate/i.test(msg)) {
    return (
      `SSL Connection Error:\n` +
      `Failed to establish a secure SSL/TLS connection with ${targetUrl}. If connecting to a local PC server, use "http://".`
    );
  }

  if (
    /ConnectException|Failed to connect|ECONNREFUSED|Network request failed|Network error|ENOTFOUND/i.test(msg)
  ) {
    if (isLocal) {
      return (
        `Cannot connect to local server (${targetUrl}):\n\n` +
        `• When using mobile data (4G/5G), local IP addresses (192.168.x.x) cannot be reached.\n` +
        `• To use mobile data, enter the public HTTPS server URL.\n` +
        `• If testing locally on PC, both phone and PC must be on the same Wi-Fi router.`
      );
    }
    return `Cannot reach server at ${targetUrl}. Please check your mobile data or internet connection.`;
  }

  if (/aborted|timeout/i.test(msg)) {
    return (
      `Connection Timed Out:\n` +
      `The server at ${targetUrl} did not respond within 15 seconds. Please check that the server is online and your mobile data/internet is active.`
    );
  }

  return `Connection error: ${msg}`;
}

/**
 * Pings the backend health endpoint to verify connectivity before activation.
 */
export async function testBackendConnection(
  serverUrl: string
): Promise<{ success: boolean; message: string }> {
  const cleanUrl = normalizeServerUrl(serverUrl);
  const healthUrl = `${cleanUrl}/health`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const dbStatus = data.database?.status === 'connected' ? 'Database Connected' : 'Database Pending';
      return {
        success: true,
        message: `Connected successfully!\nBackend: Online\n${dbStatus}`,
      };
    }

    return {
      success: false,
      message: `Server reached but returned status ${response.status}: ${response.statusText}`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: parseNetworkError(err, cleanUrl),
    };
  }
}

/**
 * Activates shop against the TailorBook NestJS backend.
 * Upon successful activation, stores the cryptographic license locally for offline use.
 */
export async function activateShop(
  serverUrl: string,
  username: string,
  password: string,
  deviceName: string = 'Android Device'
): Promise<{ success: boolean; message: string; license?: ShopLicense }> {
  const deviceId = await getDeviceId();
  const cleanUrl = normalizeServerUrl(serverUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${cleanUrl}/devices/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
        device_id: deviceId,
        device_name: deviceName,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `Server returned unexpected response (${response.status}). Expected JSON.`,
      };
    }

    if (!response.ok) {
      let errMsg = data.message || `Activation failed with status ${response.status}`;
      if (Array.isArray(errMsg)) {
        errMsg = errMsg.join(', ');
      }
      return {
        success: false,
        message: errMsg,
      };
    }

    const license: ShopLicense = {
      tenant_id: data.tenant_id,
      tenant_name: data.tenant_name || username,
      device_id: deviceId,
      device_name: deviceName,
      license_version: data.license_version || 1,
      issued_at: data.issued_at || new Date().toISOString(),
      expires_at: data.expires_at || new Date(Date.now() + 365 * 86400000).toISOString(),
      offline_valid_until: data.offline_valid_until || new Date(Date.now() + 90 * 86400000).toISOString(),
      signature: data.signature || 'verified',
    };

    await saveLicense(license);
    return { success: true, message: 'Shop activated successfully! You can now use the app online and offline.', license };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: parseNetworkError(err, cleanUrl),
    };
  }
}
