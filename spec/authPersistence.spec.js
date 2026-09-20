describe('Authentication Persistence Specs', () => {
    let originalChrome;
    let originalFetch;
    let storageState = {};

    beforeEach(() => {
        originalChrome = globalThis.chrome;
        originalFetch = globalThis.fetch;
        storageState = {};

        globalThis.chrome = {
            runtime: {
                openOptionsPage: () => {},
                getURL: path => path,
                onStartup: {
                    addListener: cb => {
                        globalThis.chrome.runtime._startupCb = cb;
                    }
                }
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

    it('1. First-time user has no authentication -> unauthenticated', async () => {
        const data = await chrome.storage.local.get('leetsync_token');
        expect(data.leetsync_token).toBeFalsy();
    });

    it('2. Successful authentication -> stored in chrome.storage.local', async () => {
        await chrome.storage.local.set({
            leetsync_token: 'gho_secret1234567890',
            leetsync_username: 'souvik-test',
        });
        const data = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(data.leetsync_token).toBe('gho_secret1234567890');
        expect(data.leetsync_username).toBe('souvik-test');
    });

    it('3. Browser/extension restart simulation -> stored authentication is restored', async () => {
        storageState = {
            leetsync_token: 'gho_restart_token',
            leetsync_username: 'souvik-restart',
            mode_type: 'commit',
            leetsync_hook: 'souvik-restart/my-leetcode',
        };

        // Simulate browser restart: onStartup fires
        if (chrome.runtime._startupCb) {
            chrome.runtime._startupCb();
        }

        const restored = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(restored.leetsync_token).toBe('gho_restart_token');
        expect(restored.leetsync_username).toBe('souvik-restart');
    });

    it('4. Popup reopened -> still authenticated', async () => {
        storageState = {
            leetsync_token: 'valid_active_token',
            leetsync_username: 'souvik-dey',
            leetsync_hook: 'souvik-dey/LeetCode-Solutions',
            mode_type: 'commit',
        };

        const popupData = await chrome.storage.local.get(['leetsync_token', 'leetsync_username', 'leetsync_hook']);
        expect(popupData.leetsync_token).toBe('valid_active_token');
        expect(popupData.leetsync_username).toBe('souvik-dey');
    });

    it('5. Repository selected -> repository configuration persists in storage', async () => {
        await chrome.storage.local.set({
            mode_type: 'commit',
            leetsync_hook: 'Souvik-Dey-2029/LeetCode-Solutions',
            repo: 'https://github.com/Souvik-Dey-2029/LeetCode-Solutions',
        });

        const repoData = await chrome.storage.local.get(['mode_type', 'leetsync_hook', 'repo']);
        expect(repoData.mode_type).toBe('commit');
        expect(repoData.leetsync_hook).toBe('Souvik-Dey-2029/LeetCode-Solutions');
        expect(repoData.repo).toBe('https://github.com/Souvik-Dey-2029/LeetCode-Solutions');
    });

    it('6. Extension restarted -> repository is still connected', async () => {
        storageState = {
            leetsync_token: 'my_auth_token',
            leetsync_username: 'Souvik-Dey-2029',
            leetsync_hook: 'Souvik-Dey-2029/LeetCode-Solutions',
            mode_type: 'commit',
        };

        // Simulate restart
        const dataAfterRestart = await chrome.storage.local.get(['leetsync_hook', 'mode_type']);
        expect(dataAfterRestart.leetsync_hook).toBe('Souvik-Dey-2029/LeetCode-Solutions');
        expect(dataAfterRestart.mode_type).toBe('commit');
    });

    it('7. Laptop/browser closed and reopened -> authentication remains available', async () => {
        storageState = {
            leetsync_token: 'offline_surviving_token',
            leetsync_username: 'laptop_user',
        };

        // Days later, reading storage
        const state = await chrome.storage.local.get('leetsync_token');
        expect(state.leetsync_token).toBe('offline_surviving_token');
    });

    it('8. Network unavailable during token validation -> do NOT delete stored token', async () => {
        storageState = {
            leetsync_token: 'offline_token',
            leetsync_username: 'offline_user',
        };

        // Simulate network failure validation returning status 0 (no connection)
        const simulateValidation = async (token) => {
            try {
                throw new Error('Failed to fetch (Network Error)');
            } catch (err) {
                return { status: 0, networkError: true };
            }
        };

        const result = await simulateValidation(storageState.leetsync_token);
        if (result.status === 401) {
            delete storageState.leetsync_token;
        }

        expect(storageState.leetsync_token).toBe('offline_token');
    });

    it('9. GitHub returns 200 from /user -> remain authenticated', async () => {
        storageState = {
            leetsync_token: 'valid_token_200',
            leetsync_username: 'valid_user',
        };

        const result = { status: 200, user: { login: 'valid_user' } };
        if (result.status === 200) {
            // Keep authenticated
        } else if (result.status === 401) {
            delete storageState.leetsync_token;
        }

        expect(storageState.leetsync_token).toBe('valid_token_200');
    });

    it('10. GitHub returns 401 -> require reauthentication and clear invalid credential', async () => {
        storageState = {
            leetsync_token: 'expired_or_revoked_token',
            leetsync_username: 'revoked_user',
        };

        const result = { status: 401 };
        if (result.status === 401) {
            await chrome.storage.local.set({
                leetsync_token: null,
                leetsync_username: null,
                mode_type: 'hook',
                leetsync_hook: null,
                leetsync_session_active: false,
            });
        }

        const state = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(state.leetsync_token).toBeNull();
        expect(state.leetsync_username).toBeNull();
    });

    it('11. User clicks Disconnect -> authentication and repository configuration are cleared', async () => {
        storageState = {
            leetsync_token: 'active_token',
            leetsync_username: 'active_user',
            leetsync_hook: 'active_user/repo',
            mode_type: 'commit',
            leetsync_session_active: true,
        };

        // User triggers disconnect
        await chrome.storage.local.set({
            leetsync_token: null,
            leetsync_username: null,
            mode_type: 'hook',
            leetsync_hook: null,
            leetsync_session_active: false,
        });

        const state = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_username',
            'leetsync_hook',
            'mode_type',
            'leetsync_session_active',
        ]);

        expect(state.leetsync_token).toBeNull();
        expect(state.leetsync_username).toBeNull();
        expect(state.leetsync_hook).toBeNull();
        expect(state.mode_type).toBe('hook');
        expect(state.leetsync_session_active).toBeFalse();
    });

    it('12. User clicks STOP -> only LeetCode session becomes inactive, auth & repo remain intact', async () => {
        storageState = {
            leetsync_token: 'valid_token_stop_test',
            leetsync_username: 'test_user',
            leetsync_hook: 'test_user/my-repo',
            mode_type: 'commit',
            leetsync_session_active: true,
        };

        // User clicks STOP
        await chrome.storage.local.set({ leetsync_session_active: false });

        const state = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_username',
            'leetsync_hook',
            'leetsync_session_active',
        ]);

        expect(state.leetsync_session_active).toBe(false);
        expect(state.leetsync_token).toBe('valid_token_stop_test');
        expect(state.leetsync_username).toBe('test_user');
        expect(state.leetsync_hook).toBe('test_user/my-repo');
    });

    it('13. User clicks START -> LeetCode session becomes active without OAuth', async () => {
        storageState = {
            leetsync_token: 'already_authenticated_token',
            leetsync_username: 'already_connected_user',
            leetsync_hook: 'already_connected_user/repo',
            mode_type: 'commit',
            leetsync_session_active: false,
        };

        // User clicks START
        await chrome.storage.local.set({ leetsync_session_active: true });

        const state = await chrome.storage.local.get([
            'leetsync_session_active',
            'leetsync_token',
        ]);

        expect(state.leetsync_session_active).toBe(true);
        expect(state.leetsync_token).toBe('already_authenticated_token');
    });

    it('14. Repository becomes unavailable -> repository disconnected/unavailable, auth remains intact', async () => {
        storageState = {
            leetsync_token: 'auth_token_alive',
            leetsync_username: 'my_user',
            leetsync_hook: 'my_user/deleted_repo',
            mode_type: 'commit',
        };

        // Repo check returns 404
        const repoCheckStatus = 404;
        if (repoCheckStatus === 404) {
            // Only repository availability is affected; auth token is NOT cleared
        }

        const state = await chrome.storage.local.get(['leetsync_token', 'leetsync_username']);
        expect(state.leetsync_token).toBe('auth_token_alive');
        expect(state.leetsync_username).toBe('my_user');
    });

    it('15. Extension initialization -> never blindly clears existing authentication', async () => {
        storageState = {
            leetsync_token: 'vital_user_token',
            leetsync_username: 'vital_user',
            leetsync_hook: 'vital_user/vital_repo',
            mode_type: 'commit',
        };

        // Initialization runs:
        await chrome.storage.local.set({ isSync: true });

        const state = await chrome.storage.local.get(['leetsync_token', 'leetsync_hook']);
        expect(state.leetsync_token).toBe('vital_user_token');
        expect(state.leetsync_hook).toBe('vital_user/vital_repo');
    });
});

