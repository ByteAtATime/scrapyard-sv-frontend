import { describe, it, expect } from 'vitest';
import { endpoint_GET } from './endpoint';
import { MockAuthProvider } from '$lib/server/auth/mock';
import { MockPointsRepository } from '$lib/server/points/mock';

describe('GET /api/v1/points/transactions', () => {
	it('should return transactions if organizer', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepository = new MockPointsRepository();
		const mockTransactions = [
			{
				id: 1,
				userId: 1,
				amount: 100,
				reason: 'Test',
				authorId: 1,
				createdAt: new Date(),
				status: 'pending'
			}
		];
		pointsRepository.getTransactions.mockResolvedValue(mockTransactions);

		const result = await endpoint_GET({ authProvider, pointsRepository });

		expect(result).toEqual(mockTransactions);
		expect(pointsRepository.getTransactions).toHaveBeenCalled();
	});

	it('should return unauthorized if not organizer', async () => {
		const authProvider = new MockAuthProvider().mockSignedIn();
		const pointsRepository = new MockPointsRepository();

		const result = await endpoint_GET({ authProvider, pointsRepository });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(pointsRepository.getTransactions).not.toHaveBeenCalled();
	});
});
