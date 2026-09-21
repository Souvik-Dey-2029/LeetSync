import { getBrowser } from "./leetcode/util.js";
import { getValidGitHubToken, githubFetch } from "./githubDeviceAuth.js";

const api = getBrowser();

function openSettings() {
  if (api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  } else {
    api.tabs.create({ url: api.runtime.getURL('options.html') });
  }
}

$('#authenticate').on('click', openSettings);
$('#reauthenticate_btn').on('click', openSettings);

/* Set static URLs */
$('#welcome_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#hook_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#reselect_repo_btn').attr('href', api.runtime.getURL('welcome.html'));
$('#settings_URL').attr('href', api.runtime.getURL('options.html'));

/* Stats reset */
$('#reset_stats').on('click', () => {
  $('#reset_confirmation').show();
  $('#reset_yes').off('click').on('click', () => {
    api.storage.local.set({ stats: null });
    $('#p_solved').text(0);
    $('#p_solved_easy').text(0);
    $('#p_solved_medium').text(0);
    $('#p_solved_hard').text(0);
    $('#reset_confirmation').hide();
  });
  $('#reset_no').off('click').on('click', () => {
    $('#reset_confirmation').hide();
  });
});

/* Explicit Disconnect */
$('#disconnect_link').on('click', async e => {
  e.preventDefault();
  if (confirm('Are you sure you want to disconnect your GitHub account and repository?')) {
    await api.storage.local.set({
      leetsync_token: null,
      leetsync_refresh_token: null,
      leetsync_token_expires_at: null,
      leetsync_refresh_token_expires_at: null,
      leetsync_username: null,
      mode_type: 'hook',
      leetsync_hook: null,
      leetsync_session_active: false,
    });
    showState(1);
  }
});

/* Session Start / Stop Button Handler */
$('#session_toggle_btn').on('click', async () => {
  const { leetsync_session_active } = await api.storage.local.get('leetsync_session_active');
  const nextState = !leetsync_session_active;
  await api.storage.local.set({ leetsync_session_active: nextState });
  updateSessionUI(nextState);
});

function updateSessionUI(isActive) {
  if (isActive) {
    $('#session_status_indicator')
      .removeClass('status-ready')
      .addClass('status-active')
      .html('● Active');
    $('#session_toggle_btn')
      .removeClass('positive')
      .addClass('negative')
      .html('<i class="icon stop"></i> STOP');
  } else {
    $('#session_status_indicator')
      .removeClass('status-active')
      .addClass('status-ready')
      .html('○ Ready');
    $('#session_toggle_btn')
      .removeClass('negative')
      .addClass('positive')
      .html('<i class="icon play"></i> START');
  }
}

function hideAllModes() {
  $('#auth_mode').hide();
  $('#auth_invalid_mode').hide();
  $('#hook_mode').hide();
  $('#repo_unavailable_mode').hide();
  $('#commit_mode').hide();
  $('#disconnect_link').hide();
}

/**
 * State 1: NOT AUTHENTICATED
 * State 2: AUTHENTICATED, NO REPOSITORY
 * State 3/4: READY / ACTIVE (COMMIT MODE)
 * State 5: INVALID AUTHENTICATION
 * State 6: REPOSITORY UNAVAILABLE
 */
function showState(state, data = {}) {
  hideAllModes();

  switch (state) {
    case 1:
      $('#auth_mode').show();
      break;

    case 2:
      $('#hook_username').text(data.username || 'User');
      $('#hook_mode').show();
      $('#disconnect_link').show();
      break;

    case 3:
    case 4:
      $('#user_display').text(data.username || 'User');
      if (data.hook) {
        $('#repo_url').html(
          `<a target="_blank" style="color: #0969da !important; font-weight: 600;" href="https://github.com/${data.hook}">${data.hook}</a>`
        );
      }
      const stats = data.stats;
      $('#p_solved').text(stats?.solved ?? 0);
      $('#p_solved_easy').text(stats?.easy ?? 0);
      $('#p_solved_medium').text(stats?.medium ?? 0);
      $('#p_solved_hard').text(stats?.hard ?? 0);

      updateSessionUI(!!data.sessionActive);
      $('#commit_mode').show();
      $('#disconnect_link').show();
      break;

    case 5:
      $('#auth_invalid_mode').show();
      $('#disconnect_link').show();
      break;

    case 6:
      $('#unavail_username').text(data.username || 'User');
      $('#repo_unavailable_mode').show();
      $('#disconnect_link').show();
      break;
  }
}

async function validateGitHubToken(token) {
  try {
    const res = await githubFetch(api, 'https://api.github.com/user');

    if (res.status === 200) {
      const user = await res.json();
      return { status: 200, user };
    } else if (res.status === 401) {
      return { status: 401 };
    } else {
      return { status: res.status };
    }
  } catch (err) {
    // Network failure, offline, timeout
    return { status: 0, networkError: true };
  }
}

async function validateRepository(token, hook) {
  try {
    const res = await githubFetch(api, `https://api.github.com/repos/${hook}`);

    if (res.status === 200) {
      return { status: 200 };
    } else if (res.status === 404 || res.status === 403) {
      return { status: res.status };
    } else {
      return { status: res.status };
    }
  } catch (err) {
    // Network failure
    return { status: 0, networkError: true };
  }
}

/* Initialization */
async function initPopup() {
  const data = await api.storage.local.get([
    'leetsync_token',
    'leetsync_username',
    'leetsync_hook',
    'mode_type',
    'stats',
    'leetsync_session_active',
  ]);

  const token = data.leetsync_token;
  let username = data.leetsync_username;
  const hook = data.leetsync_hook;
  const mode = data.mode_type;
  const stats = data.stats;
  const sessionActive = data.leetsync_session_active;

  if (!token) {
    showState(1);
    return;
  }

  // Validate GitHub Token safely (getValidGitHubToken will auto-refresh if near expiry)
  const authValidation = await validateGitHubToken(token);

  if (authValidation.status === 401) {
    // Confirmed invalid / revoked token: clear credentials, but PRESERVE leetsync_hook!
    await api.storage.local.set({
      leetsync_token: null,
      leetsync_refresh_token: null,
      leetsync_token_expires_at: null,
      leetsync_refresh_token_expires_at: null,
      leetsync_username: null,
      leetsync_session_active: false,
    });
    showState(5);
    return;
  }

  if (authValidation.status === 200 && authValidation.user) {
    username = authValidation.user.login || username;
    if (username && username !== data.leetsync_username) {
      await api.storage.local.set({ leetsync_username: username });
    }
  }
  // If status === 0 (network failure / offline), DO NOT clear token. Continue with cached credentials!

  if (!hook || mode !== 'commit') {
    showState(2, { username });
    return;
  }

  // Validate connected repository safely
  const repoValidation = await validateRepository(token, hook);

  if (repoValidation.status === 404 || repoValidation.status === 403) {
    // Repository unavailable, but keep GitHub token intact!
    showState(6, { username, hook });
    return;
  }

  // Ready or Active
  showState(3, {
    username,
    hook,
    stats,
    sessionActive,
  });
}

initPopup();
