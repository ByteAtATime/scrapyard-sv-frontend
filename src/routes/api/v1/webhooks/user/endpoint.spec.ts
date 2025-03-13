import { describe, expect, it, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import type { UserService } from '$lib/server/auth/service';

describe('user webhooks', () => {
	describe('POST', () => {
		it('should update avatar URL when webhook received', async () => {
			const mockUserService: UserService = {
				updateUserAvatar: vi.fn().mockResolvedValue(undefined),
				getUserById: vi.fn(),
				getAllUsers: vi.fn()
			} as unknown as UserService;

			const result = await endpoint_POST({
				userService: mockUserService,
				body: {
					data: {
						id: 'user_123',
						profile_image_url: 'https://example.com/avatar.jpg',
						image_url: null
					},
					type: 'user.updated'
				}
			});

			expect(result).toEqual({ success: true });
			expect(mockUserService.updateUserAvatar).toHaveBeenCalledWith(
				'user_123',
				'https://example.com/avatar.jpg'
			);
		});

		it('should use image_url as fallback', async () => {
			const mockUserService: UserService = {
				updateUserAvatar: vi.fn().mockResolvedValue(undefined),
				getUserById: vi.fn(),
				getAllUsers: vi.fn()
			} as unknown as UserService;

			const result = await endpoint_POST({
				userService: mockUserService,
				body: {
					data: {
						id: 'user_123',
						profile_image_url: null,
						image_url: 'https://example.com/fallback.jpg'
					},
					type: 'user.created'
				}
			});

			expect(result).toEqual({ success: true });
			expect(mockUserService.updateUserAvatar).toHaveBeenCalledWith(
				'user_123',
				'https://example.com/fallback.jpg'
			);
		});

		it('should handle errors gracefully', async () => {
			const mockUserService: UserService = {
				updateUserAvatar: vi.fn().mockRejectedValue(new Error('Test error')),
				getUserById: vi.fn(),
				getAllUsers: vi.fn()
			} as unknown as UserService;

			const result = await endpoint_POST({
				userService: mockUserService,
				body: {
					data: {
						id: 'user_123',
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
