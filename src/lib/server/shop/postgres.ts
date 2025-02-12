import { and, eq, sql } from 'drizzle-orm';
import type { IShopRepo, Order, OrderStatus } from './types';
import type { ShopItem, CreateShopItemData, UpdateShopItemData } from './types';
import { db } from '../db';
import { ordersTable, pointTransactionsTable, shopItemsTable, usersTable } from '../db/schema';

export class PostgresShopRepo implements IShopRepo {
	async getAllItems(onlyOrderable: boolean = false): Promise<ShopItem[]> {
		if (onlyOrderable) {
			return await db
				.select()
				.from(shopItemsTable)
				.where(eq(shopItemsTable.isOrderable, true))
				.orderBy(shopItemsTable.id);
		}
		return await db.select().from(shopItemsTable).orderBy(shopItemsTable.id);
	}

	async getItemById(id: number): Promise<ShopItem | null> {
		const items = await db.select().from(shopItemsTable).where(eq(shopItemsTable.id, id));
		return items[0] ?? null;
	}

	async updateStock(id: number, newStock: number): Promise<void> {
		await db.update(shopItemsTable).set({ stock: newStock }).where(eq(shopItemsTable.id, id));
	}

	async createItem(data: CreateShopItemData): Promise<ShopItem> {
		const [item] = await db.insert(shopItemsTable).values(data).returning();
		return item;
	}

	async updateItem(id: number, data: UpdateShopItemData): Promise<void> {
		await db
			.update(shopItemsTable)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(shopItemsTable.id, id));
	}

	async deleteItem(id: number): Promise<void> {
		await db.delete(shopItemsTable).where(eq(shopItemsTable.id, id));
	}

	async createOrder(userId: number, itemId: number): Promise<Order> {
		return db.transaction(async (tx) => {
			const [shopItem] = await tx
				.select()
				.from(shopItemsTable)
				.where(and(eq(shopItemsTable.id, itemId), eq(shopItemsTable.isOrderable, true)))
				.for('update');

			if (!shopItem) {
				throw new Error(`Item with ID ${itemId} not found or is not orderable.`);
			}

			if (shopItem.stock <= 0) {
				throw new Error(`Not enough stock for item: ${shopItem.name}`);
			}

			const [newOrder] = await tx
				.insert(ordersTable)
				.values({
					userId,
					shopItemId: itemId,
					status: 'pending'
				})
				.returning();

			await tx
				.update(shopItemsTable)
				.set({
					stock: shopItem.stock - 1
				})
				.where(eq(shopItemsTable.id, itemId));

			await tx
				.update(usersTable)
				.set({
					totalPoints: sql`${usersTable.totalPoints} - ${shopItem.price}`
				})
				.where(eq(usersTable.id, userId));

			await tx.insert(pointTransactionsTable).values({
				userId: userId,
				amount: -shopItem.price,
				reason: `Purchased item: ${shopItem.name}`,
				authorId: userId
			});

			return newOrder;
		});
	}

	async getOrders(): Promise<Order[]> {
		return await db.select().from(ordersTable);
	}

	async getOrderById(orderId: number): Promise<Order | null> {
		const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
		return orders[0] ?? null;
	}
	async getOrdersByUser(userId: number): Promise<Order[]> {
		return await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
	}

	async updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
		await db.update(ordersTable).set({ status: status }).where(eq(ordersTable.id, orderId));
	}
}
