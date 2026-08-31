let api = isChrome() ? chrome : isFirefox() ? browser : undefined;

// const ONE_HOUR_MS = 60 * 60 * 1000;

api.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Allow persistent stats to sync on repo link
    api.storage.local.set({ sync_stats: true });

    // Send new installs straight to the settings page to configure their
    // own GitHub OAuth App and connect their account.
    const settingsUrl = api.runtime.getURL('options.html');
    api.tabs.create({ url: settingsUrl, active: true });
  }
});

api.runtime.onMessage.addListener(handleMessage);

/*
 * NOTE on authentication: GitHub sign-in for LeetSync happens entirely on the
 * Options page (options.html / scripts/options.js) using GitHub's OAuth
 * Device Flow. That page writes `leetsync_token` / `leetsync_username`
 * directly to chrome.storage.local once the user approves access on
 * github.com, so no message-passing "pipe" through this background script
 * is needed for auth anymore.
 */
function handleMessage(request, sender, sendResponse) {
  if (request && request.type === 'LEETCODE_SUBMISSION') {
    const listener = function (details) {
      if (details && details.url) {
        const match = details.url.match(/\/submissions\/(\d+)/);
        if (match && match[1]) {
          sendResponse({ submissionId: match[1] });
          api.webNavigation.onHistoryStateUpdated.removeListener(listener);
        }
      }
    };
    api.webNavigation.onHistoryStateUpdated.addListener(
      listener,
      { url: [{ hostSuffix: 'leetcode.com' }, { pathContains: 'submissions' }] }
    );
  }
  return true;
}

function isChrome() {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
}

function isFirefox() {
  return typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
}
