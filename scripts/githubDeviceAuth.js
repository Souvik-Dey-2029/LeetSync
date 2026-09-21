/**
 * GitHub OAuth "Device Flow" client.
 *
 * This is the flow GitHub explicitly recommends for apps that cannot keep a
 * client secret confidential (CLIs, desktop apps, and browser extensions).
 * It only ever requires a public `client_id` — no client secret is
 * transmitted or stored anywhere in this extension.
 *
 * Flow:
 *  1. requestDeviceCode()  -> { device_code, user_code, verification_uri, interval }
 *  2. Show `user_code` to the user and open `verification_uri` in a new tab.
 *  3. pollForAccessToken() -> polls until the user approves/denies/expires.
 *  4. fetchGitHubUser()    -> resolves the authenticated GitHub username.
 *
 * Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_USER_URL = 'https://api.github.com/user';
export const DEFAULT_SCOPE = 'repo';

class DeviceAuthError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'DeviceAuthError';
    this.code = code;
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Step 1: Ask GitHub for a device code + user code.
 * @param {string} clientId - The installer's own OAuth App Client ID.
 * @param {string} [scope] - Space-delimited OAuth scopes. Defaults to 'repo'.
 */
export async function requestDeviceCode(clientId, scope = DEFAULT_SCOPE) {
  if (!clientId) {
    throw new DeviceAuthError('NO_CLIENT_ID', 'No GitHub OAuth Client ID has been configured.');
  }

  const res = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ client_id: clientId, scope }),
  });

  if (!res.ok) {
    throw new DeviceAuthError('DEVICE_CODE_HTTP_ERROR', `GitHub returned HTTP ${res.status} while requesting a device code. Double check the Client ID.`);
  }

  const data = await res.json();
  if (data.error) {
    throw new DeviceAuthError(data.error, data.error_description || data.error);
  }

  return data; // { device_code, user_code, verification_uri, expires_in, interval }
}

/**
 * Step 2: Poll GitHub until the user approves (or denies/expires) the request.
 * Safe to abandon: pass an `abortSignal` object ({ cancelled: false }) and set
 * `cancelled = true` from the caller to stop polling early.
 *
 * @param {string} clientId
 * @param {string} deviceCode
 * @param {number} intervalSeconds - Minimum polling interval GitHub asked for.
 * @param {{cancelled: boolean}} [abortSignal]
 * @param {() => void} [onTick] - Called before each poll attempt.
 */
export async function pollForAccessToken(clientId, deviceCode, intervalSeconds, abortSignal = { cancelled: false }, onTick) {
  let interval = intervalSeconds || 5;

  while (!abortSignal.cancelled) {
    await sleep(interval * 1000);
    if (abortSignal.cancelled) return null;
    if (onTick) onTick();

    const res = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await res.json();

    if (data.access_token) {
      return data; // { access_token, token_type, scope }
    }

    switch (data.error) {
      case 'authorization_pending':
        continue;
      case 'slow_down':
        interval = data.interval || interval + 5;
        continue;
      case 'expired_token':
        throw new DeviceAuthError('EXPIRED', 'The login code expired before it was approved. Please try again.');
      case 'access_denied':
        throw new DeviceAuthError('DENIED', 'GitHub authorization was denied.');
      default:
        throw new DeviceAuthError(data.error || 'UNKNOWN', data.error_description || 'Unknown error while waiting for GitHub authorization.');
    }
  }

  return null;
}

/** Step 3: Resolve the authenticated user's GitHub username using the new token. */
export async function fetchGitHubUser(token) {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new DeviceAuthError('USER_FETCH_FAILED', `Could not verify the GitHub account (HTTP ${res.status}).`);
  }

  return res.json();
}

export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer

let refreshPromise = null;

/**
 * Calculates expiration timestamps from GitHub token response if present.
 * @param {object} tokenData
 * @returns {{ tokenExpiresAt: number | null, refreshExpiresAt: number | null }}
 */
export function calculateTokenExpiration(tokenData) {
  const now = Date.now();
  const tokenExpiresAt =
    tokenData && typeof tokenData.expires_in === 'number'
      ? now + tokenData.expires_in * 1000
      : null;
  const refreshExpiresAt =
    tokenData && typeof tokenData.refresh_token_expires_in === 'number'
      ? now + tokenData.refresh_token_expires_in * 1000
      : null;
  return { tokenExpiresAt, refreshExpiresAt };
}

/**
 * Persists complete token lifecycle data atomically into storage.
 * @param {object} api
 * @param {object} tokenData
 * @param {string} [username]
 */
export async function saveTokenPair(api, tokenData, username) {
  const { tokenExpiresAt, refreshExpiresAt } = calculateTokenExpiration(tokenData);
  const toSet = {
    leetsync_token: tokenData.access_token,
    leetsync_token_expires_at: tokenExpiresAt,
  };

  if (tokenData.refresh_token) {
    toSet.leetsync_refresh_token = tokenData.refresh_token;
  }
  if (refreshExpiresAt !== null) {
    toSet.leetsync_refresh_token_expires_at = refreshExpiresAt;
  }
  if (username) {
    toSet.leetsync_username = username;
  }

  await api.storage.local.set(toSet);
}

