import { getBrowser } from './leetcode/util.js';

const api = getBrowser();

$('#settings_link').attr('href', api.runtime.getURL('options.html'));

// Populate manifest version dynamically
try {
  const manifest = api.runtime.getManifest();
  if (manifest && manifest.version) {
    $('#ext_version').text(manifest.version);
  }
} catch (e) {}

// Subtle 3D parallax effect for developer side motifs
document.addEventListener('mousemove', e => {
  const mouseX = e.clientX / window.innerWidth - 0.5;
  const mouseY = e.clientY / window.innerHeight - 0.5;

  document.querySelectorAll('.floating-motif').forEach(el => {
    const factor = parseFloat(el.getAttribute('data-parallax') || '0.03');
    const moveX = mouseX * 80 * factor;
    const moveY = mouseY * 80 * factor;
    el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
  });
});

const updateHeaderStatus = (isConnected, repoName, repoUrl) => {
  if (isConnected) {
    $('#status_badge_header')
      .removeClass('disconnected')
      .addClass('connected')
      .html('<span class="status-dot"></span><span id="status_text_header">GitHub Connected</span>');
    if (repoName) {
      $('#display_repo_name').text(repoName);
      const url = repoUrl || `https://github.com/${repoName}`;
      $('#open_repo_btn').attr('href', url).css('display', 'inline-flex');
    }
  } else {
    $('#status_badge_header')
      .removeClass('connected')
      .addClass('disconnected')
      .html('<span class="status-dot"></span><span id="status_text_header">Not Connected</span>');
    $('#display_repo_name').text('No repository connected');
    $('#open_repo_btn').css('display', 'none');
  }
};

const option = () => {
  return $('#type').val();
};

const repositoryName = () => {
  return $('#name').val().trim();
};

const createRepoDescription =
  'A collection of LeetCode questions to ace the coding interview! - Synced using LeetSync';

/* Sync's local storage with persistent stats and returns the pulled stats. */
const syncStats = async () => {
  let { leetsync_hook, leetsync_token, sync_stats, stats } = await api.storage.local.get([
    'leetsync_token',
    'leetsync_hook',
    'sync_stats',
    'stats',
  ]);

  if (sync_stats === false) {
    console.log('Persistent stats already synced!');
    return;
  }

  const URL = `https://api.github.com/repos/${leetsync_hook}/contents/stats.json`;

  let options = {
    method: 'GET',
    headers: {
      Authorization: `token ${leetsync_token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  };

  let resp = await fetch(URL, options);
  if (!resp.ok && resp.status == 404) {
    await api.storage.local.set({ sync_stats: false });
    console.log('No stats found; starting fresh');
    return {};
  }
  let data = await resp.json();
  let pStatsJson = decodeURIComponent(escape(atob(data.content)));
  let pStats = await JSON.parse(pStatsJson);

  api.storage.local.set({ stats: pStats.leetcode, sync_stats: false }, () =>
    console.log(`Successfully synced local stats with GitHub stats`)
  );

  return { stats: pStats.leetcode };
};

const getCreateErrorString = (statusCode, name) => {
  const errorStrings = {
    304: `Error creating ${name} - Unable to modify repository. Try again later!`,
    400: `Error creating ${name} - Bad POST request, make sure you're not overriding any existing scripts`,
    401: `Error creating ${name} - Unauthorized access to repo. Try again later!`,
    403: `Error creating ${name} - Forbidden access to repository. Try again later!`,
    422: `Error creating ${name} - Unprocessable Entity. Repository may have already been created. Try Linking instead (select 2nd option).`,
  };
  return errorStrings[statusCode] || `Error creating ${name} (Status code: ${statusCode})`;
};

const handleRepoCreateError = (statusCode, name) => {
  $('#success').hide();
  $('#error').text(getCreateErrorString(statusCode, name));
  $('#error').show();
};

const createRepo = async (token, name) => {
  const AUTHENTICATION_URL = 'https://api.github.com/user/repos';
  let data = {
    name,
    private: true,
    auto_init: true,
    description: createRepoDescription,
  };

  const options = {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(data),
  };

  let res = await fetch(AUTHENTICATION_URL, options);
  if (!res.ok) {
    return handleRepoCreateError(res.status, name);
  }
  res = await res.json();

  /* Set Repo Hook, and set mode type to commit */
  api.storage.local.set({ mode_type: 'commit', leetsync_hook: res.full_name, repo: res.html_url });
  await api.storage.local.remove('stats');
  $('#error').hide();
  $('#success').html(
    `Successfully created <a target="blank" href="${res.html_url}">${name}</a>. Start <a href="http://leetcode.com">LeetCoding</a>!`
  );
  $('#success').show();
  $('#unlink').show();
  updateHeaderStatus(true, res.full_name, res.html_url);

  /* Show new layout */
  document.getElementById('hook_mode').style.display = 'none';
  document.getElementById('commit_mode').style.display = 'block';
};

const getLinkErrorString = (statusCode, name) => {
  const errorStrings = {
    301: `Error linking <a target="blank" href="https://github.com/${name}">${name}</a> to LeetSync. <br> This repository has been moved permanently. Try creating a new one.`,
    403: `Error linking <a target="blank" href="https://github.com/${name}">${name}</a> to LeetSync. <br> Forbidden action. Please make sure you have write access to this repository.`,
    404: `Error linking <a target="blank" href="https://github.com/${name}">${name}</a> to LeetSync. <br> Resource not found. Make sure you enter the correct repository name.`,
  };
  return errorStrings[statusCode] || `Error linking ${name} (Status code: ${statusCode})`;
};

const handleLinkRepoError = (statusCode, name) => {
  $('#success').hide();
  $('#error').html(getLinkErrorString(statusCode, name));
  $('#error').show();
  $('#unlink').show();
};

const linkRepo = (token, name) => {
  const AUTHENTICATION_URL = `https://api.github.com/repos/${name}`;

  const xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function () {
    if (xhr.readyState !== 4) {
      return;
    }
    if (xhr.status !== 200) {
      handleLinkRepoError(xhr.status, name);
      api.storage.local.set({ mode_type: 'hook', leetsync_hook: null }, () => {
        console.log(`Error linking ${name} to LeetSync`);
        console.log('Defaulted repo hook to NONE');
        updateHeaderStatus(false);
      });

      document.getElementById('hook_mode').style.display = 'block';
      document.getElementById('commit_mode').style.display = 'none';
      return;
    }

    const res = JSON.parse(xhr.responseText);
    api.storage.local.set(
      { mode_type: 'commit', repo: res.html_url, leetsync_hook: res.full_name },
      () => {
        $('#error').hide();
        $('#success').html(
          `Successfully linked <a target="blank" href="${res.html_url}">${name}</a> to LeetSync. Start <a href="http://leetcode.com">LeetCoding</a> now!`
        );
        $('#success').show();
        $('#unlink').show();
        updateHeaderStatus(true, res.full_name, res.html_url);
        console.log('Successfully set new repo hook');
      }
    );

    /* Get Persistent Stats or Create new stats */
    api.storage.local
      .get('sync_stats')
      .then(data => (data?.sync_stats ? syncStats() : api.storage.local.get('stats')))
      .then(data => {
        const stats = data?.stats;
        $('#p_solved').text(stats?.solved ?? 0);
        $('#p_solved_easy').text(stats?.easy ?? 0);
        $('#p_solved_medium').text(stats?.medium ?? 0);
        $('#p_solved_hard').text(stats?.hard ?? 0);
      });

    document.getElementById('hook_mode').style.display = 'none';
    document.getElementById('commit_mode').style.display = 'block';
  });

  xhr.open('GET', AUTHENTICATION_URL, true);
  xhr.setRequestHeader('Authorization', `token ${token}`);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhr.send();
};

