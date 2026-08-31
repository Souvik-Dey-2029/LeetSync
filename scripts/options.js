/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./scripts/leetcode/util.js
/** Enum for languages supported by LeetCode. */
const languages = Object.freeze({
  C: '.c',
  'C++': '.cpp',
  'C#': '.cs',
  Dart: '.dart',
  Elixir: '.ex',
  Erlang: '.erl',
  Go: '.go',
  Java: '.java',
  JavaScript: '.js',
  Javascript: '.js',
  Kotlin: '.kt',
  MySQL: '.sql',
  'MS SQL Server': '.sql',
  Oracle: '.sql',
  Pandas: '.py',
  PHP: '.php',
  Python: '.py',
  Python3: '.py',
  Racket: '.rkt',
  Ruby: '.rb',
  Rust: '.rs',
  Scala: '.scala',
  Swift: '.swift',
  TypeScript: '.ts',
});

/** @enum */
const DIFFICULTY = Object.freeze({
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  UNKNOWN: 'Unknown',
});

class LeetSyncError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LeetSyncErr';
  }
}

function isEmptyObject(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

function assert(truthy, msg) {
  if (!truthy) {
    throw new LeetSyncError(msg);
  }
}

/**
 * Returns a function that can be immediately invoked but will start
 * a timeout of 'wait' milliseconds before it can be called again.
 * @param {Function} func to be called after wait
 * @param {number} wait time in ms
 * @param {boolean} invokeBeforeTimeout true if you want to invoke func before waiting
 * @returns {Function}
 */
function debounce(func, wait, invokeBeforeTimeout) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!invokeBeforeTimeout) func.apply(context, args);
    };
    const callNow = invokeBeforeTimeout && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Delays the execution of a function by the specified time (in milliseconds)
 * and then executes the function with the provided arguments.
 *
 * @param {Function} func - The function to be executed after the delay.
 * @param {number} wait - The number of milliseconds to wait before executing the function.
 * @param {...*} [args] - Additional arguments to pass to the function when it is called.
 * @returns {Promise<*>} A promise that resolves with the result of the function execution.
 */
function delay(func, wait, ...args) {
  return new Promise(resolve => setTimeout(() => resolve(func(...args)), wait));
}

/**
 *
 * @returns {chrome | browser} namespace of browser extension api
 */
function getBrowser() {
  if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') {
    return chrome;
  } else if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
    return browser;
  } else {
    throw new LeetSyncError('BrowserNotSupported');
  }
}

/**
 * Returns the difficulty in PascalCase for a given difficulty
 * @param {string} difficulty - The difficulty level as a string: "easy", "medium", "hard", etc.
 * @returns {string} - The difficulty level in PascalCase: "Easy", "Medium", or "Hard" or "Unknown" for unrecognized values.
 */
function getDifficulty(difficulty) {
  difficulty &&= difficulty.toUpperCase().trim();
  return DIFFICULTY[difficulty] ?? DIFFICULTY.UNKNOWN;
}

/**
 * Checks if an HTML Collection exists and has elements
 * @param {HTMLCollectionOf<Element>} elem
 * @returns
 */
function checkElem(elem) {
  return elem && elem.length > 0;
}

