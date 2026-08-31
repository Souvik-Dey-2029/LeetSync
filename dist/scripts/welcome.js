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
  }
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof globalThis !== 'undefined' && globalThis.chrome && globalThis.chrome[prop]) {
          return globalThis.chrome[prop];
        }
        if (prop === 'storage') {
          return {
            local: {
              get: (...args) =>
                globalThis.chrome?.storage?.local?.get
                  ? globalThis.chrome.storage.local.get(...args)
                  : Promise.resolve({}),
              set: (...args) =>
                globalThis.chrome?.storage?.local?.set
                  ? globalThis.chrome.storage.local.set(...args)
                  : Promise.resolve(),
            },
          };
        }
        if (prop === 'runtime') {
          return {
            sendMessage: (...args) =>
              globalThis.chrome?.runtime?.sendMessage
                ? globalThis.chrome.runtime.sendMessage(...args)
                : Promise.resolve({}),
          };
        }
        return undefined;
      },
    }
  );
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

function getDifficultyFolder(difficulty) {
  const diff = getDifficulty(difficulty);
  if (diff === DIFFICULTY.EASY) return 'Easy';
  if (diff === DIFFICULTY.MEDIUM) return 'Medium';
  if (diff === DIFFICULTY.HARD) return 'Hard';
  return 'Easy';
}

