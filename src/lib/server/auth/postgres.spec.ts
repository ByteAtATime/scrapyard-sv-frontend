import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresUserRepository } from './postgres';
import { usersTable } from '$lib/server/db/schema';
import type { UserData } from '$lib/server/db/types';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresUserRepository', () => {
	let repository: PostgresUserRepository;

	beforeEach(() => {
		repository = new PostgresUserRepository();
		vi.clearAllMocks();
	});

	describe('findByAuthId', () => {
		it('should return null when user not found', async () => {
			mockDb.select().from().where.mockResolvedValueOnce([]);
			const result = await repository.findByAuthId('clerk', 'user_123');
			expect(result).toBeNull();
		});

		it('should return user when found', async () => {
			const mockUser = { id: 1, name: 'Test User' } as UserData;
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			const result = await repository.findByAuthId('clerk', 'user_123');
			expect(result).toEqual(mockUser);
		});
	});

	describe('findById', () => {
		it('should return null when user not found', async () => {
			mockDb.select().from().where.mockResolvedValueOnce([]);
			const result = await repository.findById(1);
			expect(result).toBeNull();
		});

		it('should return user when found', async () => {
			const mockUser = { id: 1, name: 'Test User' } as UserData;
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			const result = await repository.findById(1);
			expect(result).toEqual(mockUser);
		});
	});

	describe('create', () => {
		it('should create and return a new user', async () => {
			const mockUser = { id: 1, name: 'Test User' } as UserData;
			mockDb.insert().values.mockReturnThis();
			mockDb.returning.mockResolvedValueOnce([mockUser]);

			const result = await repository.create({
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'user_123'
			});

			expect(result).toEqual(mockUser);
			expect(mockDb.insert).toHaveBeenCalledWith(usersTable);
		});
	});
});
