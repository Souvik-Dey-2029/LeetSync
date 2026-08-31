import { LeetCodeV1, LeetCodeV2 } from './versions.js';
import setupManualSubmitBtn from './submitBtn.js';
import {
  addLeadingZeros,
  debounce,
  delay,
  DIFFICULTY,
  formatProblemFolderName,
  getBrowser,
  getDifficulty,
  getNewProblemPath,
  getSolutionFilename,
  isEmptyObject,
  languageKeyFromExt,
  LeetSyncError,
  matchesProblem,
  mergeStats,
} from './util.js';
import { showSyncConfirmationModal, showExistingProblemModal } from './modal.js';
import { appendProblemToReadme, sortTopicsInReadme } from './readmeTopics.js';

/* Commit messages */
const readmeMsg = 'Create README - LeetSync';
const updateReadmeMsg = 'Update README - Topic Tags';
const updateStatsMsg = 'Updated stats';
const discussionMsg = 'Prepend discussion post - LeetSync';
const createNotesMsg = 'Attach NOTES - LeetSync';
const defaultRepoReadme =
  'A collection of LeetCode questions to ace the coding interview! - Synced using LeetSync';
const readmeFilename = 'README.md';
const statsFilename = 'stats.json';
const WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS = 500;

const api = getBrowser();

const getPath = (problem, filename) => {
  return filename ? `${problem}/${filename}` : problem;
};

/** Decodes a base64 encoded string into UTF-8 format using URI encoding.*/
const decode = data => decodeURIComponent(escape(atob(data)));
/** Encodes a given string into base64 format.*/
const encode = data => btoa(unescape(encodeURIComponent(data)));

function getAndInitializeStats(problem) {
  return api.storage.local.get('stats').then(({ stats }) => {
    if (stats == null || isEmptyObject(stats)) {
      stats = {};
      stats.shas = {};
      stats.solved = 0;
      stats.easy = 0;
      stats.medium = 0;
      stats.hard = 0;
    }

    if (stats.shas[problem] == null) {
      stats.shas[problem] = {};
    }

    return stats;
  });
}