function getLangSlug(language) {
  if (!language) return 'code';
  const norm = String(language).trim().toLowerCase();
  if (norm === 'java') return 'java';
  if (norm === 'python' || norm === 'python3' || norm === 'pandas') return 'python';
  if (norm === 'c++' || norm === 'cpp') return 'cpp';
  if (norm === 'c') return 'c';
  if (norm === 'javascript' || norm === 'js') return 'javascript';
  if (norm === 'typescript' || norm === 'ts') return 'typescript';
  if (norm === 'c#' || norm === 'cs' || norm === 'csharp') return 'csharp';
  if (norm === 'go' || norm === 'golang') return 'go';
  if (norm === 'rust') return 'rust';
  if (norm === 'kotlin') return 'kotlin';
  if (norm === 'swift') return 'swift';
  if (norm === 'php') return 'php';
  if (norm === 'ruby') return 'ruby';
  if (norm === 'scala') return 'scala';
  if (norm === 'dart') return 'dart';
  if (norm === 'elixir') return 'elixir';
  if (norm === 'erlang') return 'erlang';
  if (norm === 'racket') return 'racket';
  if (norm === 'mysql' || norm === 'ms sql server' || norm === 'oracle' || norm === 'sql') return 'sql';
  return norm.replace(/\+\+/g, 'cpp').replace(/#/g, 'csharp').replace(/\s+/g, '-');
}

function languageKeyFromExt(extOrName) {
  if (!extOrName) return 'Java';
  if (languages[extOrName]) return extOrName;
  const ext = extOrName.startsWith('.') ? extOrName : `.${extOrName}`;
  const found = Object.entries(languages).find(([_key, val]) => val === ext);
  return found ? found[0] : 'Code';
}

function getSolutionFilename(language, approachNumber = 1) {
  const ext = languages[language] || (languages[languageKeyFromExt(language)] || '.txt');
  const slug = getLangSlug(language);
  if (approachNumber <= 1) {
    return `solution-${slug}${ext}`;
  }
  return `solution-${slug}-approach-${approachNumber}${ext}`;
}

function formatProblemFolderName(numericId, slug, problemName) {
  if (numericId != null && numericId !== '') {
    const numStr = String(numericId).trim();
    const padded = addLeadingZeros(numStr);
    const cleanSlug = slug ? convertToSlug(slug) : '';
    return cleanSlug ? `${padded}-${cleanSlug}` : padded;
  }
  if (slug != null && slug !== '') {
    return convertToSlug(slug);
  }
  if (problemName != null && problemName !== '') {
    return problemName;
  }
  return 'unknown-problem';
}

function getNewProblemPath(difficulty, numericId, slug, problemName) {
  const folderName = formatProblemFolderName(numericId, slug, problemName);
  const diffFolder = getDifficultyFolder(difficulty);
  return `${diffFolder}/${folderName}`;
}

function matchesProblem(dirName, problemName, numericId, slug) {
  if (!dirName) return false;
  const cleanDir = dirName.replace(/^(Easy|Medium|Hard)\//i, '');
  if (problemName) {
    const cleanProblem = problemName.replace(/^(Easy|Medium|Hard)\//i, '');
    if (cleanDir === cleanProblem || dirName === problemName) return true;
  }

  if (numericId != null && numericId !== '') {
    const numStr = String(numericId).trim();
    const padded = addLeadingZeros(numStr);
    if (cleanDir === padded || cleanDir.startsWith(`${padded}-`) || cleanDir.startsWith(`${numStr}-`)) {
      return true;
    }
  }

  if (slug && slug.trim() !== '') {
    const cleanSlug = slug.trim().toLowerCase();
    if (cleanDir.toLowerCase() === cleanSlug || cleanDir.toLowerCase().endsWith(`-${cleanSlug}`)) {
      return true;
    }
  }

  return false;
}





;// CONCATENATED MODULE: ./scripts/welcome.js


const api = getBrowser();

$('#settings_link').attr('href', api.runtime.getURL('options.html'));

const welcome_option = () => {
  return $('#type').val();
};

const repositoryName = () => {
  return $('#name').val().trim();
};

const createRepoDescription =
  'A collection of LeetCode questions to ace the coding interview! - Synced using LeetSync';

/* Sync's local storage with persistent stats and returns the pulled stats. Currently only syncs when we install, or unlink then relink */
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

  // emulate the nested return obj of api.storage.local.get('stats')
  return { stats: pStats.leetcode };
};

const getCreateErrorString = (statusCode, name) => {
  /* Status codes for creating of repo */
  const errorStrings = {
    304: `Error creating ${name} - Unable to modify repository. Try again later!`,
    400: `Error creating ${name} - Bad POST request, make sure you're not overriding any existing scripts`,
    401: `Error creating ${name} - Unauthorized access to repo. Try again later!`,
    403: `Error creating ${name} - Forbidden access to repository. Try again later!`,
    422: `Error creating ${name} - Unprocessable Entity. Repository may have already been created. Try Linking instead (select 2nd option).`,
  };
  return errorStrings[statusCode];
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
  api.storage.local.set({ mode_type: 'commit', leetsync_hook: res.full_name });
  await api.storage.local.remove('stats');
  $('#error').hide();
  $('#success').html(
    `Successfully created <a target="blank" href="${res.html_url}">${name}</a>. Start <a href="http://leetcode.com">LeetCoding</a>!`
  );
  $('#success').show();
  $('#unlink').show();
  /* Show new layout */
  document.getElementById('hook_mode').style.display = 'none';
  document.getElementById('commit_mode').style.display = 'inherit';
};

const getLinkErrorString = (statusCode, name) => {
  /* Status codes for linking repo */
  const errorStrings = {
    301: `Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to LeetSync. <br> This repository has been moved permenantly. Try creating a new one.`,
    403: `Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to LeetSync. <br> Forbidden action. Please make sure you have the right access to this repository.`,
    404: `Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to LeetSync. <br> Resource not found. Make sure you enter the right repository name.`,
  };
  return errorStrings[statusCode];
};
/* Status codes for linking of repo */
const handleLinkRepoError = (statusCode, name) => {
  $('#success').hide();
  $('#error').html(getLinkErrorString(statusCode, name));
  $('#error').show();
  $('#unlink').show();
};

/* 
    Method for linking hook with an existing repository 
    Steps:
    1. Check if existing repository exists and the user has write access to it.
    2. Link Hook to it (chrome Storage).
*/
const linkRepo = (token, name) => {
  const AUTHENTICATION_URL = `https://api.github.com/repos/${name}`;

  const xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function () {
    if (xhr.readyState !== 4) {
      return;
    }
    if (xhr.status !== 200) {
      // BUG FIX
      // unable to gain access to repo in commit mode. Must switch to hook mode.
      /* Set mode type to hook and Repo Hook to NONE */
      handleLinkRepoError(xhr.status, name);
      api.storage.local.set({ mode_type: 'hook', leetsync_hook: null }, () => {
        console.log(`Error linking ${name} to LeetSync`);
        console.log('Defaulted repo hook to NONE');
      });

      /* Hide accordingly */
      document.getElementById('hook_mode').style.display = 'inherit';
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
        console.log('Successfully set new repo hook');
      }
    );
    /* Get Persistent Stats or Create new stats */
    api.storage.local
      .get('sync_stats')
      .then(data => (data?.sync_stats ? syncStats() : api.storage.local.get('stats')))
      .then(data => {
        /* Get problems solved count */
        const stats = data?.stats;
        $('#p_solved').text(stats?.solved ?? 0);
        $('#p_solved_easy').text(stats?.easy ?? 0);
        $('#p_solved_medium').text(stats?.medium ?? 0);
        $('#p_solved_hard').text(stats?.hard ?? 0);
      });

    /* Hide accordingly */
    document.getElementById('hook_mode').style.display = 'none';
    document.getElementById('commit_mode').style.display = 'inherit';
  });

  xhr.open('GET', AUTHENTICATION_URL, true);
  xhr.setRequestHeader('Authorization', `token ${token}`);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhr.send();
};

