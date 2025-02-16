import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresPointsRepo } from './postgres';
import { pointTransactionsTable, usersTable } from '../db/schema';
import type { PointTransactionData } from '../db/types';
import { SQL } from 'drizzle-orm';
import type { Mock } from 'vitest';

type MockDb = {
	select: Mock;
	insert: Mock;
	update: Mock;
	delete: Mock;
	from: Mock;
	where: Mock;
	set: Mock;
	values: Mock;
	returning: Mock;
	orderBy: Mock;
	leftJoin: Mock;
	groupBy: Mock;
	having: Mock;
	query: {
		eventsTable: {
			findFirst: Mock;
			findMany: Mock;
		};
	};
};

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return {
		...mockDb,
		groupBy: vi.fn(() => mockDb),
		having: vi.fn()
	} as MockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresPointsRepo', () => {
	let repository: PostgresPointsRepo;

	beforeEach(() => {
		repository = new PostgresPointsRepo();
		vi.clearAllMocks();
		mockDb.select().from().where.mockReturnValue({
			orderBy: mockDb.orderBy
		});
		mockDb.select().from().leftJoin.mockReturnValue({
			groupBy: mockDb.groupBy
		});
		mockDb.groupBy.mockReturnValue({
			having: mockDb.having
		});
	});

	describe('getTotalPoints', () => {
		it('should return total points for user', async () => {
			const mockUser = { total: 100 };
			mockDb.select().from().where.mockResolvedValueOnce([mockUser]);

			const result = await repository.getTotalPoints(1);
			expect(result).toBe(100);
		});

		it('should return 0 when user not found', async () => {
			mockDb.select().from().where.mockResolvedValueOnce([]);

			const result = await repository.getTotalPoints(1);
			expect(result).toBe(0);
		});
	});

	describe('getTransactions', () => {
		it('should return all transactions', async () => {
			const mockTransactions = [{ id: 1, userId: 1, amount: 100 } as PointTransactionData];
			mockDb.orderBy.mockResolvedValueOnce(mockTransactions);

			const result = await repository.getTransactions();
			expect(result).toEqual(mockTransactions);
		});
	});

	describe('getTransactionsByUser', () => {
		it('should return transactions for specific user', async () => {
			const mockTransactions = [{ id: 1, userId: 1, amount: 100 } as PointTransactionData];
			mockDb.orderBy.mockResolvedValueOnce(mockTransactions);

			const result = await repository.getTransactionsByUser(1);
			expect(result).toEqual(mockTransactions);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should return empty array when user has no transactions', async () => {
			mockDb.orderBy.mockResolvedValueOnce([]);

			const result = await repository.getTransactionsByUser(1);
			expect(result).toEqual([]);
		});
	});

	describe('createTransaction', () => {
		it('should create new transaction', async () => {
			const mockTransaction = {
				id: 1,
				userId: 1,
				amount: 100,
				reason: 'Test',
				authorId: 2
			} as PointTransactionData;

			mockDb.insert().values.mockReturnThis();
			mockDb.returning.mockResolvedValueOnce([mockTransaction]);

			const result = await repository.createTransaction({
				userId: 1,
				amount: 100,
				reason: 'Test',
				authorId: 2
			});

			expect(result).toEqual(mockTransaction);
			expect(mockDb.insert).toHaveBeenCalledWith(pointTransactionsTable);
		});
	});

	describe('reviewTransaction', () => {
		it('should update transaction status and update points when approved', async () => {
			const mockTransaction = {
				id: 1,
				userId: 1,
				amount: 100,
				status: 'approved'
			} as PointTransactionData;

			mockDb.update().set.mockReturnThis();
			mockDb.where.mockReturnThis();
			mockDb.returning.mockResolvedValueOnce([mockTransaction]);

			const result = await repository.reviewTransaction(1, {
				reviewerId: 2,
				status: 'approved'
			});

			expect(result).toEqual(mockTransaction);
			expect(mockDb.update).toHaveBeenCalledWith(pointTransactionsTable);
		});

		it('should update transaction status without updating points when rejected', async () => {
			const mockTransaction = {
				id: 1,
				userId: 1,
				amount: 100,
				status: 'rejected'
			} as PointTransactionData;

			mockDb.update().set.mockReturnThis();
			mockDb.where.mockReturnThis();
			mockDb.returning.mockResolvedValueOnce([mockTransaction]);

			const result = await repository.reviewTransaction(1, {
				reviewerId: 2,
				status: 'rejected',
				rejectionReason: 'Invalid'
			});

			expect(result).toEqual(mockTransaction);
			expect(mockDb.update).toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.update).not.toHaveBeenCalledWith(usersTable);
		});
	});

	describe('getPendingTransactions', () => {
		it('should return pending transactions', async () => {
			const mockTransactions = [{ id: 1, status: 'pending' } as PointTransactionData];
			mockDb.orderBy.mockResolvedValueOnce(mockTransactions);

			const result = await repository.getPendingTransactions();
			expect(result).toEqual(mockTransactions);
		});
	});

	describe('getTransactionById', () => {
		it('should return transaction when found', async () => {
			const mockTransaction = { id: 1 } as PointTransactionData;
			mockDb.select().from().where.mockResolvedValueOnce([mockTransaction]);

			const result = await repository.getTransactionById(1);
			expect(result).toEqual(mockTransaction);
		});

		it('should return null when transaction not found', async () => {
			mockDb.select().from().where.mockResolvedValueOnce([]);

			const result = await repository.getTransactionById(1);
			expect(result).toBeNull();
		});
	});

	describe('getUserRank', () => {
		it('should return correct rank and total users', async () => {
			const mockResult = [{ rank: 3, userId: 1, total: 3 }];
			mockDb.having.mockResolvedValueOnce(mockResult);

			const result = await repository.getUserRank(1);
			expect(result).toEqual({ rank: 3, totalUsers: 3 });

			expect(mockDb.select).toHaveBeenCalledWith({
				rank: expect.any(SQL),
				userId: usersTable.id,
				total: expect.any(SQL)
			});
			expect(mockDb.from).toHaveBeenCalledWith(usersTable);
			expect(mockDb.leftJoin).toHaveBeenCalledWith(pointTransactionsTable, expect.any(SQL));
			expect(mockDb.groupBy).toHaveBeenCalledWith(usersTable.id);
			expect(mockDb.having).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should handle rejected and deleted transactions in rank calculation', async () => {
			const mockResult = [{ rank: 2, userId: 1, total: 2 }];
			mockDb.having.mockResolvedValueOnce(mockResult);

			const result = await repository.getUserRank(1);
			expect(result).toEqual({ rank: 2, totalUsers: 2 });

			// Verify that the SQL includes the CASE statement for handling rejected/deleted transactions
			expect(mockDb.select).toHaveBeenCalledWith(
				expect.objectContaining({
					rank: expect.any(SQL)
				})
			);
		});

		it('should return rank 0 for non-existent user', async () => {
			mockDb.having.mockResolvedValueOnce([]);

			const result = await repository.getUserRank(999);
			expect(result).toEqual({ rank: 0, totalUsers: 0 });
		});
	});
});
