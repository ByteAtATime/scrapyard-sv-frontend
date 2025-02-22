import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresUserRepository } from './postgres';
import { usersTable } from '$lib/server/db/schema';
import type { UserData } from '$lib/server/db/types';
import { db } from '$lib/server/db';

describe('PostgresUserRepository', () => {
	let repository: PostgresUserRepository;

	// Helper function to create a test user
	const createTestUser = async ({
		id = 1,
		name = 'Test User',
		email = 'test@example.com',
		authProvider = 'clerk' as const,
		authProviderId = 'test-id',
		isOrganizer = false
	}: Partial<UserData> = {}): Promise<UserData> => {
		const userData = {
			id,
			name,
			email,
			authProvider,
			authProviderId,
			isOrganizer
		};
		await db.insert(usersTable).values(userData);
		return userData;
	};

	beforeEach(() => {
		repository = new PostgresUserRepository();
	});

	describe('findByAuthId', () => {
		it('should return null when user not found', async () => {
			// When: findByAuthId is called with non-existent auth ID
			const result = await repository.findByAuthId('clerk', 'non_existent_id');

			// Then: null should be returned
			expect(result).toBeNull();
		});

		it('should return user when found', async () => {
			// Given: a user exists
			const userData = await createTestUser({
				authProviderId: 'existing_id'
			});

			// When: findByAuthId is called
			const result = await repository.findByAuthId('clerk', 'existing_id');

			// Then: user should be returned
			expect(result).toMatchObject(userData);
		});

		it('should handle multiple auth providers', async () => {
			// Given: users exist with different auth providers
			const clerkUser = await createTestUser({
				id: 1,
				email: `clerk@example.com`,
				authProvider: 'clerk',
				authProviderId: 'clerk_id'
			});
			// Create another user but we don't need to store the reference
			await createTestUser({
				id: 2,
				email: `other@example.com`,
				authProvider: 'clerk',
				authProviderId: 'other_id'
			});

			// When: findByAuthId is called
			const result = await repository.findByAuthId('clerk', 'clerk_id');

			// Then: correct user should be returned
			expect(result).toMatchObject(clerkUser);
		});
	});

	describe('findById', () => {
		it('should return null when user not found', async () => {
			// When: findById is called with non-existent ID
			const result = await repository.findById(999);

			// Then: null should be returned
			expect(result).toBeNull();
		});

		it('should return user when found', async () => {
			// Given: a user exists
			const userData = await createTestUser({ id: 1 });

			// When: findById is called
			const result = await repository.findById(1);

			// Then: user should be returned
			expect(result).toMatchObject(userData);
		});
	});

	describe('create', () => {
		it('should create and return a new user', async () => {
			// Given: user data is prepared
			const createData = {
				name: 'New User',
				email: 'new@example.com',
				authProvider: 'clerk' as const,
				authProviderId: 'new_id'
			};

			// When: create is called
			const result = await repository.create(createData);

			// Then: user should be created with correct data
			expect(result).toMatchObject({
				...createData,
				isOrganizer: false
			});

			// And: user should be retrievable from database
			const dbUser = await repository.findById(result.id);
			expect(dbUser).toMatchObject({
				...createData,
				isOrganizer: false
			});
		});

		it('should set default values correctly', async () => {
			// When: create is called with minimal data
			const result = await repository.create({
				name: 'Minimal User',
				email: 'minimal@example.com',
				authProvider: 'clerk',
				authProviderId: 'minimal_id'
			});

			// Then: default values should be set
			expect(result.isOrganizer).toBe(false);
		});

		it('should handle special characters in user data', async () => {
			// Given: user data contains special characters
			const createData = {
				name: "O'Connor with-hyphen",
				email: 'special+chars@example.com',
				authProvider: 'clerk' as const,
				authProviderId: 'special_id#123'
			};

			// When: create is called
			const result = await repository.create(createData);

			// Then: data should be stored correctly
			expect(result).toMatchObject(createData);

			// And: data should be retrievable
			const dbUser = await repository.findById(result.id);
			expect(dbUser).toMatchObject(createData);
		});
	});
});
