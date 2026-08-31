import { getBrowser } from './leetcode/util.js';
import { requestDeviceCode, pollForAccessToken, fetchGitHubUser } from './githubDeviceAuth.js';

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
