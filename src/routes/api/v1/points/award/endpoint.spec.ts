import { describe, it, expect, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import { PointsService } from '$lib/server/points/service';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	UserNotFoundError
} from '$lib/server/points/types';

describe('POST /api/v1/points/award', () => {
	it('should return success when points are awarded', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockResolvedValue(undefined)
		} as unknown as PointsService;

		const body = { userId: 1, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({ success: true });
		expect(pointsService.awardPoints).toHaveBeenCalledWith(1, 100, 'Test reason');
	});

	it('should return 401 when user is not authenticated', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as PointsService;

		const body = { userId: 1, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
		expect(pointsService.awardPoints).toHaveBeenCalledWith(1, 100, 'Test reason');
	});

	it('should return 401 when user is not an organizer', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as PointsService;

		const body = { userId: 1, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
		expect(pointsService.awardPoints).toHaveBeenCalledWith(1, 100, 'Test reason');
	});

	it('should return 404 when target user is not found', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockRejectedValue(new UserNotFoundError(999))
		} as unknown as PointsService;

		const body = { userId: 999, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'User with ID 999 not found',
			status: 404
		});
		expect(pointsService.awardPoints).toHaveBeenCalledWith(999, 100, 'Test reason');
	});

	it('should return 500 when unexpected error occurs', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as PointsService;

		const body = { userId: 1, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500
		});
		expect(pointsService.awardPoints).toHaveBeenCalledWith(1, 100, 'Test reason');
	});

	it('should handle negative amounts', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockResolvedValue(undefined)
		} as unknown as PointsService;

		const body = { userId: 1, amount: -50, reason: 'Penalty' };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({ success: true });
		expect(pointsService.awardPoints).toHaveBeenCalledWith(1, -50, 'Penalty');
	});

	it('should pass through long reason text', async () => {
		const pointsService = {
			awardPoints: vi.fn().mockResolvedValue(undefined)
		} as unknown as PointsService;

		const longReason = 'A '.repeat(100);
		const body = { userId: 1, amount: 100, reason: longReason };

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({ success: true });
		expect(pointsService.awardPoints).toHaveBeenCalledWith(1, 100, longReason);
	});
});