const unlinkRepo = () => {
  api.storage.local.set(
    { mode_type: 'hook', leetsync_hook: null, sync_stats: true, stats: null },
    () => {
      console.log(`Unlinked repo`);
      console.log('Cleared local stats');
      updateHeaderStatus(false);
    }
  );

  document.getElementById('hook_mode').style.display = 'block';
  document.getElementById('commit_mode').style.display = 'none';
};

$('#type').on('change', function () {
  const valueSelected = this.value;
  if (valueSelected) {
    $('#hook_button').attr('disabled', false);
  } else {
    $('#hook_button').attr('disabled', true);
  }
});

$('#hook_button').on('click', () => {
  if (!option()) {
    $('#error').text('No option selected - Pick an option from the dropdown menu!');
    $('#error').show();
  } else if (!repositoryName()) {
    $('#error').text('No repository name added - Enter the name of your repository!');
    $('#name').focus();
    $('#error').show();
  } else {
    $('#error').hide();
    $('#success').text('Attempting to set up hook... Please wait.');
    $('#success').show();

    api.storage.local.get('leetsync_token', data => {
      const token = data.leetsync_token;
      if (token === null || token === undefined) {
        $('#error').text(
          'Authorization error - Grant LeetSync access to your GitHub account in options to continue.'
        );
        $('#error').show();
        $('#success').hide();
      } else if (option() === 'new') {
        createRepo(token, repositoryName());
      } else {
        api.storage.local.get('leetsync_username', data2 => {
          const username = data2.leetsync_username;
          if (!username) {
            $('#error').text(
              'Improper Authorization error - Grant LeetSync access to your GitHub account to continue.'
            );
            $('#error').show();
            $('#success').hide();
          } else {
            linkRepo(token, `${username}/${repositoryName()}`);
          }
        });
      }
    });
  }
});

$('#unlink a').on('click', () => {
  unlinkRepo();
  $('#unlink').hide();
  $('#success').text('Successfully unlinked your current git repo. Please create/link a new hook.');
});

/* Detect mode type and initialize dashboard */
api.storage.local.get(['mode_type', 'leetsync_hook', 'repo', 'leetsync_token'], data => {
  const mode = data.mode_type;
  const token = data.leetsync_token;

  if (mode && mode === 'commit') {
    if (!token) {
      $('#error').text(
        'Authorization error - Grant LeetSync access to your GitHub account in options to continue.'
      );
      $('#error').show();
      $('#success').hide();
      updateHeaderStatus(false);
      document.getElementById('hook_mode').style.display = 'block';
      document.getElementById('commit_mode').style.display = 'none';
    } else {
      const hook = data.leetsync_hook;
      if (!hook) {
        $('#error').text(
          'Improper Authorization error - Grant LeetSync access to your GitHub account in options to continue.'
        );
        $('#error').show();
        $('#success').hide();
        updateHeaderStatus(false);
        document.getElementById('hook_mode').style.display = 'block';
        document.getElementById('commit_mode').style.display = 'none';
      } else {
        updateHeaderStatus(true, hook, data.repo);
        linkRepo(token, hook);
      }
    }
  } else {
    updateHeaderStatus(false);
    document.getElementById('hook_mode').style.display = 'block';
    document.getElementById('commit_mode').style.display = 'none';
  }
});
