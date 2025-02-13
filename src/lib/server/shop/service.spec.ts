import { describe, it, expect, vi } from 'vitest';
import { ShopService } from './service';
import type { ShopItem, Order } from './types';
import { db } from '../db';
import { MockShopRepo } from './mock';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('ShopService', () => {
	const mockShopItem: ShopItem = {
		id: 1,
		name: 'Test Item',
		description: 'Test Description',
		imageUrl: 'test.jpg',
		price: 99.99,
		stock: 10,
		isOrderable: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const mockOrder: Order = {
		id: 1,
		userId: 1,
		shopItemId: 1,
		status: 'pending',
		createdAt: new Date()
	};

	const mockRepository = new MockShopRepo();

	describe('getAllItems', () => {
		it('should return all items when onlyOrderable is false', async () => {
			const items = [mockShopItem, { ...mockShopItem, id: 2, isOrderable: false }];
			mockRepository.getAllItems.mockResolvedValue(items);

			const service = new ShopService(mockRepository);
			const result = await service.getAllItems(false);

			expect(result).toEqual(items);
			expect(mockRepository.getAllItems).toHaveBeenCalled();
		});

		it('should return only orderable items when onlyOrderable is true', async () => {
			const items = [
				mockShopItem,
				{ ...mockShopItem, id: 2, isOrderable: false },
				{ ...mockShopItem, id: 3, isOrderable: true }
			];
			mockRepository.getAllItems.mockResolvedValue(items);

			const service = new ShopService(mockRepository);
			const result = await service.getAllItems(true);

			expect(result).toEqual([mockShopItem, { ...mockShopItem, id: 3, isOrderable: true }]);
			expect(mockRepository.getAllItems).toHaveBeenCalled();
		});
	});

	describe('purchaseItem', () => {
		it('should successfully purchase an item', async () => {
			mockRepository.getItemById.mockResolvedValue(mockShopItem);
			mockRepository.createOrder.mockResolvedValue(mockOrder);
			mockRepository.updateStock.mockResolvedValue(undefined);

			const service = new ShopService(mockRepository);
			const result = await service.purchaseItem(1, 1);

			expect(result).toEqual(mockOrder);
			expect(mockRepository.getItemById).toHaveBeenCalledWith(1);
			expect(mockRepository.createOrder).toHaveBeenCalledWith({
				userId: 1,
				shopItemId: 1,
				status: 'pending'
			});
			expect(mockRepository.updateStock).toHaveBeenCalledWith(1, 9);
			expect(db.transaction).toHaveBeenCalled();
		});

		it('should throw error when item not found', async () => {
			mockRepository.getItemById.mockResolvedValue(null);

			const service = new ShopService(mockRepository);
			await expect(service.purchaseItem(1, 1)).rejects.toThrow('Item with ID 1 not found.');
		});

		it('should throw error when item is not orderable', async () => {
			mockRepository.getItemById.mockResolvedValue({ ...mockShopItem, isOrderable: false });

			const service = new ShopService(mockRepository);
			await expect(service.purchaseItem(1, 1)).rejects.toThrow('Item with ID 1 is not orderable.');
		});

		it('should throw error when item is out of stock', async () => {
			mockRepository.getItemById.mockResolvedValue({ ...mockShopItem, stock: 0 });

			const service = new ShopService(mockRepository);
			await expect(service.purchaseItem(1, 1)).rejects.toThrow(
				'Not enough stock for item: Test Item'
			);
		});
	});

	describe('CRUD operations', () => {
		it('should pass through getItemById to repository', async () => {
			mockRepository.getItemById.mockResolvedValue(mockShopItem);

			const service = new ShopService(mockRepository);
			const result = await service.getItemById(1);

			expect(result).toEqual(mockShopItem);
			expect(mockRepository.getItemById).toHaveBeenCalledWith(1);
		});

		it('should pass through createItem to repository', async () => {
			const createData = {
				name: 'New Item',
				description: 'New Description',
				imageUrl: 'new.jpg',
				price: 49.99,
				stock: 20,
				isOrderable: true
			};
			mockRepository.createItem.mockResolvedValue({ ...mockShopItem, ...createData });

			const service = new ShopService(mockRepository);
			const result = await service.createItem(createData);

			expect(result).toEqual({ ...mockShopItem, ...createData });
			expect(mockRepository.createItem).toHaveBeenCalledWith(createData);
		});

		it('should pass through updateItem to repository', async () => {
			const updateData = {
				name: 'Updated Name',
				price: 129.99
			};

			const service = new ShopService(mockRepository);
			await service.updateItem(1, updateData);

			expect(mockRepository.updateItem).toHaveBeenCalledWith(1, updateData);
		});

		it('should pass through deleteItem to repository', async () => {
			const service = new ShopService(mockRepository);
			await service.deleteItem(1);

			expect(mockRepository.deleteItem).toHaveBeenCalledWith(1);
		});
	});

	describe('Order operations', () => {
		it('should pass through getOrders to repository', async () => {
			mockRepository.getOrders.mockResolvedValue([mockOrder]);

			const service = new ShopService(mockRepository);
			const result = await service.getOrders();

			expect(result).toEqual([mockOrder]);
			expect(mockRepository.getOrders).toHaveBeenCalled();
		});

		it('should pass through getOrderById to repository', async () => {
			mockRepository.getOrderById.mockResolvedValue(mockOrder);

			const service = new ShopService(mockRepository);
			const result = await service.getOrderById(1);

			expect(result).toEqual(mockOrder);
			expect(mockRepository.getOrderById).toHaveBeenCalledWith(1);
		});

		it('should pass through getOrdersByUser to repository', async () => {
			mockRepository.getOrdersByUser.mockResolvedValue([mockOrder]);

			const service = new ShopService(mockRepository);
			const result = await service.getOrdersByUser(1);

			expect(result).toEqual([mockOrder]);
			expect(mockRepository.getOrdersByUser).toHaveBeenCalledWith(1);
		});

		it('should pass through updateOrderStatus to repository', async () => {
			const service = new ShopService(mockRepository);
			await service.updateOrderStatus(1, 'fulfilled');

			expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(1, 'fulfilled');
		});
	});
});