async function upload(token, hook, content, problem, filename, sha, message) {
  const path = getPath(problem, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  let data = {
    message,
    content,
    sha,
  };

  let options = {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(data),
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new LeetSyncError(res.status, { cause: res });
  }
  console.log(`Successfully committed ${getPath(problem, filename)} to github`);

  const body = await res.json();
  const stats = await getAndInitializeStats(problem);
  stats.shas[problem][filename] = body.content.sha;
  api.storage.local.set({ stats });

  return body.content.sha;
}

function incrementStats(difficulty, problem) {
  const diff = getDifficulty(difficulty);
  return api.storage.local.get('stats').then(({ stats }) => {
    stats.solved += 1;
    stats.easy += diff === DIFFICULTY.EASY ? 1 : 0;
    stats.medium += diff === DIFFICULTY.MEDIUM ? 1 : 0;
    stats.hard += diff === DIFFICULTY.HARD ? 1 : 0;
    stats.shas[problem].difficulty = diff.toLowerCase();
    api.storage.local.set({ stats });
    return stats;
  });
}

async function setPersistentStats(localStats) {
  let pStats = { leetcode: localStats };
  const pStatsEncoded = encode(JSON.stringify(pStats));
  const sha = localStats?.shas?.[readmeFilename]?.[''] || '';

  const { leetsync_token: token, leetsync_hook: hook } = await api.storage.local.get([
    'leetsync_token',
    'leetsync_hook',
  ]);

  try {
    return await upload(token, hook, pStatsEncoded, statsFilename, '', sha, updateStatsMsg);
  } catch (e) {
    if (e.message === '409') {
      const { content, sha } = await getGitHubFile(token, hook, statsFilename).then(res =>
        res.json()
      );
      pStats = JSON.parse(decode(content));
      const mergedStats = mergeStats(pStats.leetcode, localStats);
      const mergedStatsEncoded = encode(JSON.stringify({ leetcode: mergedStats }));

      await api.storage.local.set({ stats: mergedStats });

      return await delay(
        () => upload(token, hook, mergedStatsEncoded, statsFilename, '', sha, updateStatsMsg),
        WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS
      );
    }
    throw e;
  }
}

const inFlightUploads = new Set();

const findExistingProblemPath = async (problemName, numericId, slug) => {
  const data = await api.storage.local.get('stats');
  const stats = data?.stats;

  if (stats?.shas) {
    for (const dirPath of Object.keys(stats.shas)) {
      if (matchesProblem(dirPath, problemName, numericId, slug)) {
        return dirPath;
      }
    }
  }

  try {
    const { leetsync_token: token, leetsync_hook: hook } = await api.storage.local.get([
      'leetsync_token',
      'leetsync_hook',
    ]);

    if (!token || !hook) {
      return null;
    }

    const folderName = formatProblemFolderName(numericId, slug, problemName);
    const candidatesToTest = [];

    ['Easy', 'Medium', 'Hard'].forEach(diff => {
      candidatesToTest.push(`${diff}/${folderName}`);
    });
    candidatesToTest.push(folderName);

    if (problemName && problemName !== folderName) {
      ['Easy', 'Medium', 'Hard'].forEach(diff => {
        candidatesToTest.push(`${diff}/${problemName}`);
      });
      candidatesToTest.push(problemName);
    }

    for (const candidatePath of candidatesToTest) {
      try {
        const res = await getGitHubFile(token, hook, candidatePath);
        if (res && res.ok) {
          return candidatePath;
        }
      } catch (e) {
        // 404 means path does not exist
      }
    }

    try {
      const res = await getGitHubFile(token, hook, statsFilename);
      if (res && res.ok) {
        const jsonRes = await res.json();
        const pStats = JSON.parse(decode(jsonRes.content));
        const remoteShas = pStats?.leetcode?.shas || {};
        for (const dirPath of Object.keys(remoteShas)) {
          if (matchesProblem(dirPath, problemName, numericId, slug)) {
            if (pStats?.leetcode) {
              const mergedStats = mergeStats(pStats.leetcode, stats || {});
              await api.storage.local.set({ stats: mergedStats });
            }
            return dirPath;
          }
        }
      }
    } catch (e) {}
  } catch (err) {
    console.error('Remote existing check failed:', err);
  }

  return null;
};

const isCompleted = async (problemName, numericId, slug) => {
  const existingPath = await findExistingProblemPath(problemName, numericId, slug);
  if (existingPath) {
    const updatedStats = await getAndInitializeStats(existingPath);
    if (!updatedStats.shas[existingPath]['README.md']) {
      updatedStats.shas[existingPath]['README.md'] = 'synced';
      await api.storage.local.set({ stats: updatedStats });
    }
    return true;
  }
  return false;
};

async function determineNextSolutionFilename(dirPath, language, action, statsShas, token, hook) {
  if (action === 'replace') {
    return getSolutionFilename(language, 1);
  }

  let existingFiles = new Set();

  if (statsShas && statsShas[dirPath]) {
    Object.keys(statsShas[dirPath]).forEach(f => existingFiles.add(f));
  }

  if (token && hook) {
    try {
      const res = await getGitHubFile(token, hook, dirPath);
      if (res && res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.name) existingFiles.add(item.name);
          });
        }
      }
    } catch (e) {}
  }

  let approachNum = 1;
  while (true) {
    const candidate = getSolutionFilename(language, approachNum);
    if (!existingFiles.has(candidate)) {
      return candidate;
    }
    approachNum++;
  }
}

/* Discussion posts prepended at top of README */
/* Future implementations may require appending to bottom of file */
const updateReadmeWithDiscussionPost = async (
  addition,
  directory,
  filename,
  commitMsg,
  shouldPreprendDiscussionPosts
) => {
  let responseSHA;
  const { leetsync_token, leetsync_hook } = await api.storage.local.get([
    'leetsync_token',
    'leetsync_hook',
  ]);

  return getGitHubFile(leetsync_token, leetsync_hook, directory, filename)
    .then(resp => resp.json())
    .then(data => {
      responseSHA = data.sha;
      return decode(data.content);
    })
    .then(existingContent =>
      shouldPreprendDiscussionPosts ? encode(addition + existingContent) : encode(existingContent)
    )
    .then(newContent =>
      upload(leetsync_token, leetsync_hook, newContent, directory, filename, responseSHA, commitMsg)
    );
};

