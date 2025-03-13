import { describe, expect, it, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import type { UserService } from '$lib/server/auth/service';

describe('user webhooks', () => {
	describe('POST', () => {
		it('should handle user.created webhook', async () => {
			const mockUserService: UserService = {
				handleUserCreated: vi.fn().mockResolvedValue({ id: 123 }),
				handleUserUpdated: vi.fn().mockResolvedValue(undefined),
				getUserById: vi.fn(),
				getAllUsers: vi.fn()
			} as unknown as UserService;

			const result = await endpoint_POST({
				userService: mockUserService,
				body: {
					data: {
						id: 'user_123',
						email_addresses: [
							{
								email_address: 'test@example.com',
								id: 'email_123',
								verification: { status: 'verified' }
							}
						],
						first_name: 'Test',
						last_name: 'User',
						profile_image_url: 'https://example.com/avatar.jpg',
						image_url: null
					},
					type: 'user.created'
				}
			});

			expect(result).toEqual({ success: true });
			expect(mockUserService.handleUserCreated).toHaveBeenCalledWith({
				authProviderId: 'user_123',
				email: 'test@example.com',
				name: 'Test User',
				avatarUrl: 'https://example.com/avatar.jpg'
			});
		});

		it('should handle user.updated webhook', async () => {
			const mockUserService: UserService = {
				handleUserCreated: vi.fn().mockResolvedValue({ id: 123 }),
				handleUserUpdated: vi.fn().mockResolvedValue(undefined),
				getUserById: vi.fn(),
				getAllUsers: vi.fn()
			} as unknown as UserService;

			const result = await endpoint_POST({
				userService: mockUserService,
				body: {
					data: {
						id: 'user_123',
						email_addresses: [
							{
								email_address: 'test@example.com',
								id: 'email_123',
								verification: { status: 'verified' }
							}
						],
						first_name: 'Test',
						last_name: 'Updated',
						profile_image_url: 'https://example.com/updated.jpg',
						image_url: null
					},
					type: 'user.updated'
				}
			});

			expect(result).toEqual({ success: true });
			expect(mockUserService.handleUserUpdated).toHaveBeenCalledWith({
				authProviderId: 'user_123',
				email: 'test@example.com',
				name: 'Test Updated',
				avatarUrl: 'https://example.com/updated.jpg'
			});
		});

		it('should handle errors gracefully', async () => {
			const mockUserService: UserService = {
				handleUserCreated: vi.fn().mockRejectedValue(new Error('Test error')),
				handleUserUpdated: vi.fn(),
				getUserById: vi.fn(),
				getAllUsers: vi.fn()
			} as unknown as UserService;

			const result = await endpoint_POST({
				userService: mockUserService,
				body: {
					data: {
						id: 'user_123',
						email_addresses: [
							{
								email_address: 'test@example.com',
								id: 'email_123',
								verification: { status: 'verified' }
							}
						],
						first_name: 'Test',
						last_name: 'User',
						profile_image_url: null,
						image_url: null
					},
					type: 'user.created'
				}
			});

			expect(result).toEqual({
				error: 'Failed to process webhook',
				status: 500
			});
		});
	});
});
