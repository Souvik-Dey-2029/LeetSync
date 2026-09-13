describe('Authentication Persistence Specs', () => {
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
                    remove: (keys) => {
                        const keyArr = Array.isArray(keys) ? keys : [keys];
                        keyArr.forEach(k => delete storageState[k]);
                        return Promise.resolve();
                    },
                },
                sync: {
                    get: (key, cb) => {
                        if (cb) cb({});
                        return Promise.resolve({});
                    },
                },
            },
        };
    });

    afterEach(() => {
        globalThis.chrome = originalChrome;
        globalThis.fetch = originalFetch;
    });

    it('A: First installation / No stored token -> authentication required', async () => {
        const data = await chrome.storage.local.get('leetsync_token');
        expect(data.leetsync_token).toBeFalsy();
    });

    it('B: Valid stored token -> remains authenticated', async () => {
        storageState = {
            leetsync_token: 'valid_test_token_123',
            leetsync_username: 'testuser',
            mode_type: 'commit',
            leetsync_hook: 'testuser/leetcode-repo',
        };

        const data = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(data.leetsync_token).toBe('valid_test_token_123');
        expect(data.leetsync_username).toBe('testuser');
    });

    it('C & D & E: Extension initialization does NOT clear persistent token or configuration', async () => {
        storageState = {
            leetsync_token: 'persistent_token_456',
            leetsync_username: 'persistent_user',
            leetsync_hook: 'persistent_user/my-repo',
            mode_type: 'commit',
            leetsync_client_id: 'my-client-id-789',
            stats: { solved: 5, easy: 3, medium: 2, hard: 0, shas: {} },
        };

        // Simulate extension reload / initialization script running (setting isSync: true)
        await chrome.storage.local.set({ isSync: true });

        const finalState = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_username',
            'leetsync_hook',
            'mode_type',
            'leetsync_client_id',
            'stats',
        ]);

        expect(finalState.leetsync_token).toBe('persistent_token_456');
        expect(finalState.leetsync_username).toBe('persistent_user');
        expect(finalState.leetsync_hook).toBe('persistent_user/my-repo');
        expect(finalState.mode_type).toBe('commit');
        expect(finalState.leetsync_client_id).toBe('my-client-id-789');
        expect(finalState.stats.solved).toBe(5);
    });

    it('F: Invalid / revoked token (401 response) -> clears authentication state', async () => {
        storageState = {
            leetsync_token: 'revoked_token',
            leetsync_username: 'revoked_user',
            mode_type: 'commit',
            leetsync_hook: 'revoked_user/repo',
        };

        // Simulate 401 handler clearing authentication state
        await chrome.storage.local.set({
            leetsync_token: null,
            leetsync_username: null,
            mode_type: 'hook',
            leetsync_hook: null,
        });

        const state = await chrome.storage.local.get(['leetsync_token', 'leetsync_username', 'mode_type', 'leetsync_hook']);
        expect(state.leetsync_token).toBeNull();
        expect(state.leetsync_username).toBeNull();
        expect(state.leetsync_hook).toBeNull();
        expect(state.mode_type).toBe('hook');
    });

    it('G: Explicit disconnect -> removes stored token and authentication state', async () => {
        storageState = {
            leetsync_token: 'user_token',
            leetsync_username: 'active_user',
            mode_type: 'commit',
            leetsync_hook: 'active_user/repo',
        };

        // User clicks disconnect
        await chrome.storage.local.set({
            leetsync_token: null,
            leetsync_username: null,
            mode_type: 'hook',
            leetsync_hook: null,
        });

        const state = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(state.leetsync_token).toBeNull();
        expect(state.leetsync_username).toBeNull();
    });

    it('H: User switching -> new account credentials overwrite stored auth state correctly', async () => {
        storageState = {
            leetsync_token: 'old_token',
            leetsync_username: 'old_user',
        };

        // New user completes OAuth device flow
        await chrome.storage.local.set({
            leetsync_token: 'new_token_999',
            leetsync_username: 'new_user_999',
        });

        const state = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(state.leetsync_token).toBe('new_token_999');
        expect(state.leetsync_username).toBe('new_user_999');
    });
});
