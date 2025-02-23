import { eq } from 'drizzle-orm';
import type {
	IShopRepo,
	CreateShopItemData,
	UpdateShopItemData,
	CreateOrderData,
	OrderStatus
} from './types';
import { ItemNotFoundError, ItemNotOrderableError, InsufficientStockError } from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';
import { db } from '$lib/server/db';
import { ordersTable, shopItemsTable, pointTransactionsTable } from '../db/schema';

// TODO: is there a better way to do this?
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PostgresShopRepo implements IShopRepo {
	async getAllItems(): Promise<ShopItem[]> {
		const items = await db.select().from(shopItemsTable).orderBy(shopItemsTable.id);
		return items.map((item) => new ShopItem(item));
	}

	async getItemById(id: number, tx?: Transaction): Promise<ShopItem | null> {
		const query = tx ? tx.select().from(shopItemsTable) : db.select().from(shopItemsTable);
		const items = await query.where(eq(shopItemsTable.id, id));
		const item = items[0];
		return item ? new ShopItem(item) : null;
	}

	async updateStock(id: number, newStock: number, tx?: Transaction): Promise<void> {
		const query = tx ? tx.update(shopItemsTable) : db.update(shopItemsTable);

		await query.set({ stock: newStock }).where(eq(shopItemsTable.id, id));
	}

	async createItem(data: CreateShopItemData): Promise<ShopItem> {
		const [item] = await db.insert(shopItemsTable).values(data).returning();
		return new ShopItem(item);
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

	async createOrder(data: CreateOrderData, tx?: Transaction): Promise<Order> {
		const query = tx ? tx.insert(ordersTable) : db.insert(ordersTable);
		const [order] = await query.values(data).returning();
		return new Order(order);
	}

	async getOrders(): Promise<Order[]> {
		const orders = await db.select().from(ordersTable);
		return orders.map((order) => new Order(order));
	}

	async getOrderById(orderId: number): Promise<Order | null> {
		const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
		const order = orders[0];
		return order ? new Order(order) : null;
	}

	async getOrdersByUser(userId: number): Promise<Order[]> {
		const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
		return orders.map((order) => new Order(order));
	}

	async updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
		await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, orderId));
	}

	async purchaseItem(userId: number, itemId: number): Promise<Order> {
		return await db.transaction(async (tx) => {
			const item = await this.getItemById(itemId, tx);

			if (!item) {
				throw new ItemNotFoundError(itemId);
			}

			if (!item.isOrderable) {
				throw new ItemNotOrderableError(itemId);
			}

			if (item.stock <= 0) {
				throw new InsufficientStockError(itemId);
			}

			const order = await this.createOrder(
				{
					userId,
					shopItemId: itemId,
					status: 'pending'
				},
				tx
			);

			await this.updateStock(itemId, item.stock - 1, tx);

			await tx.insert(pointTransactionsTable).values({
				userId: userId,
				amount: -item.price,
				reason: `Purchased item: ${item.name}`,
				authorId: userId
			});

			return order;
		});
	}
}
