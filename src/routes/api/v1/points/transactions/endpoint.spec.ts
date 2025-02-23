import { describe, it, expect, vi } from 'vitest';
import { endpoint_GET } from './endpoint';
import type { PointsService } from '$lib/server/points/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';
import type { PointTransaction } from '$lib/server/points/transaction';

describe('GET /api/v1/points/transactions', () => {
	const mockTransaction: PointTransaction = {
		id: 1,
		userId: 1,
		amount: 100,
		reason: 'Test',
		status: 'pending',
		authorId: 1,
		createdAt: new Date('2025-02-22T23:33:59.678Z')
	} as PointTransaction;

	it('should return transactions when authorized', async () => {
		const pointsService = {
			getTransactions: vi.fn().mockResolvedValue([mockTransaction])
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual([mockTransaction]);
		expect(pointsService.getTransactions).toHaveBeenCalled();
	});

	it('should return 401 when user is not authenticated', async () => {
		const pointsService = {
			getTransactions: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
	});

	it('should return 401 when user is not an organizer', async () => {
		const pointsService = {
			getTransactions: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
	});

	it('should return empty array when no transactions exist', async () => {
		const pointsService = {
			getTransactions: vi.fn().mockResolvedValue([])
		} as unknown as PointsService;

		const result = await endpoint_GET({ pointsService });

		expect(result).toEqual([]);
	});
});
