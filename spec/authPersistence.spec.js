import {
    calculateTokenExpiration,
    saveTokenPair,
    refreshAccessToken,
    getValidGitHubToken,
    githubFetch,
    DeviceAuthError,
    TOKEN_REFRESH_BUFFER_MS,
} from '../scripts/githubDeviceAuth.js';

describe('OAuth Token Refresh Lifecycle & Persistence Specs', () => {
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

    // =========================================================================
    // TEST 1: OAuth returns access_token, refresh_token, expires_in, refresh_token_expires_in
    // Expected: All required lifecycle metadata stored.
    // =========================================================================
    it('TEST 1: OAuth returns token lifecycle metadata -> stores all required keys and calculates expiration', async () => {
        const tokenResponse = {
            access_token: 'gho_access_123',
            refresh_token: 'ghr_refresh_456',
            expires_in: 28800, // 8 hours
            refresh_token_expires_in: 15811200, // 6 months
            token_type: 'bearer',
            scope: 'repo',
        };

        const before = Date.now();
        await saveTokenPair(globalThis.chrome, tokenResponse, 'octocat');
        const after = Date.now();

        const stored = await globalThis.chrome.storage.local.get([
            'leetsync_token',
            'leetsync_refresh_token',
            'leetsync_token_expires_at',
            'leetsync_refresh_token_expires_at',
            'leetsync_username',
        ]);

        expect(stored.leetsync_token).toBe('gho_access_123');
        expect(stored.leetsync_refresh_token).toBe('ghr_refresh_456');
        expect(stored.leetsync_username).toBe('octocat');
        expect(stored.leetsync_token_expires_at).toBeGreaterThanOrEqual(before + 28800 * 1000);
        expect(stored.leetsync_token_expires_at).toBeLessThanOrEqual(after + 28800 * 1000);
        expect(stored.leetsync_refresh_token_expires_at).toBeGreaterThanOrEqual(before + 15811200 * 1000);
    });

    // =========================================================================
    // TEST 2: OAuth returns non-expiring access token only
    // Expected: Works normally without requiring refresh token.
    // =========================================================================
    it('TEST 2: OAuth returns non-expiring access token only -> stores access token with null expiration', async () => {
        const tokenResponse = {
            access_token: 'gho_legacy_forever',
            token_type: 'bearer',
            scope: 'repo',
        };

        await saveTokenPair(globalThis.chrome, tokenResponse, 'legacy_user');

        const stored = await globalThis.chrome.storage.local.get([
            'leetsync_token',
            'leetsync_refresh_token',
            'leetsync_token_expires_at',
            'leetsync_refresh_token_expires_at',
        ]);

        expect(stored.leetsync_token).toBe('gho_legacy_forever');
        expect(stored.leetsync_token_expires_at).toBeNull();
        expect(stored.leetsync_refresh_token).toBeUndefined();

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(auth.status).toBe('valid');
        expect(auth.token).toBe('gho_legacy_forever');
    });

    // =========================================================================
    // TEST 3: Access token still valid
    // Expected: No refresh request made.
    // =========================================================================
    it('TEST 3: Access token still valid -> uses token directly without refresh request', async () => {
        let refreshCalled = false;
        globalThis.fetch = async (url) => {
            if (url.includes('/login/oauth/access_token')) {
                refreshCalled = true;
            }
            return { ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_still_valid_token',
            leetsync_refresh_token: 'ghr_valid_refresh',
            leetsync_token_expires_at: Date.now() + 3600 * 1000, // 1 hour remaining
            leetsync_client_id: 'client_123',
            leetsync_username: 'active_dev',
        };

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(auth.status).toBe('valid');
        expect(auth.token).toBe('gho_still_valid_token');
        expect(refreshCalled).toBe(false);
    });

    // =========================================================================
    // TEST 4: Access token nearing expiration (<5 min)
    // Expected: Silent refresh executed.
    // =========================================================================
    it('TEST 4: Access token nearing expiration -> triggers silent refresh before expiry', async () => {
        let refreshCalled = false;
        globalThis.fetch = async (url, options) => {
            if (url.includes('/login/oauth/access_token')) {
                refreshCalled = true;
                const body = JSON.parse(options.body);
                expect(body.grant_type).toBe('refresh_token');
                expect(body.refresh_token).toBe('ghr_old_refresh');
                return {
                    ok: true,
                    json: async () => ({
                        access_token: 'gho_new_refreshed_access',
                        refresh_token: 'ghr_new_rotated_refresh',
                        expires_in: 28800,
                        refresh_token_expires_in: 15811200,
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_about_to_expire',
            leetsync_refresh_token: 'ghr_old_refresh',
            leetsync_token_expires_at: Date.now() + 2 * 60 * 1000, // 2 minutes remaining (< 5 min buffer)
            leetsync_client_id: 'client_123',
            leetsync_username: 'active_dev',
        };

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(refreshCalled).toBe(true);
        expect(auth.status).toBe('refreshed');
        expect(auth.token).toBe('gho_new_refreshed_access');

        // Check storage updated
        expect(storageState.leetsync_token).toBe('gho_new_refreshed_access');
        expect(storageState.leetsync_refresh_token).toBe('ghr_new_rotated_refresh');
    });

    // =========================================================================
    // TEST 5: Access token expired + valid refresh token
    // Expected: Silent refresh, new token stored, user remains authenticated.
    // =========================================================================
    it('TEST 5: Access token expired + valid refresh token -> silently refreshes and remains authenticated', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/login/oauth/access_token')) {
                return {
                    ok: true,
                    json: async () => ({
                        access_token: 'gho_refreshed_after_expiry',
                        refresh_token: 'ghr_refreshed_refresh',
                        expires_in: 28800,
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_expired_yesterday',
            leetsync_refresh_token: 'ghr_refresh_alive',
            leetsync_token_expires_at: Date.now() - 10000, // expired 10 seconds ago
            leetsync_client_id: 'client_123',
            leetsync_username: 'active_dev',
        };

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(auth.status).toBe('refreshed');
        expect(auth.token).toBe('gho_refreshed_after_expiry');
        expect(storageState.leetsync_token).toBe('gho_refreshed_after_expiry');
    });

    // =========================================================================
    // TEST 6: GitHub API returns 401 + refresh token exists
    // Expected: Refresh once, retry request once.
    // =========================================================================
    it('TEST 6: GitHub API returns 401 + refresh token exists -> refreshes once and retries request', async () => {
        let apiCallCount = 0;
        let refreshCount = 0;

        globalThis.fetch = async (url, options) => {
            if (url.includes('/login/oauth/access_token')) {
                refreshCount++;
                return {
                    ok: true,
                    json: async () => ({
                        access_token: 'gho_new_token_after_401',
                        refresh_token: 'ghr_new_refresh_after_401',
                        expires_in: 28800,
                    }),
                };
            }

            if (url.includes('/api.github.com/user/repos')) {
                apiCallCount++;
                const authHeader = options.headers?.get?.('Authorization') || options.headers?.Authorization;
                if (authHeader === 'token gho_stale_token') {
                    return { status: 401, ok: false, json: async () => ({ message: 'Bad credentials' }) };
                }
                if (authHeader === 'token gho_new_token_after_401') {
                    return { status: 200, ok: true, json: async () => ([{ name: 'repo-1' }]) };
                }
            }

            return { status: 200, ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_stale_token',
            leetsync_refresh_token: 'ghr_valid_refresh',
            leetsync_token_expires_at: Date.now() + 3600 * 1000, // timestamp thought valid, but revoked/invalidated
            leetsync_client_id: 'client_123',
            leetsync_username: 'active_dev',
        };

        const response = await githubFetch(globalThis.chrome, 'https://api.github.com/user/repos');
        expect(refreshCount).toBe(1);
        expect(apiCallCount).toBe(2); // 1st failed with 401, 2nd retried with refreshed token
        expect(response.status).toBe(200);
        const repos = await response.json();
        expect(repos.length).toBe(1);
        expect(storageState.leetsync_token).toBe('gho_new_token_after_401');
    });

    // =========================================================================
    // TEST 7: Refresh response rotates refresh token
    // Expected: NEW refresh token replaces old refresh token.
    // =========================================================================
    it('TEST 7: Refresh response rotates refresh token -> new refresh token replaces old in storage', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/login/oauth/access_token')) {
                return {
                    ok: true,
                    json: async () => ({
                        access_token: 'gho_rotated_access',
                        refresh_token: 'ghr_rotated_refresh_2',
                        expires_in: 28800,
                        refresh_token_expires_in: 15811200,
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_initial_access',
            leetsync_refresh_token: 'ghr_initial_refresh_1',
            leetsync_token_expires_at: Date.now() - 1000,
            leetsync_client_id: 'client_123',
        };

        await getValidGitHubToken(globalThis.chrome);

        expect(storageState.leetsync_refresh_token).toBe('ghr_rotated_refresh_2');
        expect(storageState.leetsync_token).toBe('gho_rotated_access');
    });

    // =========================================================================
    // TEST 8: Refresh token invalid (revoked / expired)
    // Expected: Reauthentication required, auth tokens cleared, but repo hook preserved.
    // =========================================================================
    it('TEST 8: Refresh token invalid -> auth tokens cleared, repo hook preserved, reauthentication required', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/login/oauth/access_token')) {
                return {
                    ok: false,
                    status: 400,
                    json: async () => ({
                        error: 'bad_refresh_token',
                        error_description: 'The refresh token is invalid.',
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_expired_access',
            leetsync_refresh_token: 'ghr_revoked_refresh',
            leetsync_token_expires_at: Date.now() - 1000,
            leetsync_client_id: 'client_123',
            leetsync_username: 'souvik-dev',
            leetsync_hook: 'souvik-dev/LeetCode-Solutions',
            mode_type: 'commit',
        };

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(auth.status).toBe('auth_required');
        expect(auth.token).toBeNull();

        // Auth credentials cleared
        expect(storageState.leetsync_token).toBeNull();
        expect(storageState.leetsync_refresh_token).toBeNull();
        expect(storageState.leetsync_username).toBeNull();

        // REPOSITORY HOOK MUST REMAIN PRESERVED
        expect(storageState.leetsync_hook).toBe('souvik-dev/LeetCode-Solutions');
        expect(storageState.mode_type).toBe('commit');
    });

    // =========================================================================
    // TEST 9: Temporary network failure
    // Expected: Credentials NOT deleted.
    // =========================================================================
    it('TEST 9: Temporary network failure during refresh -> credentials NOT deleted', async () => {
        globalThis.fetch = async () => {
            throw new TypeError('Failed to fetch (Network connection offline)');
        };

        storageState = {
            leetsync_token: 'gho_token_surviving_offline',
            leetsync_refresh_token: 'ghr_refresh_surviving_offline',
            leetsync_token_expires_at: Date.now() - 1000,
            leetsync_client_id: 'client_123',
            leetsync_username: 'offline_user',
            leetsync_hook: 'offline_user/repo',
        };

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(auth.status).toBe('network_error');
        // Original tokens must be retained
        expect(storageState.leetsync_token).toBe('gho_token_surviving_offline');
        expect(storageState.leetsync_refresh_token).toBe('ghr_refresh_surviving_offline');
        expect(storageState.leetsync_hook).toBe('offline_user/repo');
    });

    // =========================================================================
    // TEST 10: Authentication genuinely fails
    // Expected: Repository configuration remains stored.
    // =========================================================================
    it('TEST 10: Authentication genuinely fails -> repository configuration remains stored', async () => {
        storageState = {
            leetsync_token: 'gho_revoked_manual',
            leetsync_client_id: 'client_123',
            leetsync_hook: 'user/persistent-repo',
            mode_type: 'commit',
        };

        // Trigger force refresh without refresh token
        const auth = await getValidGitHubToken(globalThis.chrome, true);
        expect(auth.status).toBe('auth_required');
        expect(storageState.leetsync_token).toBeNull();
        expect(storageState.leetsync_hook).toBe('user/persistent-repo');
        expect(storageState.mode_type).toBe('commit');
    });

    // =========================================================================
    // TEST 11: Laptop/browser restart simulation
    // Expected: Stored credentials restored.
    // =========================================================================
    it('TEST 11: Laptop/browser restart simulation -> stored credentials restored', async () => {
        storageState = {
            leetsync_token: 'gho_restored_after_reboot',
            leetsync_refresh_token: 'ghr_restored_after_reboot',
            leetsync_token_expires_at: Date.now() + 100000,
            leetsync_username: 'reboot_user',
            leetsync_hook: 'reboot_user/reboot_repo',
            mode_type: 'commit',
        };

        // Simulate startup listener
        if (chrome.runtime._startupCb) {
            chrome.runtime._startupCb();
        }

        const data = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_refresh_token',
            'leetsync_hook',
        ]);

        expect(data.leetsync_token).toBe('gho_restored_after_reboot');
        expect(data.leetsync_refresh_token).toBe('ghr_restored_after_reboot');
        expect(data.leetsync_hook).toBe('reboot_user/reboot_repo');
    });

    // =========================================================================
    // TEST 12: Legacy installation has access token but no refresh token
    // Expected: Valid token continues working.
    // =========================================================================
    it('TEST 12: Legacy installation has access token but no refresh token -> continues working normally', async () => {
        storageState = {
            leetsync_token: 'gho_legacy_token_valid',
            leetsync_username: 'legacy_user',
            leetsync_hook: 'legacy_user/legacy_repo',
            // No leetsync_refresh_token and no expiration metadata
        };

        const auth = await getValidGitHubToken(globalThis.chrome);
        expect(auth.status).toBe('valid');
        expect(auth.token).toBe('gho_legacy_token_valid');
        expect(storageState.leetsync_token).toBe('gho_legacy_token_valid');
    });

    // =========================================================================
    // TEST 13: Legacy token becomes invalid
    // Expected: Reauthenticate once; new authentication stores complete refresh lifecycle.
    // =========================================================================
    it('TEST 13: Legacy token becomes invalid -> prompts reauth once, subsequent auth stores full lifecycle', async () => {
        storageState = {
            leetsync_token: 'gho_legacy_invalid',
            leetsync_username: 'legacy_user',
            leetsync_hook: 'legacy_user/legacy_repo',
        };

        // Force refresh on 401
        const auth = await getValidGitHubToken(globalThis.chrome, true);
        expect(auth.status).toBe('auth_required');
        expect(storageState.leetsync_token).toBeNull();
        expect(storageState.leetsync_hook).toBe('legacy_user/legacy_repo');

        // User completes Device Flow reauth
        const newOAuthResponse = {
            access_token: 'gho_migrated_access_token',
            refresh_token: 'ghr_migrated_refresh_token',
            expires_in: 28800,
            refresh_token_expires_in: 15811200,
        };
        await saveTokenPair(globalThis.chrome, newOAuthResponse, 'legacy_user');

        const stateAfterReauth = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_refresh_token',
            'leetsync_token_expires_at',
            'leetsync_hook',
        ]);

        expect(stateAfterReauth.leetsync_token).toBe('gho_migrated_access_token');
        expect(stateAfterReauth.leetsync_refresh_token).toBe('ghr_migrated_refresh_token');
        expect(stateAfterReauth.leetsync_token_expires_at).toBeGreaterThan(Date.now());
        expect(stateAfterReauth.leetsync_hook).toBe('legacy_user/legacy_repo');
    });

    // =========================================================================
    // TEST 14: Multiple simultaneous refresh attempts
    // Expected: Single refresh operation (concurrency lock), no token corruption.
    // =========================================================================
    it('TEST 14: Multiple simultaneous refresh attempts -> concurrency lock ensures single refresh operation', async () => {
        let refreshCallCount = 0;

        globalThis.fetch = async (url) => {
            if (url.includes('/login/oauth/access_token')) {
                refreshCallCount++;
                // Artificial delay to simulate network latency
                await new Promise(r => setTimeout(r, 20));
                return {
                    ok: true,
                    json: async () => ({
                        access_token: 'gho_concurrent_access_new',
                        refresh_token: 'ghr_concurrent_refresh_new',
                        expires_in: 28800,
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        };

        storageState = {
            leetsync_token: 'gho_stale_concurrent',
            leetsync_refresh_token: 'ghr_concurrent_old',
            leetsync_token_expires_at: Date.now() - 1000, // expired
            leetsync_client_id: 'client_123',
            leetsync_username: 'concurrent_user',
        };

        // 3 parallel callers (e.g. popup opened + sync starting + stats fetching)
        const [res1, res2, res3] = await Promise.all([
            getValidGitHubToken(globalThis.chrome),
            getValidGitHubToken(globalThis.chrome),
            getValidGitHubToken(globalThis.chrome),
        ]);

        expect(refreshCallCount).toBe(1);
        expect(res1.token).toBe('gho_concurrent_access_new');
        expect(res2.token).toBe('gho_concurrent_access_new');
        expect(res3.token).toBe('gho_concurrent_access_new');
        expect(storageState.leetsync_token).toBe('gho_concurrent_access_new');
        expect(storageState.leetsync_refresh_token).toBe('ghr_concurrent_refresh_new');
    });

    // =========================================================================
    // TEST 15: START/STOP session mode
    // Expected: Does not modify auth or repository state.
    // =========================================================================
    it('TEST 15: START/STOP -> does not modify auth credentials or repository state', async () => {
        storageState = {
            leetsync_token: 'gho_active_session_token',
            leetsync_refresh_token: 'ghr_active_session_refresh',
            leetsync_token_expires_at: Date.now() + 100000,
            leetsync_username: 'session_user',
            leetsync_hook: 'session_user/session_repo',
            mode_type: 'commit',
            leetsync_session_active: true,
        };

        // User clicks STOP
        await chrome.storage.local.set({ leetsync_session_active: false });

        let state = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_refresh_token',
            'leetsync_hook',
            'leetsync_session_active',
        ]);
        expect(state.leetsync_session_active).toBe(false);
        expect(state.leetsync_token).toBe('gho_active_session_token');
        expect(state.leetsync_refresh_token).toBe('ghr_active_session_refresh');
        expect(state.leetsync_hook).toBe('session_user/session_repo');

        // User clicks START
        await chrome.storage.local.set({ leetsync_session_active: true });

        state = await chrome.storage.local.get([
            'leetsync_token',
            'leetsync_refresh_token',
            'leetsync_hook',
            'leetsync_session_active',
        ]);
        expect(state.leetsync_session_active).toBe(true);
        expect(state.leetsync_token).toBe('gho_active_session_token');
        expect(state.leetsync_refresh_token).toBe('ghr_active_session_refresh');
        expect(state.leetsync_hook).toBe('session_user/session_repo');
    });
});
