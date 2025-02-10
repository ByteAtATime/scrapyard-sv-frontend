import { describe, it, expect, vi } from 'vitest';
import { ClerkAuthProvider } from './clerk';
import type { AuthObject } from '@clerk/backend';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

const mockClerkClient = vi.hoisted(() => ({
	users: {
		getUser: vi.fn().mockResolvedValue({
			fullName: 'John Doe',
			firstName: 'John',
			lastName: 'Doe',
			emailAddresses: [{ emailAddress: 'john.doe@example.com' }]
		})
	}
}));

vi.mock('clerk-sveltekit/server', () => ({
	clerkClient: mockClerkClient
}));

describe('ClerkAuthProvider', () => {
	describe('isAuthenticated', () => {
		it('should return true if auth.userId is set', () => {
			const auth = { userId: 'user123' } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			expect(provider.isAuthenticated()).toBe(true);
		});

		it('should return false if auth.userId is null', () => {
			const auth = { userId: null } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			expect(provider.isAuthenticated()).toBe(false);
		});
	});

	describe('getUserId', () => {
		it('should return user ID if user exists in DB', async () => {
			const auth = { userId: 'clerkId1' } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			mockDb
				.select()
				.from()
				.where()
				.execute.mockResolvedValue([{ id: 'userId1' }]);

			const userId = await provider.getUserId();
			expect(userId).toBe('userId1');
		});
		it('should insert user and return null if user does not exist in DB', async () => {
			const auth = { userId: 'clerkId2' } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			mockDb.select().from().where().execute.mockResolvedValue([]);

			const userId = await provider.getUserId();
			expect(mockDb.insert).toHaveBeenCalled();
			expect(userId).toBeNull();
		});

		it('should insert user with firstName and lastName if fullName is not available', async () => {
			const auth = { userId: 'clerkId3' } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			mockDb.select().from().where().execute.mockResolvedValue([]);
			mockClerkClient.users.getUser.mockResolvedValue({
				fullName: undefined,
				firstName: 'Jane',
				lastName: 'Smith',
				emailAddresses: [{ emailAddress: 'jane.smith@example.com' }]
			});

			const userId = await provider.getUserId();
			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Jane Smith'
				})
			);
			expect(userId).toBeNull();
		});

		it('should return null if auth.userId is null', async () => {
			const auth = { userId: null } as AuthObject;
			const provider = new ClerkAuthProvider(auth);

			const userId = await provider.getUserId();
			expect(userId).toBeNull();
		});
	});

	describe('isOrganizer', () => {
		it('should return true if user is admin', async () => {
			const auth = { userId: 'clerkId3' } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			mockDb.query.usersTable.findFirst.mockResolvedValue({ isOrganizer: true });

			const isOrganizer = await provider.isOrganizer();
			expect(isOrganizer).toBe(true);
		});

		it('should return false if user is not admin', async () => {
			const auth = { userId: 'clerkId4' } as AuthObject;
			const provider = new ClerkAuthProvider(auth);
			mockDb.query.usersTable.findFirst.mockResolvedValue({ isOrganizer: false });

			const isOrganizer = await provider.isOrganizer();
			expect(isOrganizer).toBe(false);
		});

		it('should return false if auth.userId is null', async () => {
			const auth = { userId: null } as AuthObject;
			const provider = new ClerkAuthProvider(auth);

			const isOrganizer = await provider.isOrganizer();
			expect(isOrganizer).toBe(false);
		});
	});
});
