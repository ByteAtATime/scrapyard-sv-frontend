import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresPointsRepository } from './postgres';
import { PointTransaction } from './transaction';
import { pointTransactionsTable } from '../db/schema';
import { MockAuthProvider } from '../auth/mock';

const mockDb = vi.hoisted(() => ({
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	returning: vi.fn().mockReturnThis()
}));

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
});