async function uploadGitWith409Retry(code, problemName, filename, commitMsg, optionals) {
  let token;
  let hook;

  const storageData = await api.storage.local.get([
    'leetsync_token',
    'mode_type',
    'leetsync_hook',
    'stats',
  ]);

  token = storageData.leetsync_token;
  if (!token) {
    throw new LeetSyncError('LeethubTokenUndefined');
  }

  if (storageData.mode_type !== 'commit') {
    throw new LeetSyncError('LeetSyncNotAuthorizedByGit');
  }

  hook = storageData.leetsync_hook;
  if (!hook) {
    throw new LeetSyncError('NoRepoDefined');
  }

  /* Get SHA, if it exists */
  const sha = optionals?.sha
    ? optionals.sha
    : storageData.stats?.shas?.[problemName]?.[filename] !== undefined
    ? storageData.stats.shas[problemName][filename]
    : '';

  try {
    return await upload(
      token,
      hook,
      code,
      problemName,
      filename,
      sha,
      commitMsg,
      optionals?.difficulty
    );
  } catch (err) {
    if (err.message === '409') {
      const data = await getGitHubFile(token, hook, problemName, filename).then(res => res.json());
      return upload(
        token,
        hook,
        code,
        problemName,
        filename,
        data.sha,
        commitMsg,
        optionals?.difficulty
      );
    }
    throw err;
  }
}

