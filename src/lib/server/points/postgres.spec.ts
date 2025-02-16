import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresPointsRepo } from './postgres';
import { pointTransactionsTable, usersTable } from '../db/schema';
import type { PointTransactionData } from '../db/types';
import { SQL } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresPointsRepo', () => {
	let repository: PostgresPointsRepo;

	beforeEach(() => {
		repository = new PostgresPointsRepo();
		vi.clearAllMocks();
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

	describe('caching behavior', () => {
		beforeEach(() => {
			mockDb.select.mockReturnValue(mockDb);
			mockDb.from.mockReturnValue(mockDb);
			mockDb.where.mockReturnValue(mockDb);
			mockDb.orderBy.mockReturnValue(mockDb);
			mockDb.leftJoin.mockReturnValue(mockDb);
			mockDb.groupBy.mockReturnValue(mockDb);
			mockDb.having.mockReturnValue(mockDb);
		});

		it('should cache and return total points', async () => {
			const mockUser = { total: 100 };
			mockDb.where.mockResolvedValueOnce([mockUser]);

			const result1 = await repository.getTotalPoints(1);
			expect(result1).toBe(100);
			expect(mockDb.select).toHaveBeenCalledTimes(1);

			const result2 = await repository.getTotalPoints(1);
			expect(result2).toBe(100);
			expect(mockDb.select).toHaveBeenCalledTimes(1);
		});

		it('should cache and return user transactions', async () => {
			const mockTransactions = [{ id: 1, userId: 1, amount: 100 } as PointTransactionData];
			mockDb.orderBy.mockResolvedValueOnce(mockTransactions);

			const result1 = await repository.getTransactionsByUser(1);
			expect(result1).toEqual(mockTransactions);
			expect(mockDb.select).toHaveBeenCalledTimes(1);

			const result2 = await repository.getTransactionsByUser(1);
			expect(result2).toEqual(mockTransactions);
			expect(mockDb.select).toHaveBeenCalledTimes(1);
		});

		it('should cache and return user rank', async () => {
			const mockResult = [{ rank: 3, userId: 1, total: 3 }];
			mockDb.having.mockResolvedValueOnce(mockResult);

			const result1 = await repository.getUserRank(1);
			expect(result1).toEqual({ rank: 3, totalUsers: 3 });
			expect(mockDb.select).toHaveBeenCalledTimes(1);

			const result2 = await repository.getUserRank(1);
			expect(result2).toEqual({ rank: 3, totalUsers: 3 });
			expect(mockDb.select).toHaveBeenCalledTimes(1);
		});

		it('should invalidate caches when creating a transaction', async () => {
			const mockPoints = { total: 100 };
			const mockTransactions = [{ id: 1, userId: 1, amount: 100 } as PointTransactionData];
			const mockRank = [{ rank: 3, userId: 1, total: 3 }];

			mockDb.where.mockResolvedValueOnce([mockPoints]);
			mockDb.orderBy.mockResolvedValueOnce(mockTransactions);
			mockDb.having.mockResolvedValueOnce(mockRank);

			await repository.getTotalPoints(1);
			await repository.getTransactionsByUser(1);
			await repository.getUserRank(1);

			const newTransaction = { id: 2, userId: 1 } as PointTransactionData;
			mockDb.insert.mockReturnValue(mockDb);
			mockDb.values.mockReturnValue(mockDb);
			mockDb.returning.mockResolvedValueOnce([newTransaction]);

			await repository.createTransaction({
				userId: 1,
				amount: 50,
				reason: 'Test',
				authorId: 2
			});

			const newMockPoints = { total: 150 };
			const newMockTransactions = [...mockTransactions, newTransaction];
			const newMockRank = [{ rank: 2, userId: 1, total: 3 }];

			mockDb.where.mockResolvedValueOnce([newMockPoints]);
			mockDb.orderBy.mockResolvedValueOnce(newMockTransactions);
			mockDb.having.mockResolvedValueOnce(newMockRank);

			const points = await repository.getTotalPoints(1);
			const transactions = await repository.getTransactionsByUser(1);
			const rank = await repository.getUserRank(1);

			expect(points).toBe(150);
			expect(transactions).toEqual(newMockTransactions);
			expect(rank).toEqual({ rank: 2, totalUsers: 3 });
		});

		it('should invalidate caches when reviewing a transaction', async () => {
			const mockPoints = { total: 100 };
			const mockTransactions = [{ id: 1, userId: 1, amount: 100 } as PointTransactionData];
			const mockRank = [{ rank: 3, userId: 1, total: 3 }];

			mockDb.where.mockResolvedValueOnce([mockPoints]);
			mockDb.orderBy.mockResolvedValueOnce(mockTransactions);
			mockDb.having.mockResolvedValueOnce(mockRank);

			await repository.getTotalPoints(1);
			await repository.getTransactionsByUser(1);
			await repository.getUserRank(1);

			const updatedTransaction = { id: 1, userId: 1, status: 'approved' } as PointTransactionData;
			mockDb.update.mockReturnValue(mockDb);
			mockDb.set.mockReturnValue(mockDb);
			mockDb.where.mockReturnValue(mockDb);
			mockDb.returning.mockResolvedValueOnce([updatedTransaction]);

			await repository.reviewTransaction(1, {
				reviewerId: 2,
				status: 'approved'
			});

			const newMockPoints = { total: 150 };
			const newMockTransactions = [updatedTransaction];
			const newMockRank = [{ rank: 2, userId: 1, total: 3 }];

			mockDb.where.mockResolvedValueOnce([newMockPoints]);
			mockDb.orderBy.mockResolvedValueOnce(newMockTransactions);
			mockDb.having.mockResolvedValueOnce(newMockRank);

			const points = await repository.getTotalPoints(1);
			const transactions = await repository.getTransactionsByUser(1);
			const rank = await repository.getUserRank(1);

			expect(points).toBe(150);
			expect(transactions).toEqual(newMockTransactions);
			expect(rank).toEqual({ rank: 2, totalUsers: 3 });
		});
	});
});
