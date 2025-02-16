import { describe, it, expect } from 'vitest';
import { endpoint_GET } from './endpoint';
import { MockPointsRepo } from '$lib/server/points/mock';

describe('GET /api/v1/points/leaderboard', () => {
	it('should return leaderboard data with empty transaction histories when available', async () => {
		const pointsRepo = new MockPointsRepo();
		const mockLeaderboard = [
			{ userId: 1, name: 'Alice', totalPoints: 200, transactions: [] },
			{ userId: 2, name: 'Bob', totalPoints: 150, transactions: [] }
		];
		pointsRepo.getLeaderboard.mockResolvedValue(mockLeaderboard);

		const result = await endpoint_GET({ pointsRepo });

		expect(result).toEqual(mockLeaderboard);
		expect(pointsRepo.getLeaderboard).toHaveBeenCalled();
	});

	it('should return leaderboard data with populated transaction history', async () => {
		const pointsRepo = new MockPointsRepo();
		const mockLeaderboard = [
			{
				userId: 1,
				name: 'Alice',
				totalPoints: 200,
				transactions: [
					{
						id: 101,
						amount: 100,
						reason: 'Award',
						status: 'approved',
						createdAt: '2023-10-01T12:00:00Z'
					},
					{
						id: 102,
						amount: 100,
						reason: 'Bonus',
						status: 'approved',
						createdAt: '2023-10-02T12:00:00Z'
					}
				]
			}
		];
		pointsRepo.getLeaderboard.mockResolvedValue(mockLeaderboard);

		const result = await endpoint_GET({ pointsRepo });
		expect(result).toEqual(mockLeaderboard);
	});

	it('should return an empty leaderboard when no data', async () => {
		const pointsRepo = new MockPointsRepo();
		pointsRepo.getLeaderboard.mockResolvedValue([]);

		const result = await endpoint_GET({ pointsRepo });
		expect(result).toEqual([]);
	});
});
