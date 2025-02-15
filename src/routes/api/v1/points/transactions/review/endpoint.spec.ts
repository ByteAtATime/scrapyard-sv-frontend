import { describe, it, expect, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import type { IPointsRepo } from '$lib/server/points/types';
import type { IAuthProvider } from '$lib/server/auth/types';
import { MockAuthProvider } from '$lib/server/auth/mock';
import { MockPointsRepo } from '$lib/server/points/mock';

describe('POST /api/v1/points/transactions/review', () => {
	it('should return success if organizer reviews transaction', async () => {
		const pointsRepo: IPointsRepo = {
			reviewTransaction: vi.fn().mockResolvedValue({ id: 1 })
		} as unknown as IPointsRepo;

		const authProvider: IAuthProvider = {
			isOrganizer: vi.fn().mockResolvedValue(true),
			getUserId: vi.fn().mockResolvedValue(1)
		} as unknown as IAuthProvider;

		const result = await endpoint_POST({
			pointsRepo,
			authProvider,
			body: {
				transactionId: 1,
				status: 'approved'
			}
		});

		expect(result).toEqual({ id: 1 });
		expect(pointsRepo.reviewTransaction).toHaveBeenCalledWith(1, {
			reviewerId: 1,
			status: 'approved'
		});
	});

	it('should return success if organizer rejects transaction with reason', async () => {
		const pointsRepo: IPointsRepo = {
			reviewTransaction: vi.fn().mockResolvedValue({ id: 1 })
		} as unknown as IPointsRepo;

		const authProvider: IAuthProvider = {
			isOrganizer: vi.fn().mockResolvedValue(true),
			getUserId: vi.fn().mockResolvedValue(1)
		} as unknown as IAuthProvider;

		const result = await endpoint_POST({
			pointsRepo,
			authProvider,
			body: {
				transactionId: 1,
				status: 'rejected',
				rejectionReason: 'Bad reason'
			}
		});

		expect(result).toEqual({ id: 1 });
		expect(pointsRepo.reviewTransaction).toHaveBeenCalledWith(1, {
			reviewerId: 1,
			status: 'rejected',
			rejectionReason: 'Bad reason'
		});
	});

	it('should return success if organizer deletes transaction', async () => {
		const pointsRepo: IPointsRepo = {
			reviewTransaction: vi.fn().mockResolvedValue({ id: 1 })
		} as unknown as IPointsRepo;

		const authProvider: IAuthProvider = {
			isOrganizer: vi.fn().mockResolvedValue(true),
			getUserId: vi.fn().mockResolvedValue(1)
		} as unknown as IAuthProvider;

		const result = await endpoint_POST({
			pointsRepo,
			authProvider,
			body: {
				transactionId: 1,
				status: 'deleted'
			}
		});

		expect(result).toEqual({ id: 1 });
		expect(pointsRepo.reviewTransaction).toHaveBeenCalledWith(1, {
			reviewerId: 1,
			status: 'deleted'
		});
	});

	it('should return error if not organizer', async () => {
		const pointsRepo: IPointsRepo = {
			reviewTransaction: vi.fn()
		} as unknown as IPointsRepo;

		const authProvider: IAuthProvider = {
			isOrganizer: vi.fn().mockResolvedValue(false),
			getUserId: vi.fn().mockResolvedValue(1)
		} as unknown as IAuthProvider;

		const result = await endpoint_POST({
			pointsRepo,
			authProvider,
			body: {
				transactionId: 1,
				status: 'approved'
			}
		});

		expect(result).toEqual({
			success: false,
			error: 'Unauthorized'
		});
		expect(pointsRepo.reviewTransaction).not.toHaveBeenCalled();
	});

	it('should return unauthorized if no reviewer ID', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(null);
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, status: 'approved' } as const;

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(pointsRepo.reviewTransaction).not.toHaveBeenCalled();
	});

	it('should return error if reviewTransaction fails', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, status: 'approved' } as const;
		pointsRepo.reviewTransaction.mockResolvedValue({
			success: false,
			error: 'Transaction failed'
		});

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: false, error: 'Transaction failed' });
	});
});