async function getGitHubFile(token, hook, directory, filename) {
  const path = getPath(directory, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  let options = {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new Error(res.status);
  }

  return res;
}

/* Discussion Link - When a user makes a new post, the link is prepended to the README for that problem.*/
if (typeof document !== 'undefined') {
  document.addEventListener('click', event => {
    const element = event.target;
    const oldPath = window.location.pathname;

    if (
      element &&
      (element.classList.contains('icon__3Su4') ||
        element.parentElement?.classList.contains('icon__3Su4') ||
        element.parentElement?.classList.contains('btn-content-container__214G') ||
        element.parentElement?.classList.contains('header-right__2UzF'))
    ) {
      setTimeout(function () {
        if (
          oldPath !== window.location.pathname &&
          oldPath === window.location.pathname.substring(0, oldPath.length) &&
          !Number.isNaN(window.location.pathname.charAt(oldPath.length))
        ) {
          const date = new Date();
          const currentDate = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}`;
          const addition = `[Discussion Post (created on ${currentDate})](${window.location})  \n`;
          const problemName = window.location.pathname.split('/')[2];
          updateReadmeWithDiscussionPost(addition, problemName, readmeFilename, discussionMsg, true);
        }
      }, 1000);
    }
  });
}

function createRepoReadme() {
  const content = encode(defaultRepoReadme);
  return uploadGitWith409Retry(content, readmeFilename, '', readmeMsg);
}

async function updateReadmeTopicTagsWithProblem(topicTags, problemName) {
  if (topicTags == null) {
    console.log(new LeetSyncError('TopicTagsNotFound'));
    return;
  }

  const { leetsync_token, leetsync_hook, stats } = await api.storage.local.get([
    'leetsync_token',
    'leetsync_hook',
    'stats',
  ]);

  let readme;
  let newSha;

  try {
    const { content, sha } = await getGitHubFile(
      leetsync_token,
      leetsync_hook,
      readmeFilename
    ).then(resp => resp.json());
    readme = content;
    stats.shas[readmeFilename] = { '': sha };
    await api.storage.local.set({ stats });
  } catch (err) {
    if (err.message === '404') {
      newSha = await createRepoReadme();
    }
    throw err;
  }
  readme = decode(readme);
  for (let topic of topicTags) {
    readme = appendProblemToReadme(topic.name, readme, leetsync_hook, problemName);
  }
  readme = sortTopicsInReadme(readme);
  readme = encode(readme);

  return delay(
    () => uploadGitWith409Retry(readme, readmeFilename, '', updateReadmeMsg, { sha: newSha }),
    WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS
  );
}

/** @param {LeetCodeV1 | LeetCodeV2} leetCode */
function loader(leetCode) {
  let iterations = 0;
  const intervalId = setInterval(async () => {
    try {
      const isSuccessfulSubmission = leetCode.getSuccessStateAndUpdate();
      if (!isSuccessfulSubmission) {
        iterations++;
        if (iterations > 9) {
          // poll for max 10 attempts (10 seconds)
          throw new LeetSyncError('Could not find successful submission after 10 seconds.');
        }
        return;
      }
      leetCode.startSpinner();

      // If successful, stop polling
      clearInterval(intervalId);

      // For v2, query LeetCode API for submission results
      await leetCode.init();

      const probStats = leetCode.parseStats();
      if (!probStats) {
        throw new LeetSyncError('SubmissionStatsNotFound');
      }

      const probStatement = leetCode.parseQuestion();
      if (!probStatement) {
        throw new LeetSyncError('ProblemStatementNotFound');
      }

      const problemName = leetCode.getProblemNameSlug();
      const numericId = leetCode.getProblemId ? leetCode.getProblemId() : null;
      const titleSlug = leetCode.getProblemSlug ? leetCode.getProblemSlug() : null;
      const difficulty = leetCode.parseDifficulty ? leetCode.parseDifficulty() : leetCode.difficulty;

      if (inFlightUploads.has(problemName)) {
        console.log(`LeetSync: Upload for ${problemName} is already in flight.`);
        leetCode.markAlreadySynced(
          'Already synced — this LeetCode problem is already in your GitHub repository.'
        );
        return;
      }

      inFlightUploads.add(problemName);

      try {
        const { leetsync_token: token, leetsync_hook: hook, stats } = await api.storage.local.get([
          'leetsync_token',
          'leetsync_hook',
          'stats',
        ]);

        const langExt = leetCode.getLanguageExtension();
        if (!langExt) {
          throw new LeetSyncError('LanguageNotFound');
        }

        const langVerbose = leetCode.submissionData?.lang?.verboseName || languageKeyFromExt(langExt);

        const existingPath = await findExistingProblemPath(problemName, numericId, titleSlug);

        let targetDirPath;
        let filename;

        if (existingPath) {
          targetDirPath = existingPath;
          const userAction = await showExistingProblemModal();
          filename = await determineNextSolutionFilename(
            targetDirPath,
            langVerbose,
            userAction,
            stats?.shas,
            token,
            hook
          );
        } else {
          targetDirPath = getNewProblemPath(difficulty, numericId, titleSlug, problemName);
          filename = getSolutionFilename(langVerbose, 1);
        }

        /* Upload README */
        const uploadReadMe = await api.storage.local.get('stats').then(({ stats }) => {
          const shaExists = stats?.shas?.[targetDirPath]?.[readmeFilename] !== undefined;

          if (!shaExists) {
            return uploadGitWith409Retry(
              encode(probStatement),
              targetDirPath,
              readmeFilename,
              readmeMsg
            );
          }
        });

        /* Upload Notes if any*/
        const notes = leetCode.getNotesIfAny();
        let uploadNotes;
        if (notes != undefined && notes.length > 0) {
          uploadNotes = uploadGitWith409Retry(encode(notes), targetDirPath, 'NOTES.md', createNotesMsg);
        }

        /* Upload code to Git */
        const code = leetCode.findCode(probStats);
        const uploadCode = uploadGitWith409Retry(encode(code), targetDirPath, filename, probStats);

        /* Group problem into its relevant topics */
        const updateRepoReadMe = updateReadmeTopicTagsWithProblem(
          leetCode.submissionData?.question?.topicTags,
          problemName
        );

        await Promise.all([uploadReadMe, uploadNotes, uploadCode, updateRepoReadMe]);

        leetCode.markUploaded();

        // Increments local and persistent stats
        await incrementStats(difficulty || leetCode.difficulty, targetDirPath).then(setPersistentStats);
      } finally {
        inFlightUploads.delete(problemName);
      }
    } catch (err) {
      leetCode.markUploadFailed();
      clearInterval(intervalId);

      if (!(err instanceof LeetSyncError)) {
        console.error(err);
        return;
      }
    }
  }, 1000);
}

/**
 * Submit by Keyboard Shortcuts (only supported on LeetCode v2)
 * @param {Event} event
 * @returns
 */
function wasSubmittedByKeyboard(event) {
  const isEnterKey = event.key === 'Enter';
  const isMacOS = window.navigator.userAgent.includes('Mac');

  return isEnterKey && ((isMacOS && event.metaKey) || (!isMacOS && event.ctrlKey));
}

/**
 * Get SubmissionID by listening for URL changes to `/submissions/(d+)` format
 * @returns {string} submissionId
 */
async function listenForSubmissionId() {
  const { submissionId } = await api.runtime.sendMessage({
    type: 'LEETCODE_SUBMISSION',
  });
  if (submissionId == null) {
    console.log(new LeetSyncError('SubmissionIdNotFound'));
    return;
  }
  return submissionId;
}

/**
 * @param {Event} event
 * @param {LeetCodeV2} leetCode
 * @returns {void}
 */
async function v2SubmissionHandler(event, leetCode) {
  if (event.type !== 'click' && !wasSubmittedByKeyboard(event)) {
    return;
  }

  const authenticated =
    !isEmptyObject(await api.storage.local.get(['leetsync_token'])) &&
    !isEmptyObject(await api.storage.local.get(['leetsync_hook']));
  if (!authenticated) {
    throw new LeetSyncError('UserNotAuthenticated');
  }

  const shouldSync = await showSyncConfirmationModal();
  if (!shouldSync) {
    return false;
  }

  const submissionId = await listenForSubmissionId();
  leetCode.submissionId = submissionId;
  loader(leetCode);
  return true;
}

// Use MutationObserver to determine when the submit button elements are loaded
const submitBtnObserver =
  typeof MutationObserver !== 'undefined'
    ? new MutationObserver(function (_mutations, observer) {
        const v1SubmitBtn = document.querySelector('[data-cy="submit-code-btn"]');
        const v2SubmitBtn = document.querySelector('[data-e2e-locator="console-submit-button"]');
        const textareaList = document.getElementsByTagName('textarea');
        const textarea =
          textareaList.length === 4
            ? textareaList[2]
            : textareaList.length === 2
            ? textareaList[0]
            : textareaList[1];

        if (v1SubmitBtn) {
          observer.disconnect();

          const leetCode = new LeetCodeV1();
          v1SubmitBtn.addEventListener('click', async () => {
            const shouldSync = await showSyncConfirmationModal();
            if (shouldSync) {
              loader(leetCode);
            }
          });
          return;
        }

        if (v2SubmitBtn && textarea) {
          observer.disconnect();

          const leetCode = new LeetCodeV2();
          if (!!!v2SubmitBtn.onclick) {
            textarea.addEventListener('keydown', e => v2SubmissionHandler(e, leetCode));
            v2SubmitBtn.onclick = e => v2SubmissionHandler(e, leetCode);
          }
        }
      })
    : null;


if (typeof document !== 'undefined' && document.body && submitBtnObserver) {
  submitBtnObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* Sync to local storage */
api.storage.local.get('isSync', data => {
  const keys = [
    'leetsync_token',
    'leetsync_username',
    'stats',
    'leetsync_hook',
    'mode_type',
  ];
  if (!data || !data.isSync) {
    keys.forEach(key => {
      api.storage.sync.get(key, data => {
        api.storage.local.set({ [key]: data[key] });
      });
    });
    api.storage.local.set({ isSync: true }, () => {
      console.log('LeetSync Synced to local values');
    });
  } else {
    console.log('LeetSync Local storage already synced!');
  }
});

setupManualSubmitBtn(
  debounce(
    () => {
      const leetCode = new LeetCodeV2();
      // Manual submission event can only fire when we have submissionId. Simply retrieve it.
      const submissionId = window.location.href.match(/leetcode\.com\/.*\/submissions\/(\d+)/)[1];
      leetCode.submissionId = submissionId;
      loader(leetCode);
      return;
    },
    5000,
    true
  )
);

class LeetSyncNetworkError extends LeetSyncError {
  constructor(response) {
    super(response.statusText);
    this.status = response.status;
  }
}

export { isCompleted };

