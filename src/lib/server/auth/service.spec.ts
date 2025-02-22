import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './service';
import type { IAuthState, IUserRepository } from './types';
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
	let userRepo: IUserRepository;
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
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce({ id: 1 } as UserData);

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

		it('should return isOrganizer value when user exists', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce({
				id: 1,
				isOrganizer: true
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

		it('should return User instance when user exists', async () => {
			authState.userId = 'clerk_123';
			authState.isAuthenticated = true;
			const userData = {
				id: 1,
				name: 'Test User',
				email: 'test@example.com',
				authProvider: 'clerk',
				authProviderId: 'mockClerkId',
				totalPoints: 0,
				isOrganizer: false
			} as UserData;
			vi.mocked(userRepo.findByAuthId).mockResolvedValueOnce(userData);

			const result = await service.getCurrentUser();
			expect(result).toBeInstanceOf(User);
			expect(result?.id).toBe(1);
			expect(result?.name).toBe('Test User');
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
			const userData = { id: 1, name: 'Test User' } as UserData;
			vi.mocked(userRepo.findById).mockResolvedValueOnce(userData);

			const result = await service.getUserById(1);
			expect(result).toEqual(userData);
			expect(userRepo.findById).toHaveBeenCalledWith(1);
		});
	});
});
