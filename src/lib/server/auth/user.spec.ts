import { describe, it, expect, beforeEach } from 'vitest';
import { CurrentUser } from './user';
import { MockAuthProvider } from './mock';
import { MockPointsRepo } from '../points/mock';

describe('User', () => {
	let mockAuthProvider: MockAuthProvider;
	let mockPointsRepo: MockPointsRepo;

	beforeEach(() => {
		mockAuthProvider = new MockAuthProvider();
		mockPointsRepo = new MockPointsRepo();
	});

	describe('getUserId', () => {
		it('should return cached user ID if available', async () => {
			mockAuthProvider.getUserId.mockResolvedValue(2);

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);
			user['_id'] = 1;

			const userId = await user.getUserId();
			expect(userId).toBe(1);
			expect(mockAuthProvider.getUserId).not.toHaveBeenCalled();
		});

		it('should fetch and cache user ID if not available', async () => {
			mockAuthProvider.getUserId.mockResolvedValue(2);

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);

			const userId = await user.getUserId();
			expect(userId).toBe(2);
			expect(mockAuthProvider.getUserId).toHaveBeenCalled();
			expect(user['_id']).toBe(2);
		});
	});

	describe('getIsOrganizer', () => {
		it('should return cached organizer status if available', async () => {
			mockAuthProvider.isOrganizer.mockResolvedValue(false);

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);
			user['_isOrganizer'] = true;

			const isOrganizer = await user.getIsOrganizer();
			expect(isOrganizer).toBe(true);
			expect(mockAuthProvider.isOrganizer).not.toHaveBeenCalled();
		});

		it('should fetch and cache organizer status if not available', async () => {
			mockAuthProvider.isOrganizer.mockResolvedValue(false);

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);

			const isOrganizer = await user.getIsOrganizer();
			expect(isOrganizer).toBe(false);
			expect(mockAuthProvider.isOrganizer).toHaveBeenCalled();
			expect(user['_isOrganizer']).toBe(false);
		});
	});

	describe('getTotalPoints', () => {
		it('should return cached total points if available', async () => {
			mockPointsRepo.getTotalPoints.mockResolvedValue(101);

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);
			user['_totalPoints'] = 100;

			const totalPoints = await user.getTotalPoints();
			expect(totalPoints).toBe(100);
			expect(mockPointsRepo.getTotalPoints).not.toHaveBeenCalled();
		});

		it('should fetch and cache total points if not available', async () => {
			mockAuthProvider.getUserId.mockResolvedValue(3);
			mockPointsRepo.getTotalPoints.mockResolvedValue(200);

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);

			const totalPoints = await user.getTotalPoints();
			expect(totalPoints).toBe(200);
			expect(mockPointsRepo.getTotalPoints).toHaveBeenCalledWith(3);
			expect(user['_totalPoints']).toBe(200);
		});

		it('should throw an error if user is not authenticated', async () => {
			mockAuthProvider.mockSignedOut();

			const user = new CurrentUser(mockAuthProvider, mockPointsRepo);

			await expect(user.getTotalPoints()).rejects.toThrow('User not authenticated');
		});
	});
});
