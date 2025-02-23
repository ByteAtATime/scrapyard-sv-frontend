import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShopService } from './service';
import { MockShopRepo } from './mock';
import {
	ItemNotFoundError,
	OrderNotFoundError,
	NotAuthenticatedError,
	ItemNotOrderableError,
	InsufficientStockError,
	InsufficientBalanceError
} from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';
import type { IAuthProvider } from '$lib/server/auth/types';
import type { IPointsRepo } from '$lib/server/points';
import type { UserData } from '$lib/server/db/types';
import { User } from '$lib/server/auth/user';

describe('ShopService', () => {
	let mockRepo: MockShopRepo;
	let mockAuthProvider: IAuthProvider;
	let mockPointsRepo: IPointsRepo;
	let service: ShopService;

	beforeEach(() => {
		mockRepo = new MockShopRepo();
		mockAuthProvider = {
			isAuthenticated: vi.fn().mockReturnValue(true),
			getUserId: vi.fn().mockResolvedValue(1),
			isOrganizer: vi.fn().mockResolvedValue(true),
			getCurrentUser: vi.fn().mockResolvedValue(
				new User({
					id: 1,
					name: 'Test User',
					email: 'test@example.com',
					isOrganizer: true,
					authProvider: 'clerk',
					authProviderId: 'test_id'
				})
			),
			getUserById: vi.fn().mockResolvedValue(null)
		} as unknown as IAuthProvider;
		mockPointsRepo = {
			getTotalPoints: vi.fn().mockResolvedValue(1000),
			getTransactions: vi.fn(),
			createTransaction: vi.fn(),
			getTransactionById: vi.fn()
		} as unknown as IPointsRepo;
		service = new ShopService(mockRepo, mockAuthProvider, mockPointsRepo);
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
		const mockUserData: UserData = {
			id: 1,
			name: 'Test User',
			email: 'test@example.com',
			authProvider: 'clerk',
			authProviderId: 'test-id',
			isOrganizer: true
		};
		const mockUser = new User(mockUserData);

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

		const mockOrder = new Order({
			id: 1,
			userId: 1,
			shopItemId: 1,
			status: 'pending',
			createdAt: new Date()
		});

		it('should successfully purchase item when all conditions are met', async () => {
			vi.mocked(mockAuthProvider.getCurrentUser).mockResolvedValue(mockUser);
			mockRepo.getItemById.mockResolvedValue(mockItem);
			vi.mocked(mockPointsRepo.getTotalPoints).mockResolvedValue(200);
			mockRepo.purchaseItem.mockResolvedValue(mockOrder);

			const result = await service.purchaseItem(1);
			expect(result).toEqual(mockOrder);
			expect(mockRepo.purchaseItem).toHaveBeenCalledWith(1, 1);
		});

		it('should throw NotAuthenticatedError when user is not authenticated', async () => {
			vi.mocked(mockAuthProvider.getCurrentUser).mockResolvedValue(null);

			await expect(service.purchaseItem(1)).rejects.toThrow(NotAuthenticatedError);
			expect(mockRepo.purchaseItem).not.toHaveBeenCalled();
		});

		it('should throw ItemNotFoundError when item does not exist', async () => {
			vi.mocked(mockAuthProvider.getCurrentUser).mockResolvedValue(mockUser);
			mockRepo.getItemById.mockResolvedValue(null);

			await expect(service.purchaseItem(1)).rejects.toThrow(ItemNotFoundError);
			expect(mockRepo.purchaseItem).not.toHaveBeenCalled();
		});

		it('should throw ItemNotOrderableError when item is not orderable', async () => {
			vi.mocked(mockAuthProvider.getCurrentUser).mockResolvedValue(mockUser);
			mockRepo.getItemById.mockResolvedValue(
				new ShopItem({
					id: mockItem.id,
					name: mockItem.name,
					description: mockItem.description,
					imageUrl: mockItem.imageUrl,
					price: mockItem.price,
					stock: mockItem.stock,
					isOrderable: false,
					createdAt: mockItem.createdAt,
					updatedAt: mockItem.updatedAt
				})
			);

			await expect(service.purchaseItem(1)).rejects.toThrow(ItemNotOrderableError);
			expect(mockRepo.purchaseItem).not.toHaveBeenCalled();
		});

		it('should throw InsufficientStockError when item is out of stock', async () => {
			vi.mocked(mockAuthProvider.getCurrentUser).mockResolvedValue(mockUser);
			mockRepo.getItemById.mockResolvedValue(
				new ShopItem({
					id: mockItem.id,
					name: mockItem.name,
					description: mockItem.description,
					imageUrl: mockItem.imageUrl,
					price: mockItem.price,
					stock: 0,
					isOrderable: true,
					createdAt: mockItem.createdAt,
					updatedAt: mockItem.updatedAt
				})
			);

			await expect(service.purchaseItem(1)).rejects.toThrow(InsufficientStockError);
			expect(mockRepo.purchaseItem).not.toHaveBeenCalled();
		});

		it('should throw InsufficientBalanceError when user has insufficient balance', async () => {
			vi.mocked(mockAuthProvider.getCurrentUser).mockResolvedValue(mockUser);
			mockRepo.getItemById.mockResolvedValue(mockItem);
			vi.mocked(mockPointsRepo.getTotalPoints).mockResolvedValue(50);

			await expect(service.purchaseItem(1)).rejects.toThrow(InsufficientBalanceError);
			expect(mockRepo.purchaseItem).not.toHaveBeenCalled();
		});
	});

	describe('createItem', () => {
		it('should create item and return it', async () => {
			const createData = {
				name: 'New Item',
				description: 'New Description',
				imageUrl: 'new.jpg',
				price: 150,
				stock: 5,
				isOrderable: true
			};

			const mockCreatedItem = new ShopItem({
				...createData,
				id: 1,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			mockRepo.createItem.mockResolvedValue(mockCreatedItem);

			const result = await service.createItem(createData);
			expect(result).toEqual(mockCreatedItem);
			expect(mockRepo.createItem).toHaveBeenCalledWith(createData);
		});
	});

	describe('updateItem', () => {
		const updateData = {
			name: 'Updated Item',
			price: 200
		};

		it('should update item when it exists', async () => {
			const mockItem = new ShopItem({
				id: 1,
				name: 'Original Item',
				description: 'Description',
				imageUrl: 'image.jpg',
				price: 100,
				stock: 10,
				isOrderable: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			mockRepo.getItemById.mockResolvedValue(mockItem);

			await service.updateItem(1, updateData);
			expect(mockRepo.updateItem).toHaveBeenCalledWith(1, updateData);
		});

		it('should throw ItemNotFoundError when item does not exist', async () => {
			mockRepo.getItemById.mockResolvedValue(null);

			await expect(service.updateItem(1, updateData)).rejects.toThrow(ItemNotFoundError);
			expect(mockRepo.updateItem).not.toHaveBeenCalled();
		});
	});

	describe('deleteItem', () => {
		it('should delete item when it exists', async () => {
			const mockItem = new ShopItem({
				id: 1,
				name: 'Item',
				description: 'Description',
				imageUrl: 'image.jpg',
				price: 100,
				stock: 10,
				isOrderable: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			mockRepo.getItemById.mockResolvedValue(mockItem);

			await service.deleteItem(1);
			expect(mockRepo.deleteItem).toHaveBeenCalledWith(1);
		});

		it('should throw ItemNotFoundError when item does not exist', async () => {
			mockRepo.getItemById.mockResolvedValue(null);

			await expect(service.deleteItem(1)).rejects.toThrow(ItemNotFoundError);
			expect(mockRepo.deleteItem).not.toHaveBeenCalled();
		});
	});

	describe('getOrders', () => {
		it('should return all orders', async () => {
			const mockOrders = [
				new Order({
					id: 1,
					userId: 1,
					shopItemId: 1,
					status: 'pending',
					createdAt: new Date()
				}),
				new Order({
					id: 2,
					userId: 2,
					shopItemId: 1,
					status: 'fulfilled',
					createdAt: new Date()
				})
			];

			mockRepo.getOrders.mockResolvedValue(mockOrders);

			const result = await service.getOrders();
			expect(result).toEqual(mockOrders);
			expect(mockRepo.getOrders).toHaveBeenCalled();
		});
	});

	describe('getOrderById', () => {
		it('should return order when found', async () => {
			const mockOrder = new Order({
				id: 1,
				userId: 1,
				shopItemId: 1,
				status: 'pending',
				createdAt: new Date()
			});

			mockRepo.getOrderById.mockResolvedValue(mockOrder);

			const result = await service.getOrderById(1);
			expect(result).toEqual(mockOrder);
			expect(mockRepo.getOrderById).toHaveBeenCalledWith(1);
		});

		it('should throw OrderNotFoundError when order not found', async () => {
			mockRepo.getOrderById.mockResolvedValue(null);

			await expect(service.getOrderById(1)).rejects.toThrow(OrderNotFoundError);
			expect(mockRepo.getOrderById).toHaveBeenCalledWith(1);
		});
	});

	describe('getOrdersByUser', () => {
		it('should return orders for specified user', async () => {
			const mockOrders = [
				new Order({
					id: 1,
					userId: 1,
					shopItemId: 1,
					status: 'pending',
					createdAt: new Date()
				}),
				new Order({
					id: 2,
					userId: 1,
					shopItemId: 2,
					status: 'fulfilled',
					createdAt: new Date()
				})
			];

			mockRepo.getOrdersByUser.mockResolvedValue(mockOrders);

			const result = await service.getOrdersByUser(1);
			expect(result).toEqual(mockOrders);
			expect(mockRepo.getOrdersByUser).toHaveBeenCalledWith(1);
		});

		it('should return empty array when user has no orders', async () => {
			mockRepo.getOrdersByUser.mockResolvedValue([]);

			const result = await service.getOrdersByUser(1);
			expect(result).toEqual([]);
			expect(mockRepo.getOrdersByUser).toHaveBeenCalledWith(1);
		});
	});
});
