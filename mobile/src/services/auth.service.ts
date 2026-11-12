import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { ShopLicense } from '../types';

const LICENSE_KEY = 'tailorbook_shop_license';
const DEVICE_ID_KEY = 'tailorbook_device_id';
export const DEFAULT_SERVER_URL = 'http://192.168.1.24:3000/api';

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
 */
export async function getActiveLicense(): Promise<ShopLicense | null> {
  try {
    const raw = await SecureStore.getItemAsync(LICENSE_KEY);
    if (!raw) return null;
    const license = JSON.parse(raw) as ShopLicense;

    // Check offline validity
    if (license.offline_valid_until) {
      const validUntil = new Date(license.offline_valid_until).getTime();
      if (Date.now() > validUntil) {
        // License expired
        return null;
      }
    }
    return license;
  } catch {
    return null;
  }
}

/**
 * Saves a verified shop license to secure storage.
 */
export async function saveLicense(license: ShopLicense): Promise<void> {
  await SecureStore.setItemAsync(LICENSE_KEY, JSON.stringify(license));
}

/**
 * Removes shop activation from device.
 */
export async function clearLicense(): Promise<void> {
  await SecureStore.deleteItemAsync(LICENSE_KEY);
}

/**
 * Checks whether an IP / host is a private LAN or loopback address.
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
 * - Ensures scheme (defaults to http:// if omitted)
 * - Auto-corrects https:// to http:// for local LAN IPs (prevents SSLHandshakeException)
 * - Ensures /api suffix is present
 * - Strips trailing slashes
 */
export function normalizeServerUrl(rawUrl: string): string {
  let url = (rawUrl || DEFAULT_SERVER_URL).trim();
  if (!url) {
    url = DEFAULT_SERVER_URL;
  }

  // If protocol missing (e.g. 192.168.1.24:3000), prepend http://
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
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
      `Android blocked an unencrypted HTTP connection. This occurs in older APK builds without cleartext permission.\n\n` +
      `Fix: Install the latest updated APK build, or verify in Expo Go.`
    );
  }

  if (/SSLHandshakeException|Handshake failed|certificate/i.test(msg)) {
    return (
      `SSL Handshake Failed:\n` +
      `The server at ${targetUrl} does not use SSL/HTTPS. Please use "http://" instead of "https://".`
    );
  }

  if (
    /ConnectException|Failed to connect|ECONNREFUSED|Network request failed|Network error|ENOTFOUND/i.test(msg)
  ) {
    if (isLocal) {
      return (
        `Cannot reach backend server (${targetUrl}):\n\n` +
        `Please check:\n` +
        `1. Wi-Fi: Ensure your phone is connected to the SAME Wi-Fi network as this PC (turn Wi-Fi ON, turn off Mobile Data/4G).\n` +
        `2. Server: Ensure the backend is running on your PC (port 3000).\n` +
        `3. URL: Use http:// (not https://) for local IP.\n` +
        `4. Firewall: Allow port 3000 through Windows Firewall.`
      );
    }
    return `Cannot connect to server at ${targetUrl}. Please check your internet connection.`;
  }

  if (/aborted|timeout/i.test(msg)) {
    return (
      `Connection Timed Out (12s):\n` +
      `The server at ${targetUrl} did not respond in time.\n\n` +
      `Please ensure your phone is connected to the same Wi-Fi router as your PC and the backend server is running.`
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
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        message: `Connected successfully!\nBackend: Online (${cleanUrl})\n${dbStatus}`,
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
  const timeoutId = setTimeout(() => controller.abort(), 12000);

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
      // Handle HTML response (e.g. 502/503 from tunnel or reverse proxy)
      return {
        success: false,
        message: `Server returned unexpected response (${response.status}). Expected JSON but received HTML or text.`,
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
    return { success: true, message: 'Shop activated successfully!', license };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: parseNetworkError(err, cleanUrl),
    };
  }
}

/**
 * Quick activation for local offline testing if backend is temporarily unreachable.
 */
export async function activateLocalDemo(shopName: string = 'My Tailoring Shop'): Promise<ShopLicense> {
  const deviceId = await getDeviceId();
  const license: ShopLicense = {
    tenant_id: `tenant_${Crypto.randomUUID().substring(0, 8)}`,
    tenant_name: shopName.trim() || 'My Tailoring Shop',
    device_id: deviceId,
    device_name: 'Local Device',
    license_version: 1,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    offline_valid_until: new Date(Date.now() + 365 * 86400000).toISOString(),
    signature: 'local_pilot_offline_license',
  };
  await saveLicense(license);
  return license;
}
