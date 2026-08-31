import { matchesProblem } from '../scripts/leetcode/util.js';
import { isCompleted } from '../scripts/leetcode/leetcode.js';

describe('Duplicate Problem Protection', () => {
  let originalChrome;
  let originalFetch;
  let storageState = {};

  beforeEach(() => {
    originalChrome = globalThis.chrome;
    originalFetch = globalThis.fetch;
    storageState = {};

    globalThis.chrome = {
      runtime: {},
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
  });

  describe('matchesProblem helper', () => {
    it('should match exact directory name', () => {
      expect(matchesProblem('0001-two-sum', '0001-two-sum', '1', 'two-sum')).toBeTrue();
    });

    it('should match by numeric ID', () => {
      expect(matchesProblem('0001-two-sum', '0001-two-sum-alternate', 1, 'two-sum-alternate')).toBeTrue();
      expect(matchesProblem('1-two-sum', '0001-two-sum', 1, 'two-sum')).toBeTrue();
    });

    it('should match by problem slug', () => {
      expect(matchesProblem('two-sum', '0001-two-sum', null, 'two-sum')).toBeTrue();
      expect(matchesProblem('0001-two-sum', '0001-different-name', null, 'two-sum')).toBeTrue();
    });

    it('should return false for different problems', () => {
      expect(matchesProblem('0002-add-two-numbers', '0001-two-sum', 1, 'two-sum')).toBeFalse();
    });
  });

  describe('isCompleted duplicate check', () => {
    it('CASE 1: New problem not in local storage or remote -> returns false (upload occurs)', async () => {
      storageState = {
        stats: { shas: {} },
        leetsync_token: 'fake-token',
        leetsync_hook: 'owner/repo',
      };

      globalThis.fetch = async (url) => {
        if (url.includes('/contents/')) {
          return { ok: false, status: 404 };
        }
        return { ok: false, status: 404 };
      };

      const result = await isCompleted('0001-two-sum', 1, 'two-sum');
      expect(result).toBeFalse();
    });

    it('CASE 2: Existing problem in local storage -> returns true (upload skipped)', async () => {
      storageState = {
        stats: {
          shas: {
            '0001-two-sum': {
              'README.md': 'sha123',
              '0001-two-sum.js': 'sha456',
            },
          },
        },
      };

      const result = await isCompleted('0001-two-sum', 1, 'two-sum');
      expect(result).toBeTrue();
    });

    it('Same problem submitted multiple times -> stays detected as duplicate', async () => {
      storageState = {
        stats: {
          shas: {
            '0001-two-sum': { 'README.md': 'sha123' },
          },
        },
      };

      const check1 = await isCompleted('0001-two-sum', 1, 'two-sum');
      const check2 = await isCompleted('0001-two-sum', 1, 'two-sum');
      expect(check1).toBeTrue();
      expect(check2).toBeTrue();
    });

    it('Local stats missing but problem exists in GitHub -> returns true (upload skipped)', async () => {
      storageState = {
        stats: null, // local storage cleared
        leetsync_token: 'fake-token',
        leetsync_hook: 'owner/repo',
      };

      globalThis.fetch = async (url) => {
        if (url.includes('/contents/0001-two-sum')) {
          return {
            ok: true,
            status: 200,
            json: async () => [{ name: 'README.md' }, { name: '0001-two-sum.js' }],
          };
        }
        return { ok: false, status: 404 };
      };

      const result = await isCompleted('0001-two-sum', 1, 'two-sum');
      expect(result).toBeTrue();

      // Local storage should also be updated/restored
      expect(storageState.stats?.shas?.['0001-two-sum']).toBeDefined();
    });

    it('Different problems -> each uploads normally (returns false for new problem)', async () => {
      storageState = {
        stats: {
          shas: {
            '0001-two-sum': { 'README.md': 'sha123' },
          },
        },
        leetsync_token: 'fake-token',
        leetsync_hook: 'owner/repo',
      };

      globalThis.fetch = async () => ({ ok: false, status: 404 });

      const twoSumResult = await isCompleted('0001-two-sum', 1, 'two-sum');
      const addTwoNumbersResult = await isCompleted('0002-add-two-numbers', 2, 'add-two-numbers');

      expect(twoSumResult).toBeTrue();
      expect(addTwoNumbersResult).toBeFalse();
    });
  });
});
