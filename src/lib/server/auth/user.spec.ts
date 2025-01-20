import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User } from './user';
import { MockAuthProvider } from './mock';
import { MockPointsRepository } from '../points/mock';

describe('User', () => {
	let mockAuthProvider: MockAuthProvider;
	let mockPointsRepository: MockPointsRepository;

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthProvider = new MockAuthProvider();
		mockPointsRepository = new MockPointsRepository();
	});

	describe('getUserId', () => {
		it('should return cached user ID if available', async () => {
			mockAuthProvider.getUserId.mockResolvedValue(2);

			const user = new User(mockAuthProvider, mockPointsRepository);
			user['_id'] = 1;

			const userId = await user.getUserId();
			expect(userId).toBe(1);
			expect(mockAuthProvider.getUserId).not.toHaveBeenCalled();
		});

		it('should fetch and cache user ID if not available', async () => {
			mockAuthProvider.getUserId.mockResolvedValue(2);

			const user = new User(mockAuthProvider, mockPointsRepository);

			const userId = await user.getUserId();
			expect(userId).toBe(2);
			expect(mockAuthProvider.getUserId).toHaveBeenCalled();
			expect(user['_id']).toBe(2);
		});
	});

	describe('getIsOrganizer', () => {
		it('should return cached organizer status if available', async () => {
			mockAuthProvider.isOrganizer.mockResolvedValue(false);

			const user = new User(mockAuthProvider, mockPointsRepository);
			user['_isOrganizer'] = true;

			const isOrganizer = await user.getIsOrganizer();
			expect(isOrganizer).toBe(true);
			expect(mockAuthProvider.isOrganizer).not.toHaveBeenCalled();
		});

		it('should fetch and cache organizer status if not available', async () => {
			mockAuthProvider.isOrganizer.mockResolvedValue(false);

			const user = new User(mockAuthProvider, mockPointsRepository);

			const isOrganizer = await user.getIsOrganizer();
			expect(isOrganizer).toBe(false);
			expect(mockAuthProvider.isOrganizer).toHaveBeenCalled();
			expect(user['_isOrganizer']).toBe(false);
		});
	});

	describe('getTotalPoints', () => {
		it('should return cached total points if available', async () => {
			mockPointsRepository.getTotalPoints.mockResolvedValue(101);

			const user = new User(mockAuthProvider, mockPointsRepository);
			user['_totalPoints'] = 100;

			const totalPoints = await user.getTotalPoints();
			expect(totalPoints).toBe(100);
			expect(mockPointsRepository.getTotalPoints).not.toHaveBeenCalled();
		});

		it('should fetch and cache total points if not available', async () => {
			mockAuthProvider.getUserId.mockResolvedValue(3);
			mockPointsRepository.getTotalPoints.mockResolvedValue(200);

			const user = new User(mockAuthProvider, mockPointsRepository);

			const totalPoints = await user.getTotalPoints();
			expect(totalPoints).toBe(200);
			expect(mockPointsRepository.getTotalPoints).toHaveBeenCalledWith(3);
			expect(user['_totalPoints']).toBe(200);
		});

		it('should throw an error if user is not authenticated', async () => {
			mockAuthProvider.mockSignedOut();

			const user = new User(mockAuthProvider, mockPointsRepository);

			await expect(user.getTotalPoints()).rejects.toThrow('User not authenticated');
		});
	});
});
