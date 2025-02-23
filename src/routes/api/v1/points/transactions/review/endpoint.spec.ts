import { describe, it, expect, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import type { PointsService } from '$lib/server/points/service';
import type { PointTransactionData } from '$lib/server/db/types';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	TransactionNotFoundError,
	SelfReviewError
} from '$lib/server/points/types';

describe('POST /api/v1/points/transactions/review', () => {
	const mockTransaction: PointTransactionData = {
		id: 1,
		userId: 2,
		amount: 100,
		reason: 'Test reason',
		authorId: 3,
		createdAt: new Date(),
		status: 'approved',
		reviewerId: 4,
		reviewedAt: new Date(),
		rejectionReason: null
	};

	it('should successfully review transaction', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockResolvedValue(mockTransaction)
		} as unknown as PointsService;

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({ success: true, transaction: mockTransaction });
		expect(pointsService.reviewTransaction).toHaveBeenCalledWith(1, {
			status: 'approved',
			rejectionReason: undefined,
			reviewerId: 0
		});
	});

	it('should return 401 when user is not authenticated', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as PointsService;

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
	});

	it('should return 401 when user is not an organizer', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as PointsService;

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
	});

	it('should return 404 when transaction is not found', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new TransactionNotFoundError(999))
		} as unknown as PointsService;

		const body = {
			transactionId: 999,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'Transaction with ID 999 not found',
			status: 404
		});
	});

	it('should return 400 when reviewer tries to review their own transaction', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new SelfReviewError(1))
		} as unknown as PointsService;

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'User 1 cannot review their own transaction',
			status: 400
		});
	});

	it('should return 500 when unexpected error occurs', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as PointsService;

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500
		});
	});

	it('should handle rejection reason', async () => {
		const mockRejectedTransaction = {
			...mockTransaction,
			status: 'rejected',
			rejectionReason: 'Invalid transaction'
		};

		const pointsService = {
			reviewTransaction: vi.fn().mockResolvedValue(mockRejectedTransaction)
		} as unknown as PointsService;

		const body = {
			transactionId: 1,
			status: 'rejected' as const,
			rejectionReason: 'Invalid transaction'
		};

		const result = await endpoint_POST({ pointsService, body });

		expect(result).toEqual({ success: true, transaction: mockRejectedTransaction });
		expect(pointsService.reviewTransaction).toHaveBeenCalledWith(1, {
			status: 'rejected',
			rejectionReason: 'Invalid transaction',
			reviewerId: 0
		});
	});
});
