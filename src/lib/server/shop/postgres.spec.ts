import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresShopRepository } from './postgres';
import { ShopItem } from './shop-item';
import { Order } from './order';
import type { CreateShopItemData, CreateOrderData } from './types';
import { ordersTable, shopItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('../db', () => ({
	db: mockDb
}));

describe('PostgresShopRepository', () => {
	let repo: PostgresShopRepository;
	const mockDate = new Date('2025-02-15T19:22:28.667Z');

	const mockShopItemData = {
		id: 1,
		name: 'Test Item',
		description: 'Test Description',
		imageUrl: 'test.jpg',
		price: 99.99,
		stock: 10,
		isOrderable: true,
		createdAt: mockDate,
		updatedAt: mockDate
	};

	const mockShopItem = new ShopItem(mockShopItemData);
	const mockItems = [mockShopItem, new ShopItem({ ...mockShopItemData, id: 2 })];

	const mockOrderData = {
		id: 1,
		userId: 1,
		shopItemId: 1,
		status: 'pending' as const,
		createdAt: mockDate
	};

	const mockOrder = new Order(mockOrderData);
	const mockOrders = [mockOrder];

	beforeEach(() => {
		repo = new PostgresShopRepository();
		vi.clearAllMocks();
	});

	describe('getAllItems', () => {
		it('should return all shop items ordered by ID', async () => {
			mockDb
				.select()
				.from(shopItemsTable)
				.orderBy.mockResolvedValue([mockShopItemData, { ...mockShopItemData, id: 2 }]);

			const result = await repo.getAllItems();

			expect(result).toEqual(mockItems);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.orderBy).toHaveBeenCalledWith(shopItemsTable.id);
		});
	});

	describe('getItemById', () => {
		it('should return item when found', async () => {
			mockDb.select().from(shopItemsTable).where.mockResolvedValue([mockShopItemData]);

			const result = await repo.getItemById(1);

			expect(result).toEqual(mockShopItem);
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});

		it('should return null when item not found', async () => {
			mockDb.select().from(shopItemsTable).where.mockResolvedValue([]);

			const result = await repo.getItemById(1);

			expect(result).toBeNull();
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});

	describe('updateStock', () => {
		it('should update item stock', async () => {
			mockDb.update(shopItemsTable).set.mockReturnThis();
			mockDb.where.mockResolvedValue(undefined);

			await repo.updateStock(1, 5);

			expect(mockDb.update).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.set).toHaveBeenCalledWith({ stock: 5 });
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});

	describe('createItem', () => {
		it('should create new shop item and return created item', async () => {
			const createData: CreateShopItemData = {
				name: 'Test Item',
				description: 'Test Description',
				imageUrl: 'test.jpg',
				price: 99.99,
				stock: 10,
				isOrderable: true
			};

			mockDb.insert(shopItemsTable).values.mockReturnThis();
			mockDb.returning.mockResolvedValue([mockShopItemData]);

			const result = await repo.createItem(createData);

			expect(result).toEqual(mockShopItem);
			expect(mockDb.insert).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.values).toHaveBeenCalledWith(createData);
		});
	});

	describe('updateItem', () => {
		it('should update item with provided data', async () => {
			const updateData = {
				name: 'Updated Item',
				price: 199.99
			};

			mockDb.update(shopItemsTable).set.mockReturnThis();
			mockDb.where.mockResolvedValue(undefined);

			await repo.updateItem(1, updateData);

			expect(mockDb.update).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.set).toHaveBeenCalledWith({
				...updateData,
				updatedAt: expect.any(Date)
			});
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});

	describe('deleteItem', () => {
		it('should delete item with specified ID', async () => {
			mockDb.delete(shopItemsTable).where.mockResolvedValue(undefined);

			await repo.deleteItem(1);

			expect(mockDb.delete).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});

	describe('createOrder', () => {
		it('should create a new order', async () => {
			const orderData: CreateOrderData = {
				userId: 1,
				shopItemId: 1,
				status: 'pending'
			};

			mockDb.insert(ordersTable).values.mockReturnThis();
			mockDb.returning.mockResolvedValue([mockOrderData]);

			const result = await repo.createOrder(orderData);

			expect(result).toEqual(mockOrder);
			expect(mockDb.insert).toHaveBeenCalledWith(ordersTable);
			expect(mockDb.values).toHaveBeenCalledWith(orderData);
		});
	});

	describe('getOrders', () => {
		it('should return all orders', async () => {
			mockDb.select().from.mockResolvedValue([mockOrderData]);

			const result = await repo.getOrders();

			expect(result).toEqual(mockOrders);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(ordersTable);
		});
	});

	describe('getOrderById', () => {
		it('should return order when found', async () => {
			mockDb.select().from(ordersTable).where.mockResolvedValue([mockOrderData]);

			const result = await repo.getOrderById(1);

			expect(result).toEqual(mockOrder);
			expect(mockDb.where).toHaveBeenCalledWith(eq(ordersTable.id, 1));
		});

		it('should return null when order not found', async () => {
			mockDb.select().from(ordersTable).where.mockResolvedValue([]);

			const result = await repo.getOrderById(1);

			expect(result).toBeNull();
			expect(mockDb.where).toHaveBeenCalledWith(eq(ordersTable.id, 1));
		});
	});

	describe('getOrdersByUser', () => {
		it('should return orders for specified user', async () => {
			mockDb.select().from(ordersTable).where.mockResolvedValue([mockOrderData]);

			const result = await repo.getOrdersByUser(1);

			expect(result).toEqual(mockOrders);
			expect(mockDb.where).toHaveBeenCalledWith(eq(ordersTable.userId, 1));
		});
	});

	describe('updateOrderStatus', () => {
		it('should update order status', async () => {
			mockDb.update(ordersTable).set.mockReturnThis();
			mockDb.where.mockResolvedValue(undefined);

			await repo.updateOrderStatus(1, 'fulfilled');

			expect(mockDb.update).toHaveBeenCalledWith(ordersTable);
			expect(mockDb.set).toHaveBeenCalledWith({ status: 'fulfilled' });
			expect(mockDb.where).toHaveBeenCalledWith(eq(ordersTable.id, 1));
		});
	});
});
