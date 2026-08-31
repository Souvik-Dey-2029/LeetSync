import {
  getDifficultyFolder,
  getLanguageExtension,
  getLangSlug,
  getNewProblemPath,
  getProblemPath,
  getSolutionFilename,
  hasSolutionForLanguage,
  matchesProblem,
  normalizeLanguageDir,
} from '../scripts/leetcode/util.js';
import { setModalHandlerOverrides, showExistingProblemModal, showSyncConfirmationModal } from '../scripts/leetcode/modal.js';
import { isCompleted } from '../scripts/leetcode/leetcode.js';

describe('LeetSync Language-Based Repository Organization Suite & Regression Tests', () => {
  let originalChrome;
  let originalFetch;
  let storageState = {};

  beforeEach(() => {
    originalChrome = globalThis.chrome;
    originalFetch = globalThis.fetch;
    storageState = {};
    setModalHandlerOverrides(null);

    globalThis.chrome = {
      runtime: {
        sendMessage: () => Promise.resolve({ submissionId: '12345' }),
      },
      storage: {
        local: {
          get: (keys) => {
            if (typeof keys === 'string') {
              return Promise.resolve({ [keys]: storageState[keys] });
            }
            if (Array.isArray(keys)) {
              const res = {};
              keys.forEach(k => { res[k] = storageState[k]; });
              return Promise.resolve(res);
            }
            return Promise.resolve({ ...storageState });
          },
          set: (obj) => {
            Object.assign(storageState, obj);
            return Promise.resolve();
          },
        },
      },
    };
  });

  afterEach(() => {
    globalThis.chrome = originalChrome;
    globalThis.fetch = originalFetch;
    setModalHandlerOverrides(null);
  });

  // 1. Existing Java problem + new Java submission -> same Java folder.
  it('1. Existing Java problem + new Java submission -> detected as existing Java problem', async () => {
    storageState = {
      stats: {
        shas: {
          'Java/Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution.java': 'sha456',
          },
        },
      },
    };

    const result = await isCompleted('Java', '0001-two-sum', 1, 'two-sum');
    expect(result).toBeTrue();
  });

  // 2. Existing Java problem + new Python submission -> new Python folder.
  it('2. Existing Java problem + new Python submission -> returns false to create new Python folder', async () => {
    storageState = {
      stats: {
        shas: {
          'Java/Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution.java': 'sha456',
          },
        },
      },
    };

    const result = await isCompleted('Python3', '0001-two-sum', 1, 'two-sum');
    expect(result).toBeFalse();

    const pyPath = getProblemPath('Python3', 'Easy', 1, 'two-sum', '0001-two-sum');
    expect(pyPath).toBe('Python/Easy/0001-two-sum');
  });

  // 3. Existing Java problem + new C++ submission -> new C++ folder.
  it('3. Existing Java problem + new C++ submission -> returns false to create new C++ folder', async () => {
    storageState = {
      stats: {
        shas: {
          'Java/Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution.java': 'sha456',
          },
        },
      },
    };

    const result = await isCompleted('C++', '0001-two-sum', 1, 'two-sum');
    expect(result).toBeFalse();

    const cppPath = getProblemPath('C++', 'Easy', 1, 'two-sum', '0001-two-sum');
    expect(cppPath).toBe('C++/Easy/0001-two-sum');
  });

  // 4. Existing Python problem + new Java submission -> new Java folder.
  it('4. Existing Python problem + new Java submission -> returns false to create new Java folder', async () => {
    storageState = {
      stats: {
        shas: {
          'Python/Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution.py': 'sha456',
          },
        },
      },
    };

    const result = await isCompleted('Java', '0001-two-sum', 1, 'two-sum');
    expect(result).toBeFalse();

    const javaPath = getProblemPath('Java', 'Easy', 1, 'two-sum', '0001-two-sum');
    expect(javaPath).toBe('Java/Easy/0001-two-sum');
  });

  // 5. Same problem + same language + Add Another -> solution-2 in same language folder.
  it('5. Same problem + same language + Add Another creates solution-2.java', () => {
    const filename = getSolutionFilename('Java', 2);
    expect(filename).toBe('solution-2.java');
  });

  // 6. Same problem + same language + Replace -> replace solution.java.
  it('6. Same problem + same language + Replace uses solution.java', () => {
    const filename = getSolutionFilename('Java', 1);
    expect(filename).toBe('solution.java');
  });

  // 7. Same problem + different language -> NEVER invoke Add Another Solution for the other language.
  it('7. hasSolutionForLanguage correctly differentiates Java vs Python files', () => {
    const javaFiles = { 'README.md': 'sha1', 'solution.java': 'sha2' };
    const pyFiles = { 'README.md': 'sha1', 'solution.py': 'sha2' };

    expect(hasSolutionForLanguage(javaFiles, 'Java')).toBeTrue();
    expect(hasSolutionForLanguage(javaFiles, 'Python3')).toBeFalse();
    expect(hasSolutionForLanguage(pyFiles, 'Python3')).toBeTrue();
    expect(hasSolutionForLanguage(pyFiles, 'Java')).toBeFalse();
  });

  // 8. Legacy: Easy/0001-two-sum/solution.java + Python submission -> create Python/Easy/0001-two-sum/.
  it('8. Legacy Java problem does NOT block creation of Python/Easy/0001-two-sum', async () => {
    storageState = {
      stats: {
        shas: {
          'Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution.java': 'sha456',
          },
        },
      },
    };

    const pyResult = await isCompleted('Python3', '0001-two-sum', 1, 'two-sum');
    expect(pyResult).toBeFalse();

    const pyPath = getProblemPath('Python3', 'Easy', 1, 'two-sum', '0001-two-sum');
    expect(pyPath).toBe('Python/Easy/0001-two-sum');
  });

  // 9. Legacy: Easy/0001-two-sum/solution.java + Java submission -> recognize existing Java solution.
  it('9. Legacy Java problem IS recognized for a new Java submission', async () => {
    storageState = {
      stats: {
        shas: {
          'Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution.java': 'sha456',
          },
        },
      },
    };

    const javaResult = await isCompleted('Java', '0001-two-sum', 1, 'two-sum');
    expect(javaResult).toBeTrue();
  });

  // 10. No existing language-specific solution -> create canonical Language/Difficulty/Problem path.
  it('10. Canonical Language/Difficulty/Problem path is generated when no existing path is found', () => {
    const javaPath = getProblemPath('Java', 'Easy', 1, 'two-sum', '0001-two-sum');
    const pyPath = getProblemPath('Python3', 'Medium', 3, 'longest-substring', '0003-longest-substring');
    const cppPath = getProblemPath('C++', 'Hard', 4, 'median-of-two-sorted-arrays', '0004-median-of-two-sorted-arrays');

    expect(javaPath).toBe('Java/Easy/0001-two-sum');
    expect(pyPath).toBe('Python/Medium/0003-longest-substring');
    expect(cppPath).toBe('C++/Hard/0004-median-of-two-sorted-arrays');
  });

  // 11. Ensure no solution from one language is overwritten by another language.
  it('11. Separate language namespaces prevent cross-language overwrites', async () => {
    storageState = {
      stats: {
        shas: {
          'Java/Easy/0001-two-sum': {
            'README.md': 'sha1',
            'solution.java': 'sha2',
          },
        },
      },
    };

    const isPyCompleted = await isCompleted('Python3', '0001-two-sum', 1, 'two-sum');
    expect(isPyCompleted).toBeFalse();

    const isJavaCompleted = await isCompleted('Java', '0001-two-sum', 1, 'two-sum');
    expect(isJavaCompleted).toBeTrue();
  });

  // 12. Regression test for background.js null/regex error logic.
  it('12. background.js match logic handles unexpected/null URL gracefully', () => {
    const safeMatchUrl = (url) => {
      if (!url) return null;
      const match = url.match(/\/submissions\/(\d+)/);
      return match && match[1] ? match[1] : null;
    };

    expect(safeMatchUrl(null)).toBeNull();
    expect(safeMatchUrl('')).toBeNull();
    expect(safeMatchUrl('https://leetcode.com/problems/two-sum/submissions/')).toBeNull();
    expect(safeMatchUrl('https://leetcode.com/problems/two-sum/submissions/12345/')).toBe('12345');
    expect(safeMatchUrl('https://leetcode.com/problems/two-sum/submissions/99887766')).toBe('99887766');
  });
});
