import { describe, it, expect } from 'vitest';
import { endpoint_POST } from './endpoint';
import { MockAuthProvider } from '$lib/server/auth/mock';
import { MockPointsRepo } from '$lib/server/points/mock';

describe('POST /api/v1/points/transactions/review', () => {
	it('should return success if organizer reviews transaction', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, action: 'approve' } as const;
		pointsRepo.reviewTransaction.mockResolvedValue({ success: true });

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: true });
		expect(pointsRepo.reviewTransaction).toHaveBeenCalledWith({
			transactionId: 1,
			reviewerId: 1,
			status: 'approved',
			rejectionReason: undefined
		});
	});

	it('should return success if organizer rejects transaction with reason', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, action: 'reject', reason: 'Bad reason' } as const;
		pointsRepo.reviewTransaction.mockResolvedValue({ success: true });

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: true });
		expect(pointsRepo.reviewTransaction).toHaveBeenCalledWith({
			transactionId: 1,
			reviewerId: 1,
			status: 'rejected',
			rejectionReason: 'Bad reason'
		});
	});

	it('should return success if organizer deletes transaction', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, action: 'delete' } as const;
		pointsRepo.reviewTransaction.mockResolvedValue({ success: true });

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: true });
		expect(pointsRepo.reviewTransaction).toHaveBeenCalledWith({
			transactionId: 1,
			reviewerId: 1,
			status: 'deleted',
			rejectionReason: undefined
		});
	});

	it('should return unauthorized if not organizer', async () => {
		const authProvider = new MockAuthProvider().mockSignedIn();
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, action: 'approve' } as const;

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(pointsRepo.reviewTransaction).not.toHaveBeenCalled();
	});

	it('should return unauthorized if no reviewer ID', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(null);
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, action: 'approve' } as const;

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(pointsRepo.reviewTransaction).not.toHaveBeenCalled();
	});

	it('should return error if reviewTransaction fails', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepo = new MockPointsRepo();
		const body = { transactionId: 1, action: 'approve' } as const;
		pointsRepo.reviewTransaction.mockResolvedValue({
			success: false,
			error: 'Transaction failed'
		});

		const result = await endpoint_POST({ authProvider, pointsRepo, body });

		expect(result).toEqual({ success: false, error: 'Transaction failed' });
	});
});