const unlinkRepo = () => {
  /* Reset mode type to hook, stats to null */
  api.storage.local.set(
    { mode_type: 'hook', leetsync_hook: null, sync_stats: true, stats: null },
    () => {
      console.log(`Unlinked repo`);
      console.log('Cleared local stats');
    }
  );

  /* Hide accordingly */
  document.getElementById('hook_mode').style.display = 'inherit';
  document.getElementById('commit_mode').style.display = 'none';
};

/* Check for value of select tag, Get Started disabled by default */

$('#type').on('change', function () {
  const valueSelected = this.value;
  if (valueSelected) {
    $('#hook_button').attr('disabled', false);
  } else {
    $('#hook_button').attr('disabled', true);
  }
});

$('#hook_button').on('click', () => {
  /* on click should generate: 1) option 2) repository name */
  if (!welcome_option()) {
    $('#error').text(
      'No option selected - Pick an option from dropdown menu below that best suits you!'
    );
    $('#error').show();
  } else if (!repositoryName()) {
    $('#error').text('No repository name added - Enter the name of your repository!');
    $('#name').focus();
    $('#error').show();
  } else {
    $('#error').hide();
    $('#success').text('Attempting to create Hook... Please wait.');
    $('#success').show();

    /* 
      Perform processing
      - step 1: Check if current stage === hook.
      - step 2: store repo name as repoName in chrome storage.
      - step 3: if (1), POST request to repoName (iff option = create new repo) ; else display error message.
      - step 4: if proceed from 3, hide hook_mode and display commit_mode (show stats e.g: files pushed/questions-solved/leaderboard)
    */
    api.storage.local.get('leetsync_token', data => {
      const token = data.leetsync_token;
      if (token === null || token === undefined) {
        /* Not authorized yet. */
        $('#error').text(
          'Authorization error - Grant LeetSync access to your GitHub account to continue (launch extension to proceed)'
        );
        $('#error').show();
        $('#success').hide();
      } else if (welcome_option() === 'new') {
        createRepo(token, repositoryName());
      } else {
        api.storage.local.get('leetsync_username', data2 => {
          const username = data2.leetsync_username;
          if (!username) {
            /* Improper authorization. */
            $('#error').text(
              'Improper Authorization error - Grant LeetSync access to your GitHub account to continue (launch extension to proceed)'
            );
            $('#error').show();
            $('#success').hide();
          } else {
            linkRepo(token, `${username}/${repositoryName()}`, false);
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

/* Detect mode type */
api.storage.local.get('mode_type', data => {
  const mode = data.mode_type;

  if (mode && mode === 'commit') {
    /* Check if still access to repo */
    api.storage.local.get('leetsync_token', data2 => {
      const token = data2.leetsync_token;
      if (token === null || token === undefined) {
        /* Not authorized yet. */
        $('#error').text(
          'Authorization error - Grant LeetSync access to your GitHub account to continue (click LeetSync extension on the top right to proceed)'
        );
        $('#error').show();
        $('#success').hide();
        /* Hide accordingly */
        document.getElementById('hook_mode').style.display = 'inherit';
        document.getElementById('commit_mode').style.display = 'none';
      } else {
        /* Get access to repo */
        api.storage.local.get('leetsync_hook', repoName => {
          const hook = repoName.leetsync_hook;
          if (!hook) {
            /* Not authorized yet. */
            $('#error').text(
              'Improper Authorization error - Grant LeetSync access to your GitHub account to continue (click LeetSync extension on the top right to proceed)'
            );
            $('#error').show();
            $('#success').hide();
            /* Hide accordingly */
            document.getElementById('hook_mode').style.display = 'inherit';
            document.getElementById('commit_mode').style.display = 'none';
          } else {
            /* Username exists, at least in storage. Confirm this */
            linkRepo(token, hook);
          }
        });
      }
    });

    document.getElementById('hook_mode').style.display = 'none';
    document.getElementById('commit_mode').style.display = 'inherit';
  } else {
    document.getElementById('hook_mode').style.display = 'inherit';
    document.getElementById('commit_mode').style.display = 'none';
  }
});

/******/ })()
;