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





;// CONCATENATED MODULE: ./scripts/popup.js


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

/******/ })()
;