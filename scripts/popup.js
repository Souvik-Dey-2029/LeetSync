import { getBrowser } from "./leetcode/util.js";

let action = false;

let api = getBrowser()

$('#authenticate').on('click', () => {
  if (action) {
    // Authentication now happens on the extension's own Options page, via
    // GitHub's Device Flow, using the installer's own OAuth App Client ID.
    if (api.runtime.openOptionsPage) {
      api.runtime.openOptionsPage();
    } else {
      api.tabs.create({ url: api.runtime.getURL('options.html') });
    }
  }
});

/* Get URL for welcome/settings pages */
$('#welcome_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#hook_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#settings_URL').attr('href', api.runtime.getURL('options.html'));
$('#reset_stats').on('click', () => {
  $('#reset_confirmation').show();
  $('#reset_yes').off('click').on('click', () => {
    api.storage.local.set({ stats: null });
    $('#p_solved').text(0);
    $('#p_solved_easy').text(0);
    $('#p_solved_medium').text(0);
    $('#p_solved_hard').text(0);
    $('#reset_confirmation').hide()
  })
  $('#reset_no').off('click').on('click', () => {
    $('#reset_confirmation').hide()
  })
});

api.storage.local.get('leetsync_token', data => {
  const token = data.leetsync_token;
  if (token === null || token === undefined) {
    action = true;
    $('#auth_mode').show();
  } else {
    // To validate user, load user object from GitHub.
    const AUTHENTICATION_URL = 'https://api.github.com/user';

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          /* Show MAIN FEATURES */
          api.storage.local.get('mode_type', data2 => {
            if (data2 && data2.mode_type === 'commit') {
              $('#commit_mode').show();
              /* Get problem stats and repo link */
              api.storage.local.get(['stats', 'leetsync_hook'], data3 => {
                const stats = data3?.stats;
                $('#p_solved').text(stats?.solved ?? 0);
                $('#p_solved_easy').text(stats?.easy ?? 0);
                $('#p_solved_medium').text(stats?.medium ?? 0);
                $('#p_solved_hard').text(stats?.hard ?? 0);
                const leetsyncHook = data3?.leetsync_hook;
                if (leetsyncHook) {
                  $('#repo_url').html(
                    `<a target="blank" style="color: cadetblue !important; font-size:0.8em;" href="https://github.com/${leetsyncHook}">${leetsyncHook}</a>`
                  );
                }
              });
            } else {
              $('#hook_mode').show();
            }
          });
        } else if (xhr.status === 401) {
          // bad oAuth
          // reset token and redirect to authorization process again!
          api.storage.local.set({ leetsync_token: null }, () => {
            console.log('BAD oAuth!!! Redirecting back to oAuth process');
            action = true;
            $('#auth_mode').show();
          });
        }
      }
    });
    xhr.open('GET', AUTHENTICATION_URL, true);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    xhr.send();
  }
});
