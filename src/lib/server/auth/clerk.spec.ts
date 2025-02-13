import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClerkAuthProvider } from './clerk';
import type { AuthObject } from '@clerk/backend';
import type { UserData } from '$lib/server/db/types';
import { User } from './user';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('ClerkAuthProvider', () => {
	let provider: ClerkAuthProvider;
	let mockAuth: AuthObject;

	beforeEach(() => {
		mockAuth = {
			userId: null,
			sessionClaims: { __raw: '', iss: '', sub: '', sid: '' },
			getToken: async () => null
		} as unknown as AuthObject;

		provider = new ClerkAuthProvider(mockAuth);
		vi.clearAllMocks();
	});

	describe('isAuthenticated', () => {
		it('should return false when not authenticated', () => {
			expect(provider.isAuthenticated()).toBe(false);
		});

		it('should return true when authenticated', () => {
			mockAuth.userId = 'user_123';
			provider = new ClerkAuthProvider(mockAuth);
			expect(provider.isAuthenticated()).toBe(true);
		});
	});

	describe('getUserId', () => {
		it('should return null when not authenticated', async () => {
			expect(await provider.getUserId()).toBeNull();
		});

		it('should return user id when authenticated', async () => {
			mockAuth.userId = 'user_123';
			provider = new ClerkAuthProvider(mockAuth);
			const mockUser = { id: 1 } as UserData;
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			expect(await provider.getUserId()).toBe(1);
		});
	});

	describe('isOrganizer', () => {
		it('should return false when not authenticated', async () => {
			expect(await provider.isOrganizer()).toBe(false);
		});

		it('should return true when user is organizer', async () => {
			mockAuth.userId = 'user_123';
			provider = new ClerkAuthProvider(mockAuth);
			const mockUser = { id: 1, isOrganizer: true } as UserData;
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			expect(await provider.isOrganizer()).toBe(true);
		});
	});

	describe('getCurrentUser', () => {
		it('should return null when not authenticated', async () => {
			expect(await provider.getCurrentUser()).toBeNull();
		});

		it('should return User instance when authenticated', async () => {
			mockAuth.userId = 'user_123';
			provider = new ClerkAuthProvider(mockAuth);
			const mockUser = {
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				totalPoints: 0,
				isOrganizer: false
			} as UserData;
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			const result = await provider.getCurrentUser();
			expect(result).toBeInstanceOf(User);
			expect(result?.id).toBe(1);
			expect(result?.name).toBe('Test User');
		});
	});

	describe('getUserById', () => {
		it('should return null when user not found', async () => {
			mockDb.select().from().where.mockResolvedValueOnce([]);
			expect(await provider.getUserById(1)).toBeNull();
		});

		it('should return user data when found', async () => {
			const mockUser = { id: 1, name: 'Test User' } as UserData;
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			const result = await provider.getUserById(1);
			expect(result).toEqual(mockUser);
		});
	});
});
