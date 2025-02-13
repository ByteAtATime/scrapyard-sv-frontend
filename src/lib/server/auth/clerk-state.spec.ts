import { describe, it, expect } from 'vitest';
import { ClerkAuthState } from './clerk-state';
import type { AuthObject } from '@clerk/backend';

describe('ClerkAuthState', () => {
	describe('userId', () => {
		it('should return userId from auth object when present', () => {
			const auth = {
				userId: 'user_123',
				sessionClaims: {},
				sessionId: 'session_123',
				actor: null,
				orgId: null,
				orgRole: null,
				orgSlug: null,
				getToken: async () => 'token',
				has: () => false,
				debug: () => ''
			} as unknown as AuthObject;
			const state = new ClerkAuthState(auth);
			expect(state.userId).toBe('user_123');
		});

		it('should return null when userId is not present', () => {
			const auth = {
				userId: null,
				sessionClaims: {},
				sessionId: null,
				actor: null,
				orgId: null,
				orgRole: null,
				orgSlug: null,
				getToken: async () => null,
				has: () => false,
				debug: () => ''
			} as unknown as AuthObject;
			const state = new ClerkAuthState(auth);
			expect(state.userId).toBeNull();
		});
	});

	describe('isAuthenticated', () => {
		it('should return true when userId is present', () => {
			const auth = {
				userId: 'user_123',
				sessionClaims: {},
				sessionId: 'session_123',
				actor: null,
				orgId: null,
				orgRole: null,
				orgSlug: null,
				getToken: async () => 'token',
				has: () => false,
				debug: () => ''
			} as unknown as AuthObject;
			const state = new ClerkAuthState(auth);
			expect(state.isAuthenticated).toBe(true);
		});

		it('should return false when userId is not present', () => {
			const auth = {
				userId: null,
				sessionClaims: {},
				sessionId: null,
				actor: null,
				orgId: null,
				orgRole: null,
				orgSlug: null,
				getToken: async () => null,
				has: () => false,
				debug: () => ''
			} as unknown as AuthObject;
			const state = new ClerkAuthState(auth);
			expect(state.isAuthenticated).toBe(false);
		});
	});
});
