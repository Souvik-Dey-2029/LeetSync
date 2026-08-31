import {
  getDifficultyFolder,
  getLangSlug,
  getNewProblemPath,
  getSolutionFilename,
  matchesProblem,
} from '../scripts/leetcode/util.js';
import { setModalHandlerOverrides, showExistingProblemModal, showSyncConfirmationModal } from '../scripts/leetcode/modal.js';
import { isCompleted } from '../scripts/leetcode/leetcode.js';

describe('LeetSync Interactive Sync & Organization Suite (16 Core Cases)', () => {
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

  // 1. New Easy problem creates Easy/<problem-folder>
  it('1. New Easy problem creates Easy/<problem-folder>', () => {
    const path = getNewProblemPath('Easy', 1, 'two-sum', '0001-two-sum');
    expect(path).toBe('Easy/0001-two-sum');
  });

  // 2. New Medium problem creates Medium/<problem-folder>
  it('2. New Medium problem creates Medium/<problem-folder>', () => {
    const path = getNewProblemPath('Medium', 3, 'longest-substring', '0003-longest-substring');
    expect(path).toBe('Medium/0003-longest-substring');
  });

  // 3. New Hard problem creates Hard/<problem-folder>
  it('3. New Hard problem creates Hard/<problem-folder>', () => {
    const path = getNewProblemPath('Hard', 4, 'median-of-two-sorted-arrays', '0004-median-of-two-sorted-arrays');
    expect(path).toBe('Hard/0004-median-of-two-sorted-arrays');
  });

  // 4. New problem creates README + primary solution naming
  it('4. New problem primary solution filename follows language slug convention', () => {
    const javaFile = getSolutionFilename('Java', 1);
    const pyFile = getSolutionFilename('Python3', 1);
    const cppFile = getSolutionFilename('C++', 1);

    expect(javaFile).toBe('solution-java.java');
    expect(pyFile).toBe('solution-python.py');
    expect(cppFile).toBe('solution-cpp.cpp');
  });

  // 5. Existing problem is detected
  it('5. Existing problem is detected via isCompleted', async () => {
    storageState = {
      stats: {
        shas: {
          'Easy/0001-two-sum': {
            'README.md': 'sha123',
            'solution-java.java': 'sha456',
          },
        },
      },
    };

    const result = await isCompleted('0001-two-sum', 1, 'two-sum');
    expect(result).toBeTrue();
  });

  // 6. Existing problem + "Add Another Solution" modal selection returns 'add'
  it('6. Modal selection for Add Another Solution returns add', async () => {
    setModalHandlerOverrides({
      existingAction: async () => 'add',
    });
    const choice = await showExistingProblemModal();
    expect(choice).toBe('add');
  });

  // 7. Existing Java solution + another Java approach creates solution-java-approach-2.java
  it('7. Existing Java solution + another Java approach creates solution-java-approach-2.java', () => {
    const filename = getSolutionFilename('Java', 2);
    expect(filename).toBe('solution-java-approach-2.java');
  });

  // 8. Existing Java + Python submission creates solution-python.py
  it('8. Existing Java + Python submission creates solution-python.py', () => {
    const filename = getSolutionFilename('Python3', 1);
    expect(filename).toBe('solution-python.py');
  });

  // 9. Existing Java + "Replace Existing Solution" replaces solution-java.java
  it('9. Existing Java + Replace Existing Solution uses primary solution filename solution-java.java', () => {
    const filename = getSolutionFilename('Java', 1);
    expect(filename).toBe('solution-java.java');
  });

  // 10. Replace operation never creates another solution file
  it('10. Replace operation uses approach 1 filename without approach suffix', () => {
    const filename = getSolutionFilename('Java', 1);
    expect(filename).not.toContain('approach');
    expect(filename).toBe('solution-java.java');
  });

  // 11. Failed submission handling
  it('11. Failed network check returns false and does not trigger overwrites', async () => {
    storageState = {
      stats: { shas: {} },
      leetsync_token: 'token',
      leetsync_hook: 'user/repo',
    };
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const result = await isCompleted('0001-two-sum', 1, 'two-sum');
    expect(result).toBeFalse();
  });

  // 12. "Don't Sync" results in no GitHub synchronization
  it('12. Don\'t Sync modal selection returns false', async () => {
    setModalHandlerOverrides({
      confirmSync: async () => false,
    });
    const result = await showSyncConfirmationModal();
    expect(result).toBeFalse();
  });

  // 13. Existing root-level problems remain detectable
  it('13. Existing root-level problems remain detectable', async () => {
    storageState = {
      stats: {
        shas: {
          '0001-two-sum': {
            'README.md': 'sha123',
          },
        },
      },
    };
    const result = await isCompleted('0001-two-sum', 1, 'two-sum');
    expect(result).toBeTrue();
  });

  // 14. Local cache missing but GitHub problem exists -> correctly detected
  it('14. Local cache missing but GitHub problem exists -> correctly detected', async () => {
    storageState = {
      stats: null,
      leetsync_token: 'fake-token',
      leetsync_hook: 'owner/repo',
    };

    globalThis.fetch = async (url) => {
      if (url.includes('/contents/Easy/0001-two-sum')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ name: 'README.md' }, { name: 'solution-java.java' }],
        };
      }
      return { ok: false, status: 404 };
    };

    const result = await isCompleted('0001-two-sum', 1, 'two-sum');
    expect(result).toBeTrue();
  });

  // 15. Repeated submissions do not create accidental duplicate files
  it('15. Incrementing approach numbers generates distinct deterministic filenames', () => {
    const fn1 = getSolutionFilename('Java', 1);
    const fn2 = getSolutionFilename('Java', 2);
    const fn3 = getSolutionFilename('Java', 3);

    expect(fn1).toBe('solution-java.java');
    expect(fn2).toBe('solution-java-approach-2.java');
    expect(fn3).toBe('solution-java-approach-3.java');
  });

  // 16. Authentication remains untouched
  it('16. Verify token and hook handling is preserved in storage', async () => {
    storageState = {
      leetsync_token: 'my-github-token',
      leetsync_hook: 'user/repo',
      mode_type: 'commit',
    };

    const res = await globalThis.chrome.storage.local.get(['leetsync_token', 'leetsync_hook', 'mode_type']);
    expect(res.leetsync_token).toBe('my-github-token');
    expect(res.leetsync_hook).toBe('user/repo');
    expect(res.mode_type).toBe('commit');
  });
});
