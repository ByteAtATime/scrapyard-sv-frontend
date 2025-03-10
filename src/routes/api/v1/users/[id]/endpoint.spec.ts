import { describe, it, expect, vi } from 'vitest';
import { endpoint_GET } from './endpoint';
import type { UserService } from '$lib/server/auth/service';
import type { IAuthProvider } from '$lib/server/auth/types';
import { UserNotFoundError } from '$lib/server/auth/types';
import type { UserData } from '$lib/server/db/types';
import type { PointsService } from '$lib/server/points/service';

describe('GET /api/v1/users/[id]', () => {
	const mockUser: UserData = {
		id: 1,
		name: 'Test User',
		email: 'test@example.com',
		isOrganizer: false,
		authProvider: 'clerk',
		authProviderId: 'test_id'
	};

	const mockAuthProvider: IAuthProvider = {
		isOrganizer: vi.fn().mockResolvedValue(true),
		getUserId: vi.fn().mockResolvedValue(1),
		getCurrentUser: vi.fn(),
		getUserById: vi.fn(),
		isAuthenticated: vi.fn()
	};

	const mockPointsService: PointsService = {
		getTotalPoints: vi.fn().mockResolvedValue(150),
		// Include other methods from PointsService as needed
		getTransactions: vi.fn(),
		getTransactionsByUser: vi.fn(),
		createTransaction: vi.fn(),
		reviewTransaction: vi.fn(),
		getPendingTransactions: vi.fn(),
		getTransactionById: vi.fn(),
		awardPoints: vi.fn(),
		getLeaderboard: vi.fn()
	} as unknown as PointsService;

	it('should return user data with totalPoints when found and user is organizer', async () => {
		const userService = {
			getUserById: vi.fn().mockResolvedValue(mockUser)
		} as unknown as UserService;

		const params = { id: 1 };

		const result = await endpoint_GET({
			userService,
			authProvider: mockAuthProvider,
			pointsService: mockPointsService,
			params
		});

		expect(result).toEqual({
			...mockUser,
			totalPoints: 150
		});
		expect(mockAuthProvider.isOrganizer).toHaveBeenCalled();
		expect(userService.getUserById).toHaveBeenCalledWith(1);
		expect(mockPointsService.getTotalPoints).toHaveBeenCalledWith(1);
	});

	it('should return 404 when user not found', async () => {
		const userService = {
			getUserById: vi.fn().mockRejectedValue(new UserNotFoundError(999))
		} as unknown as UserService;

		const params = { id: 999 };

		const result = await endpoint_GET({
			userService,
			authProvider: mockAuthProvider,
			pointsService: mockPointsService,
			params
		});

		expect(result).toEqual({
			error: 'User with ID 999 not found',
			status: 404,
			success: false
		});
		expect(mockAuthProvider.isOrganizer).toHaveBeenCalled();
		expect(userService.getUserById).toHaveBeenCalledWith(999);
		expect(mockPointsService.getTotalPoints).not.toHaveBeenCalled();
	});

	it('should return 401 when user is not organizer', async () => {
		const userService = {
			getUserById: vi.fn()
		} as unknown as UserService;

		const notOrganizerAuth = {
			...mockAuthProvider,
			isOrganizer: vi.fn().mockResolvedValue(false)
		};

		const params = { id: 1 };

		const result = await endpoint_GET({
			userService,
			authProvider: notOrganizerAuth,
			pointsService: mockPointsService,
			params
		});

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401,
			success: false
		});
		expect(notOrganizerAuth.isOrganizer).toHaveBeenCalled();
		expect(userService.getUserById).not.toHaveBeenCalled();
		expect(mockPointsService.getTotalPoints).not.toHaveBeenCalled();
	});

	it('should return 401 when user is not authenticated', async () => {
		const userService = {
			getUserById: vi.fn()
		} as unknown as UserService;

		const notAuthenticatedAuth = {
			...mockAuthProvider,
			isOrganizer: vi.fn().mockResolvedValue(true),
			getUserId: vi.fn().mockResolvedValue(null)
		};

		const params = { id: 1 };

		const result = await endpoint_GET({
			userService,
			authProvider: notAuthenticatedAuth,
			pointsService: mockPointsService,
			params
		});

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401,
			success: false
		});
		expect(notAuthenticatedAuth.isOrganizer).toHaveBeenCalled();
		expect(userService.getUserById).not.toHaveBeenCalled();
		expect(mockPointsService.getTotalPoints).not.toHaveBeenCalled();
	});

	it('should return 500 when unexpected error occurs', async () => {
		const userService = {
			getUserById: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as UserService;

		const params = { id: 1 };

		const result = await endpoint_GET({
			userService,
			authProvider: mockAuthProvider,
			pointsService: mockPointsService,
			params
		});

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500,
			success: false
		});
		expect(mockAuthProvider.isOrganizer).toHaveBeenCalled();
		expect(userService.getUserById).toHaveBeenCalledWith(1);
		expect(mockPointsService.getTotalPoints).not.toHaveBeenCalled();
	});
});
