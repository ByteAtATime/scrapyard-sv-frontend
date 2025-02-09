import { describe, it, expect } from 'vitest';
import { endpoint_POST } from './endpoint';
import { MockAuthProvider } from '$lib/server/auth/mock';
import { MockPointsRepository } from '$lib/server/points/mock';

describe('POST /api/v1/points/award', () => {
	it('should return success if organizer awards points', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepository = new MockPointsRepository();
		const body = { userId: 1, amount: 100, reason: 'Test reason' };
		authProvider.getUserById.mockResolvedValue({
			id: 1,
			name: 'Test User',
			email: 'test@example.com',
			totalPoints: 0,
			isOrganizer: false
		});

		const result = await endpoint_POST({ authProvider, pointsRepository, body });

		expect(result).toEqual({ success: true });
		expect(pointsRepository.awardPoints).toHaveBeenCalled();
	});

	it('should return unauthorized if not organizer', async () => {
		const authProvider = new MockAuthProvider().mockSignedIn();
		const pointsRepository = new MockPointsRepository();
		const body = { userId: 1, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ authProvider, pointsRepository, body });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(pointsRepository.awardPoints).not.toHaveBeenCalled();
	});

	it('should return unauthorized if no author ID', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(null);
		const pointsRepository = new MockPointsRepository();
		const body = { userId: 1, amount: 100, reason: 'Test reason' };

		const result = await endpoint_POST({ authProvider, pointsRepository, body });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(pointsRepository.awardPoints).not.toHaveBeenCalled();
	});

	it('should return error if user not found', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const pointsRepository = new MockPointsRepository();
		const body = { userId: 999, amount: 100, reason: 'Test reason' };
		authProvider.getUserById.mockResolvedValue(null);

		const result = await endpoint_POST({ authProvider, pointsRepository, body });

		expect(result).toEqual({ success: false, error: 'User not found' });
		expect(pointsRepository.awardPoints).not.toHaveBeenCalled();
	});
});
