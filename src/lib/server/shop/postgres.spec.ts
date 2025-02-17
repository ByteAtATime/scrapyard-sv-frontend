import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresShopRepository } from './postgres';
import { ordersTable, pointTransactionsTable, shopItemsTable } from '../db/schema';
import type { ShopItemData, OrderData } from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';
import { SQL } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresShopRepository', () => {
	let repository: PostgresShopRepository;

	beforeEach(() => {
		repository = new PostgresShopRepository();
		vi.clearAllMocks();

		// Reset all mock implementations
		mockDb.insert.mockReset();
		mockDb.values.mockReset();
		mockDb.returning.mockReset();

		// Setup transaction mock
		mockDb.transaction = vi.fn().mockImplementation((callback) => callback(mockDb));
	});

	describe('purchaseItem', () => {
		const mockUserId = 1;
		const mockItemId = 1;
		const mockItemData: ShopItemData = {
			id: mockItemId,
			name: 'Test Item',
			description: 'A test item',
			price: 100,
			stock: 5,
			isOrderable: true,
			imageUrl: 'test.jpg',
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const mockOrderData: OrderData = {
			id: 1,
			userId: mockUserId,
			shopItemId: mockItemId,
			status: 'pending',
			createdAt: new Date()
		};

		const mockItem = new ShopItem(mockItemData);
		const mockOrder = new Order(mockOrderData);

		beforeEach(() => {
			// Reset mocks for each test
			vi.spyOn(repository, 'getItemById').mockResolvedValue(mockItem);
			vi.spyOn(repository, 'createOrder').mockResolvedValue(mockOrder);
			vi.spyOn(repository, 'updateStock').mockResolvedValue(undefined);

			// Setup the mock chain for successful cases
			mockDb.insert.mockReturnValue(mockDb);
			mockDb.values.mockReturnValue(mockDb);
			mockDb.returning.mockResolvedValue([{ id: 1 }]);
		});

		it('should successfully purchase an item', async () => {
			const result = await repository.purchaseItem(mockUserId, mockItemId);

			// Verify the transaction was started
			expect(mockDb.transaction).toHaveBeenCalled();

			// Verify item was checked
			expect(repository.getItemById).toHaveBeenCalledWith(mockItemId);

			// Verify order was created
			expect(repository.createOrder).toHaveBeenCalledWith({
				userId: mockUserId,
				shopItemId: mockItemId,
				status: 'pending'
			});

			// Verify stock was updated
			expect(repository.updateStock).toHaveBeenCalledWith(mockItemId, mockItem.stock - 1);

			// Verify points transaction was created
			expect(mockDb.insert).toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				userId: mockUserId,
				amount: -mockItem.price,
				reason: `Purchased item: ${mockItem.name}`,
				authorId: mockUserId
			});

			// Verify the returned order
			expect(result).toEqual(mockOrder);
		});

		it('should throw when item does not exist', async () => {
			// Reset the mock chain
			mockDb.insert.mockReset();
			mockDb.values.mockReset();
			mockDb.returning.mockReset();

			vi.spyOn(repository, 'getItemById').mockResolvedValue(null);

			await expect(repository.purchaseItem(mockUserId, mockItemId)).rejects.toThrow();

			// Verify no other operations were performed
			expect(repository.createOrder).not.toHaveBeenCalled();
			expect(repository.updateStock).not.toHaveBeenCalled();
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it('should throw when item is not orderable', async () => {
			// Reset the mock chain
			mockDb.insert.mockReset();
			mockDb.values.mockReset();
			mockDb.returning.mockReset();

			const nonOrderableItem = new ShopItem({
				...mockItemData,
				isOrderable: false
			});
			vi.spyOn(repository, 'getItemById').mockResolvedValue(nonOrderableItem);

			await expect(repository.purchaseItem(mockUserId, mockItemId)).rejects.toThrow();

			// Verify no other operations were performed
			expect(repository.createOrder).not.toHaveBeenCalled();
			expect(repository.updateStock).not.toHaveBeenCalled();
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it('should throw when item is out of stock', async () => {
			// Reset the mock chain
			mockDb.insert.mockReset();
			mockDb.values.mockReset();
			mockDb.returning.mockReset();

			const outOfStockItem = new ShopItem({
				...mockItemData,
				stock: 0
			});
			vi.spyOn(repository, 'getItemById').mockResolvedValue(outOfStockItem);

			await expect(repository.purchaseItem(mockUserId, mockItemId)).rejects.toThrow();

			// Verify no other operations were performed
			expect(repository.createOrder).not.toHaveBeenCalled();
			expect(repository.updateStock).not.toHaveBeenCalled();
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it('should rollback transaction if any operation fails', async () => {
			// Reset the mock chain
			mockDb.insert.mockReset();
			mockDb.values.mockReset();
			mockDb.returning.mockReset();

			// Mock createOrder to throw an error
			const mockError = new Error('Failed to create order');
			vi.spyOn(repository, 'createOrder').mockRejectedValue(mockError);

			await expect(repository.purchaseItem(mockUserId, mockItemId)).rejects.toThrow(mockError);

			// Verify the transaction was started
			expect(mockDb.transaction).toHaveBeenCalled();

			// Verify stock was not updated after failure
			expect(repository.updateStock).not.toHaveBeenCalled();
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it('should handle transaction with correct points deduction', async () => {
			const expensiveItem = new ShopItem({
				...mockItemData,
				price: 500
			});

			vi.spyOn(repository, 'getItemById').mockResolvedValue(expensiveItem);

			await repository.purchaseItem(mockUserId, mockItemId);

			// Verify points transaction was created with correct amount
			expect(mockDb.insert).toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				userId: mockUserId,
				amount: -500, // Negative price for deduction
				reason: `Purchased item: ${expensiveItem.name}`,
				authorId: mockUserId
			});
		});
	});

	describe('getAllItems', () => {
		const mockItemData = {
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

		it('should return all shop items ordered by ID', async () => {
			const mockItems = [mockItemData, { ...mockItemData, id: 2 }];

			mockDb.select.mockReturnValue(mockDb);
			mockDb.from.mockReturnValue(mockDb);
			mockDb.orderBy.mockResolvedValue(mockItems);

			const result = await repository.getAllItems();

			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(ShopItem);
			expect(result[1]).toBeInstanceOf(ShopItem);
			expect(result[0].id).toBe(1);
			expect(result[1].id).toBe(2);
		});
	});

	describe('getItemById', () => {
		const mockItemData = {
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

		beforeEach(() => {
			mockDb.select.mockReturnValue(mockDb);
			mockDb.from.mockReturnValue(mockDb);
			mockDb.where.mockReturnValue(mockDb);
		});

		it('should return item when found', async () => {
			mockDb.where.mockResolvedValue([mockItemData]);

			const result = await repository.getItemById(1);

			expect(result).toBeInstanceOf(ShopItem);
			expect(result?.id).toBe(1);
		});

		it('should return null when item not found', async () => {
			mockDb.where.mockResolvedValue([]);

			const result = await repository.getItemById(1);

			expect(result).toBeNull();
		});
	});

	describe('createItem', () => {
		const createData = {
			name: 'Test Item',
			description: 'Test Description',
			imageUrl: 'test.jpg',
			price: 99.99,
			stock: 10,
			isOrderable: true
		};

		it('should create new shop item and return created item', async () => {
			const mockCreatedItem = {
				...createData,
				id: 1,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			mockDb.insert.mockReturnValue(mockDb);
			mockDb.values.mockReturnValue(mockDb);
			mockDb.returning.mockResolvedValue([mockCreatedItem]);

			const result = await repository.createItem(createData);

			expect(result).toBeInstanceOf(ShopItem);
			expect(result.id).toBe(1);
			expect(result.name).toBe(createData.name);
		});
	});

	describe('updateItem', () => {
		const updateData = {
			name: 'Updated Item',
			price: 199.99
		};

		it('should update item with provided data', async () => {
			mockDb.update.mockReturnValue(mockDb);
			mockDb.set.mockReturnValue(mockDb);
			mockDb.where.mockResolvedValue(undefined);

			await repository.updateItem(1, updateData);

			expect(mockDb.set).toHaveBeenCalledWith({
				...updateData,
				updatedAt: expect.any(Date)
			});
			expect(mockDb.where).toHaveBeenCalled();
		});
	});

	describe('deleteItem', () => {
		it('should delete item with specified ID', async () => {
			mockDb.delete.mockReturnValue(mockDb);
			mockDb.where.mockResolvedValue(undefined);

			await repository.deleteItem(1);

			expect(mockDb.delete).toHaveBeenCalled();
			expect(mockDb.where).toHaveBeenCalled();
		});
	});

	describe('getOrders', () => {
		const mockOrderData = {
			id: 1,
			userId: 1,
			shopItemId: 1,
			status: 'pending' as const,
			createdAt: new Date()
		};

		it('should return all orders', async () => {
			mockDb.select.mockReturnValue(mockDb);
			mockDb.from.mockResolvedValue([mockOrderData]);

			const result = await repository.getOrders();

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Order);
			expect(result[0].id).toBe(1);
		});
	});

	describe('getOrderById', () => {
		const mockOrderData = {
			id: 1,
			userId: 1,
			shopItemId: 1,
			status: 'pending' as const,
			createdAt: new Date()
		};

		beforeEach(() => {
			mockDb.select.mockReturnValue(mockDb);
			mockDb.from.mockReturnValue(mockDb);
			mockDb.where.mockReturnValue(mockDb);
		});

		it('should return order when found', async () => {
			mockDb.where.mockResolvedValue([mockOrderData]);

			const result = await repository.getOrderById(1);

			expect(result).toBeInstanceOf(Order);
			expect(result?.id).toBe(1);
		});

		it('should return null when order not found', async () => {
			mockDb.where.mockResolvedValue([]);

			const result = await repository.getOrderById(1);

			expect(result).toBeNull();
		});
	});

	describe('getOrdersByUser', () => {
		const mockOrderData = {
			id: 1,
			userId: 1,
			shopItemId: 1,
			status: 'pending' as const,
			createdAt: new Date()
		};

		it('should return orders for specified user', async () => {
			mockDb.select.mockReturnValue(mockDb);
			mockDb.from.mockReturnValue(mockDb);
			mockDb.where.mockResolvedValue([mockOrderData]);

			const result = await repository.getOrdersByUser(1);

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(Order);
			expect(result[0].userId).toBe(1);
		});
	});

	describe('updateOrderStatus', () => {
		it('should update order status', async () => {
			mockDb.update.mockReturnValue(mockDb);
			mockDb.set.mockReturnValue(mockDb);
			mockDb.where.mockResolvedValue(undefined);

			await repository.updateOrderStatus(1, 'fulfilled');

			expect(mockDb.set).toHaveBeenCalledWith({ status: 'fulfilled' });
			expect(mockDb.where).toHaveBeenCalled();
		});
	});

	describe('updateStock', () => {
		it('should update stock successfully', async () => {
			const itemId = 1;
			const newStock = 5;

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();
			mockDb.where.mockReturnThis();

			await repository.updateStock(itemId, newStock);

			expect(mockDb.update).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.set).toHaveBeenCalledWith({ stock: newStock });
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should handle zero stock', async () => {
			const itemId = 1;
			const newStock = 0;

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();
			mockDb.where.mockReturnThis();

			await repository.updateStock(itemId, newStock);

			expect(mockDb.update).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.set).toHaveBeenCalledWith({ stock: newStock });
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should throw error when database operation fails', async () => {
			const itemId = 1;
			const newStock = 5;

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();
			mockDb.where.mockRejectedValue(new Error('Database error'));

			await expect(repository.updateStock(itemId, newStock)).rejects.toThrow('Database error');
		});
	});

	describe('createOrder', () => {
		const orderData = {
			userId: 1,
			shopItemId: 1,
			status: 'pending' as const
		};

		it('should create order successfully', async () => {
			const mockOrder = {
				id: 1,
				...orderData,
				createdAt: new Date()
			};

			mockDb.insert.mockReturnThis();
			mockDb.values.mockReturnThis();
			mockDb.returning.mockResolvedValue([mockOrder]);

			const result = await repository.createOrder(orderData);

			expect(result).toBeInstanceOf(Order);
			expect(result).toEqual(new Order(mockOrder));
			expect(mockDb.insert).toHaveBeenCalledWith(ordersTable);
			expect(mockDb.values).toHaveBeenCalledWith(orderData);
		});

		it('should throw error when insert fails', async () => {
			mockDb.insert.mockReturnThis();
			mockDb.values.mockReturnThis();
			mockDb.returning.mockRejectedValue(new Error('Failed to create order'));

			await expect(repository.createOrder(orderData)).rejects.toThrow('Failed to create order');
		});

		it('should set initial status to pending', async () => {
			const mockOrder = {
				id: 1,
				...orderData,
				createdAt: new Date()
			};

			mockDb.insert.mockReturnThis();
			mockDb.values.mockReturnThis();
			mockDb.returning.mockResolvedValue([mockOrder]);

			const result = await repository.createOrder(orderData);

			expect(result.status).toBe('pending');
		});
	});
});
