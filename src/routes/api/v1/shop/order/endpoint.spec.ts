import { describe, it, expect, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import type { IShopService } from '$lib/server/shop';
import type { OrderData } from '$lib/server/shop/types';
import {
	ItemNotFoundError,
	ItemNotOrderableError,
	InsufficientStockError,
	InsufficientBalanceError,
	NotAuthenticatedError,
	NotOrganizerError
} from '$lib/server/shop/types';

describe('POST /api/v1/shop/order', () => {
	const mockOrder: OrderData = {
		id: 1,
		userId: 2,
		shopItemId: 3,
		status: 'pending',
		createdAt: new Date()
	};

	it('should return order when purchase is successful', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockResolvedValue(mockOrder)
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({ success: true, order: mockOrder });
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});

	it('should return 404 when item is not found', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new ItemNotFoundError(999))
		} as unknown as IShopService;

		const body = { itemId: 999 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'Item with ID 999 not found',
			status: 404
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(999);
	});

	it('should return 401 when user is not authenticated', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});

	it('should return 401 when user is not an organizer', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});

	it('should return 400 when item is not orderable', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new ItemNotOrderableError(3))
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'Item with ID 3 is not orderable',
			status: 400
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});

	it('should return 400 when item is out of stock', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new InsufficientStockError(3))
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'Item with ID 3 is out of stock',
			status: 400
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});

	it('should return 400 when user has insufficient balance', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new InsufficientBalanceError(2, 100, 50))
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'User 2 has insufficient balance (required: 100, available: 50)',
			status: 400
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});

	it('should return 500 when unexpected error occurs', async () => {
		const shopService = {
			purchaseItem: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as IShopService;

		const body = { itemId: 3 };

		const result = await endpoint_POST({ shopService, body });

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500
		});
		expect(shopService.purchaseItem).toHaveBeenCalledWith(3);
	});
});