/**
 * Exchanges a valid refresh token for a new access token and rotated refresh token.
 * @param {string} clientId
 * @param {string} refreshToken
 * @returns {Promise<object>}
 */
export async function refreshAccessToken(clientId, refreshToken) {
  if (!clientId) {
    throw new DeviceAuthError('NO_CLIENT_ID', 'Missing GitHub OAuth Client ID for token refresh.');
  }
  if (!refreshToken) {
    throw new DeviceAuthError('NO_REFRESH_TOKEN', 'No refresh token available.');
  }

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new DeviceAuthError(
      data.error || 'REFRESH_FAILED',
      data.error_description || `GitHub returned error during refresh: ${data.error || res.status}`
    );
  }

  return data; // { access_token, refresh_token, expires_in, refresh_token_expires_in, token_type, scope }
}

/**
 * Central Token Manager:
 * Reads stored authentication, checks expiration, handles silent refresh before expiry,
 * manages concurrency with in-flight lock, and supports fallback on 401.
 *
 * @param {object} api - browser extension API namespace
 * @param {boolean} [forceRefresh=false] - force a refresh attempt (e.g. after receiving a 401)
 * @returns {Promise<{ token: string | null, status: 'valid' | 'refreshed' | 'auth_required' | 'network_error', error?: any }>}
 */
export async function getValidGitHubToken(api, forceRefresh = false) {
  const data = await api.storage.local.get([
    'leetsync_token',
    'leetsync_refresh_token',
    'leetsync_token_expires_at',
    'leetsync_refresh_token_expires_at',
    'leetsync_client_id',
    'leetsync_username',
  ]);

  const token = data.leetsync_token;
  const refreshToken = data.leetsync_refresh_token;
  const expiresAt = data.leetsync_token_expires_at;
  const clientId = data.leetsync_client_id;

  // CASE A: No access token
  if (!token) {
    return { token: null, status: 'auth_required' };
  }

  const now = Date.now();
  const isNearExpiry = expiresAt && now >= (expiresAt - TOKEN_REFRESH_BUFFER_MS);

  // CASE B / D: Token still valid and not near expiry (or non-expiring token without expiresAt)
  if (!forceRefresh && (!expiresAt || !isNearExpiry)) {
    return { token, status: 'valid' };
  }

  // CASE C / E: Expired / near expiry OR forceRefresh after 401
  if (refreshToken && clientId) {
    // Concurrency protection: reuse in-flight refresh promise
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const newTokens = await refreshAccessToken(clientId, refreshToken);
          await saveTokenPair(api, newTokens, data.leetsync_username);
          return { token: newTokens.access_token, status: 'refreshed' };
        } catch (err) {
          // If network failure, do not delete tokens!
          if (err && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network'))) {
            return { token, status: 'network_error', error: err };
          }
          // Genuine refresh failure (revoked / expired refresh token):
          // Clear authentication tokens only (preserve repository hook!)
          await api.storage.local.set({
            leetsync_token: null,
            leetsync_refresh_token: null,
            leetsync_token_expires_at: null,
            leetsync_refresh_token_expires_at: null,
            leetsync_username: null,
            leetsync_session_active: false,
          });
          return { token: null, status: 'auth_required', error: err };
        } finally {
          refreshPromise = null;
        }
      })();
    }

    return await refreshPromise;
  }

  // If near expiry or forceRefresh, but no refresh token exists:
  if (forceRefresh) {
    // 401 with no refresh token (legacy token revoked/expired):
    await api.storage.local.set({
      leetsync_token: null,
      leetsync_refresh_token: null,
      leetsync_token_expires_at: null,
      leetsync_refresh_token_expires_at: null,
      leetsync_username: null,
      leetsync_session_active: false,
    });
    return { token: null, status: 'auth_required' };
  }

  // Non-expiring token with no refresh token: use as-is
  return { token, status: 'valid' };
}

/**
 * Authenticated GitHub fetch wrapper with 401 retry and automatic token refresh.
 * @param {object} api
 * @param {string} url
 * @param {RequestInit} [options={}]
 * @returns {Promise<Response>}
 */
export async function githubFetch(api, url, options = {}) {
  const auth = await getValidGitHubToken(api);
  if (!auth.token) {
    throw new DeviceAuthError('AUTH_REQUIRED', 'GitHub authentication is required.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `token ${auth.token}`);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/vnd.github.v3+json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401: attempt ONE silent refresh and retry
  if (res.status === 401) {
    const refreshedAuth = await getValidGitHubToken(api, true);
    if (refreshedAuth.token && refreshedAuth.token !== auth.token) {
      headers.set('Authorization', `token ${refreshedAuth.token}`);
      return await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  return res;
}

export { DeviceAuthError };

