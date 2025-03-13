import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './service';
import type { IAuthState, IUserRepo } from './types';
import type { UserData } from '$lib/server/db/types';
import { User } from './user';
import { clerkClient } from 'clerk-sveltekit/server';
import type { User as ClerkUser } from '@clerk/backend';

vi.mock('clerk-sveltekit/server', () => ({
	clerkClient: {
		users: {
			getUser: vi.fn()
		}
	}
}));

describe('AuthService', () => {
	let authState: IAuthState;
	let userRepo: IUserRepo;
	let service: AuthService;

	const mockClerkUser: Partial<ClerkUser> = {
		fullName: 'Test User',
		firstName: 'Test',
		lastName: 'User',
		emailAddresses: [
			{
				id: 'email_123',
				emailAddress: 'test@example.com',
				verification: null,
				linkedTo: []
			}
		]
	};

	beforeEach(() => {
		authState = {
			userId: null,
			isAuthenticated: false
		};

		userRepo = {
			findByAuthId: vi.fn(),
			findById: vi.fn(),
			create: vi.fn()
		};

		service = new AuthService(authState, userRepo);
	});

	describe('isAuthenticated', () => {
		it('should return false when not authenticated', () => {
			expect(service.isAuthenticated()).toBe(false);
		});

		it('should return true when authenticated', () => {
			authState.isAuthenticated = true;
			authState.userId = 'user_123';
			expect(service.isAuthenticated()).toBe(true);
		});
	});

	describe('getUserId', () => {
		it('should return null when not authenticated', async () => {
			expect(await service.getUserId()).toBeNull();
		});

		it('should return user id when user exists', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce({
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'test_id',
				isOrganizer: false,
				avatarUrl: null
			} as UserData);

			expect(await service.getUserId()).toBe(1);
			expect(userRepo.findByAuthId).toHaveBeenCalledWith('clerk', 'clerk_123');
		});

		it('should create user when not found', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce(null);
			vi.mocked(clerkClient.users.getUser).mockResolvedValueOnce(mockClerkUser as ClerkUser);

			expect(await service.getUserId()).toBeNull();
			expect(userRepo.create).toHaveBeenCalledWith({
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'clerk_123'
			});
		});
	});

	describe('isOrganizer', () => {
		it('should return false when not authenticated', async () => {
			expect(await service.isOrganizer()).toBe(false);
		});

		it('should return true when user has organizer role', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce({
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'test_id',
				isOrganizer: true,
				avatarUrl: null
			} as UserData);

			expect(await service.isOrganizer()).toBe(true);
		});

		it('should return false and create user when not found', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce(null);
			vi.mocked(clerkClient.users.getUser).mockResolvedValueOnce(mockClerkUser as ClerkUser);

			expect(await service.isOrganizer()).toBe(false);
			expect(userRepo.create).toHaveBeenCalled();
		});
	});

	describe('getCurrentUser', () => {
		it('should return null when not authenticated', async () => {
			expect(await service.getCurrentUser()).toBeNull();
		});

		it('should return a User instance if user is found', async () => {
			authState.userId = 'mockClerkId';
			authState.isAuthenticated = true;
			const userData = {
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'mockClerkId',
				totalPoints: 0,
				isOrganizer: false,
				avatarUrl: null
			} as UserData;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce(userData);

			const result = await service.getCurrentUser();
			expect(result).toBeInstanceOf(User);
			expect(result?.id).toBe(1);
		});

		it('should return null and create user when not found', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce(null);
			vi.mocked(clerkClient.users.getUser).mockResolvedValueOnce(mockClerkUser as ClerkUser);

			expect(await service.getCurrentUser()).toBeNull();
			expect(userRepo.create).toHaveBeenCalled();
		});
	});

	describe('getUserById', () => {
		it('should delegate to userRepo.findById', async () => {
			const userData = {
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'test_id',
				isOrganizer: false,
				avatarUrl: null
			} as UserData;
			vi.mocked(userRepo.findById).mockResolvedValueOnce(userData);

			const result = await service.getUserById(1);
			expect(result).toEqual(userData);
			expect(userRepo.findById).toHaveBeenCalledWith(1);
		});
	});
});
