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
import { MockAuthProvider } from '$lib/server/auth/mock';

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

		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(4);

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({ success: true, transaction: mockTransaction });
		expect(pointsService.reviewTransaction).toHaveBeenCalledWith(1, {
			status: 'approved',
			rejectionReason: undefined,
			reviewerId: 4
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
		expect(authProvider.getUserId).toHaveBeenCalled();
	});

	it('should return 403 when user is not an organizer', async () => {
		const pointsService = {} as unknown as PointsService;

		const authProvider = new MockAuthProvider().mockSignedIn();

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({
			error: 'Not authorized',
			status: 403
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
	});

	it('should return 401 when user is not authenticated - pointsService error', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as PointsService;
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(null);

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
	});

	it('should return 401 when user is not an organizer - pointsService error', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as PointsService;
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(1);
		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
	});

	it('should return 404 when transaction is not found', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new TransactionNotFoundError(999))
		} as unknown as PointsService;
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(1);

		const body = {
			transactionId: 999,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({
			error: 'Transaction with ID 999 not found',
			status: 404
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
	});

	it('should return 400 when reviewer tries to review their own transaction', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new SelfReviewError(1))
		} as unknown as PointsService;
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(1);

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({
			error: 'User 1 cannot review their own transaction',
			status: 400
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
	});

	it('should return 500 when unexpected error occurs', async () => {
		const pointsService = {
			reviewTransaction: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as PointsService;
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(1);

		const body = {
			transactionId: 1,
			status: 'approved' as const
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
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
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(4);

		const body = {
			transactionId: 1,
			status: 'rejected' as const,
			rejectionReason: 'Invalid transaction'
		};

		const result = await endpoint_POST({ pointsService, authProvider, body });

		expect(result).toEqual({ success: true, transaction: mockRejectedTransaction });
		expect(pointsService.reviewTransaction).toHaveBeenCalledWith(1, {
			status: 'rejected',
			rejectionReason: 'Invalid transaction',
			reviewerId: 4
		});
		expect(authProvider.isOrganizer).toHaveBeenCalled();
		expect(authProvider.getUserId).toHaveBeenCalled();
	});
});
