import { describe, it, expect, vi } from 'vitest';
import { endpoint_GET } from './endpoint';
import type { PointsService } from '$lib/server/points/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';
import type { LeaderboardEntry } from '$lib/server/points/types';

describe('GET /api/v1/points/leaderboard', () => {
	const mockLeaderboard: LeaderboardEntry[] = [
		{
			userId: 1,
			name: 'Alice',
			totalPoints: 200,
			transactions: []
		},
		{
			userId: 2,
			name: 'Bob',
			totalPoints: 150,
			transactions: []
		}
	];

	it('should return leaderboard data when authorized', async () => {
		const pointsService = {
			getLeaderboard: vi.fn().mockResolvedValue(mockLeaderboard)
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual(mockLeaderboard);
		expect(pointsService.getLeaderboard).toHaveBeenCalled();
	});

	it('should return 401 when user is not authenticated', async () => {
		const pointsService = {
			getLeaderboard: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
	});

	it('should return 401 when user is not an organizer', async () => {
		const pointsService = {
			getLeaderboard: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
	});

	it('should return empty array when no data exists', async () => {
		const pointsService = {
			getLeaderboard: vi.fn().mockResolvedValue([])
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual([]);
	});
});
