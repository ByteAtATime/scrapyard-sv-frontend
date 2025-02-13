import { eq } from 'drizzle-orm';
import type { IShopRepo, Order, OrderStatus, CreateOrderData } from './types';
import type { ShopItem, CreateShopItemData, UpdateShopItemData } from './types';
import { db } from '../db';
import { ordersTable, shopItemsTable } from '../db/schema';

export class PostgresShopRepository implements IShopRepo {
	async getAllItems(): Promise<ShopItem[]> {
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

	async createOrder(data: CreateOrderData): Promise<Order> {
		const [order] = await db.insert(ordersTable).values(data).returning();
		return order;
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
