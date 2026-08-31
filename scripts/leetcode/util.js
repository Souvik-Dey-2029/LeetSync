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

function normalizeLanguageDir(language) {
  if (!language) return 'Code';
  const norm = String(language).trim().toLowerCase();
  if (norm === 'java') return 'Java';
  if (norm === 'python' || norm === 'python3' || norm === 'pandas') return 'Python';
  if (norm === 'c++' || norm === 'cpp') return 'C++';
  if (norm === 'c') return 'C';
  if (norm === 'javascript' || norm === 'js') return 'JavaScript';
  if (norm === 'typescript' || norm === 'ts') return 'TypeScript';
  if (norm === 'c#' || norm === 'cs' || norm === 'csharp') return 'CSharp';
  if (norm === 'go' || norm === 'golang') return 'Go';
  if (norm === 'rust') return 'Rust';
  if (norm === 'kotlin') return 'Kotlin';
  if (norm === 'swift') return 'Swift';
  if (norm === 'php') return 'PHP';
  if (norm === 'mysql' || norm === 'ms sql server' || norm === 'oracle' || norm === 'sql') return 'SQL';
  if (norm === 'dart') return 'Dart';
  if (norm === 'elixir') return 'Elixir';
  if (norm === 'erlang') return 'Erlang';
  if (norm === 'racket') return 'Racket';
  if (norm === 'ruby') return 'Ruby';
  if (norm === 'scala') return 'Scala';

  const clean = String(language).trim().replace(/[\\/:*?"<>|]/g, '');
  if (!clean) return 'Code';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function getLanguageExtension(language) {
  if (!language) return '.txt';
  if (languages[language]) return languages[language];
  const langDir = normalizeLanguageDir(language);
  if (languages[langDir]) return languages[langDir];
  const norm = String(language).trim().toLowerCase();
  if (norm === 'java') return '.java';
  if (norm === 'python' || norm === 'python3' || norm === 'pandas') return '.py';
  if (norm === 'c++' || norm === 'cpp') return '.cpp';
  if (norm === 'c') return '.c';
  if (norm === 'javascript' || norm === 'js') return '.js';
  if (norm === 'typescript' || norm === 'ts') return '.ts';
  if (norm === 'c#' || norm === 'cs' || norm === 'csharp') return '.cs';
  if (norm === 'go' || norm === 'golang') return '.go';
  if (norm === 'rust') return '.rs';
  if (norm === 'kotlin') return '.kt';
  if (norm === 'swift') return '.swift';
  if (norm === 'php') return '.php';
  if (norm === 'mysql' || norm === 'ms sql server' || norm === 'oracle' || norm === 'sql') return '.sql';
  return '.txt';
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
  const ext = getLanguageExtension(language);
  if (approachNumber <= 1) {
    return `solution${ext}`;
  }
  return `solution-${approachNumber}${ext}`;
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

function getProblemPath(language, difficulty, numericId, slug, problemName) {
  const langDir = normalizeLanguageDir(language);
  const diffFolder = getDifficultyFolder(difficulty);
  const folderName = formatProblemFolderName(numericId, slug, problemName);
  return `${langDir}/${diffFolder}/${folderName}`;
}

function getNewProblemPath(difficulty, numericId, slug, problemName) {
  return getProblemPath('Java', difficulty, numericId, slug, problemName);
}

function hasSolutionForLanguage(files, language) {
  if (!files) return false;
  const langExt = getLanguageExtension(language);
  const langSlug = getLangSlug(language);

  const fileList = Array.isArray(files)
    ? files.map(f => (typeof f === 'string' ? f : f?.name || ''))
    : Object.keys(files);

  return fileList.some(filename => {
    if (!filename || filename === 'README.md' || filename === 'NOTES.md' || filename === 'stats.json') {
      return false;
    }
    const lower = filename.toLowerCase();
    const extLower = langExt.toLowerCase();
    const slugLower = langSlug.toLowerCase();
    if (lower.endsWith(extLower)) return true;
    if (lower.includes(`-${slugLower}`)) return true;
    if (lower.includes(`${slugLower}-`)) return true;
    return false;
  });
}

function matchesProblem(dirName, problemName, numericId, slug) {
  if (!dirName) return false;
  const dirStr = String(dirName);
  const cleanDir = dirStr
    .replace(/^[^/]+\/(Easy|Medium|Hard)\//i, '')
    .replace(/^(Easy|Medium|Hard)\//i, '');

  if (problemName != null && problemName !== '') {
    const probStr = String(problemName);
    const cleanProblem = probStr
      .replace(/^[^/]+\/(Easy|Medium|Hard)\//i, '')
      .replace(/^(Easy|Medium|Hard)\//i, '');
    if (cleanDir === cleanProblem || dirStr === probStr) return true;
  }

  if (numericId != null && numericId !== '') {
    const numStr = String(numericId).trim();
    const padded = addLeadingZeros(numStr);
    if (cleanDir === padded || cleanDir.startsWith(`${padded}-`) || cleanDir.startsWith(`${numStr}-`)) {
      return true;
    }
  }

  if (slug && typeof slug === 'string' && slug.trim() !== '') {
    const cleanSlug = slug.trim().toLowerCase();
    if (cleanDir.toLowerCase() === cleanSlug || cleanDir.toLowerCase().endsWith(`-${cleanSlug}`)) {
      return true;
    }
  }

  return false;
}

export {
  addLeadingZeros,
  assert,
  checkElem,
  convertToSlug,
  debounce,
  delay,
  DIFFICULTY,
  formatProblemFolderName,
  formatStats,
  getBrowser,
  getDifficulty,
  getDifficultyFolder,
  getLanguageExtension,
  getLangSlug,
  getNewProblemPath,
  getProblemPath,
  getSolutionFilename,
  hasSolutionForLanguage,
  isEmptyObject,
  languageKeyFromExt,
  languages,
  LeetSyncError,
  matchesProblem,
  mergeStats,
  normalizeLanguageDir,
};



