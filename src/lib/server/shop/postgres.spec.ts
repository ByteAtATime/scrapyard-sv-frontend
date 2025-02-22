import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresShopRepository } from './postgres';
import { ordersTable, pointTransactionsTable, shopItemsTable, usersTable } from '../db/schema';
import type { ShopItemData, OrderData } from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';

describe('PostgresShopRepository', () => {
	let repository: PostgresShopRepository;

	// Helper function to create a user
	const createUser = async (userId: number, name: string) => {
		await db.insert(usersTable).values({
			id: userId,
			name,
			email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
			authProvider: 'clerk',
			authProviderId: `test-id-${userId}`
		});
		return userId;
	};

	// Helper function to create a shop item
	const createTestShopItem = ({
		id = 1,
		name = 'Test Item',
		description = 'A test item',
		price = 100,
		stock = 5,
		isOrderable = true,
		imageUrl = 'test.jpg'
	}: Partial<ShopItemData> = {}): ShopItemData => {
		return {
			id,
			name,
			description,
			price,
			stock,
			isOrderable,
			imageUrl,
			createdAt: new Date(),
			updatedAt: new Date()
		};
	};

	// Helper function to create an order
	const createTestOrder = ({
		id = 1,
		userId = 1,
		shopItemId = 1,
		status = 'pending' as const
	}: Partial<OrderData> = {}): OrderData => {
		return {
			id,
			userId,
			shopItemId,
			status,
			createdAt: new Date()
		};
	};

	beforeEach(() => {
		repository = new PostgresShopRepository();
	});

	describe('purchaseItem', () => {
		it('should successfully purchase an item', async () => {
			// Given: a user and item exist
			const userId = await createUser(1, 'Test User');
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			// When: purchaseItem is called
			const order = await repository.purchaseItem(userId, itemData.id);

			// Then: order should be created
			expect(order).toBeInstanceOf(Order);
			expect(order.userId).toBe(userId);
			expect(order.shopItemId).toBe(itemData.id);
			expect(order.status).toBe('pending');

			// And: stock should be decreased
			const updatedItem = await repository.getItemById(itemData.id);
			expect(updatedItem?.stock).toBe(itemData.stock - 1);

			// And: points transaction should be created
			const pointTransactions = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));
			expect(pointTransactions).toHaveLength(1);
			expect(pointTransactions[0]).toMatchObject({
				userId,
				amount: -itemData.price,
				reason: `Purchased item: ${itemData.name}`,
				authorId: userId
			});
		});

		it('should throw when item does not exist', async () => {
			// Given: a user exists but item doesn't
			const userId = await createUser(1, 'Test User');
			const nonExistentItemId = 999;

			// When/Then: purchaseItem should throw error
			await expect(repository.purchaseItem(userId, nonExistentItemId)).rejects.toThrow();
		});

		it('should throw when item is not orderable', async () => {
			// Given: a user exists and item is not orderable
			const userId = await createUser(1, 'Test User');
			const itemData = createTestShopItem({ isOrderable: false });
			await db.insert(shopItemsTable).values(itemData);

			// When/Then: purchaseItem should throw error
			await expect(repository.purchaseItem(userId, itemData.id)).rejects.toThrow();
		});

		it('should throw when item is out of stock', async () => {
			// Given: a user exists and item is out of stock
			const userId = await createUser(1, 'Test User');
			const itemData = createTestShopItem({ stock: 0 });
			await db.insert(shopItemsTable).values(itemData);

			// When/Then: purchaseItem should throw error
			await expect(repository.purchaseItem(userId, itemData.id)).rejects.toThrow();
		});
	});

	describe('getAllItems', () => {
		it('should return all shop items ordered by ID', async () => {
			// Given: multiple items exist
			const items = [
				createTestShopItem({ id: 1, name: 'Item 1' }),
				createTestShopItem({ id: 2, name: 'Item 2' })
			];
			await db.insert(shopItemsTable).values(items);

			// When: getAllItems is called
			const result = await repository.getAllItems();

			// Then: all items should be returned in order
			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(ShopItem);
			expect(result[1]).toBeInstanceOf(ShopItem);
			expect(result.map((item) => item.name)).toEqual(['Item 1', 'Item 2']);
		});

		it('should return empty array when no items exist', async () => {
			// When: getAllItems is called with no items
			const result = await repository.getAllItems();

			// Then: empty array should be returned
			expect(result).toEqual([]);
		});
	});

	describe('getItemById', () => {
		it('should return item when found', async () => {
			// Given: an item exists
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			// When: getItemById is called
			const result = await repository.getItemById(itemData.id);

			// Then: the item should be returned
			expect(result).toBeInstanceOf(ShopItem);
			expect(result).toMatchObject(itemData);
		});

		it('should return null when item not found', async () => {
			// When: getItemById is called with non-existent ID
			const result = await repository.getItemById(999);

			// Then: null should be returned
			expect(result).toBeNull();
		});
	});

	describe('createItem', () => {
		it('should create new shop item and return created item', async () => {
			// Given: item data is prepared
			const createData = {
				name: 'New Item',
				description: 'New Description',
				imageUrl: 'new.jpg',
				price: 99,
				stock: 10,
				isOrderable: true
			};

			// When: createItem is called
			const result = await repository.createItem(createData);

			// Then: item should be created and returned
			expect(result).toBeInstanceOf(ShopItem);
			expect(result).toMatchObject(createData);

			// And: item should exist in database
			const dbItem = await repository.getItemById(result.id);
			expect(dbItem).toMatchObject(createData);
		});
	});

	describe('updateItem', () => {
		it('should update item with provided data', async () => {
			// Given: an item exists
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			// When: updateItem is called
			const updates = {
				name: 'Updated Item',
				price: 199
			};
			await repository.updateItem(itemData.id, updates);

			// Then: item should be updated in database
			const updatedItem = await repository.getItemById(itemData.id);
			expect(updatedItem).toMatchObject({
				...itemData,
				...updates,
				updatedAt: expect.any(Date)
			});
		});
	});

	describe('deleteItem', () => {
		it('should delete item with specified ID', async () => {
			// Given: an item exists
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			// When: deleteItem is called
			await repository.deleteItem(itemData.id);

			// Then: item should be deleted from database
			const deletedItem = await repository.getItemById(itemData.id);
			expect(deletedItem).toBeNull();
		});
	});

	describe('getOrders', () => {
		it('should return all orders', async () => {
			// Given: multiple orders exist
			const userId = await createUser(1, 'Test User');
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			const orders = [
				createTestOrder({ id: 1, userId, shopItemId: itemData.id }),
				createTestOrder({ id: 2, userId, shopItemId: itemData.id })
			];
			await db.insert(ordersTable).values(orders);

			// When: getOrders is called
			const result = await repository.getOrders();

			// Then: all orders should be returned
			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(Order);
			expect(result[1]).toBeInstanceOf(Order);
			expect(result.map((order) => order.id)).toEqual([1, 2]);
		});
	});

	describe('getOrderById', () => {
		it('should return order when found', async () => {
			// Given: an order exists
			const userId = await createUser(1, 'Test User');
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			const orderData = createTestOrder({ userId, shopItemId: itemData.id });
			await db.insert(ordersTable).values(orderData);

			// When: getOrderById is called
			const result = await repository.getOrderById(orderData.id);

			// Then: the order should be returned
			expect(result).toBeInstanceOf(Order);
			expect(result).toMatchObject(orderData);
		});

		it('should return null when order not found', async () => {
			// When: getOrderById is called with non-existent ID
			const result = await repository.getOrderById(999);

			// Then: null should be returned
			expect(result).toBeNull();
		});
	});

	describe('getOrdersByUser', () => {
		it('should return orders for specified user', async () => {
			// Given: orders exist for multiple users
			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			await db
				.insert(ordersTable)
				.values([
					createTestOrder({ id: 1, userId: user1, shopItemId: itemData.id }),
					createTestOrder({ id: 2, userId: user1, shopItemId: itemData.id }),
					createTestOrder({ id: 3, userId: user2, shopItemId: itemData.id })
				]);

			// When: getOrdersByUser is called for user1
			const result = await repository.getOrdersByUser(user1);

			// Then: only user1's orders should be returned
			expect(result).toHaveLength(2);
			expect(result.every((order) => order.userId === user1)).toBe(true);
		});
	});

	describe('updateOrderStatus', () => {
		it('should update order status', async () => {
			// Given: an order exists
			const userId = await createUser(1, 'Test User');
			const itemData = createTestShopItem();
			await db.insert(shopItemsTable).values(itemData);

			const orderData = createTestOrder({ userId, shopItemId: itemData.id });
			await db.insert(ordersTable).values(orderData);

			// When: updateOrderStatus is called
			await repository.updateOrderStatus(orderData.id, 'fulfilled');

			// Then: order status should be updated
			const updatedOrder = await repository.getOrderById(orderData.id);
			expect(updatedOrder?.status).toBe('fulfilled');
		});
	});

	describe('updateStock', () => {
		it('should update stock successfully', async () => {
			// Given: an item exists
			const itemData = createTestShopItem({ stock: 10 });
			await db.insert(shopItemsTable).values(itemData);

			// When: updateStock is called
			const newStock = 5;
			await repository.updateStock(itemData.id, newStock);

			// Then: stock should be updated
			const updatedItem = await repository.getItemById(itemData.id);
			expect(updatedItem?.stock).toBe(newStock);
		});

		it('should handle zero stock', async () => {
			// Given: an item exists
			const itemData = createTestShopItem({ stock: 10 });
			await db.insert(shopItemsTable).values(itemData);

			// When: updateStock is called with zero
			await repository.updateStock(itemData.id, 0);

			// Then: stock should be updated to zero
			const updatedItem = await repository.getItemById(itemData.id);
			expect(updatedItem?.stock).toBe(0);
		});
	});
});
