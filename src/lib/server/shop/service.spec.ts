import { describe, it, expect, beforeEach } from 'vitest';
import { ShopService } from './service';
import { MockShopRepo } from './mock';
import { ItemNotFoundError, OrderNotFoundError } from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';

describe('ShopService', () => {
	let mockRepo: MockShopRepo;
	let service: ShopService;

	beforeEach(() => {
		mockRepo = new MockShopRepo();
		service = new ShopService(mockRepo);
	});

	describe('getAllItems', () => {
		it('should return all items when onlyOrderable is false', async () => {
			const mockItems = [
				new ShopItem({
					id: 1,
					name: 'Item 1',
					description: 'Description 1',
					imageUrl: 'image1.jpg',
					price: 100,
					stock: 10,
					isOrderable: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}),
				new ShopItem({
					id: 2,
					name: 'Item 2',
					description: 'Description 2',
					imageUrl: 'image2.jpg',
					price: 200,
					stock: 0,
					isOrderable: false,
					createdAt: new Date(),
					updatedAt: new Date()
				})
			];

			mockRepo.getAllItems.mockResolvedValue(mockItems);

			const result = await service.getAllItems(false);
			expect(result).toEqual(mockItems);
			expect(mockRepo.getAllItems).toHaveBeenCalled();
		});

		it('should return only orderable items when onlyOrderable is true', async () => {
			const mockItems = [
				new ShopItem({
					id: 1,
					name: 'Item 1',
					description: 'Description 1',
					imageUrl: 'image1.jpg',
					price: 100,
					stock: 10,
					isOrderable: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}),
				new ShopItem({
					id: 2,
					name: 'Item 2',
					description: 'Description 2',
					imageUrl: 'image2.jpg',
					price: 200,
					stock: 0,
					isOrderable: false,
					createdAt: new Date(),
					updatedAt: new Date()
				})
			];

			mockRepo.getAllItems.mockResolvedValue(mockItems);

			const result = await service.getAllItems(true);
			expect(result).toEqual([mockItems[0]]);
			expect(mockRepo.getAllItems).toHaveBeenCalled();
		});
	});

	describe('getItemById', () => {
		it('should return item when found', async () => {
			const mockItem = new ShopItem({
				id: 1,
				name: 'Item 1',
				description: 'Description 1',
				imageUrl: 'image1.jpg',
				price: 100,
				stock: 10,
				isOrderable: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			mockRepo.getItemById.mockResolvedValue(mockItem);

			const result = await service.getItemById(1);
			expect(result).toEqual(mockItem);
			expect(mockRepo.getItemById).toHaveBeenCalledWith(1);
		});

		it('should throw ItemNotFoundError when item not found', async () => {
			mockRepo.getItemById.mockResolvedValue(null);

			await expect(service.getItemById(1)).rejects.toThrow(ItemNotFoundError);
			expect(mockRepo.getItemById).toHaveBeenCalledWith(1);
		});
	});

	describe('updateOrderStatus', () => {
		it('should update order status when order is pending', async () => {
			const mockOrder = new Order({
				id: 1,
				userId: 1,
				shopItemId: 1,
				status: 'pending',
				createdAt: new Date()
			});

			mockRepo.getOrderById.mockResolvedValue(mockOrder);

			await service.updateOrderStatus(1, 'fulfilled');
			expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(1, 'fulfilled');
		});

		it('should throw OrderNotFoundError when order not found', async () => {
			mockRepo.getOrderById.mockResolvedValue(null);

			await expect(service.updateOrderStatus(1, 'fulfilled')).rejects.toThrow(OrderNotFoundError);
			expect(mockRepo.getOrderById).toHaveBeenCalledWith(1);
			expect(mockRepo.updateOrderStatus).not.toHaveBeenCalled();
		});

		it('should throw error when trying to update non-pending order', async () => {
			const mockOrder = new Order({
				id: 1,
				userId: 1,
				shopItemId: 1,
				status: 'fulfilled',
				createdAt: new Date()
			});

			mockRepo.getOrderById.mockResolvedValue(mockOrder);

			await expect(service.updateOrderStatus(1, 'cancelled')).rejects.toThrow(
				'Order 1 cannot be updated because it is fulfilled'
			);
			expect(mockRepo.updateOrderStatus).not.toHaveBeenCalled();
		});
	});

	describe('purchaseItem', () => {
		it('should delegate purchase to repository', async () => {
			const mockOrder = new Order({
				id: 1,
				userId: 1,
				shopItemId: 1,
				status: 'pending',
				createdAt: new Date()
			});

			mockRepo.purchaseItem.mockResolvedValue(mockOrder);

			const result = await service.purchaseItem(1, 1);
			expect(result).toEqual(mockOrder);
			expect(mockRepo.purchaseItem).toHaveBeenCalledWith(1, 1);
		});
	});
});
