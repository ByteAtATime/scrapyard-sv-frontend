import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresPointsRepository } from './postgres';
import { SQL } from 'drizzle-orm';

const mockDb = vi.hoisted(() => ({
	query: {
		usersTable: {
			findFirst: vi.fn()
		}
	}
}));

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresPointsRepository', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTotalPoints', () => {
		it('should return total points for a user', async () => {
			const userId = 1;
			const expectedPoints = 100;
			mockDb.query.usersTable.findFirst.mockResolvedValue({ totalPoints: expectedPoints });

			const repo = new PostgresPointsRepository();
			const points = await repo.getTotalPoints(userId);

			expect(points).toBe(expectedPoints);
			expect(mockDb.query.usersTable.findFirst).toHaveBeenCalledWith({
				where: expect.any(SQL),
				columns: {
					totalPoints: true
				}
			});
		});

		it('should throw an error if user is not found', async () => {
			const userId = 1;
			mockDb.query.usersTable.findFirst.mockResolvedValue(null);

			const repo = new PostgresPointsRepository();

			await expect(repo.getTotalPoints(userId)).rejects.toThrow('User not found');
		});

		it('should throw an error if totalPoints is not found', async () => {
			const userId = 1;
			mockDb.query.usersTable.findFirst.mockResolvedValue({});

			const repo = new PostgresPointsRepository();

			await expect(repo.getTotalPoints(userId)).rejects.toThrow('User not found');
		});
	});
});
