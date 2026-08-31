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

export { DeviceAuthError };
