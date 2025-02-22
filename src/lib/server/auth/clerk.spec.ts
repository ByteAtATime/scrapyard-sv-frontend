import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClerkAuthProvider } from './clerk';
import type { AuthObject } from '@clerk/backend';
import type { UserData } from '$lib/server/db/types';
import { User } from './user';
import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { clerkClient } from 'clerk-sveltekit/server';

// Mock Clerk client
vi.mock('clerk-sveltekit/server', () => ({
	clerkClient: {
		users: {
			getUser: vi.fn()
		}
	}
}));

describe('ClerkAuthProvider', () => {
	let provider: ClerkAuthProvider;
	let mockAuth: AuthObject;

	// Helper function to create a test user
	const createTestUser = async ({
		id = 1,
		name = 'Test User',
		email = 'test@example.com',
		authProviderId = 'test_clerk_id',
		isOrganizer = false
	}: Partial<UserData> = {}) => {
		const userData = {
			id,
			name,
			email,
			authProvider: 'clerk' as const,
			authProviderId,
			isOrganizer
		};
		await db.insert(usersTable).values(userData);
		return userData;
	};

	beforeEach(() => {
		mockAuth = {
			userId: null,
			sessionClaims: { __raw: '', iss: '', sub: '', sid: '' },
			getToken: async () => null
		} as unknown as AuthObject;

		provider = new ClerkAuthProvider(mockAuth);

		// Reset Clerk mock
		vi.mocked(clerkClient.users.getUser).mockReset();
	});

	describe('isAuthenticated', () => {
		it('should return false when not authenticated', () => {
			// Given: auth has no user ID
			mockAuth.userId = null;
			provider = new ClerkAuthProvider(mockAuth);

			// When/Then: isAuthenticated should return false
			expect(provider.isAuthenticated()).toBe(false);
		});

		it('should return true when authenticated', () => {
			// Given: auth has a user ID
			mockAuth.userId = 'user_123';
			provider = new ClerkAuthProvider(mockAuth);

			// When/Then: isAuthenticated should return true
			expect(provider.isAuthenticated()).toBe(true);
		});
	});

	describe('getUserId', () => {
		it('should return null when not authenticated', async () => {
			// Given: auth has no user ID
			mockAuth.userId = null;
			provider = new ClerkAuthProvider(mockAuth);

			// When/Then: getUserId should return null
			expect(await provider.getUserId()).toBeNull();
		});

		it('should return user id when authenticated and user exists', async () => {
			// Given: auth has a user ID and user exists in database
			mockAuth.userId = 'existing_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);
			const user = await createTestUser({ authProviderId: 'existing_clerk_id' });

			// When: getUserId is called
			const result = await provider.getUserId();

			// Then: user ID should be returned
			expect(result).toBe(user.id);
		});

		it('should return null when authenticated but user not found', async () => {
			// Given: auth has a user ID but user doesn't exist in database
			mockAuth.userId = 'non_existent_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);

			// Mock Clerk to throw for non-existent user
			vi.mocked(clerkClient.users.getUser).mockRejectedValueOnce(new Error('Not Found'));

			// When/Then: getUserId should return null
			expect(await provider.getUserId()).toBeNull();
		});
	});

	describe('isOrganizer', () => {
		it('should return false when not authenticated', async () => {
			// Given: auth has no user ID
			mockAuth.userId = null;
			provider = new ClerkAuthProvider(mockAuth);

			// When/Then: isOrganizer should return false
			expect(await provider.isOrganizer()).toBe(false);
		});

		it('should return true when user is organizer', async () => {
			// Given: auth has a user ID and user is an organizer
			mockAuth.userId = 'organizer_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);
			await createTestUser({
				authProviderId: 'organizer_clerk_id',
				isOrganizer: true
			});

			// When/Then: isOrganizer should return true
			expect(await provider.isOrganizer()).toBe(true);
		});

		it('should return false when user is not organizer', async () => {
			// Given: auth has a user ID but user is not an organizer
			mockAuth.userId = 'non_organizer_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);
			await createTestUser({
				authProviderId: 'non_organizer_clerk_id',
				isOrganizer: false
			});

			// When/Then: isOrganizer should return false
			expect(await provider.isOrganizer()).toBe(false);
		});

		it('should return false when user not found', async () => {
			// Given: auth has a user ID but user doesn't exist
			mockAuth.userId = 'non_existent_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);

			// Mock Clerk to throw for non-existent user
			vi.mocked(clerkClient.users.getUser).mockRejectedValueOnce(new Error('Not Found'));

			// When/Then: isOrganizer should return false
			expect(await provider.isOrganizer()).toBe(false);
		});
	});

	describe('getCurrentUser', () => {
		it('should return null when not authenticated', async () => {
			// Given: auth has no user ID
			mockAuth.userId = null;
			provider = new ClerkAuthProvider(mockAuth);

			// When/Then: getCurrentUser should return null
			expect(await provider.getCurrentUser()).toBeNull();
		});

		it('should return User instance when authenticated', async () => {
			// Given: auth has a user ID and user exists
			mockAuth.userId = 'existing_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);
			const userData = await createTestUser({
				name: 'Current User',
				email: 'current@example.com',
				authProviderId: 'existing_clerk_id'
			});

			// When: getCurrentUser is called
			const result = await provider.getCurrentUser();

			// Then: User instance should be returned with correct data
			expect(result).toBeInstanceOf(User);
			expect(result?.id).toBe(userData.id);
			expect(result?.name).toBe(userData.name);
			expect(result?.email).toBe(userData.email);
		});

		it('should return null when user not found', async () => {
			// Given: auth has a user ID but user doesn't exist
			mockAuth.userId = 'non_existent_clerk_id';
			provider = new ClerkAuthProvider(mockAuth);

			// Mock Clerk to throw for non-existent user
			vi.mocked(clerkClient.users.getUser).mockRejectedValueOnce(new Error('Not Found'));

			// When/Then: getCurrentUser should return null
			expect(await provider.getCurrentUser()).toBeNull();
		});
	});

	describe('getUserById', () => {
		it('should return null when user not found', async () => {
			// When: getUserById is called with non-existent ID
			const result = await provider.getUserById(999);

			// Then: null should be returned
			expect(result).toBeNull();
		});

		it('should return user data when found', async () => {
			// Given: a user exists
			const userData = await createTestUser({
				name: 'Found User',
				email: 'found@example.com'
			});

			// When: getUserById is called
			const result = await provider.getUserById(userData.id);

			// Then: user data should be returned
			expect(result).toMatchObject({
				id: userData.id,
				name: userData.name,
				email: userData.email,
				authProvider: 'clerk',
				authProviderId: userData.authProviderId
			});
		});

		it('should return correct organizer status', async () => {
			// Given: an organizer user exists
			const userData = await createTestUser({
				name: 'Organizer User',
				isOrganizer: true
			});

			// When: getUserById is called
			const result = await provider.getUserById(userData.id);

			// Then: isOrganizer should be true
			expect(result?.isOrganizer).toBe(true);
		});
	});
});
