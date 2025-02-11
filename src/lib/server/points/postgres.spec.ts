import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresPointsRepository } from './postgres';
import { PointTransaction } from './transaction';
import {
	eventAttendanceTable,
	eventsTable,
	pointTransactionsTable,
	usersTable
} from '../db/schema';
import { MockAuthProvider } from '../auth/mock';
import { SQL } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresPointsRepository', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getPoints', () => {
		it('should return total points for a user', async () => {
			const userId = 1;
			const expectedPoints = 100;

			mockDb.where.mockResolvedValue([{ totalPoints: expectedPoints }]);

			const repo = new PostgresPointsRepository();
			const points = await repo.getTotalPoints(userId);

			expect(points).toBe(expectedPoints);
			expect(mockDb.where).toHaveBeenCalled();
		});

		it('should throw an error if user is not found', async () => {
			const userId = 1;
			mockDb.where.mockResolvedValue([]);

			const repo = new PostgresPointsRepository();

			await expect(repo.getTotalPoints(userId)).rejects.toThrow('User not found');
		});

		it('should throw an error if totalPoints is not found', async () => {
			const userId = 1;
			mockDb.where.mockResolvedValue([{ totalPoints: null }]);

			const repo = new PostgresPointsRepository();

			await expect(repo.getTotalPoints(userId)).rejects.toThrow('User not found');
		});
	});

	describe('awardPoints', () => {
		it('should award points to a user', async () => {
			const authProvider = new MockAuthProvider();

			const transaction = new PointTransaction(
				{
					id: 0,
					userId: 1,
					amount: 100,
					reason: 'Test',
					authorId: 1,
					createdAt: new Date(),
					status: 'pending',
					reviewerId: null,
					reviewedAt: null,
					rejectionReason: null
				},
				authProvider
			);
			mockDb
				.insert()
				.values()
				.returning.mockResolvedValue([{ id: 5 }]);

			const repo = new PostgresPointsRepository();
			const id = await repo.awardPoints(transaction);

			expect(id).toBe(5);
			expect(mockDb.insert).toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				userId: transaction.userId,
				amount: transaction.amount,
				reason: transaction.reason,
				authorId: transaction.authorId
			});
			expect(mockDb.returning).toHaveBeenCalled();
		});
	});

	describe('getPointsStatistics', () => {
		it('should return correct statistics with non-zero attendees', async () => {
			const repo = new PostgresPointsRepository();

			mockDb.leftJoin
				.mockImplementationOnce(() => mockDb)
				.mockImplementationOnce(() =>
					Promise.resolve([
						{
							totalPointsAwarded: 1000,
							totalAttendees: 10
						}
					])
				);

			mockDb.limit.mockResolvedValueOnce([
				{
					userId: 1,
					name: 'John Doe',
					totalPoints: 500
				}
			]);

			const result = await repo.getPointsStatistics();

			expect(result.totalPointsAwarded).toBe(1000);
			expect(result.averagePointsPerAttendee).toBe(100);
			expect(result.topEarner).toEqual({
				userId: 1,
				name: 'John Doe',
				totalPoints: 500
			});

			expect(mockDb.select).toHaveBeenCalledWith({
				totalPointsAwarded: expect.any(Object),
				totalAttendees: expect.any(Object)
			});
			expect(mockDb.from).toHaveBeenCalledWith(eventsTable);
			expect(mockDb.leftJoin).toHaveBeenNthCalledWith(1, eventAttendanceTable, expect.any(Object));
			expect(mockDb.leftJoin).toHaveBeenNthCalledWith(
				2,
				pointTransactionsTable,
				expect.any(Object)
			);

			expect(mockDb.select).toHaveBeenCalledWith({
				userId: usersTable.id,
				name: usersTable.name,
				totalPoints: usersTable.totalPoints
			});
			expect(mockDb.from).toHaveBeenCalledWith(usersTable);
			expect(mockDb.orderBy).toHaveBeenCalledWith(expect.any(Object));
			expect(mockDb.limit).toHaveBeenCalledWith(1);
		});

		it('should handle zero attendees', async () => {
			const repo = new PostgresPointsRepository();

			mockDb.leftJoin
				.mockImplementationOnce(() => mockDb)
				.mockImplementationOnce(() =>
					Promise.resolve([
						{
							totalPointsAwarded: 0,
							totalAttendees: 0
						}
					])
				);

			mockDb.limit.mockResolvedValueOnce([
				{
					userId: 1,
					name: 'Jane Smith',
					totalPoints: 0
				}
			]);

			const result = await repo.getPointsStatistics();

			expect(result.totalPointsAwarded).toBe(0);
			expect(result.averagePointsPerAttendee).toBe(0);
			expect(result.topEarner).toEqual({
				userId: 1,
				name: 'Jane Smith',
				totalPoints: 0
			});
		});
	});

	describe('getTransactionsByUser', () => {
		it('should return a list of transactions for a specific user', async () => {
			const userId = 1;
			const mockTransaction = {
				id: 10,
				userId: userId,
				amount: 50,
				reason: 'Test',
				authorId: 2,
				createdAt: new Date(),
				status: 'pending',
				reviewerId: null,
				reviewedAt: null,
				rejectionReason: null,
				user: { id: userId, name: 'Test User', email: 'test@example.com' },
				author: { id: 2, name: 'Author', email: 'author@example.com' },
				reviewer: null
			};

			mockDb.orderBy.mockResolvedValueOnce([mockTransaction]);

			const repo = new PostgresPointsRepository();
			const transactions = await repo.getTransactionsByUser(userId);

			expect(transactions).toHaveLength(1);
			expect(transactions[0]).toEqual(mockTransaction);

			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should return an empty list if no transactions are found', async () => {
			const userId = 999;

			mockDb.orderBy.mockResolvedValueOnce([]);

			const repo = new PostgresPointsRepository();
			const transactions = await repo.getTransactionsByUser(userId);

			expect(transactions).toEqual([]);
		});
	});
});
