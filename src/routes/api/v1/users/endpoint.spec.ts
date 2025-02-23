import { describe, it, expect, vi } from 'vitest';
import { endpoint_GET } from './endpoint';
import type { UserService } from '$lib/server/auth/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/auth/types';

describe('GET /api/v1/users', () => {
	const mockUsers = [
		{ id: 1, name: 'Test User', email: 'test@example.com', totalPoints: 0, isOrganizer: false }
	];

	it('should return users when request is successful', async () => {
		const userService = {
			getAllUsers: vi.fn().mockResolvedValue(mockUsers)
		} as unknown as UserService;

		const query = { includePoints: false };
		const result = await endpoint_GET({ userService, query });

		expect(result).toEqual(mockUsers);
		expect(userService.getAllUsers).toHaveBeenCalledWith(false);
	});

	it('should return users with points when includePoints is true', async () => {
		const userService = {
			getAllUsers: vi.fn().mockResolvedValue(mockUsers)
		} as unknown as UserService;

		const query = { includePoints: true };
		const result = await endpoint_GET({ userService, query });

		expect(result).toEqual(mockUsers);
		expect(userService.getAllUsers).toHaveBeenCalledWith(true);
	});

	it('should return 401 when user is not authenticated', async () => {
		const userService = {
			getAllUsers: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as UserService;

		const query = { includePoints: false };
		const result = await endpoint_GET({ userService, query });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
	});

	it('should return 401 when user is not an organizer', async () => {
		const userService = {
			getAllUsers: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as UserService;

		const query = { includePoints: false };
		const result = await endpoint_GET({ userService, query });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
	});

	it('should return 500 when unexpected error occurs', async () => {
		const userService = {
			getAllUsers: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as UserService;

		const query = { includePoints: false };
		const result = await endpoint_GET({ userService, query });

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500
		});
	});
});