/** @param {string} string @returns {string} problem slug, e.g. 0001-two-sum */
function convertToSlug(string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

function addLeadingZeros(title) {
  const maxTitlePrefixLength = 4;
  var len = title.split('-')[0].length;
  if (len < maxTitlePrefixLength) {
    return '0'.repeat(4 - len) + title;
  }
  return title;
}

function formatStats(time, timePercentile, space, spacePercentile) {
  return `Time: ${time} (${timePercentile}%), Space: ${space} (${spacePercentile}%) - LeetSync`;
}

function isObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

function mergeDeep(target, source) {
  for (const key in source) {
    if (isObject(source[key])) {
      if (!target[key]) {
        Object.assign(target, { [key]: {} });
      }
      mergeDeep(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
}

function mergeStats(obj1, obj2) {
  function countDifficulties(shas) {
    const difficulties = { easy: 0, medium: 0, hard: 0, solved: 0 };
    for (const problem in shas) {
      if ('difficulty' in shas[problem]) {
        const difficulty = shas[problem].difficulty;
        if (difficulty in difficulties) {
          difficulties[difficulty]++;
        }
      }
    }
    for (let value of Object.values(difficulties)) {
      difficulties.solved += value;
    }
    return difficulties;
  }

  const merged = {};
  mergeDeep(merged, obj1);
  mergeDeep(merged, obj2);

  const shas = merged.shas || {};
  const difficulties = countDifficulties(shas);

  merged.easy = difficulties.easy;
  merged.medium = difficulties.medium;
  merged.hard = difficulties.hard;
  merged.solved = difficulties.solved;

  return merged;
}



;// CONCATENATED MODULE: ./scripts/githubDeviceAuth.js
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

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const DEFAULT_SCOPE = 'repo';

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
async function requestDeviceCode(clientId, scope = DEFAULT_SCOPE) {
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
async function pollForAccessToken(clientId, deviceCode, intervalSeconds, abortSignal = { cancelled: false }, onTick) {
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
async function fetchGitHubUser(token) {
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



;// CONCATENATED MODULE: ./scripts/options.js



const api = getBrowser();

const clientIdInput = document.getElementById('client_id');
const saveClientIdBtn = document.getElementById('save_client_id');
const clientIdStatus = document.getElementById('client_id_status');

const notConnectedEl = document.getElementById('not_connected');
const deviceFlowEl = document.getElementById('device_flow');
const connectedEl = document.getElementById('connected');
const connectBtn = document.getElementById('connect_btn');
const cancelBtn = document.getElementById('cancel_btn');
const disconnectBtn = document.getElementById('disconnect_btn');
const userCodeEl = document.getElementById('user_code');
const verificationLinkEl = document.getElementById('verification_link');
const pollStatusEl = document.getElementById('poll_status');
const connectedUsernameEl = document.getElementById('connected_username');
const authErrorEl = document.getElementById('auth_error');

let pollAbort = { cancelled: false };

function showStatus(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

function showAuthError(message) {
  showStatus(authErrorEl, message);
}

function setView(view) {
  notConnectedEl.hidden = view !== 'not_connected';
  deviceFlowEl.hidden = view !== 'device_flow';
  connectedEl.hidden = view !== 'connected';
}

async function loadClientId() {
  const { leetsync_client_id } = await api.storage.local.get('leetsync_client_id');
  if (leetsync_client_id) {
    clientIdInput.value = leetsync_client_id;
  }
}

async function loadConnectionState() {
  const { leetsync_token, leetsync_username } = await api.storage.local.get([
    'leetsync_token',
    'leetsync_username',
  ]);
  if (leetsync_token && leetsync_username) {
    connectedUsernameEl.textContent = leetsync_username;
    setView('connected');
  } else {
    setView('not_connected');
  }
}

saveClientIdBtn.addEventListener('click', async () => {
  const value = clientIdInput.value.trim();
  if (!value) {
    showStatus(clientIdStatus, 'Please enter a Client ID first.');
    return;
  }
  await api.storage.local.set({ leetsync_client_id: value });
  showStatus(clientIdStatus, 'Saved.');
  setTimeout(() => showStatus(clientIdStatus, ''), 2000);
});

connectBtn.addEventListener('click', async () => {
  showAuthError('');
  const { leetsync_client_id } = await api.storage.local.get('leetsync_client_id');

  if (!leetsync_client_id) {
    showAuthError('Save your GitHub OAuth App Client ID above before connecting.');
    return;
  }

  try {
    const device = await requestDeviceCode(leetsync_client_id);

    userCodeEl.textContent = device.user_code;
    verificationLinkEl.href = device.verification_uri;
    verificationLinkEl.textContent = device.verification_uri;
    showStatus(pollStatusEl, 'Waiting for you to approve on GitHub…');
    setView('device_flow');

    // Open GitHub's device activation page for convenience.
    api.tabs.create({ url: device.verification_uri, active: true });

    pollAbort = { cancelled: false };
    const tokenData = await pollForAccessToken(
      leetsync_client_id,
      device.device_code,
      device.interval,
      pollAbort
    );

    if (!tokenData) {
      // Cancelled by the user.
      setView('not_connected');
      return;
    }

    const user = await fetchGitHubUser(tokenData.access_token);

    await api.storage.local.set({
      leetsync_token: tokenData.access_token,
      leetsync_username: user.login,
    });

    connectedUsernameEl.textContent = user.login;
    setView('connected');
  } catch (err) {
    console.error(err);
    showAuthError(err.message || 'Something went wrong while connecting to GitHub.');
    setView('not_connected');
  }
});

cancelBtn.addEventListener('click', () => {
  pollAbort.cancelled = true;
  setView('not_connected');
});

disconnectBtn.addEventListener('click', async () => {
  await api.storage.local.set({
    leetsync_token: null,
    leetsync_username: null,
    mode_type: 'hook',
    leetsync_hook: null,
  });
  setView('not_connected');
});

loadClientId();
loadConnectionState();

/******/ })()
;